import test from "node:test";
import assert from "node:assert/strict";
import { packageVisibility } from "../src/modules/admin/package-visibility.js";
import { sequelize } from "../src/config/database.js";
import { childrenIndex, details } from "../src/modules/admin/services-management.service.js";

const serviceId = "734b9588-c47c-40eb-8c17-1797d65a2800";
const packageId = "734b9588-c47c-40eb-8c17-1797d65a2801";
const ctx = { auth: { user: { id: serviceId, active: true, emailVerified: true, roles: [{ code: "ADMIN", active: true }] } } };
const eligible = {
  id: packageId, serviceId, service: "wedding venue", active: true,
  serviceStatus: "Approved", serviceActive: true, categoryActive: true,
  vendorStatus: "Approved", vendorActive: true, accountActive: true,
  accountBlocked: false, emailVerified: true, locationActive: 1, featured: true,
};

test("active packages explain suspension and become visible when the parent is restored", () => {
  const suspended = { ...eligible, serviceStatus: "Suspended", serviceActive: false };
  assert.deepEqual(packageVisibility(suspended), {
    customerVisible: false,
    visibilityReasons: ["Parent service “wedding venue” is suspended."],
    homepageEligible: false,
  });
  assert.equal(suspended.active, true);
  assert.deepEqual(packageVisibility({ ...suspended, serviceStatus: "Approved", serviceActive: true }), {
    customerVisible: true, visibilityReasons: [], homepageEligible: true,
  });
});

test("each public discovery prerequisite gives an actionable blocker", () => {
  const cases = [
    [{ active: false }, /Package is inactive/],
    [{ serviceStatus: "Draft" }, /Parent service.*draft/],
    [{ serviceActive: false }, /Parent service.*inactive/],
    [{ categoryActive: false }, /category is inactive/],
    [{ vendorStatus: "Suspended" }, /Vendor is not approved/],
    [{ vendorActive: false }, /Vendor is inactive/],
    [{ accountActive: false }, /account is inactive/],
    [{ accountBlocked: true }, /account is blocked/],
    [{ emailVerified: false }, /email is not verified/],
    [{ locationActive: 0 }, /registered location is missing or inactive/],
  ];
  for (const [change, reason] of cases) {
    const result = packageVisibility({ ...eligible, ...change });
    assert.equal(result.customerVisible, false);
    assert.equal(result.homepageEligible, false);
    assert.match(result.visibilityReasons.join(" "), reason);
  }
  assert.equal(packageVisibility({ ...eligible, active: false, categoryActive: false }).visibilityReasons.length, 2);
});

test("nonfeatured packages stay visible in discovery but are not homepage eligible", () => {
  assert.deepEqual(packageVisibility({ ...eligible, featured: false }), {
    customerVisible: true, visibilityReasons: [], homepageEligible: false,
  });
});

test("package index reads current blockers and does not change the package or its parent", async (t) => {
  let current = { ...eligible, serviceStatus: "Suspended", serviceActive: false };
  const query = t.mock.method(sequelize, "query", async (sql) => {
    assert.match(sql, /^SELECT /);
    return sql.startsWith("SELECT COUNT_BIG") ? [{ total: 1 }] : [current];
  });
  const hidden = await childrenIndex("packages", {}, ctx);
  assert.equal(hidden.rows[0].active, true);
  assert.equal(hidden.rows[0].customerVisible, false);
  assert.match(hidden.rows[0].visibilityReasons[0], /suspended/);
  current = { ...eligible };
  const restored = await childrenIndex("packages", {}, ctx);
  assert.equal(restored.rows[0].customerVisible, true);
  const sql = query.mock.calls.at(-1).arguments[0];
  assert.match(sql, /JOIN dbo.Users u/);
  assert.match(sql, /al.LocationId=v.AdminLocationId AND al.IsActive=1 AND al.DeletedAt IS NULL/);
});

test("service package details carry the same visibility reasons as the index", async (t) => {
  t.mock.method(sequelize, "query", async (sql) => {
    if (sql.startsWith("SELECT s.*")) return [{ ServiceId: serviceId, ServiceName: "wedding venue", ApprovalStatus: "Suspended", IsActive: false }];
    if (sql.startsWith("SELECT VendorId FROM dbo.Services")) return [{ VendorId: serviceId }];
    if (sql.startsWith("SELECT * FROM dbo.ServicePackages")) return [{ PackageId: packageId.toUpperCase(), IsActive: true }];
    if (sql.startsWith("SELECT t.PackageId AS id")) return [{ ...eligible, serviceStatus: "Suspended", serviceActive: false }];
    return [];
  });
  const result = await details(serviceId, ctx);
  assert.equal(result.packages[0].IsActive, true);
  assert.equal(result.packages[0].customerVisible, false);
  assert.match(result.packages[0].visibilityReasons[0], /wedding venue.*suspended/);
});

test("service items keep their existing response without package visibility fields", async (t) => {
  const item = { id: 1, name: "Stage", active: true };
  t.mock.method(sequelize, "query", async (sql) => sql.startsWith("SELECT COUNT_BIG") ? [{ total: 1 }] : [item]);
  const result = await childrenIndex("items", {}, ctx);
  assert.deepEqual(result.rows, [item]);
});
