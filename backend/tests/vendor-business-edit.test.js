import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { saveBusiness } from "../src/modules/vendors/workspace.service.js";

const vendorId = "734b9588-c47c-40eb-8c17-1797d65a2800";
const locationId = "734b9588-c47c-40eb-8c17-1797d65a2802";
const version = "2026-11-12T10:00:00.000Z";
const ctx = {
  req: { ip: "127.0.0.1" },
  auth: { user: {
    id: "734b9588-c47c-40eb-8c17-1797d65a2801",
    active: true, emailVerified: true,
    roles: [{ code: "VENDOR", active: true }],
    vendor: { id: vendorId, active: true, verificationStatus: "Approved" },
  } },
};
const input = {
  name: "Wedding Studio", description: "Photography for wedding celebrations.",
  email: "studio@example.com", phone: "+919876543210", gst: "", pan: "",
  categoryIds: [2, 1], adminLocationId: locationId, expectedUpdatedAt: version,
};

function database(t, { used = [], available = [1, 2], location = true, updatedAt = version } = {}) {
  const tx = { name: "business-edit-transaction" };
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.startsWith("SELECT * FROM dbo.Vendors"))
      return [{ VendorId: vendorId, BusinessName: "Old studio", UpdatedAt: updatedAt }];
    if (sql.includes("FROM dbo.AdminLocations WITH(HOLDLOCK)"))
      return location ? [{ LocationId: locationId }] : [];
    if (sql.startsWith("SELECT c.CategoryId AS id FROM dbo.Categories c WITH(HOLDLOCK)"))
      return available.map((id) => ({ id }));
    if (sql.startsWith("SELECT DISTINCT CategoryId AS id FROM dbo.Services"))
      return used.map((id) => ({ id }));
    if (sql.startsWith("SELECT CategoryId AS id,IsPrimary"))
      return [{ id: 1, isPrimary: true }, { id: 3, isPrimary: false }];
    return [];
  });
  return { query, tx };
}

test("business edits save categories, primary category and an active registered location for the current vendor", async (t) => {
  const { query, tx } = database(t);
  assert.equal((await saveBusiness(input, ctx)).message, "Business profile updated.");
  const calls = query.mock.calls.map((call) => call.arguments);
  for (const [, options] of calls) assert.equal(options.transaction, tx);
  const removal = calls.find(([sql]) => sql.startsWith("DELETE FROM dbo.VendorCategories"));
  assert.equal(removal[1].replacements.id, vendorId);
  assert.deepEqual(removal[1].replacements.categoryIds, [2, 1]);
  const insertion = calls.find(([sql]) => sql.startsWith("INSERT INTO dbo.[VendorCategories]"));
  assert.deepEqual(insertion[1].replacements, { v0: vendorId, v1: 2, v2: 0 });
  const primary = calls.find(([sql]) => sql.startsWith("UPDATE dbo.VendorCategories"));
  assert.equal(primary[1].replacements.primary, 2);
  assert.equal(primary[1].replacements.id, vendorId);
  const update = calls.find(([sql]) => sql.startsWith("UPDATE dbo.[Vendors]"));
  assert.equal(update[1].replacements.id, vendorId);
  assert.ok(Object.values(update[1].replacements).includes(locationId));
  assert.doesNotMatch(update[0], /VerificationStatus|IsActive|UserId|VerifiedAt/);
});

test("categories with existing services cannot be removed and invalid edits never write", async (t) => {
  const { query } = database(t, { used: [3] });
  await assert.rejects(() => saveBusiness(input, ctx), { status: 409 });
  assert.ok(query.mock.calls.every((call) => !/^(DELETE|UPDATE|INSERT)/.test(call.arguments[0])));
});

test("unavailable categories and registered locations are rejected before writes", async (t) => {
  const { query } = database(t, { available: [1] });
  await assert.rejects(() => saveBusiness(input, ctx), /category is unavailable/);
  assert.ok(query.mock.calls.every((call) => !/^(DELETE|UPDATE|INSERT)/.test(call.arguments[0])));
});

test("inactive registered locations cannot replace the vendor's registered location", async (t) => {
  const { query } = database(t, { location: false });
  await assert.rejects(() => saveBusiness(input, ctx), /active location/);
  assert.ok(query.mock.calls.every((call) => !/^(DELETE|UPDATE|INSERT)/.test(call.arguments[0])));
});

test("stale profile versions cannot change categories or location", async (t) => {
  const { query } = database(t, { updatedAt: "2026-11-12T11:00:00.000Z" });
  await assert.rejects(() => saveBusiness(input, ctx), { status: 409 });
  assert.equal(query.mock.callCount(), 1);
});

test("category lists and server-managed fields are validated before database access", async (t) => {
  const { query } = database(t);
  for (const patch of [
    { categoryIds: [] }, { categoryIds: [1, 1] }, { categoryIds: ["1"] },
    { categoryIds: [-1] }, { adminLocationId: "arbitrary-location" },
    { status: "Approved" }, { active: true }, { ownerId: vendorId },
  ]) await assert.rejects(() => saveBusiness({ ...input, ...patch }, ctx));
  assert.equal(query.mock.callCount(), 0);
});

test("legacy business edits leave category assignments and registered location untouched", async (t) => {
  const { query } = database(t);
  const { categoryIds, adminLocationId, ...legacy } = input;
  await saveBusiness(legacy, ctx);
  const calls = query.mock.calls.map((call) => call.arguments);
  assert.ok(calls.every(([sql]) => !sql.includes("VendorCategories")));
  const update = calls.find(([sql]) => sql.startsWith("UPDATE dbo.[Vendors]"));
  assert.doesNotMatch(update[0], /AdminLocationId/);
});
