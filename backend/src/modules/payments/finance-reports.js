import { z } from "zod";
import * as repo from "../admin/admin.repository.js";
import {
  requireRole,
  requireApprovedVendor,
} from "../../middleware/auth.middleware.js";
import { dateBounds } from "../admin/admin.validation.js";
import { refreshOrder } from "./reconciliation.js";
import { fail } from "../admin/booking-finance.js";
const filters = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    q: z.string().trim().max(150).default(""),
    status: z
      .enum(["", "Created", "Paid", "Review", "Pending", "Processed"])
      .default(""),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "Invalid date range.",
  });
export async function overview(input, ctx) {
  requireRole(ctx, "ADMIN");
  const q = filters.parse(input),
    bounds = dateBounds(q.from, q.to),
    params = { from: bounds.from, to: bounds.to };
  const range =
    "(:from IS NULL OR CreatedAt>=:from) AND (:to IS NULL OR CreatedAt< :to)";
  const [totals] = await repo.select(
    `SELECT
    (SELECT COALESCE(SUM(Amount),0) FROM dbo.Payments WHERE PaymentStatus IN('Success','Refunded') AND Currency='INR' AND ${range}) AS captured,
    (SELECT COUNT(*) FROM dbo.CustomerPaymentOrders WHERE Status='Created' AND ${range}) AS pending,
    (SELECT COUNT(*) FROM dbo.Payments WHERE PaymentStatus='Failed' AND ${range}) AS failed,
    (SELECT COUNT(*) FROM dbo.Payments WHERE PaymentStatus IN('Success','Refunded') AND Currency='INR' AND ${range}) AS successful,
    (SELECT COALESCE(SUM(RefundAmount),0) FROM dbo.Refunds WHERE RefundStatus='Completed' AND ${range}) AS refunded,
    (SELECT COALESCE(SUM(RefundAmount),0) FROM dbo.Refunds WHERE RefundStatus IN('Pending','Processing') AND ${range}) AS refundPending,
    (SELECT COALESCE(SUM(CommissionAmount),0) FROM dbo.PlatformCommission WHERE ${range}) AS commission,
    (SELECT COALESCE(SUM(NetAmount),0) FROM dbo.VendorPayouts WHERE PayoutStatus IN('Pending','OnHold') AND ${range}) AS payables,
    (SELECT COALESCE(SUM(NetAmount),0) FROM dbo.VendorPayouts WHERE PayoutStatus='Paid' AND ${range}) AS paid,
    (SELECT COUNT(*) FROM dbo.VendorPayouts WHERE PayoutStatus='Failed' AND ${range}) AS failedPayouts`,
    params,
  );
  const monthly = await repo.select(
    `SELECT CONVERT(char(7),CreatedAt,126) AS month,SUM(CASE WHEN PaymentStatus IN('Success','Refunded') THEN Amount ELSE 0 END) AS captured,SUM(CASE WHEN PaymentStatus='Failed' THEN 1 ELSE 0 END) AS failed FROM dbo.Payments WHERE Currency='INR' AND ${range} GROUP BY CONVERT(char(7),CreatedAt,126) ORDER BY month`,
    params,
  );
  const methods = await repo.select(
    `SELECT PaymentMethod AS method,SUM(Amount) AS amount FROM dbo.Payments WHERE PaymentStatus IN('Success','Refunded') AND Currency='INR' AND ${range} GROUP BY PaymentMethod`,
    params,
  );
  const trends = await repo.select(
    `SELECT CONVERT(char(7),CreatedAt,126) AS month,'refunds' AS kind,SUM(RefundAmount) AS amount FROM dbo.Refunds WHERE RefundStatus='Completed' AND ${range} GROUP BY CONVERT(char(7),CreatedAt,126)
    UNION ALL SELECT CONVERT(char(7),CreatedAt,126),'payouts',SUM(NetAmount) FROM dbo.VendorPayouts WHERE PayoutStatus='Paid' AND ${range} GROUP BY CONVERT(char(7),CreatedAt,126)
    UNION ALL SELECT CONVERT(char(7),CreatedAt,126),'commission',SUM(CommissionAmount) FROM dbo.PlatformCommission WHERE ${range} GROUP BY CONVERT(char(7),CreatedAt,126)`,
    params,
  );
  const byMonth = new Map(
    monthly.map((m) => [
      m.month,
      { ...m, refunds: 0, payouts: 0, commission: 0 },
    ]),
  );
  for (const row of trends) {
    if (!byMonth.has(row.month))
      byMonth.set(row.month, {
        month: row.month,
        captured: 0,
        failed: 0,
        refunds: 0,
        payouts: 0,
        commission: 0,
      });
    byMonth.get(row.month)[row.kind] = Number(row.amount);
  }
  return {
    totals,
    monthly: [...byMonth.values()].sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
    methods,
    currency: "INR",
    commissionPolicy:
      "Commission is recognized from recorded booking settlements. Refunds are charged against vendor payables under the existing policy; recorded commission is retained. Charts group records by creation month.",
  };
}
export async function reconciliation(input, ctx) {
  requireRole(ctx, "ADMIN");
  const q = filters.parse(input),
    p = {
      status: q.status,
      search: `%${q.q.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`,
      offset: (q.page - 1) * 20,
    };
  const where =
    "WHERE (:status = '' OR o.Status=:status) AND (b.BookingNumber LIKE :search OR o.GatewayOrderId LIKE :search)";
  const [count] = await repo.select(
    `SELECT COUNT(*) AS total FROM dbo.CustomerPaymentOrders o JOIN dbo.Booking b ON b.BookingId=o.BookingId ${where}`,
    p,
  );
  const orders = await repo.select(
    `SELECT o.OrderId AS id,o.BookingId AS bookingId,b.BookingNumber AS booking,o.GatewayOrderId AS reference,o.AmountMinor/100.0 AS amount,o.Status AS status,o.CreatedAt AS createdAt,o.LastCheckedAt AS checkedAt FROM dbo.CustomerPaymentOrders o JOIN dbo.Booking b ON b.BookingId=o.BookingId ${where} ORDER BY o.CreatedAt DESC,o.OrderId OFFSET :offset ROWS FETCH NEXT 20 ROWS ONLY`,
    p,
  );
  const events = await repo.select(
    "SELECT TOP(50) EventId AS id,EventType AS type,Status AS status,Attempts AS attempts,LastError AS error,CreatedAt AS createdAt FROM dbo.PaymentWebhookEvents WHERE Status<>'Processed' ORDER BY CreatedAt,EventId",
  );
  const discrepancies = await repo.select(
    "SELECT TOP(50) b.BookingId AS id,b.BookingNumber AS booking,b.PaidAmount AS recorded,COALESCE(p.captured,0) AS captured FROM dbo.Booking b OUTER APPLY(SELECT SUM(Amount) AS captured FROM dbo.Payments p WHERE p.BookingId=b.BookingId AND p.Currency='INR' AND p.PaymentStatus IN('Success','Refunded')) p WHERE b.PaidAmount<>COALESCE(p.captured,0) ORDER BY b.CreatedAt,b.BookingId",
  );
  return {
    orders,
    events,
    discrepancies,
    total: Number(count.total),
    page: q.page,
    pageSize: 20,
  };
}
export async function refresh(id, ctx) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const result = await refreshOrder(id);
  await repo.auditAdmin(
    ctx,
    "ADMIN_PAYMENT_RECONCILED",
    "CustomerPaymentOrders",
    id,
    null,
    { checked: true },
  );
  return result;
}
export async function retryEvent(id, ctx) {
  requireRole(ctx, "ADMIN");
  z.string()
    .regex(/^[A-Za-z0-9_-]{1,150}$/)
    .parse(id);
  return repo.transaction(async (tx) => {
    const row = await repo.lockRecord(
      { table: "PaymentWebhookEvents", id: "EventId" },
      id,
      tx,
    );
    if (row.Status === "Processed")
      fail("The event has already been processed.", 409);
    if (row.LeaseUntil && new Date(row.LeaseUntil) > new Date())
      fail("Event processing is in progress.", 409);
    await repo.update(
      { table: "PaymentWebhookEvents", id: "EventId" },
      id,
      { Status: "Pending", NextAttemptAt: new Date(), LastError: null },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "ADMIN_PAYMENT_EVENT_RETRY",
      "PaymentWebhookEvents",
      id,
      { status: row.Status },
      { status: "Pending" },
      tx,
    );
    return { message: "Verified event queued for processing." };
  });
}
export async function earnings(ctx) {
  const user = requireApprovedVendor(ctx),
    params = { id: user.vendor.id };
  const [totals] = await repo.select(
    `SELECT
    (SELECT COALESCE(SUM(p.Amount),0) FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId WHERE b.VendorId=:id AND p.PaymentStatus IN('Success','Refunded') AND p.Currency='INR') AS captured,
    (SELECT COALESCE(SUM(f.RefundAmount),0) FROM dbo.Refunds f JOIN dbo.Booking b ON b.BookingId=f.BookingId WHERE b.VendorId=:id AND f.RefundStatus='Completed') AS refunded,
    (SELECT COALESCE(SUM(CommissionAmount),0) FROM dbo.PlatformCommission WHERE VendorId=:id) AS commission,
    (SELECT COALESCE(SUM(NetAmount),0) FROM dbo.VendorPayouts WHERE VendorId=:id AND PayoutStatus='Pending' AND ReviewStatus='Approved') AS available,
    (SELECT COALESCE(SUM(NetAmount),0) FROM dbo.VendorPayouts WHERE VendorId=:id AND PayoutStatus='OnHold') AS held,
    (SELECT COALESCE(SUM(NetAmount),0) FROM dbo.VendorPayouts WHERE VendorId=:id AND PayoutStatus='Processing') AS processing,
    (SELECT COALESCE(SUM(NetAmount),0) FROM dbo.VendorPayouts WHERE VendorId=:id AND PayoutStatus='Paid') AS paid,
    (SELECT COUNT(*) FROM dbo.VendorPayouts WHERE VendorId=:id AND PayoutStatus='Failed') AS failed`,
    params,
  );
  return totals;
}
export const csvCell = (value) =>
  '"' +
  String(value ?? "")
    .replace(/^[=+\-@\t\r]/, "'$&")
    .replaceAll('"', '""') +
  '"';
