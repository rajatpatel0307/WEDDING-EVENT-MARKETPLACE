import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { Limit } from '../src/models/index.js';
import { communicationCounts } from "../src/modules/notifications/communications.service.js";
import { navbarCounts, layoutUserResolvers } from "../src/graphql/layout.resolvers.js";
import * as vendorChat from "../src/modules/vendors/workspace.messaging.js";
import * as customerChat from "../src/modules/customers/workspace.messaging.js";
import * as vendorWorkspace from "../src/modules/vendors/workspace.service.js";
import * as customerWorkspace from "../src/modules/customers/workspace.service.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import { createCustomerRouter } from "../src/modules/customers/workspace.routes.js";

const vendorId = "734b9588-c47c-40eb-8c17-1797d65a2800";
const ownerId = "734b9588-c47c-40eb-8c17-1797d65a2801";
const customerId = "734b9588-c47c-40eb-8c17-1797d65a2802";
const conversationId = "734b9588-c47c-40eb-8c17-1797d65a2803";
const messageId = "734b9588-c47c-40eb-8c17-1797d65a2804";
const userFor = role => ({
  id: role === "VENDOR" ? ownerId : customerId,
  active: true, emailVerified: true,
  roles: [{ code: role, active: true }],
  ...(role === "VENDOR" ? { vendor: { id: vendorId, active: true, verificationStatus: "Approved" } } : {}),
});
const contextFor = role => ({ auth: { user: userFor(role) }, req: { ip: "127.0.0.1" } });

test("sidebar counts group unread senders across active conversations and exclude chat notifications", async t => {
  const counts = { wishlistCount: 3, unreadNotificationCount: 4, unreadMessageCount: 2 };
  const query = t.mock.method(sequelize, "query", async () => [counts]);
  const ctx = contextFor("VENDOR");
  const [rest, graphql, badge] = await Promise.all([
    communicationCounts(ctx), navbarCounts(ctx.auth.user, ctx),
    layoutUserResolvers.unreadMessageCount(ctx.auth.user, {}, ctx),
  ]);
  assert.deepEqual(rest, counts);
  assert.deepEqual(graphql, counts);
  assert.equal(badge, 2);
  assert.equal(query.mock.callCount(), 1);
  const [sql, options] = query.mock.calls[0].arguments;
  assert.match(sql, /COUNT\(DISTINCT m\.SenderUserId\)/);
  assert.match(sql, /c\.IsActive=1 AND m\.IsRead=0 AND m\.SenderUserId<>:userId/);
  assert.match(sql, /c\.CustomerId=:userId OR v\.UserId=:userId/);
  assert.match(sql, /ReferenceType IS NULL OR ReferenceType<>'Conversation'/);
  assert.deepEqual(options.replacements, { userId: ownerId });
});

test("communication counts reject anonymous and foreign identities before database access", async t => {
  const query = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(() => communicationCounts({ auth: null }), /Please sign in/);
  const ctx = contextFor("CUSTOMER");
  await assert.rejects(() => navbarCounts({ id: ownerId }, ctx), /Access denied/);
  assert.equal(query.mock.callCount(), 0);
});

for (const role of ["VENDOR", "CUSTOMER"]) {
  test(`${role} chat persists a message and notification in the same transaction`, async t => {
    const tx={id:'fixture-event',afterCommit:()=>{}};
    t.mock.method(sequelize, "transaction", async (...args) => args.at(-1)(tx));
    t.mock.method(Limit,'findByPk',async()=>({count:0,expiresAt:new Date(Date.now()+60000),save:async()=>{}}));
    const query = t.mock.method(sequelize, "query", async sql => {
      if (sql.includes("SELECT c.*")) return [{
        ConversationId: conversationId, CustomerId: customerId, VendorId: vendorId, VendorUserId:ownerId, IsActive: true,
      }];
      return [];
    });
    const chat = role === "VENDOR" ? vendorChat : customerChat;
    const result = await chat.sendMessage(conversationId, { text: "Hello" }, contextFor(role));
    assert.match(result.id,/^[a-f\d-]{36}$/i);
    const statements = query.mock.calls.map(call => call.arguments[0]);
    assert.ok(statements.some(sql => sql.startsWith("INSERT dbo.Messages")));
    assert.ok(statements.some(sql => sql.startsWith("UPDATE dbo.Conversations SET LastMessageAt")));
    assert.ok(statements.some(sql => /INSERT INTO dbo\.\[?Notifications/.test(sql)));
    for(const call of query.mock.calls)assert.equal(call.arguments[1].transaction,tx);
  });

  test(`${role} notification lists hide existing chat alerts in both rows and totals`, async t => {
    const query = t.mock.method(sequelize, "query", async sql => sql.includes("AS total") ? [{ total: 0 }] : []);
    const workspace = role === "VENDOR" ? vendorWorkspace : customerWorkspace;
    await workspace.records("notifications", {}, contextFor(role));
    assert.equal(query.mock.callCount(), 2);
    for (const call of query.mock.calls) {
      const [sql, options] = call.arguments;
      assert.match(sql, /t\.ReferenceType IS NULL OR t\.ReferenceType<>'Conversation'/);
      assert.equal(role === "VENDOR" ? options.replacements.ownerId : options.replacements.id, userFor(role).id);
    }
  });

  test(`${role} live counter endpoint is authenticated and never cached`, async t => {
    let user = null;
    const router = role === "VENDOR" ? createVendorRouter : createCustomerRouter;
    const app = express();
    app.use(router({ authenticateRequest: async () => ({ user }) }));
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const query = t.mock.method(sequelize, "query", async () => [{ wishlistCount: 0, unreadMessageCount: 2, unreadNotificationCount: 1 }]);
    const url = `http://127.0.0.1:${server.address().port}/communications/counts`;
    assert.equal((await fetch(url)).status, 401);
    user = userFor(role === "VENDOR" ? "CUSTOMER" : "VENDOR");
    assert.equal((await fetch(url)).status, 403);
    assert.equal(query.mock.callCount(), 0);
    user = userFor(role);
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).data.unreadMessageCount, 2);
    assert.deepEqual(query.mock.calls[0].arguments[1].replacements, { userId: user.id });
  });
}
