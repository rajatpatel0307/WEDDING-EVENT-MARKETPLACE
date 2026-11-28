import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { bookingDetails } from "../src/modules/customers/workspace.operations.js";

const customerId = randomUUID(), bookingId = randomUUID(), vendorId = randomUUID();
const ctx = { auth: { user: { id: customerId, active: true, emailVerified: true, roles: [{ code: "CUSTOMER", active: true }] } } };
const booking = {
  BookingId: bookingId, CustomerId: customerId, VendorId: vendorId,
  BookingStatus: "Completed", PaymentStatus: "Paid", BookingDate: "2026-11-27",
  TotalAmount: 100, PaidAmount: 100, PolicySnapshotJson: "{}",
};

test("customer booking details return separate submitted vendor and service ratings", async (t) => {
  const reviews = [
    { id: randomUUID(), bookingItemId: null, rating: 5, text: "Excellent vendor", status: "Approved" },
    { id: randomUUID(), bookingItemId: 42, service: "Wedding venue", rating: 3, text: "The venue was fine", status: "Hidden" },
  ];
  const query = t.mock.method(sequelize, "query", async (sql, options) => {
    if (sql.startsWith("SELECT * FROM dbo.Booking ")) {
      assert.match(sql, /CustomerId=:owner/);
      assert.equal(options.replacements.owner, customerId);
      return [booking];
    }
    if (sql.includes("FROM dbo.Reviews r LEFT JOIN dbo.BookingItems")) {
      assert.match(sql, /r.BookingId=:recordId AND r.CustomerId=:customerId AND r.DeletedAt IS NULL/);
      assert.deepEqual(options.replacements, { recordId: bookingId, customerId });
      assert.doesNotMatch(sql, /AdminNotes|ModerationReason|IsPublished=1/);
      return reviews;
    }
    return [];
  });
  const result = await bookingDetails(bookingId, ctx);
  assert.deepEqual(result.reviews, reviews);
  assert.equal(result.booking.BookingId, bookingId);
  assert.equal(query.mock.calls.filter(({ arguments: [sql] }) => sql.includes("FROM dbo.Reviews r")).length, 1);
});

test("foreign bookings are rejected before querying their ratings", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(() => bookingDetails(bookingId, ctx), (error) => error.status === 404);
  assert.equal(query.mock.calls.length, 1);
  assert.match(query.mock.calls[0].arguments[0], /CustomerId=:owner/);
});

test("bookings without submitted reviews return an empty rating list", async (t) => {
  t.mock.method(sequelize, "query", async (sql) => sql.startsWith("SELECT * FROM dbo.Booking ") ? [booking] : []);
  const result = await bookingDetails(bookingId, ctx);
  assert.deepEqual(result.reviews, []);
});
