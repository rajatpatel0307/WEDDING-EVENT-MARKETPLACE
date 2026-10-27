import { z } from "zod";
import { select } from "./admin.repository.js";
import { dateBounds } from "./admin.validation.js";
const range = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .refine(
    (v) =>
      v.from <= v.to && new Date(v.to) - new Date(v.from) <= 366 * 86400000,
    { message: "Choose a date range of up to one year." },
  );
export async function dashboard(input) {
  const dates = range.parse(input),
    bounds = dateBounds(dates.from, dates.to),
    start = bounds.from,
    end = bounds.to;
  const previous = new Date(start.getTime() - (end - start));
  const today = new Date(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) +
      "T00:00:00+05:30",
  );
  const params = {
    start,
    end,
    previous,
    today,
    tomorrow: new Date(today.getTime() + 86400000),
  };
  const definitions = [
    [
      "customers",
      "Users t",
      "EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=t.UserId AND r.RoleCode='CUSTOMER')",
      "1",
    ],
    ["vendors", "Vendors t", "1=1", "1"],
    [
      "approvals",
      "Vendors t",
      "t.VerificationStatus IN ('Pending','UnderReview')",
      "1",
    ],
    [
      "services",
      "Services t",
      "t.IsActive=1 AND t.ApprovalStatus='Approved'",
      "1",
    ],
    ["bookings", "Booking t", "1=1", "1"],
    [
      "revenue",
      "Payments t",
      "t.PaymentStatus IN ('Success','Refunded') AND t.Currency='INR'",
      "t.Amount",
    ],
    [
      "payouts",
      "VendorPayouts t",
      "t.PayoutStatus IN ('Pending','Processing')",
      "t.NetAmount",
    ],
  ];
  const kpis = {};
  for (const [key, table, condition, value] of definitions) {
    const timestamp =
      key === "revenue" ? "COALESCE(t.PaidAt,t.CreatedAt)" : "t.CreatedAt";
    const [row] = await select(
      `SELECT COALESCE(SUM(CAST(${value} AS decimal(28,2))),0) AS total, COALESCE(SUM(CASE WHEN ${timestamp}>=:start AND ${timestamp}< :end THEN ${value} ELSE 0 END),0) AS currentPeriod, COALESCE(SUM(CASE WHEN ${timestamp}>=:previous AND ${timestamp}< :start THEN ${value} ELSE 0 END),0) AS previousPeriod FROM dbo.${table} WHERE ${condition}`,
      params,
    );
    kpis[key] = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, Number(v)]),
    );
  }
  const [daily] = await select(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN CreatedAt>=DATEADD(day,-1,:today) AND CreatedAt< :today THEN 1 ELSE 0 END) AS previousPeriod, SUM(CASE WHEN CreatedAt>=:today AND CreatedAt< :tomorrow THEN 1 ELSE 0 END) AS currentPeriod FROM dbo.Booking WHERE CreatedAt>=DATEADD(day,-1,:today) AND CreatedAt< :tomorrow",
    params,
  );
  kpis.today = {
    total: Number(daily.currentPeriod || 0),
    currentPeriod: Number(daily.currentPeriod || 0),
    previousPeriod: Number(daily.previousPeriod || 0),
  };
  const series = {};
  for (const [key, table, date, value, condition] of [
    [
      "revenue",
      "Payments",
      "PaidAt",
      "Amount",
      "PaymentStatus IN ('Success','Refunded') AND Currency='INR'",
    ],
    ["bookings", "Booking", "CreatedAt", "1", "1=1"],
    ["vendors", "Vendors", "CreatedAt", "1", "1=1"],
    [
      "customers",
      "Users",
      "CreatedAt",
      "1",
      "EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=Users.UserId AND r.RoleCode='CUSTOMER')",
    ],
    [
      "commission",
      "PlatformCommission",
      "CreatedAt",
      "CommissionAmount",
      "1=1",
    ],
  ])
    series[key] = await select(
      `SELECT CONVERT(char(7),DATEADD(minute,330,${date}),120) AS month,SUM(CAST(${value} AS decimal(28,2))) AS value FROM dbo.${table} WHERE ${date}>=:start AND ${date}< :end AND ${condition} GROUP BY CONVERT(char(7),DATEADD(minute,330,${date}),120) ORDER BY month`,
      params,
    );
  const status = await select(
    "SELECT BookingStatus AS name,COUNT(*) AS value FROM dbo.Booking WHERE CreatedAt>=:start AND CreatedAt< :end GROUP BY BookingStatus",
    params,
  );
  const payouts = await select(
    "SELECT PayoutStatus AS name,COUNT(*) AS count,SUM(NetAmount) AS value FROM dbo.VendorPayouts WHERE CreatedAt>=:start AND CreatedAt< :end GROUP BY PayoutStatus",
    params,
  );
  const categories = await select(
    `SELECT c.CategoryId AS id,c.CategoryName AS name,
    (SELECT COUNT(*) FROM dbo.VendorCategories vc WHERE vc.CategoryId=c.CategoryId) AS vendors,
    (SELECT COUNT(*) FROM dbo.Services s WHERE s.CategoryId=c.CategoryId) AS services,
    (SELECT COUNT(DISTINCT bi.BookingId) FROM dbo.BookingItems bi JOIN dbo.Services s ON s.ServiceId=bi.ServiceId JOIN dbo.Booking b ON b.BookingId=bi.BookingId WHERE s.CategoryId=c.CategoryId AND b.CreatedAt>=:start AND b.CreatedAt< :end) AS bookings,
    COALESCE((SELECT SUM(bi.LineTotal) FROM dbo.BookingItems bi JOIN dbo.Services s ON s.ServiceId=bi.ServiceId JOIN dbo.Booking b ON b.BookingId=bi.BookingId WHERE s.CategoryId=c.CategoryId AND b.CreatedAt>=:start AND b.CreatedAt< :end AND b.PaymentStatus='Paid' AND b.BookingStatus NOT IN ('Cancelled','Refunded')),0) AS revenue,
    (SELECT AVG(CAST(r.Rating AS decimal(5,2))) FROM dbo.Reviews r WHERE r.IsPublished=1 AND EXISTS (SELECT 1 FROM dbo.BookingItems bi JOIN dbo.Services s ON s.ServiceId=bi.ServiceId WHERE bi.BookingId=r.BookingId AND s.CategoryId=c.CategoryId)) AS rating
    FROM dbo.Categories c WHERE c.IsActive=1 ORDER BY c.SortOrder,c.CategoryId`,
    params,
  );
  const activity = await select(
    `SELECT TOP(12) * FROM (
    SELECT CONVERT(nvarchar(100),AuditLogId) AS id,ActionType AS action,'Admin action' AS subject,CreatedAt AS createdAt FROM dbo.AuditLogs WHERE ActionType IN ('VENDOR_APPROVED','VENDOR_REJECTED','ADMIN_VENDOR_APPROVED','ADMIN_VENDOR_REJECTED')
    UNION ALL SELECT CONVERT(nvarchar(100),VendorId),'VENDOR_REGISTERED',BusinessName,CreatedAt FROM dbo.Vendors
    UNION ALL SELECT CONVERT(nvarchar(100),BookingId),'NEW_BOOKING',BookingNumber,CreatedAt FROM dbo.Booking
    UNION ALL SELECT CONVERT(nvarchar(100),PaymentId),'PAYMENT_RECEIVED',PaymentReference,COALESCE(PaidAt,CreatedAt) FROM dbo.Payments WHERE PaymentStatus IN ('Success','Refunded')
    UNION ALL SELECT CONVERT(nvarchar(100),RefundId),'REFUND_REQUESTED',RefundReference,CreatedAt FROM dbo.Refunds
    UNION ALL SELECT CONVERT(nvarchar(100),ReviewId),'REVIEW_SUBMITTED',COALESCE(ReviewTitle,'New review'),CreatedAt FROM dbo.Reviews
    UNION ALL SELECT CONVERT(nvarchar(100),QuotationId),'NEW_QUOTATION',QuotationNumber,CreatedAt FROM dbo.Quotations
    UNION ALL SELECT CONVERT(nvarchar(100),UserId),'CUSTOMER_REGISTERED',CONCAT(FirstName,' ',LastName),CreatedAt FROM dbo.Users u WHERE EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=u.UserId AND r.RoleCode='CUSTOMER')
    ) a WHERE createdAt>=:start AND createdAt< :end ORDER BY createdAt DESC`,
    params,
  );
  return {
    kpis,
    series,
    status,
    payouts,
    categories,
    activity,
    range: dates,
    generatedAt: new Date().toISOString(),
  };
}
