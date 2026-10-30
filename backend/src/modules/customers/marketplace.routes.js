import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as d from "./workspace.discovery.js";
export function createMarketplaceRouter() {
  const r = Router();
  r.use(
    rateLimit({
      windowMs: 60000,
      limit: 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  const get = (path, fn) =>
    r.get(path, async (req, res) => {
      res.set("Cache-Control", "no-store");
      res.json({ success: true, data: await fn(req) });
    });
  get("/catalog", () => d.publicCatalog());
  get("/discover", (req) => d.publicDiscover(req.query));
  get("/services/:id", (req) =>
    d.publicServiceDetails(req.params.id, true, req.query),
  );
  get("/vendors/:id", (req) => d.publicVendorDetails(req.params.id));
  get("/services/:id/availability", (req) =>
    d.publicAvailability(req.params.id, req.query),
  );
  get("/packages/:id", (req) => d.publicPackage(req.params.id));
  r.use((e, req, res, next) => {
    if (res.headersSent) return next(e);
    const status = e.name === "ZodError" ? 400 : e.status || 500;
    res
      .status(status)
      .json({
        success: false,
        message:
          status >= 500
            ? "Discovery is temporarily unavailable. Please try again."
            : e.name === "ZodError"
              ? e.issues.map((i) => i.message).join(" ")
              : e.message,
      });
  });
  return r;
}
export default createMarketplaceRouter();
