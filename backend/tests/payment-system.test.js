import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import express from "express";
import {
  configured,
  gateway,
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
function checkoutEnvironment(t) {
  const values = {
    RAZORPAY_KEY_ID: "rzp_test_checkout",
    RAZORPAY_KEY_SECRET: "test-api-secret",
    RAZORPAY_WEBHOOK_SECRET: "",
  };
  for (const [key, value] of Object.entries(values)) {
    const saved = process.env[key];
    t.after(() => {
      if (saved === undefined) delete process.env[key];
      else process.env[key] = saved;
    });
    process.env[key] = value;
  }
}
test("checkout API access works without a webhook secret but requires both API credentials", async (t) => {
  checkoutEnvironment(t);
  const provider = t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ id: "pay_Test", status: "captured" }),
  }));
  assert.equal(configured(), true);
  assert.equal((await gateway("/payments/pay_Test")).status, "captured");
  assert.equal(provider.mock.callCount(), 1);
  for (const key of ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]) {
    const saved = process.env[key];
    for (const value of ["", "   "]) {
      process.env[key] = value;
      assert.equal(configured(), false);
      await assert.rejects(() => gateway("/payments/pay_Test"), (e) => e.status === 503);
    }
    process.env[key] = saved;
  }
  assert.equal(provider.mock.callCount(), 1);
});

test("webhooks remain unavailable without a signing secret even when checkout is configured", async (t) => {
  checkoutEnvironment(t);
  let status;
  const res = {
    status(code) { status = code; return this; },
    json(body) { return body; },
  };
  assert.equal(configured(), true);
  const result = await webhook({ body: Buffer.from("{}") }, res);
  assert.equal(status, 503);
  assert.equal(result.success, false);
});

test("provider order limits return an actionable rejection without exposing provider payloads", async (t) => {
  checkoutEnvironment(t);
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { description: "Amount exceeds maximum amount allowed.", sensitive: "private-provider-data" } }),
  }));
  await assert.rejects(
    () => gateway("/orders", { amount: 90900000, currency: "INR" }),
    (e) => e.status === 422 && /per-order limit/.test(e.message) && !/private-provider-data/.test(e.message),
  );
});

test("provider authentication, throttling and invalid responses are safe and retryable", async (t) => {
  checkoutEnvironment(t);
  for (const status of [401, 403, 429, 500]) {
    const mocked = t.mock.method(globalThis, "fetch", async () => ({
      ok: false, status,
      json: async () => ({ error: { description: "private-provider-data" } }),
    }));
    await assert.rejects(() => gateway("/orders", {}), (e) =>
      e.status === (status === 500 ? 502 : 503) && !e.message.includes("private-provider-data"));
    mocked.mock.restore();
  }
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false, status: 502,
    json: async () => { throw new SyntaxError("private-response"); },
  }));
  await assert.rejects(() => gateway("/orders", {}), (e) => e.status === 502 && /invalid response/.test(e.message));
});

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

test("percentage and custom installments use the current remaining balance and enforce bounds", () => {
  const booking = { BookingStatus: "Accepted", RemainingAmount: "1000.25", AdvanceAmount: "250.25", PaidAmount: "100.10" };
  for (const [mode, expected] of [["10",10003], ["25",25006], ["50",50013], ["75",75019], ["100",100025]]) {
    assert.equal(payableMinor(booking, mode), expected);
    assert.ok(checkoutInput.safeParse({ idempotencyKey: randomUUID(), termsAccepted: true, mode }).success);
  }
  assert.equal(payableMinor(booking, "custom", "123.45"), 12345);
  assert.equal(payableMinor(booking, "custom", "1000.25"), 100025);
  assert.equal(payableMinor({ ...booking, RemainingAmount: "500" }, "25"), 12500);
  for (const amount of ["", "0", "-1", "0.99", "1000.26", "1.001", "1e2"])
    assert.throws(() => payableMinor(booking, "custom", amount));
  assert.throws(() => payableMinor(booking, "invalid"));
  assert.throws(() => payableMinor({ ...booking, BookingStatus: "Cancelled" }, "custom", "10"));
  const base = { idempotencyKey: randomUUID(), termsAccepted: true };
  assert.ok(checkoutInput.safeParse({ ...base, mode: "custom", customAmount: "123.45" }).success);
  for (const input of [
    { mode: "custom" }, { mode: "custom", customAmount: 10 },
    { mode: "custom", customAmount: "1.001" }, { mode: "custom", customAmount: "-1" },
    { mode: "25", customAmount: "10" }, { mode: "balance", customAmount: "10" },
    { mode: "custom", customAmount: "10", amount: 1 },
  ]) assert.equal(checkoutInput.safeParse({ ...base, ...input }).success, false);
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
