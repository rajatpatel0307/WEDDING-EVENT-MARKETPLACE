import { Router, json } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../auth/token.service.js";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as controller from "./admin.controller.js";
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
          .json({ message: "Request origin is not allowed." });
      req.admin = { req, res, auth: await authenticateRequest(req) };
      requireRole(req.admin, "ADMIN");
      res.set("Cache-Control", "no-store");
      next();
    } catch (error) {
      next(error);
    }
  });
  router.get("/dashboard", controller.overview);
  router.get("/settings", controller.getSettings);
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
    res
      .status(status)
      .json({
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
