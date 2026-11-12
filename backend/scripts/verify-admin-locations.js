// All schema and fixture changes are rolled back, including on failure.
import assert from "node:assert/strict";
import { randomUUID as uuid } from "node:crypto";
const randomUUID = () => uuid().toUpperCase();
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/031-admin-locations.js";
import * as repo from "../src/modules/admin/admin.repository.js";
import * as locations from "../src/modules/addresses/admin-locations.service.js";
import {
  publicDiscover,
  publicCatalog,
} from "../src/modules/customers/workspace.discovery.js";
import {
  featuredVendors,
  featuredVenues,
  featuredPackages,
  marketplaceStatistics,
} from "../src/modules/public/public.service.js";
const query = sequelize.query.bind(sequelize),
  transaction = sequelize.transaction.bind(sequelize);
let tx;
try {
  await sequelize.authenticate();
  tx = await transaction();
  sequelize.query = (sql, options = {}) =>
    query(sql, { ...options, transaction: tx });
  sequelize.transaction = async (fn) => fn(tx);
  await up(sequelize.getQueryInterface(), tx);
  await up(sequelize.getQueryInterface(), tx);
  const admin = randomUUID(),
    owner = randomUUID(),
    otherOwner = randomUUID(),
    vendor = randomUUID(),
    otherVendor = randomUUID();
  for (const id of [admin, owner, otherOwner])
    await repo.insert(
      { table: "Users", id: "UserId" },
      {
        UserId: id,
        FirstName: "Location Verification",
        Email: `${id}@example.invalid`,
        PasswordHash: "rollback-fixture",
        IsActive: 1,
        IsBlocked: 0,
        IsEmailVerified: 1,
      },
      tx,
    );
  const ctx = {
    auth: {
      user: {
        id: admin,
        active: true,
        emailVerified: true,
        roles: [{ code: "ADMIN", active: true }],
      },
    },
    req: { ip: "127.0.0.1" },
  };
  const city = `Location-${randomUUID()}`;
  const created = await locations.save(
    null,
    { city, state: "Test State", country: "India", active: true },
    ctx,
  );
  const locationId = created.id;
  const otherId = (
    await locations.save(
      null,
      { city, state: "Other State", country: "India", active: true },
      ctx,
    )
  ).id;
  assert(locationId);
  assert(
    (await locations.availableLocations()).some((l) => l.id === locationId),
  );
  const visible = async () =>
    (await locations.customerLocations()).some((l) => l.id === locationId);
  assert.equal(await visible(), false, "An empty admin location is not public");
  for (const [id, userId, registered] of [
    [vendor, owner, locationId],
    [otherVendor, otherOwner, otherId],
  ])
    await repo.insert(
      { table: "Vendors", id: "VendorId" },
      {
        VendorId: id,
        UserId: userId,
        BusinessName: `Location vendor ${id}`,
        BusinessSlug: `location-${id}`,
        AdminLocationId: registered,
        VerificationStatus: "Pending",
        IsActive: 0,
        ProfileDraftJson: null,
      },
      tx,
    );
  const setVendor = async (status, active = status === "Approved") =>
    repo.update(
      { table: "Vendors", id: "VendorId" },
      vendor,
      { VerificationStatus: status, IsActive: active ? 1 : 0 },
      tx,
    );
  for (const status of [
    "Pending",
    "UnderReview",
    "Rejected",
    "Suspended",
    "Approved",
  ]) {
    await setVendor(status, true); // Even accidentally active unapproved vendors must stay hidden.
    assert.equal(await visible(), status === "Approved", status);
    const results = await publicDiscover({ type: "vendors", city: locationId });
    assert.equal(
      results.rows.some((v) => v.id === vendor),
      status === "Approved",
      `Discovery: ${status}`,
    );
  }
  await setVendor("Approved", false);
  assert.equal(await visible(), false, "Inactive approved vendor");
  await setVendor("Approved");
  for (const update of [
    { IsActive: 0 },
    { IsActive: 1, IsBlocked: 1 },
    { IsBlocked: 0, IsEmailVerified: 0 },
  ]) {
    await repo.update({ table: "Users", id: "UserId" }, owner, update, tx);
    assert.equal(await visible(), false, "Ineligible vendor account");
  }
  await repo.update(
    { table: "Users", id: "UserId" },
    owner,
    { IsActive: 1, IsBlocked: 0, IsEmailVerified: 1 },
    tx,
  );
  await repo.update(
    { table: "Vendors", id: "VendorId" },
    otherVendor,
    { VerificationStatus: "Approved", IsActive: 1 },
    tx,
  );
  let results = await publicDiscover({ type: "vendors", city: locationId });
  assert.deepEqual(
    results.rows.map((v) => v.id),
    [vendor],
    "Same city in another state cannot cross the ID filter",
  );
  const [category] = await repo.select(
    "SELECT TOP(1) CategoryId FROM dbo.Categories WHERE IsActive=1 ORDER BY CategoryId",
    {},
    tx,
  );
  assert(category, "An active category is required for service verification");
  const services = [];
  for (const [vendorId, type] of [
    [vendor, "Sell"],
    [vendor, "Book"],
    [otherVendor, "Both"],
  ]) {
    const id = randomUUID();
    services.push(id);
    await repo.insert(
      { table: "Services", id: "ServiceId" },
      {
        ServiceId: id,
        VendorId: vendorId,
        CategoryId: category.CategoryId,
        ServiceName: `Location ${type} ${id}`,
        ServiceSlug: `location-${id}`,
        Description: "Rollback-only location verification",
        BasePrice: 100,
        IsActive: 1,
        ApprovalStatus: "Approved",
        DetailsJson: JSON.stringify({
          offer: { type },
          location: { city: "Spoofed City", cities: ["Spoofed City"] },
        }),
      },
      tx,
    );
  }
  results = await publicDiscover({ city: locationId });
  assert.deepEqual(
    new Set(results.rows.map((s) => s.id)),
    new Set(services.slice(0, 2)),
    "Products and services match registered vendor location",
  );
  assert.equal(
    (await publicDiscover({ city: "Spoofed City" })).rows.some((s) =>
      services.includes(s.id),
    ),
    false,
    "Coverage JSON cannot bypass registered location",
  );
  assert((await publicCatalog()).cities.some((l) => l.id === locationId));
  assert(
    (await featuredVendors({ city: locationId })).some((v) => v.id === vendor),
  );
  await featuredVenues({ city: locationId });
  await featuredPackages({ city: locationId });
  await marketplaceStatistics();
  await locations.save(
    locationId,
    { city, state: "Test State", country: "India", active: false },
    ctx,
  );
  assert.equal(await visible(), false);
  assert(
    !(await locations.availableLocations()).some((l) => l.id === locationId),
  );
  await assert.rejects(
    () => locations.assertActiveLocation(locationId, tx),
    /active location/,
  );
  assert.equal((await publicDiscover({ city: locationId })).total, 0);
  await locations.save(
    locationId,
    {
      city: `${city}-edited`,
      state: "Test State",
      country: "India",
      active: true,
    },
    ctx,
  );
  assert.equal(await visible(), true, "Reactivation is dynamic");
  await locations.assignVendor(otherVendor, { locationId }, ctx);
  await setVendor("Suspended");
  assert.equal(
    await visible(),
    true,
    "A second approved vendor keeps location public",
  );
  await repo.update(
    { table: "Vendors", id: "VendorId" },
    otherVendor,
    { IsActive: 0 },
    tx,
  );
  assert.equal(await visible(), false, "Last approved active vendor removed");
  await setVendor("Approved");
  await locations.save(locationId, {}, ctx, true);
  assert.equal(await visible(), false);
  assert(
    !(await locations.availableLocations()).some((l) => l.id === locationId),
  );
  await assert.rejects(
    () => locations.assertActiveLocation(locationId, tx),
    /active location/,
  );
  assert.equal((await publicDiscover({ city: locationId })).total, 0);
  assert.equal((await featuredVendors({ city: locationId })).length, 0);
  await assert.rejects(
    () => locations.assertActiveLocation(randomUUID(), tx),
    /active location/,
  );
  console.log(
    "PASS: admin CRUD, registration validation, all vendor/account statuses, multiple vendors, active/inactive/deleted locations, exact location filtering, product/service coverage bypass prevention, catalog and GraphQL discovery. All changes rolled back.",
  );
} catch (error) {
  console.error("Location verification failed:", error.message);
  process.exitCode = 1;
} finally {
  sequelize.query = query;
  sequelize.transaction = transaction;
  if (tx && !tx.finished) await tx.rollback();
  await sequelize.close();
}
