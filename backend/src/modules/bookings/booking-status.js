import { fail, minor } from "../admin/booking-finance.js";

export function manualPaymentBlockedReason(row, ledger, summary) {
  if (!["Accepted", "PaymentPending", "Confirmed", "InProgress"].includes(row.BookingStatus))
    return "Payments can be recorded after accepting an active booking.";
  if (summary.refunded > 0 || summary.refundPending > 0 || ["RefundPending", "Refunded", "PartiallyRefunded"].includes(row.PaymentStatus))
    return "Reconcile the booking refunds before recording a payment.";
  if (minor(summary.paid) !== minor(row.PaidAmount))
    return "Reconcile the recorded payment balance before marking this booking as paid.";
  if (row.PaymentStatus === "Paid" || summary.remaining <= 0)
    return "This booking is already paid.";
  if (ledger.payments.some((payment) => ["Pending", "Processing"].includes(payment.PaymentStatus)))
    return "Resolve the pending payment before recording another payment.";
  if (ledger.payouts.some((payout) => ["Paid", "Processing"].includes(payout.PayoutStatus)))
    return "Reconcile the existing payout before recording a payment.";
  return null;
}

export function actionsFor(row) {
  const status = row.status || row.BookingStatus;
  return [
    "view",
    ...(["Pending", "Accepted", "PaymentPending", "Confirmed"].includes(status) ? ["cancel"] : []),
    ...(["Accepted", "PaymentPending"].includes(status) ? ["Confirmed"] : []),
    ...(status === "Confirmed" ? ["InProgress", "Disputed"] : []),
    ...(status === "InProgress" ? ["Completed", "Disputed"] : []),
    ...(["Cancelled", "Rejected"].includes(status) ? ["refund"] : []),
  ];
}

export function assertTransition(row, next) {
  const transitions = {
    Pending: ["Cancelled"],
    Accepted: ["Confirmed", "Cancelled"],
    PaymentPending: ["Confirmed", "Cancelled"],
    Confirmed: ["InProgress", "Cancelled", "Disputed"],
    InProgress: ["Completed", "Disputed"],
    Completed: ["Disputed"],
  };
  if (!transitions[row.BookingStatus]?.includes(next))
    fail("This booking status transition is not allowed.");
  if (next === "Confirmed" && Number(row.PaidAmount) < Number(row.AdvanceAmount))
    fail("The required advance payment has not been received.");
}
