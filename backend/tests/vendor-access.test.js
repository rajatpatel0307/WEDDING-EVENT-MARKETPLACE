import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import * as access from "../src/modules/vendors/access.service.js";
import * as services from "../src/modules/vendors/service-management.service.js";
import { serviceSchema } from "../src/modules/vendors/service-management.validation.js";
import { createBooking } from "../src/modules/customers/workspace.operations.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800", adminId = "734b9588-c47c-40eb-8c17-1797d65a2801";
const ctx = role => ({ req: { ip: "127.0.0.1", get: () => "access-test" }, auth: { user: { id: adminId, active: true, blocked: false, emailVerified: true, roles: [{ code: role, active: true }], vendor: { id, active: true, verificationStatus: "Approved" } } } });
const liveVendor = { VerificationStatus: "Approved", IsActive: 1, userActive: 1, IsBlocked: 0, IsEmailVerified: 1 };

test("all sixteen access combinations are independent and use transaction locks", async t => {
  let service, booking;
  const tx = { test: true };
  t.mock.method(sequelize, "query", async (sql, options) => {
    assert.equal(options.transaction, tx);
    assert.equal(options.replacements.id, id);
    assert.match(sql, /WITH\(UPDLOCK,HOLDLOCK\)/);
    return [{ ...liveVendor, accessStatus: sql.includes("v.ServiceAccessStatus AS accessStatus") ? service : booking }];
  });
  for (service of ["Pending", "Approved", "Rejected", "Suspended"])
    for (booking of ["Pending", "Approved", "Rejected", "Suspended"])
      for (const [type, status] of [["service", service], ["booking", booking]]) {
        if (status === "Approved") await access.assertAccess(id, type, tx);
        else await assert.rejects(access.assertAccess(id, type, tx), { status: 403 });
      }
});

test("approval alone cannot bypass business verification or account restrictions", async t => {
  let row;
  t.mock.method(sequelize, "query", async () => row ? [row] : []);
  for (const patch of [{ VerificationStatus: "Pending" }, { IsActive: 0 }, { userActive: 0 }, { IsBlocked: 1 }, { IsEmailVerified: 0 }]) {
    row = { ...liveVendor, accessStatus: "Approved", ...patch };
    await assert.rejects(access.assertAccess(id, "service"), { status: 403 });
    await assert.rejects(access.assertAccess(id, "booking"), { status: 403 });
  }
  row = null;
  await assert.rejects(access.assertAccess(id, "booking"), { status: 403 });
});

test("rejected service access blocks create, duplicate and submit before any write", async t => {
  const query = t.mock.method(sequelize, "query", async sql => {
    if (sql.startsWith("SELECT t.*")) return [{ ServiceId: id, ServiceSlug: "garden", DetailsJson: "{}" }];
    return [{ ...liveVendor, accessStatus: "Rejected" }];
  });
  t.mock.method(sequelize, "transaction", async fn => fn({ test: true }));
  const doc = serviceSchema.parse({ name: "Wedding Garden", categoryId: 1, pricing: {}, location: {}, availability: {}, policies: {}, seo: { slug: "wedding-garden" } });
  await assert.rejects(services.saveService(null, doc, ctx("VENDOR")), { status: 403 });
  await assert.rejects(services.duplicate(id, ctx("VENDOR")), { status: 403 });
  await assert.rejects(services.submit(id, { expectedUpdatedAt: new Date().toISOString() }, ctx("VENDOR")), { status: 403 });
  assert.ok(query.mock.calls.every(c => c.arguments[0].startsWith("SELECT")));
});

test("new bookings are blocked before writes, including quotation conversion", async t => {
  const query = t.mock.method(sequelize, "query", async () => [{ ...liveVendor, accessStatus: "Suspended" }]);
  for (const quotationId of [null, id])
    await assert.rejects(createBooking({}, id, [], ctx("CUSTOMER"), { test: true }, quotationId), { status: 403 });
  assert.equal(query.mock.callCount(), 2);
  assert.ok(query.mock.calls.every(c => c.arguments[0].startsWith("SELECT v.VerificationStatus")));
});

test("admin decisions update only the chosen permission and atomically record administrator, reason and time", async t => {
  const tx = { test: true };
  const row = { ServiceAccessStatus: "Pending", BookingAccessStatus: "Approved" };
  t.mock.method(sequelize, "transaction", async fn => fn(tx));
  const query = t.mock.method(sequelize, "query", async sql => {
    if (sql.startsWith("SELECT * FROM dbo.[Vendors]")) return [row];
    return [{ id, serviceStatus: "Rejected", bookingStatus: "Approved" }];
  });
  const result = await access.decide(id, "service", "reject", { expectedStatus: "Pending", reason: "Missing service licence" }, ctx("ADMIN"));
  assert.equal(result.vendor.bookingStatus, "Approved");
  const update = query.mock.calls.find(c => c.arguments[0].startsWith("UPDATE"));
  assert.match(update.arguments[0], /ServiceAccessStatus/);
  assert.ok(!update.arguments[0].includes("BookingAccess"));
  assert.ok(!query.mock.calls.some(c => /UPDATE.*(?:Booking\]|Services\])/.test(c.arguments[0])));
  assert.equal(update.arguments[1].transaction, tx);
  const audit = query.mock.calls.find(c => c.arguments[0].startsWith("INSERT INTO dbo.AuditLogs"));
  assert.equal(audit.arguments[1].transaction, tx);
  assert.equal(audit.arguments[1].replacements.user, adminId);
  assert.equal(JSON.parse(audit.arguments[1].replacements.old).status, "Pending");
  const next = JSON.parse(audit.arguments[1].replacements.next);
  assert.equal(next.reason, "Missing service licence");
  assert.equal(next.status, "Rejected");
  assert.ok(Number.isFinite(Date.parse(next.changedAt)));
});

