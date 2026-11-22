import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { changeStatus } from "../src/modules/admin/bookings-management.service.js";
import { initiate } from "../src/modules/admin/booking-refunds.service.js";
import { details } from "../src/modules/bookings/bookings.service.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800";
const vendorId = "734b9588-c47c-40eb-8c17-1797d65a2801";
const userId = "734b9588-c47c-40eb-8c17-1797d65a2802";
const key = "734b9588-c47c-40eb-8c17-1797d65a2803";
const ctx = { auth: { user: {
  id: userId, active: true, emailVerified: true,
  roles: [{ code: "VENDOR", active: true }],
  vendor: { id: vendorId, active: true, verificationStatus: "Approved" },
} } };
const row = {
  BookingId: id, BookingNumber: "MNBK260001", VendorId: vendorId, CustomerId: key,
  BookingStatus: "Confirmed", PaymentStatus: "Paid", TotalAmount: 1000,
  SubTotal: 1000, DiscountAmount: 0, TaxAmount: 0, PlatformFee: 0,
  PaidAmount: 1000, AdvanceAmount: 100, BookingDate: "2000-01-01",
  UpdatedAt: "2026-11-01T00:00:00.000Z", AdminNotes: "Private administrator note",
  PolicySnapshotJson: JSON.stringify({ policy: {
    refundPercent: 100, cancellationFeePercent: 0, minimumNoticeHours: 0,
  } }),
};
const body = { expectedUpdatedAt: row.UpdatedAt, reason: "Vendor booking update", notes: "Internal vendor note" };
const payment = { PaymentId: key, PaymentStatus: "Success", Amount: 1000, Currency: "INR", GatewayName: "Razorpay", GatewayTransactionId: "pay_fixture" };

function setup(t, booking = row, extra = () => undefined) {
  t.mock.method(sequelize, "transaction", async (fn) => fn({ test: true }));
  return t.mock.method(sequelize, "query", async (sql, opts) => {
    const result = extra(sql, opts);
    if (result !== undefined) return result;
    if (sql.startsWith("SELECT * FROM dbo.Booking ")) {
      assert.match(sql, /VendorId=:owner/);
      assert.equal(opts.replacements.owner, vendorId);
      return booking ? [booking] : [];
    }
    if (sql.includes("FROM dbo.Payments")) return [payment];
    if (sql.includes("FROM dbo.PlatformCommission")) return [{ CommissionAmount: 100 }];
    // Suppress delivery in unit fixtures; no external notifications or payment calls.
    if (sql.includes("SELECT Milestone FROM dbo.BookingNotificationKeys")) return [{ Milestone: "fixture" }];
    return opts.type ? [] : [[], {}];
  });
}
const writes = (q) => q.mock.calls.filter((c) => /^(INSERT|UPDATE|DELETE)/.test(c.arguments[0]));
function inserted(call) {
  const columns = call.arguments[0].match(/\((.*?)\) OUTPUT/)[1].match(/\[([^\]]+)\]/g).map((s) => s.slice(1, -1));
  return Object.fromEntries(columns.map((name, index) => [name, call.arguments[1].replacements[`v${index}`]]));
}

test("vendors cannot use admin-default entry points or grant themselves a role", async (t) => {
  const q = setup(t);
  for (const fn of [
    () => changeStatus(id, "Cancelled", body, ctx),
    () => initiate(id, { ...body, idempotencyKey: key }, ctx),
    () => changeStatus(id, "Cancelled", body, ctx, "Customer"),
    () => initiate(id, { ...body, idempotencyKey: key }, ctx, { role: "Customer" }),
  ]) await assert.rejects(fn, (e) => e.status === 403 || e.extensions?.code === "FORBIDDEN");
  assert.equal(q.mock.callCount(), 0);
});

test("foreign bookings are denied before vendor status, cancellation or refund writes", async (t) => {
  const q = setup(t, null);
  for (const fn of [
    () => changeStatus(id, "Confirmed", body, ctx, "Vendor"),
    () => changeStatus(id, "Cancelled", body, ctx, "Vendor"),
    () => initiate(id, { ...body, idempotencyKey: key }, ctx, { role: "Vendor" }),
  ]) await assert.rejects(fn, (e) => e.status === 404);
  assert.equal(writes(q).length, 0);
  assert.ok(q.mock.calls.every((c) => /WITH\(UPDLOCK,HOLDLOCK\)/.test(c.arguments[0])));
});

