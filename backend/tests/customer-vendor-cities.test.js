import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { customerLocations } from "../src/modules/addresses/admin-locations.service.js";
import { publicDiscover } from "../src/modules/customers/workspace.discovery.js";
import { featuredVendors, featuredVenues, featuredPackages, activeOffers, marketplaceStatistics } from "../src/modules/public/public.service.js";

test("customer cities come from active approved vendor addresses and group by normalized location", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  assert.deepEqual(await customerLocations(), []);
  const sql = query.mock.calls[0].arguments[0];
  assert.match(sql, /FROM dbo.VendorLocations vl WHERE vl.VendorId=v.VendorId AND vl.IsActive=1/);
  assert.match(sql, /v.IsActive=1 AND v.VerificationStatus='Approved'/);
  assert.match(sql, /u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1/);
  assert.match(sql, /ORDER BY businessLocation.priority,businessLocation.IsPrimary DESC/);
  assert.match(sql, /HASHBYTES\('SHA2_256',LOWER\(CONCAT/);
  assert.match(sql, /LTRIM\(RTRIM\(REPLACE/);
  assert.match(sql, /N'Uttar Pradesh'/);
  assert.match(sql, /GROUP BY l.LocationId ORDER BY city,state,country/);
  assert.match(sql, /l.LocationId IS NOT NULL/);
  assert.doesNotMatch(sql, /OFFSET|FETCH NEXT|TOP\s*\(2\)/);
});

test("older registered locations remain a fallback without overriding vendor business addresses", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  await customerLocations();
  const sql = query.mock.calls[0].arguments[0];
  assert.match(sql, /0 AS priority,vl.IsPrimary/);
  assert.match(sql, /UNION ALL\s+SELECT al.LocationId,al.City,al.State,al.Country,1,0/);
  assert.match(sql, /al.IsActive=1 AND al.DeletedAt IS NULL/);
  assert.ok(query.mock.calls.every(call => call.arguments[0].startsWith("SELECT")));
});

test("city selection filters services, vendors, packages and offers with the full stable city key", async (t) => {
  const city = "38062D1933C17D2EEBC8671B7B185AE3F6C712F0220BA39076934CBC0FC5C70A";
  const query = t.mock.method(sequelize, "query", async sql =>
    sql.includes("COUNT(*) AS total") ? [{ total: 0 }] : []);
  for (const type of ["services", "vendors", "packages", "offers"])
    await publicDiscover({ city, type });
  for (const fn of [featuredVendors, featuredVenues, featuredPackages, activeOffers]) await fn({ city });
  for (const { arguments: [sql, { replacements }] } of query.mock.calls) {
    assert.equal(replacements.city, city);
    assert.match(sql, /(?:l|loc)\.LocationId\s*=\s*:city/);
    assert.doesNotMatch(sql, /CONVERT\(varchar\(36\),(?:l|loc)\.LocationId\)/);
    assert.match(sql, /FROM dbo.VendorLocations vl/);
  }
});

test("marketplace city statistics count distinct automatic business locations", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => [{ cities: 4 }]);
  assert.equal((await marketplaceStatistics()).cities, 4);
  assert.match(query.mock.calls[0].arguments[0], /COUNT\(DISTINCT loc.LocationId\)/);
  assert.doesNotMatch(query.mock.calls[0].arguments[0], /COUNT\(DISTINCT v.AdminLocationId\)/);
});
