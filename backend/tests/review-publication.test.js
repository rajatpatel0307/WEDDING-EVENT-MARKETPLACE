import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { create, edit } from "../src/modules/reviews/reviews.service.js";

const customerId = randomUUID(), vendorId = randomUUID(), bookingId = randomUUID(), reviewId = randomUUID();
const ctx = {
  auth: { user: { id: customerId, active: true, emailVerified: true, roles: [{ code: "CUSTOMER", active: true }] } },
  req: { ip: "127.0.0.1", get: () => "review-publication-test" },
};
const booking = { BookingId: bookingId, CustomerId: customerId, VendorId: vendorId, BookingStatus: "Completed" };
const review = { ReviewId: reviewId, ...booking, CreatedAt: new Date(), ModerationStatus: "Approved", IsPublished: 1 };

function fixture(t, row = review) {
  const tx = { id: randomUUID(), afterCommit() {} };
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql, opts = {}) => {
    assert.equal(opts.transaction, tx, "all writes and rating reconciliation share the transaction");
    if (sql.startsWith("SELECT * FROM dbo.Booking ")) return [booking];
    if (sql.startsWith("SELECT * FROM dbo.Reviews ")) return [row];
    if (sql.startsWith("SELECT VendorId FROM dbo.Reviews")) return [{ VendorId: vendorId }];
    if (sql.startsWith("SELECT UserId FROM dbo.Vendors")) return [{ UserId: randomUUID() }];
    if (sql.startsWith("INSERT INTO dbo.[Reviews]")) return [{ id: reviewId }];
    return [];
  });
  return query;
}
function savedValues(call) {
  const [sql, { replacements }] = call.arguments;
  const columns = sql.startsWith("INSERT")
    ? sql.match(/\((.*?)\) OUTPUT/)[1].match(/\[([^\]]+)\]/g).map((value) => value.slice(1, -1))
    : [...sql.matchAll(/\[([^\]]+)\]=:v\d+/g)].map((match) => match[1]);
  return Object.fromEntries(columns.map((name, index) => [name, replacements[`v${index}`]]));
}

test("new reviews publish and update vendor ratings before the transaction completes", async (t) => {
  const query = fixture(t);
  const result = await create({ bookingId, rating: 5, text: "A wonderful celebration" }, ctx);
  const inserted = savedValues(query.mock.calls.find((call) => call.arguments[0].startsWith("INSERT INTO dbo.[Reviews]")));
  assert.equal(inserted.ModerationStatus, "Approved");
  assert.equal(inserted.IsPublished, 1);
  assert.equal(inserted.IsVerified, 1);
  assert.ok(query.mock.calls.some((call) => call.arguments[0].startsWith("UPDATE dbo.Vendors SET AverageRating=")));
  assert.match(result.message, /now published/);
  assert.ok(query.mock.calls.some((call) => call.arguments[1]?.replacements?.title === "Your review is now published"));
});

test("customer edits stay published and recalculate ratings without approval", async (t) => {
  const query = fixture(t);
  const result = await edit(reviewId, { rating: 3, text: "Updated after the celebration" }, ctx);
  const updated = savedValues(query.mock.calls.find((call) => call.arguments[0].startsWith("UPDATE dbo.[Reviews]")));
  assert.equal(updated.Rating, 3);
  assert.equal(updated.ModerationStatus, "Approved");
  assert.equal(updated.IsPublished, 1);
  assert.ok(query.mock.calls.some((call) => call.arguments[0].startsWith("UPDATE dbo.Vendors SET AverageRating=")));
  assert.equal(result.message, "Review updated and published.");
});

test("automatic publication does not let customers republish hidden, rejected or flagged reviews", async (t) => {
  for (const ModerationStatus of ["Hidden", "Rejected", "Flagged"]) {
    await t.test(ModerationStatus, async (t) => {
      const query = fixture(t, { ...review, ModerationStatus, IsPublished: 0 });
      await assert.rejects(() => edit(reviewId, { rating: 5, text: "Trying to restore this review" }, ctx), (error) => error.status === 409);
      assert.ok(!query.mock.calls.some((call) => call.arguments[0].startsWith("UPDATE dbo.[Reviews]")));
    });
  }
});

test("customers can still withdraw their published reviews and remove their rating contribution", async (t) => {
  const query = fixture(t);
  await edit(reviewId, null, ctx, true);
  const updated = savedValues(query.mock.calls.find((call) => call.arguments[0].startsWith("UPDATE dbo.[Reviews]")));
  assert.equal(updated.IsPublished, 0);
  assert.ok(updated.DeletedAt);
  assert.ok(query.mock.calls.some((call) => call.arguments[0].startsWith("UPDATE dbo.Vendors SET AverageRating=")));
});
