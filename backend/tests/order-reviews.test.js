import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { createInput } from "../src/modules/reviews/reviews.validation.js";
import { assertOrderEligibility, publicPredicate } from "../src/modules/reviews/reviews.policy.js";
import { create, eligibleOrders, moderate } from "../src/modules/reviews/reviews.service.js";
import { orderDetails } from "../src/modules/shopping/shopping.service.js";

const customerId = randomUUID(), orderId = randomUUID(), itemId = randomUUID(), vendorId = randomUUID(), serviceId = randomUUID(), reviewId = randomUUID();
const user = { id: customerId, active: true, emailVerified: true, roles: [{ code: "CUSTOMER", active: true }] };
const ctx = { auth: { user }, req: { ip: "127.0.0.1", get: () => "order-review-test" } };
const order = { OrderId: orderId, CustomerId: customerId, OrderStatus: "Delivered", PaymentStatus: "Paid", OrderNumber: "MNOR2600001", AddressSnapshot: "{}" };
const item = { ItemId: itemId, OrderId: orderId, VendorId: vendorId, ServiceId: serviceId, FulfillmentStatus: "Delivered" };
const input = { orderId, orderItemId: itemId, rating: 4, text: "Delivered on time and as described" };

function fixture(t, overrides = {}) {
  const tx = { afterCommit() {} };
  t.mock.method(sequelize, "transaction", async fn => fn(tx));
  return t.mock.method(sequelize, "query", async (sql, options = {}) => {
    if (sql.startsWith("SELECT * FROM dbo.Orders ")) return [overrides.order || order];
    if (sql.startsWith("SELECT i.*,p.ServiceId")) return overrides.missingItem ? [] : [overrides.item || item];
    if (sql.startsWith("SELECT ReviewId FROM dbo.Reviews WHERE OrderId")) return overrides.duplicate ? [{ ReviewId: reviewId }] : [];
    if (sql.startsWith("INSERT INTO dbo.[Reviews]")) return [{ id: reviewId }];
    if (sql.startsWith("SELECT VendorId FROM dbo.Reviews")) return [{ VendorId: vendorId }];
    if (sql.startsWith("SELECT * FROM dbo.Reviews ")) return [{ ReviewId: reviewId, VendorId: vendorId, CustomerId: customerId, OrderId: orderId, OrderItemId: itemId, ModerationStatus: "Hidden" }];
    if (sql.startsWith("SELECT UserId FROM dbo.Vendors")) return [{ UserId: randomUUID() }];
    if (/^(INSERT|UPDATE)/.test(sql)) assert.equal(options.transaction, tx);
    return [];
  });
}
const inserts = query => query.mock.calls.filter(({ arguments: [sql] }) => sql.startsWith("INSERT INTO dbo.[Reviews]"));

test("review targets require one booking or one delivered order item and reject forged owners", () => {
  assert.equal(createInput.parse(input).orderId, orderId);
  assert.equal(createInput.parse({ bookingId: randomUUID(), rating: 5, text: "Great booking" }).rating, 5);
  for (const invalid of [
    { ...input, bookingId: randomUUID() }, { ...input, orderItemId: undefined },
    { ...input, bookingItemId: 1 }, { ...input, customerId: randomUUID() },
    { ...input, vendorId: randomUUID() }, { ...input, rating: 0 }, { ...input, rating: 6 },
    { rating: 4, text: "No purchase target" },
  ]) assert.equal(createInput.safeParse(invalid).success, false);
});

test("delivered order eligibility rejects foreign, unpaid, undelivered and mismatched items", () => {
  assert.doesNotThrow(() => assertOrderEligibility(order, customerId.toUpperCase(), item));
  assert.throws(() => assertOrderEligibility(order, randomUUID(), item), /not found/);
  assert.throws(() => assertOrderEligibility({ ...order, PaymentStatus: "Pending" }, customerId, item), /paid, delivered/);
  for (const status of ["Pending", "Processing", "Shipped", "OutForDelivery", "Cancelled"])
    assert.throws(() => assertOrderEligibility({ ...order, OrderStatus: status }, customerId, item), /paid, delivered/);
  for (const invalid of [null, { ...item, OrderId: randomUUID() }, { ...item, FulfillmentStatus: "Shipped" }, { ...item, FulfillmentStatus: "Cancelled" }])
    assert.throws(() => assertOrderEligibility(order, customerId, invalid), /delivered item/);
});

