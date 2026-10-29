import { Router, json } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../auth/token.service.js";
import {
  requireApprovedVendor,
  requireRole,
} from "../../middleware/auth.middleware.js";
import * as services from "./service-management.service.js";
import * as children from "./service-management.children.js";
import * as workspace from "./workspace.service.js";
import * as operations from "./workspace.operations.js";
import * as messaging from "./workspace.messaging.js";
import { dashboard } from "./workspace.analytics.js";

// Service drafts are available to signed-in vendors; other tools require approval.
export function createVendorRouter({
  authenticateRequest = authenticate,
} = {}) {
  const router = Router();
  router.use(
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  router.use(async (req, res, next) => {
    try {
      req.vendorContext = { req, res, auth: await authenticateRequest(req) };
      req.vendorUser = /^\/(?:services|packages)(?:\/|$)/.test(req.path)
        ? requireRole(req.vendorContext, "VENDOR")
        : requireApprovedVendor(req.vendorContext);
      if (
        !["GET", "HEAD"].includes(req.method) &&
        (req.get("origin") !== process.env.FRONTEND_URL ||
          req.get("x-vendor-request") !== "1")
      )
        return res.status(403).json({
          success: false,
          message: "Request origin is not allowed.",
          data: null,
        });
      res.set("Cache-Control", "no-store");
      next();
    } catch (error) {
      next(error);
    }
  });
  router.use(json({ limit: "8mb" }));
  const get = (path, fn) =>
    router.get(path, async (req, res) =>
      res.json({ success: true, data: await fn(req) }),
    );
  const mutation = (method, path, fn) =>
    router[method](path, async (req, res) => {
      const result = await fn(req);
      res.json({ success: true, ...result });
    });
  get("/services/metadata", (req) => services.metadata(req.vendorContext));
  router.get("/services/export", async (req, res) => {
    const csv = await services.exportServices(req.query, req.vendorContext);
    res.type("text/csv; charset=utf-8");
    res.set(
      "Content-Disposition",
      'attachment; filename="vendor-services.csv"',
    );
    res.send(csv);
  });
  get("/services", (req) => services.list(req.query, req.vendorContext));
  get("/services/:id", (req) =>
    services.details(req.params.id, req.vendorContext),
  );
  mutation("post", "/services", (req) =>
    services.saveService(null, req.body, req.vendorContext),
  );
  mutation("put", "/services/:id", (req) =>
    services.saveService(req.params.id, req.body, req.vendorContext),
  );
  mutation("delete", "/services/:id", (req) =>
    services.remove(req.params.id, req.body, req.vendorContext),
  );
  mutation("post", "/services/:id/submit", (req) =>
    services.submit(req.params.id, req.body, req.vendorContext),
  );
  mutation("post", "/services/:id/duplicate", (req) =>
    services.duplicate(req.params.id, req.vendorContext),
  );
  mutation("patch", "/services/:id/active", (req) =>
    services.active(req.params.id, req.body, req.vendorContext),
  );
  get("/services/:id/performance", (req) =>
    services.performance(req.params.id, req.vendorContext),
  );
  for (const kind of ["bookings", "reviews"])
    get(`/services/:id/${kind}`, (req) =>
      services.history(req.params.id, kind, req.vendorContext),
    );
  get(
    "/services/:id/images",
    async (req) =>
      (await services.details(req.params.id, req.vendorContext)).images,
  );
  for (const method of ["post", "put"])
    mutation(method, "/services/:id/images", (req) =>
      services.images(req.params.id, req.body, req.vendorContext),
    );
  mutation("delete", "/services/:id/images/:imageId", (req) =>
    services.images(
      req.params.id,
      req.body,
      req.vendorContext,
      req.params.imageId,
    ),
  );
  get("/services/:id/items", (req) =>
    children.children("items", req.params.id, req.vendorContext),
  );
  mutation("post", "/services/:id/items", (req) =>
    children.itemMutation(req.params.id, null, req.body, req.vendorContext),
  );
  mutation("put", "/services/:id/items/:itemId", (req) =>
    children.itemMutation(
      req.params.id,
      req.params.itemId,
      req.body,
      req.vendorContext,
    ),
  );
  mutation("delete", "/services/:id/items/:itemId", (req) =>
    children.itemMutation(
      req.params.id,
      req.params.itemId,
      req.body,
      req.vendorContext,
      true,
    ),
  );
  get("/services/:id/packages", (req) =>
    children.children("packages", req.params.id, req.vendorContext),
  );
  mutation("post", "/services/:id/packages", (req) =>
    children.packageMutation(req.params.id, null, req.body, req.vendorContext),
  );
  mutation("delete", "/packages/:id", (req) =>
    children.packageMutation(
      null,
      req.params.id,
      req.body,
      req.vendorContext,
      "delete",
    ),
  );
  mutation("post", "/packages/:id/duplicate", (req) =>
    children.packageMutation(
      null,
      req.params.id,
      req.body,
      req.vendorContext,
      "duplicate",
    ),
  );
  get("/services/:id/availability", (req) =>
    services.availability(req.params.id, req.vendorContext),
  );
  mutation("post", "/services/:id/availability", (req) =>
    services.saveAvailability(req.params.id, req.body, req.vendorContext),
  );
  mutation("put", "/services/:id/availability/:availabilityId", (req) =>
    services.saveAvailability(
      req.params.id,
      req.body,
      req.vendorContext,
      req.params.availabilityId,
    ),
  );
  mutation("delete", "/services/:id/availability/:availabilityId", (req) =>
    services.saveAvailability(
      req.params.id,
      {},
      req.vendorContext,
      req.params.availabilityId,
      true,
    ),
  );
  const sendFile = async (res, file) => {
    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
    });
    res.send(Buffer.from(file.base64, "base64"));
  };
  get("/dashboard", (req) => dashboard(req.query, req.vendorContext));
  get("/catalog", (req) => workspace.catalog(req.vendorContext));
  get("/business", (req) => workspace.business(req.vendorContext));
  mutation("put", "/business", (req) =>
    workspace.saveBusiness(req.body, req.vendorContext),
  );
  get("/records/:section", (req) =>
    workspace.records(req.params.section, req.query, req.vendorContext),
  );
  mutation("post", "/images", (req) =>
    workspace.imageUpload(req.body, req.vendorContext),
  );
  get("/packages/:id", (req) =>
    children.packageDetails(req.params.id, req.vendorContext),
  );
  mutation("post", "/packages", (req) =>
    children.packageMutation(
      req.body.serviceId,
      null,
      req.body,
      req.vendorContext,
    ),
  );
  mutation("put", "/packages/:id", (req) =>
    children.packageMutation(null, req.params.id, req.body, req.vendorContext),
  );
  mutation("patch", "/:kind/:id/active", (req) =>
    workspace.setActive(
      req.params.kind,
      req.params.id,
      req.body,
      req.vendorContext,
    ),
  );
  for (const kind of ["locations", "offers", "coupons", "items"]) {
    get(`/${kind}/:id`, (req) =>
      workspace.simpleDetails(kind, req.params.id, req.vendorContext),
    );
    mutation("post", `/${kind}`, (req) =>
      workspace.saveSimple(kind, null, req.body, req.vendorContext),
    );
    mutation("put", `/${kind}/:id`, (req) =>
      workspace.saveSimple(kind, req.params.id, req.body, req.vendorContext),
    );
  }
  mutation("post", "/documents", (req) =>
    workspace.documentUpload(req.body, req.vendorContext),
  );
  router.get("/documents/:id/file", async (req, res) =>
    sendFile(
      res,
      await workspace.documentFile(req.params.id, req.vendorContext),
    ),
  );
  mutation("patch", "/notifications/:id/read", (req) =>
    workspace.readNotification(req.params.id, req.vendorContext),
  );
  mutation("post", "/bookings/:id/decision", (req) =>
    operations.bookingDecision(req.params.id, req.body, req.vendorContext),
  );
  get("/quotation-options", (req) =>
    operations.quotationOptions(req.vendorContext),
  );
  get("/quotations/:id", (req) =>
    operations.quoteDetails(req.params.id, req.vendorContext),
  );
  mutation("post", "/quotations", (req) =>
    operations.saveQuote(null, req.body, req.vendorContext),
  );
  mutation("put", "/quotations/:id", (req) =>
    operations.saveQuote(req.params.id, req.body, req.vendorContext),
  );
  mutation("post", "/quotations/:id/action", (req) =>
    operations.quoteAction(req.params.id, req.body, req.vendorContext),
  );
  get("/calendar", (req) =>
    operations.calendar(req.query.month, req.vendorContext),
  );
  mutation("put", "/availability", (req) =>
    operations.setAvailability(req.body, req.vendorContext),
  );
  get("/conversations", (req) => messaging.conversations(req.vendorContext));
  mutation("post", "/conversations", (req) =>
    messaging.startConversation(req.body, req.vendorContext),
  );
  get("/conversations/:id/messages", (req) =>
    messaging.chat(req.params.id, req.query, req.vendorContext),
  );
  mutation("post", "/conversations/:id/messages", (req) =>
    messaging.sendMessage(req.params.id, req.body, req.vendorContext),
  );
  mutation("patch", "/conversations/:id/read", (req) =>
    messaging.readChat(req.params.id, req.vendorContext),
  );
  mutation("post", "/conversations/:id/attachments", (req) =>
    messaging.attachmentUpload(req.params.id, req.body, req.vendorContext),
  );
  router.get(
    "/conversations/:id/messages/:message/attachment",
    async (req, res) =>
      sendFile(
        res,
        await messaging.attachmentFile(
          req.params.id,
          req.params.message,
          req.vendorContext,
        ),
      ),
  );
  router.get("/workspace", (req, res) =>
    res.json({
      success: true,
      message: "Vendor workspace available",
      data: {
        vendorId: req.vendorUser.vendor.id,
        businessName: req.vendorUser.vendor.businessName,
        status: req.vendorUser.vendor.verificationStatus,
      },
    }),
  );
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const code = error.extensions?.code;
    const status =
      code === "UNAUTHENTICATED"
        ? 401
        : code === "FORBIDDEN"
          ? 403
          : error.name === "ZodError" || code === "UPLOAD_FAILED"
            ? 400
            : error.name === "SequelizeUniqueConstraintError"
              ? 409
              : error.status || 500;
    res.status(status).json({
      success: false,
      message:
        status === 500
          ? "Vendor workspace is temporarily unavailable."
          : error.name === "ZodError"
            ? error.issues
                .map(
                  (issue) =>
                    `${issue.path.join(".") || "Input"}: ${issue.message}`,
                )
                .join(" ")
            : error.name === "SequelizeUniqueConstraintError"
              ? "A record with these details already exists."
              : error.message,
      data: null,
    });
  });
  return router;
}
export default createVendorRouter();
