import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { marketplaceSearch } from "../src/modules/customers/marketplace-search.js";
import { publicDiscover, discoveryInput } from "../src/modules/customers/workspace.discovery.js";

test("homepage search recognizes category names and common professional names", () => {
  for (const [query, expected] of [
    ["wedding photographer", "%photography%"], ["videographer", "%videography%"],
    ["cinematographers", "%videography%"], ["caterer", "%catering%"],
    ["decorators", "%decoration%"], ["makeup artist", "%makeup%"],
  ]) assert.equal(marketplaceSearch(query, ["c.CategoryName"]).params.search0, expected);
});

test("search words can match different listing fields without allowing SQL wildcards", () => {
  const result = marketplaceSearch(" Photography  sarojni ", ["c.CategoryName", "l.City"]);
  assert.deepEqual(result.params, { search0: "%Photography%", search1: "%sarojni%" });
  assert.match(result.sql, /c.CategoryName LIKE :search0 OR l.City LIKE :search0/);
  assert.match(result.sql, /\) AND \(/);
  const literal = "50%_[x]'";
  const escaped = marketplaceSearch(literal, ["s.ServiceName"]);
  assert.equal(escaped.params.search0, "%50[%][_][[]x[]]'%");
  assert.ok(!escaped.sql.includes(literal));
  assert.deepEqual(marketplaceSearch("  ", ["s.ServiceName"]), { sql: "1=1", params: {} });
});

test("service search checks category, subcategory, description and city in both counts and rows", async (t) => {
  const query = t.mock.method(sequelize, "query", async sql => sql.includes("COUNT(*) AS total") ? [{ total: 0 }] : []);
  const city = "38062D1933C17D2EEBC8671B7B185AE3F6C712F0220BA39076934CBC0FC5C70A";
  await publicDiscover({ q: "photographer", city });
  assert.equal(query.mock.callCount(), 2);
  for (const { arguments: [sql, { replacements }] } of query.mock.calls) {
    for (const field of ["s.ServiceName", "s.Description", "v.BusinessName", "c.CategoryName", "sc.SubCategoryName", "l.City"])
      assert.ok(sql.includes(`${field} LIKE :search0`));
    assert.equal(replacements.search0, "%photography%");
    assert.equal(replacements.city, city);
    assert.match(sql, /s.ApprovalStatus='Approved'/);
    assert.match(sql, /v.VerificationStatus='Approved'/);
    assert.match(sql, /l.LocationId=:city/);
  }
});

test("vendor and package searches include their service categories", async (t) => {
  const query = t.mock.method(sequelize, "query", async sql => sql.includes("COUNT(*) AS total") ? [{ total: 0 }] : []);
  await publicDiscover({ q: "Photography", type: "vendors" });
  assert.match(query.mock.calls.at(-1).arguments[0], /ac.CategoryName/);
  assert.match(query.mock.calls.at(-1).arguments[0], /v.BusinessDescription LIKE :search0/);
  await publicDiscover({ q: "Photography", type: "packages" });
  const sql = query.mock.calls.at(-1).arguments[0];
  assert.match(sql, /p.PackageName LIKE :search0/);
  assert.match(sql, /c.CategoryName LIKE :search0/);
});

test("the results API accepts the same search length as the homepage form", () => {
  assert.equal(discoveryInput.safeParse({ q: "a".repeat(200) }).success, true);
  assert.equal(discoveryInput.safeParse({ q: "a".repeat(201) }).success, false);
});
