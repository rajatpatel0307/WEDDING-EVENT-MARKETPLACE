import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import {
  serviceSchema,
  pricingSchema,
  calculatePrice,
  listSchema,
  actionsFor,
  validateServiceSubmission,
} from "../src/modules/vendors/service-management.validation.js";
import * as services from "../src/modules/vendors/service-management.service.js";
import {
  itemMutation,
  packageMutation,
} from "../src/modules/vendors/service-management.children.js";
import { assertServiceSchedule } from "../src/modules/vendors/service-schedule.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
const vendorId = "734b9588-c47c-40eb-8c17-1797d65a2800",
  userId = "734b9588-c47c-40eb-8c17-1797d65a2801",
  serviceId = "1D375B0C-89D2-F111-8F30-14133304FA5C";
const updatedAt = "2026-10-28T10:00:00.000Z";
const ctx = {
  req: { ip: "127.0.0.1" },
  auth: {
    user: {
      id: userId,
      active: true,
      emailVerified: true,
      roles: [{ code: "VENDOR", active: true }],
      vendor: { id: vendorId, active: true, verificationStatus: "Approved" },
    },
  },
};
const pending = {
  ...ctx,
  auth: {
    user: {
      ...ctx.auth.user,
      vendor: {
        ...ctx.auth.user.vendor,
        verificationStatus: "Pending",
        active: false,
      },
    },
  },
};
const document = () =>
  serviceSchema.parse({
    name: "Royal Wedding Garden",
    categoryId: 1,
    description: "A beautiful wedding garden for your celebration.",
    shortDescription: "Celebrate beautifully.",
    pricing: { basePrice: 100000, discount: 10 },
    location: { city: "Jaipur" },
    availability: {},
    policies: { cancellation: "Cancel at least 30 days before the event." },
    seo: { slug: "royal-wedding-garden" },
  });
