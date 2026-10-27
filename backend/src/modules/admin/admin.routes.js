import { Router, json } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../auth/token.service.js";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as controller from "./admin.controller.js";
import * as customers from "./customers.service.js";
import * as vendorDetails from "./vendor-details.service.js";
import * as verification from "./vendor-verification.service.js";
export function createAdminRouter({ authenticateRequest = authenticate } = {}) {
  const router = Router();
  router.use(
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    json({ limit: "64kb" }),
  );
  router.use(async (req, res, next) => {
    try {
      if (
        !["GET", "HEAD"].includes(req.method) &&
        (req.get("origin") !== process.env.FRONTEND_URL ||
          req.get("x-admin-request") !== "1")
      )
        return res
          .status(403)
          .json({
            success: false,
            message: "Request origin is not allowed.",
            data: null,
          });
      req.admin = { req, res, auth: await authenticateRequest(req) };
      requireRole(req.admin, "ADMIN");
      res.set("Cache-Control", "no-store");
      next();
    } catch (error) {
      next(error);
    }
  });
  router.get("/dashboard", controller.overview);
  router.get("/customers/:id/details", async (req, res) =>
    res.json(await customers.customerDetails(req.params.id, req.admin)),
  );
  router.get("/customers/:id/records/:section", async (req, res) =>
    res.json(
      await customers.customerRecords(
        req.params.id,
        req.params.section,
        req.query,
        req.admin,
      ),
    ),
  );
  router.patch("/customers/:id/details", async (req, res) =>
    res.json(await customers.editCustomer(req.params.id, req.body, req.admin)),
  );
  router.patch("/customers/:id/account", async (req, res) =>
    res.json(
      await customers.changeCustomerStatus(req.params.id, req.body, req.admin),
    ),
  );
  router.post("/customers/:id/notifications", async (req, res) =>
    res
      .status(201)
      .json(await customers.notifyCustomer(req.params.id, req.body, req.admin)),
  );
  router.get("/vendors/pending", async (req, res) =>
    res.json(await verification.pendingVendors(req.query, req.admin)),
  );
  router.get("/vendors/pending-count", async (req, res) =>
    res.json(await verification.pendingCount(req.admin)),
  );
  for (const [action, status] of Object.entries({
    approve: "Approved",
    reject: "Rejected",
    suspend: "Suspended",
    "start-review": "UnderReview",
    reapply: "Reapply",
  })) {
    router.put(`/vendors/:id/${action}`, async (req, res) =>
      res.json(
        await verification.decideVendor(
          req.params.id,
          status,
          req.body,
          req.admin,
        ),
      ),
    );
  }
  router.get("/settings", controller.getSettings);
  router.get("/vendors/:id/details", async (req, res) =>
    res.json(await vendorDetails.vendorDetails(req.params.id, req.admin)),
  );
  router.get("/vendors/:id/records/:section", async (req, res) =>
    res.json(
      await vendorDetails.vendorRecords(
        req.params.id,
        req.params.section,
        req.query,
        req.admin,
      ),
    ),
  );
  router.patch("/vendors/:id/account", async (req, res) =>
    res.json(
      await vendorDetails.setVendorActive(req.params.id, req.body, req.admin),
    ),
  );
  router.post("/vendors/:id/documents/:documentId/review", async (req, res) =>
    res.json(
      await vendorDetails.reviewVendorDocument(
        req.params.id,
        req.params.documentId,
        req.body,
        req.admin,
      ),
    ),
  );
  router.get(
    "/vendors/:id/documents/:documentId/download",
    async (req, res) => {
      const file = await vendorDetails.vendorDocumentFile(
        req.params.id,
        req.params.documentId,
        req.admin,
      );
      res.set({
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
      });
      res.send(Buffer.from(file.base64, "base64"));
    },
  );
  router.put("/settings", controller.putSettings);
  router.get("/documents/:id/download", controller.document);
  router.post("/vendors/:id/review", controller.review);
  router.get("/:resource/export", controller.exportRows);
  router.get("/:resource", controller.list);
  router.post("/:resource", controller.create);
  router.patch("/:resource/:id/action", controller.action);
  router.patch("/:resource/:id", controller.update);
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const code = error.extensions?.code;
    const status =
      error.name === "ZodError"
        ? 400
        : code === "UNAUTHENTICATED"
          ? 401
          : code === "FORBIDDEN"
            ? 403
            : error.name === "SequelizeUniqueConstraintError"
              ? 409
              : error.status || 500;
    res.status(status).json({
      success: false,
      data: null,
      message:
        status >= 500
          ? "Admin data is temporarily unavailable. Please try again."
          : error.name === "ZodError"
            ? error.issues.map((v) => v.message).join(" ")
            : error.name === "SequelizeUniqueConstraintError"
              ? "A record with these details already exists."
              : error.message,
    });
  });
  return router;
}
export default createAdminRouter();
