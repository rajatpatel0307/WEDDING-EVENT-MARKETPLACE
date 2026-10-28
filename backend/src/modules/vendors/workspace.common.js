import { z } from "zod";
import { requireApprovedVendor } from "../../middleware/auth.middleware.js";
import * as repo from "../admin/admin.repository.js";
export { repo };
export const scope = (ctx) => {
  const user = requireApprovedVendor(ctx);
  return { user, id: user.vendor.id };
};
export const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
export const audit = (ctx, action, entity, id, old, next, tx) =>
  repo.auditAdmin(ctx, `VENDOR_${action}`, entity, id, old, next, tx);
export const assertVersion = (row, expected) => {
  if (
    expected &&
    row.UpdatedAt &&
    new Date(row.UpdatedAt).getTime() !== new Date(expected).getTime()
  )
    fail("This record changed. Refresh before saving.", 409);
};
export const targets = {
  services: { table: "Services", pk: "ServiceId" },
  packages: { table: "ServicePackages", pk: "PackageId", parent: true },
  locations: { table: "VendorLocations", pk: "VendorLocationId" },
  offers: { table: "Offers", pk: "OfferId", noDate: true },
  coupons: { table: "Coupons", pk: "CouponId", noDate: true },
  bookings: { table: "Booking", pk: "BookingId" },
  quotations: { table: "Quotations", pk: "QuotationId" },
  documents: { table: "VendorDocuments", pk: "VendorDocumentId" },
  conversations: { table: "Conversations", pk: "ConversationId", noDate: true },
  items: {
    table: "ServiceItems",
    pk: "ServiceItemId",
    parent: true,
    numeric: true,
    noDate: true,
  },
};
export async function owned(kind, recordId, vendorId, tx, lock = true) {
  const target = targets[kind];
  if (!target) fail("Resource not found.", 404);
  const id = target.numeric
    ? z.coerce.number().int().positive().parse(recordId)
    : z.guid().parse(recordId);
  const [row] = await repo.select(
    `SELECT t.* FROM dbo.[${target.table}] t ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""} ${target.parent ? "JOIN dbo.Services s ON s.ServiceId=t.ServiceId" : ""} WHERE t.[${target.pk}]=:recordId AND ${target.parent ? "s" : "t"}.VendorId=:vendorId`,
    { recordId: id, vendorId },
    tx,
  );
  if (!row) fail("Record not found in your business.", 404);
  return row;
}
export async function notifyCustomer(
  customerId,
  title,
  message,
  referenceType,
  referenceId,
  tx,
) {
  await repo.select(
    "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) VALUES(:user,'VendorUpdate',:title,:message,:type,:id)",
    {
      user: customerId,
      title,
      message: message.slice(0, 2000),
      type: referenceType,
      id: referenceId,
    },
    tx,
  );
}
