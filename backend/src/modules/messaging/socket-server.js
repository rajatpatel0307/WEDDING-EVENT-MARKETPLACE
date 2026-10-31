import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import { z } from "zod";
import { authenticate } from "../auth/token.service.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { limit } from "../auth/security.service.js";
import { query } from "../notifications/notification-center.service.js";
import * as s from "./communication.service.js";
import {
  setRealtimeServer,
  userRoom,
  conversationRoom,
  emitUser,
} from "./realtime-bus.js";
export function attachCommunicationServer(httpServer) {
  const origin = process.env.FRONTEND_URL || "http://localhost:5173";
  const io = new Server(httpServer, {
    cors: { origin, credentials: true },
    maxHttpBufferSize: 20000,
    allowRequest: (req, done) => done(null, req.headers.origin === origin),
  });
  setRealtimeServer(io);
  io.use(async (socket, next) => {
    try {
      cookieParser()(socket.request, {}, () => {});
      const auth = await authenticate(socket.request);
      socket.data.ctx = { req: socket.request, auth };
      requireAuth(socket.data.ctx);
      await limit(`chat-connect:${auth.user.id}`, 30, 60);
      next();
    } catch {
      next(new Error("Please sign in again."));
    }
  });
  const online = (id) => !!io.sockets.adapter.rooms.get(userRoom(id))?.size;
  async function presence(userId, event) {
    const contacts = await query(
      `SELECT DISTINCT CASE WHEN c.CustomerId=:user THEN v.UserId ELSE c.CustomerId END AS id FROM dbo.Conversations c JOIN dbo.Vendors v ON v.VendorId=c.VendorId WHERE c.IsActive=1 AND (c.CustomerId=:user OR v.UserId=:user)`,
      { user: userId },
    );
    for (const c of contacts) emitUser(c.id, event, { userId });
  }
  io.on("connection", (socket) => {
    const uid = socket.data.ctx.auth.user.id;
    const wasOnline = online(uid);
    socket.join(userRoom(uid));
    if (!wasOnline) presence(uid, "user_online").catch(() => {});
    const schema = z.object({ conversationId: z.guid() }).strict();
    const on = (event, fn) =>
      socket.on(event, async (payload, ack) => {
        try {
          const auth = await authenticate(socket.request);
          if (!auth) {
            socket.disconnect(true);
            throw Error("Please sign in again.");
          }
          socket.data.ctx.auth = auth;
          await limit(`chat-event:${uid}`, 240, 60);
          const result = await fn(payload, socket.data.ctx);
          if (typeof ack === "function") ack({ ok: true, data: result });
        } catch (e) {
          if (typeof ack === "function")
            ack({
              ok: false,
              message:
                e.status && e.status < 500
                  ? e.message
                  : "Unable to process this event. Please reconnect or retry.",
            });
        }
      });
    on("join_conversation", async (p, ctx) => {
      const { conversationId: id } = schema.parse(p),
        c = await s.membership(id, ctx);
      if (socket.rooms.size >= 32 && !socket.rooms.has(conversationRoom(id)))
        s.fail("Too many open conversations.", 429);
      await socket.join(conversationRoom(id));
      return {
        online: online(
          c.CustomerId.toLowerCase() === uid.toLowerCase()
            ? c.VendorUserId
            : c.CustomerId,
        ),
      };
    });
    on("leave_conversation", async (p) => {
      const { conversationId: id } = schema.parse(p);
      await socket.leave(conversationRoom(id));
    });
    on("send_message", async (p, ctx) => {
      const b = z
        .object({ conversationId: z.guid(), message: s.messageInput })
        .strict()
        .parse(p);
      await limit(`chat-send:${uid}`, 60, 60);
      return s.sendMessage(b.conversationId, b.message, ctx);
    });
    on("message_delivered", async (p, ctx) =>
      s.receipt(schema.parse(p).conversationId, ctx, false),
    );
    on("message_read", async (p, ctx) =>
      s.receipt(schema.parse(p).conversationId, ctx, true),
    );
    for (const event of ["typing_start", "typing_stop"])
      on(event, async (p, ctx) => {
        const { conversationId: id } = schema.parse(p);
        await s.membership(id, ctx);
        await limit(`chat-typing:${uid}`, 90, 60);
        socket
          .to(conversationRoom(id))
          .emit(event, { conversationId: id, userId: uid });
      });
    // Revalidate idle sockets too: revoked sessions must stop receiving private events.
    const timer = setInterval(async () => {
      try {
        if (!(await authenticate(socket.request))) socket.disconnect(true);
      } catch {
        socket.disconnect(true);
      }
    }, 15000);
    timer.unref();
    socket.on("disconnect", () => {
      clearInterval(timer);
      if (!online(uid)) presence(uid, "user_offline").catch(() => {});
    });
  });
  return io;
}
