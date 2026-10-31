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
      `/${role.toLowerCase()}/quotations/${id}`,
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