test("stale vendor cancellations and refunds cannot write financial or booking records", async (t) => {
  const q = setup(t);
  const stale = { ...body, expectedUpdatedAt: "2020-01-01T00:00:00.000Z" };
  await assert.rejects(() => changeStatus(id, "Cancelled", stale, ctx, "Vendor"), /record changed/);
  await assert.rejects(() => initiate(id, { ...stale, idempotencyKey: key }, ctx, { role: "Vendor" }), /record changed/);
  assert.equal(writes(q).length, 0);
});

test("vendor confirmation requires advance payments in the captured ledger", async (t) => {
  const q = setup(t, { ...row, BookingStatus: "Accepted", BookingDate: "2090-01-01" }, (sql) => sql.includes("FROM dbo.Payments") ? [] : undefined);
  await assert.rejects(() => changeStatus(id, "Confirmed", body, ctx, "Vendor"), /verified in the payment ledger/);
  assert.equal(writes(q).length, 0);
});

test("vendors cannot bypass acceptance, reopen bookings or start future events", async (t) => {
  let booking = { ...row, BookingStatus: "Pending" };
  const q = setup(t, row, (sql) => sql.startsWith("SELECT * FROM dbo.Booking ") ? [booking] : undefined);
  await assert.rejects(() => changeStatus(id, "Confirmed", body, ctx, "Vendor"), /transition is not allowed/);
  booking = { ...row, BookingStatus: "Completed" };
  await assert.rejects(() => changeStatus(id, "Confirmed", body, ctx, "Vendor"), /transition is not allowed/);
  booking = { ...row, BookingDate: "2090-01-01" };
  await assert.rejects(() => changeStatus(id, "InProgress", body, ctx, "Vendor"), /date has not arrived/);
  assert.equal(writes(q).length, 0);
});

test("vendor completion retains product duration, unpaid balance and refund holds", async (t) => {
  let duration = true, paid = 1000, refunds = [];
  const booking = { ...row, BookingStatus: "InProgress", CommerceCheckoutKey: "reservation" };
  const q = setup(t, booking, (sql) => {
    if (sql.includes("FROM dbo.BookingReservations")) return duration ? [{ BookingId: id }] : [];
    if (sql.includes("FROM dbo.Payments")) return [{ ...payment, Amount: paid }];
    if (sql.includes("FROM dbo.Refunds")) return refunds;
  });
  await assert.rejects(() => changeStatus(id, "Completed", body, ctx, "Vendor"), /duration has not ended/);
  duration = false; paid = 500;
  await assert.rejects(() => changeStatus(id, "Completed", body, ctx, "Vendor"), /payment balance/);
  paid = 1000; refunds = [{ RefundStatus: "Pending", RefundAmount: 100 }];
  await assert.rejects(() => changeStatus(id, "Completed", body, ctx, "Vendor"), /payment balance/);
  assert.equal(writes(q).length, 0);
});

test("vendor cancellation preserves admin notes and records the correct actor and public reason", async (t) => {
  const q = setup(t);
  const result = await changeStatus(id, "Cancelled", body, ctx, "Vendor");
  assert.equal(result.status, "Cancelled");
  const update = q.mock.calls.find((c) => c.arguments[0].startsWith("UPDATE dbo.[Booking]"));
  assert.match(update.arguments[0], /\[VendorNotes\]/);
  assert.doesNotMatch(update.arguments[0], /\[AdminNotes\]|\[PaidAmount\]|\[PaymentStatus\]/);
  const history = inserted(q.mock.calls.find((c) => c.arguments[0].startsWith("INSERT INTO dbo.[BookingStatusHistory]")));
  assert.equal(history.ActorRole, "Vendor");
  assert.equal(history.ChangedBy, userId);
  assert.equal(history.PublicNote, body.reason);
  assert.equal(history.Notes, body.notes);
});

test("vendor cancellation cannot bypass paid payout reconciliation", async (t) => {
  const q = setup(t, row, (sql) => sql.includes("FROM dbo.VendorPayouts") ? [{ PayoutStatus: "Paid", TaxDeduction: 0, ApplicableFees: 0 }] : undefined);
  await assert.rejects(() => changeStatus(id, "Cancelled", body, ctx, "Vendor"), /existing payout/);
  assert.equal(writes(q).length, 0);
});

test("vendors can start and complete service bookings through the shared lifecycle", async (t) => {
  let booking = { ...row };
  const q = setup(t, row, (sql) => sql.startsWith("SELECT * FROM dbo.Booking ") ? [booking] : undefined);
  assert.equal((await changeStatus(id, "InProgress", body, ctx, "Vendor")).status, "InProgress");
  booking = { ...row, BookingStatus: "InProgress" };
  assert.equal((await changeStatus(id, "Completed", body, ctx, "Vendor")).status, "Completed");
  const history = q.mock.calls.filter((c) => c.arguments[0].startsWith("INSERT INTO dbo.[BookingStatusHistory]")).map(inserted);
  assert.deepEqual(history.map((entry) => entry.NewStatus), ["InProgress", "Completed"]);
  assert.ok(history.every((entry) => entry.ActorRole === "Vendor"));
});

