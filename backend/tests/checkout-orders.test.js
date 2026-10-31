import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { checkInstallmentChange, createOrder } from "../src/modules/customers/workspace.payments.js";
import { status as paymentStatus } from "../src/modules/payments/customer-finance.js";

const oldOrder = {
  OrderId: randomUUID(), GatewayOrderId: "order_Previous", AmountMinor: 9090000,
  Currency: "INR", Status: "Created", PaymentMode: "10", CheckoutKey: randomUUID(),
};

function provider({ state = "created", paid = 0, payments = [] } = {}) {
  return async (path) => path.endsWith("/payments")
    ? { count: payments.length, items: payments }
    : { id: oldOrder.GatewayOrderId, amount: oldOrder.AmountMinor, currency: "INR", amount_paid: paid, status: state };
}

test("empty and failed previous checkout attempts allow a different installment", async () => {
  await checkInstallmentChange(oldOrder, { request: provider() });
  await checkInstallmentChange(oldOrder, { request: provider({ state: "attempted", payments: [
    { order_id: oldOrder.GatewayOrderId, amount: oldOrder.AmountMinor, currency: "INR", status: "failed" },
  ] }) });
});

test("captured, authorized, processing and unknown payment states block installment changes", async () => {
  for (const state of ["created", "authorized", "captured", "refunded", "unknown"]) {
    await assert.rejects(() => checkInstallmentChange(oldOrder, { request: provider({ payments: [
      { order_id: oldOrder.GatewayOrderId, amount: oldOrder.AmountMinor, currency: "INR", status: state },
    ] }) }), (e) => e.status === 409);
  }
  for (const remote of [{ state: "paid", paid: 9090000 }, { state: "attempted", paid: 100 }])
    await assert.rejects(() => checkInstallmentChange(oldOrder, { request: provider(remote) }), (e) => e.status === 409);
});

test("provider errors, incomplete collections and mismatched order identity fail closed", async () => {
  const valid = await provider()(`/orders/${oldOrder.GatewayOrderId}`);
  for (const invalid of [
    { ...valid, id: "order_Foreign" }, { ...valid, amount: 1 },
    { ...valid, currency: "USD" }, { ...valid, amount_paid: undefined },
    { ...valid, status: "unknown" },
  ]) await assert.rejects(() => checkInstallmentChange(oldOrder, { request: async () => invalid }), (e) => e.status === 409);
  for (const collection of [{}, { count: 1, items: [] }, { count: 1, items: [{ order_id: "order_Foreign", amount: oldOrder.AmountMinor, currency: "INR", status: "failed" }] }])
    await assert.rejects(() => checkInstallmentChange(oldOrder, { request: async (path) => path.endsWith("/payments") ? collection : valid }), (e) => e.status === 409);
  await assert.rejects(() => checkInstallmentChange(oldOrder, { request: async () => { throw Object.assign(new Error("Provider unavailable"), { status: 502 }); } }), (e) => e.status === 502);
});

