import { z } from "zod";
import {
  scope,
  repo,
  owned,
  assertVersion,
  fail,
  audit,
} from "../vendors/workspace.common.js";
import {
  financialRows,
  financialSummary,
  syncPayout,
  milestone,
} from "../admin/booking-finance.js";
export async function completeBooking(id, input, ctx) {
  const { id: vendor, user } = scope(ctx);
  const body = z
    .object({
      expectedUpdatedAt: z.iso.datetime(),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await owned("bookings", id, vendor, tx);
    assertVersion(row, body.expectedUpdatedAt);
    if (
      !row.CommerceCheckoutKey ||
      !["Confirmed", "InProgress"].includes(row.BookingStatus)
    )
      fail("Only confirmed product reservations can be completed here.", 409);
    const [future] = await repo.select(
      "SELECT TOP(1) BookingId FROM dbo.BookingReservations WHERE BookingId=:id AND EndsAt>DATEADD(minute,330,SYSUTCDATETIME())",
      { id },
      tx,
    );
    if (future) fail("The reserved duration has not ended.", 409);
    const financial = financialSummary(row, await financialRows(id, tx, true));
    if (financial.remaining > 0 || financial.refundPending > 0)
      fail("Reconcile the payment balance before completing the booking.", 409);
    const values = { BookingStatus: "Completed", UpdatedAt: new Date() };
    await repo.update({ table: "Booking", id: "BookingId" }, id, values, tx);
    await repo.insert(
      { table: "BookingStatusHistory", id: "BookingStatusHistoryId" },
      {
        BookingId: id,
        OldStatus: row.BookingStatus,
        NewStatus: "Completed",
        ChangedBy: user.id,
        ActorRole: "Vendor",
        ActionType: "Completed",
        Remarks: body.reason,
        PublicNote: body.reason,
      },
      tx,
    );
    await audit(
      ctx,
      "BOOKING_COMPLETED",
      "Booking",
      id,
      { status: row.BookingStatus },
      { status: "Completed", reason: body.reason },
      tx,
    );
    await syncPayout({ ...row, ...values }, ctx, tx);
    await milestone(
      row,
      "status:Completed",
      "Booking completed",
      `${row.BookingNumber}: ${body.reason}`,
      tx,
    );
    return { message: "Booking marked as completed." };
  });
}
