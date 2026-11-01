import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import {
  template,
  termsTitles,
  privacyTitles,
} from "../src/modules/cms/cms.templates.js";
import { contentInput } from "../src/modules/cms/cms.validation.js";
import {
  inquiryInput,
  privacyInput,
  listInput,
} from "../src/modules/cms/support.validation.js";
import { assertPublishable, accept } from "../src/modules/cms/cms.service.js";
import { createCMSRouter } from "../src/modules/cms/cms.routes.js";
test("all CMS templates validate, legal templates contain complete empty outlines", () => {
  for (const key of ["about-us", "contact", "terms", "privacy"])
    assert.equal(contentInput.safeParse(template(key)).success, true);
  assert.equal(template("terms").sections.length, termsTitles.length);
  assert.equal(template("privacy").sections.length, privacyTitles.length);
  for (const key of ["terms", "privacy"])
    assert.ok(template(key).sections.every((s) => s.body === ""));
  assert.equal(template("contact").contact.supportEmail, "");
  assert.equal(template("contact").contact.address, "");
});
test("legal publication rejects unfinished, unreviewed, future, stale and immutable versions", () => {
  const content = template("terms"),
    row = {
      PageKey: "terms",
      ContentJson: JSON.stringify(content),
      Status: "Draft",
      Revision: 2,
      EffectiveDate: "2020-01-01",
    },
    input = { expectedRevision: 2, legalReviewed: true };
  assert.throws(() => assertPublishable(row, input), /Complete every/);
  content.sections.forEach(
    (s) => (s.body = "TEST FIXTURE ONLY. This is not legal wording."),
  );
  content.introduction = "Test introduction";
  content.metaDescription = "Test metadata";
  row.ContentJson = JSON.stringify(content);
  assert.doesNotThrow(() => assertPublishable(row, input));
  assert.throws(
    () => assertPublishable(row, { ...input, legalReviewed: false }),
    /legal professional/,
  );
  assert.throws(
    () => assertPublishable({ ...row, EffectiveDate: "2999-01-01" }, input),
    /Scheduled/,
  );
  assert.throws(
    () => assertPublishable({ ...row, EffectiveDate: null }, input),
    /effective date/,
  );
  assert.throws(
    () => assertPublishable({ ...row, Status: "Published" }, input),
    (e) => e.status === 409,
  );
  assert.throws(
    () => assertPublishable(row, { ...input, expectedRevision: 1 }),
    (e) => e.status === 409,
  );
});
test("CMS payload rejects script content, unsafe links, forged properties and unverified maps", () => {
  const c = template("about-us");
  for (const patch of [
    { title: "<script>alert(1)</script>" },
    { ctas: [{ label: "Click", href: "javascript:alert(1)" }] },
    { ctas: [{ label: "Click", href: "//attacker.invalid" }] },
    { publishedBy: randomUUID() },
    { sections: [c.sections[0], c.sections[0]] },
  ])
    assert.equal(contentInput.safeParse({ ...c, ...patch }).success, false);
  assert.equal(
    contentInput.safeParse({
      ...c,
      contact: { ...c.contact, mapUrl: "https://google.com/maps/test" },
    }).success,
    false,
  );
});
test("contact and privacy inputs require explicit consent and bounded plain text", () => {
  const c = {
    fullName: "Test Person",
    email: "fixture@example.invalid",
    subject: "Support inquiry",
    category: "GENERAL",
    message: "Please help with this test inquiry.",
    consent: true,
    requestKey: randomUUID(),
  };
  assert.equal(inquiryInput.safeParse(c).success, true);
  for (const patch of [
    { consent: false },
    { email: "invalid" },
    { phone: "123" },
    { message: "short" },
    { message: "<script>test data</script>" },
    { attachmentUrl: "https://example.invalid/file" },
    { Status: "Closed" },
  ])
    assert.equal(inquiryInput.safeParse({ ...c, ...patch }).success, false);
  assert.equal(
    privacyInput.safeParse({
      requestType: "AccountDeletion",
      description: "Please review my deletion request.",
      requestKey: randomUUID(),
      explicit: false,
    }).success,
    false,
  );
  assert.equal(listInput.safeParse({ pageSize: 1000 }).success, false);
  assert.equal(
    listInput.safeParse({ from: "2026-01-31", to: "2026-01-01" }).success,
    false,
  );
});
test("acceptance without an explicit action fails before database writes", async () => {
  const ctx = {
    auth: {
      user: {
        id: randomUUID(),
        active: true,
        emailVerified: true,
        roles: [{ code: "CUSTOMER", active: true }],
      },
    },
  };
  await assert.rejects(
    () => accept({ explicit: false, versionIds: [randomUUID()] }, ctx),
    (e) => e.name === "ZodError",
  );
});
test("CMS/support endpoints deny anonymous, wrong role and forged origins", async () => {
  const user = {
    id: randomUUID(),
    active: true,
    emailVerified: true,
    roles: [{ code: "CUSTOMER", active: true }],
  };
  const app = express();
  app.use(
    "/api",
    createCMSRouter({
      authenticateRequest: async (req) =>
        req.get("x-test-user") ? { user } : null,
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    for (const path of [
      "/admin/cms/pages",
      "/admin/contact-inquiries",
      "/admin/privacy-requests",
      "/legal/acceptance-status",
      "/privacy-requests/my-requests",
    ])
      assert.equal((await fetch(base + path)).status, 401);
    for (const path of [
      "/admin/cms/pages",
      "/admin/contact-inquiries",
      "/admin/privacy-requests",
    ])
      assert.equal(
        (await fetch(base + path, { headers: { "x-test-user": "1" } })).status,
        403,
      );
    assert.equal(
      (
        await fetch(base + "/contact", {
          method: "POST",
          headers: {
            origin: "https://forged.invalid",
            "content-type": "application/json",
            "x-cms-request": "1",
          },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(base + "/contact/reference/MN-test")).status,
      404,
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