function fixture(t, { active = false, foreign = false } = {}) {
  for (const [key, value] of Object.entries({ RAZORPAY_KEY_ID: "rzp_test_fixture", RAZORPAY_KEY_SECRET: "fixture" })) {
    const saved = process.env[key];
    process.env[key] = value;
    t.after(() => { if (saved === undefined) delete process.env[key]; else process.env[key] = saved; });
  }
  const bookingId = randomUUID(), customerId = randomUUID();
  const booking = { BookingId: bookingId, CustomerId: customerId, BookingNumber: "CHECKOUT", BookingStatus: "Accepted", RemainingAmount: "909000", PaidAmount: "0", AdvanceAmount: "899910", PaymentStatus: "Pending" };
  const orders = [{ ...oldOrder, BookingId: bookingId, CustomerId: customerId }];
  const tx = {};
  const ctx = { auth: { user: { id: customerId, active: true, emailVerified: true, roles: [{ code: "CUSTOMER", active: true }] } } };
  let creates = 0, reads = 0;
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  t.mock.method(sequelize, "query", async (sql, options) => {
    if (sql.includes("FROM dbo.[Booking]")) {
      if (options.transaction) assert.match(sql, /UPDLOCK,HOLDLOCK/);
      return foreign ? [] : [booking];
    }
    if (sql.includes("WHERE CheckoutKey=:key")) return orders.filter((o) => o.CheckoutKey === options.replacements.key);
    if (sql.includes("FROM dbo.CustomerPaymentOrders")) return sql.includes("AS reference")
      ? orders.map((o) => ({ id: o.OrderId, status: o.Status })) : orders;
    if (sql.includes("INSERT INTO dbo.[CustomerPaymentOrders]")) {
      const row = Object.fromEntries([...sql.matchAll(/\[([A-Za-z]+)\]/g)].slice(1, -1).map((m, i) => [m[1], options.replacements[`v${i}`]]));
      row.OrderId = randomUUID();
      orders.push(row);
      return [{ id: row.OrderId }];
    }
    if (/FROM dbo\.(Payments|Refunds|VendorPayouts|PlatformCommission)/.test(sql)) return [];
    if (sql.startsWith("UPDATE dbo.[CustomerPaymentOrders]")) return [];
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    let data;
    if (options.method === "POST") {
      creates++;
      const body = JSON.parse(options.body);
      data = { id: `order_New${creates}`, amount: body.amount, currency: body.currency };
    } else {
      reads++;
      const selected = orders.find((o) => url.includes(o.GatewayOrderId));
      if (!selected) throw new Error("Unknown provider order");
      data = url.endsWith("/payments")
        ? { count: active ? 1 : 0, items: active ? [{ order_id: selected.GatewayOrderId, amount: selected.AmountMinor, currency: "INR", status: "authorized" }] : [] }
        : { id: selected.GatewayOrderId, amount: Number(selected.AmountMinor), currency: "INR", amount_paid: 0, status: "created" };
    }
    return { ok: true, json: async () => data };
  });
  return { bookingId, ctx, orders, counts: () => ({ creates, reads }) };
}

test("custom checkout replaces the stale 10% amount, replays safely and retains older orders", async (t) => {
  const f = fixture(t);
  const input = { idempotencyKey: randomUUID(), termsAccepted: true, mode: "custom", customAmount: "10000" };
  const first = await createOrder(f.bookingId, f.ctx, input);
  assert.equal(first.amount, 1000000);
  const replay = await createOrder(f.bookingId, f.ctx, input);
  assert.equal(replay.orderId, first.orderId);
  assert.equal(f.counts().creates, 1);
  assert.equal(f.orders.length, 2);
  assert.equal(f.orders[0].Status, "Created");
  const previous = await createOrder(f.bookingId, f.ctx, { idempotencyKey: randomUUID(), termsAccepted: true, mode: "10" });
  assert.equal(previous.orderId, oldOrder.GatewayOrderId);
  assert.equal(f.counts().creates, 1);
  await assert.rejects(() => createOrder(f.bookingId, f.ctx, { ...input, customAmount: "20000" }), (e) => e.status === 409);
});

test("an authorized previous payment blocks creation of a different order", async (t) => {
  const f = fixture(t, { active: true });
  await assert.rejects(() => createOrder(f.bookingId, f.ctx, { idempotencyKey: randomUUID(), termsAccepted: true, mode: "custom", customAmount: "10000" }), (e) => e.status === 409 && /still being confirmed/.test(e.message));
  assert.equal(f.counts().creates, 0);
});

test("foreign booking checkout is rejected before contacting the provider", async (t) => {
  const f = fixture(t, { foreign: true });
  await assert.rejects(() => createOrder(f.bookingId, f.ctx, { idempotencyKey: randomUUID(), termsAccepted: true, mode: "10" }), (e) => e.status === 404);
  assert.deepEqual(f.counts(), { creates: 0, reads: 0 });
});

test("Check server status checks every older unpaid order after installment changes", async (t) => {
  const f = fixture(t);
  f.orders.push({ ...f.orders[0], OrderId: randomUUID(), GatewayOrderId: "order_Second", AmountMinor: 1000000 });
  await paymentStatus(f.bookingId, f.ctx, true);
  assert.equal(f.counts().reads, 2);
  assert.equal(f.counts().creates, 0);
});
