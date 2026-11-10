import * as repo from "../admin/admin.repository.js";
import {
  assertAllowed,
  assertQuantity,
  bookingWindow,
  fail,
} from "./commerce.policy.js";
export const activeBookings =
  "'Pending','Accepted','PaymentPending','Confirmed','InProgress','Disputed'";
export function reservedQuantity(rows, window) {
  if (!window.startsAt) return rows.reduce((n, r) => n + Number(r.Quantity), 0);
  const changes = [];
  for (const row of rows) {
    const start =
      !row.start || row.start < window.startsAt ? window.startsAt : row.start;
    const end = !row.end || row.end > window.endsAt ? window.endsAt : row.end;
    if (start < end)
      changes.push(
        { at: start, delta: Number(row.Quantity) },
        { at: end, delta: -Number(row.Quantity) },
      );
  }
  changes.sort((a, b) => a.at.localeCompare(b.at) || a.delta - b.delta);
  let used = 0,
    peak = 0;
  for (const change of changes) {
    used += change.delta;
    peak = Math.max(peak, used);
  }
  return peak;
}
export async function capacity(
  serviceId,
  config,
  quantity,
  date,
  start,
  tx,
  exclude = null,
) {
  if (!tx) throw new Error("Capacity checks require a transaction.");
  await repo.select(
    "DECLARE @r int; EXEC @r=sp_getapplock @Resource=:key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Booking availability is busy. Retry.',1;",
    { key: `CommerceCapacity:${serviceId.toLowerCase()}` },
    tx,
  );
  if (!config.available) fail("Booking is currently unavailable.", 409);
  const window = bookingWindow(config, date, start);
  if (window.startsAt) {
    const [blocked] = await repo.select(
      "SELECT TOP(1) a.AvailabilityId FROM dbo.VendorAvailability a JOIN dbo.Services s ON s.VendorId=a.VendorId WHERE s.ServiceId=:serviceId AND (a.ServiceId IS NULL OR a.ServiceId=:serviceId) AND a.Status IN('Blocked','Booked') AND a.AvailableDate>=CAST(:startsAt AS date) AND a.AvailableDate<CAST(:endsAt AS datetime2)",
      { serviceId, ...window },
      tx,
    );
    if (blocked)
      fail("This service is blocked during the requested duration.", 409);
  }
  const reservations = await repo.select(
    `SELECT r.Quantity,CONVERT(char(19),r.StartsAt,126) AS start,CONVERT(char(19),r.EndsAt,126) AS [end] FROM dbo.BookingReservations r WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Booking b ON b.BookingId=r.BookingId WHERE r.ServiceId=:serviceId AND (:exclude IS NULL OR b.BookingId<>:exclude) AND b.BookingStatus IN(${activeBookings}) AND (:startsAt IS NULL OR r.StartsAt IS NULL OR (r.StartsAt<CAST(:endsAt AS datetime2) AND r.EndsAt>CAST(:startsAt AS datetime2)))`,
    { serviceId, exclude, ...window },
    tx,
  );
  // Old exclusive bookings still reserve the service, even after a vendor opts
  // into capacity-based reservations. No existing reservation is discarded.
  const [legacy] = await repo.select(
    `SELECT TOP(1) b.BookingId FROM dbo.Booking b JOIN dbo.BookingItems i ON i.BookingId=b.BookingId WHERE i.ServiceId=:serviceId AND (:exclude IS NULL OR b.BookingId<>:exclude) AND b.BookingStatus IN(${activeBookings}) AND NOT EXISTS(SELECT 1 FROM dbo.BookingReservations r WHERE r.BookingId=b.BookingId AND r.ServiceId=:serviceId) AND (:startsAt IS NULL OR b.BookingDate BETWEEN CAST(:startsAt AS date) AND CAST(DATEADD(second,-1,CAST(:endsAt AS datetime2)) AS date))`,
    { serviceId, exclude, ...window },
    tx,
  );
  const remaining = legacy
    ? 0
    : Math.max(0, config.capacity - reservedQuantity(reservations, window));
  assertQuantity(quantity, config, remaining);
  return { ...window, remaining };
}
export async function assertConfiguredReservations(
  vendorId,
  event,
  ids,
  tx,
  exclude,
) {
  if (!ids.length) return [];
  const rows = await repo.select(
    "SELECT s.ServiceId,s.DetailsJson,c.AllowBuyOnline,c.AllowBooking FROM dbo.Services s WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Categories c ON c.CategoryId=s.CategoryId JOIN dbo.Vendors v ON v.VendorId=s.VendorId JOIN dbo.Users u ON u.UserId=v.UserId WHERE s.ServiceId IN(:ids) AND s.VendorId=:vendorId AND s.IsActive=1 AND s.ApprovalStatus='Approved' AND c.IsActive=1 AND v.IsActive=1 AND v.VerificationStatus='Approved' AND v.BookingAccessStatus='Approved' AND u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1",
    { ids, vendorId },
    tx,
  );
  const managed = [];
  for (const row of rows) {
    const offer = JSON.parse(row.DetailsJson || "{}").offer;
    assertAllowed(offer, row);
    if (!offer) continue;
    if (offer.type === "Sell" || !offer.book)
      fail("This listing is available for selling only.", 409);
    let quantity =
      event.ReservationQuantities?.[row.ServiceId.toLowerCase()] || 1;
    if (exclude) {
      const [reservation] = await repo.select(
        "SELECT Quantity FROM dbo.BookingReservations WHERE BookingId=:exclude AND ServiceId=:id",
        { exclude, id: row.ServiceId },
        tx,
      );
      quantity = Number(reservation?.Quantity || quantity);
    }
    const date =
      offer.book.mode === "Quantity"
        ? null
        : event.EventDate instanceof Date
          ? event.EventDate.toISOString().slice(0, 10)
          : String(event.EventDate).slice(0, 10);
    const start =
      offer.book.mode === "Quantity"
        ? null
        : event.StartTime instanceof Date
          ? event.StartTime.toISOString().slice(11, 16)
          : event.StartTime?.slice(0, 5);
    await capacity(
      row.ServiceId,
      offer.book,
      quantity,
      date,
      start,
      tx,
      exclude,
    );
    managed.push(row.ServiceId.toLowerCase());
  }
  return managed;
}
export async function recordReservations(bookingId, items, event, tx) {
  for (const id of [...new Set(items.map((i) => i.ServiceId))].sort()) {
    const [s] = await repo.select(
      "SELECT DetailsJson FROM dbo.Services WHERE ServiceId=:id",
      { id },
      tx,
    );
    const config = JSON.parse(s?.DetailsJson || "{}").offer?.book;
    if (!config) continue;
    const quantity =
      event.ReservationQuantities?.[id.toLowerCase()] ||
      items
        .filter((i) => i.ServiceId === id && !i.ServiceItemId)
        .reduce((n, i) => n + i.Quantity, 0);
    const date =
      config.mode === "Quantity"
        ? null
        : event.EventDate instanceof Date
          ? event.EventDate.toISOString().slice(0, 10)
          : String(event.EventDate).slice(0, 10);
    const start =
      config.mode === "Quantity"
        ? null
        : event.StartTime instanceof Date
          ? event.StartTime.toISOString().slice(11, 16)
          : event.StartTime?.slice(0, 5);
    const window = await capacity(
      id,
      config,
      quantity,
      date,
      start,
      tx,
      bookingId,
    );
    await repo.select(
      "INSERT dbo.BookingReservations(BookingId,ServiceId,Quantity,StartsAt,EndsAt) VALUES(:bookingId,:id,:quantity,:startsAt,:endsAt)",
      {
        bookingId,
        id,
        quantity,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
      },
      tx,
    );
  }
}
