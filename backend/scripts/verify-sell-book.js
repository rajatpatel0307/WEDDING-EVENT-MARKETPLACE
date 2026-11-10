// Integration verification with a real MSSQL transaction. All schema and fixture
// changes are rolled back. No provider request is made: fetch is stubbed below.
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/030-sell-book.js";
import * as repo from "../src/modules/admin/admin.repository.js";
import { syncProduct } from "../src/modules/shopping/configuration.js";
import { offerSchema } from "../src/modules/shopping/commerce.policy.js";
import { bookingCheckout } from "../src/modules/shopping/booking-checkout.js";
import { capacity } from "../src/modules/shopping/booking-capacity.js";
import * as shopping from "../src/modules/shopping/shopping.service.js";
import { details as bookingDetails } from "../src/modules/bookings/bookings.service.js";
import {
  createOrder as bookingPaymentOrder,
  verifyPayment as verifyBookingPayment,
} from "../src/modules/customers/workspace.payments.js";
import { completeBooking } from "../src/modules/shopping/booking-management.js";
import {
  list as adminBookings,
  detail as adminBookingDetails,
} from "../src/modules/admin/bookings-management.service.js";
import { records as vendorRecords } from "../src/modules/vendors/workspace.service.js";
import { records as customerRecords } from "../src/modules/customers/workspace.service.js";
import { publicServiceDetails } from "../src/modules/customers/workspace.discovery.js";
import { bookingDecision } from "../src/modules/vendors/workspace.operations.js";

const originalQuery = sequelize.query.bind(sequelize),
  originalTransaction = sequelize.transaction.bind(sequelize),
  originalFetch = globalThis.fetch;
const originalKey = process.env.RAZORPAY_KEY_ID,
  originalSecret = process.env.RAZORPAY_KEY_SECRET;
