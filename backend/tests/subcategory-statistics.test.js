import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { list } from "../src/modules/admin/admin.repository.js";
import { listQuery } from "../src/modules/admin/admin.validation.js";

test("subcategory cards return catalogue totals independently of filtered rows and pagination", async (t) => {
  const summary = { total: "27", active: "20", inactive: "7", services: "43" };
  const queries = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("FROM dbo.SubCategories sc")) return [summary];
    return sql.includes("COUNT_BIG") ? [{ total: 1 }] : [{ id: 5, name: "Filtered subcategory" }];
  });
  const query = listQuery.parse({
    q: "venue", category: 2, status: "Active", from: "2026-01-01",
    to: "2026-11-11", page: 2, pageSize: 10,
  });
  const result = await list("sub-categories", query);
  assert.deepEqual(result.summary, { total: 27, active: 20, inactive: 7, services: 43 });
  assert.equal(result.total, 1);
  assert.equal(result.rows.length, 1);
  assert.equal(result.page, 2);
  assert.equal(result.columns.includes("services"), false);

  const summarySql = queries.mock.calls.find(call => call.arguments[0].includes("FROM dbo.SubCategories sc")).arguments[0];
  assert.doesNotMatch(summarySql, /OFFSET|:q|:status|:category|:from|:to/);
  assert.match(summarySql, /CASE WHEN sc.IsActive=1/);
  assert.match(summarySql, /CASE WHEN sc.IsActive=0/);
  assert.match(summarySql, /JOIN dbo.SubCategories linked ON linked.SubCategoryId=s.SubCategoryId/);
  const tableQuery = queries.mock.calls.find(call => call.arguments[0].includes("OFFSET"));
  assert.equal(tableQuery.arguments[1].replacements.offset, 10);
  assert.equal(tableQuery.arguments[1].replacements.category, 2);
});

test("subcategory cards return numeric zero totals for an empty catalogue", async (t) => {
  t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("FROM dbo.SubCategories sc")) return [{ total: "0", active: "0", inactive: "0", services: "0" }];
    return sql.includes("COUNT_BIG") ? [{ total: 0 }] : [];
  });
  const result = await list("sub-categories", listQuery.parse({}));
  assert.deepEqual(result.summary, { total: 0, active: 0, inactive: 0, services: 0 });
  assert.deepEqual(result.rows, []);
});
