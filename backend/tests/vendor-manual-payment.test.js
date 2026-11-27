import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { markBookingPaid, manualPaymentInput } from "../src/modules/bookings/manual-payment.service.js";
import { details } from "../src/modules/bookings/bookings.service.js";
import { financialSummary, syncPayout } from "../src/modules/admin/booking-finance.js";
import { eligiblePayout } from "../src/modules/admin/payouts.service.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800";
const vendorId = "734b9588-c47c-40eb-8c17-1797d65a2801";
const actorId = "734b9588-c47c-40eb-8c17-1797d65a2802";
const key = "734b9588-c47c-40eb-8c17-1797d65a2803";
const ctx = { auth: { user: {
  id: actorId, active: true, emailVerified: true, roles: [{ code: "VENDOR", active: true }],
  vendor: { id: vendorId, active: true, verificationStatus: "Approved" },
} } };
const booking = {
  BookingId: id, VendorId: vendorId, CustomerId: key, BookingNumber: "MNBK260001",
  BookingStatus: "Accepted", PaymentStatus: "PartiallyPaid", BookingDate: "2090-01-01",
  SubTotal: 1000, DiscountAmount: 0, TaxAmount: 0, PlatformFee: 0,
  TotalAmount: 1000, PaidAmount: 250, AdvanceAmount: 100,
  UpdatedAt: "2026-11-22T00:00:00.000Z", PolicySnapshotJson: JSON.stringify({ commissionRate: 10 }),
};
const input = { expectedUpdatedAt: booking.UpdatedAt, idempotencyKey: key, method: "Cash", reference: "", reason: "Received the balance in cash", notes: "Private vendor note" };
const payment = { PaymentId: key, Amount: 250, Currency: "INR", PaymentStatus: "Success", GatewayName: "Razorpay", GatewayTransactionId: "pay_fixture" };

function inserted(call) {
  const columns = call.arguments[0].match(/\((.*?)\) OUTPUT/)[1].match(/\[([^\]]+)\]/g).map((s) => s.slice(1, -1));
  return Object.fromEntries(columns.map((column, index) => [column, call.arguments[1].replacements[`v${index}`]]));
}
const writes = (q) => q.mock.calls.filter((call) => /^(INSERT|UPDATE|DELETE)/.test(call.arguments[0]));
const insertedRows = (q, table) => q.mock.calls.filter((call) => call.arguments[0].startsWith(`INSERT INTO dbo.[${table}]`)).map(inserted);
function setup(t, row = booking, extra = () => undefined) {
  const tx = { test: true };
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql, opts) => {
    const result = extra(sql, opts);
    if (result !== undefined) return result;
    if (sql.startsWith("SELECT * FROM dbo.Booking ")) {
      assert.match(sql, /VendorId=:owner/);
      assert.equal(opts.replacements.owner, vendorId);
      return row ? [row] : [];
    }
    if (sql.startsWith("SELECT PaymentId,PaymentReference")) return [payment];
    if (sql.includes("SELECT Milestone FROM dbo.BookingNotificationKeys")) return [{ Milestone: "fixture" }];
    return opts.type ? [] : [[], {}];
  });
  return { query, tx };
}

test("manual paid payload requires method, reason, version and electronic reference and refuses money or ownership overrides", () => {
  assert.equal(manualPaymentInput.safeParse(input).success, true);
  for (const override of [{ amount: 1 }, { paidAmount: 1 }, { status: "Paid" }, { vendorId }, { method: "Razorpay" }, { reason: " " }, { expectedUpdatedAt: "bad" }, { method: "UPI", reference: "" }])
    assert.equal(manualPaymentInput.safeParse({ ...input, ...override }).success, false);
  assert.equal(manualPaymentInput.safeParse({ ...input, method: "UPI", reference: "upi-12345" }).success, true);
});

test("wrong-role and unapproved vendors cannot record payments before SQL", async (t) => {
  const { query } = setup(t);
  for (const user of [
    { ...ctx.auth.user, roles: [{ code: "CUSTOMER", active: true }] },
    { ...ctx.auth.user, vendor: { ...ctx.auth.user.vendor, verificationStatus: "Pending" } },
  ]) await assert.rejects(() => markBookingPaid(id, input, { auth: { user } }), (e) => e.extensions?.code === "FORBIDDEN");
  assert.equal(query.mock.callCount(), 0);
});

