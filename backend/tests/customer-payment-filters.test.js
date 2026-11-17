import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { records } from "../src/modules/customers/workspace.service.js";

const customerId = "1D375B0C-89D2-F111-8F30-14133304FA5C";
const ctx = { auth: { user: {
  id: customerId, active: true, emailVerified: true,
  roles: [{ code: "CUSTOMER", active: true }],
} } };

test("payment search and filters scope both counts and paginated rows to the customer", async (t) => {
  const search = "pay%_[x]' OR 1=1--";
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("COUNT(*)") ? [{ total: 25 }] : [{ id: "payment-1" }],
  );
  const result = await records("payments", {
    q: ` ${search} `, status: "Success", method: "wallet",
    from: "2026-10-31", to: "2026-11-12", page: 2, pageSize: 12,
  }, ctx);
  assert.equal(result.total, 25);
  assert.deepEqual(result.rows, [{ id: "payment-1" }]);
  assert.equal(query.mock.callCount(), 2);
  for (const { arguments: [sql, { replacements }] } of query.mock.calls) {
    assert.match(sql, /b\.CustomerId=:id/);
    for (const field of ["t.PaymentReference", "b.BookingNumber", "t.GatewayName"])
      assert.ok(sql.includes(`${field} LIKE :search`));
    assert.match(sql, /t\.PaymentStatus=:paymentStatus/);
    assert.match(sql, /LOWER\(t\.PaymentMethod\)=:paymentMethod/);
    assert.equal(replacements.id, customerId);
    assert.equal(replacements.paymentStatus, "Success");
    assert.equal(replacements.paymentMethod, "wallet");
    assert.equal(replacements.offset, 12);
    assert.equal(replacements.size, 12);
    assert.equal(replacements.paymentFrom, "2026-10-31");
    assert.equal(replacements.paymentTo, "2026-11-12");
    assert.equal(replacements.search, `%${search.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`);
    assert.ok(!sql.includes(search), "search text must remain a bound value");
    assert.match(sql, /COALESCE\(t\.PaidAt,t\.CreatedAt\)>=DATEADD\(minute,-330,CAST\(:paymentFrom AS datetime2\)\)/);
    assert.match(sql, /COALESCE\(t\.PaidAt,t\.CreatedAt\)<DATEADD\(day,1,DATEADD\(minute,-330,CAST\(:paymentTo AS datetime2\)\)\)/);
  }
  assert.match(query.mock.calls[1].arguments[0], /OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY/);
});

test("payment filters reject invalid values and reversed dates before querying", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  for (const input of [
    { status: "Success'; DROP TABLE Payments--" },
    { status: "Confirmed" },
    { method: "wallet OR 1=1" },
    { from: "2026-02-30" },
    { to: "invalid" },
    { from: "2026-11-12", to: "2026-10-31" },
    { page: 0 }, { pageSize: 51 }, { q: "x".repeat(151) },
  ]) await assert.rejects(() => records("payments", input, ctx));
  assert.equal(query.mock.callCount(), 0);
});

test("clearing payment filters restores the full scoped history and each supported status is accepted", async (t) => {
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("COUNT(*)") ? [{ total: 0 }] : [],
  );
  await records("payments", { q: "", status: "", method: "", from: "", to: "" }, ctx);
  for (const { arguments: [sql] } of query.mock.calls) {
    assert.match(sql, /WHERE b\.CustomerId=:id/);
    assert.doesNotMatch(sql, /LIKE :search|:paymentStatus|:paymentMethod|:paymentFrom|:paymentTo/);
  }
  for (const status of ["Pending", "Processing", "Success", "Failed", "Refunded"])
    await records("payments", { status }, ctx);
  // Existing booking filters keep their own status validation.
  await records("bookings", { status: "Confirmed" }, ctx);
  await assert.rejects(() => records("bookings", { status: "Success" }, ctx));
});

test("non-customers cannot search payment records", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  const vendorCtx = { auth: { user: { ...ctx.auth.user, roles: [{ code: "VENDOR", active: true }] } } };
  await assert.rejects(() => records("payments", { q: "pay_" }, vendorCtx));
  assert.equal(query.mock.callCount(), 0);
});
