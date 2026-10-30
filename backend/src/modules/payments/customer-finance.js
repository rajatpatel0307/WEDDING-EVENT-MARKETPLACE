import { createHash } from "node:crypto";
import { z } from "zod";
import {
  scope,
  owned,
  repo,
  fail,
  insert,
} from "../customers/workspace.common.js";
import {
  financialRows,
  financialSummary,
  milestone,
  minor,
} from "../admin/booking-finance.js";
import { transactionDetails } from "../customers/workspace.service.js";
import { refreshOrder } from "./reconciliation.js";

export const requestInput = z
  .object({
    bookingId: z.guid(),
    amount: z.number().positive().multipleOf(0.01).max(90000000000000),
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: z.guid(),
  })
  .strict();
export async function refundEligibility(id, ctx) {
  const { id: customer } = scope(ctx);
  const booking = await owned("bookings", id, customer, undefined, false);
  const summary = financialSummary(booking, await financialRows(id));
  const [request] = await repo.select(
    "SELECT RequestId AS id FROM dbo.CustomerRefundRequests WHERE BookingId=:id AND Status='Requested'",
    { id },
  );
  return {
    booking: booking.BookingNumber,
    eligible: summary.canRefund && !request,
    amount: summary.refundEligible,
    reason: request
      ? "A refund request is already awaiting review."
      : summary.refundBlockedReason,
    policy: summary.policy,
    terms: summary.policyTerms,
  };
}
export async function requestRefund(input, ctx) {
  const { id: customer } = scope(ctx),
    b = requestInput.parse(input);
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        bookingId: b.bookingId.toLowerCase(),
        amount: minor(b.amount),
        reason: b.reason,
      }),
    )
    .digest("hex");
  return repo.transaction(async (tx) => {
    const booking = await owned("bookings", b.bookingId, customer, tx);
    const [prior] = await repo.select(
      "SELECT * FROM dbo.CustomerRefundRequests WITH(UPDLOCK,HOLDLOCK) WHERE IdempotencyKey=:key",
      { key: b.idempotencyKey },
      tx,
    );
    if (prior) {
      if (
        prior.CustomerId.toLowerCase() !== customer.toLowerCase() ||
        prior.RequestHash !== hash
      )
        fail("Idempotency key belongs to another refund request.", 409);
      return {
        id: prior.RequestId,
        message: "Refund request already recorded.",
      };
    }
    const [open] = await repo.select(
      "SELECT RequestId FROM dbo.CustomerRefundRequests WHERE BookingId=:id AND Status='Requested'",
      { id: b.bookingId },
      tx,
    );
    if (open) fail("A refund request is already awaiting review.", 409);
    const summary = financialSummary(
      booking,
      await financialRows(b.bookingId, tx, true),
    );
    if (!summary.canRefund) fail(summary.refundBlockedReason, 409);
    if (minor(b.amount) > minor(summary.refundEligible))
      fail("Refund exceeds the eligible captured balance.", 409);
    const row = await insert(
      "CustomerRefundRequests",
      "RequestId",
      {
        BookingId: b.bookingId,
        CustomerId: customer,
        Amount: b.amount,
        Reason: b.reason,
        IdempotencyKey: b.idempotencyKey,
        RequestHash: hash,
      },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "CUSTOMER_REFUND_REQUESTED",
      "Booking",
      b.bookingId,
      null,
      { requestId: row.id, amount: b.amount, reason: b.reason },
      tx,
    );
    await milestone(
      booking,
      `refund-request:${row.id}`,
      "Refund requested",
      `${booking.BookingNumber}: refund request submitted for review.`,
      tx,
    );
    return {
      id: row.id,
      message:
        "Refund requested. Support will review your policy and captured payments.",
    };
  });
}
export async function refunds(input, ctx) {
  const { id: customer } = scope(ctx);
  const q = z
    .object({
      page: z.coerce.number().int().min(1).max(10000).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(20),
    })
    .parse(input);
  const params = {
    customer,
    size: q.pageSize,
    offset: (q.page - 1) * q.pageSize,
  };
  const [count] = await repo.select(
    "SELECT COUNT(*) AS total FROM dbo.CustomerRefundRequests WHERE CustomerId=:customer",
    params,
  );
  const rows = await repo.select(
    `SELECT r.RequestId AS id,r.BookingId AS bookingId,b.BookingNumber AS booking,r.Amount AS amount,r.Reason AS reason,r.Status AS reviewStatus,r.DecisionReason AS decisionReason,r.CreatedAt AS createdAt,
    CASE WHEN r.Status<>'Approved' THEN r.Status WHEN EXISTS(SELECT 1 FROM dbo.Refunds f WHERE f.AdminOperationId=r.OperationId AND f.RefundStatus='Failed') THEN 'Failed' WHEN EXISTS(SELECT 1 FROM dbo.Refunds f WHERE f.AdminOperationId=r.OperationId AND f.RefundStatus IN('Pending','Processing')) THEN 'Processing' WHEN EXISTS(SELECT 1 FROM dbo.Refunds f WHERE f.AdminOperationId=r.OperationId AND f.RefundStatus='Completed') THEN 'Completed' ELSE 'Approved' END AS status
    FROM dbo.CustomerRefundRequests r JOIN dbo.Booking b ON b.BookingId=r.BookingId WHERE r.CustomerId=:customer ORDER BY r.CreatedAt DESC,r.RequestId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    params,
  );
  return { rows, total: Number(count.total), ...q };
}
export async function receipt(id, ctx) {
  const details = await transactionDetails(id, ctx),
    p = details.payment;
  if (!["Success", "Refunded"].includes(p.status))
    fail("A receipt is available after verified capture.", 409);
  return [
    "MarryNest — Payment receipt",
    `Reference: ${p.reference}`,
    `Booking: ${p.booking}`,
    `Amount captured: ${Number(p.amount).toFixed(2)} ${p.currency}`,
    `Method: ${p.method}`,
    `Provider: ${p.gateway}`,
    `Verified payment date: ${new Date(p.paidAt || p.createdAt).toISOString()}`,
    `Payment status: ${p.status}`,
    ...details.refunds.map(
      (r) =>
        `Refund: ${Number(r.amount).toFixed(2)} ${p.currency} — ${r.status}`,
    ),
    "Payment and vendor booking acceptance are separate events.",
    "This receipt acknowledges a captured payment and is not a tax invoice.",
  ].join("\n");
}
export async function status(id, ctx, refresh = false) {
  const { id: customer } = scope(ctx);
  await owned("bookings", id, customer, undefined, false);
  const rows = await repo.select(
    "SELECT OrderId AS id,GatewayOrderId AS reference,AmountMinor AS amountMinor,Currency AS currency,Status AS status,CreatedAt AS createdAt FROM dbo.CustomerPaymentOrders WHERE BookingId=:id ORDER BY CreatedAt DESC,OrderId",
    { id },
  );
  if (refresh && rows.length) await refreshOrder(rows[0].id);
  const booking = await owned("bookings", id, customer, undefined, false);
  const latest = refresh
    ? await repo.select(
        "SELECT OrderId AS id,GatewayOrderId AS reference,AmountMinor AS amountMinor,Currency AS currency,Status AS status,CreatedAt AS createdAt FROM dbo.CustomerPaymentOrders WHERE BookingId=:id ORDER BY CreatedAt DESC,OrderId",
        { id },
      )
    : rows;
  return {
    orders: latest,
    paymentStatus: booking.PaymentStatus,
    bookingStatus: booking.BookingStatus,
    paid: booking.PaidAmount,
    remaining: booking.RemainingAmount,
  };
}
