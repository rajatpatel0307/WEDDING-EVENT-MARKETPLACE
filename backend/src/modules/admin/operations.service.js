import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as repo from "./admin.repository.js";
const fail = (message, status = 404) => {
  throw Object.assign(new Error(message), { status });
};
const definitions = {
  quotations: {
    table: "Quotations",
    pk: "QuotationId",
    fields:
      "t.QuotationNumber AS name,t.Status AS status,t.ValidUntil,t.SubTotal,t.DiscountAmount,t.TaxAmount,t.TotalAmount,t.CustomerMessage,t.VendorMessage,t.UpdatedAt",
    joins: "JOIN dbo.Events e ON e.EventId=t.EventId",
    extra: ",e.EventName,e.EventDate",
  },
  payments: {
    table: "Payments",
    pk: "PaymentId",
    fields:
      "t.PaymentReference AS name,t.PaymentStatus AS status,t.Amount,t.Currency,t.GatewayName,t.GatewayTransactionId,t.PaymentMethod,t.PaidAt",
    joins: "JOIN dbo.Booking b ON b.BookingId=t.BookingId",
    extra: ",b.BookingId,b.BookingNumber",
  },
  refunds: {
    table: "Refunds",
    pk: "RefundId",
    fields:
      "t.RefundReference AS name,t.RefundStatus AS status,t.RefundAmount,t.Reason,t.GatewayRefundId,t.ProcessedAt,t.PaymentId,t.Attempts,p.Currency",
    joins:
      "JOIN dbo.Booking b ON b.BookingId=t.BookingId JOIN dbo.Payments p ON p.PaymentId=t.PaymentId",
    extra: ",b.BookingId,b.BookingNumber,b.CancellationReason",
  },
  payouts: {
    table: "VendorPayouts",
    pk: "PayoutId",
    fields:
      "v.BusinessName AS name,t.PayoutStatus AS status,t.GrossAmount,t.PlatformCommission,t.TaxDeduction,t.RefundDeduction,t.ApplicableFees,t.NetAmount,t.PaidAt,t.ReviewStatus,t.ReviewReason,t.SettlementReference,t.UpdatedAt",
    joins: "JOIN dbo.Booking b ON b.BookingId=t.BookingId",
    extra: ",b.BookingId,b.BookingNumber,b.BookingStatus",
  },
  commission: {
    table: "PlatformCommission",
    pk: "CommissionId",
    fields:
      "v.BusinessName AS name,t.CommissionType,t.CommissionRate,t.BookingAmount,t.CommissionAmount",
    joins: "JOIN dbo.Booking b ON b.BookingId=t.BookingId",
    extra: ",b.BookingId,b.BookingNumber",
  },
};
export async function details(kind, id, ctx) {
  requireRole(ctx, "ADMIN");
  if (!Object.hasOwn(definitions, kind)) fail("Financial resource not found.");
  z.guid().parse(id);
  const d = definitions[kind];
  const vendorJoin = ["payments", "refunds"].includes(kind)
    ? "b.VendorId"
    : "t.VendorId";
  const [record] = await repo.select(
    `SELECT t.${d.pk} AS id,${d.fields},t.CreatedAt,v.VendorId,v.BusinessName AS vendor${d.extra || ""} FROM dbo.${d.table} t ${d.joins} JOIN dbo.Vendors v ON v.VendorId=${vendorJoin} WHERE t.${d.pk}=:id`,
    { id },
  );
  if (!record) fail("Record not found.");
  const history = await repo.select(
    "SELECT TOP(100) a.ActionType AS action,a.CreatedAt AS createdAt,u.FirstName AS actor,JSON_VALUE(a.NewValue,'$.note') AS note,JSON_VALUE(a.NewValue,'$.reference') AS reference FROM dbo.AuditLogs a LEFT JOIN dbo.Users u ON u.UserId=a.UserId WHERE a.EntityType=:entity AND a.EntityId=:id ORDER BY a.CreatedAt DESC,a.AuditLogId DESC",
    { id, entity: d.table },
  );
  let rows = [];
  if (kind === "quotations") {
    rows = await repo.select(
      "SELECT ItemName,Quantity,UnitPrice,DiscountAmount,LineTotal,ServiceId,PackageId FROM dbo.QuotationItems WHERE QuotationId=:id ORDER BY QuotationItemId",
      { id },
    );
    record.bookings = await repo.select(
      "SELECT BookingId AS id,BookingNumber AS name,BookingStatus AS status FROM dbo.Booking WHERE QuotationId=:id",
      { id },
    );
  } else if (kind === "payments") {
    rows = await repo.select(
      "SELECT TransactionId AS id,TransactionType,Amount,TransactionStatus,GatewayTransactionId,CreatedAt FROM dbo.PaymentTransactions WHERE PaymentId=:id ORDER BY CreatedAt,TransactionId",
      { id },
    );
    const captures = rows.filter(
      (row) =>
        row.TransactionType === "Capture" &&
        row.TransactionStatus === "Success",
    );
    record.reconciliation = !captures.length
      ? "No successful capture events are recorded in the transaction history."
      : Math.round(
            captures.reduce((sum, row) => sum + Number(row.Amount), 0) * 100,
          ) === Math.round(Number(record.Amount) * 100)
        ? "Recorded capture amounts match this payment."
        : "Payment and capture ledger amounts differ. Reconcile with the provider before further financial action.";
    record.refunds = await repo.select(
      "SELECT RefundId AS id,RefundReference AS name,RefundAmount AS amount,RefundStatus AS status FROM dbo.Refunds WHERE PaymentId=:id ORDER BY CreatedAt",
      { id },
    );
  }
  return {
    record,
    rows,
    history,
    settlementMode:
      process.env.PAYOUT_SETTLEMENT_MODE === "manual"
        ? "manual"
        : "unconfigured",
  };
}
export async function note(kind, id, input, ctx) {
  const body = z
    .object({ note: z.string().trim().min(3).max(2000) })
    .strict()
    .parse(input);
  await details(kind, id, ctx);
  await repo.auditAdmin(
    ctx,
    "ADMIN_NOTE_ADDED",
    definitions[kind].table,
    id,
    null,
    body,
  );
  return { message: "Administrative note recorded." };
}
export async function inbox(ctx, input = {}) {
  const user = requireRole(ctx, "ADMIN");
  const query = z
    .object({
      page: z.coerce.number().int().min(1).max(100000).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .parse(input);
  const [count] = await repo.select(
    "SELECT COUNT(*) AS unread FROM dbo.Notifications WHERE UserId=:user AND IsRead=0",
    { user: user.id },
  );
  const [total] = await repo.select(
    "SELECT COUNT(*) AS total FROM dbo.Notifications WHERE UserId=:user",
    { user: user.id },
  );
  const rows = await repo.select(
    "SELECT NotificationId AS id,Title AS title,Message AS message,ReferenceType AS referenceType,ReferenceId AS referenceId,IsRead AS [read],CreatedAt AS createdAt FROM dbo.Notifications WHERE UserId=:user ORDER BY CreatedAt DESC,NotificationId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY",
    {
      user: user.id,
      offset: (query.page - 1) * query.pageSize,
      size: query.pageSize,
    },
  );
  return {
    unread: Number(count.unread),
    rows,
    total: Number(total.total),
    ...query,
  };
}
export async function readNotification(id, input, ctx) {
  const user = requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const body = z.object({ read: z.boolean() }).strict().parse(input);
  return repo.transaction(async (tx) => {
    const [row] = await repo.select(
      "SELECT NotificationId FROM dbo.Notifications WITH(UPDLOCK,HOLDLOCK) WHERE NotificationId=:id AND UserId=:user",
      { id, user: user.id },
      tx,
    );
    if (!row) fail("Notification not found.");
    await repo.select(
      "UPDATE dbo.Notifications SET IsRead=:read,ReadAt=CASE WHEN :read = 1 THEN SYSUTCDATETIME() ELSE NULL END WHERE NotificationId=:id AND UserId=:user",
      { id, user: user.id, read: body.read ? 1 : 0 },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "ADMIN_NOTIFICATION_READ_CHANGED",
      "Notifications",
      id,
      null,
      body,
      tx,
    );
    return { message: "Notification updated." };
  });
}
export async function search(input, ctx) {
  requireRole(ctx, "ADMIN");
  const q = z.string().trim().min(2).max(100).parse(input.q);
  const query = `%${q.replace(/[\[\]%_]/g, (s) => `[${s}]`)}%`;
  const sources = [
    [
      "customers",
      "Users t",
      "t.UserId",
      "CONCAT(t.FirstName,' ',t.LastName)",
      "t.Email",
      "EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=t.UserId AND r.RoleCode='CUSTOMER')",
    ],
    [
      "vendors",
      "Vendors t",
      "t.VendorId",
      "t.BusinessName",
      "t.ContactEmail",
      "1=1",
    ],
    [
      "services",
      "Services t",
      "t.ServiceId",
      "t.ServiceName",
      "t.ServiceSlug",
      "1=1",
    ],
    [
      "bookings",
      "Booking t",
      "t.BookingId",
      "t.BookingNumber",
      "t.BookingNumber",
      "1=1",
    ],
    [
      "payments",
      "Payments t",
      "t.PaymentId",
      "t.PaymentReference",
      "t.GatewayTransactionId",
      "1=1",
    ],
    [
      "quotations",
      "Quotations t",
      "t.QuotationId",
      "t.QuotationNumber",
      "t.QuotationNumber",
      "1=1",
    ],
  ];
  const groups = await Promise.all(
    sources.map(async ([kind, table, id, name, extra, where]) =>
      (
        await repo.select(
          `SELECT TOP(5) ${id} AS id,${name} AS name FROM dbo.${table} WHERE (${name} LIKE :q OR ${extra} LIKE :q OR CONVERT(varchar(36),${id}) LIKE :q) AND ${where} ORDER BY t.CreatedAt DESC,${id}`,
          { q: query },
        )
      ).map((row) => ({ ...row, kind })),
    ),
  );
  return { rows: groups.flat() };
}
