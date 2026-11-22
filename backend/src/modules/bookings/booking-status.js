import { fail } from "../admin/booking-finance.js";

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