let tx, lastSql;
try {
  await sequelize.authenticate();
  tx = await originalTransaction();
  // Every application query joins the verification transaction, including reads
  // normally outside a transaction. This also avoids waiting on our schema lock.
  sequelize.query = (sql, options = {}) => {
    lastSql = sql;
    return originalQuery(sql, { ...options, transaction: tx });
  };
  sequelize.transaction = async (fn) => fn(tx);
  await up(sequelize.getQueryInterface(), tx);
  await up(sequelize.getQueryInterface(), tx); // additive migration is repeatable
  const customer = randomUUID(),
    owner = randomUUID(),
    vendor = randomUUID(),
    address = randomUUID();
  for (const [id, first] of [
    [customer, "Commerce Customer"],
    [owner, "Commerce Vendor"],
  ])
    await repo.insert(
      { table: "Users", id: "UserId" },
      {
        UserId: id,
        FirstName: first,
        Email: `${id}@example.invalid`,
        PasswordHash: "integration-fixture-not-a-password",
        IsActive: 1,
        IsEmailVerified: 1,
      },
      tx,
    );
  await repo.insert(
    { table: "Vendors", id: "VendorId" },
    {
      VendorId: vendor,
      UserId: owner,
      BusinessName: "Rollback commerce vendor",
      BusinessSlug: `commerce-${vendor}`,
      VerificationStatus: "Approved",
      IsActive: 1,
      ServiceAccessStatus: "Approved",
      BookingAccessStatus: "Approved",
    },
    tx,
  );
  const [c] = await repo.select(
    "SELECT TOP(1) CategoryId FROM dbo.Categories ORDER BY CategoryId",
    {},
    tx,
  );
  assert(c, "An existing marketplace category is required.");
  await repo.select(
    "UPDATE dbo.Categories SET IsActive=1,AllowBuyOnline=1,AllowBooking=1 WHERE CategoryId=:id",
    { id: c.CategoryId },
    tx,
  );
  await repo.insert(
    { table: "Addresses", id: "AddressId" },
    {
      AddressId: address,
      UserId: customer,
      FullName: "Rollback Customer",
      AddressLine1: "1 Test Street",
      City: "Jaipur",
      State: "Rajasthan",
      PostalCode: "302001",
      Country: "India",
    },
    tx,
  );
  const ctx = {
    auth: {
      user: {
        id: customer,
        active: true,
        emailVerified: true,
        roles: [{ code: "CUSTOMER", active: true }],
      },
    },
    req: { ip: "127.0.0.1" },
  };
  const vendorCtx = {
    auth: {
      user: {
        id: owner,
        active: true,
        emailVerified: true,
        roles: [{ code: "VENDOR", active: true }],
        vendor: { id: vendor, active: true, verificationStatus: "Approved" },
      },
    },
    req: { ip: "127.0.0.1" },
  };
  const ids = {};
  for (const type of ["Sell", "Book", "Both"]) {
    const id = randomUUID();
    ids[type] = id;
    const offer = offerSchema.parse({
      type,
      ...(type !== "Book"
        ? { sell: { price: 150, stock: 10, sku: `test-${id}` } }
        : {}),
      ...(type !== "Sell"
        ? {
            book: {
              price: 20,
              capacity: 4,
              maximum: 4,
              mode: "Quantity",
              cancellation: "Cancellation requires review.",
              refund: "Refund requires review.",
            },
          }
        : {}),
    });
    const body = {
      name: `Rollback ${type}`,
      categoryId: c.CategoryId,
      description: "Rollback verification listing.",
      location: { city: "Jaipur" },
      pricing: { taxRate: 18 },
      offer,
    };
    await repo.insert(
      { table: "Services", id: "ServiceId" },
      {
        ServiceId: id,
        VendorId: vendor,
        CategoryId: c.CategoryId,
        ServiceName: body.name,
        ServiceSlug: `rollback-${id}`,
        DetailsJson: JSON.stringify(body),
        BasePrice: 20,
        ApprovalStatus: "Approved",
        IsActive: 1,
      },
      tx,
    );
    await syncProduct(id, body, vendor, tx);
    if (offer.sell) {
      const [saved] = await repo.select(
        "SELECT p.SKU,JSON_VALUE(s.DetailsJson,'$.offer.sell.sku') AS configuredSku FROM dbo.Products p JOIN dbo.Services s ON s.ServiceId=p.ServiceId WHERE p.ServiceId=:id",
        { id },
        tx,
      );
      assert.match(saved.SKU, /^ROLLBACK-.*-JAIPUR-ROLLBACK-COMMERCE/);
      assert.equal(saved.SKU, saved.configuredSku);
      const retained = saved.SKU;
      await syncProduct(
        id,
        { ...body, name: "Renamed listing", location: { city: "Delhi" } },
        vendor,
        tx,
      );
      const [updated] = await repo.select(
        "SELECT SKU FROM dbo.Products WHERE ServiceId=:id",
        { id },
        tx,
      );
      assert.equal(updated.SKU, retained);
    }
  }
  process.env.RAZORPAY_KEY_ID = "rzp_test_fixture";
  process.env.RAZORPAY_KEY_SECRET = "fixture-secret";
  let providerOrder = 0,
    payment;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/orders")) {
      providerOrder++;
      const b = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          id: `order_test${providerOrder}`,
          amount: b.amount,
          currency: b.currency,
        }),
      };
    }
    if (url.includes("/payments/"))
      return { ok: true, json: async () => payment };
    throw new Error("Unexpected external request in verification.");
  };
  // Sell Only: cart, server pricing, stale review, payment capture and replay.
  await shopping.setCartItem({ serviceId: ids.Sell, quantity: 2 }, ctx);
  const input = { addressId: address, idempotencyKey: randomUUID() },
    preview = await shopping.purchasePreview(input, ctx);
  assert.equal(preview.total, 354);
  await assert.rejects(
    () =>
      shopping.purchase(
        { ...input, reviewToken: "0".repeat(64), termsAccepted: true },
        ctx,
      ),
    /Review/,
  );
  const order = await shopping.purchase(
    { ...input, reviewToken: preview.reviewToken, termsAccepted: true },
    ctx,
  );
  assert.equal(
    (
      await shopping.purchase(
        { ...input, reviewToken: preview.reviewToken, termsAccepted: true },
        ctx,
      )
    ).id.toLowerCase(),
    order.id.toLowerCase(),
  );
  const gateway = await shopping.paymentOrder(order.id, ctx);
  payment = {
    id: "pay_test1",
    order_id: gateway.orderId,
    amount: gateway.amount,
    currency: "INR",
    status: "captured",
  };
  const signature = createHmac("sha256", "fixture-secret")
    .update(`${gateway.orderId}|pay_test1`)
    .digest("hex");
  await shopping.verifyPurchase(
    {
      razorpay_order_id: gateway.orderId,
      razorpay_payment_id: "pay_test1",
      razorpay_signature: signature,
    },
    ctx,
  );
  await shopping.verifyPurchase(
    {
      razorpay_order_id: gateway.orderId,
      razorpay_payment_id: "pay_test1",
      razorpay_signature: signature,
    },
    ctx,
  );
  const [stock] = await repo.select(
    "SELECT Stock FROM dbo.Products WHERE ServiceId=:id",
    { id: ids.Sell },
    tx,
  );
  assert.equal(stock.Stock, 8);
  assert.equal(
    (await shopping.orderDetails(order.id, ctx)).paymentStatus,
    "Paid",
  );
  await assert.rejects(
    () => shopping.setCartItem({ serviceId: ids.Book, quantity: 1 }, ctx),
    /no longer available/,
  );
  // Book Only: quantity checkout has no event, own ledger, vendor acceptance.
  const bookingInput = {
    serviceId: ids.Book,
    quantity: 3,
    idempotencyKey: randomUUID(),
  };
  const bp = await bookingCheckout(bookingInput, ctx);
  assert.equal(bp.total, 70.8);
  const booking = await bookingCheckout(
    { ...bookingInput, reviewToken: bp.reviewToken, termsAccepted: true },
    ctx,
    true,
  );
  assert.equal(
    (
      await bookingCheckout(
        { ...bookingInput, reviewToken: bp.reviewToken, termsAccepted: true },
        ctx,
        true,
      )
    ).id.toLowerCase(),
    booking.id.toLowerCase(),
  );
  const details = await bookingDetails(booking.id, ctx, "Customer");
  assert.equal(details.booking.EventId, null);
  assert.equal(details.items[0].quantity, 3);
  await bookingDecision(
    booking.id,
    {
      action: "Accept",
      expectedUpdatedAt: new Date(details.booking.UpdatedAt).toISOString(),
    },
    vendorCtx,
  );
  await assert.rejects(
    () =>
      bookingCheckout(
        { serviceId: ids.Book, quantity: 2, idempotencyKey: randomUUID() },
        ctx,
      ),
    /no longer available/,
  );
  assert.equal(
    (await shopping.orders(ctx)).length,
    1,
    "Booking must not create a purchase order.",
  );
  const adminCtx = {
    ...ctx,
    auth: {
      user: { ...ctx.auth.user, roles: [{ code: "ADMIN", active: true }] },
    },
  };
  assert(
    (await vendorRecords("bookings", {}, vendorCtx)).rows.some(
      (r) => r.id.toLowerCase() === booking.id.toLowerCase(),
    ),
  );
  assert(
    (await customerRecords("bookings", {}, ctx)).rows.some(
      (r) => r.id.toLowerCase() === booking.id.toLowerCase(),
    ),
  );
  assert(
    (await adminBookings({}, adminCtx)).rows.some(
      (r) => r.id.toLowerCase() === booking.id.toLowerCase(),
    ),
  );
  assert.equal(
    (await adminBookingDetails(booking.id, adminCtx)).booking.EventId,
    null,
  );
  assert.equal(
    (await publicServiceDetails(ids.Both, false)).service.offer.type,
    "Both",
  );
  const bookingGateway = await bookingPaymentOrder(booking.id, ctx, {
    idempotencyKey: randomUUID(),
    termsAccepted: true,
    mode: "balance",
  });
  payment = {
    id: "pay_booking1",
    order_id: bookingGateway.orderId,
    amount: bookingGateway.amount,
    currency: "INR",
    status: "captured",
    created_at: Math.floor(Date.now() / 1000),
  };
  const bookingSignature = createHmac("sha256", "fixture-secret")
    .update(`${bookingGateway.orderId}|pay_booking1`)
    .digest("hex");
  await verifyBookingPayment(
    {
      razorpay_order_id: bookingGateway.orderId,
      razorpay_payment_id: "pay_booking1",
      razorpay_signature: bookingSignature,
    },
    ctx,
  );
  const paidBooking = await bookingDetails(booking.id, ctx, "Customer");
  assert.equal(paidBooking.booking.PaymentStatus, "Paid");
  await completeBooking(
    booking.id,
    {
      expectedUpdatedAt: new Date(paidBooking.booking.UpdatedAt).toISOString(),
      reason: "Quantity reservation fulfilled.",
    },
    vendorCtx,
  );
  assert.equal(
    (
      await bookingCheckout(
        { serviceId: ids.Book, quantity: 4, idempotencyKey: randomUUID() },
        ctx,
      )
    ).remaining,
    4,
  );
  // A scheduled hourly reservation blocks only overlapping quantities.
  const scheduled = randomUUID();
  const scheduledOffer = offerSchema.parse({
    type: "Book",
    book: {
      price: 100,
      capacity: 2,
      maximum: 2,
      mode: "Scheduled",
      duration: "Hourly",
      slots: [
        { start: "09:00", end: "10:00" },
        { start: "10:00", end: "11:00" },
      ],
      cancellation: "Reviewed cancellation.",
      refund: "Reviewed refund.",
    },
  });
  await repo.insert(
    { table: "Services", id: "ServiceId" },
    {
      ServiceId: scheduled,
      VendorId: vendor,
      CategoryId: c.CategoryId,
      ServiceName: "Scheduled rollback listing",
      ServiceSlug: `rollback-${scheduled}`,
      DetailsJson: JSON.stringify({
        offer: scheduledOffer,
        pricing: { taxRate: 0 },
      }),
      BasePrice: 100,
      ApprovalStatus: "Approved",
      IsActive: 1,
    },
    tx,
  );
  const scheduledBody = {
      serviceId: scheduled,
      quantity: 2,
      date: "2090-01-01",
      start: "09:00",
      idempotencyKey: randomUUID(),
    },
    scheduledPreview = await bookingCheckout(scheduledBody, ctx);
  await bookingCheckout(
    {
      ...scheduledBody,
      reviewToken: scheduledPreview.reviewToken,
      termsAccepted: true,
    },
    ctx,
    true,
  );
  await assert.rejects(
    () =>
      bookingCheckout(
        { ...scheduledBody, quantity: 1, idempotencyKey: randomUUID() },
        ctx,
      ),
    /no longer available/,
  );
  assert.equal(
    (
      await bookingCheckout(
        { ...scheduledBody, start: "10:00", idempotencyKey: randomUUID() },
        ctx,
      )
    ).remaining,
    2,
  );
  // Both: purchase stock reservations never reduce booking capacity, and vice versa.
  await shopping.setCartItem({ serviceId: ids.Both, quantity: 2 }, ctx);
  const bothInput = { addressId: address, idempotencyKey: randomUUID() },
    bothPreview = await shopping.purchasePreview(bothInput, ctx);
  await shopping.purchase(
    { ...bothInput, reviewToken: bothPreview.reviewToken, termsAccepted: true },
    ctx,
  );
  const bothBooking = {
      serviceId: ids.Both,
      quantity: 4,
      idempotencyKey: randomUUID(),
    },
    bothBP = await bookingCheckout(bothBooking, ctx);
  await bookingCheckout(
    { ...bothBooking, reviewToken: bothBP.reviewToken, termsAccepted: true },
    ctx,
    true,
  );
  const [bothStock] = await repo.select(
    "SELECT Stock FROM dbo.Products WHERE ServiceId=:id",
    { id: ids.Both },
    tx,
  );
  assert.equal(bothStock.Stock, 10);
  assert.equal((await shopping.cart(ctx)).lines.length, 0);
  await shopping.setCartItem({ serviceId: ids.Both, quantity: 8 }, ctx);
  await assert.rejects(
    () => shopping.setCartItem({ serviceId: ids.Both, quantity: 9 }, ctx),
    /no longer available/,
  );
  console.log(
    "PASS: repeatable migration, Sell/Book/Both, separate checkouts, server prices, stale reviews, stock holds, capture replay, quantity reservations, vendor acceptance, overbooking and independent inventories. All changes will roll back.",
  );
} catch (error) {
  console.error(
    "Sell/Book verification failed:",
    error.message,
    error.original?.errors?.map((e) => e.message) ||
      error.original?.message ||
      error.errors?.map((e) => e.message) ||
      "",
  );
  console.error("Last statement:", lastSql);
  process.exitCode = 1;
} finally {
  sequelize.query = originalQuery;
  sequelize.transaction = originalTransaction;
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.RAZORPAY_KEY_ID;
  else process.env.RAZORPAY_KEY_ID = originalKey;
  if (originalSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
  else process.env.RAZORPAY_KEY_SECRET = originalSecret;
  if (tx && !tx.finished) await tx.rollback();
  await sequelize.close();
}
