import { Router, json } from "express";
import { createHash } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../auth/token.service.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import * as cms from "./cms.service.js";
import * as support from "./support.service.js";
export function createCMSRouter({ authenticateRequest = authenticate } = {}) {
  const router = Router(),
    reads = rateLimit({
      windowMs: 60000,
      limit: 180,
      message: { message: "Too many requests. Please retry shortly." },
    }),
    writes = rateLimit({
      windowMs: 60000,
      limit: 30,
      message: { message: "Too many changes. Please retry shortly." },
    });
  const error = (e, res) => {
    const code = e.extensions?.code,
      status =
        e.name === "ZodError"
          ? 400
          : code === "UNAUTHENTICATED"
            ? 401
            : code === "FORBIDDEN"
              ? 403
              : code === "RATE_LIMITED"
                ? 429
                : e.name === "SequelizeUniqueConstraintError"
                  ? 409
                  : e.status || 500;
    res.status(status).json({
      success: false,
      message:
        status >= 500
          ? "This service is temporarily unavailable."
          : e.name === "ZodError"
            ? e.issues.map((x) => x.message).join(" ")
            : e.message,
    });
  };
  function route(method, path, role, fn) {
    router[method](
      path,
      method === "get" ? reads : writes,
      async (req, res, next) => {
        try {
          req.cmsContext = {
            req,
            res,
            auth: role === "Public" ? null : await authenticateRequest(req),
          };
          if (role === "Admin") requireRole(req.cmsContext, "ADMIN");
          else if (role === "User") requireAuth(req.cmsContext);
          if (
            method !== "get" &&
            (req.get("origin") !==
              (process.env.FRONTEND_URL || "http://localhost:5173") ||
              ![
                "x-cms-request",
                "x-admin-request",
                "x-customer-request",
                "x-vendor-request",
              ].some((h) => req.get(h) === "1"))
          )
            return res.status(403).json({
              success: false,
              message: "Request origin is not allowed.",
            });
          if (role !== "Public")
            res.set({
              "Cache-Control": "no-store",
              "X-Robots-Tag": "noindex, nofollow",
            });
          next();
        } catch (e) {
          error(e, res);
        }
      },
      json({ limit: "1mb" }),
      async (req, res) => {
        try {
          const result = await fn(req, req.cmsContext);
          if (result?.__public) {
            const payload = result.data,
              etag = `"${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}"`;
            res.set({
              "Cache-Control": "public, max-age=0, must-revalidate",
              ETag: etag,
            });
            if (req.get("if-none-match") === etag) return res.status(304).end();
            return res.json({ success: true, data: payload });
          }
          res.json({ success: true, data: result });
        } catch (e) {
          error(e, res);
        }
      },
    );
  }
  route("get", "/cms/:key", "Public", async (q) => ({
    __public: true,
    data: await cms.publicPage(q.params.key),
  }));
  route("post", "/contact", "Public", (q, c) => support.submit(q.body, c));
  route("get", "/admin/cms/pages", "Admin", (_, c) => cms.pages(c));
  route("post", "/admin/cms/pages", "Admin", (q, c) =>
    cms.draft(q.body.pageKey, c, q.body.sourceId),
  );
  route("get", "/admin/cms/pages/:id", "Admin", (q, c) =>
    cms.details(q.params.id, c),
  );
  route("put", "/admin/cms/pages/:id", "Admin", (q, c) =>
    cms.save(q.params.id, q.body, c),
  );
  route("post", "/admin/cms/pages/:id/publish", "Admin", (q, c) =>
    cms.publish(q.params.id, q.body, c),
  );
  route("post", "/admin/cms/pages/:id/archive", "Admin", (q, c) =>
    cms.archive(q.params.id, c),
  );
  route("get", "/admin/cms/pages/:id/versions", "Admin", async (q, c) => {
    const page = await cms.details(q.params.id, c);
    return (await cms.pages(c)).filter((p) => p.pageKey === page.pageKey);
  });
  route("get", "/admin/contact-inquiries/staff", "Admin", (_, c) =>
    support.staff(c),
  );
  route("get", "/admin/contact-inquiries", "Admin", (q, c) =>
    support.list(q.query, c),
  );
  route("get", "/admin/contact-inquiries/:id", "Admin", (q, c) =>
    support.details(q.params.id, c),
  );
  for (const action of ["status", "assign", "notes", "reply"])
    route(
      action === "status" || action === "assign" ? "patch" : "post",
      `/admin/contact-inquiries/:id/${action}`,
      "Admin",
      (q, c) => support.change(q.params.id, action, q.body, c),
    );
  route("get", "/legal/current", "Public", () => cms.legalCurrent());
  route("post", "/legal/accept", "User", (q, c) => cms.accept(q.body, c));
  route("get", "/legal/acceptance-status", "User", (_, c) =>
    cms.acceptanceStatus(c),
  );
  route("post", "/privacy-requests", "User", (q, c) =>
    support.privacySubmit(q.body, c),
  );
  route("get", "/privacy-requests/my-requests", "User", (q, c) =>
    support.privacyList(q.query, c),
  );
  route("get", "/admin/privacy-requests", "Admin", (q, c) =>
    support.privacyList(q.query, c, true),
  );
  route("patch", "/admin/privacy-requests/:id/status", "Admin", (q, c) =>
    support.privacyChange(q.params.id, q.body, c),
  );
  router.use((e, req, res, next) =>
    res.headersSent ? next(e) : error(e, res),
  );
  return router;
}
export default createCMSRouter();
