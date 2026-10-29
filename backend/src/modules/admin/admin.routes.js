import * as commission from "./commission.service.js";
import * as operations from "./operations.service.js";
import * as payouts from "./payouts.service.js";
import * as bookingManagement from "./bookings-management.service.js";
import { initiate as initiateBookingRefund } from "./booking-refunds.service.js";
import * as serviceManagement from "./services-management.service.js";
import * as serviceApproval from "./service-approval.service.js";
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
  );
  router.use(async (req, res, next) => {
    try {
      if (
        !["GET", "HEAD"].includes(req.method) &&
        (req.get("origin") !== process.env.FRONTEND_URL ||
          req.get("x-admin-request") !== "1")
      )
        return res.status(403).json({
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
  const standardJson = json({ limit: "64kb" }),
    uploadJson = json({ limit: "8mb" });
  router.use((req, res, next) =>
    (req.path.endsWith("/images/upload") ? uploadJson : standardJson)(
      req,
      res,
      next,
    ),
  );
  router.get("/commission/configuration", async (req, res) =>
    res.json(await commission.configuration(req.admin)),
  );
  router.put(
    "/commission/configuration",
    rateLimit({ windowMs: 60000, limit: 15 }),
    async (req, res) =>
      res.json(await commission.configure(req.body, req.admin)),
  );
  router.get("/search", async (req, res) =>
    res.json(await operations.search(req.query, req.admin)),
  );
  router.get("/notifications/inbox", async (req, res) =>
    res.json(await operations.inbox(req.admin, req.query)),
  );
  router.patch("/notifications/:id/read", async (req, res) =>
    res.json(
      await operations.readNotification(req.params.id, req.body, req.admin),
    ),
  );
  router.get("/finance/:kind/:id", async (req, res) =>
    res.json(
      await operations.details(req.params.kind, req.params.id, req.admin),
    ),
  );
  router.post("/finance/:kind/:id/notes", async (req, res) =>
    res.json(
      await operations.note(
        req.params.kind,
        req.params.id,
        req.body,
        req.admin,
      ),
    ),
  );
  router.post(
    "/payouts/:id/decision",
    rateLimit({ windowMs: 60000, limit: 15 }),
    async (req, res) =>
      res.json(await payouts.decide(req.params.id, req.body, req.admin)),
  );
  router.get("/bookings", async (req, res) =>
    res.json(await bookingManagement.list(req.query, req.admin)),
  );
  router.get("/bookings/statistics", async (req, res) =>
    res.json(await bookingManagement.statistics(req.admin)),
  );
  router.get("/bookings/options", async (req, res) =>
    res.json(await bookingManagement.options(req.query, req.admin)),
  );
  router.get("/bookings/:id", async (req, res) =>
    res.json(await bookingManagement.detail(req.params.id, req.admin)),
  );
  router.get("/bookings/:id/items", async (req, res) =>
    res.json(await bookingManagement.items(req.params.id, req.admin)),
  );
  router.get("/bookings/:id/status-history", async (req, res) =>
    res.json(await bookingManagement.timeline(req.params.id, req.admin)),
  );
  router.get("/bookings/:id/payment", async (req, res) =>
    res.json(await bookingManagement.payment(req.params.id, req.admin)),
  );
  router.get("/bookings/:id/payout", async (req, res) =>
    res.json(await bookingManagement.payout(req.params.id, req.admin)),
  );
  router.post("/bookings/:id/cancel", async (req, res) =>
    res.json(
      await bookingManagement.changeStatus(
        req.params.id,
        "Cancelled",
        req.body,
        req.admin,
      ),
    ),
  );
  router.post("/bookings/:id/status", async (req, res) => {
    const { status, ...input } = req.body;
    res.json(
      await bookingManagement.changeStatus(
        req.params.id,
        status,
        input,
        req.admin,
      ),
    );
  });
  router.post("/bookings/:id/policy-review", async (req, res) =>
    res.json(
      await bookingManagement.reviewPolicy(req.params.id, req.body, req.admin),
    ),
  );
  router.post("/bookings/:id/refund", async (req, res) =>
    res
      .status(202)
      .json(await initiateBookingRefund(req.params.id, req.body, req.admin)),
  );
  router.get("/services", async (req, res) =>
    res.json(await serviceManagement.list(req.query, req.admin)),
  );
  router.get("/services/statistics", async (req, res) =>
    res.json(await serviceManagement.statistics(req.admin)),
  );
  router.get("/services/metadata", async (req, res) =>
    res.json(await serviceManagement.metadata(req.admin, req.query)),
  );
  router.get("/services/export", async (req, res) => {
    const query = serviceManagement.querySchema.parse(req.query);
    const columns = [
      "id",
      "name",
      "vendorId",
      "vendor",
      "category",
      "subcategory",
      "price",
      "location",
      "status",
      "active",
      "bookings",
      "rating",
      "createdAt",
      "updatedAt",
    ];
    let page = 1;
    let result = await serviceManagement.list(
      { ...query, page, pageSize: 100 },
      req.admin,
    );
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="services.csv"',
    });
    res.write("\uFEFF" + columns.join(",") + "\r\n");
    while (!res.destroyed) {
      for (const row of result.rows) {
        if (res.destroyed) break;
        if (
          !res.write(
            columns.map((c) => serviceManagement.csvCell(row[c])).join(",") +
              "\r\n",
          )
        )
          await new Promise((resolve) => {
            const done = () => {
              res.off("drain", done);
              res.off("close", done);
              resolve();
            };
            res.once("drain", done);
            res.once("close", done);
          });
      }
      if (page * 100 >= result.total || res.destroyed) break;
      result = await serviceManagement.list(
        { ...query, page: ++page, pageSize: 100 },
        req.admin,
      );
    }
    res.end();
  });
  for (const kind of ["items", "packages"])
    router.get(`/service-${kind}`, async (req, res) =>
      res.json(
        await serviceManagement.childrenIndex(kind, req.query, req.admin),
      ),
    );
  router.post("/services", async (req, res) =>
    res
      .status(201)
      .json(await serviceManagement.save(null, req.body, req.admin)),
  );
  router.get("/services/:id/performance", async (req, res) =>
    res.json(await serviceManagement.performance(req.params.id, req.admin)),
  );
  router.get("/services/:id/records/:kind", async (req, res) =>
    res.json(
      await serviceManagement.records(
        req.params.id,
        req.params.kind,
        req.query,
        req.admin,
      ),
    ),
  );
  router.post("/services/:id/submit", async (req, res) =>
    res.json(
      await serviceManagement.submit(req.params.id, req.body, req.admin),
    ),
  );
  router.post("/services/:id/duplicate", async (req, res) =>
    res
      .status(201)
      .json(
        await serviceManagement.duplicate(req.params.id, req.body, req.admin),
      ),
  );
  router.put("/services/:id", async (req, res) =>
    res.json(await serviceManagement.save(req.params.id, req.body, req.admin)),
  );
  router.delete("/services/:id", async (req, res) =>
    res.json(
      await serviceManagement.remove(req.params.id, req.body, req.admin),
    ),
  );
  router.post("/services/:id/items", async (req, res) =>
    res.json(
      await serviceManagement.itemMutation(
        req.params.id,
        null,
        req.body,
        req.admin,
      ),
    ),
  );
  router.put("/services/:id/items/:itemId", async (req, res) =>
    res.json(
      await serviceManagement.itemMutation(
        req.params.id,
        req.params.itemId,
        req.body,
        req.admin,
      ),
    ),
  );
  router.delete("/services/:id/items/:itemId", async (req, res) =>
    res.json(
      await serviceManagement.itemMutation(
        req.params.id,
        req.params.itemId,
        req.body,
        req.admin,
        true,
      ),
    ),
  );
  router.put("/services/:id/packages/:packageId", async (req, res) =>
    res.json(
      await serviceManagement.packageMutation(
        req.params.id,
        req.params.packageId,
        req.body,
        req.admin,
      ),
    ),
  );
  router.post("/services/:id/images/upload", async (req, res) =>
    res.json(
      await serviceManagement.uploadImage(req.params.id, req.body, req.admin),
    ),
  );
  router.post("/services/:id/images/:imageId", async (req, res) =>
    res.json(
      await serviceManagement.imageMutation(
        req.params.id,
        req.params.imageId,
        req.body,
        req.admin,
      ),
    ),
  );
  router.get("/services/pending", async (req, res) =>
    res.json(await serviceApproval.pending(req.query, req.admin)),
  );
  router.get("/services/pending-count", async (req, res) => {
    const result = await serviceApproval.pending({ pageSize: 1 }, req.admin);
    res.json({ pendingCount: result.total });
  });
  router.get("/services/:id", async (req, res) =>
    res.json(await serviceManagement.details(req.params.id, req.admin)),
  );
  router.get("/services/:id/review", async (req, res) =>
    res.json(await serviceApproval.review(req.params.id, req.admin)),
  );
  router.get("/services/:id/approval-history", async (req, res) =>
    res.json(await serviceApproval.approvalHistory(req.params.id, req.admin)),
  );
  for (const action of [
    "approve",
    "reject",
    "start-review",
    "suspend",
    "activate",
    "deactivate",
  ])
    router.post(`/services/:id/${action}`, async (req, res) =>
      res.json(
        await serviceApproval.decide(
          req.params.id,
          action,
          req.body,
          req.admin,
        ),
      ),
    );
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
  router.post("/vendors/:id/notes", async (req, res) =>
    res.json(await vendorDetails.addNote(req.params.id, req.body, req.admin)),
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
      error.name === "ZodError" || code === "UPLOAD_FAILED"
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