test("manual payment ownership and stale-version guards run before financial writes", async (t) => {
  const { query } = setup(t, null);
  await assert.rejects(() => markBookingPaid(id, input, ctx), (e) => e.status === 404);
  assert.equal(writes(query).length, 0);
  assert.match(query.mock.calls[0].arguments[0], /WITH\(UPDLOCK,HOLDLOCK\)/);
});

test("stale payment submissions cannot record money", async (t) => {
  const { query } = setup(t);
  await assert.rejects(() => markBookingPaid(id, { ...input, expectedUpdatedAt: "2020-01-01T00:00:00.000Z" }, ctx), /record changed/);
  assert.equal(writes(query).length, 0);
});

test("mark paid records only the outstanding balance and preserves booking status with an atomic ledger and history", async (t) => {
  const { query, tx } = setup(t);
  const result = await markBookingPaid(id, input, ctx);
  assert.equal(result.amount, 750);
  const recorded = insertedRows(query, "Payments")[0];
  assert.equal(recorded.Amount, 750);
  assert.equal(recorded.GatewayName, "VendorManual");
  assert.equal(recorded.PaymentStatus, "Success");
  assert.equal(recorded.PaymentMethod, "Cash");
  assert.equal(JSON.parse(recorded.GatewayResponse).recordedBy, actorId);
  assert.equal(insertedRows(query, "PaymentTransactions")[0].TransactionType, "ManualPayment");
  const ledger = insertedRows(query, "FinancialLedger");
  assert.deepEqual(ledger.map((row) => [row.Kind, row.Amount]), [["VendorPaymentReceived", 750], ["CommissionAccrued", 75]]);
  const update = query.mock.calls.find((call) => call.arguments[0].startsWith("UPDATE dbo.[Booking]"));
  assert.match(update.arguments[0], /\[PaidAmount\]=:v0,\[PaymentStatus\]=:v1/);
  assert.equal(update.arguments[1].replacements.v0, 1000);
  assert.equal(update.arguments[1].replacements.v1, "Paid");
  assert.doesNotMatch(update.arguments[0], /\[BookingStatus\]|\[AdminNotes\]/);
  const history = insertedRows(query, "BookingStatusHistory")[0];
  assert.equal(history.ActorRole, "Vendor");
  assert.equal(history.PublicNote, input.reason);
  assert.equal(history.Notes, input.notes);
  assert.ok(writes(query).every((call) => call.arguments[1].transaction === tx));
});

test("cash payments can settle an unpaid booking down to the final paise", async (t) => {
  const { query } = setup(t, { ...booking, TotalAmount: 250.01 });
  assert.equal((await markBookingPaid(id, input, ctx)).amount, 0.01);
  assert.equal(insertedRows(query, "Payments")[0].Amount, 0.01);
});

test("paid and terminal bookings, refunds, pending payments and unreconciled balances reject manual recording", async (t) => {
  let current = booking, payments = [payment], refunds = [], payouts = [];
  const { query } = setup(t, booking, (sql) => {
    if (sql.startsWith("SELECT * FROM dbo.Booking ")) return [current];
    if (sql.startsWith("SELECT PaymentId,PaymentReference")) return payments;
    if (sql.includes("FROM dbo.Refunds")) return refunds;
    if (sql.includes("FROM dbo.VendorPayouts")) return payouts;
  });
  for (const status of ["Pending", "Cancelled", "Rejected", "Refunded", "Completed", "Disputed"]) {
    current = { ...booking, BookingStatus: status };
    await assert.rejects(() => markBookingPaid(id, input, ctx), /active booking/);
  }
  current = { ...booking, PaymentStatus: "Paid" };
  await assert.rejects(() => markBookingPaid(id, input, ctx), /already paid/);
  current = { ...booking, PaidAmount: 100 };
  await assert.rejects(() => markBookingPaid(id, input, ctx), /Reconcile the recorded payment/);
  current = booking;
  refunds = [{ RefundStatus: "Pending", RefundAmount: 10 }];
  await assert.rejects(() => markBookingPaid(id, input, ctx), /refunds/);
  refunds = [{ RefundStatus: "Completed", RefundAmount: 10 }];
  await assert.rejects(() => markBookingPaid(id, input, ctx), /refunds/);
  refunds = []; payments = [payment, { PaymentStatus: "Processing" }];
  await assert.rejects(() => markBookingPaid(id, input, ctx), /pending payment/);
  payments = [payment]; payouts = [{ PayoutStatus: "Processing", TaxDeduction: 0, ApplicableFees: 0 }];
  await assert.rejects(() => markBookingPaid(id, input, ctx), /existing payout/);
  assert.equal(writes(query).length, 0);
});

