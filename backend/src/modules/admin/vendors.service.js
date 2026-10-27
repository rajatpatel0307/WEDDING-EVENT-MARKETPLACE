import { decideVendor } from "./vendor-verification.service.js";
import {
  User,
  Role,
  Vendor,
  Category,
  VendorLocation,
  VendorDocument,
} from "../../models/index.js";
import { requireRole } from "../../middleware/auth.middleware.js";
export async function listVendors(ctx, offset = 0) {
  requireRole(ctx, "ADMIN");
  return Vendor.findAll({
    include: [
      { model: User, as: "user", include: [{ model: Role, as: "roles" }] },
      { model: Category, as: "categories" },
      { model: VendorLocation, as: "locations" },
      { model: VendorDocument, as: "documents" },
    ],
    order: [["createdAt", "DESC"]],
    offset: Math.max(0, offset),
    limit: 25,
  });
}
export async function reviewVendor(input, ctx) {
  await decideVendor(
    input.id,
    input.status,
    {
      notes: input.notes || "",
      reason: input.reason || "",
      expectedStatus: input.expectedStatus || undefined,
    },
    ctx,
  );
  return Vendor.findByPk(input.id);
}
