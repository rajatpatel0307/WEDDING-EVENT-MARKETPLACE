import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sqlUtils from "sequelize/lib/utils/sql";
import { sequelize } from "../src/config/database.js";
import { inbox } from "../src/modules/admin/operations.service.js";

const user = {
  id: randomUUID(), active: true, emailVerified: true,
  roles: [{ code: "ADMIN", active: true }],
};
const ctx = { auth: { user } };

test("unread inbox filters before pagination and scopes every query to its administrator", async t => {
  const query = t.mock.method(sequelize, "query", async sql => {
    if (sql.includes("AS unread")) return [{ unread: 8 }];
    if (sql.includes("AS total")) return [{ total: 8 }];
    return [{ id: randomUUID(), read: false }];
  });
  const result = await inbox(ctx, { unread: "1", pageSize: "5", page: "2", userId: randomUUID() });
  assert.equal(result.unread, 8);
  assert.equal(result.total, 8);
  assert.equal(result.rows[0].read, false);
  for (const call of query.mock.calls) {
    const [sql, options] = call.arguments;
    assert.equal(options.replacements.user, user.id);
    assert.match(sql, /WHERE UserId=:user AND .*DismissedAt IS NULL/);
    if (!sql.includes("AS unread")) {
      assert.equal(options.replacements.unread, 1);
      assert.match(sql, /AND \(:unread = 0 OR IsRead=0\)/);
    }
    const prepared = sqlUtils.injectReplacements(sql, sequelize.dialect, options.replacements);
    assert.doesNotMatch(prepared, /:(user|unread|offset|size)\b/, "Every SQL parameter must be substituted before the database receives the query");
  }
  const [sql, options] = query.mock.calls[2].arguments;
  assert.ok(sql.indexOf("(:unread = 0 OR IsRead=0)") < sql.indexOf("OFFSET"));
  assert.equal(options.replacements.offset, 5);
  assert.equal(options.replacements.size, 5);
});

test("default inbox keeps both read and unread notifications available", async t => {
  const rows = [{ id: randomUUID(), read: true }, { id: randomUUID(), read: false }];
  const query = t.mock.method(sequelize, "query", async sql => {
    if (sql.includes("AS unread")) return [{ unread: 1 }];
    if (sql.includes("AS total")) return [{ total: 2 }];
    return rows;
  });
  const result = await inbox(ctx);
  assert.deepEqual(result.rows, rows);
  assert.equal(result.total, 2);
  assert.equal(query.mock.calls[2].arguments[1].replacements.unread, 0);
});

test("unread inbox can be empty while read notification history remains", async t => {
  t.mock.method(sequelize, "query", async sql => {
    if (sql.includes("AS unread")) return [{ unread: 0 }];
    if (sql.includes("AS total")) return [{ total: 0 }];
    return [];
  });
  assert.deepEqual((await inbox(ctx, { unread: "1" })).rows, []);
});

test("unread inbox rejects invalid filters and unauthorized users before querying", async t => {
  const query = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(() => inbox(ctx, { unread: "yes" }));
  await assert.rejects(() => inbox({}, { unread: "1" }), /sign in/i);
  await assert.rejects(() => inbox({ auth: { user: { ...user, roles: [{ code: "CUSTOMER", active: true }] } } }, { unread: "1" }), /access denied/i);
  assert.equal(query.mock.callCount(), 0);
});
