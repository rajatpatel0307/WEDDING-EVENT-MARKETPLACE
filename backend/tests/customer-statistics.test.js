import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { list } from "../src/modules/admin/admin.repository.js";
import { listQuery } from "../src/modules/admin/admin.validation.js";

test("customer cards use global counts scoped to customer roles and give blocked status precedence", async (t) => {
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("AS blocked FROM dbo.Users")) return [{ total: "12", active: 7, inactive: 2, blocked: 3 }];
    return sql.includes("COUNT_BIG") ? [{ total: 1 }] : [];
  });
  const result = await list("customers", listQuery.parse({ q: "search", status: "Blocked", pageSize: 10, page: 2 }));
  assert.deepEqual(result.summary, { total: 12, active: 7, inactive: 2, blocked: 3 });
  assert.equal(result.total, 1);
  const summary = query.mock.calls.find((call) => call.arguments[0].includes("AS blocked FROM dbo.Users")).arguments[0];
  assert.match(summary, /r.RoleCode='CUSTOMER'/);
  assert.match(summary, /t.IsActive=1 AND t.IsBlocked=0/);
  assert.match(summary, /t.IsActive=0 AND t.IsBlocked=0/);
  assert.doesNotMatch(summary, /OFFSET|:q|:status/);
});

test("customer cards report zero counts for an empty customer catalogue", async (t) => {
  t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("AS blocked FROM dbo.Users")) return [{ total: 0, active: 0, inactive: 0, blocked: 0 }];
    return sql.includes("COUNT_BIG") ? [{ total: 0 }] : [];
  });
  assert.deepEqual((await list("customers", listQuery.parse({}))).summary, { total: 0, active: 0, inactive: 0, blocked: 0 });
});
