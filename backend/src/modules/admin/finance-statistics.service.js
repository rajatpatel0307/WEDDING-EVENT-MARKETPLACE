import { requireRole } from "../../middleware/auth.middleware.js";
import { select } from "./admin.repository.js";

const countStatus = (column, status, key) => `COALESCE(SUM(CASE WHEN ${column}='${status}' THEN 1 ELSE 0 END),0) AS ${key}`;
const queries = {
  "refund-review": `SELECT COUNT_BIG(*) AS total,${countStatus("Status", "Requested", "requested")},${countStatus("Status", "Approved", "approved")},${countStatus("Status", "Rejected", "rejected")} FROM dbo.CustomerRefundRequests`,
  refunds: `SELECT COUNT_BIG(*) AS total,${["Pending", "Processing", "Completed", "Rejected", "Failed"].map((status) => countStatus("RefundStatus", status, status.toLowerCase())).join(",")} FROM dbo.Refunds`,
  payouts: `SELECT COUNT_BIG(*) AS total,${["Pending", "Processing", "Paid", "Failed", "OnHold"].map((status) => countStatus("PayoutStatus", status, status.toLowerCase())).join(",")} FROM dbo.VendorPayouts`,
  commission: "SELECT COUNT_BIG(*) AS total,COALESCE(SUM(CommissionAmount),0) AS commission,COALESCE(SUM(BookingAmount),0) AS bookingValue,COALESCE(AVG(CAST(CommissionRate AS decimal(18,4))),0) AS averageRate FROM dbo.PlatformCommission",
  reconciliation: `SELECT
    (SELECT COUNT_BIG(*) FROM dbo.CustomerPaymentOrders) AS total,
    (SELECT COUNT_BIG(*) FROM dbo.CustomerPaymentOrders WHERE Status='Created') AS created,
    (SELECT COUNT_BIG(*) FROM dbo.CustomerPaymentOrders WHERE Status='Paid') AS paid,
    (SELECT COUNT_BIG(*) FROM dbo.CustomerPaymentOrders WHERE Status='Review') AS review,
    (SELECT COUNT_BIG(*) FROM dbo.PaymentWebhookEvents WHERE Status<>'Processed') AS events,
    (SELECT COUNT_BIG(*) FROM dbo.Booking b OUTER APPLY(SELECT SUM(Amount) AS captured FROM dbo.Payments p WHERE p.BookingId=b.BookingId AND p.Currency='INR' AND p.PaymentStatus IN('Success','Refunded')) p WHERE b.PaidAmount<>COALESCE(p.captured,0)) AS discrepancies`,
};

export async function financeStatistics(section, ctx) {
  requireRole(ctx, "ADMIN");
  if (!Object.hasOwn(queries, section)) throw Object.assign(new Error("Finance section not found."), { status: 404 });
  const [row] = await select(queries[section]);
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]));
}
