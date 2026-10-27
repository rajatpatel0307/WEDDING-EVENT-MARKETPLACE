import { z } from "zod";
import { TableHints } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  User,
  Role,
  Vendor,
  Category,
  VendorLocation,
  VendorDocument,
  Session,
} from "../../models/index.js";
import { requireRole } from "../../middleware/auth.middleware.js";
import { audit, fail } from "../auth/security.service.js";
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
  const admin = requireRole(ctx, "ADMIN");
  z.string().uuid().parse(input.id);
  z.enum(["Approved", "Rejected", "Suspended"]).parse(input.status);
  if (input.status === "Rejected" && !input.reason?.trim())
    fail("A rejection reason is required.");
  if ((input.reason || "").length > 1000)
    fail("Reason must be under 1000 characters.");
  return sequelize.transaction(async (transaction) => {
    const vendor = await Vendor.findByPk(input.id, {
      transaction,
      tableHint: TableHints.UPDLOCK,
    });
    if (!vendor) fail("Vendor not found.");
    const user = await User.findByPk(vendor.userId, { transaction });
    if (!user.emailVerified) fail("The vendor must verify their email first.");
    await vendor.update(
      {
        verificationStatus: input.status,
        rejectionReason: input.reason?.trim() || null,
        updatedAt: new Date(),
      },
      { transaction },
    );
    if (input.status === "Suspended")
      await Session.update(
        { revokedAt: new Date() },
        { where: { userId: vendor.userId }, transaction },
      );
    await audit(
      `VENDOR_${input.status.toUpperCase()}`,
      ctx,
      admin.id,
      vendor.id,
      transaction,
    );
    return vendor;
  });
}
