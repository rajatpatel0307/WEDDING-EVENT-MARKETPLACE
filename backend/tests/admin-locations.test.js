import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import { createMarketplaceRouter } from "../src/modules/customers/marketplace.routes.js";
import * as locations from "../src/modules/addresses/admin-locations.service.js";
import { register } from "../src/modules/auth/auth.service.js";
import { Limit, User, Vendor } from "../src/models/index.js";
import { saveProfile } from "../src/modules/vendors/onboarding.service.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800";
const user = (code) => ({
  id,
  active: true,
  blocked: false,
  emailVerified: true,
  roles: [{ code, active: true }],
  vendor: { id, active: true, verificationStatus: "Approved" },
});
const ctx = (code) => ({
  auth: { user: user(code) },
  req: { ip: "127.0.0.1" },
});
const body = {
  city: "Pune",
  state: "Maharashtra",
  country: "India",
  active: true,
};

test("repeating Add location returns the existing record without changing its availability", async (t) => {
  t.mock.method(sequelize, "transaction", async (fn) => fn({}));
  for (const active of [true, false]) {
    const existing = {
      id,
      city: "Lucknow",
      state: "Uttar Pradesh",
      country: "India",
      active,
    };
    const query = t.mock.method(sequelize, "query", async () => [existing]);
    const result = await locations.save(
      null,
      { city: "Lucknow", state: "UP", country: "IN", active: !active },
      ctx("ADMIN"),
    );
    assert.equal(result.success, true);
    assert.equal(result.id, id);
    assert.deepEqual(result.existingLocation, existing);
    assert.equal(result.message, "Lucknow already exists.");
    assert.equal(query.mock.calls.length, 1);
    assert.equal(
      query.mock.calls[0].arguments[1].replacements.state,
      "Uttar Pradesh",
    );
    assert.equal(
      query.mock.calls[0].arguments[1].replacements.country,
      "India",
    );
    query.mock.restore();
  }
});

test("renaming a location to a different existing location remains a clear conflict", async (t) => {
  t.mock.method(sequelize, "transaction", async (fn) => fn({}));
  const otherId = "734b9588-c47c-40eb-8c17-1797d65a2801";
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.startsWith("SELECT *") ? [{ LocationId: otherId }] : [{ id }],
  );
  await assert.rejects(
    () => locations.save(otherId, body, ctx("ADMIN")),
    (e) => e.status === 409 && /already exists/.test(e.message),
  );
  assert(
    query.mock.calls.every((call) => call.arguments[0].startsWith("SELECT")),
  );
});

test("UP and Uttar Pradesh identify the same Indian location", () => {
  for (const state of [
    "UP",
    "up",
    "U.P.",
    "U P",
    "Uttar Pradesh",
    "uttar  pradesh",
  ])
    assert.equal(
      locations.locationInput.parse({ ...body, state }).state,
      "Uttar Pradesh",
    );
  const normalized = locations.locationInput.parse({
    ...body,
    city: "  New   City  ",
    state: "UP",
    country: "in",
  });
  assert.equal(normalized.city, "New City");
  assert.equal(normalized.country, "India");
  assert.equal(normalized.state, "Uttar Pradesh");
  assert.equal(
    locations.locationInput.parse({
      ...body,
      state: "UP",
      country: "United States",
    }).state,
    "UP",
  );
  assert.equal(
    locations.locationInput.parse({ ...body, state: "Maharashtra" }).state,
    "Maharashtra",
  );
});

test("only admins can create, edit, delete, assign or inspect managed locations", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => {
    throw Error("Unexpected SQL");
  });
  for (const context of [
    ctx("CUSTOMER"),
    ctx("VENDOR"),
    { auth: { user: null } },
  ]) {
    for (const fn of [
      () => locations.list(context),
      () => locations.save(null, body, context),
      () => locations.save(id, body, context),
      () => locations.save(id, {}, context, true),
      () => locations.assignVendor(id, { locationId: id }, context),
    ])
      await assert.rejects(fn, (e) =>
        ["FORBIDDEN", "UNAUTHENTICATED"].includes(e.extensions?.code),
      );
  }
  assert.equal(query.mock.callCount(), 0);
});

test("managed location input rejects spoofed creator, owner, deletion and approval fields", () => {
  for (const value of [
    { ...body, city: " " },
    { ...body, active: "false" },
    { ...body, CreatedBy: id },
    { ...body, DeletedAt: new Date() },
    { ...body, approved: true },
    { ...body, vendorId: id },
  ])
    assert.equal(locations.locationInput.safeParse(value).success, false);
});