const record = (status = "Draft") => ({
  ServiceId: serviceId,
  VendorId: vendorId,
  CategoryId: 1,
  ServiceSlug: "royal-wedding-garden",
  ServiceName: "Royal Wedding Garden",
  Description: document().description,
  DetailsJson: JSON.stringify(document()),
  AttributesJson: "{}",
  ApprovalStatus: status,
  IsActive: status === "Approved" ? 1 : 0,
  ApprovalCycle: 2,
  UpdatedAt: updatedAt,
});
function setup(t, row = record(), other = () => []) {
  t.mock.method(sequelize, "transaction", async (fn) => fn({ test: true }));
  return t.mock.method(sequelize, "query", async (sql, options) => {
    if (sql.startsWith("SELECT t.* FROM dbo.[Services]"))
      return row ? [row] : [];
    return other(sql, options);
  });
}
function values(call) {
  const [sql, { replacements: p }] = call.arguments;
  const cols = sql.startsWith("INSERT")
    ? sql
        .match(/\(([^)]+)\) OUTPUT/)[1]
        .split(",")
        .map((x) => x.replace(/[\[\]]/g, ""))
    : Array.from(sql.matchAll(/\[([^\]]+)\]=:v\d+/g), (m) => m[1]);
  return Object.fromEntries(cols.map((c, i) => [c, p[`v${i}`]]));
}
test("authoritative pricing uses paise, validates quantities and applies seasonal before weekend rules", () => {
  const p = pricingSchema.parse({ basePrice: 100000, discount: 10 });
  assert.equal(calculatePrice(p), 90000);
  assert.equal(
    calculatePrice(pricingSchema.parse({ basePrice: 0.1, unitPrice: 0.2 })),
    0.3,
  );
  const flexible = pricingSchema.parse({
    basePrice: 100,
    unitPrice: 10,
    minimumQuantity: 1,
    maximumQuantity: 10,
    discount: 10,
    weekendPrice: 200,
    seasonalPrice: 300,
    seasonalFrom: "2026-11-01",
    seasonalTo: "2026-11-30",
    additionalCharges: 5,
  });
  assert.equal(calculatePrice(flexible, 2, "2026-10-31"), 203);
  assert.equal(calculatePrice(flexible, 2, "2026-11-07"), 293);
  assert.throws(() => calculatePrice(flexible, 11));
  assert.throws(() => calculatePrice(flexible, 0));
  for (const patch of [
    { discount: 101 },
    { discount: -1 },
    { basePrice: 0.001 },
    { seasonalPrice: 200 },
    { maximumQuantity: 0 },
  ])
    assert.throws(() => pricingSchema.parse({ ...p, ...patch }));
});
test("strict service validation rejects owner, approval, price and nested attribute injection", () => {
  const d = document();
  for (const patch of [
    { vendorId },
    { status: "Approved" },
    { active: true },
    { finalPrice: 1 },
    { pricing: { ...d.pricing, finalPrice: 1 } },
    { seo: { ...d.seo, slug: "bad/slug" } },
    { location: { ...d.location, latitude: 91 } },
  ])
    assert.throws(() => serviceSchema.parse({ ...d, ...patch }));
  assert.throws(() => listSchema.parse({ sort: "price; DROP TABLE Services" }));
  assert.throws(() => listSchema.parse({ pageSize: 10001 }));
  assert.throws(() => listSchema.parse({ minPrice: 100, maxPrice: 50 }));
});
test("service submission validates required listing content and image presence", () => {
  const valid = document();
  assert.doesNotThrow(() => validateServiceSubmission(valid, 1));
  for (const patch of [
    { description: "Too short" },
    { shortDescription: "" },
    { location: { ...valid.location, city: "" } },
    { policies: { ...valid.policies, cancellation: "" } },
  ])
    assert.throws(
      () => validateServiceSubmission({ ...valid, ...patch }, 1),
      { status: 400 },
    );
  assert.throws(() => validateServiceSubmission(valid, 0), {
    status: 400,
    message: "Add at least one service image before submitting.",
  });
});
test("action availability matches review state and vendor eligibility", () => {
  for (const status of ["Pending", "Suspended"])
    assert.deepEqual(actionsFor({ status }), {
      edit: false,
      submit: false,
      activate: false,
      delete: false,
    });
  assert.equal(actionsFor({ status: "Draft" }, false).submit, false);
  assert.equal(actionsFor({ status: "Approved" }, false).activate, false);
  assert.equal(actionsFor({ status: "Draft", bookings: 1 }).delete, false);
  assert.equal(actionsFor({ status: "Rejected", hasHistory: 1 }).delete, false);
  assert.equal(actionsFor({ status: "Approved" }).delete, false);
  assert.equal(actionsFor({ status: "Rejected" }).submit, true);
});
test("an unapproved vendor can save an inactive draft but cannot submit it", async (t) => {
  const query = setup(t, null, (sql) =>
    sql.includes("CategoryName AS name")
      ? [{ name: "Venue & Location" }]
      : sql.startsWith("SELECT CategoryId")
        ? [{ CategoryId: 1 }]
        : [],
  );
  await services.saveService(null, document(), pending);
  const insert = query.mock.calls.find((c) =>
    c.arguments[0].startsWith("INSERT INTO dbo.[Services]"),
  );
  const data = values(insert);
  assert.equal(data.VendorId, vendorId);
  assert.equal(data.ApprovalStatus, "Draft");
  assert.equal(data.IsActive, 0);
  assert.equal(data.BasePrice, 90000);
  await assert.rejects(
    () => services.submit(serviceId, { expectedUpdatedAt: updatedAt }, pending),
    { status: 403 },
  );
});
test("editing an approved service withdraws it and requires a fresh approval cycle", async (t) => {
  const query = setup(t, record("Approved"), (sql) =>
    sql.includes("CategoryName AS name")
      ? [{ name: "Venue & Location" }]
      : sql.startsWith("SELECT CategoryId")
        ? [{ CategoryId: 1 }]
        : [],
  );
  await services.saveService(
    serviceId,
    { ...document(), expectedUpdatedAt: updatedAt },
    ctx,
  );
  const write = query.mock.calls.find((c) =>
    c.arguments[0].startsWith("UPDATE dbo.[Services]"),
  );
  assert.equal(values(write).ApprovalStatus, "Draft");
  assert.equal(values(write).IsActive, 0);
});
test("pending services and stale editor versions cannot overwrite a review", async (t) => {
  const row = record("Pending");
  const query = setup(t, row);
  await assert.rejects(
    () =>
      services.saveService(
        serviceId,
        { ...document(), expectedUpdatedAt: updatedAt },
        ctx,
      ),
    { status: 409 },
  );
  row.ApprovalStatus = "Draft";
  await assert.rejects(
    () =>
      services.saveService(
        serviceId,
        { ...document(), expectedUpdatedAt: "2020-01-01T00:00:00.000Z" },
        ctx,
      ),
    { status: 409 },
  );
  assert.ok(
    !query.mock.calls.some((c) =>
      /^(UPDATE|INSERT|DELETE)/.test(c.arguments[0]),
    ),
  );
});
test("submission checks media and live vendor approval and increments review cycle atomically", async (t) => {
  const query = setup(t, record("Rejected"), (sql) =>
    sql.includes("SELECT TOP(1) MediaId")
      ? [{ MediaId: userId }]
      : sql.startsWith("SELECT VerificationStatus")
        ? [{ VerificationStatus: "Approved", IsActive: 1 }]
        : [],
  );
  await services.submit(serviceId, { expectedUpdatedAt: updatedAt }, ctx);
  const write = query.mock.calls.find((c) =>
    c.arguments[0].startsWith("UPDATE dbo.[Services]"),
  );
  const data = values(write);
  assert.equal(data.ApprovalStatus, "Pending");
  assert.equal(data.ApprovalCycle, 3);
  assert.equal(data.IsActive, 0);
  assert.equal(data.RejectionReason, null);
  assert.ok(
    query.mock.calls.some((c) =>
      c.arguments[0].includes("Vendors WITH(UPDLOCK,HOLDLOCK)"),
    ),
  );
});
test("service metadata only offers categories assigned to the authenticated vendor", async (t) => {
  const query = setup(t, null, (sql) =>
    sql.includes("FROM dbo.Categories c JOIN dbo.VendorCategories")
      ? [{ id: 1, name: "Venue & Location" }]
      : [],
  );
  const result = await services.metadata(ctx);
  const categoryQuery = query.mock.calls.find((call) =>
    call.arguments[0].includes("FROM dbo.Categories c JOIN dbo.VendorCategories"),
  );
  assert.deepEqual(result.categories, [{ id: 1, name: "Venue & Location" }]);
  assert.match(categoryQuery.arguments[0], /vc\.VendorId=:id/);
  assert.equal(categoryQuery.arguments[1].replacements.id, vendorId);
});
test("activation rejects every unapproved service status and stale versions", async (t) => {
  const row = record();
  const query = setup(t, row);
  for (const status of ["Draft", "Pending", "Rejected", "Suspended"]) {
    row.ApprovalStatus = status;
    await assert.rejects(
      () =>
        services.active(
          serviceId,
          { active: true, expectedUpdatedAt: updatedAt },
          ctx,
        ),
      { status: 409 },
    );
  }
  row.ApprovalStatus = "Approved";
  await assert.rejects(
    () =>
      services.active(
        serviceId,
        { active: true, expectedUpdatedAt: "2020-01-01T00:00:00.000Z" },
        ctx,
      ),
    { status: 409 },
  );
  assert.ok(!query.mock.calls.some((c) => c.arguments[0].startsWith("UPDATE")));
});
test("all service and child lookups bind authenticated vendor ownership and fail closed for foreign IDs", async (t) => {
  const query = setup(t, null);
  for (const operation of [
    () => services.details(serviceId, ctx),
    () => services.performance(serviceId, ctx),
    () => services.availability(serviceId, ctx),
    () => services.duplicate(serviceId, ctx),
    () =>
      services.images(
        serviceId,
        { base64: "not-an-image", expectedUpdatedAt: updatedAt },
        ctx,
      ),
    () =>
      itemMutation(
        serviceId,
        null,
        { expectedUpdatedAt: updatedAt, item: { name: "Stage" } },
        ctx,
      ),
    () => packageMutation(serviceId, null, {}, ctx),
  ])
    await assert.rejects(operation, { status: 404 });
  for (const call of query.mock.calls) {
    assert.match(call.arguments[0], /t\.VendorId=:vendorId/);
    assert.equal(call.arguments[1].replacements.vendorId, vendorId);
    assert.ok(!call.arguments[0].includes(serviceId));
  }
});
test("bookings and quotation history prevent deletion; approved services cannot be deleted", async (t) => {
  const row = record();
  const query = setup(t, row, (sql) =>
    sql.startsWith("SELECT TOP(1) ServiceId") ? [{ ServiceId: serviceId }] : [],
  );
  await assert.rejects(
    () => services.remove(serviceId, { expectedUpdatedAt: updatedAt }, ctx),
    { status: 409 },
  );
  row.ApprovalStatus = "Approved";
  await assert.rejects(
    () => services.remove(serviceId, { expectedUpdatedAt: updatedAt }, ctx),
    { status: 409 },
  );
  assert.ok(!query.mock.calls.some((c) => c.arguments[0].startsWith("DELETE")));
});
test("list queries are bounded, parameterized, stably sorted and scoped to the vendor", async (t) => {
  const query = setup(t, null, (sql) =>
    sql.includes("COUNT_BIG(*) AS total ")
      ? [{ total: 0 }]
      : sql.includes("AS totalServices")
        ? [{}]
        : sql.startsWith("SELECT AVG")
          ? [{}]
          : [],
  );
  await services.list(
    {
      q: "garden_%'",
      location: "Jaipur",
      page: 3,
      pageSize: 12,
      sort: "priceAsc",
      approval: "Approved",
    },
    ctx,
  );
  const paged = query.mock.calls.find((c) =>
    c.arguments[0].includes("FETCH NEXT"),
  );
  assert.match(paged.arguments[0], /s\.VendorId=:id/);
  assert.match(paged.arguments[0], /ORDER BY s.BasePrice ASC,s.ServiceId/);
  assert.equal(paged.arguments[1].replacements.offset, 24);
  assert.equal(paged.arguments[1].replacements.size, 12);
  assert.equal(paged.arguments[1].replacements.search, "%garden[_][%]'%");
  assert.ok(!paged.arguments[0].includes("Jaipur"));
});
test("a booked date cannot be removed or overwritten", async (t) => {
  const query = setup(t, record(), (sql) =>
    sql.includes("SELECT * FROM dbo.VendorAvailability")
      ? [{ Status: "Booked" }]
      : [],
  );
  await assert.rejects(
    () => services.saveAvailability(serviceId, {}, ctx, "1", true),
    { status: 409 },
  );
  assert.ok(!query.mock.calls.some((c) => c.arguments[0].startsWith("DELETE")));
});
test("schedule enforces working days, custom timing, advance period and minimum notice", () => {
  const doc = document(),
    now = new Date("2026-10-28T00:00:00Z");
  assert.doesNotThrow(() =>
    assertServiceSchedule(doc, "2026-10-30", "10:00", null, now),
  );
  assert.throws(
    () => assertServiceSchedule(doc, "2026-10-31", "10:00", null, now),
    { status: 409 },
  );
  assert.doesNotThrow(() =>
    assertServiceSchedule(
      doc,
      "2026-10-31",
      "10:00",
      { StartTime: "09:00", EndTime: "12:00" },
      now,
    ),
  );
  assert.throws(
    () => assertServiceSchedule(doc, "2026-10-30", "08:00", null, now),
    { status: 409 },
  );
  assert.throws(
    () => assertServiceSchedule(doc, "2028-10-30", "10:00", null, now),
    { status: 409 },
  );
  assert.throws(
    () => assertServiceSchedule(doc, "2026-10-28", "10:00", null, now),
    { status: 409 },
  );
});
test("REST denies anonymous and customer access, validates parameters and enforces mutation origins", async (t) => {
  let auth = null;
  const query = setup(t, null);
  const app = express();
  app.use(
    "/api/vendor",
    createVendorRouter({ authenticateRequest: async () => auth }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api/vendor`;
  assert.equal((await fetch(`${base}/services`)).status, 401);
  auth = {
    user: { ...ctx.auth.user, roles: [{ code: "CUSTOMER", active: true }] },
  };
  assert.equal((await fetch(`${base}/services`)).status, 403);
  auth = ctx.auth;
  assert.equal((await fetch(`${base}/services/bad-id`)).status, 400);
  assert.equal(
    (
      await fetch(`${base}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(query.mock.callCount(), 0);
});
