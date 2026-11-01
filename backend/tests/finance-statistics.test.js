import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { financeStatistics } from "../src/modules/admin/finance-statistics.service.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
const auth = { user: { id: "734b9588-c47c-40eb-8c17-1797d65a2800", active: true, emailVerified: true, roles: [{ code: "ADMIN", active: true }] } };
const sections = ["refund-review", "reconciliation", "refunds", "payouts", "commission"];

test("finance cards enforce admin access and reject arbitrary sections before querying", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  for (const section of sections) await assert.rejects(() => financeStatistics(section, { auth: null }));
  for (const section of ["constructor", "__proto__", "Users;DROP TABLE Users"]) await assert.rejects(() => financeStatistics(section, { auth }), { status: 404 });
  assert.equal(query.mock.callCount(), 0);
});

test("finance cards use whole-table aggregates and normalize database values", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => [{ total: "20", amount: "150.50" }]);
  for (const section of sections) {
    assert.deepEqual(await financeStatistics(section, { auth }), { total: 20, amount: 150.5 });
  }
  const statements = query.mock.calls.map((call) => call.arguments[0]);
  for (const sql of statements) assert.doesNotMatch(sql, /OFFSET|TOP\(50\)|:status|:q/);
  assert.match(statements[0], /Status='Requested'/);
  assert.match(statements[1], /p.Currency='INR'/);
  assert.match(statements[1], /b.PaidAmount<>COALESCE/);
  assert.match(statements[2], /RefundStatus='Completed'/);
  assert.match(statements[3], /PayoutStatus='OnHold'/);
  assert.match(statements[4], /SUM\(CommissionAmount\)/);
  assert.match(statements[4], /AVG\(CAST\(CommissionRate/);
});

test("all finance card endpoints resolve through the admin router", async (t) => {
  t.mock.method(sequelize, "query", async () => [{ total: 0 }]);
  const app = express();
  app.use("/api/admin", createAdminRouter({ authenticateRequest: async () => auth }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  for (const section of sections) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/finance-statistics/${section}`);
    assert.equal(response.status, 200, section);
    assert.deepEqual(await response.json(), { total: 0 });
  }
});