test("registration validation rejects nonexistent, inactive and deleted selections in the same transaction", async (t) => {
  const tx = {};
  const query = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(
    () => locations.assertActiveLocation(id, tx),
    /active location created by the administrator/,
  );
  const call = query.mock.calls[0].arguments;
  assert.match(call[0], /HOLDLOCK/);
  assert.match(call[0], /IsActive=1 AND DeletedAt IS NULL/);
  assert.equal(call[1].transaction, tx);
  assert.equal(call[1].replacements.id, id);
  await assert.rejects(
    () => locations.assertActiveLocation("Pune", tx),
    /GUID/,
  );
  assert.equal(query.mock.callCount(), 1);
});

test("vendor signup rejects unavailable locations before creating a user or vendor", async (t) => {
  t.mock.method(Limit, "findByPk", async () => ({
    count: 0,
    expiresAt: new Date(Date.now() + 60000),
    save: async () => {},
  }));
  t.mock.method(sequelize, "transaction", async (options, fn) =>
    (fn || options)({}),
  );
  t.mock.method(sequelize, "query", async () => []);
  const createUser = t.mock.method(User, "create", async () => {
    throw Error("Unexpected account");
  });
  const createVendor = t.mock.method(Vendor, "create", async () => {
    throw Error("Unexpected vendor");
  });
  const input = {
    firstName: "Test",
    lastName: "Vendor",
    email: "location@example.com",
    phone: "+919876543210",
    password: "TestPass123!",
    confirmPassword: "TestPass123!",
    terms: true,
    privacy: true,
    adminLocationId: id,
  };
  await assert.rejects(
    () => register(input, "VENDOR", ctx("VENDOR")),
    /active location/,
  );
  await assert.rejects(
    () =>
      register(
        { ...input, adminLocationId: undefined },
        "VENDOR",
        ctx("VENDOR"),
      ),
    (e) => e.name === "ZodError",
  );
  assert.equal(createUser.mock.callCount(), 0);
  assert.equal(createVendor.mock.callCount(), 0);
});

test("onboarding rejects a location deactivated after the vendor chose it", async (t) => {
  const version = "2026-11-12T00:00:00.000Z";
  const calls = [];
  t.mock.method(sequelize, "transaction", async (options, fn) =>
    (fn || options)({}),
  );
  t.mock.method(sequelize, "query", async (sql) => {
    calls.push(sql);
    return sql.startsWith("SELECT * FROM dbo.Vendors")
      ? [
          {
            VerificationStatus: "Pending",
            ProfileDraftJson: "{}",
            UpdatedAt: version,
          },
        ]
      : [];
  });
  await assert.rejects(
    () =>
      saveProfile(
        { adminLocationId: id, location: {}, expectedUpdatedAt: version },
        ctx("VENDOR"),
        true,
      ),
    /active location/,
  );
  assert.equal(
    calls.some((sql) => /^(INSERT|UPDATE|DELETE)/.test(sql)),
    false,
  );
});

test("deletion preserves vendor foreign keys and history while excluding the location from discovery", async (t) => {
  t.mock.method(sequelize, "transaction", async (options, fn) =>
    (fn || options)({}),
  );
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.startsWith("SELECT * FROM dbo.AdminLocations")
      ? [{ LocationId: id, IsActive: 1 }]
      : [],
  );
  await locations.save(id, {}, ctx("ADMIN"), true);
  const statements = query.mock.calls.map((c) => c.arguments[0]);
  assert(
    statements.some(
      (sql) =>
        sql.startsWith("UPDATE dbo.[AdminLocations]") &&
        sql.includes("DeletedAt") &&
        sql.includes("IsActive"),
    ),
  );
  assert(
    !statements.some(
      (sql) =>
        sql.startsWith("DELETE") || sql.startsWith("UPDATE dbo.[Vendors]"),
    ),
  );
  assert(statements.some((sql) => sql.includes("INSERT INTO dbo.AuditLogs")));
});

async function serve(t, app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
test("admin HTTP endpoints deny vendor accounts and enforce existing origin protections", async (t) => {
  const app = express();
  app.use(
    createAdminRouter({
      authenticateRequest: async () => ({ user: user("VENDOR") }),
    }),
  );
  const base = await serve(t, app);
  assert.equal((await fetch(`${base}/locations`)).status, 403);
  assert.equal(
    (
      await fetch(`${base}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ).status,
    403,
  );
});
test("registration and customer location endpoints remain distinct and never cache visibility", async (t) => {
  t.mock.method(sequelize, "query", async (sql) => [
    {
      id,
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      active: true,
      eligibleQuery: sql.includes("VerificationStatus='Approved'"),
    },
  ]);
  const app = express();
  app.use(createMarketplaceRouter());
  const base = await serve(t, app);
  for (const [path, eligible] of [
    ["/registration-locations", false],
    ["/locations", true],
  ]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).data[0].eligibleQuery, eligible);
  }
});