test("eligible vendor refunds use the existing queue and reserve only the captured balance", async (t) => {
  const q = setup(t, { ...row, BookingStatus: "Cancelled", BookingDate: null });
  const result = await initiate(id, { ...body, idempotencyKey: key }, ctx, { role: "Vendor" });
  assert.equal(result.amount, 1000);
  const refund = inserted(q.mock.calls.find((c) => c.arguments[0].startsWith("INSERT INTO dbo.[Refunds]")));
  assert.equal(refund.RequestedBy, userId);
  assert.equal(refund.RefundStatus, "Pending");
  assert.equal(refund.RefundAmount, 1000);
});

test("vendor refund replay is idempotent and still requires booking ownership", async (t) => {
  const hash = createHash("sha256").update(JSON.stringify({ id, reason: body.reason, notes: body.notes })).digest("hex");
  const q = setup(t, row, (sql) => sql.includes("FROM dbo.AdminBookingOperations") ? [{ BookingId: id, RequestedBy: userId, RequestHash: hash, OperationId: key }] : undefined);
  const result = await initiate(id, { ...body, idempotencyKey: key, expectedUpdatedAt: "2020-01-01T00:00:00.000Z" }, ctx, { role: "Vendor" });
  assert.equal(result.replayed, true);
  assert.equal(writes(q).length, 0);
  assert.match(q.mock.calls[0].arguments[0], /VendorId=:owner/);
});

test("vendor refund cannot change policy or caller-supplied financial values", async (t) => {
  const q = setup(t, { ...row, BookingStatus: "Cancelled", PolicySnapshotJson: null });
  await assert.rejects(() => initiate(id, { ...body, idempotencyKey: key }, ctx, { role: "Vendor" }), /policy review/);
  for (const override of [{ amount: 10000 }, { role: "Admin" }, { vendorId: key }, { policy: {} }]) {
    await assert.rejects(() => initiate(id, { ...body, idempotencyKey: key, ...override }, ctx, { role: "Vendor" }));
  }
  assert.equal(writes(q).length, 0);
});

test("vendor details expose status actions and refund eligibility without private administrator fields", async (t) => {
  setup(t, { ...row, BookingStatus: "Accepted" });
  const data = await details(id, ctx, "Vendor");
  assert.ok(data.management.actions.includes("Confirmed"));
  assert.ok(data.management.actions.includes("cancel"));
  assert.equal(data.management.canRefund, false);
  assert.equal(data.booking.AdminNotes, undefined);
  assert.equal(data.booking.PolicySnapshotJson, undefined);
});

test("vendor HTTP actions enforce authentication, approval, origin and ownership", async (t) => {
  const q = setup(t, null);
  let auth = null;
  const app = express();
  app.use("/api/vendor", createVendorRouter({ authenticateRequest: async () => auth }));
  app.use((error, req, res, next) => res.status(error.status || ({ FORBIDDEN: 403, UNAUTHENTICATED: 401 }[error.extensions?.code]) || 400).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/vendor/bookings/${id}`;
  const send = (action, headers = {}) => fetch(`${base}/${action}`, { method: "POST", headers: {
    "Content-Type": "application/json", Origin: process.env.FRONTEND_URL, "X-Vendor-Request": "1", ...headers,
  }, body: JSON.stringify({ ...body, ...(action === "refund" ? { idempotencyKey: key } : action === "status" ? { status: "Confirmed" } : {}) }) });
  for (const action of ["status", "cancel", "refund"]) {
    auth = null;
    assert.equal((await send(action)).status, 401);
    auth = { user: { ...ctx.auth.user, roles: [{ code: "CUSTOMER", active: true }] } };
    assert.equal((await send(action)).status, 403);
    auth = { user: { ...ctx.auth.user, vendor: { ...ctx.auth.user.vendor, verificationStatus: "Pending" } } };
    assert.equal((await send(action)).status, 403);
    auth = ctx.auth;
    assert.equal((await send(action, { Origin: "https://untrusted.example" })).status, 403);
    assert.equal((await send(action, { "X-Vendor-Request": "0" })).status, 403);
  }
  assert.equal(q.mock.callCount(), 0);
  for (const action of ["status", "cancel", "refund"]) assert.equal((await send(action)).status, 404);
  assert.equal(writes(q).length, 0);
});
