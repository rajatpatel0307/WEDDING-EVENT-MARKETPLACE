import { Router } from "express";
import { authenticate } from "../auth/token.service.js";
import { requireApprovedVendor } from "../../middleware/auth.middleware.js";

// Every endpoint added to /api/vendor inherits the same live approval check.
export function createVendorRouter({
  authenticateRequest = authenticate,
} = {}) {
  const router = Router();
  router.use(async (req, res, next) => {
    try {
      req.vendorContext = { req, res, auth: await authenticateRequest(req) };
      req.vendorUser = requireApprovedVendor(req.vendorContext);
      res.set("Cache-Control", "no-store");
      next();
    } catch (error) {
      next(error);
    }
  });
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
      code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    res
      .status(status)
      .json({
        success: false,
        message:
          status === 500
            ? "Vendor workspace is temporarily unavailable."
            : error.message,
        data: null,
      });
  });
  return router;
}
export default createVendorRouter();
