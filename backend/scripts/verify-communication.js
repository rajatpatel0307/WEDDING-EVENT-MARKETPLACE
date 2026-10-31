// Real MSSQL/REST/Socket.IO checks. All fixtures, sessions and limiter writes roll back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { sequelize } from "../src/config/database.js";
import { sign } from "../src/config/jwt.js";
import { Session } from "../src/models/index.js";
import { cookieNames } from "../src/modules/auth/token.service.js";
import { attachCommunicationServer } from "../src/modules/messaging/socket-server.js";
import { createCommunicationRouter } from "../src/modules/messaging/communication.routes.js";
import { setRealtimeServer } from "../src/modules/messaging/realtime-bus.js";
import * as s from "../src/modules/messaging/communication.service.js";
import * as n from "../src/modules/notifications/notification-center.service.js";
const require = createRequire(
    new URL("../../frontend/package.json", import.meta.url),
  ),
  { io: client } = require("socket.io-client");
const rollback = Error("ROLLBACK_COMMUNICATION_FIXTURES");
let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
}
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction;
    const callbacks = [];
    const after = tx.afterCommit.bind(tx);
    tx.afterCommit = (fn) => callbacks.push(fn);
    sequelize.query = function (sql, options = {}) {
      return originalQuery.call(this, sql, { ...options, transaction: tx });
    };
    sequelize.transaction = async (...args) => args.at(-1)(tx);
    let server, io;
    const sockets = [];
    try {
      const ids = Object.fromEntries(
        [
          "customer",
          "owner",
          "stranger",
          "otherOwner",
          "vendor",
          "otherVendor",
          "service",
          "package",
          "event",
          "booking",
        ].map((k) => [k, randomUUID()]),
      );
      for (const key of ["customer", "owner", "stranger", "otherOwner"]) {
        await n.query(
          "INSERT dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Communication fixture',:email,'not-a-login-password',1)",
          { id: ids[key], email: `comm-${ids[key]}@example.invalid` },
        );
        await n.query(
          "INSERT dbo.UserRoles(UserId,RoleId) SELECT :id,RoleId FROM dbo.Roles WHERE RoleCode=:role",
          {
            id: ids[key],
            role: ["owner", "otherOwner"].includes(key) ? "VENDOR" : "CUSTOMER",
          },
        );
      }
      for (const [vendor, owner] of [
        ["vendor", "owner"],
        ["otherVendor", "otherOwner"],
      ])
        await n.query(
          "INSERT dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:vendor,:owner,'Communication fixture',:slug,'Approved',1)",
          {
            vendor: ids[vendor],
            owner: ids[owner],
            slug: `comm-${ids[vendor]}`,
          },
        );
      const ctx = (key, role = "CUSTOMER") => ({
        auth: {
          user: {
            id: ids[key],
            active: true,
            emailVerified: true,
            roles: [{ code: role, active: true }],
            ...(role === "VENDOR"
              ? {
                  vendor: {
                    id: ids[key === "owner" ? "vendor" : "otherVendor"],
                    active: true,
                    verificationStatus: "Approved",
                  },
                }
              : {}),
          },
        },
      });
      const customer = ctx("customer"),
        vendor = ctx("owner", "VENDOR"),
        foreign = ctx("stranger");
      const [[category]] = await sequelize.query(
        "SELECT TOP(1) CategoryId FROM dbo.Categories WHERE IsActive=1",
      );
      await n.query(
        "INSERT dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,PricingType,BasePrice,ApprovalStatus,IsActive) VALUES(:service,:vendor,:category,'Chat service',:slug,'Fixed',1000,'Approved',1)",
        {
          service: ids.service,
          vendor: ids.vendor,
          category: category.CategoryId,
          slug: `comm-${ids.service}`,
        },
      );
      await n.query(
        "INSERT dbo.ServicePackages(PackageId,ServiceId,PackageName,Price) VALUES(:package,:service,'Chat package',1000)",
        { package: ids.package, service: ids.service },
      );
      const c = await s.startConversation(
        { vendorId: ids.vendor, packageId: ids.package },
        customer,
        "Customer",
      );
      check(c.id, "Customer starts conversation with package context");
      const same = await s.startConversation(
        { vendorId: ids.vendor, packageId: ids.package },
        customer,
        "Customer",
      );
      check(c.id === same.id, "Duplicate context prevented");
      await assert.rejects(() => s.membership(c.id, foreign), /not found/);
      checks++;
      await assert.rejects(
        () => s.membership(c.id, ctx("otherOwner", "VENDOR")),
        /not found/,
      );
      checks++;
      await assert.rejects(
        () =>
          s.startConversation(
            { vendorId: ids.otherVendor, serviceId: ids.service },
            customer,
            "Customer",
          ),
        /not found/,
      );
      checks++;
      const key = randomUUID(),
        m = await s.sendMessage(
          c.id,
          { text: "Hello fixture", clientMessageId: key },
          customer,
        );
      const replay = await s.sendMessage(
        c.id,
        { text: "Hello fixture", clientMessageId: key },
        customer,
      );
      check(m.id === replay.id, "Safe retry returns original message");
      await assert.rejects(
        () =>
          s.sendMessage(
            c.id,
            { text: "Different content", clientMessageId: key },
            customer,
          ),
        /Retry key/,
      );
      checks++;
      const reply = await s.sendMessage(
        c.id,
        { text: "Vendor reply", clientMessageId: randomUUID() },
        vendor,
      );
      check(reply.id, "Vendor replies");
      let history = await s.chat(c.id, {}, customer);
      check(
        history.messages.length === 2,
        "History contains exactly two messages",
      );
      check(
        history.messages.find((r) => r.id === m.id).status === "Sent",
        "Initially sent",
      );
      await s.receipt(c.id, vendor);
      history = await s.chat(c.id, {}, customer);
      check(
        history.messages.find((r) => r.id === m.id).status === "Delivered",
        "Delivery receipt persisted",
      );
      await s.receipt(c.id, vendor, true);
      history = await s.chat(c.id, {}, customer);
      check(
        history.messages.find((r) => r.id === m.id).status === "Read",
        "Read receipt persisted",
      );
      await s.participantState(
        c.id,
        { isArchived: true, isMuted: true },
        customer,
      );
      check(
        (await s.conversations({}, customer)).rows.length === 0,
        "Archive hides only this participant",
      );
      check(
        (await s.conversations({}, vendor)).rows.length === 1,
        "Other participant retains conversation",
      );
      check(
        (await s.conversations({ archived: "1" }, customer)).rows.length === 1,
        "Archived view supports restore",
      );
      await s.participantState(c.id, { isArchived: false }, customer);
      await n.preferences(customer, {
        chatEnabled: false,
        bookingEnabled: false,
        quotationEnabled: false,
      });
      const [before] = await n.query(
        "SELECT COUNT(*) AS count FROM dbo.Notifications WHERE UserId=:user",
        { user: ids.customer },
      );
      await s.sendMessage(
        c.id,
        { text: "Muted update", clientMessageId: randomUUID() },
        vendor,
      );
      await n.createNotification({
        userId: ids.customer,
        title: "Reminder",
        message: "Optional",
        referenceType: "Booking",
        referenceId: ids.booking,
        eventKey: "fixture-optional",
        essential: false,
      });
      const [muted] = await n.query(
        "SELECT COUNT(*) AS count FROM dbo.Notifications WHERE UserId=:user",
        { user: ids.customer },
      );
      check(
        muted.count === before.count,
        "Mute and optional preferences respected",
      );
      const eventKey = `fixture-essential-${randomUUID()}`,
        notice = {
          userId: ids.customer,
          title: "Booking confirmed",
          message: "Essential status",
          referenceType: "Booking",
          referenceId: ids.booking,
          eventKey,
        };
      await n.createNotification(notice);
      await n.createNotification(notice);
      let inbox = await n.inbox({}, customer, "Customer");
      check(
        inbox.rows.some((r) => r.title === "Booking confirmed"),
        "Essential status ignores optional preferences",
      );
      const [dedup] = await n.query(
        "SELECT COUNT(*) AS count FROM dbo.Notifications WHERE UserId=:user AND Title='Booking confirmed'",
        { user: ids.customer },
      );
      check(dedup.count === 1, "Duplicate events create one notification");
      const nid = inbox.rows[0].id;
      await n.updateNotification(nid, "read", customer);
      check(
        (await n.inbox({ unread: "1" }, customer, "Customer")).rows.every(
          (r) => r.id !== nid,
        ),
        "Mark read works",
      );
      await assert.rejects(
        () => n.updateNotification(nid, "read", foreign),
        /not found/,
      );
      checks++;
      await n.updateNotification(nid, "dismiss", customer);
      check(
        !(await n.inbox({}, customer, "Customer")).rows.some(
          (r) => r.id === nid,
        ),
        "Dismiss retains history but hides inbox record",
      );
      await s.deleteMessage(reply.id, vendor);
      history = await s.chat(c.id, {}, customer);
      check(
        history.messages.find((r) => r.id === reply.id).deletedAt,
        "Sender deletion leaves tombstone",
      );
      await assert.rejects(
        () => s.attachmentFile(c.id, m.id, foreign),
        /not found/,
      );
      checks++;
      await assert.rejects(
        () =>
          s.attachmentUpload(
            c.id,
            {
              name: "bad.exe",
              base64: Buffer.from("executable").toString("base64"),
            },
            customer,
          ),
        /PDF|PNG|JPEG/,
      );
      checks++;
      for (let i = 0; i < 52; i++)
        await s.sendMessage(
          c.id,
          { text: `Page fixture ${i}`, clientMessageId: randomUUID() },
          customer,
        );
      await n.query(
        "DECLARE @time datetime2(3)=DATEADD(second,-60,SYSUTCDATETIME()); UPDATE dbo.Messages SET CreatedAt=@time WHERE ConversationId=:id AND MessageText LIKE 'Page fixture %'",
        { id: c.id },
      );
      const latest = await s.chat(c.id, {}, customer);
      check(
        latest.hasMore && latest.messages.length === 50,
        "History is bounded",
      );
      const older = await s.chat(c.id, latest.nextCursor, customer);
      check(older.messages.length === 5, "Cursor returns remaining history");
      check(
        !older.messages.some((m) => latest.messages.some((x) => x.id === m.id)),
        "Cursor pages do not overlap",
      );
      // Exercise private storage integration without transmitting fixtures to an external service.
      const originalFetch = globalThis.fetch;
      const cloudKeys = [
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
      ];
      const cloudEnv = Object.fromEntries(
        cloudKeys.map((k) => [k, process.env[k]]),
      );
      try {
        cloudKeys.forEach((k) => (process.env[k] = "communication-fixture"));
        const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
        globalThis.fetch = async (url, options) =>
          url.includes("/upload")
            ? new Response(
                JSON.stringify({
                  public_id: options.body.get("public_id"),
                  secure_url: "https://res.cloudinary.com/fixture",
                }),
                { status: 200 },
              )
            : new Response(png, { status: 200 });
        const asset = await s.attachmentUpload(
          c.id,
          { name: "fixture.png", base64: png.toString("base64") },
          customer,
        );
        const fileMessage = await s.sendMessage(
          c.id,
          { attachmentToken: asset.token, clientMessageId: randomUUID() },
          customer,
        );
        const file = await s.attachmentFile(c.id, fileMessage.id, vendor);
        check(
          file.mimeType === "image/png" && file.bytes.equals(png),
          "Authenticated attachment upload and download integration",
        );
        await assert.rejects(
          () => s.attachmentFile(c.id, fileMessage.id, foreign),
          /not found/,
        );
        checks++;
        const other = await s.startConversation(
          { vendorId: ids.otherVendor },
          customer,
          "Customer",
        );
        await assert.rejects(
          () =>
            s.sendMessage(
              other.id,
              { attachmentToken: asset.token, clientMessageId: randomUUID() },
              customer,
            ),
          /does not belong/,
        );
        checks++;
        await s.deleteMessage(fileMessage.id, customer);
        await assert.rejects(
          () => s.attachmentFile(c.id, fileMessage.id, vendor),
          /not found/,
        );
        checks++;
      } finally {
        globalThis.fetch = originalFetch;
        for (const k of cloudKeys) {
          if (cloudEnv[k] === undefined) delete process.env[k];
          else process.env[k] = cloudEnv[k];
        }
      }
      // REST shares the exact same auth and ownership service.
      const app = express();
      let restUser = customer.auth.user;
      app.use(
        "/api/communication",
        createCommunicationRouter({
          authenticateRequest: async () => ({ user: restUser }),
        }),
      );
      server = createServer(app);
      io = attachCommunicationServer(server);
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const base = `http://127.0.0.1:${server.address().port}`;
      const result = await fetch(
        `${base}/api/communication/conversations/${c.id}/messages`,
        { headers: { "X-Communication-Role": "Customer" } },
      );
      check(result.status === 200, "REST history works against MSSQL");
      restUser = foreign.auth.user;
      check(
        (
          await fetch(
            `${base}/api/communication/conversations/${c.id}/messages`,
            { headers: { "X-Communication-Role": "Customer" } },
          )
        ).status === 404,
        "REST foreign customer rejected",
      );
      const origin = process.env.FRONTEND_URL || "http://localhost:5173";
      const anonymous = client(base, {
        transports: ["websocket"],
        extraHeaders: { Origin: origin },
        reconnection: false,
        timeout: 5000,
      });
      sockets.push(anonymous);
      await new Promise((resolve, reject) => {
        anonymous.once("connect_error", resolve);
        anonymous.once("connect", () =>
          reject(Error("Anonymous socket connected")),
        );
      });
      check(!anonymous.connected, "Anonymous socket connection denied");
      async function connect(key) {
        const sid = randomUUID();
        await Session.create({
          id: sid,
          userId: ids[key],
          digest: "fixture",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 60000),
        });
        const sock = client(base, {
          transports: ["websocket"],
          extraHeaders: {
            Origin: origin,
            Cookie: `${cookieNames.access}=${sign({ sub: ids[key].toUpperCase(), sid, purpose: "access" }, "10m")}`,
          },
          reconnection: false,
        });
        sockets.push(sock);
        await new Promise((resolve, reject) => {
          sock.once("connect", resolve);
          sock.once("connect_error", reject);
        });
        return sock;
      }
      const a = await connect("customer"),
        b = await connect("owner"),
        outsider = await connect("stranger");
      const emit = (sock, event, payload) =>
        sock.timeout(5000).emitWithAck(event, payload);
      check(
        !(
          await emit(outsider, "send_message", {
            conversationId: c.id,
            message: {
              text: "Unauthorized fixture",
              clientMessageId: randomUUID(),
            },
          })
        ).ok,
        "Foreign socket message denied",
      );
      check(
        (await emit(a, "join_conversation", { conversationId: c.id })).ok,
        "Authenticated customer joins conversation room",
      );
      check(
        (await emit(b, "join_conversation", { conversationId: c.id })).ok,
        "Authenticated vendor joins conversation room",
      );
      check(
        !(await emit(outsider, "join_conversation", { conversationId: c.id }))
          .ok,
        "Arbitrary room join rejected",
      );
      check(
        !(await emit(a, "join_conversation", { conversationId: "user:other" }))
          .ok,
        "Room names are not accepted as IDs",
      );
      const typed = new Promise((resolve) => b.once("typing_start", resolve));
      await emit(a, "typing_start", { conversationId: c.id });
      check(
        (await typed).conversationId === c.id,
        "Typing reaches only authorized room",
      );
      let received = 0;
      b.on("receive_message", () => received++);
      const sent = await emit(a, "send_message", {
        conversationId: c.id,
        message: { text: "Socket fixture", clientMessageId: randomUUID() },
      });
      check(
        sent.ok && sent.data.id,
        "Socket acknowledgement follows database write",
      );
      check(received === 0, "No message broadcast before transaction commit");
      // Simulate the successful commit boundary while retaining rollback isolation.
      const delivered = new Promise((resolve) =>
        b.once("receive_message", resolve),
      );
      callbacks.splice(0).forEach((fn) => fn());
      await delivered;
      check(received > 0, "Committed message triggers realtime receive event");
      a.disconnect();
      const reconnected = await connect("customer");
      check(
        (await emit(reconnected, "join_conversation", { conversationId: c.id }))
          .ok,
        "Reconnect reauthenticates and rejoins",
      );
      check(
        (await s.chat(c.id, {}, customer)).messages.some(
          (m) => m.id === sent.data.id,
        ),
        "REST reconciliation recovers missed socket messages",
      );
      console.log(
        `PASS: ${checks} real MSSQL/REST/Socket.IO communication checks; fixtures rolled back.`,
      );
    } finally {
      for (const socket of sockets) socket.disconnect();
      if (io) await new Promise((resolve) => io.close(resolve));
      else if (server) await new Promise((resolve) => server.close(resolve));
      setRealtimeServer(undefined);
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
      tx.afterCommit = after;
    }
    throw rollback;
  });
} catch (e) {
  if (e !== rollback) {
    console.error(
      "Communication verification failed:",
      e.name,
      e.message,
      e.original?.errors?.map((x) => x.message),
    );
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
