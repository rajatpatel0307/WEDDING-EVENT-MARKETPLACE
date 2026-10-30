import { z } from "zod";
import * as repo from "../admin/admin.repository.js";
import { requireRole } from "../../middleware/auth.middleware.js";
import { initiate } from "../admin/booking-refunds.service.js";
import { fail, milestone } from "../admin/booking-finance.js";

export async function list(input, ctx) {
  requireRole(ctx, "ADMIN");
  const q = z
    .object({
      page: z.coerce.number().int().min(1).max(10000).default(1),
      status: z.enum(["", "Requested", "Approved", "Rejected"]).default(""),
    })
    .parse(input);
  const params = { status: q.status, offset: (q.page - 1) * 20 };
  const where = "WHERE (:status = '' OR r.Status=:status)";
  const [count] = await repo.select(
    `SELECT COUNT(*) AS total FROM dbo.CustomerRefundRequests r ${where}`,
    params,
  );
  const rows = await repo.select(
    `SELECT r.*,b.BookingNumber,b.UpdatedAt AS BookingUpdatedAt,v.BusinessName FROM dbo.CustomerRefundRequests r JOIN dbo.Booking b ON b.BookingId=r.BookingId JOIN dbo.Vendors v ON v.VendorId=b.VendorId ${where} ORDER BY r.CreatedAt DESC,r.RequestId OFFSET :offset ROWS FETCH NEXT 20 ROWS ONLY`,
    params,
  );
  return { rows, total: Number(count.total), page: q.page, pageSize: 20 };
}
export async function decide(id, input, ctx) {
  const user = requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const b = z
    .object({
      action: z.enum(["approve", "reject"]),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const [source] = await repo.select(
      "SELECT BookingId FROM dbo.CustomerRefundRequests WHERE RequestId=:id",
      { id },
      tx,
    );
    if (!source) fail("Refund request not found.", 404);
    const booking = await repo.lockRecord(
      { table: "Booking", id: "BookingId" },
      source.BookingId,
      tx,
    );
    const row = await repo.lockRecord(
      { table: "CustomerRefundRequests", id: "RequestId" },
      id,
      tx,
    );
    if (row.Status !== "Requested") {
      if (row.Status === (b.action === "approve" ? "Approved" : "Rejected"))
        return { message: "Decision already recorded." };
      fail("Refund request was already decided.", 409);
    }
    let operationId = null;
    if (b.action === "approve") {
      const result = await initiate(
        row.BookingId,
        {
          expectedUpdatedAt: new Date(booking.UpdatedAt).toISOString(),
          idempotencyKey: row.IdempotencyKey,
          reason: b.reason,
          notes: `Customer request ${id}: ${row.Reason}`,
        },
        ctx,
        { transaction: tx, amount: Number(row.Amount) },
      );
      operationId = result.operationId;
    }
    await repo.update(
      { table: "CustomerRefundRequests", id: "RequestId" },
      id,
      {
        Status: b.action === "approve" ? "Approved" : "Rejected",
        DecisionReason: b.reason,
        DecidedBy: user.id,
        DecidedAt: new Date(),
        OperationId: operationId,
      },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "ADMIN_REFUND_DECISION",
      "Booking",
      row.BookingId,
      { requestId: id, status: row.Status },
      { requestId: id, action: b.action, reason: b.reason, operationId },
      tx,
    );
    await milestone(
      booking,
      `refund-${b.action}:${id}`,
      `Refund ${b.action === "approve" ? "approved" : "rejected"}`,
      `${booking.BookingNumber}: ${b.reason}`,
      tx,
    );
    return {
      message:
        b.action === "approve"
          ? "Approved and queued for provider processing."
          : "Refund request rejected.",
    };
  });
}
