export const statuses = [
  "Pending",
  "Approved",
  "Rejected",
  "Hidden",
  "Flagged",
];
export const reasons = [
  "Spam",
  "Fake review",
  "Abusive language",
  "Irrelevant content",
  "Personal information",
  "Harassment",
  "Conflict of interest",
  "Other",
];
export const sameId = (a, b) =>
  String(a).toLowerCase() === String(b).toLowerCase();
export function assertEligibility(booking, customerId, item) {
  if (!booking || !sameId(booking.CustomerId, customerId))
    throw Object.assign(new Error("Booking not found in your account."), {
      status: 404,
    });
  if (booking.BookingStatus !== "Completed")
    throw Object.assign(new Error("Only completed bookings can be reviewed."), {
      status: 409,
    });
  if (
    item &&
    (!sameId(item.BookingId, booking.BookingId) ||
      !sameId(item.VendorId, booking.VendorId))
  )
    throw Object.assign(new Error("Invalid booking item."), { status: 409 });
}
export function editAllowed(row, now = Date.now()) {
  const days = Math.max(
    0,
    Math.min(365, Number(process.env.REVIEW_EDIT_DAYS || 14)),
  );
  return (
    !row.DeletedAt &&
    !["Hidden", "Rejected", "Flagged"].includes(row.ModerationStatus) &&
    now - new Date(row.CreatedAt).getTime() <= days * 86400000
  );
}
export function assertOrderEligibility(order, customerId, item) {
  if (!order || !sameId(order.CustomerId, customerId))
    throw Object.assign(new Error("Order not found in your account."), { status: 404 });
  if (order.OrderStatus !== "Delivered" || order.PaymentStatus !== "Paid")
    throw Object.assign(new Error("Only paid, delivered orders can be reviewed."), { status: 409 });
  if (!item || !sameId(item.OrderId, order.OrderId) || item.FulfillmentStatus !== "Delivered")
    throw Object.assign(new Error("Choose a delivered item from this order."), { status: 409 });
}
export const publicPredicate = (alias = "r") =>
  `${alias}.ModerationStatus='Approved' AND ${alias}.IsPublished=1 AND ${alias}.DeletedAt IS NULL AND ${alias}.IsVerified=1 AND (
    (${alias}.OrderId IS NULL AND EXISTS(SELECT 1 FROM dbo.Booking rb WHERE rb.BookingId=${alias}.BookingId AND rb.CustomerId=${alias}.CustomerId AND rb.VendorId=${alias}.VendorId AND rb.BookingStatus='Completed')) OR
    (${alias}.BookingId IS NULL AND EXISTS(SELECT 1 FROM dbo.Orders ro JOIN dbo.OrderLineItems ri ON ri.OrderId=ro.OrderId WHERE ro.OrderId=${alias}.OrderId AND ro.CustomerId=${alias}.CustomerId AND ro.OrderStatus='Delivered' AND ro.PaymentStatus='Paid' AND ri.ItemId=${alias}.OrderItemId AND ri.VendorId=${alias}.VendorId AND ri.FulfillmentStatus='Delivered'))
  )`;
