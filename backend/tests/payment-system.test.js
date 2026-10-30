import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import express from "express";
import {
  checkoutInput,
  payableMinor,
  webhook,
} from "../src/modules/customers/workspace.payments.js";
import {
  requestInput,
  requestRefund,
  receipt,
  status,
  refunds,
} from "../src/modules/payments/customer-finance.js";
import * as reports from "../src/modules/payments/finance-reports.js";
import * as review from "../src/modules/payments/refund-review.js";
import { sequelize } from "../src/config/database.js";
import {
  calculateCommission,
  ruleInput,
  create as createRule,
} from "../src/modules/payments/commission-rules.js";
import { minor } from "../src/modules/admin/booking-finance.js";
import { reconcileRefund } from "../src/modules/admin/booking-refunds.service.js";
test("refund confirmation before a local payment exists remains retryable", async (t) => {
  t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(
    () =>
      reconcileRefund({
        id: "rfnd_Delayed",
        payment_id: "pay_Delayed",
        amount: 100,
        currency: "INR",
        status: "processed",
      }),
    (e) => e.status === 503,
  );
});
test("decimal conversion and commission calculations use bounded integer paise", () => {
  assert.equal(minor("1.005"), 101);
  assert.equal(minor("50000.99"), 5000099);
  for (const invalid of ["NaN", "Infinity", "-1", "9007199254740991"])
    assert.throws(() => minor(invalid));
  const b = { TotalAmount: "50000", SubTotal: "45000", DiscountAmount: "1000" };
  assert.equal(calculateCommission(b, null, 10), 5000);
  assert.equal(
    calculateCommission(b, {
      base: "NetSubtotal",
      type: "Combined",
      rate: 10,
      fixedAmount: 100,
    }),
    4500,
  );
  assert.equal(
    calculateCommission(b, {
      base: "BookingTotal",
      type: "Fixed",
      rate: 0,
      fixedAmount: 60000,
    }),
    50000,
  );
  assert.equal(calculateCommission(b, null, null), null);
});
test("commission rules require effective ranges, defined calculation models and authorized configuration", async () => {
  const base = {
    name: "Promotional vendor fee",
    type: "Percentage",
    rate: 10,
    fixedAmount: 0,
    base: "BookingTotal",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    reason: "Approved schedule",
  };
  assert.ok(ruleInput.safeParse(base).success);
  for (const override of [
    { rate: 101 },
    { fixedAmount: 5 },
    { effectiveTo: "2025-01-01T00:00:00.000Z" },
    { type: "arbitrary" },
    { priority: 1001 },
  ])
    assert.equal(ruleInput.safeParse({ ...base, ...override }).success, false);
  await assert.rejects(
    () => createRule(base, { auth: { user: null } }),
    (e) => e.extensions?.code === "UNAUTHENTICATED",
  );
});
test("checkout rejects supplied money, ownership and success overrides and requires explicit terms", () => {
  const valid = { idempotencyKey: randomUUID(), termsAccepted: true };
  assert.ok(checkoutInput.safeParse(valid).success);
  for (const override of [
    { amount: 1 },
    { currency: "USD" },
    { customerId: randomUUID() },
    { status: "Success" },
    { termsAccepted: false },
    { mode: "arbitrary" },
    { idempotencyKey: "reuse" },
  ])
    assert.equal(
      checkoutInput.safeParse({ ...valid, ...override }).success,
      false,
    );
});
test("installments use the remaining backend balance and subtract previously captured advance", () => {
  const booking = {
    BookingStatus: "Accepted",
    RemainingAmount: "1000.25",
    AdvanceAmount: "250.25",
    PaidAmount: "100.10",
  };
  assert.equal(payableMinor(booking, "balance"), 100025);
  assert.equal(payableMinor(booking, "advance"), 15015);
  assert.throws(() => payableMinor({ ...booking, PaidAmount: 300 }, "advance"));
  assert.throws(() => payableMinor({ ...booking, BookingStatus: "Cancelled" }));
});
test("customer partial refund requests reject nonpositive money, excess precision and identity/status injection", () => {
  const base = {
    bookingId: randomUUID(),
    amount: 10.25,
    reason: "Cancelled booking",
    idempotencyKey: randomUUID(),
  };
  assert.ok(requestInput.safeParse(base).success);
  for (const value of [
    { amount: 0 },
    { amount: -1 },
    { amount: 0.001 },
    { status: "Completed" },
    { customerId: randomUUID() },
  ])
    assert.equal(requestInput.safeParse({ ...base, ...value }).success, false);
});
test("financial services authorize roles before inspecting input or accessing SQL", async () => {
  const ctx = { auth: { user: null } };
  for (const call of [
    () => requestRefund({}, ctx),
    () => refunds({}, ctx),
    () => receipt("bad", ctx),
    () => status("bad", ctx),
    () => reports.overview({}, ctx),
    () => reports.reconciliation({}, ctx),
    () => reports.refresh("bad", ctx),
    () => reports.retryEvent("bad", ctx),
    () => reports.earnings(ctx),
    () => reports.exportReport({}, ctx),
    () => review.list({}, ctx),
    () => review.decide("bad", {}, ctx),
  ])
    await assert.rejects(call, (e) => e.extensions?.code === "UNAUTHENTICATED");
});
test("financial CSV prevents spreadsheet formula execution and escapes quotes", () => {
  assert.equal(reports.csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(reports.csvCell("A,B"), '"A,B"');
});
test("invalid webhook signatures and unsupported signed events never query the database", async () => {
  const saved = process.env.RAZORPAY_WEBHOOK_SECRET,
    original = sequelize.query;
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-only-secret";
  sequelize.query = async () => {
    throw new Error("Unexpected SQL access");
  };
  const app = express();
  app.post("/", express.raw({ type: "application/json" }), webhook);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const body = JSON.stringify({ event: "unknown.event" });
    const invalid = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": "a".repeat(64),
      },
      body,
    });
    assert.equal(invalid.status, 400);
    const signed = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": createHmac("sha256", "test-only-secret")
          .update(body)
          .digest("hex"),
      },
      body,
    });
    assert.equal(signed.status, 200);
    assert.equal((await signed.json()).ignored, true);
  } finally {
    sequelize.query = original;
    if (saved === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = saved;
    await new Promise((r) => server.close(r));
  }
});
