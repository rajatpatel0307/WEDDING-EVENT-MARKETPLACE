import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { bookingCheckout } from "../src/modules/shopping/booking-checkout.js";
import { offerSchema } from "../src/modules/shopping/commerce.policy.js";

function fixture(t) {
  const serviceId = randomUUID(), packageId = randomUUID(), vendorId = randomUUID();
  const config = offerSchema.parse({ type: "Book", book: {
    price: 1, capacity: 1, maximum: 1, advance: 0,
    cancellation: "Cancel before confirmation", refund: "Refund after review",
  } });
  const service = { ServiceId: serviceId, VendorId: vendorId, CategoryId: 1,
    ServiceName: "Wedding venue", BusinessName: "Wedding vendor",
    DetailsJson: JSON.stringify({ offer: config, pricing: { taxRate: 18 } }) };
  const pack = { PackageId: packageId, PackageName: "Wedding full plan",
    Description: "A complete celebration", FinalPrice: "150000.00" };
  const state = { pack, used: 0, access: "Approved" };
  const ctx = { auth: { user: { id: randomUUID(), active: true, emailVerified: true,
    roles: [{ code: "CUSTOMER", active: true }] } } };
  const body = { serviceId, packageId, quantity: 1, date: "2090-01-01", idempotencyKey: randomUUID() };
  t.mock.method(sequelize, "transaction", async (fn) => fn({}));
  t.mock.method(sequelize, "query", async (sql, { replacements: r }) => {
    if (sql.startsWith("DECLARE")) return [];
    if (sql.includes("CommerceRequestHash")) return [];
    if (sql.startsWith("SELECT s.*")) return [service];
    if (sql.includes("FROM dbo.ServicePackages")) {
      assert.equal(r.serviceId, serviceId);
      assert.equal(r.packageId, packageId);
      assert.match(sql, /IsActive=1/);
      return state.pack ? [state.pack] : [];
    }
    if (sql.includes("AS accessStatus")) return [{ VerificationStatus: "Approved", IsActive: 1,
      userActive: 1, IsBlocked: 0, IsEmailVerified: 1, accessStatus: state.access }];
    if (sql.includes("FROM dbo.Categories")) return [{ AllowBooking: true, AllowBuyOnline: false }];
    if (sql.includes("FROM dbo.PackageItems")) return [{ name: "Venue and decorations", quantity: 1 }];
    if (sql.includes("FROM dbo.VendorAvailability")) return [];
    if (sql.startsWith("SELECT r.Quantity")) return state.used ? [{ Quantity: state.used }] : [];
    if (sql.startsWith("SELECT TOP(1) b.BookingId")) return [];
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  return { body, ctx, state };
}

test("package checkout prices the selected package from the server and preserves its inclusions", async (t) => {
  const { body, ctx } = fixture(t);
  const preview = await bookingCheckout(body, ctx);
  assert.equal(preview.price, 150000);
  assert.equal(preview.subtotal, 150000);
  assert.equal(preview.tax, 27000);
  assert.equal(preview.total, 177000);
  assert.equal(preview.package.id, body.packageId);
  assert.equal(preview.package.name, "Wedding full plan");
  assert.equal(preview.package.inclusions[0].name, "Venue and decorations");
  assert.equal(preview.remaining, 1);
});

test("ordinary service checkout keeps the service offer price", async (t) => {
  const { body, ctx } = fixture(t);
  delete body.packageId;
  const preview = await bookingCheckout(body, ctx);
  assert.equal(preview.price, 1);
  assert.equal(preview.total, 1.18);
  assert.equal(preview.package, undefined);
});

test("missing, inactive or unrelated packages cannot fall back to the cheaper service", async (t) => {
  const { body, ctx, state } = fixture(t);
  state.pack = null;
  await assert.rejects(() => bookingCheckout(body, ctx), /Package unavailable/);
});

test("package checkout still enforces capacity and vendor booking approval", async (t) => {
  const { body, ctx, state } = fixture(t);
  state.used = 1;
  await assert.rejects(() => bookingCheckout(body, ctx), /no longer available/);
  state.used = 0;
  state.access = "Suspended";
  await assert.rejects(() => bookingCheckout(body, ctx), /Booking access is suspended/);
});

test("changing package price or selection invalidates the reviewed total", async (t) => {
  const { body, ctx, state } = fixture(t);
  const preview = await bookingCheckout(body, ctx);
  const submission = { ...body, termsAccepted: true, reviewToken: preview.reviewToken };
  state.pack.FinalPrice = "160000.00";
  await assert.rejects(() => bookingCheckout(submission, ctx, true), /Review the current booking summary/);
  state.pack.FinalPrice = "150000.00";
  delete submission.packageId;
  await assert.rejects(() => bookingCheckout(submission, ctx, true), /Review the current booking summary/);
  await assert.rejects(() => bookingCheckout({ ...body, price: 1 }, ctx), /Unrecognized key/);
});
