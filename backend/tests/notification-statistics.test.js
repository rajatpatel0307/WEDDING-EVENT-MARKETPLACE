import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { inbox } from "../src/modules/notifications/notification-center.service.js";

const user = {
  id: randomUUID(), active: true, blocked: false, emailVerified: true,
  roles: [{ code: "ADMIN", active: true }],
};
const ctx = { auth: { user } };

test("notification statistics reject unauthenticated access before querying", async t => {
  const query = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(() => inbox({}, {}, "Admin"), /sign in/i);
  assert.equal(query.mock.callCount(), 0);
});

test("notification cards count the user's entire inbox independently of filters and pagination", async t => {
  const rows = Array.from({ length: 21 }, () => ({
    id: randomUUID(), title: "Update", ReferenceType: null,
    ReferenceId: null, isRead: false, category: "general",
  }));
  const query = t.mock.method(sequelize, "query", async sql => sql.includes("COUNT_BIG")
    ? [{ total: "41", unread: "9", read: "32", today: "3" }]
    : rows);
  const result = await inbox({ page: 2, unread: "1", category: "booking", userId: randomUUID() }, ctx, "Admin");
  assert.deepEqual(result.summary, { total: 41, unread: 9, read: 32, today: 3 });
  assert.equal(result.rows.length, 20);
  assert.equal(result.hasMore, true);
  for (const call of query.mock.calls) {
    assert.equal(call.arguments[1].replacements.user, user.id);
    assert.match(call.arguments[0], /WHERE UserId=:user AND DismissedAt IS NULL/);
  }
  const summarySql = query.mock.calls.find(call => call.arguments[0].includes("COUNT_BIG")).arguments[0];
  assert.doesNotMatch(summarySql, /OFFSET|:unread|:category/);
  assert.match(summarySql, /IsRead=0/);
  assert.match(summarySql, /IsRead=1/);
  assert.match(summarySql, /DATEADD\(minute,330,SYSUTCDATETIME\(\)\)/);
  assert.match(summarySql, /CreatedAt>=@todayStart AND CreatedAt<DATEADD\(day,1,@todayStart\)/);
});

test("empty inboxes return real zero totals without notifications", async t => {
  t.mock.method(sequelize, "query", async sql => sql.includes("COUNT_BIG")
    ? [{ total: "0", unread: "0", read: "0", today: "0" }]
    : []);
  const result = await inbox({}, ctx, "Admin");
  assert.deepEqual(result.summary, { total: 0, unread: 0, read: 0, today: 0 });
  assert.deepEqual(result.rows, []);
  assert.equal(result.hasMore, false);
});

test("notification totals remain isolated between accounts", async t => {
  const other = { ...user, id: randomUUID() };
  t.mock.method(sequelize, "query", async (sql, options) => {
    assert.match(sql, /WHERE UserId=:user AND DismissedAt IS NULL/);
    if (!sql.includes("COUNT_BIG")) return [];
    return [options.replacements.user === user.id
      ? { total: 6, unread: 2, read: 4, today: 1 }
      : { total: 1, unread: 1, read: 0, today: 0 }];
  });
  assert.deepEqual((await inbox({}, ctx, "Admin")).summary, { total: 6, unread: 2, read: 4, today: 1 });
  assert.deepEqual((await inbox({}, { auth: { user: other } }, "Admin")).summary, { total: 1, unread: 1, read: 0, today: 0 });
});
