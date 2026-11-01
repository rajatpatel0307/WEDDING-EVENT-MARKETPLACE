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
export const publicPredicate = (alias = "r") =>
  `${alias}.ModerationStatus='Approved' AND ${alias}.IsPublished=1 AND ${alias}.DeletedAt IS NULL AND ${alias}.IsVerified=1 AND EXISTS(SELECT 1 FROM dbo.Booking rb WHERE rb.BookingId=${alias}.BookingId AND rb.CustomerId=${alias}.CustomerId AND rb.VendorId=${alias}.VendorId AND rb.BookingStatus='Completed')`;
