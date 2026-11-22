// Exercises city actions against MSSQL using isolated fixtures; always rolls back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import * as repo from "../src/modules/admin/admin.repository.js";
import * as locations from "../src/modules/addresses/admin-locations.service.js";
import { publicDiscover } from "../src/modules/customers/workspace.discovery.js";
import { featuredVendors } from "../src/modules/public/public.service.js";

const query = sequelize.query.bind(sequelize);
const transaction = sequelize.transaction.bind(sequelize);
let tx;
try {
  await sequelize.authenticate();
  tx = await transaction();
  sequelize.query = (sql, options = {}) =>
    query(sql, { ...options, transaction: tx });
  sequelize.transaction = async (fn) => fn(tx);
  async function createUser() {
    const id = randomUUID();
    await repo.insert(
      { table: "Users", id: "UserId" },
      {
        UserId: id,
        FirstName: "City action verification",
        Email: `${id}@example.invalid`,
        PasswordHash: "rollback-fixture",
        IsActive: 1,
        IsBlocked: 0,
        IsEmailVerified: 1,
      },
      tx,
    );
    return id;
  }
  const admin = await createUser();
  const ctx = {
    auth: {
      user: {
        id: admin,
        active: true,
        blocked: false,
        emailVerified: true,
        roles: [{ code: "ADMIN", active: true }],
      },
    },
    req: { ip: "127.0.0.1" },
  };
  async function createCity() {
    const vendorId = randomUUID();
    const city = `City-actions-${randomUUID()}`;
    const addressId = randomUUID();
    await repo.insert(
      { table: "Vendors", id: "VendorId" },
      {
        VendorId: vendorId,
        UserId: await createUser(),
        BusinessName: city,
        BusinessSlug: `city-actions-${vendorId}`,
        VerificationStatus: "Approved",
        IsActive: 1,
      },
      tx,
    );
    await repo.insert(
      { table: "VendorLocations", id: "VendorLocationId" },
      {
        VendorLocationId: addressId,
        VendorId: vendorId,
        City: city,
        State: "Test State",
        Country: "India",
        AddressLine1: "Verification street",
        PostalCode: "226001",
        IsActive: 1,
        IsPrimary: 1,
      },
      tx,
    );
    const source = (await locations.customerLocations()).find(
      (row) => row.city === city,
    );
    assert.ok(source);
    return { source, vendorId, addressId };
  }

  const { source, vendorId, addressId } = await createCity();
  const city = `Renamed-${randomUUID()}`;
  const input = {
    city,
    state: source.state,
    country: source.country,
    active: true,
  };
  assert.equal(
    (await locations.list(ctx)).find((row) => row.id === source.id).managed,
    false,
  );
  const saved = await locations.save(source.id, input, ctx);
  assert.match(saved.id, /^[\da-f-]{36}$/i);
  const renamed = (await locations.customerLocations()).find(
    (row) => row.city === city,
  );
  assert.ok(renamed, "automatic city edit updates the homepage city");
  assert.ok(
    !(await locations.customerLocations()).some((row) => row.id === source.id),
  );
  const [address] = await repo.select(
    "SELECT City,AddressLine1,IsActive,VendorId FROM dbo.VendorLocations WHERE VendorLocationId=:id",
    { id: addressId },
    tx,
  );
  assert.equal(address.City, city);
  assert.equal(address.AddressLine1, "Verification street");
  assert.equal(address.IsActive, true);
  assert.equal(address.VendorId.toLowerCase(), vendorId.toLowerCase());

  await locations.save(saved.id, { ...input, active: false }, ctx);
  assert.ok(
    !(await locations.customerLocations()).some((row) => row.id === renamed.id),
  );
  const inactive = (await locations.list(ctx)).find(
    (row) => row.id === saved.id,
  );
  assert.equal(inactive.active, false);
  assert.equal(inactive.customerVisible, false);
  assert.equal(inactive.approvedVendors, 1);
  assert.equal(
    (await publicDiscover({ city: renamed.id, type: "vendors" })).total,
    0,
  );
  assert.equal((await featuredVendors({ city: renamed.id })).length, 0);
  assert.equal(
    (await featuredVendors({ id: vendorId })).length,
    0,
    "direct vendor lookup respects city deactivation",
  );
  await locations.save(saved.id, input, ctx);
  assert.ok(
    (await locations.customerLocations()).some((row) => row.id === renamed.id),
  );
  await locations.save(saved.id, {}, ctx, true);
  assert.ok(
    !(await locations.customerLocations()).some((row) => row.id === renamed.id),
  );
  assert.ok(
    !(await locations.list(ctx)).some((row) => row.city === city),
    "deleted city does not reappear from a vendor address",
  );
  const [preserved] = await repo.select(
    "SELECT IsActive,VerificationStatus FROM dbo.Vendors WHERE VendorId=:id",
    { id: vendorId },
    tx,
  );
  assert.equal(preserved.IsActive, true);
  assert.equal(preserved.VerificationStatus, "Approved");
  await locations.save(null, input, ctx);
  assert.ok(
    (await locations.customerLocations()).some((row) => row.id === renamed.id),
    "re-adding a city supersedes its archived catalog entry",
  );

  const second = await createCity();
  await locations.save(second.source.id, {}, ctx, true);
  assert.ok(
    !(await locations.customerLocations()).some(
      (row) => row.id === second.source.id,
    ),
  );
  assert.ok(
    !(await locations.list(ctx)).some((row) => row.city === second.source.city),
  );
  const [kept] = await repo.select(
    "SELECT IsActive FROM dbo.VendorLocations WHERE VendorLocationId=:id",
    { id: second.addressId },
    tx,
  );
  assert.equal(kept.IsActive, true);
  console.log(
    "PASS: uniform city edit, deactivate, reactivate and delete; discovery filtering; preserved vendor records; re-add after deletion.",
  );
} catch (error) {
  console.error("City action verification failed:", error.message);
  process.exitCode = 1;
} finally {
  if (tx && !tx.finished) await tx.rollback();
  sequelize.query = query;
  sequelize.transaction = transaction;
  await sequelize.close();
  console.log("Verification transaction rolled back.");
}
