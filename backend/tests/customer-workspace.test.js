import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { createCustomerRouter } from "../src/modules/customers/workspace.routes.js";
import { owned } from "../src/modules/customers/workspace.common.js";
import * as w from "../src/modules/customers/workspace.service.js";
import * as d from "../src/modules/customers/workspace.discovery.js";
import * as o from "../src/modules/customers/workspace.operations.js";
import * as m from "../src/modules/customers/workspace.messaging.js";
import {
  validSignature,
  paymentEligible,
} from "../src/modules/customers/workspace.payments.js";
const id = "1D375B0C-89D2-F111-8F30-14133304FA5C";
const customer = {
  id,
  active: true,
  emailVerified: true,
  roles: [{ code: "CUSTOMER", active: true }],
};
test("customer REST denies anonymous, vendor and disabled identities before processing input", async () => {
  const app = express();
  app.use(
    "/api/customer",
    createCustomerRouter({
      authenticateRequest: async (req) => ({
        user:
          req.get("x-role") === "customer"
            ? customer
            : req.get("x-role") === "vendor"
              ? { ...customer, roles: [{ code: "VENDOR", active: true }] }
              : req.get("x-role") === "disabled"
                ? { ...customer, active: false }
                : null,
      }),
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api/customer`;
  try {
    for (const [role, status] of [
      ["none", 401],
      ["vendor", 403],
      ["disabled", 401],
    ]) {
      const response = await fetch(`${base}/dashboard`, {
        headers: { "x-role": role },
      });
      assert.equal(response.status, status);
    }
    const forged = await fetch(`${base}/events`, {
      method: "POST",
      headers: {
        "x-role": "customer",
        Origin: "https://forged.invalid",
        "Content-Type": "application/json",
        "X-Customer-Request": "1",
      },
      body: "{}",
    });
    assert.equal(forged.status, 403);
    const unknown = await fetch(`${base}/records/audit`, {
      headers: { "x-role": "customer" },
    });
    assert.equal(unknown.status, 404);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
test("customer services all require the customer role before database access", async () => {
  const ctx = {
    auth: { user: { ...customer, roles: [{ code: "VENDOR", active: true }] } },
  };
  for (const fn of [
    () => w.dashboard(ctx),
    () => w.profile(ctx),
    () => w.records("events", {}, ctx),
    () => w.eventDetails(id, ctx),
    () => w.saveEvent(null, {}, ctx),
    () => w.guest(id, null, {}, ctx),
    () => w.saveProfile({}, ctx),
    () => w.saveAddress(null, {}, ctx),
    () => w.readNotification(id, ctx),
    () => d.discover({}, ctx),
    () => d.serviceDetails(id, ctx),
    () => d.vendorDetails(id, ctx),
    () => d.wishlist(ctx),
    () => d.saveWishlist({}, ctx),
    () => o.book({}, ctx),
    () => o.requestQuote({}, ctx),
    () => o.quoteDetails(id, ctx),
    () => o.decideQuote(id, {}, ctx),
    () => o.bookingDetails(id, ctx),
    () => o.review({}, ctx),
    () => m.conversations(ctx),
    () => m.startConversation({}, ctx),
    () => m.chat(id, {}, ctx),
    () => m.sendMessage(id, {}, ctx),
    () => m.attachmentUpload(id, {}, ctx),
    () => m.attachmentFile(id, id, ctx),
  ])
    await assert.rejects(fn, (e) => e.extensions?.code === "FORBIDDEN");
});
test("owned customer resources accept sequential MSSQL GUIDs and bind the current customer", async () => {
  const original = sequelize.query;
  const seen = [];
  sequelize.query = async (sql, options) => {
    seen.push({ sql, options });
    return [];
  };
  try {
    for (const kind of [
      "events",
      "bookings",
      "quotations",
      "conversations",
      "addresses",
      "notifications",
    ])
      await assert.rejects(
        () => owned(kind, id, id, undefined, false),
        (e) => e.status === 404,
      );
    assert.equal(seen.length, 6);
    for (const r of seen) {
      assert.match(r.sql, /AND \[(CustomerId|UserId)\]=:id/);
      assert.equal(r.options.replacements.id, id);
      assert.equal(r.options.replacements.recordId, id);
    }
  } finally {
    sequelize.query = original;
  }
});
test("pagination, filters and event inputs are bounded and reject identity injection", () => {
  assert.throws(() => d.discoveryInput.parse({ max: 5, min: 10 }));
  assert.throws(() => d.discoveryInput.parse({ pageSize: 1000 }));
  assert.throws(() => d.discoveryInput.parse({ rating: 6 }));
  assert.throws(() =>
    w.eventInput.parse({
      name: "Wedding",
      type: "Wedding",
      eventDate: "2027-01-01",
      city: "Delhi",
      guests: 100,
      budget: 50000,
      customerId: id,
    }),
  );
  assert.throws(() =>
    w.addressInput.parse({
      type: "Home",
      line1: "An address",
      city: "Delhi",
      state: "Delhi",
      postalCode: "100001",
      userId: id,
    }),
  );
});
test("Razorpay signatures require the exact body and secret, including raw webhook bytes", () => {
  const payload = Buffer.from('{"event":"payment.captured"}'),
    secret = "fixture-secret",
    signature = createHmac("sha256", secret).update(payload).digest("hex");
  assert(validSignature(payload, signature, secret));
  assert(!validSignature(Buffer.from("tampered"), signature, secret));
  assert(!validSignature(payload, signature, "wrong-secret"));
  assert(!validSignature(payload, "x", secret));
  assert(!validSignature(payload, signature, undefined));
});
test("only accepted and active bookings with an outstanding balance can start checkout", () => {
  for (const status of [
    "Pending",
    "Rejected",
    "Cancelled",
    "Completed",
    "Refunded",
    "Disputed",
  ])
    assert.throws(
      () => paymentEligible({ BookingStatus: status, RemainingAmount: 100 }),
      (e) => e.status === 409,
    );
  for (const status of [
    "Accepted",
    "PaymentPending",
    "Confirmed",
    "InProgress",
  ])
    assert.doesNotThrow(() =>
      paymentEligible({ BookingStatus: status, RemainingAmount: 100 }),
    );
  assert.throws(
    () => paymentEligible({ BookingStatus: "Confirmed", RemainingAmount: 0 }),
    (e) => e.status === 409,
  );
});
