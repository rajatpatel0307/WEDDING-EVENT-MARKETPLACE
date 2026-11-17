import { select } from "../admin/admin.repository.js";

// Allocate only inside the transaction that inserts the booking. SQL Server
// holds the counter lock through commit; rollback also restores the counter.
export async function allocateBookingNumber(transaction) {
  if (!transaction || transaction.finished)
    throw new Error("Booking number allocation requires an active booking transaction.");
  const [row] = await select("EXEC dbo.AllocateBookingNumber", {}, transaction);
  if (!row?.number)
    throw new Error("Booking number allocation failed. Apply migration 032-booking-numbers.");
  return row.number;
}
