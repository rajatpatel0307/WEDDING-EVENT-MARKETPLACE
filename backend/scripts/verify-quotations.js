import { up as quotationHardeningUp } from "../migrations/018-quotation-history-hardening.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import * as quotations from "../src/modules/quotations/quotations.service.js";
import { up as quotationLifecycleUp } from "../migrations/017-quotation-lifecycle.js";
// Real MSSQL + REST verification. All fixture records and changes are rolled back.
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { up as serviceManagementUp } from "../migrations/010-service-management.js";
import { up as lifecycleUp } from "../migrations/015-booking-lifecycle.js";
import { up as customerWebsiteUp } from "../migrations/016-customer-website.js";
import { createMarketplaceRouter } from "../src/modules/customers/marketplace.routes.js";
import { createCustomerRouter } from "../src/modules/customers/workspace.routes.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import {
  settle,
  webhook,
} from "../src/modules/customers/workspace.payments.js";
const rollback = new Error("ROLLBACK_CUSTOMER_WORKSPACE");
let passed = false;
const publicTimings = [];
const originalEnv = Object.fromEntries(
  ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"].map(
    (k) => [k, process.env[k]],
  ),
);
try {
  const [schema] = await sequelize.query(
    "SELECT TABLE_NAME,STRING_AGG(CONVERT(nvarchar(max),COLUMN_NAME),', ') AS columns FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN('Events','EventGuests','Services','Wishlists','PaymentTransactions') GROUP BY TABLE_NAME",
  );
  console.log("Inspected customer schema:", JSON.stringify(schema));
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction,
      originalFetch = globalThis.fetch;
    let server;
    sequelize.query = function (sql, options = {}) {
      return originalQuery
        .call(this, sql, { ...options, transaction: tx })
        .catch((e) => {
          console.error(
            "SQL verification:",
            e.message,
            e.original?.errors?.map((x) => x.message),
            e.original?.message,
          );
          throw e;
        });
    };
    sequelize.transaction = async (fn) => fn(tx);
    try {
      await serviceManagementUp(sequelize.getQueryInterface(), tx);
      await lifecycleUp(sequelize.getQueryInterface(), tx);
      await customerWebsiteUp(sequelize.getQueryInterface(), tx);
      await quotationLifecycleUp(sequelize.getQueryInterface(), tx);
      await customerWebsiteUp(sequelize.getQueryInterface(), tx);
      const owner = randomUUID(),
        customer = randomUUID(),
        other = randomUUID(),
        vendor = randomUUID(),
        service = randomUUID(),
        pack = randomUUID();
      const query = (sql, replacements = {}) =>
        sequelize.query(sql, { replacements });
      for (const id of [owner, customer, other])
        await query(
          "INSERT INTO dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Customer fixture',:email,'not-a-login-password',1)",
          { id, email: `customer-check-${id}@example.invalid` },
        );
      await query(
        "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:vendor,:owner,'Customer verification fixture',:slug,'Approved',1)",
        { vendor, owner, slug: `fixture-${vendor}` },
      );
      const [[category]] = await query(
        "SELECT TOP(1) CategoryId FROM dbo.Categories WHERE IsActive=1 ORDER BY CategoryId",
      );
      await query(
        "INSERT INTO dbo.VendorLocations(VendorId,AddressLine1,City,State,PostalCode,IsPrimary) VALUES(:vendor,'Test address','Fixture City','Test State','100001',1)",
        { vendor },
      );
      await query(
        "INSERT INTO dbo.VendorCategories(VendorId,CategoryId) VALUES(:vendor,:category)",
        { vendor, category: category.CategoryId },
      );
      await query(
        "INSERT INTO dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,PricingType,BasePrice,ApprovalStatus,IsActive,IsCustomQuoteAvailable) VALUES(:service,:vendor,:category,'Fixture Service',:slug,'Fixed',5000,'Approved',1,1)",
        {
          service,
          vendor,
          category: category.CategoryId,
          slug: `fixture-${service}`,
        },
      );
      await query(
        "INSERT INTO dbo.ServicePackages(PackageId,ServiceId,PackageName,Price,DiscountPercentage,IsActive) VALUES(:pack,:service,'Fixture Package',10000,10,1)",
        { pack, service },
      );
      const user = (id) => ({
        id,
        active: true,
        emailVerified: true,
        roles: [{ code: "CUSTOMER", active: true }],
      });
      const vendorUser = {
        id: owner,
        active: true,
        emailVerified: true,
        roles: [{ code: "VENDOR", active: true }],
        vendor: { id: vendor, active: true, verificationStatus: "Approved" },
      };
      const app = express();
      app.use("/api/marketplace", createMarketplaceRouter());
      app.use(
        "/api/customer",
        createCustomerRouter({
          authenticateRequest: async (req) =>
            req.get("x-test-role") === "vendor"
              ? { user: vendorUser }
              : req.get("x-test-role") === "none"
                ? null
                : {
                    user: user(
                      req.get("x-test-role") === "other" ? other : customer,
                    ),
                  },
        }),
      );
      app.use(
        "/api/vendor",
        createVendorRouter({
          authenticateRequest: async (req) => ({
            user:
              req.get("x-test-role") === "foreign"
                ? { ...vendorUser, vendor: { ...vendorUser.vendor, id: other } }
                : vendorUser,
          }),
        }),
      );
      const adminUser = {
        ...user(owner),
        roles: [{ code: "ADMIN", active: true }],
      };
      app.use(
        "/api/admin",
        createAdminRouter({
          authenticateRequest: async (req) => ({
            user:
              req.get("x-test-role") === "other" ? user(customer) : adminUser,
          }),
        }),
      );
      app.post("/webhook", express.raw({ type: "application/json" }), webhook);
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const base = `http://127.0.0.1:${server.address().port}`;
      const request = async (
        path,
        method = "GET",
        body,
        role,
        expected = 200,
      ) => {
        const started = performance.now();
        const response = await originalFetch(`${base}${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            Origin: process.env.FRONTEND_URL || "http://localhost:5173",
            "X-Admin-Request": "1",
            "X-Customer-Request": "1",
            "X-Vendor-Request": "1",
            ...(role ? { "X-Test-Role": role } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const result = await response.json();
        if (path.startsWith("/api/marketplace"))
          publicTimings.push(performance.now() - started);
        assert.equal(
          response.status,
          expected,
          `${method} ${path}: ${JSON.stringify(result)}`,
        );
        return result.data ?? result;
      };
      const api = (p, ...args) => request(`/api/customer${p}`, ...args);
      await api("/dashboard", "GET", null, "none", 401);
      await api("/dashboard", "GET", null, "vendor", 403);
      const future = new Date(Date.now() + 60 * 86400000)
        .toISOString()
        .slice(0, 10);

      const vendorApi = (p, ...args) => request(`/api/vendor${p}`, ...args);
      const customerCtx = { auth: { user: user(customer) } },
        vendorCtx = { auth: { user: vendorUser } },
        adminCtx = {
          auth: {
            user: { ...user(owner), roles: [{ code: "ADMIN", active: true }] },
          },
        };
      const event = await api("/events", "POST", {
        name: "Quotation workflow fixture",
        type: "Wedding",
        eventDate: future,
        city: "Fixture City",
        guests: 100,
        budget: 100000,
      });
      const service2 = randomUUID();
      await query('UPDATE dbo.Events SET LocationJson=:location WHERE EventId=:id',{id:event.id,location:JSON.stringify({line1:'Fixture hall',city:'Fixture City',state:'Fixture State',postalCode:'100001',country:'India'})});
      await query(
        "INSERT INTO dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,PricingType,BasePrice,ApprovalStatus,IsActive,IsCustomQuoteAvailable) VALUES(:id,:vendor,:category,'Second quoted service',:slug,'Fixed',2000,'Approved',1,1)",
        {
          id: service2,
          vendor,
          category: category.CategoryId,
          slug: `quote-fixture-${service2}`,
        },
      );
      const req = await api("/quotation-requests", "POST", {
        eventId: event.id,
        serviceId: service,
        services: [{ serviceId: service2 }],
        message: "Please provide catering and decoration with setup.",
      });
      assert.match(req.number, /^QR-/);
      await api(`/quotation-requests/${req.id}`, "GET", null, "other", 404);
      await vendorApi(
        `/quotation-requests/${req.id}`,
        "GET",
        null,
        "foreign",
        404,
      );
      const requested = await vendorApi(`/quotation-requests/${req.id}`);
      assert.equal(requested.snapshot.services.length, 2);
      await vendorApi(`/quotation-requests/${req.id}/action`, "POST", {
        action: "Information",
        reason: "Please confirm the floral colour palette.",
      });
      await vendorApi(`/quotation-requests/${req.id}/action`, "POST", {
        action: "Information",
        reason: "Please confirm the floral colour palette.",
      });
      assert.equal(
        (await api(`/quotation-requests/${req.id}`)).history.filter(
          (h) => h.action === "InformationRequested",
        ).length,
        1,
      );
      const proposal = {
        idempotencyKey: randomUUID(),
        requestId: req.id,
        eventId: event.id,
        title: "Agreed wedding services",
        validUntil: future,
        status: "Draft",
        terms: "Setup by 09:00. All agreed inclusions are listed.",
        cancellation: "Vendor policy applies.",
        advancePercent: 25,
        items: [
          {
            serviceId: service,
            name: "Catering snapshot",
            quantity: 10,
            price: 100,
            discountType: "Percentage",
            discountValue: 10,
            taxRate: 18,
          },
          {
            serviceId: service2,
            name: "Decoration snapshot",
            quantity: 1,
            price: 2000,
            taxRate: 5,
          },
          {
            serviceId: service2,
            name: "Travel charge",
            kind: "Travel",
            quantity: 1,
            price: 100,
            taxRate: 0,
          },
        ],
      };
      const hiddenDraft = await vendorApi("/quotations", "POST", {
        ...proposal,
        requestId: undefined,
        idempotencyKey: randomUUID(),
      });
      await vendorApi(`/quotations/${hiddenDraft.id}/action`, "POST", {
        action: "Cancel",
      });
      await api(`/quotations/${hiddenDraft.id}`, "GET", null, null, 404);
      assert(
        !(await api("/records/quotations")).rows.some(
          (q) => q.id.toLowerCase() === hiddenDraft.id.toLowerCase(),
        ),
      );
      assert(
        !(await api(`/quotation-requests/${req.id}`)).quotations.some(
          (q) => q.id.toLowerCase() === hiddenDraft.id.toLowerCase(),
        ),
      );
      const preview = await vendorApi("/quotations/preview", "POST", {
        ...proposal,
        status: "Sent",
      });
      assert.equal(preview.preview.total, 3262);
      assert.equal(preview.preview.advance, 815.5);
      const draft = await vendorApi("/quotations", "POST", proposal);
      assert.equal(
        (await vendorApi("/quotations", "POST", proposal)).id.toLowerCase(),
        draft.id.toLowerCase(),
      );
      await vendorApi(
        "/quotations",
        "POST",
        { ...proposal, title: "Changed payload" },
        null,
        409,
      );
      await api(`/quotations/${draft.id}`, "GET", null, null, 404);
      await vendorApi(`/quotations/${draft.id}/action`, "POST", {
        action: "Send",
      });
      const first = await api(`/quotations/${draft.id}`);
      assert.equal(Number(first.quotation.TotalAmount), 3262);
      assert.equal(first.terms.bookingPolicy.commissionRate, undefined);
      await vendorApi(`/quotations/${draft.id}`, "PUT", proposal, null, 409);
      await api(
        `/quotations/${draft.id}/decision`,
        "POST",
        { action: "Accept", convert: false },
        "other",
        404,
      );
      await api(`/quotations/${draft.id}/decision`, "POST", {
        action: "Modify",
        message: "Please reduce the decoration price and update the terms.",
      });
      const revision = await vendorApi("/quotations", "POST", {
        ...proposal,
        idempotencyKey: randomUUID(),
        requestId: undefined,
        previousQuotationId: draft.id,
        reason: "Reduced decoration price after negotiation.",
        status: "Sent",
        terms: "Revised terms: setup by 08:00.",
        items: proposal.items.map((i, n) =>
          n === 1 ? { ...i, price: 1500 } : i,
        ),
      });
      const current = await api(`/quotations/${revision.id}`);
      assert.equal(current.quotation.RevisionNumber, 2);
      assert.equal(Number(current.quotation.TotalAmount), 2737);
      const old = await api(`/quotations/${draft.id}`);
      assert.deepEqual(old.items, first.items);
      assert.equal(old.terms.text, first.terms.text);
      assert.equal(old.quotation.IsCurrent, false);
      await api(
        `/quotations/${draft.id}/decision`,
        "POST",
        { action: "Accept", convert: false },
        null,
        409,
      );
      await quotations.adminNote(
        revision.id,
        { message: "Private investigation note." },
        adminCtx,
      );
      assert(
        (await quotations.details(revision.id, adminCtx, "Admin")).history.some(
          (h) => h.visibility === "Internal",
        ),
      );
      assert(
        !(await api(`/quotations/${revision.id}`)).history.some(
          (h) => h.visibility === "Internal",
        ),
      );
      await api(`/quotations/${revision.id}/decision`, "POST", {
        action: "Accept",
        convert: false,
      });
      await api(
        `/quotations/${revision.id}/decision`,
        "POST",
        { action: "Accept", convert: false },
        null,
        409,
      );
      assert.equal((await api(`/quotations/${revision.id}`)).booking, null);
      await query(
        "INSERT INTO dbo.VendorAvailability(VendorId,ServiceId,AvailableDate,Status) VALUES(:vendor,:service,:date,'Blocked')",
        { vendor, service, date: future },
      );
      await api(`/quotations/${revision.id}/convert`, "POST", {}, null, 409);
      const retained = await api(`/quotations/${revision.id}`);
      assert.equal(retained.quotation.Status, "Accepted");
      assert.equal(retained.booking, null);
      await query(
        "DELETE FROM dbo.VendorAvailability WHERE VendorId=:vendor AND AvailableDate=:date",
        { vendor, date: future },
      );
      await query(
        "UPDATE dbo.Services SET BasePrice=99999,ServiceName='Changed catalogue name' WHERE ServiceId=:service",
        { service },
      );
      const booking = await api(
        `/quotations/${revision.id}/convert`,
        "POST",
        {},
      );
      const replay = await api(
        `/quotations/${revision.id}/convert`,
        "POST",
        {},
      );
      assert.equal(replay.id.toLowerCase(), booking.id.toLowerCase());
      assert.equal(replay.replayed, true);
      const booked = await api(`/bookings/${booking.id}`);
      assert.equal(Number(booked.booking.TotalAmount), 2737);
      assert.equal(Number(booked.booking.AdvanceAmount), 684.25);
      assert.equal(Number(booked.booking.PaidAmount), 0);
      assert.equal(booked.booking.PaymentStatus, "Pending");
      assert.equal(booked.booking.BookingStatus, "Pending");
      const [[savedBooking]] = await query(
        "SELECT PriceSnapshotJson FROM dbo.Booking WHERE BookingId=:id",
        { id: booking.id },
      );
      assert.equal(
        JSON.parse(savedBooking.PriceSnapshotJson).terms.text,
        "Revised terms: setup by 08:00.",
      );
      const [[bookingItems]] = await query(
        "SELECT COUNT(*) AS count FROM dbo.BookingItems WHERE BookingId=:id",
        { id: booking.id },
      );
      assert.equal(bookingItems.count, 3);
      // A gateway is not assumed. An unavailable provider returns a clear error without marking paid.
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
      await api(`/bookings/${booking.id}/payment-order`, "POST", {}, null, 503);
      const nextDate = new Date(Date.now() + 61 * 86400000)
        .toISOString()
        .slice(0, 10);
      const later = await api("/events", "POST", {
        name: "Expiry fixture",
        type: "Reception",
        eventDate: nextDate,
        city: "Fixture City",
        guests: 10,
        budget: 10000,
      });
      await query('UPDATE dbo.Events SET LocationJson=:location WHERE EventId=:id',{id:later.id,location:JSON.stringify({line1:'Fixture hall',city:'Fixture City',state:'Fixture State',postalCode:'100001',country:'India'})});
      const laterReq = await api("/quotation-requests", "POST", {
        eventId: later.id,
        serviceId: service,
        message: "Please quote for a second event.",
      });
      const expiring = await vendorApi("/quotations", "POST", {
        ...proposal,
        idempotencyKey: randomUUID(),
        requestId: laterReq.id,
        eventId: later.id,
      });
      await query(
        "UPDATE dbo.Quotations SET ValidUntil=DATEADD(minute,-1,SYSUTCDATETIME()),Status='Sent',SentAt=SYSUTCDATETIME() WHERE QuotationId=:id",
        { id: expiring.id },
      );
      await api(
        `/quotations/${expiring.id}/decision`,
        "POST",
        { action: "Accept", convert: false },
        null,
        409,
      );
      await quotations.processQuotationJobs();
      assert.equal(
        (await api(`/quotations/${expiring.id}`)).quotation.Status,
        "Expired",
      );
      const [[before]] = await query(
        "SELECT COUNT(*) AS count FROM dbo.Notifications",
      );
      await quotations.processQuotationJobs();
      const [[after]] = await query(
        "SELECT COUNT(*) AS count FROM dbo.Notifications",
      );
      assert.equal(after.count, before.count);
      assert.equal((await api("/quotations?status=Converted")).rows.length, 1);
      assert.equal(
        (await quotations.statistics(adminCtx, "Admin")).converted >= 1,
        true,
      );
      assert((await api("/quotations/statistics")).converted >= 1);
      const chat = await vendorApi("/conversations", "POST", {
        quotationId: revision.id,
      });
      assert(chat.id);
      const sameChat = await api("/conversations", "POST", {
        vendorId: vendor,
        eventId: event.id,
        quotationId: revision.id,
      });
      assert.equal(sameChat.id.toLowerCase(), chat.id.toLowerCase());
      const adminList = await request("/api/admin/quotations?q=" + revision.id);
      assert.equal(adminList.rows.length, 1);
      await request("/api/admin/quotations", "GET", null, "other", 403);
      assert(
        (await request("/api/admin/quotations/" + revision.id)).history.some(
          (h) => h.visibility === "Internal",
        ),
      );
      assert(
        (await request("/api/admin/quotation-requests/" + req.id)).request,
      );
      await request("/api/admin/quotations/" + revision.id + "/notes", "POST", {
        message: "Audit-only administrator follow-up.",
      });
      await api("/quotations?status=invalid", "GET", null, null, 400);
      await vendorApi(
        `/quotations/${revision.id}`,
        "GET",
        null,
        "foreign",
        404,
      );
      // Expiry reminders are once-only and do not starve later eligible quotations.
      const reminder = await vendorApi("/quotations", "POST", {
        ...proposal,
        idempotencyKey: randomUUID(),
        requestId: laterReq.id,
        eventId: later.id,
        previousQuotationId: expiring.id,
        reason: "Renew the expired offer.",
        validUntil: new Date(Date.now() + 3600000).toISOString(),
        status: "Sent",
      });
      await quotations.processQuotationJobs();
      const [[reminded]] = await query(
        "SELECT COUNT(*) AS count FROM dbo.QuotationHistory WHERE QuotationId=:id AND EventKey='expiry-reminder'",
        { id: reminder.id },
      );
      assert.equal(reminded.count, 1);
      await quotations.processQuotationJobs();
      const [[remindedAgain]] = await query(
        "SELECT COUNT(*) AS count FROM dbo.QuotationHistory WHERE QuotationId=:id AND EventKey='expiry-reminder'",
        { id: reminder.id },
      );
      assert.equal(remindedAgain.count, 1);
      await quotationLifecycleUp(sequelize.getQueryInterface(), tx);
      await quotationHardeningUp(sequelize.getQueryInterface(), tx);
      await quotationHardeningUp(sequelize.getQueryInterface(), tx);
      passed = true;
    } finally {
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
      globalThis.fetch = originalFetch;
      if (server) await new Promise((r) => server.close(r));
    }
    throw rollback;
  });
} catch (e) {
  if (e !== rollback) throw e;
} finally {
  for (const [k, v] of Object.entries(originalEnv))
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  await sequelize.close();
}
assert(passed);
console.log(
  "Quotation MSSQL/REST workflow passed: requests, pricing, revisions, ownership, acceptance, failed and idempotent conversion, expiry, audit and messaging; all fixtures rolled back.",
);
