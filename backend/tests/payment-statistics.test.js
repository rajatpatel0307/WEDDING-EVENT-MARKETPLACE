import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { list } from "../src/modules/admin/admin.repository.js";
import { listQuery } from "../src/modules/admin/admin.validation.js";

test("payment cards count all statuses independently of table filters and pagination", async (t) => {
  const summary = { total: 20, pending: 4, processing: 2, success: 10, failed: 3, refunded: 1 };
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("AS refunded FROM dbo.Payments")) return [Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, String(value)]))];
    if (sql.startsWith("SELECT DISTINCT GatewayName")) return [];
    return sql.includes("COUNT_BIG") ? [{ total: 1 }] : [];
  });
  const result = await list("payments", listQuery.parse({ q: "search", status: "Pending", page: 2, pageSize: 10 }));
  assert.deepEqual(result.summary, summary);
  assert.equal(result.total, 1);
  const sql = query.mock.calls.find((call) => call.arguments[0].includes("AS refunded FROM dbo.Payments")).arguments[0];
  for (const status of ["Pending", "Processing", "Success", "Failed", "Refunded"]) assert.ok(sql.includes(`PaymentStatus='${status}'`));
  assert.match(sql, /JOIN dbo.Booking b ON b.BookingId=t.BookingId/);
  assert.doesNotMatch(sql, /OFFSET|:q|:status/);
});

test("payment cards return zero when no payments exist", async (t) => {
  const summary = { total: 0, pending: 0, processing: 0, success: 0, failed: 0, refunded: 0 };
  t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("AS refunded FROM dbo.Payments")) return [summary];
    return sql.includes("COUNT_BIG") ? [{ total: 0 }] : [];
  });
  assert.deepEqual((await list("payments", listQuery.parse({}))).summary, summary);
});
