import test from "node:test";
import assert from "node:assert/strict";
import {
  offerSchema,
  assertAllowed,
  assertQuantity,
  bookingWindow,
  sellingTotals,
} from "../src/modules/shopping/commerce.policy.js";
import {
  purchaseInput,
  assertCaptured,
  cart,
  purchase,
  verifyPurchase,
} from "../src/modules/shopping/shopping.service.js";
import {
  bookingCheckoutInput,
  bookingCheckout,
} from "../src/modules/shopping/booking-checkout.js";
import {
  capacity,
  reservedQuantity,
} from "../src/modules/shopping/booking-capacity.js";
import { sequelize } from "../src/config/database.js";
const id = "734b9588-c47c-40eb-8c17-1797d65a2800";
const sell = { price: 15000, stock: 10, sku: "DECOR-1" };
const book = {
  price: 2000,
  capacity: 20,
  maximum: 20,
  cancellation: "Cancel before confirmation.",
  refund: "Reviewed refund.",
};
test("Sell Only, Book Only and Both require distinct prices and permitted category capabilities", () => {
  for (const [type, config] of [
    ["Sell", { sell }],
    ["Book", { book }],
    ["Both", { sell, book }],
  ]) {
    const offer = offerSchema.parse({ type, ...config });
    assertAllowed(offer, { AllowBuyOnline: true, AllowBooking: true });
    assert.equal(offer.type, type);
    for (const category of [
      { AllowBuyOnline: false, AllowBooking: false },
      ...(type !== "Book"
        ? [{ AllowBuyOnline: false, AllowBooking: true }]
        : []),
      ...(type !== "Sell"
        ? [{ AllowBuyOnline: true, AllowBooking: false }]
        : []),
    ])
      assert.throws(() => assertAllowed(offer, category), /does not permit/);
  }
  assertAllowed(null, { AllowBuyOnline: false, AllowBooking: true });
  assert.throws(() =>
    assertAllowed(null, { AllowBuyOnline: true, AllowBooking: false }),
  );
});
test("configuration rejects missing branches, fractional quantities, invalid ranges and overlapping slots", () => {
  for (const input of [
    { type: "Both", sell },
    { type: "Book", book: { ...book, capacity: 0 } },
    { type: "Sell", sell: { ...sell, stock: 1.5 } },
    { type: "Sell", sell, book },
    { type: "Book", book: { ...book, minimum: 5, maximum: 2 } },
    { type: "Book", book: { ...book, advance: 2001 } },
    {
      type: "Book",
      book: {
        ...book,
        slots: [
          { start: "09:00", end: "11:00" },
          { start: "10:00", end: "12:00" },
        ],
      },
    },
  ])
    assert.equal(offerSchema.safeParse(input).success, false);
});
test("selling totals use server money and quantity limits independent from booking capacity", () => {
  const totals = sellingTotals([
    { UnitPrice: 10.01, Quantity: 3, TaxRate: 18, ShippingAmount: 40 },
  ]);
  assert.equal(totals.subtotal, 30.03);
  assert.equal(totals.tax, 5.41);
  assert.equal(totals.total, 75.44);
  assertQuantity(2, { minimum: 2, maximum: 5 }, 10);
  for (const q of [0, 1, 6, 1.5])
    assert.throws(() => assertQuantity(q, { minimum: 2, maximum: 5 }, 10));
  assert.throws(
    () => assertQuantity(5, { minimum: 1, maximum: 10 }, 4),
    /no longer available/,
  );
});
test("quantity reservations accept no date/time and scheduled durations and slots produce bounded windows", () => {
  const config = offerSchema.parse({ type: "Book", book }).book;
  assert.deepEqual(
    bookingWindow({ ...config, mode: "Quantity" }, undefined, undefined),
    { startsAt: null, endsAt: null },
  );
  assert.throws(() =>
    bookingWindow({ ...config, mode: "Quantity" }, "2090-01-01"),
  );
  assert.deepEqual(
    bookingWindow({ ...config, duration: "Weekly" }, "2090-01-01"),
    { startsAt: "2090-01-01T00:00:00", endsAt: "2090-01-08T00:00:00" },
  );
  assert.deepEqual(
    bookingWindow(
      { ...config, slots: [{ start: "09:00", end: "11:00" }] },
      "2090-01-01",
      "09:00",
    ),
    { startsAt: "2090-01-01T09:00:00", endsAt: "2090-01-01T11:00:00" },
  );
  assert.throws(() =>
    bookingWindow(
      { ...config, slots: [{ start: "09:00", end: "11:00" }] },
      "2090-01-01",
      "10:00",
    ),
  );
  assert.throws(() =>
    bookingWindow(
      { ...config, endDate: "2090-01-02", duration: "Weekly" },
      "2090-01-01",
    ),
  );
});
test("both checkout inputs reject client prices, owners, arbitrary statuses and inventory overrides", () => {
  for (const extra of [
    { price: 1 },
    { customerId: id },
    { paymentStatus: "Paid" },
    { total: 1 },
    { stock: 999 },
  ]) {
    assert.equal(
      purchaseInput.safeParse({ addressId: id, idempotencyKey: id, ...extra })
        .success,
      false,
    );
    assert.equal(
      bookingCheckoutInput.safeParse({
        serviceId: id,
        quantity: 1,
        idempotencyKey: id,
        ...extra,
      }).success,
      false,
    );
  }
});
test("payment capture requires the exact provider order, currency, captured status and server amount", () => {
  const p = { GatewayOrderId: "order_1", AmountMinor: 10000, Currency: "INR" },
    payment = {
      order_id: "order_1",
      amount: 10000,
      currency: "INR",
      status: "captured",
    };
  assertCaptured(payment, p);
  for (const patch of [
    { status: "authorized" },
    { amount: 1 },
    { order_id: "order_2" },
    { currency: "USD" },
  ])
    assert.throws(() => assertCaptured({ ...payment, ...patch }, p));
});
test("shopping and booking checkouts authorize before any database query", async (t) => {
  const query = t.mock.method(sequelize, "query", () => {
    throw new Error("unexpected SQL");
  });
  for (const fn of [
    () => cart({}),
    () => purchase({}, {}),
    () => verifyPurchase({}, {}),
    () => bookingCheckout({}, {}),
  ])
    await assert.rejects(fn);
  assert.equal(query.mock.callCount(), 0);
});
test("capacity checks lock the service, count overlapping reservations and fail on overbooking", async (t) => {
  let used = 18;
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.startsWith("SELECT r.Quantity") ? [{ Quantity: used }] : [],
  );
  const config = offerSchema.parse({
    type: "Book",
    book: { ...book, mode: "Quantity" },
  }).book;
  assert.equal((await capacity(id, config, 2, null, null, {})).remaining, 2);
  await assert.rejects(
    () => capacity(id, config, 3, null, null, {}),
    /no longer available/,
  );
  used = 20;
  await assert.rejects(() => capacity(id, config, 1, null, null, {}));
  const calls = query.mock.calls;
  assert(
    calls.some((c) => c.arguments[0].includes("@LockOwner='Transaction'")),
  );
  assert(calls.every((c) => c.arguments[1].transaction));
  assert(calls.some((c) => c.arguments[0].includes("r.StartsAt<CAST(:endsAt")));
});

test("scheduled capacity counts peak concurrent load, with adjacent intervals sharing no capacity", () => {
  const window = {
    startsAt: "2090-01-01T10:00:00",
    endsAt: "2090-01-01T12:00:00",
  };
  const rows = [
    { Quantity: 2, start: "2090-01-01T09:00:00", end: "2090-01-01T11:00:00" },
    { Quantity: 2, start: "2090-01-01T11:00:00", end: "2090-01-01T13:00:00" },
  ];
  assert.equal(reservedQuantity(rows, window), 2);
  assert.equal(
    reservedQuantity(
      [...rows, { Quantity: 1, start: null, end: null }],
      window,
    ),
    3,
  );
  assert.equal(reservedQuantity(rows, { startsAt: null, endsAt: null }), 4);
});
