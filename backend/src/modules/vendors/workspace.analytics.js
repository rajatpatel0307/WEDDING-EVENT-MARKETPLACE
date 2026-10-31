import { z } from "zod";
import { dateBounds } from "../admin/admin.validation.js";
import { scope, repo } from "./workspace.common.js";
import { records } from "./workspace.service.js";

const localDay = (date) =>
  new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const analyticsInput = z
  .object({
    period: z.enum(["daily", "weekly", "monthly"]).default("monthly"),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine(
    (v) =>
      (!v.from && !v.to) ||
      (v.from &&
        v.to &&
        v.from <= v.to &&
        new Date(v.to) - new Date(v.from) <= 366 * 86400000),
    { message: "Choose a complete date range of up to one year." },
  );
function keyFor(day, period) {
  if (period === "monthly") return day.slice(0, 7);
  if (period === "weekly") {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  }
  return day;
}
export async function dashboard(input, ctx) {
  const { id, user } = scope(ctx),
    options = analyticsInput.parse(input);
  const to = options.to || localDay(Date.now());
  const from =
    options.from ||
    localDay(
      new Date(`${to}T12:00:00+05:30`).getTime() -
        (options.period === "daily"
          ? 27
          : options.period === "weekly"
            ? 83
            : 364) *
          86400000,
    );
  const bounds = dateBounds(from, to),
    params = { id, owner: user.id, start: bounds.from, end: bounds.to };
  const [stats] = await repo.select(
    `SELECT
    (SELECT COUNT(*) FROM dbo.Services WHERE VendorId=:id) AS totalServices,
    (SELECT COUNT(*) FROM dbo.Services WHERE VendorId=:id AND IsActive=1 AND ApprovalStatus='Approved') AS activeServices,
    (SELECT COUNT(*) FROM dbo.Services WHERE VendorId=:id AND ApprovalStatus='Pending') AS pendingApproval,
    (SELECT COUNT(*) FROM dbo.Booking WHERE VendorId=:id AND BookingStatus IN ('Accepted','PaymentPending','Confirmed') AND BookingDate>=CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME()))) AS upcomingBookings,
    (SELECT COUNT(*) FROM dbo.Booking WHERE VendorId=:id AND BookingStatus='Completed') AS completedBookings,
    (SELECT COUNT(*) FROM dbo.Quotations WHERE VendorId=:id AND Status IN ('Draft','Sent','Viewed')) AS pendingQuotations,
    (SELECT COALESCE(SUM(p.Amount),0) FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId WHERE b.VendorId=:id AND p.PaymentStatus='Success' AND p.Currency='INR') AS totalRevenue,
    (SELECT COALESCE(SUM(NetAmount),0) FROM dbo.VendorPayouts WHERE VendorId=:id AND PayoutStatus IN ('Pending','Processing')) AS pendingPayout,
    (SELECT AVG(CAST(Rating AS decimal(6,2))) FROM dbo.Reviews WHERE VendorId=:id AND IsPublished=1) AS averageRating,
    (SELECT COUNT(*) FROM dbo.Notifications WHERE UserId=:owner AND IsRead=0 AND (ReferenceType IS NULL OR ReferenceType<>'Conversation')) AS unreadNotifications,
    (SELECT COUNT(DISTINCT m.SenderUserId) FROM dbo.Messages m JOIN dbo.Conversations c ON c.ConversationId=m.ConversationId WHERE c.VendorId=:id AND c.IsActive=1 AND m.SenderUserId<> :owner AND m.IsRead=0) AS unreadMessages,
    (SELECT COUNT(*) FROM dbo.Booking WHERE VendorId=:id AND BookingStatus='Pending') AS bookingRequests`,
    params,
  );
  const day = (expression) => `CONVERT(date,DATEADD(minute,330,${expression}))`;
  const bucket = (expression) =>
    options.period === "monthly"
      ? `CONVERT(char(7),${day(expression)},120)`
      : options.period === "weekly"
        ? `CONVERT(char(10),DATEADD(day,-(DATEDIFF(day,'19000101',${day(expression)})%7),${day(expression)}),120)`
        : `CONVERT(char(10),${day(expression)},120)`;
  const income = await repo.select(
    `SELECT ${bucket("COALESCE(p.PaidAt,p.CreatedAt)")} AS bucket,SUM(p.Amount) AS value FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId WHERE b.VendorId=:id AND p.PaymentStatus='Success' AND p.Currency='INR' AND COALESCE(p.PaidAt,p.CreatedAt)>=:start AND COALESCE(p.PaidAt,p.CreatedAt)< :end GROUP BY ${bucket("COALESCE(p.PaidAt,p.CreatedAt)")} ORDER BY bucket`,
    params,
  );
  const bookings = await repo.select(
    `SELECT ${bucket("b.CreatedAt")} AS bucket,COUNT(*) AS value FROM dbo.Booking b WHERE b.VendorId=:id AND b.CreatedAt>=:start AND b.CreatedAt< :end GROUP BY ${bucket("b.CreatedAt")} ORDER BY bucket`,
    params,
  );
  const keys = [];
  for (
    let d = new Date(`${from}T12:00:00Z`);
    d <= new Date(`${to}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const key = keyFor(d.toISOString().slice(0, 10), options.period);
    if (!keys.includes(key)) keys.push(key);
  }
  const series = keys.map((key) => ({
    key,
    revenue: Number(income.find((r) => r.bucket === key)?.value || 0),
    bookings: Number(bookings.find((r) => r.bucket === key)?.value || 0),
  }));
  const allocation = `FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId JOIN dbo.BookingItems bi ON bi.BookingId=b.BookingId JOIN dbo.Services s ON s.ServiceId=bi.ServiceId JOIN dbo.Categories c ON c.CategoryId=s.CategoryId CROSS APPLY(SELECT SUM(LineTotal) AS total FROM dbo.BookingItems WHERE BookingId=b.BookingId) totals WHERE b.VendorId=:id AND s.VendorId=:id AND p.PaymentStatus='Success' AND p.Currency='INR' AND totals.total>0 AND COALESCE(p.PaidAt,p.CreatedAt)>=:start AND COALESCE(p.PaidAt,p.CreatedAt)< :end`;
  const byService = await repo.select(
    `SELECT s.ServiceId AS id,s.ServiceName AS name,SUM(p.Amount*bi.LineTotal/totals.total) AS amount ${allocation} GROUP BY s.ServiceId,s.ServiceName ORDER BY amount DESC`,
    params,
  );
  const byCategory = await repo.select(
    `SELECT c.CategoryId AS id,c.CategoryName AS name,SUM(p.Amount*bi.LineTotal/totals.total) AS amount ${allocation} GROUP BY c.CategoryId,c.CategoryName ORDER BY amount DESC`,
    params,
  );
  const requests = await records(
    "bookings",
    { status: "requests", pageSize: 5 },
    ctx,
  );
  const upcoming = await records(
    "bookings",
    { status: "upcoming", pageSize: 5 },
    ctx,
  );
  return {
    stats,
    series,
    byService,
    byCategory,
    requests: requests.rows,
    upcoming: upcoming.rows,
    period: options.period,
    from,
    to,
  };
}
