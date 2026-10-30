import * as repo from "../admin/admin.repository.js";
import { minor } from "../admin/booking-finance.js";
export async function postLedger(booking, kind, amount, reference, tx) {
  if (!tx) throw new Error("Financial events require a database transaction.");
  minor(Math.abs(Number(amount)));
  const key = `${kind}:${reference}`;
  const [prior] = await repo.select(
    "SELECT EntryId FROM dbo.FinancialLedger WITH(UPDLOCK,HOLDLOCK) WHERE EventKey=:key",
    { key },
    tx,
  );
  if (prior) return;
  await repo.insert(
    { table: "FinancialLedger", id: "EntryId" },
    {
      EventKey: key,
      BookingId: booking.BookingId,
      VendorId: booking.VendorId,
      Kind: kind,
      Amount: amount,
      Currency: "INR",
      Reference: String(reference),
    },
    tx,
  );
}
