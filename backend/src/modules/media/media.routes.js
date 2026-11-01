import { Router, json } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../auth/token.service.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import * as media from "./media.service.js";
import { mediaError } from "./media.controller.js";
export function createMediaRouter({ authenticateRequest = authenticate } = {}) {
  const router = Router(),
    reads = rateLimit({
      windowMs: 60000,
      limit: 240,
      message: {
        success: false,
        message: "Too many media requests. Wait a minute and retry.",
      },
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    writes = rateLimit({
      windowMs: 60000,
      limit: 30,
      message: {
        success: false,
        message: "Too many media changes. Wait a minute and retry.",
      },
      standardHeaders: "draft-8",
      legacyHeaders: false,
    });
  function route(method, path, role, fn, upload = false) {
    router[method](
      path,
      method === "get" ? reads : writes,
      async (req, res, next) => {
        try {
          req.mediaContext = {
            req,
            res,
            auth: role === "Public" ? null : await authenticateRequest(req),
          };
          if (role !== "Public" && role !== "Content") {
            requireAuth(req.mediaContext);
            if (role === "Admin" || role === "Vendor")
              requireRole(req.mediaContext, role.toUpperCase());
          }
          if (
            method !== "get" &&
            (req.get("origin") !==
              (process.env.FRONTEND_URL || "http://localhost:5173") ||
              (req.get("x-media-request") !== "1" &&
                req.get(`x-${role.toLowerCase()}-request`) !== "1"))
          )
            return res.status(403).json({
              success: false,
              message: "Request origin is not allowed.",
            });
          res.set("Cache-Control", "no-store");
          next();
        } catch (error) {
          mediaError(error, res);
        }
      },
      json({ limit: upload ? "16mb" : "32kb" }),
      async (req, res) => {
        try {
          const result = await fn(req, req.mediaContext);
          if (result?.bytes)
            return res
              .type(result.mimeType)
              .set("X-Content-Type-Options", "nosniff")
              .send(result.bytes);
          if (result?.redirect) return res.redirect(302, result.redirect);
          res.json({ success: true, data: result });
        } catch (error) {
          mediaError(error, res);
        }
      },
    );
  }
  route("get", "/media/metadata", "Any", (_, c) => media.metadata(c));
  route("get", "/media", "Any", (q, c) => media.list(q.query, c));
  route(
    "post",
    "/media/upload",
    "Any",
    (q, c) => media.upload(q.body, c),
    true,
  );
  route("patch", "/media/reorder", "Any", (q, c) => media.reorder(q.body, c));
  route("get", "/media/:id/content", "Content", (q, c) =>
    media.content(q.params.id, c, q.query.variant || "gallery"),
  );
  route("get", "/media/:id", "Any", (q, c) => media.details(q.params.id, c));
  route("patch", "/media/:id/primary", "Any", (q, c) =>
    media.mutate(q.params.id, "primary", {}, c),
  );
  route("patch", "/media/:id", "Any", (q, c) =>
    media.mutate(q.params.id, "rename", q.body, c),
  );
  route("delete", "/media/:id", "Any", (q, c) =>
    media.mutate(q.params.id, "delete", {}, c),
  );
  for (const root of ["vendor", "admin"]) {
    const role = root === "admin" ? "Admin" : "Vendor";
    route("get", `/${root}/media`, role, (q, c) => media.list(q.query, c));
    route(
      "post",
      `/${root}/media/upload`,
      role,
      (q, c) => media.upload(q.body, c),
      true,
    );
    route("delete", `/${root}/media/:id`, role, (q, c) =>
      media.mutate(q.params.id, "delete", {}, c),
    );
  }
  route("get", "/admin/media/statistics", "Admin", (_, c) =>
    media.statistics(c),
  );
  route("get", "/admin/media/:id", "Admin", (q, c) =>
    media.details(q.params.id, c),
  );
  for (const action of ["approve", "reject", "hide", "restore"])
    route("patch", `/admin/media/:id/${action}`, "Admin", (q, c) =>
      media.mutate(q.params.id, action, q.body, c),
    );
  for (const [path, type] of [
    ["services", "Service"],
    ["packages", "Package"],
    ["vendors", "Vendor"],
  ]) {
    route("get", `/${path}/:id/media`, "Public", (q, c) =>
      media.list(q.query, c, { type, id: q.params.id }),
    );
    route(
      "post",
      `/${path}/:id/media`,
      "Vendor",
      (q, c) =>
        media.upload({ ...q.body, entityType: type, entityId: q.params.id }, c),
      true,
    );
    route("delete", `/${path}/:id/media/:mediaId`, "Vendor", async (q, c) => {
      const { row } = await media.lockMedia(q.params.mediaId, c);
      if (
        row.EntityType !== type ||
        row.EntityId.toLowerCase() !== q.params.id.toLowerCase()
      )
        throw Object.assign(new Error("Image not found."), { status: 404 });
      return media.mutate(q.params.mediaId, "delete", {}, c);
    });
  }
  route(
    "post",
    "/reviews/:id/images",
    "Any",
    (q, c) =>
      media.upload(
        {
          ...q.body,
          entityType: "Review",
          entityId: q.params.id,
          purpose: "Gallery",
        },
        c,
      ),
    true,
  );
  route("get", "/reviews/:id/images", "Public", (q, c) =>
    media.list(q.query, c, { type: "Review", id: q.params.id }),
  );
  route("delete", "/reviews/:id/images/:imageId", "Any", async (q, c) => {
    const { row } = await media.lockMedia(q.params.imageId, c);
    if (
      row.EntityType !== "Review" ||
      row.EntityId.toLowerCase() !== q.params.id.toLowerCase()
    )
      throw Object.assign(new Error("Image not found."), { status: 404 });
    return media.mutate(q.params.imageId, "delete", {}, c);
  });
  router.use((error, req, res, next) =>
    res.headersSent ? next(error) : mediaError(error, res),
  );
  return router;
}
export default createMediaRouter();
