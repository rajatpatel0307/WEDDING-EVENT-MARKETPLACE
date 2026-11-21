import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { createCommunicationRouter } from "../src/modules/messaging/communication.routes.js";
import * as s from "../src/modules/messaging/communication.service.js";
import {
  preferencesInput,
  notificationUrl,
} from "../src/modules/notifications/notification-center.service.js";
import { setRealtimeServer } from "../src/modules/messaging/realtime-bus.js";
const user = {
  id: randomUUID(),
  active: true,
  emailVerified: true,
  roles: [{ code: "CUSTOMER", active: true }],
};
const ctx = { auth: { user } },
  id = randomUUID();
test("communication validation rejects identity overrides, empty messages, invalid cursors and unsupported preferences", () => {
  for (const body of [
    { text: " ", clientMessageId: randomUUID() },
    { text: "a".repeat(5001), clientMessageId: randomUUID() },
    { text: "hello", clientMessageId: randomUUID(), senderId: randomUUID() },
  ])
    assert.throws(() => s.messageInput.parse(body));
  assert.throws(() =>
    s.cursorInput.parse({ before: new Date().toISOString() }),
  );
  assert.throws(() =>
    preferencesInput.parse({
      chatEnabled: true,
      bookingEnabled: true,
      quotationEnabled: true,
      emailEnabled: true,
    }),
  );
});
test("membership binds the JWT user and denies a foreign customer, vendor and admin", async (t) => {
  const calls = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(() => s.membership(id, ctx), /not found/);
  assert.equal(calls.mock.calls[0].arguments[1].replacements.user, user.id);
  assert.match(
    calls.mock.calls[0].arguments[0],
    /c.CustomerId=:user OR v.UserId=:user/,
  );
});

test("admin participant overview rejects other roles and invalid pages before querying", async (t) => {
  const sql = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(() => s.adminConversationOverview({}, { auth: null }), /sign in/);
  await assert.rejects(() => s.adminConversationOverview({}, ctx), /Access denied/);
  await assert.rejects(() => s.adminConversationOverview({}, { auth: { user: { ...user, roles: [{ code: "VENDOR", active: true }] } } }), /Access denied/);
  const admin = { auth: { user: { ...user, roles: [{ code: "ADMIN", active: true }] } } };
  for (const input of [{ page: 0 }, { page: 1.5 }, { page: 10001 }, { q: "a".repeat(101) }]) {
    await assert.rejects(() => s.adminConversationOverview(input, admin));
  }
  assert.equal(sql.mock.callCount(), 0);
});

test("admin participant overview paginates metadata and escapes search wildcards", async (t) => {
  const row = { id, customerId: user.id, vendorId: randomUUID(), customerName: "Test Customer", vendorName: "Test Vendor", eventName: "Wedding", bookingNumber: null, updatedAt: "2026-01-01T00:00:00Z", messageCount: 0 };
  const sql = t.mock.method(sequelize, "query", async statement => statement.startsWith("SELECT COUNT(*) AS total") ? [{ total: 21 }] : [row]);
  const admin = { auth: { user: { ...user, roles: [{ code: "ADMIN", active: true }] } } };
  const result = await s.adminConversationOverview({ page: "2", q: "  50%_[  " }, admin);
  assert.deepEqual(result, { rows: [row], total: 21, page: 2, pageSize: 10, hasMore: true });
  for (const call of sql.mock.calls) {
    const [statement, options] = call.arguments;
    assert.equal(options.replacements.search, "%50[%][_][[]%");
    assert.equal(options.replacements.offset, 10);
    assert.equal(options.replacements.pageSize, 10);
    assert.match(statement, /c\.IsActive=1/);
    assert.doesNotMatch(statement, /MessageText|AttachmentUrl|Email|Phone|ProfilePhotoUrl/);
  }
  assert.match(sql.mock.calls[1].arguments[0], /ORDER BY COALESCE\(c\.LastMessageAt,c\.CreatedAt\) DESC,c\.ConversationId DESC/);
  assert.match(sql.mock.calls[1].arguments[0], /m\.DeletedAt IS NULL/);
  const lastPage = await s.adminConversationOverview({ page: 3 }, admin);
  assert.equal(lastPage.hasMore, false);
});