test("eligible order targets are owner-scoped, paid, delivered and not previously reviewed", async t => {
  const query = t.mock.method(sequelize, "query", async () => []);
  assert.deepEqual(await eligibleOrders(ctx), []);
  const [sql, options] = query.mock.calls[0].arguments;
  for (const predicate of ["o.CustomerId=:user", "o.OrderStatus='Delivered'", "o.PaymentStatus='Paid'", "i.FulfillmentStatus='Delivered'", "NOT EXISTS"])
    assert.ok(sql.includes(predicate));
  assert.equal(options.replacements.user, customerId);
});

test("a delivered-item review stores the server's vendor and service and publishes once", async t => {
  const query = fixture(t);
  const result = await create(input, ctx);
  assert.equal(result.id, reviewId);
  const [sql, { replacements }] = inserts(query)[0].arguments;
  const columns = sql.match(/\((.*?)\) OUTPUT/)[1].match(/\[([^\]]+)\]/g).map(value => value.slice(1, -1));
  const saved = Object.fromEntries(columns.map((name, i) => [name, replacements[`v${i}`]]));
  assert.equal(saved.BookingId, null);
  assert.equal(saved.OrderId, orderId);
  assert.equal(saved.OrderItemId, itemId);
  assert.equal(saved.CustomerId, customerId);
  assert.equal(saved.VendorId, vendorId);
  assert.equal(saved.ServiceId, serviceId);
  assert.equal(saved.Rating, 4);
  assert.equal(saved.IsPublished, 1);
  assert.equal(saved.IsVerified, 1);
});

test("duplicate, foreign and undelivered order reviews perform no review inserts", async t => {
  for (const overrides of [
    { duplicate: true }, { missingItem: true }, { order: { ...order, CustomerId: randomUUID() } },
    { order: { ...order, OrderStatus: "Shipped" } }, { item: { ...item, FulfillmentStatus: "Cancelled" } },
  ]) await t.test(JSON.stringify(overrides), async t => {
    const query = fixture(t, overrides);
    await assert.rejects(() => create(input, ctx));
    assert.equal(inserts(query).length, 0);
  });
});

test("restoring order feedback rechecks delivery and public reviews require a matching delivered item", async t => {
  const query = fixture(t, { order: { ...order, OrderStatus: "Processing" } });
  const admin = { ...ctx, auth: { user: { ...user, roles: [{ code: "ADMIN", active: true }] } } };
  await assert.rejects(() => moderate(reviewId, "restore", {}, admin), /paid, delivered/);
  assert.ok(!query.mock.calls.some(({ arguments: [sql] }) => sql.startsWith("UPDATE dbo.[Reviews]")));
  for (const predicate of ["ro.OrderStatus='Delivered'", "ro.PaymentStatus='Paid'", "ro.CustomerId=r.CustomerId", "ri.ItemId=r.OrderItemId", "ri.VendorId=r.VendorId"])
    assert.ok(publicPredicate().includes(predicate));
});

test("customer order details return submitted feedback and prevent repeat ratings", async t => {
  t.mock.method(sequelize, "query", async (sql, options) => {
    if (sql.startsWith("SELECT o.*")) return [order];
    if (sql.startsWith("SELECT i.ItemId")) return [{ id: itemId, name: "Wedding decor", vendorId, vendor: "Vendor", status: "Delivered", quantity: 1, price: 100, total: 100 }];
    if (sql.includes("FROM dbo.Reviews WHERE OrderId")) {
      assert.deepEqual(options.replacements, { id: orderId, customerId });
      return [{ id: reviewId, orderItemId: itemId, rating: 4, text: input.text, deletedAt: null }];
    }
    return [];
  });
  const data = await orderDetails(orderId, ctx);
  assert.equal(data.lines[0].review.rating, 4);
  assert.equal(data.lines[0].review.text, input.text);
  assert.equal(data.lines[0].canReview, false);
});
