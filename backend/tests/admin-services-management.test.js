import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import * as management from "../src/modules/admin/services-management.service.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import {
  pricingSchema,
  calculatePrice,
} from "../src/modules/vendors/service-management.validation.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800",
  foreignId = "734b9588-c47c-40eb-8c17-1797d65a2801";
const updatedAt = "2026-10-28T10:00:00.000Z";
const user = {
  id,
  active: true,
  emailVerified: true,
  roles: [{ code: "ADMIN", active: true }],
};
const ctx = { req: { ip: "127.0.0.1" }, auth: { user } };
const row = {
  ServiceId: id,
  VendorId: foreignId,
  ServiceName: "Garden",
  ApprovalStatus: "Draft",
  UpdatedAt: updatedAt,
};
function mockDatabase(t, extra = () => [], service = row) {
  const tx = { test: true };
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql, opts) => {
    if (sql.startsWith("SELECT * FROM dbo.[Services]"))
      return service ? [service] : [];
    return extra(sql, opts);
  });
  return { query, tx };
}
test("admin list validation bounds pages, dates, prices, ratings and allowed sort keys", () => {
  for (const input of [
    { pageSize: 101 },
    { page: -1 },
    { category: -1 },
    { vendor: "bad" },
    { rating: 6 },
    { minPrice: 10, maxPrice: 5 },
    { sort: "name;DROP TABLE Services" },
    { createdFrom: "2026-10-29", createdTo: "2026-10-01" },
    { updatedFrom: "2026-10-29", updatedTo: "2026-10-01" },
    { ownerId: id },
  ])
    assert.equal(management.querySchema.safeParse(input).success, false);
});
test("list SQL binds wildcard searches and filters, uses stable sorting and pagination", async (t) => {
  const { query } = mockDatabase(t, (sql) =>
    sql.startsWith("SELECT COUNT_BIG") ? [{ total: 0 }] : [],
  );
  await management.list(
    {
      q: "'[%_",
      vendor: id,
      category: 1,
      subcategory: 2,
      location: "Jaipur",
      status: "Approved",
      active: "true",
      page: 2,
      pageSize: 10,
      sort: "price",
      direction: "asc",
      createdFrom: "2026-10-28",
      updatedTo: "2026-10-29",
    },
    ctx,
  );
  const [sql, options] = query.mock.calls.at(-1).arguments;
  assert.ok(!sql.includes("'[%_"));
  assert.equal(options.replacements.offset, 10);
  assert.equal(options.replacements.size, 10);
  assert.equal(options.replacements.vendor, id);
  assert.match(sql, /s.VendorId=:vendor/);
  assert.match(sql, /s.CategoryId=:category/);
  assert.match(sql, /s.SubCategoryId=:subcategory/);
  assert.match(sql, /ORDER BY s.BasePrice ASC,s.ServiceId OFFSET/);
  assert.equal(options.replacements.createdStart, "2026-10-27 18:30:00.000");
  assert.equal(options.replacements.updatedEnd, "2026-10-29 18:30:00.000");
});
test("service pricing includes discount, charges and tax in integer paise", () => {
  const p = pricingSchema.parse({
    basePrice: 100000,
    unitPrice: 100,
    minimumQuantity: 2,
    maximumQuantity: 5,
    discount: 10,
    additionalCharges: 500,
    taxRate: 18,
  });
  const result = management.priceCalculation(p);
  assert.equal(result.subtotal, 90680);
  assert.equal(result.tax, 16322.4);
  assert.equal(result.finalPrice, 107002.4);
  assert.equal(calculatePrice(p), result.finalPrice);
  assert.equal(pricingSchema.safeParse({ taxRate: 101 }).success, false);
});
test("CSV quotes content and neutralizes spreadsheet formula injection", () => {
  for (const value of [
    '=HYPERLINK("bad")',
    " +SUM(A1)",
    "\t@command",
    "-formula",
  ])
    assert.ok(management.csvCell(value).startsWith("\"'"));
  assert.equal(management.csvCell('Garden, "Royal"'), '"Garden, ""Royal"""');
});
test("service actions prevent status bypasses and deletion of referenced services", () => {
  assert.ok(!management.actionsFor({ status: "Pending" }).includes("edit"));
  assert.ok(
    management.actionsFor({ status: "UnderReview" }).includes("approve"),
  );
  assert.ok(
    !management
      .actionsFor({ status: "Draft", hasHistory: true })
      .includes("delete"),
  );
  assert.ok(
    !management.actionsFor({ status: "Suspended" }).includes("activate"),
  );
  assert.ok(
    management
      .actionsFor({ status: "Approved", active: true })
      .includes("deactivate"),
  );
});
test("item, package and media IDs are scoped to the service before writes", async (t) => {
  const { query } = mockDatabase(t);
  await assert.rejects(
    () =>
      management.itemMutation(
        id,
        10,
        { expectedUpdatedAt: updatedAt, item: { name: "Stage" } },
        ctx,
      ),
    (e) => e.status === 404,
  );
  await assert.rejects(
    () =>
      management.packageMutation(
        id,
        foreignId,
        {
          expectedUpdatedAt: updatedAt,
          name: "Garden package",
          description: "",
          price: 10,
          discount: 0,
          minimumGuests: null,
          maximumGuests: null,
          active: false,
        },
        ctx,
      ),
    (e) => e.status === 404,
  );
  await assert.rejects(
    () =>
      management.imageMutation(
        id,
        foreignId,
        { expectedUpdatedAt: updatedAt, action: "delete" },
        ctx,
      ),
    (e) => e.status === 404,
  );
  for (const call of query.mock.calls.filter((c) =>
    /ServiceItemId=:itemId|PackageId=:packageId|MediaId=:imageId/.test(
      c.arguments[0],
    ),
  ))
    assert.ok(/ServiceId=:id|EntityId=:id/.test(call.arguments[0]));
  assert.ok(
    !query.mock.calls.some((c) =>
      /^(UPDATE|DELETE|INSERT)/.test(c.arguments[0]),
    ),
  );
});
test("stale edits cannot modify items or delete a service", async (t) => {
  const { query } = mockDatabase(t);
  const stale = { expectedUpdatedAt: "2026-10-27T10:00:00.000Z" };
  await assert.rejects(
    () => management.remove(id, stale, ctx),
    (e) => e.status === 409,
  );
  await assert.rejects(
    () =>
      management.itemMutation(
        id,
        null,
        { ...stale, item: { name: "Stage" } },
        ctx,
      ),
    (e) => e.status === 409,
  );
  assert.ok(
    !query.mock.calls.some((c) =>
      /^(UPDATE|DELETE|INSERT)/.test(c.arguments[0]),
    ),
  );
});
test("deletion rejects any booking, quotation or offer history", async (t) => {
  const { query } = mockDatabase(t, (sql) =>
    sql.startsWith("SELECT TOP(1) ServiceId") ? [{ ServiceId: id }] : [],
  );
  await assert.rejects(
    () => management.remove(id, { expectedUpdatedAt: updatedAt }, ctx),
    (e) => e.status === 409,
  );
  assert.ok(!query.mock.calls.some((c) => c.arguments[0].startsWith("DELETE")));
});
test("item changes withdraw approved content and audit the same transaction", async (t) => {
  const { query, tx } = mockDatabase(
    t,
    (sql) => (sql.startsWith("SELECT COUNT(*)") ? [{ total: 0 }] : []),
    { ...row, ApprovalStatus: "Approved" },
  );
  await management.itemMutation(
    id,
    null,
    { expectedUpdatedAt: updatedAt, item: { name: "Stage" } },
    ctx,
  );
  assert.ok(
    query.mock.calls.some((c) => c.arguments[0].includes("[ApprovalStatus]")),
  );
  assert.ok(
    query.mock.calls.some((c) =>
      c.arguments[0].startsWith("INSERT INTO dbo.AuditLogs"),
    ),
  );
  assert.ok(query.mock.calls.every((c) => c.arguments[1].transaction === tx));
});
test("audit failures reject service mutations", async (t) => {
  mockDatabase(t, (sql) => {
    if (sql.startsWith("SELECT COUNT(*)")) return [{ total: 0 }];
    if (sql.startsWith("INSERT INTO dbo.AuditLogs"))
      throw new Error("Audit unavailable");
    return [];
  });
  await assert.rejects(
    () =>
      management.itemMutation(
        id,
        null,
        { expectedUpdatedAt: updatedAt, item: { name: "Stage" } },
        ctx,
      ),
    /Audit unavailable/,
  );
});
test("admin service REST reads and mutations reject vendor identities before querying", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => {
    throw new Error("Must not query");
  });
  const app = express();
  app.use(
    "/api/admin",
    createAdminRouter({
      authenticateRequest: async () => ({
        user: { ...user, roles: [{ code: "VENDOR", active: true }] },
      }),
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}/api/admin`;
  for (const path of [
    "/services",
    "/services/statistics",
    "/services/metadata",
    "/services/export",
    "/service-items",
    "/service-packages",
    `/services/${id}`,
    `/services/${id}/performance`,
    `/services/${id}/records/bookings`,
  ])
    assert.equal((await fetch(base + path)).status, 403);
  for (const [method, path] of [
    ["POST", "/services"],
    ["PUT", `/services/${id}`],
    ["DELETE", `/services/${id}`],
    ["POST", `/services/${id}/duplicate`],
    ["POST", `/services/${id}/items`],
    ["PUT", `/services/${id}/packages/${foreignId}`],
    ["POST", `/services/${id}/images/${foreignId}`],
    ["POST", `/services/${id}/images/upload`],
  ])
    assert.equal(
      (
        await fetch(base + path, {
          method,
          headers: { Origin: process.env.FRONTEND_URL, "X-Admin-Request": "1" },
        })
      ).status,
      403,
    );
  assert.equal(query.mock.callCount(), 0);
});
