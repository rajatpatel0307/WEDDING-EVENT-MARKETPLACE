import { Router, json } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../auth/token.service.js";
import {
  requireAuth,
  requireRole,
  requireApprovedVendor,
} from "../../middleware/auth.middleware.js";
import * as service from "./reviews.service.js";
import { errorResponse } from "./reviews.controller.js";
export function createReviewRouter({
  authenticateRequest = authenticate,
} = {}) {
  const router = Router();
  const readLimit = rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  const writeLimit = rateLimit({
    windowMs: 60000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  function route(method, path, role, fn, upload = false) {
    router[method](
      path,
      method === "get" ? readLimit : writeLimit,
      async (req, res, next) => {
        try {
          req.reviewContext = {
            req,
            res,
            auth: role === "Public" ? null : await authenticateRequest(req),
          };
          if (role !== "Public" && role !== "Image") {
            if (role === "Vendor") requireApprovedVendor(req.reviewContext);
            else if (role === "Any") requireAuth(req.reviewContext);
            else requireRole(req.reviewContext, role.toUpperCase());
          }
          if (
            method !== "get" &&
            (req.get("origin") !==
              (process.env.FRONTEND_URL || "http://localhost:5173") ||
              !["1"].includes(
                req.get("x-review-request") ||
                  req.get(`x-${role.toLowerCase()}-request`),
              ))
          )
            return res.status(403).json({
              success: false,
              message: "Request origin is not allowed.",
            });
          res.set("Cache-Control", "no-store");
          next();
        } catch (error) {
          errorResponse(error, res);
        }
      },
      json({ limit: upload ? "16mb" : "32kb" }),
      async (req, res) => {
        try {
          const result = await fn(req, req.reviewContext);
          if (result?.bytes) {
            res
              .type(result.mimeType)
              .set("X-Content-Type-Options", "nosniff")
              .send(result.bytes);
            return;
          }
          res.json({ success: true, data: result });
        } catch (error) {
          errorResponse(error, res);
        }
      },
    );
  }
  for (const root of ["/reviews", "/customer/reviews"]) {
    route("get", `${root}/eligible-bookings`, "Customer", (_, c) =>
      service.eligible(c),
    );
    route("get", `${root}/my-reviews`, "Customer", (q, c) =>
      service.list(q.query, c, "Customer"),
    );
    route("get", root, "Customer", (q, c) =>
      service.list(q.query, c, "Customer"),
    );
    route("post", root, "Customer", (q, c) => service.create(q.body, c), true);
    route("get", `${root}/:id`, "Customer", (q, c) =>
      service.details(q.params.id, c),
    );
    route(
      "put",
      `${root}/:id`,
      "Customer",
      (q, c) => service.edit(q.params.id, q.body, c),
      true,
    );
    route("delete", `${root}/:id`, "Customer", (q, c) =>
      service.edit(q.params.id, null, c, true),
    );
    route("post", `${root}/:id/report`, "Any", (q, c) =>
      service.report(q.params.id, q.body, c),
    );
  }
  route("get", "/review-images/:id", "Image", (q, c) =>
    service.image(q.params.id, c),
  );
  for (const [path, type] of [
    ["vendors", "vendor"],
    ["services", "service"],
    ["packages", "package"],
  ]) {
    route("get", `/${path}/:id/reviews`, "Public", (q) =>
      service.list(q.query, null, "Public", { type, id: q.params.id }),
    );
    route("get", `/${path}/:id/rating-summary`, "Public", (q) =>
      service.summary({ type, id: q.params.id }),
    );
  }
  route("get", "/vendor/reviews", "Vendor", (q, c) =>
    service.list(q.query, c, "Vendor"),
  );
  route("get", "/vendor/rating-summary", "Vendor", (_, c) =>
    service.summary(null, c, "Vendor"),
  );
  route("get", "/vendor/reviews/:id", "Vendor", (q, c) =>
    service.details(q.params.id, c, "Vendor"),
  );
  for (const method of ["post", "put", "delete"])
    route(method, "/vendor/reviews/:id/response", "Vendor", (q, c) =>
      service.respond(
        q.params.id,
        q.body,
        c,
        method === "delete",
        method.toUpperCase(),
      ),
    );
  route("get", "/admin/reviews", "Admin", (q, c) =>
    service.list(q.query, c, "Admin"),
  );
  route("get", "/admin/reviews/filters", "Admin", (_, c) =>
    service.metadata(c),
  );
  route("get", "/admin/reviews/:id", "Admin", (q, c) =>
    service.details(q.params.id, c, "Admin"),
  );
  route("patch", "/admin/reviews/:id/notes", "Admin", (q, c) =>
    service.addNote(q.params.id, q.body, c),
  );
  for (const action of ["approve", "reject", "hide", "restore", "flag"])
    route("patch", `/admin/reviews/:id/${action}`, "Admin", (q, c) =>
      service.moderate(q.params.id, action, q.body, c),
    );
  route("patch", "/admin/reviews/:id/response/hide", "Admin", (q, c) =>
    service.moderateResponse(q.params.id, q.body, c),
  );
  route("get", "/admin/review-reports", "Admin", (q, c) =>
    service.reports(q.query, c),
  );
  for (const action of ["resolve", "dismiss"])
    route("patch", `/admin/review-reports/:id/${action}`, "Admin", (q, c) =>
      service.resolveReport(q.params.id, action, q.body, c),
    );
  route("get", "/admin/review-analytics", "Admin", (_, c) =>
    service.analytics(c),
  );
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    errorResponse(error, res);
  });
  return router;
}
export default createReviewRouter();
