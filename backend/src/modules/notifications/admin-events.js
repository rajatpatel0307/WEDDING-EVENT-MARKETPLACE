import { sequelize } from "../../config/database.js";
const events = {
  PAYOUT_REQUESTED: "Payout requested",
  CUSTOMER_BOOKING_CREATED: "New booking",
  BOOKING_CANCELLED: "Booking cancelled",
  VENDOR_SERVICE_SUBMITTED: "Service awaiting approval",
  VENDOR_SERVICE_RESUBMITTED: "Service resubmitted",
  ADMIN_VENDOR_APPROVED: "Vendor approved",
  ADMIN_VENDOR_REJECTED: "Vendor rejected",
  SERVICE_APPROVE: "Service approved",
  SERVICE_REJECT: "Service rejected",
  CUSTOMER_PAYMENT_FAILED: "Payment failed",
  BOOKING_REFUND_INITIATED: "Refund requested",
  BOOKING_PAYOUT_REVIEW_REQUIRED: "Payout needs reconciliation",
  ADMIN_PAYOUT_DECISION: "Payout status updated",
  ADMIN_PAYOUT_FAILED: "Payout failed",
};
export async function notifyAdmins(action, entity, id, transaction) {
  if (!events[action] || !/^[a-f\d-]{36}$/i.test(String(id))) return;
  await sequelize.query(
    "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) SELECT u.UserId,'AdminEvent',:title,:message,:entity,:id FROM dbo.Users u WHERE u.IsActive=1 AND u.IsBlocked=0 AND EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=u.UserId AND r.RoleCode='ADMIN' AND r.IsActive=1)",
    {
      replacements: {
        title: events[action],
        message: `${events[action]}. Open the record to review its current state.`,
        entity: `Admin${entity}`.slice(0, 50),
        id,
      },
      transaction,
    },
  );
}
export async function notifySignup(userId, transaction) {
  await sequelize.query(
    "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) SELECT u.UserId,'AdminEvent',CASE WHEN v.VendorId IS NULL THEN 'New customer registration' ELSE 'New vendor application' END,'A new account was registered. Review the account details.',CASE WHEN v.VendorId IS NULL THEN 'AdminCustomer' ELSE 'AdminVendor' END,COALESCE(v.VendorId,:user) FROM dbo.Users u OUTER APPLY(SELECT VendorId FROM dbo.Vendors WHERE UserId=:user) v WHERE u.IsActive=1 AND u.IsBlocked=0 AND EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=u.UserId AND r.RoleCode='ADMIN' AND r.IsActive=1)",
    { replacements: { user: userId }, transaction },
  );
}
