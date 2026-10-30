import * as repo from "../admin/admin.repository.js";
import { assertServiceSchedule } from "../vendors/service-schedule.js";
import { fail } from "../admin/booking-finance.js";
export const dayOf = (value) =>
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
export const clockOf = (value) =>
  value instanceof Date
    ? value.toISOString().slice(11, 16)
    : value
      ? String(value).slice(0, 5)
      : null;
export function assertEventTime(event, now = new Date()) {
  const day = dayOf(event.EventDate),
    start = clockOf(event.StartTime),
    end = clockOf(event.EndTime);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(Date.parse(day)) ||
    day < now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  )
    fail("Choose an upcoming event date.");
  if ((start && !end) || (!start && end) || (start && end <= start))
    fail("Choose valid start and end times on the same day.");
  if (start && new Date(`${day}T${start}:00+05:30`) <= now)
    fail("The event start time has already passed.");
}
// No capacity model exists: each service is exclusive for its booking day. Missing
// times never imply spare capacity. Pending requests hold their day until resolved.
export async function assertReservation(
  vendorId,
  event,
  serviceIds,
  tx,
  exclude = null,
) {
  if (!tx) throw new Error("Reservation checks require a transaction.");
  assertEventTime(event);
  const day = dayOf(event.EventDate),
    services = [...new Set(serviceIds)].sort();
  if (!services.length) fail("A booking must contain a service.");
  await repo.select(
    "DECLARE @r int; EXEC @r=sp_getapplock @Resource=:key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Reservation is busy. Please retry.',1;",
    { key: `BookingDay:${vendorId.toLowerCase()}:${day}` },
    tx,
  );
  const [blocked] = await repo.select(
    "SELECT TOP(1) AvailabilityId FROM dbo.VendorAvailability WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:vendor AND AvailableDate=:day AND Status IN('Blocked','Booked') AND (ServiceId IS NULL OR ServiceId IN(:services))",
    { vendor: vendorId, day, services },
    tx,
  );
  if (blocked) fail("This service is unavailable on the selected date.");
  const [conflict] = await repo.select(
    "SELECT TOP(1) b.BookingId FROM dbo.Booking b WITH(UPDLOCK,HOLDLOCK) JOIN dbo.BookingItems bi ON bi.BookingId=b.BookingId WHERE b.VendorId=:vendor AND b.BookingDate=:day AND (:exclude IS NULL OR b.BookingId<>:exclude) AND b.BookingStatus IN('Pending','Accepted','PaymentPending','Confirmed','InProgress','Disputed') AND bi.ServiceId IN(:services)",
    { vendor: vendorId, day, services, exclude },
    tx,
  );
  if (conflict)
    fail("Another active booking reserves this service on that date.");
  for (const serviceId of services) {
    const [s] = await repo.select(
      "SELECT s.DetailsJson,s.MinimumGuests,s.MaximumGuests FROM dbo.Services s WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Vendors v ON v.VendorId=s.VendorId JOIN dbo.Users u ON u.UserId=v.UserId JOIN dbo.Categories c ON c.CategoryId=s.CategoryId WHERE s.ServiceId=:serviceId AND s.VendorId=:vendor AND s.IsActive=1 AND s.ApprovalStatus='Approved' AND c.IsActive=1 AND v.IsActive=1 AND v.VerificationStatus='Approved' AND u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1",
      { serviceId, vendor: vendorId },
      tx,
    );
    if (!s)
      fail("A selected service or vendor is no longer eligible for booking.");
    const document = JSON.parse(s.DetailsJson || "null");
    const [override] = await repo.select(
      "SELECT TOP(1) StartTime,EndTime FROM dbo.VendorAvailability WHERE VendorId=:vendor AND AvailableDate=:day AND Status='Available' AND (ServiceId IS NULL OR ServiceId=:serviceId) ORDER BY CASE WHEN ServiceId IS NULL THEN 1 ELSE 0 END,AvailabilityId DESC",
      { vendor: vendorId, serviceId, day },
      tx,
    );
    assertServiceSchedule(document, day, event.StartTime, override);
    const end = clockOf(event.EndTime),
      limit = clockOf(override?.EndTime) || document?.availability?.end;
    if (end && limit && end > limit)
      fail("The event ends outside service working hours.");
    const guests = Number(event.GuestCount);
    if (
      (s.MinimumGuests && guests < Number(s.MinimumGuests)) ||
      (s.MaximumGuests && guests > Number(s.MaximumGuests))
    )
      fail("Guest count is outside the service limits.");
    const location = document?.location;
    if (
      location?.mode === "Vendor location" &&
      location.city &&
      String(event.City).trim().toLowerCase() !==
        location.city.trim().toLowerCase()
    )
      fail(
        "This service is available at the vendor location. Select an event in that city.",
      );
  }
}