test("participant overview REST route is admin-only and audited while private chat stays restricted", async (t) => {
  let who = user;
  const app = express();
  app.use(createCommunicationRouter({ authenticateRequest: async () => ({ user: who }) }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const sql = t.mock.method(sequelize, "query", async statement => statement.startsWith("SELECT COUNT(*) AS total") ? [{ total: 0 }] : []);
  const denied = await fetch(`${base}/overview/conversations`, { headers: { "X-Communication-Role": "Customer" } });
  assert.equal(denied.status, 403);
  assert.equal(sql.mock.callCount(), 0);
  who = { ...user, roles: [{ code: "ADMIN", active: true }] };
  const allowed = await fetch(`${base}/overview/conversations`, { headers: { "X-Communication-Role": "Admin" } });
  assert.equal(allowed.status, 200);
  assert.deepEqual((await allowed.json()).data, { rows: [], total: 0, page: 1, pageSize: 10, hasMore: false });
  assert.ok(sql.mock.calls.some(call => call.arguments[0].includes("COMMUNICATION_PARTICIPANTS_VIEWED") && call.arguments[1].replacements.user === user.id));
  for (const path of ["/conversations", `/conversations/${id}`, `/conversations/${id}/messages`]) {
    assert.equal((await fetch(base + path, { headers: { "X-Communication-Role": "Admin" } })).status, 403);
  }
  assert.equal(sql.mock.callCount(), 3);
});
test("database write failure never broadcasts success", async (t) => {
  const emissions = [];
  setRealtimeServer({
    to: () => ({ emit: (...args) => emissions.push(args) }),
  });
  t.after(() => setRealtimeServer(undefined));
  t.mock.method(sequelize, "transaction", async (fn) =>
    fn({
      afterCommit: () => {
        throw Error("Unexpected commit");
      },
    }),
  );
  t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("SELECT c.*"))
      return [
        { ConversationId: id, CustomerId: user.id, VendorUserId: randomUUID() },
      ];
    if (sql.includes("INSERT dbo.Messages"))
      throw Error("Simulated storage failure");
    return [];
  });
  await assert.rejects(
    () =>
      s.sendMessage(
        id,
        { text: "Fixture", clientMessageId: randomUUID() },
        ctx,
      ),
    /Simulated storage failure/,
  );
  assert.equal(emissions.length, 0);
});
test("safe notification routes point to authorized workspace detail pages", () => {
  for (const role of ["Customer", "Vendor", "Admin"]) {
    assert.equal(
      notificationUrl({ ReferenceType: "Booking", ReferenceId: id }, role),
      `/${role.toLowerCase()}/bookings/${id}`,
    );
    assert.equal(
      notificationUrl({ ReferenceType: "Quotation", ReferenceId: id }, role),
      `/${role.toLowerCase()}/notifications`,
    );
  }
  assert.equal(
    notificationUrl(
      { ReferenceType: "Conversation", ReferenceId: id },
      "Customer",
    ),
    `/customer/messages?conversation=${id}`,
  );
  assert.equal(
    notificationUrl(
      { ReferenceType: "Conversation", ReferenceId: id },
      "Admin",
    ),
    "/admin/notifications",
  );
});
test("communication REST rejects anonymous users, wrong roles, foreign origins and admin chat", async (t) => {
  let who = null;
  const app = express();
  app.use(
    createCommunicationRouter({
      authenticateRequest: async () => ({ user: who }),
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const sql = t.mock.method(sequelize, "query", async () => []);
  assert.equal(
    (
      await fetch(base + "/conversations", {
        headers: { "X-Communication-Role": "Customer" },
      })
    ).status,
    401,
  );
  who = user;
  assert.equal(
    (
      await fetch(base + "/conversations", {
        headers: { "X-Communication-Role": "Vendor" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/conversations", {
        method: "POST",
        headers: {
          "X-Communication-Role": "Customer",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  who = { ...user, roles: [{ code: "ADMIN", active: true }] };
  assert.equal(
    (
      await fetch(base + "/conversations", {
        headers: { "X-Communication-Role": "Admin" },
      })
    ).status,
    403,
  );
  assert.equal(sql.mock.callCount(), 0);
});
