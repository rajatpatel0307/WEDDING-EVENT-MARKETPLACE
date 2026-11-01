import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import {
  assertEligibility,
  editAllowed,
  publicPredicate,
} from "../src/modules/reviews/reviews.policy.js";
import {
  createInput,
  contentInput,
  listInput,
} from "../src/modules/reviews/reviews.validation.js";
import { validateImages } from "../src/modules/reviews/reviews.service.js";
import { createReviewRouter } from "../src/modules/reviews/reviews.routes.js";
const customer = randomUUID(),
  vendor = randomUUID(),
  booking = randomUUID();
const valid = {
  BookingId: booking,
  CustomerId: customer,
  VendorId: vendor,
  BookingStatus: "Completed",
};
test("review eligibility rejects foreign, missing, incomplete and mismatched item targets", () => {
  assert.doesNotThrow(() =>
    assertEligibility(valid, customer.toUpperCase(), {
      BookingId: booking,
      VendorId: vendor,
    }),
  );
  assert.throws(() => assertEligibility(null, customer));
  assert.throws(() => assertEligibility(valid, randomUUID()));
  for (const status of [
    "Cancelled",
    "Rejected",
    "Pending",
    "Confirmed",
    "InProgress",
    "Refunded",
  ])
    assert.throws(() =>
      assertEligibility({ ...valid, BookingStatus: status }, customer),
    );
  assert.throws(() =>
    assertEligibility(valid, customer, {
      BookingId: randomUUID(),
      VendorId: vendor,
    }),
  );
  assert.throws(() =>
    assertEligibility(valid, customer, {
      BookingId: booking,
      VendorId: randomUUID(),
    }),
  );
});
test("editing policy enforces date, deletion and moderation restrictions", () => {
  const now = Date.now(),
    r = { CreatedAt: new Date(now), ModerationStatus: "Approved" };
  assert.equal(editAllowed(r, now), true);
  assert.equal(
    editAllowed({ ...r, CreatedAt: new Date(now - 366 * 86400000) }, now),
    false,
  );
  for (const status of ["Rejected", "Hidden", "Flagged"])
    assert.equal(editAllowed({ ...r, ModerationStatus: status }, now), false);
  assert.equal(editAllowed({ ...r, DeletedAt: new Date() }, now), false);
});
test("input validation rejects forged owners, invalid stars, HTML and excessive images", () => {
  const input = { bookingId: booking, rating: 5, text: "Excellent service" };
  assert.equal(createInput.parse(input).rating, 5);
  for (const rating of [0, 6, 2.5])
    assert.equal(createInput.safeParse({ ...input, rating }).success, false);
  assert.equal(
    createInput.safeParse({ ...input, customerId: customer }).success,
    false,
  );
  assert.equal(
    createInput.safeParse({ ...input, vendorId: vendor }).success,
    false,
  );
  assert.equal(
    createInput.safeParse({ ...input, text: "<script>alert(1)</script>" })
      .success,
    false,
  );
  assert.equal(
    contentInput.safeParse({ ...input, bookingId: undefined }).success,
    false,
  );
  assert.equal(listInput.safeParse({ pageSize: 1000 }).success, false);
});
test("review images must match decoded bytes, MIME, extension and limits", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const img = {
    name: "image.png",
    mimeType: "image/png",
    base64: png.toString("base64"),
  };
  assert.doesNotThrow(() => validateImages([img]));
  assert.throws(() => validateImages([{ ...img, mimeType: "image/jpeg" }]));
  assert.throws(() => validateImages([{ ...img, name: "image.jpg" }]));
  assert.throws(() =>
    validateImages([
      { ...img, base64: Buffer.from("<svg/>").toString("base64") },
    ]),
  );
  assert.throws(() =>
    validateImages([
      {
        ...img,
        base64: Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)]).toString(
          "base64",
        ),
      },
    ]),
  );
});
test("central public policy requires approved verified eligible undeleted reviews", () => {
  for (const term of [
    "ModerationStatus='Approved'",
    "IsPublished=1",
    "DeletedAt IS NULL",
    "IsVerified=1",
    "BookingStatus='Completed'",
    "CustomerId=r.CustomerId",
    "VendorId=r.VendorId",
  ])
    assert.ok(publicPredicate().includes(term));
});
test("review HTTP rejects anonymous identities, role forgery and cross-origin writes", async () => {
  const user = {
    id: customer,
    active: true,
    emailVerified: true,
    roles: [{ code: "CUSTOMER", active: true }],
  };
  const app = express();
  app.use(
    "/api",
    createReviewRouter({
      authenticateRequest: async (req) =>
        req.get("x-test-user") ? { user } : null,
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    for (const path of [
      "/reviews/my-reviews",
      "/vendor/reviews",
      "/admin/reviews",
      "/admin/review-reports",
      "/admin/review-analytics",
    ])
      assert.equal((await fetch(base + path)).status, 401);
    assert.equal(
      (
        await fetch(base + "/admin/reviews", {
          headers: { "x-test-user": "1" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/vendor/reviews", {
          headers: { "x-test-user": "1" },
        })
      ).status,
      403,
    );
    const result = await fetch(base + "/reviews", {
      method: "POST",
      headers: {
        "x-test-user": "1",
        "content-type": "application/json",
        origin: "https://forged.invalid",
        "x-review-request": "1",
      },
      body: "{}",
    });
    assert.equal(result.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