export async function exportReport(input, ctx) {
  requireRole(ctx, "ADMIN");
  const q = filters.parse(input),
    bounds = dateBounds(q.from, q.to);
  // Bounded export, with explicit disclosure in the filename/UI. No unbounded financial scans.
  const rows = await repo.select(
    "SELECT TOP(10000) p.PaymentReference AS reference,b.BookingNumber AS booking,v.BusinessName AS vendor,p.Amount AS amount,p.Currency AS currency,p.PaymentStatus AS status,p.PaymentMethod AS method,p.GatewayName AS gateway,p.CreatedAt AS createdAt FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId JOIN dbo.Vendors v ON v.VendorId=b.VendorId WHERE (:from IS NULL OR p.CreatedAt>=:from) AND (:to IS NULL OR p.CreatedAt< :to) ORDER BY p.CreatedAt DESC,p.PaymentId",
    { from: bounds.from, to: bounds.to },
  );
  const keys = [
    "reference",
    "booking",
    "vendor",
    "amount",
    "currency",
    "status",
    "method",
    "gateway",
    "createdAt",
  ];
  return (
    "\ufeff" +
    [
      keys.join(","),
      ...rows.map((r) =>
        keys
          .map((k) => csvCell(r[k] instanceof Date ? r[k].toISOString() : r[k]))
          .join(","),
      ),
    ].join("\r\n")
  );
}
