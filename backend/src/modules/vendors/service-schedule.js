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
  if (!document?.availability) return;
  const a = document.availability,
    day =
      eventDate instanceof Date
        ? eventDate.toISOString().slice(0, 10)
        : String(eventDate).slice(0, 10);
  const localToday = now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const distance =
    (new Date(`${day}T00:00:00Z`) - new Date(`${localToday}T00:00:00Z`)) /
    86400000;
  if (distance < 0 || distance > a.advanceDays)
    fail("Event date is outside the service advance booking period.");
  if (!override && !a.days.includes(new Date(`${day}T12:00:00Z`).getUTCDay()))
    fail("This service does not work on the selected day.");
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