test("stale, duplicate, invalid and reasonless decisions cannot write", async t => {
  t.mock.method(sequelize, "transaction", async fn => fn({ test: true }));
  const query = t.mock.method(sequelize, "query", async () => [{ ServiceAccessStatus: "Approved" }]);
  for (const [action, body, status] of [["approve", { expectedStatus: "Pending" }, 409], ["approve", { expectedStatus: "Approved" }, 409], ["reject", { expectedStatus: "Approved", reason: "  " }, 400], ["suspend", { expectedStatus: "Approved" }, 400]])
    await assert.rejects(access.decide(id, "service", action, body, ctx("ADMIN")), { status });
  await assert.rejects(access.decide(id, "payments", "approve", { expectedStatus: "Approved" }, ctx("ADMIN")));
  await assert.rejects(access.decide(id, "service", "approve", { expectedStatus: "Approved", BookingAccessStatus: "Approved" }, ctx("ADMIN")));
  assert.ok(query.mock.calls.every(c => c.arguments[0].startsWith("SELECT")));
});

test("vendor status always uses session ownership; admin APIs reject vendors and customers", async t => {
  const query = t.mock.method(sequelize, "query", async () => [{ id, serviceStatus: "Pending", bookingStatus: "Approved" }]);
  assert.equal((await access.vendorStatus(ctx("VENDOR"))).id, id);
  assert.equal(query.mock.calls[0].arguments[1].replacements.id, id);
  for (const role of ["VENDOR", "CUSTOMER"])
    for (const operation of [() => access.list({}, ctx(role)), () => access.detail(id, ctx(role)), () => access.history(id, {}, ctx(role)), () => access.decide(id, "service", "approve", { expectedStatus: "Pending" }, ctx(role))])
      await assert.rejects(operation, e => e.extensions?.code === "FORBIDDEN");
  assert.equal(query.mock.callCount(), 1);
});

test("search, status filters and history use bounded pagination and SQL parameters", async t => {
  const query = t.mock.method(sequelize, "query", async sql => {
    if (sql.includes("COUNT_BIG(*) AS total")) return [{ total: 0 }];
    if (sql.includes("v.ServiceAccessStatus AS serviceStatus") && !sql.includes("FETCH NEXT")) return [{ id }];
    return [];
  });
  await access.list({ q: "garden_%'", service: "Approved", booking: "Rejected", category: "1", page: 2, pageSize: 10 }, ctx("ADMIN"));
  const paged = query.mock.calls.find(c => c.arguments[0].includes("FETCH NEXT"));
  assert.match(paged.arguments[0], /v.ServiceAccessStatus=:service/);
  assert.match(paged.arguments[0], /v.BookingAccessStatus=:booking/);
  assert.equal(paged.arguments[1].replacements.search, "%garden[_][%]'%");
  assert.equal(paged.arguments[1].replacements.offset, 10);
  assert.ok(!paged.arguments[0].includes("garden"));
  await access.history(id, { page: 3, pageSize: 10 }, ctx("ADMIN"));
  const history = query.mock.calls.find(c => c.arguments[0].includes("AuditLogId AS id"));
  assert.equal(history.arguments[1].replacements.id, id);
  assert.equal(history.arguments[1].replacements.offset, 20);
  assert.match(history.arguments[0], /EntityType='VendorAccess'/);
  await assert.rejects(access.list({ pageSize: 10001 }, ctx("ADMIN")));
  await assert.rejects(access.history(id, { page: 0 }, ctx("ADMIN")));
});

test("REST access APIs require authentication, admin role and trusted mutation origin", async t => {
  let auth = null;
  const app = express();
  app.use("/api/admin", createAdminRouter({ authenticateRequest: async () => auth }));
  app.use("/api/vendor", createVendorRouter({ authenticateRequest: async () => auth }));
  app.use((error, req, res, next) => res.status(error.extensions?.code === "UNAUTHENTICATED" ? 401 : error.extensions?.code === "FORBIDDEN" ? 403 : error.status || 400).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${url}/api/admin/vendor-access`)).status, 401);
  auth = ctx("VENDOR").auth;
  assert.equal((await fetch(`${url}/api/admin/vendor-access`)).status, 403);
  assert.equal((await fetch(`${url}/api/admin/vendor-access/${id}/service/approve`, { method: "PATCH", headers: { Origin: "https://forged.invalid" } })).status, 403);
  auth = ctx("ADMIN").auth;
  assert.equal((await fetch(`${url}/api/vendor/access-status`)).status, 403);
});
