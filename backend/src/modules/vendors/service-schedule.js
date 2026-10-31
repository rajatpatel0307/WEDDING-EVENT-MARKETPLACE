const fail = (message) => {
  throw Object.assign(new Error(message), { status: 409 });
};
export function assertServiceSchedule(
  document,
  eventDate,
  startTime = null,
  override = null,
  now = new Date(),
) {
  const day =
    eventDate instanceof Date
      ? eventDate.toISOString().slice(0, 10)
      : String(eventDate).slice(0, 10);
  const localToday = now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const distance =
    (new Date(`${day}T00:00:00Z`) - new Date(`${localToday}T00:00:00Z`)) /
    86400000;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(distance) ||
    new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day ||
    distance < 0
  )
    fail("Choose a valid upcoming event date.");
  // Dates are open unless explicitly blocked or reserved. The reservation and
  // public calendar checks enforce those records; legacy weekly schedules and
  // advance-day limits must not reject an otherwise available future date.
  if (!document?.availability) return;
  const a = document.availability;
  const clock = (value) =>
    value instanceof Date
      ? value.toISOString().slice(11, 16)
      : value
        ? String(value).slice(0, 5)
        : null;
  const start = clock(override?.StartTime) || a.start,
    end = clock(override?.EndTime) || a.end,
    eventTime = clock(startTime);
  if (eventTime && (eventTime < start || eventTime >= end))
    fail("The event starts outside service working hours.");
  const begins = new Date(`${day}T${eventTime || start}:00+05:30`);
  if (begins - now < a.noticeHours * 3600000)
    fail("This service requires more advance notice.");
}
