import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { list } from "../src/modules/admin/admin.repository.js";
import { listQuery } from "../src/modules/admin/admin.validation.js";

test("vendor cards count every verification status independently of table filters", async (t) => {
  const expected = { total: 20, pending: 5, underReview: 3, approved: 9, rejected: 2, suspended: 1 };
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("AS suspended FROM dbo.Vendors")) return [Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, String(value)]))];
    return sql.includes("COUNT_BIG") ? [{ total: 2 }] : [];
  });
  const result = await list("vendors", listQuery.parse({ q: "search", status: "Rejected", pageSize: 10, page: 2 }));
  assert.deepEqual(result.summary, expected);
  assert.equal(result.total, 2);
  const sql = query.mock.calls.find((call) => call.arguments[0].includes("AS suspended FROM dbo.Vendors")).arguments[0];
  for (const status of ["Pending", "UnderReview", "Approved", "Rejected", "Suspended"]) assert.ok(sql.includes(`VerificationStatus='${status}'`));
  assert.match(sql, /JOIN dbo.Users u ON u.UserId=t.UserId/);
  assert.doesNotMatch(sql, /OFFSET|:q|:status/);
});

test("vendor cards show zero counts when there are no vendors", async (t) => {
  const summary = { total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0, suspended: 0 };
  t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("AS suspended FROM dbo.Vendors")) return [summary];
    return sql.includes("COUNT_BIG") ? [{ total: 0 }] : [];
  });
  assert.deepEqual((await list("vendors", listQuery.parse({}))).summary, summary);
});
