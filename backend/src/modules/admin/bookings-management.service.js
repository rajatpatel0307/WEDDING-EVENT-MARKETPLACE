import { z } from "zod";
import * as repo from "./admin.repository.js";
import { requireRole } from "../../middleware/auth.middleware.js";
import { assertVersion } from "../vendors/workspace.common.js";
import { dateBounds } from "./admin.validation.js";
import {
  financialRows,
  financialSummary,
  audit,
  milestone,
  history,
  syncPayout,
  policySchema,
  fail,
} from "./booking-finance.js";
export const statuses = [
  "Pending",
  "Accepted",
  "PaymentPending",
  "Confirmed",
  "InProgress",
  "Completed",
  "Cancelled",
  "Rejected",
  "Disputed",
  "Refunded",
];
const text = z.string().trim().max(200).default("");
export const listInput = z
  .object({
    q: text,
    status: z.enum(["", ...statuses]).default(""),
    payment: z
      .enum([
        "",
        "Pending",
        "PartiallyPaid",
        "Paid",
        "Failed",
        "RefundPending",
        "Refunded",
        "PartiallyRefunded",
      ])
      .default(""),
    vendor: z.union([z.guid(), z.literal("")]).default(""),
    customer: z.union([z.guid(), z.literal("")]).default(""),
    category: z.coerce.number().int().nonnegative().default(0),
    location: text,
    eventFrom: z.iso.date().optional(),
    eventTo: z.iso.date().optional(),
    bookedFrom: z.iso.date().optional(),
    bookedTo: z.iso.date().optional(),
    minAmount: z.coerce.number().nonnegative().max(1e8).default(0),
    maxAmount: z.coerce.number().nonnegative().max(1e8).default(1e8),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sort: z
      .enum([
        "createdAt",
        "number",
        "customer",
        "vendor",
        "eventDate",
        "bookingDate",
        "amount",
        "status",
      ])
      .default("createdAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
  .refine(
    (q) =>
      q.minAmount <= q.maxAmount &&
      (!q.eventFrom || !q.eventTo || q.eventFrom <= q.eventTo) &&
      (!q.bookedFrom || !q.bookedTo || q.bookedFrom <= q.bookedTo),
    { message: "Choose valid amount and date ranges." },
  );
const source = `FROM dbo.Booking b JOIN dbo.Users u ON u.UserId=b.CustomerId JOIN dbo.Vendors v ON v.VendorId=b.VendorId JOIN dbo.Events e ON e.EventId=b.EventId`;
const like = (value) => `%${value.replace(/[\[\]%_]/g, (x) => `[${x}]`)}%`;
export function filters(q) {
  const p = {
    ...q,
    search: like(q.q),
    city: like(q.location),
    offset: (q.page - 1) * q.pageSize,
    size: q.pageSize,
  };
  const where = ["b.TotalAmount BETWEEN :minAmount AND :maxAmount"];
  if (q.q)
    where.push(
      "(b.BookingNumber LIKE :search OR CONVERT(varchar(36),b.BookingId) LIKE :search OR CONCAT(u.FirstName,' ',u.LastName) LIKE :search OR CONVERT(varchar(36),u.UserId) LIKE :search OR v.BusinessName LIKE :search OR CONVERT(varchar(36),v.VendorId) LIKE :search OR e.EventName LIKE :search OR EXISTS(SELECT 1 FROM dbo.BookingItems bi JOIN dbo.Services s ON s.ServiceId=bi.ServiceId WHERE bi.BookingId=b.BookingId AND (bi.ItemName LIKE :search OR s.ServiceName LIKE :search)))",
    );
  for (const [key, column] of [
    ["status", "b.BookingStatus"],
    ["payment", "b.PaymentStatus"],
    ["vendor", "b.VendorId"],
    ["customer", "b.CustomerId"],
  ])
    if (q[key]) where.push(`${column}=:${key}`);
  if (q.category)
    where.push(
      "EXISTS(SELECT 1 FROM dbo.BookingItems bi JOIN dbo.Services s ON s.ServiceId=bi.ServiceId WHERE bi.BookingId=b.BookingId AND s.CategoryId=:category)",
    );
  if (q.location) where.push("(e.City LIKE :city OR e.State LIKE :city)");
  if (q.eventFrom) where.push("e.EventDate>=:eventFrom");
  if (q.eventTo) where.push("e.EventDate<=:eventTo");
  const dates = dateBounds(q.bookedFrom, q.bookedTo);
  if (dates.from) {
    p.from = dates.from;
    where.push("b.CreatedAt>=:from");
  }
  if (dates.to) {
    p.to = dates.to;
    where.push("b.CreatedAt<:to");
  }
  return { p, where: where.join(" AND ") };
}
export function actionsFor(row) {
  const status = row.status || row.BookingStatus;
  return [
    "view",
    ...(["Pending", "Accepted", "PaymentPending", "Confirmed"].includes(status)
      ? ["cancel"]
      : []),
    ...(status === "Accepted" || status === "PaymentPending"
      ? ["Confirmed"]
      : []),
    ...(status === "Confirmed" ? ["InProgress", "Disputed"] : []),
    ...(status === "InProgress" ? ["Completed", "Disputed"] : []),
    ...(["Cancelled", "Rejected"].includes(status) ? ["refund"] : []),
  ];
}
export async function list(input, ctx) {
  requireRole(ctx, "ADMIN");
  const q = listInput.parse(input),
    { p, where } = filters(q);
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total ${source} WHERE ${where}`,
    p,
  );
  const sort = {
    createdAt: "b.CreatedAt",
    number: "b.BookingNumber",
    customer: "u.FirstName",
    vendor: "v.BusinessName",
    eventDate: "e.EventDate",
    bookingDate: "b.BookingDate",
    amount: "b.TotalAmount",
    status: "b.BookingStatus",
  }[q.sort];
  const rows = await repo.select(
    `SELECT b.BookingId AS id,b.BookingNumber AS number,b.CustomerId AS customerId,CONCAT(u.FirstName,' ',u.LastName) AS customer,u.ProfilePhotoUrl AS customerImage,b.VendorId AS vendorId,v.BusinessName AS vendor,v.LogoUrl AS vendorLogo,e.EventName AS event,e.EventDate AS eventDate,b.BookingDate AS bookingDate,b.CreatedAt AS createdAt,b.UpdatedAt AS updatedAt,b.TotalAmount AS amount,b.PaymentStatus AS paymentStatus,b.BookingStatus AS status,(SELECT COUNT(*) FROM dbo.BookingItems bi WHERE bi.BookingId=b.BookingId) AS services ${source} WHERE ${where} ORDER BY ${sort} ${q.direction === "asc" ? "ASC" : "DESC"},b.BookingId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    p,
  );
  return {
    rows: rows.map((r) => ({ ...r, actions: actionsFor(r) })),
    total: Number(count.total),
    page: q.page,
    pageSize: q.pageSize,
  };
}
export async function statistics(ctx) {
  requireRole(ctx, "ADMIN");
  const [r] = await repo.select(
    `SELECT COUNT_BIG(*) AS total,SUM(CASE WHEN BookingStatus='Pending' THEN 1 ELSE 0 END) AS pending,SUM(CASE WHEN BookingStatus='Confirmed' THEN 1 ELSE 0 END) AS confirmed,SUM(CASE WHEN BookingDate>=CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME())) AND BookingStatus IN('Accepted','PaymentPending','Confirmed') THEN 1 ELSE 0 END) AS upcoming,SUM(CASE WHEN BookingStatus='InProgress' THEN 1 ELSE 0 END) AS inProgress,SUM(CASE WHEN BookingStatus='Completed' THEN 1 ELSE 0 END) AS completed,SUM(CASE WHEN BookingStatus='Cancelled' THEN 1 ELSE 0 END) AS cancelled,SUM(CASE WHEN BookingStatus='Disputed' THEN 1 ELSE 0 END) AS disputed,COALESCE(SUM(TotalAmount),0) AS value,(SELECT COALESCE(SUM(CommissionAmount),0) FROM dbo.PlatformCommission) AS commission,(SELECT COALESCE(SUM(NetAmount),0) FROM dbo.VendorPayouts WHERE PayoutStatus<>'Paid') AS payable FROM dbo.Booking`,
  );
  return r;
}
export async function options(input, ctx) {
  requireRole(ctx, "ADMIN");
  const q = z
    .object({
      q: text,
      vendor: z.guid().optional(),
      customer: z.guid().optional(),
    })
    .strict()
    .parse(input);
  const [vendors, customers, categories] = await Promise.all([
    repo.select(
      `SELECT VendorId AS id,BusinessName AS name FROM dbo.Vendors WHERE VendorId IN(SELECT TOP(30) VendorId FROM dbo.Vendors WHERE BusinessName LIKE :q ORDER BY BusinessName,VendorId) ${q.vendor ? "OR VendorId=:vendor" : ""} ORDER BY BusinessName,VendorId`,
      { q: like(q.q), ...(q.vendor ? { vendor: q.vendor } : {}) },
    ),
    repo.select(
      `SELECT UserId AS id,CONCAT(FirstName,' ',LastName) AS name FROM dbo.Users WHERE UserId IN(SELECT TOP(30) u.UserId FROM dbo.Users u WHERE CONCAT(u.FirstName,' ',u.LastName) LIKE :q AND EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=u.UserId AND r.RoleCode='CUSTOMER') ORDER BY u.FirstName,u.UserId) ${q.customer ? "OR UserId=:customer" : ""} ORDER BY FirstName,UserId`,
      { q: like(q.q), ...(q.customer ? { customer: q.customer } : {}) },
    ),
    repo.select(
      "SELECT CategoryId AS id,CategoryName AS name FROM dbo.Categories ORDER BY SortOrder,CategoryId",
    ),
  ]);
  return { vendors, customers, categories };
}
export async function getBooking(id, ctx, tx, lock = false) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const [row] = await repo.select(
    `SELECT * FROM dbo.Booking ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE BookingId=:id`,
    { id },
    tx,
  );
  if (!row) fail("Booking not found.", 404);
  return row;
}
export async function items(id, ctx) {
  await getBooking(id, ctx);
  return repo.select(
    "SELECT bi.BookingItemId AS id,bi.ServiceId AS serviceId,bi.PackageId AS packageId,bi.ItemName AS name,s.ServiceName AS service,c.CategoryName AS category,v.BusinessName AS vendor,p.PackageName AS package,bi.Quantity AS quantity,bi.UnitPrice AS unitPrice,bi.DiscountAmount AS discount,bi.TaxAmount AS tax,bi.LineTotal AS total FROM dbo.BookingItems bi LEFT JOIN dbo.Services s ON s.ServiceId=bi.ServiceId LEFT JOIN dbo.Categories c ON c.CategoryId=s.CategoryId LEFT JOIN dbo.Vendors v ON v.VendorId=s.VendorId LEFT JOIN dbo.ServicePackages p ON p.PackageId=bi.PackageId WHERE bi.BookingId=:id ORDER BY bi.BookingItemId",
    { id },
  );
}
export async function timeline(id, ctx) {
  await getBooking(id, ctx);
  return repo.select(
    `SELECT h.BookingStatusHistoryId AS id,h.OldStatus AS previous,h.NewStatus AS status,h.ChangedBy AS actorId,CONCAT(u.FirstName,' ',u.LastName) AS actor,COALESCE(h.ActorRole,CASE WHEN h.ChangedBy IS NULL THEN 'System' WHEN h.ChangedBy=b.CustomerId THEN 'Customer' WHEN h.ChangedBy=v.UserId THEN 'Vendor' ELSE 'Admin' END) AS role,h.Reason AS reason,CASE WHEN h.ActorRole IS NOT NULL THEN h.Notes ELSE h.Remarks END AS notes,h.CreatedAt AS timestamp FROM dbo.BookingStatusHistory h JOIN dbo.Booking b ON b.BookingId=h.BookingId JOIN dbo.Vendors v ON v.VendorId=b.VendorId LEFT JOIN dbo.Users u ON u.UserId=h.ChangedBy WHERE h.BookingId=:id ORDER BY h.CreatedAt,h.BookingStatusHistoryId`,
    { id },
  );
}
export async function payment(id, ctx) {
  const row = await getBooking(id, ctx),
    ledger = await financialRows(id);
  const transactions = await repo.select(
    "SELECT t.TransactionId AS id,t.PaymentId,t.TransactionType,t.Amount,t.TransactionStatus,t.GatewayTransactionId,t.CreatedAt FROM dbo.PaymentTransactions t JOIN dbo.Payments p ON p.PaymentId=t.PaymentId WHERE p.BookingId=:id ORDER BY t.CreatedAt,t.TransactionId",
    { id },
  );
  return { ...ledger, transactions, summary: financialSummary(row, ledger) };
}
export async function payout(id, ctx) {
  const row = await getBooking(id, ctx),
    ledger = await financialRows(id);
  return {
    rows: ledger.payouts,
    commissions: ledger.commissions,
    summary: financialSummary(row, ledger),
  };
}
export async function detail(id, ctx) {
  const row = await getBooking(id, ctx);
  const [
    [customer],
    [vendor],
    [event],
    ledger,
    bookedItems,
    statusHistory,
    audits,
  ] = await Promise.all([
    repo.select(
      "SELECT UserId AS id,CONCAT(FirstName,' ',LastName) AS name,Email AS email,PhoneNumber AS phone,ProfilePhotoUrl AS image FROM dbo.Users WHERE UserId=:id",
      { id: row.CustomerId },
    ),
    repo.select(
      "SELECT v.VendorId AS id,v.BusinessName AS name,CONCAT(u.FirstName,' ',u.LastName) AS owner,COALESCE(v.ContactEmail,u.Email) AS email,COALESCE(v.ContactPhone,u.PhoneNumber) AS phone,v.LogoUrl AS image,v.VerificationStatus AS verificationStatus,v.AverageRating AS rating FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId WHERE v.VendorId=:id",
      { id: row.VendorId },
    ),
    repo.select(
      "SELECT EventId AS id,EventName AS name,EventType AS type,EventDate AS date,StartTime AS startTime,EndTime AS endTime,City AS city,State AS state,GuestCount AS guests,Budget AS budget,Description AS description FROM dbo.Events WHERE EventId=:id",
      { id: row.EventId },
    ),
    financialRows(id),
    items(id, ctx),
    timeline(id, ctx),
    repo.select(
      "SELECT a.AuditLogId AS id,a.ActionType AS action,a.UserId AS actorId,CONCAT(u.FirstName,' ',u.LastName) AS actor,a.OldValue AS previous,a.NewValue AS details,a.IPAddress AS ip,a.UserAgent AS userAgent,a.CreatedAt AS timestamp FROM dbo.AuditLogs a LEFT JOIN dbo.Users u ON u.UserId=a.UserId WHERE a.EntityType='Booking' AND a.EntityId=:id ORDER BY a.CreatedAt,a.AuditLogId",
      { id },
    ),
  ]);
  const policies = await repo.select(
    "SELECT s.ServiceName,s.DetailsJson FROM dbo.BookingItems bi JOIN dbo.Services s ON s.ServiceId=bi.ServiceId WHERE bi.BookingId=:id",
    { id },
  );
  const [quotation] = row.QuotationId
    ? await repo.select(
        "SELECT QuotationNumber,Status,SubTotal,DiscountAmount,TaxAmount,TotalAmount,ValidUntil,VendorMessage FROM dbo.Quotations WHERE QuotationId=:id",
        { id: row.QuotationId },
      )
    : [];
  return {
    booking: row,
    customer,
    vendor,
    event,
    quotation,
    items: bookedItems,
    history: statusHistory,
    audits,
    financial: financialSummary({ ...row, EventDate: event.date }, ledger),
    payouts: ledger.payouts,
    policies: policies.map((s) => {
      let d = {};
      try {
        d = JSON.parse(s.DetailsJson || "{}");
      } catch {}
      return {
        service: s.ServiceName,
        cancellation: d.policies?.cancellation || "Not recorded",
        refund: d.policies?.refund || "Not recorded",
      };
    }),
    actions: actionsFor(row),
  };
}
const changeInput = z
  .object({
    expectedUpdatedAt: z.iso.datetime(),
    reason: z.string().trim().min(3).max(1000),
    notes: z.string().trim().max(2000).default(""),
  })
  .strict();
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
  if (next === "Confirmed" && row.BookingStatus === "Pending")
    fail("The vendor must first accept the booking.");
  if (
    next === "Confirmed" &&
    Number(row.PaidAmount) < Number(row.AdvanceAmount)
  )
    fail("The required advance payment has not been received.");
}
export async function changeStatus(id, next, input, ctx) {
  requireRole(ctx, "ADMIN");
  const body = changeInput.parse(input);
  if (
    !["Confirmed", "InProgress", "Completed", "Cancelled", "Disputed"].includes(
      next,
    )
  )
    fail("Unsupported booking action.", 400);
  return repo.transaction(async (tx) => {
    const row = await getBooking(id, ctx, tx, true);
    assertVersion(row, body.expectedUpdatedAt);
    assertTransition(row, next);
    const ledger = await financialRows(id, tx, true),
      summary = financialSummary(row, ledger);
    if (
      next === "Cancelled" &&
      ledger.payouts.some((p) =>
        ["Paid", "Processing"].includes(p.PayoutStatus),
      )
    )
      fail("Reconcile the existing payout before cancelling this booking.");
    if (next === "Confirmed" && summary.paid < Number(row.AdvanceAmount))
      fail("The advance payment must be verified in the payment ledger.");
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const day =
      row.BookingDate instanceof Date
        ? row.BookingDate.toISOString().slice(0, 10)
        : String(row.BookingDate).slice(0, 10);
    if (["InProgress", "Completed"].includes(next) && day > today)
      fail("The event date has not arrived.");
    if (
      next === "Completed" &&
      (summary.remaining > 0 || summary.refundPending > 0)
    )
      fail("Reconcile the payment balance before completing the booking.");
    const values = {
      BookingStatus: next,
      UpdatedAt: new Date(),
      AdminNotes: body.notes || null,
      ...(next === "Cancelled"
        ? {
            CancelledAt: new Date(),
            CancelledBy: ctx.auth.user.id,
            CancellationReason: body.reason,
          }
        : {}),
    };
    await repo.update({ table: "Booking", id: "BookingId" }, id, values, tx);
    await history(row, next, ctx, body.reason, body.notes, tx);
    await audit(
      ctx,
      next === "Cancelled" ? "BOOKING_CANCELLED" : "BOOKING_STATUS_CHANGED",
      id,
      { status: row.BookingStatus },
      {
        status: next,
        reason: body.reason,
        notes: body.notes,
        ...(next === "Cancelled"
          ? {
              policyReviewRequired: !summary.policy,
              refundEligible: summary.refundEligible,
            }
          : {}),
      },
      tx,
    );
    await syncPayout({ ...row, ...values }, ctx, tx);
    await milestone(
      row,
      `status:${next}`,
      `Booking ${next === "InProgress" ? "in progress" : next.toLowerCase()}`,
      `${row.BookingNumber}: ${body.reason}${body.notes ? ` ${body.notes}` : ""}`,
      tx,
    );
    if (next === "Completed")
      await milestone(
        row,
        "review-requested",
        "Review requested",
        `Please review your experience for ${row.BookingNumber}.`,
        tx,
        "customer",
      );
    return { message: `Booking ${next.toLowerCase()}.`, status: next };
  });
}
export async function reviewPolicy(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  const body = z
    .object({
      expectedUpdatedAt: z.iso.datetime(),
      policy: policySchema,
      reason: z.string().trim().min(10).max(1000),
      notes: z.string().trim().max(2000).default(""),
    })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await getBooking(id, ctx, tx, true);
    assertVersion(row, body.expectedUpdatedAt);
    const ledger = await financialRows(id, tx, true);
    if (
      ledger.refunds.some((r) =>
        ["Pending", "Processing", "Completed"].includes(r.RefundStatus),
      )
    )
      fail("Refund processing has started; the policy cannot be changed.");
    let old = {};
    try {
      old = JSON.parse(row.PolicySnapshotJson || "{}");
    } catch {}
    const previousSnapshot = old;
    if (!old.terms?.length) {
      const services = await repo.select(
        "SELECT s.ServiceName,s.DetailsJson FROM dbo.BookingItems bi JOIN dbo.Services s ON s.ServiceId=bi.ServiceId WHERE bi.BookingId=:id",
        { id },
        tx,
      );
      old = {
        ...old,
        terms: services.map((s) => {
          let doc = {};
          try {
            doc = JSON.parse(s.DetailsJson || "{}");
          } catch {}
          return {
            service: s.ServiceName,
            cancellation: doc.policies?.cancellation || "",
            refund: doc.policies?.refund || "",
          };
        }),
        termsSource: "Reviewed legacy terms",
      };
    }
    const snapshot = {
      ...old,
      policy: body.policy,
      review: {
        by: ctx.auth.user.id,
        at: new Date().toISOString(),
        reason: body.reason,
        notes: body.notes,
      },
    };
    await repo.update(
      { table: "Booking", id: "BookingId" },
      id,
      { PolicySnapshotJson: JSON.stringify(snapshot), UpdatedAt: new Date() },
      tx,
    );
    await audit(
      ctx,
      "BOOKING_POLICY_REVIEWED",
      id,
      previousSnapshot,
      snapshot,
      tx,
    );
    await history(row, "PolicyReviewed", ctx, body.reason, body.notes, tx);
    return {
      message:
        "Cancellation policy review recorded. Refund values will be calculated by the server.",
    };
  });
}
export async function reminders() {
  const rows = await repo.select(
    "SELECT * FROM dbo.Booking WHERE BookingStatus='Confirmed' AND BookingDate BETWEEN CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME())) AND DATEADD(day,1,CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME())))",
  );
  for (const row of rows)
    await repo.transaction(async (tx) => {
      const [current] = await repo.select(
        "SELECT * FROM dbo.Booking WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=:id",
        { id: row.BookingId },
        tx,
      );
      if (current.BookingStatus !== "Confirmed") return;
      await milestone(
        current,
        "event-starting",
        "Event starting soon",
        `${current.BookingNumber}: your event is scheduled for ${current.BookingDate instanceof Date ? current.BookingDate.toISOString().slice(0, 10) : String(current.BookingDate).slice(0, 10)}.`,
        tx,
      );
    });
  return { processed: rows.length };
}
