import { Router, json } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../auth/token.service.js";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as w from "./workspace.service.js";
import * as d from "./workspace.discovery.js";
import * as o from "./workspace.operations.js";
import * as m from "./workspace.messaging.js";
import * as p from "./workspace.payments.js";
import * as lifecycle from "../bookings/bookings.service.js";
export function createCustomerRouter({
  authenticateRequest = authenticate,
} = {}) {
  const r = Router();
  r.use(
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  r.use(async (req, res, next) => {
    try {
      req.ctx = { req, res, auth: await authenticateRequest(req) };
      requireRole(req.ctx, "CUSTOMER");
      if (
        !["GET", "HEAD"].includes(req.method) &&
        (req.get("origin") !==
          (process.env.FRONTEND_URL || "http://localhost:5173") ||
          req.get("x-customer-request") !== "1")
      )
        return res
          .status(403)
          .json({ success: false, message: "Request origin is not allowed." });
      res.set("Cache-Control", "no-store");
      next();
    } catch (e) {
      next(e);
    }
  });
  r.use(json({ limit: "8mb" }));
  const get = (path, fn) =>
    r.get(path, async (req, res) =>
      res.json({ success: true, data: await fn(req) }),
    );
  const mut = (method, path, fn) =>
    r[method](path, async (req, res) =>
      res.json({ success: true, ...(await fn(req)) }),
    );
  get("/dashboard", (q) => w.dashboard(q.ctx));
  get("/catalog", (q) => d.catalog(q.ctx));
  get("/discover", (q) => d.discover(q.query, q.ctx));
  get("/services/:id", (q) => d.serviceDetails(q.params.id, q.ctx));
  get("/vendors/:id", (q) => d.vendorDetails(q.params.id, q.ctx));
  get("/records/:section", (q) => w.records(q.params.section, q.query, q.ctx));
  get("/wishlist", (q) => d.wishlist(q.ctx));
  mut("post", "/wishlist", (q) => d.saveWishlist(q.body, q.ctx));
  mut("delete", "/wishlist/:id", (q) => d.removeWishlist(q.params.id, q.ctx));
  get("/events/:id", (q) => w.eventDetails(q.params.id, q.ctx));
  mut("post", "/events", (q) => w.saveEvent(null, q.body, q.ctx));
  mut("put", "/events/:id", (q) => w.saveEvent(q.params.id, q.body, q.ctx));
  mut("post", "/events/:id/guests", (q) =>
    w.guest(q.params.id, null, q.body, q.ctx),
  );
  mut("put", "/events/:id/guests/:guest", (q) =>
    w.guest(q.params.id, q.params.guest, q.body, q.ctx),
  );
  mut("delete", "/events/:id/guests/:guest", (q) =>
    w.guest(q.params.id, q.params.guest, {}, q.ctx, true),
  );
  get("/profile", (q) => w.profile(q.ctx));
  mut("put", "/profile", (q) => w.saveProfile(q.body, q.ctx));
  mut("post", "/addresses", (q) => w.saveAddress(null, q.body, q.ctx));
  mut("put", "/addresses/:id", (q) =>
    w.saveAddress(q.params.id, q.body, q.ctx),
  );
  mut("delete", "/addresses/:id", (q) =>
    w.saveAddress(q.params.id, {}, q.ctx, true),
  );
  mut("patch", "/notifications/:id/read", (q) =>
    w.readNotification(q.params.id, q.ctx),
  );
  const bookingLimit = rateLimit({
    windowMs: 60000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  r.use("/bookings", (req, res, next) =>
    ["GET", "HEAD"].includes(req.method)
      ? next()
      : bookingLimit(req, res, next),
  );
  mut("post", "/bookings/preview", (q) => o.previewBooking(q.body, q.ctx));
  mut("post", "/bookings", (q) => o.book(q.body, q.ctx));
  get("/bookings/:id", (q) => o.bookingDetails(q.params.id, q.ctx));
  mut("post", "/bookings/:id/change-requests", (q) =>
    lifecycle.requestChange(q.params.id, q.body, q.ctx),
  );
  mut("patch", "/bookings/:id/items/:item", (q) =>
    lifecycle.editOptionalItem(q.params.id, q.params.item, q.body, q.ctx),
  );
  mut("delete", "/bookings/:id/items/:item", (q) =>
    lifecycle.editOptionalItem(q.params.id, q.params.item, q.body, q.ctx, true),
  );
  mut("post", "/quotation-requests", (q) => o.requestQuote(q.body, q.ctx));
  get("/quotations/:id", (q) => o.quoteDetails(q.params.id, q.ctx));
  mut("post", "/quotations/:id/decision", (q) =>
    o.decideQuote(q.params.id, q.body, q.ctx),
  );
  mut("post", "/reviews", (q) => o.review(q.body, q.ctx));
  get("/payments/config", () => ({
    enabled: p.configured(),
    gateway: "Razorpay",
    currency: "INR",
  }));
  mut("post", "/bookings/:id/payment-order", (q) =>
    p.createOrder(q.params.id, q.ctx),
  );
  mut("post", "/payments/verify", (q) => p.verifyPayment(q.body, q.ctx));
  get("/conversations", (q) => m.conversations(q.ctx));
  mut("post", "/conversations", (q) => m.startConversation(q.body, q.ctx));
  get("/conversations/:id/messages", (q) =>
    m.chat(q.params.id, q.query, q.ctx),
  );
  mut("post", "/conversations/:id/messages", (q) =>
    m.sendMessage(q.params.id, q.body, q.ctx),
  );
  mut("patch", "/conversations/:id/read", (q) =>
    m.readChat(q.params.id, q.ctx),
  );
  mut("post", "/conversations/:id/attachments", (q) =>
    m.attachmentUpload(q.params.id, q.body, q.ctx),
  );
  r.get("/conversations/:id/messages/:message/file", async (q, res) => {
    const f = await m.attachmentFile(q.params.id, q.params.message, q.ctx);
    res.set({
      "Content-Type": f.mimeType,
      "Content-Disposition": `attachment; filename="${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
    });
    res.send(Buffer.from(f.base64, "base64"));
  });
  r.use((e, req, res, next) => {
    if (res.headersSent) return next(e);
    const code = e.extensions?.code,
      status =
        code === "UNAUTHENTICATED"
          ? 401
          : code === "FORBIDDEN"
            ? 403
            : e.name === "ZodError" || code === "UPLOAD_FAILED"
              ? 400
              : e.name === "SequelizeUniqueConstraintError"
                ? 409
                : e.status || 500;
    res.status(status).json({
      success: false,
      message:
        status === 500
          ? "Customer workspace is temporarily unavailable. Please try again."
          : e.name === "ZodError"
            ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" ")
            : status === 409 && e.name === "SequelizeUniqueConstraintError"
              ? "This action has already been completed. Refresh the page."
              : e.message,
      data: null,
    });
  });
  return r;
}
export default createCustomerRouter();
