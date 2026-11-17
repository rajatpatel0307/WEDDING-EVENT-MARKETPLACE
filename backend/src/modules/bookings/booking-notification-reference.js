// Resolve historical notification text at read time. The migration preserves
// legacy references on Booking, so notification records need no data changes.
// Arguments are internal SQL identifiers, never request input.
export function bookingNotificationText(column, alias = "t") {
  const text = `${alias}.${column}`;
  return `COALESCE((SELECT ${column === "Message"
    ? "CASE WHEN CHARINDEX(b.BookingNumber, currentText.value) > 0 THEN currentText.value ELSE CONCAT(b.BookingNumber, ': ', currentText.value) END"
    : "currentText.value"}
    FROM dbo.Booking b
    CROSS APPLY (SELECT REPLACE(${text}, COALESCE(NULLIF(b.LegacyBookingNumber, ''), b.BookingNumber), b.BookingNumber) AS value) currentText
    WHERE ${alias}.ReferenceType IN ('Booking', 'AdminBooking') AND b.BookingId = ${alias}.ReferenceId), ${text})`;
}
