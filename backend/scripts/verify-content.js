// Real MSSQL + HTTP verification. All fixtures, rate counters and outbox changes roll back.
// SMTP is replaced with an injected sender; no email leaves this process.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import * as cms from "../src/modules/cms/cms.service.js";
import * as support from "../src/modules/cms/support.service.js";
import { createCMSRouter } from "../src/modules/cms/cms.routes.js";
import { sitemap } from "../src/modules/cms/sitemap.js";
import { up } from "../migrations/026-content-support.js";
import { submitContactMessage } from "../src/modules/public/public.service.js";
let checks = 0,
  passed = false;
const equal = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const rejects = async (fn, status) => {
  await assert.rejects(fn, (e) => e.status === status);
  checks++;
};
const rollback = new Error("ROLLBACK_CONTENT_VERIFICATION");
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction;
    sequelize.query = function (sql, options = {}) {
      return originalQuery.call(this, sql, { ...options, transaction: tx });
    };
    sequelize.transaction = async (options, callback) =>
      (typeof options === "function" ? options : callback)(tx);
    const env = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_FROM: process.env.SMTP_FROM,
    };
    process.env.SMTP_HOST = "smtp.fixture.invalid";
    process.env.SMTP_FROM = "test@example.invalid";
    const ids = {
      admin: randomUUID(),
      customer: randomUUID(),
      other: randomUUID(),
    };
    const query = (sql, replacements = {}) =>
      sequelize.query(sql, { replacements });
    const ctx = (name, role) => ({
      auth: {
        user: {
          id: ids[name],
          active: true,
          emailVerified: true,
          roles: [{ code: role, active: true }],
        },
      },
      req: { ip: `fixture-${ids[name]}`, get: () => "" },
    });
    const admin = ctx("admin", "ADMIN"),
      customer = ctx("customer", "CUSTOMER"),
      other = ctx("other", "CUSTOMER");
    let server;
    try {
      await up(sequelize.getQueryInterface(), tx);
      await up(sequelize.getQueryInterface(), tx);
      checks++;
      for (const [key, id] of Object.entries(ids)) {
        await query(
          "INSERT dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'CMS fixture',:email,'not-a-password',1)",
          { id, email: `cms-${id}@example.invalid` },
        );
        await query(
          "INSERT dbo.UserRoles(UserId,RoleId) SELECT :id,RoleId FROM dbo.Roles WHERE RoleCode=:role",
          { id, role: key === "admin" ? "ADMIN" : "CUSTOMER" },
        );
      }
      const original = await cms.publicPage("about-us");
      equal(original.status, "Published");
      equal(original.categories.length > 0, true);
      let d = await cms.draft("about-us", admin);
      equal((await cms.draft("about-us", admin)).id, d.id);
      const b = {
        expectedRevision: d.revision,
        content: { ...d.content, title: "CMS integration fixture" },
        requiresAcceptance: false,
        effectiveDate: null,
      };
      await cms.save(d.id, b, admin);
      await rejects(() => cms.save(d.id, b, admin), 409);
      equal(
        (await cms.publicPage("about-us")).content.title,
        original.content.title,
      );
      d = await cms.details(d.id, admin);
      await cms.publish(
        d.id,
        { expectedRevision: d.revision, legalReviewed: false },
        admin,
      );
      equal(
        (await cms.publicPage("about-us")).content.title,
        "CMS integration fixture",
      );
      equal((await cms.details(original.id, admin)).status, "Archived");
      await rejects(
        () => cms.save(d.id, { ...b, expectedRevision: d.revision }, admin),
        409,
      );
      await rejects(() => cms.archive(d.id, admin), 409);
      equal(
        (await cms.details(d.id, admin)).history.some(
          (h) => h.ActionType === "CMS_PUBLISHED",
        ),
        true,
      );
      // Only test fixture prose is published inside this rollback transaction.
      const legalIds = {};
      for (const key of ["terms", "privacy"]) {
        let legal = await cms.draft(key, admin);
        await rejects(
          () =>
            cms.publish(
              legal.id,
              { expectedRevision: legal.revision, legalReviewed: false },
              admin,
            ),
          400,
        );
        const content = {
          ...legal.content,
          introduction: "TEST ONLY. Integration fixture introduction.",
          metaDescription: "TEST ONLY. Integration fixture metadata.",
          sections: legal.content.sections.map((s) => ({
            ...s,
            body: "TEST FIXTURE ONLY. This text is not an approved legal policy.",
          })),
        };
        await cms.save(
          legal.id,
          {
            expectedRevision: legal.revision,
            content,
            requiresAcceptance: true,
            effectiveDate: "2020-01-01",
          },
          admin,
        );
        legal = await cms.details(legal.id, admin);
        await cms.publish(
          legal.id,
          { expectedRevision: legal.revision, legalReviewed: true },
          admin,
        );
        legalIds[key] = legal.id;
        equal((await cms.publicPage(key)).id, legal.id);
      }
      equal(
        (await cms.acceptanceStatus(customer)).current.every(
          (v) => v.needsAcceptance,
        ),
        true,
      );
      await assert.rejects(() =>
        cms.accept({ explicit: false, versionIds: [legalIds.terms] }, customer),
      );
      checks++;
      await cms.accept(
        { explicit: true, versionIds: Object.values(legalIds) },
        customer,
      );
      await cms.accept(
        { explicit: true, versionIds: Object.values(legalIds) },
        customer,
      );
      equal((await cms.acceptanceStatus(customer)).history.length, 2);
      equal((await cms.acceptanceStatus(other)).history.length, 0);
      await rejects(
        () =>
          cms.signupAcceptances(ids.other, { terms: true, privacy: true }, tx),
        409,
      );
      await cms.signupAcceptances(
        ids.other,
        {
          terms: true,
          privacy: true,
          termsVersionId: legalIds.terms,
          privacyVersionId: legalIds.privacy,
        },
        tx,
      );
      equal((await cms.acceptanceStatus(other)).history.length, 2);
      let next = await cms.draft("terms", admin);
      await cms.save(
        next.id,
        {
          expectedRevision: next.revision,
          content: next.content,
          requiresAcceptance: true,
          effectiveDate: "2020-01-02",
        },
        admin,
      );
      next = await cms.details(next.id, admin);
      await cms.publish(
        next.id,
        { expectedRevision: next.revision, legalReviewed: true },
        admin,
      );
      equal((await cms.details(legalIds.terms, admin)).status, "Archived");
      await rejects(
        () =>
          cms.accept(
            { explicit: true, versionIds: [legalIds.terms] },
            customer,
          ),
        409,
      );
      equal(
        (await cms.acceptanceStatus(customer)).current.find(
          (v) => v.type === "terms",
        ).needsAcceptance,
        true,
      );
      // Isolate mail processing to fixture events; the outer transaction restores existing rows.
      await query(
        "UPDATE dbo.ContactInquiryEvents SET DeliveryStatus='Disabled' WHERE DeliveryStatus IN('Pending','Sending')",
      );
      const input = {
        fullName: "CMS Test Customer",
        email: `cms-${ids.customer}@example.invalid`,
        phone: "",
        subject: "Fixture support inquiry",
        category: "CUSTOMER",
        message: "Please help with this integration fixture inquiry.",
        consent: true,
        requestKey: randomUUID(),
      };
      const result = await support.submit(input, customer);
      equal(/^MN-[a-f0-9]{32}$/i.test(result.reference), true);
      equal(
        (await support.submit(input, customer)).reference,
        result.reference,
      );
      const legacy = await submitContactMessage(
        null,
        {
          input: {
            firstName: "CMS Test",
            lastName: "Customer",
            email: input.email,
            phone: "",
            subject: input.subject,
            category: input.category,
            message: input.message,
            consent: true,
            requestKey: input.requestKey,
          },
        },
        customer,
      );
      equal(legacy.success, true);
      equal(legacy.reference, result.reference);
      equal(
        (await support.submit({ ...input, requestKey: randomUUID() }, customer))
          .reference,
        result.reference,
      );
      await rejects(
        () =>
          support.submit(
            { ...input, message: input.message + " changed" },
            customer,
          ),
        409,
      );
      await rejects(
        () =>
          support.submit(
            { ...input, requestKey: randomUUID(), website: "bot" },
            customer,
          ),
        400,
      );
      const list = await support.list(
        { q: result.reference, status: "New", category: "CUSTOMER" },
        admin,
      );
      equal(list.total, 1);
      const id = list.rows[0].id;
      await support.change(
        id,
        "notes",
        { note: "Private staff note: fixture only." },
        admin,
      );
      await support.change(id, "assign", { assignedTo: ids.admin }, admin);
      await support.change(
        id,
        "status",
        { status: "InProgress", reason: "Fixture review" },
        admin,
      );
      equal((await support.details(id, admin)).Status, "InProgress");
      equal(
        (await support.details(id, admin)).events.some(
          (e) => e.EventType === "Note",
        ),
        true,
      );
      const reply = {
        body: "This is a test reply from the support team.",
        requestKey: randomUUID(),
      };
      await support.change(id, "reply", reply, admin);
      await support.change(id, "reply", reply, admin);
      await rejects(
        () =>
          support.change(
            id,
            "reply",
            { ...reply, body: reply.body + " changed" },
            admin,
          ),
        409,
      );
      const messages = [];
      equal(
        (await support.processMail({ send: async (m) => messages.push(m) }))
          .sent,
        2,
      );
      equal(
        messages.every(
          (m) => m.to === input.email && !m.text.includes("Private staff note"),
        ),
        true,
      );
      equal(
        (await support.processMail({ send: async (m) => messages.push(m) }))
          .sent,
        0,
      );
      equal(messages.length, 2);
      await support.change(
        id,
        "reply",
        { ...reply, requestKey: randomUUID() },
        admin,
      );
      await support.change(id, "status", { status: "Spam" }, admin);
      equal(
        (await support.processMail({ send: async (m) => messages.push(m) }))
          .sent,
        0,
      );
      await rejects(
        () =>
          support.change(
            id,
            "reply",
            { ...reply, requestKey: randomUUID() },
            admin,
          ),
        409,
      );
      await support.change(
        id,
        "status",
        { status: "New", reason: "Reopened" },
        admin,
      );
      equal((await support.details(id, admin)).ResolvedAt, null);
      await support.change(
        id,
        "reply",
        { ...reply, requestKey: randomUUID() },
        admin,
      );
      equal(
        (
          await support.processMail({
            send: async () => {
              throw new Error("Simulated uncertain SMTP response");
            },
          })
        ).failed,
        1,
      );
      equal(
        (await support.details(id, admin)).events.some(
          (e) => e.DeliveryStatus === "Unknown",
        ),
        true,
      );
      equal(
        (await support.processMail({ send: async (m) => messages.push(m) }))
          .sent,
        0,
      );
      const p = {
        requestType: "AccountDeletion",
        description: "Please review this fixture account deletion request.",
        requestKey: randomUUID(),
        explicit: true,
      };
      const privacy = await support.privacySubmit(p, customer);
      equal((await support.privacySubmit(p, customer)).id, privacy.id);
      equal((await support.privacyList({}, customer)).total, 1);
      equal((await support.privacyList({}, other)).total, 0);
      await rejects(
        () =>
          support.privacyChange(
            privacy.id,
            { status: "Resolved", response: "" },
            admin,
          ),
        400,
      );
      await support.privacyChange(
        privacy.id,
        {
          status: "Resolved",
          response: "Test fixture response; request reviewed.",
          assignedTo: ids.admin,
        },
        admin,
      );
      equal(
        (await support.privacyList({}, customer)).rows[0].response,
        "Test fixture response; request reviewed.",
      );
      const [[stillActive]] = await query(
        "SELECT IsActive FROM dbo.Users WHERE UserId=:id",
        { id: ids.customer },
      );
      equal(!!stillActive.IsActive, true);
      const app = express();
      app.use(
        "/api",
        createCMSRouter({
          authenticateRequest: async (req) =>
            req.get("x-test-admin")
              ? admin.auth
              : req.get("x-test-user")
                ? customer.auth
                : null,
        }),
      );
      app.get("/sitemap.xml", sitemap);
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const base = `http://127.0.0.1:${server.address().port}`;
      const publicResponse = await fetch(base + "/api/cms/about-us");
      equal(publicResponse.status, 200);
      const etag = publicResponse.headers.get("etag");
      equal(
        (
          await fetch(base + "/api/cms/about-us", {
            headers: { "if-none-match": etag },
          })
        ).status,
        304,
      );
      equal(
        (await fetch(base + "/api/admin/contact-inquiries/" + id)).status,
        401,
      );
      equal(
        (
          await fetch(base + "/api/admin/contact-inquiries/" + id, {
            headers: { "x-test-user": "1" },
          })
        ).status,
        403,
      );
      const privateResponse = await fetch(
        base + "/api/admin/contact-inquiries/" + id,
        { headers: { "x-test-admin": "1" } },
      );
      equal(privateResponse.headers.get("cache-control"), "no-store");
      equal(privateResponse.headers.get("x-robots-tag"), "noindex, nofollow");
      equal(
        (await fetch(base + "/api/contact/reference/" + result.reference))
          .status,
        404,
      );
      const xml = await (await fetch(base + "/sitemap.xml")).text();
      equal(xml.includes("/privacy-policy"), true);
      equal(xml.includes("contact-inquiries"), false);
      const [[trigger]] = await query(
        "SELECT COUNT(*) AS count FROM sys.triggers WHERE name='TR_CMS_Immutable' AND is_disabled=0",
      );
      equal(trigger.count, 1);
      passed = true;
    } finally {
      if (server) await new Promise((r) => server.close(r));
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
      for (const [k, v] of Object.entries(env))
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
    throw rollback;
  });
} catch (e) {
  if (e !== rollback) throw e;
} finally {
  await sequelize.close();
}
if (!passed) throw new Error("Verification did not finish");
console.log(
  `Content/support verification: ${checks} MSSQL/HTTP checks passed; all fixtures rolled back; SMTP mocked.`,
);
