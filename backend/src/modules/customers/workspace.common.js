import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as repo from "../admin/admin.repository.js";
export { repo };
export const scope = (ctx) => {
  const user = requireRole(ctx, "CUSTOMER");
  return { user, id: user.id };
};
export const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
export const audit = (ctx, action, entity, id, old, next, tx) =>
  repo.auditAdmin(ctx, `CUSTOMER_${action}`, entity, id, old, next, tx);
const targets = {
  events: ["Events", "EventId", "CustomerId"],
  bookings: ["Booking", "BookingId", "CustomerId"],
  quotations: ["Quotations", "QuotationId", "CustomerId"],
  conversations: ["Conversations", "ConversationId", "CustomerId"],
  addresses: ["Addresses", "AddressId", "UserId"],
  notifications: ["Notifications", "NotificationId", "UserId"],
};
export async function owned(kind, recordId, id, tx, lock = true) {
  z.guid().parse(recordId);
  const t = Object.hasOwn(targets, kind) ? targets[kind] : null;
  if (!t) fail("Resource not found.", 404);
  const [row] = await repo.select(
    `SELECT * FROM dbo.[${t[0]}] ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE [${t[1]}]=:recordId AND [${t[2]}]=:id`,
    { recordId, id },
    tx,
  );
  if (!row) fail("Record not found in your account.", 404);
  return row;
}
export async function notify(user, title, message, type, id, tx) {
  await repo.insert(
    { table: "Notifications", id: "NotificationId" },
    {
      UserId: user,
      NotificationType: "CustomerUpdate",
      Title: title,
      Message: message.slice(0, 2000),
      ReferenceType: type,
      ReferenceId: id,
      IsRead: 0,
    },
    tx,
  );
}
export async function notifyBusiness(vendor, title, message, type, id, tx) {
  const [v] = await repo.select(
    "SELECT UserId FROM dbo.Vendors WHERE VendorId=:vendor",
    { vendor },
    tx,
  );
  if (v) await notify(v.UserId, title, message, type, id, tx);
}
export const eligibleVendor =
  "v.IsActive=1 AND v.VerificationStatus='Approved' AND u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1";
export const pageInput = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export const insert = async (table, id, values, tx) =>
  (await repo.insert({ table, id }, values, tx))[0];