test("retries with the same key replay without duplicating payments even when the version is stale", async (t) => {
  const requestHash = createHash("sha256").update(JSON.stringify({ id, actor: actorId, method: input.method, reference: input.reference, reason: input.reason, notes: input.notes })).digest("hex");
  const { query } = setup(t, booking, (sql) => sql.includes("WHERE PaymentReference=:reference") ? [{ PaymentId: key, BookingId: id, GatewayName: "VendorManual", GatewayResponse: JSON.stringify({ requestHash }), Amount: 750 }] : undefined);
  const result = await markBookingPaid(id, { ...input, expectedUpdatedAt: "2020-01-01T00:00:00.000Z" }, ctx);
  assert.equal(result.replayed, true);
  assert.equal(result.amount, 750);
  assert.equal(writes(query).length, 0);
  await assert.rejects(() => markBookingPaid(id, { ...input, method: "UPI", reference: "different" }, ctx), /different payment/);
});

test("vendor details expose mark-paid eligibility and a server-calculated balance", async (t) => {
  setup(t);
  const data = await details(id, ctx, "Vendor");
  assert.equal(data.management.canMarkPaid, true);
  assert.equal(data.management.paymentAmount, 750);
});

test("vendor-collected payments satisfy the booking balance and keep payouts on hold", async (t) => {
  const row = { ...booking, BookingStatus: "Completed", PaidAmount: 1000, PaymentStatus: "Paid" };
  const manual = { ...payment, GatewayName: "VendorManual", Amount: 750 };
  const { query } = setup(t, row, (sql) => sql.startsWith("SELECT PaymentId,PaymentReference") ? [payment, manual] : undefined);
  await syncPayout(row, { ...ctx, actorRole: "Vendor" }, { test: true });
  const payout = insertedRows(query, "VendorPayouts")[0];
  assert.equal(payout.PayoutStatus, "OnHold");
  const summary = financialSummary(row, { payments: [payment, manual], refunds: [], payouts: [], commissions: [] });
  assert.equal(summary.remaining, 0);
  assert.equal(summary.canRefund, false);
  assert.throws(() => eligiblePayout(row, { BookingId: id, VendorId: vendorId }, { payments: [manual], commissions: [] }), /settlement reconciliation/);
});

test("vendor mark-paid HTTP route enforces authentication, approval, origin and ownership", async (t) => {
  const { query } = setup(t, null);
  let auth = null;
  const app = express();
  app.use("/api/vendor", createVendorRouter({ authenticateRequest: async () => auth }));
  app.use((error, req, res, next) => res.status(error.status || ({ FORBIDDEN: 403, UNAUTHENTICATED: 401 }[error.extensions?.code]) || 400).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const send = (headers = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/vendor/bookings/${id}/mark-paid`, { method: "POST", headers: {
    "Content-Type": "application/json", Origin: process.env.FRONTEND_URL, "X-Vendor-Request": "1", ...headers,
  }, body: JSON.stringify(input) });
  assert.equal((await send()).status, 401);
  auth = { user: { ...ctx.auth.user, roles: [{ code: "CUSTOMER", active: true }] } };
  assert.equal((await send()).status, 403);
  auth = { user: { ...ctx.auth.user, vendor: { ...ctx.auth.user.vendor, verificationStatus: "Pending" } } };
  assert.equal((await send()).status, 403);
  auth = ctx.auth;
  assert.equal((await send({ Origin: "https://untrusted.example" })).status, 403);
  assert.equal((await send({ "X-Vendor-Request": "0" })).status, 403);
  assert.equal(query.mock.callCount(), 0);
  assert.equal((await send()).status, 404);
  assert.equal(writes(query).length, 0);
});
