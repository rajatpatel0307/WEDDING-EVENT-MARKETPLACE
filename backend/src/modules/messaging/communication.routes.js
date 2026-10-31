import { Router, json } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../auth/token.service.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { limit } from "../auth/security.service.js";
import * as s from "./communication.service.js";
import * as n from "../notifications/notification-center.service.js";
export function createCommunicationRouter({
  authenticateRequest = authenticate,
} = {}) {
  const r = Router();
  r.use(
    rateLimit({
      windowMs: 60000,
      limit: 240,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  r.use(async (req, res, next) => {
    try {
      req.ctx = { req, res, auth: await authenticateRequest(req) };
      requireAuth(req.ctx);
      req.role = req.get("x-communication-role");
      if (!["Customer", "Vendor", "Admin"].includes(req.role))
        s.fail("Select your workspace role.");
      requireRole(req.ctx, req.role.toUpperCase());
      if (
        !["GET", "HEAD"].includes(req.method) &&
        (req.get("origin") !==
          (process.env.FRONTEND_URL || "http://localhost:5173") ||
          req.get("x-communication-request") !== "1")
      )
        s.fail("Request origin is not allowed.", 403);
      res.set("Cache-Control", "no-store");
      next();
    } catch (e) {
      next(e);
    }
  });
  r.use(json({ limit: "8mb" }));
  const handle = (fn) => async (req, res) =>
    res.json({ success: true, data: await fn(req) });
  r.get(
    "/notifications",
    handle((q) => n.inbox(q.query, q.ctx, q.role)),
  );
  r.get(
    "/notifications/unread-count",
    handle((q) => n.unreadCount(q.ctx)),
  );
  r.patch(
    "/notifications/read-all",
    handle((q) => n.updateNotification(null, "read", q.ctx)),
  );
  r.patch(
    "/notifications/:id/read",
    handle((q) => n.updateNotification(q.params.id, "read", q.ctx)),
  );
  r.delete(
    "/notifications/:id",
    handle((q) => n.updateNotification(q.params.id, "dismiss", q.ctx)),
  );
  r.get(
    "/notification-preferences",
    handle((q) => n.preferences(q.ctx)),
  );
  r.put(
    "/notification-preferences",
    handle((q) => n.preferences(q.ctx, q.body)),
  );
  r.get(
    "/overview",
    handle(async (q) => {
      const user = requireRole(q.ctx, "ADMIN");
      const [counts] = await n.query(`SELECT
      (SELECT COUNT(*) FROM dbo.Conversations WHERE IsActive=1) AS conversations,
      (SELECT COUNT(*) FROM dbo.Messages WHERE CreatedAt>=DATEADD(day,-1,SYSUTCDATETIME())) AS messagesToday,
      (SELECT COUNT(*) FROM dbo.Messages WHERE DeliveredAt IS NULL AND IsRead=0 AND DeletedAt IS NULL) AS awaitingDelivery,
      (SELECT COUNT(*) FROM dbo.Notifications WHERE IsRead=0 AND DismissedAt IS NULL) AS unreadNotifications`);
      await n.query(
        "INSERT dbo.AuditLogs(UserId,ActionType,EntityType,IPAddress) VALUES(:user,'COMMUNICATION_OVERVIEW_VIEWED','Communication',:ip)",
        { user: user.id, ip: q.ip },
      );
      return counts;
    }),
  );
  // Admin role alone never grants private conversation access.
  r.use((q, res, next) => {
    try {
      if (q.role === "Admin")
        s.fail("Private conversations require participant access.", 403);
      s.actor(q.ctx, q.role);
      next();
    } catch (e) {
      next(e);
    }
  });
  r.get(
    "/conversations",
    handle((q) => s.conversations(q.query, q.ctx)),
  );
  r.post(
    "/conversations",
    handle((q) => s.startConversation(q.body, q.ctx, q.role)),
  );
  r.get(
    "/conversations/:id",
    handle((q) => s.conversationDetails(q.params.id, q.ctx)),
  );
  for (const [action, input] of [
    ["archive", { isArchived: true }],
    ["restore", { isArchived: false }],
  ])
    r.patch(
      `/conversations/:id/${action}`,
      handle((q) => s.participantState(q.params.id, input, q.ctx)),
    );
  r.patch(
    "/conversations/:id/mute",
    handle((q) =>
      s.participantState(q.params.id, { isMuted: q.body.isMuted }, q.ctx),
    ),
  );
  r.get(
    "/conversations/:id/messages",
    handle((q) => s.chat(q.params.id, q.query, q.ctx)),
  );
  r.post(
    "/conversations/:id/messages",
    handle(async (q) => {
      await limit(`chat-send:${q.ctx.auth.user.id}`, 60, 60);
      return s.sendMessage(q.params.id, q.body, q.ctx);
    }),
  );
  r.patch(
    "/conversations/:id/read",
    handle((q) => s.receipt(q.params.id, q.ctx, true)),
  );
  r.patch(
    "/conversations/:id/delivered",
    handle((q) => s.receipt(q.params.id, q.ctx, false)),
  );
  r.delete(
    "/messages/:id",
    handle((q) => s.deleteMessage(q.params.id, q.ctx)),
  );
  r.post(
    "/conversations/:id/attachments",
    handle(async (q) => {
      await limit(`chat-upload:${q.ctx.auth.user.id}`, 10, 60);
      return s.attachmentUpload(q.params.id, q.body, q.ctx);
    }),
  );
  r.get("/conversations/:id/messages/:mid/file", async (q, res) => {
    const file = await s.attachmentFile(q.params.id, q.params.mid, q.ctx);
    res.set({
      "Content-Type": file.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name || "attachment")}`,
    });
    res.send(file.bytes);
  });
  r.use((e, req, res, next) => {
    if (res.headersSent) return next(e);
    const code = e.extensions?.code,
      status =
        e.status ||
        (code === "UNAUTHENTICATED"
          ? 401
          : code === "FORBIDDEN"
            ? 403
            : code === "RATE_LIMITED"
              ? 429
              : e.name === "ZodError" || code === "UPLOAD_FAILED"
                ? 400
                : 500);
    res.status(status).json({
      success: false,
      message:
        status === 500
          ? "Communication is temporarily unavailable. Please retry."
          : e.name === "ZodError"
            ? "Please check the request fields."
            : e.message,
    });
  });
  return r;
}
export default createCommunicationRouter();
