import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import { assertVersion } from "../vendors/workspace.common.js";
import * as repo from "./admin.repository.js";
import { getBooking } from "./bookings-management.service.js";
import { postLedger } from "../payments/ledger.js";
import {
  minor,
  financialRows,
  financialSummary,
  audit,
  history,
  milestone,
  syncPayout,
  fail,
} from "./booking-finance.js";
export const refundInput = z
  .object({
    expectedUpdatedAt: z.iso.datetime(),
    idempotencyKey: z.guid(),
    reason: z.string().trim().min(3).max(1000),
    notes: z.string().trim().max(2000).default(""),
  })
  .strict();
export async function initiate(id, input, ctx, { transaction, amount } = {}) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const b = refundInput.parse(input),
    hash = createHash("sha256")
      .update(JSON.stringify({ id, reason: b.reason, notes: b.notes, amount }))
      .digest("hex");
  const transact = transaction ? (fn) => fn(transaction) : repo.transaction;
  return transact(async (tx) => {
    const row = await getBooking(id, ctx, tx, true);
    const [prior] = await repo.select(
      "SELECT * FROM dbo.AdminBookingOperations WITH(UPDLOCK,HOLDLOCK) WHERE IdempotencyKey=:key",
      { key: b.idempotencyKey },
      tx,
    );
    if (prior) {
      if (
        prior.BookingId.toLowerCase() !== id.toLowerCase() ||
        prior.RequestHash !== hash ||
        prior.RequestedBy.toLowerCase() !== ctx.auth.user.id.toLowerCase()
      )
        fail("Idempotency key was already used for a different request.");
      return {
        message: "Refund request already recorded.",
        operationId: prior.OperationId,
        replayed: true,
      };
    }
    assertVersion(row, b.expectedUpdatedAt);
    const ledger = await financialRows(id, tx, true),
      summary = financialSummary(row, ledger);
    if (!summary.canRefund) fail(summary.refundBlockedReason);
    if (amount !== undefined)
      z.number()
        .positive()
        .multipleOf(0.01)
        .max(summary.refundEligible)
        .parse(amount);
    const requested = amount ?? summary.refundEligible;
    const operationId = randomUUID();
    await repo.insert(
      { table: "AdminBookingOperations", id: "OperationId" },
      {
        OperationId: operationId,
        BookingId: id,
        IdempotencyKey: b.idempotencyKey,
        RequestedBy: ctx.auth.user.id,
        RequestHash: hash,
      },
      tx,
    );
    let outstanding = minor(requested);
    const ids = [];
    for (const p of ledger.payments.filter((p) =>
      ["Success", "Refunded"].includes(p.PaymentStatus),
    )) {
      const used = ledger.refunds
        .filter(
          (r) =>
            r.PaymentId.toLowerCase() === p.PaymentId.toLowerCase() &&
            ["Pending", "Processing", "Completed"].includes(r.RefundStatus),
        )
        .reduce((n, r) => n + minor(r.RefundAmount), 0);
      const amount = Math.min(outstanding, Math.max(0, minor(p.Amount) - used));
      if (!amount) continue;
      const refundId = randomUUID();
      ids.push(refundId);
      await repo.insert(
        { table: "Refunds", id: "RefundId" },
        {
          RefundId: refundId,
          PaymentId: p.PaymentId,
          BookingId: id,
          RefundReference: `AR-${refundId}`,
          RefundAmount: amount / 100,
          Reason: b.reason,
          RefundStatus: "Pending",
          AdminOperationId: operationId,
          RequestedBy: ctx.auth.user.id,
        },
        tx,
      );
      await repo.insert(
        { table: "PaymentTransactions", id: "TransactionId" },
        {
          PaymentId: p.PaymentId,
          TransactionType: "RefundInitiated",
          Amount: amount / 100,
          TransactionStatus: "Pending",
          TransactionData: JSON.stringify({ refundId, operationId }),
        },
        tx,
      );
      outstanding -= amount;
      if (!outstanding) break;
    }
    if (outstanding || !ids.length)
      fail("The captured payment ledger changed. Reconcile before refunding.");
    await repo.update(
      { table: "Booking", id: "BookingId" },
      id,
      { PaymentStatus: "RefundPending", UpdatedAt: new Date() },
      tx,
    );
    await history(row, "RefundInitiated", ctx, b.reason, b.notes, tx);
    await audit(
      ctx,
      "BOOKING_REFUND_INITIATED",
      id,
      { paymentStatus: row.PaymentStatus },
      {
        operationId,
        refundIds: ids,
        amount: requested,
        reason: b.reason,
        notes: b.notes,
      },
      tx,
    );
    await syncPayout(row, ctx, tx);
    await milestone(
      row,
      `refund-initiated:${operationId}`,
      "Refund initiated",
      `${row.BookingNumber}: INR ${requested.toFixed(2)} refund has been queued. ${b.reason}`,
      tx,
    );
    return {
      message:
        "Refund queued. Completion will be recorded after payment-provider confirmation.",
      operationId,
      refundIds: ids,
      amount: requested,
    };
  });
}
const remoteSchema = z
  .object({
    id: z.string().regex(/^rfnd_[A-Za-z0-9]+$/),
    payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
    amount: z.number().int().positive(),
    currency: z.literal("INR"),
    status: z.enum(["pending", "processed", "failed"]),
    receipt: z.string().nullable().optional(),
  })
  .passthrough();
export async function reconcileRefund(value) {
  const remote = remoteSchema.parse(value);
  const [payment] = await repo.select(
    "SELECT * FROM dbo.Payments WHERE GatewayName='Razorpay' AND GatewayTransactionId=:id",
    { id: remote.payment_id },
  );
  if (!payment)
    fail(
      "Original payment is awaiting reconciliation. Retry this refund event after capture verification.",
      503,
    );
  return repo.transaction(async (tx) => {
    const [row] = await repo.select(
      "SELECT * FROM dbo.Booking WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=:id",
      { id: payment.BookingId },
      tx,
    );
    const [stored] = await repo.select(
      "SELECT * FROM dbo.Refunds WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=:id AND (GatewayRefundId=:gateway OR RefundReference=:receipt)",
      { id: row.BookingId, gateway: remote.id, receipt: remote.receipt || "" },
      tx,
    );
    if (
      remote.amount > minor(payment.Amount) ||
      payment.Currency !== remote.currency
    )
      fail("Refund does not match the captured payment.");
    if (!["Success", "Refunded"].includes(payment.PaymentStatus))
      fail(
        "Original payment is awaiting capture verification. Retry this refund event.",
        503,
      );
    let refund = stored;
    if (
      refund &&
      (refund.PaymentId.toLowerCase() !== payment.PaymentId.toLowerCase() ||
        minor(refund.RefundAmount) !== remote.amount ||
        (refund.GatewayRefundId && refund.GatewayRefundId !== remote.id))
    )
      fail("Refund provider response does not match the refund request.");
    if (!refund) {
      const [used] = await repo.select(
        "SELECT COALESCE(SUM(RefundAmount),0) AS total FROM dbo.Refunds WITH(UPDLOCK,HOLDLOCK) WHERE PaymentId=:id AND RefundStatus='Completed'",
        { id: payment.PaymentId },
        tx,
      );
      if (minor(used.total) + remote.amount > minor(payment.Amount))
        fail("Cumulative provider refunds exceed the captured payment.");
      refund = {
        RefundId: randomUUID(),
        BookingId: row.BookingId,
        PaymentId: payment.PaymentId,
        RefundAmount: remote.amount / 100,
        RefundStatus: "Pending",
        RequestedBy: null,
      };
      await repo.insert(
        { table: "Refunds", id: "RefundId" },
        {
          ...refund,
          RefundReference: remote.id,
          GatewayRefundId: remote.id,
          Reason: "Payment-provider refund reconciliation",
        },
        tx,
      );
    }
    const status =
      remote.status === "processed"
        ? "Completed"
        : remote.status === "failed"
          ? "Failed"
          : "Processing";
    if (status === "Completed") {
      const [other] = await repo.select(
        "SELECT COALESCE(SUM(RefundAmount),0) AS total FROM dbo.Refunds WITH(UPDLOCK,HOLDLOCK) WHERE PaymentId=:id AND RefundId<>:refund AND RefundStatus='Completed'",
        { id: payment.PaymentId, refund: refund.RefundId },
        tx,
      );
      if (minor(other.total) + remote.amount > minor(payment.Amount))
        fail("Cumulative provider refunds exceed the captured payment.");
    }
    if (
      refund.RefundStatus === "Completed" ||
      (refund.RefundStatus === "Failed" && status !== "Completed")
    )
      return { message: "Refund already reconciled." };
    if (
      refund.RefundStatus === status &&
      refund.GatewayRefundId === remote.id
    ) {
      await repo.update(
        { table: "Refunds", id: "RefundId" },
        refund.RefundId,
        {
          LeaseUntil: null,
          LastError: null,
          NextAttemptAt: new Date(Date.now() + 60000),
        },
        tx,
      );
      return { message: "Refund status unchanged." };
    }
    await repo.update(
      { table: "Refunds", id: "RefundId" },
      refund.RefundId,
      {
        GatewayRefundId: remote.id,
        RefundStatus: status,
        ProcessedAt: status === "Completed" ? new Date() : null,
        LeaseUntil: null,
        LastError: null,
        NextAttemptAt:
          status === "Processing" ? new Date(Date.now() + 60000) : null,
      },
      tx,
    );
    await repo.insert(
      { table: "PaymentTransactions", id: "TransactionId" },
      {
        PaymentId: payment.PaymentId,
        TransactionType:
          status === "Completed"
            ? "RefundCompleted"
            : status === "Failed"
              ? "RefundFailed"
              : "RefundProcessing",
        Amount: remote.amount / 100,
        TransactionStatus: status,
        GatewayTransactionId: remote.id,
        TransactionData: JSON.stringify({ refundId: refund.RefundId }),
      },
      tx,
    );
    if (status === "Completed")
      await postLedger(row, "Refund", -(remote.amount / 100), remote.id, tx);
    const ledger = await financialRows(row.BookingId, tx, true),
      summary = financialSummary(row, ledger);
    if (
      status === "Completed" &&
      ledger.payouts.some((p) =>
        ["Paid", "Processing"].includes(p.PayoutStatus),
      )
    ) {
      await postLedger(
        row,
        "RecoveryRequired",
        remote.amount / 100,
        remote.id,
        tx,
      );
      await audit(
        { auth: { user: { id: null } }, req: { ip: "payment-provider" } },
        "BOOKING_PAYOUT_REVIEW_REQUIRED",
        row.BookingId,
        null,
        {
          refundId: refund.RefundId,
          reason:
            "Verified refund after payout; recover funds through a separately approved adjustment.",
        },
        tx,
      );
    }
    const payRefunded = ledger.refunds
      .filter(
        (r) =>
          r.PaymentId.toLowerCase() === payment.PaymentId.toLowerCase() &&
          r.RefundStatus === "Completed",
      )
      .reduce((n, r) => n + minor(r.RefundAmount), 0);
    if (payRefunded >= minor(payment.Amount))
      await repo.update(
        { table: "Payments", id: "PaymentId" },
        payment.PaymentId,
        { PaymentStatus: "Refunded" },
        tx,
      );
    const paymentStatus =
      summary.refundPending > 0
        ? "RefundPending"
        : summary.refunded >= summary.paid && summary.paid > 0
          ? "Refunded"
          : summary.refunded > 0
            ? "PartiallyRefunded"
            : summary.paid >= Number(row.TotalAmount)
              ? "Paid"
              : summary.paid > 0
                ? "PartiallyPaid"
                : "Pending";
    await repo.update(
      { table: "Booking", id: "BookingId" },
      row.BookingId,
      { PaymentStatus: paymentStatus, UpdatedAt: new Date() },
      tx,
    );
    const ctx = {
      actorRole: "System",
      auth: { user: { id: refund.RequestedBy || null } },
      req: { ip: "payment-provider" },
    };
    await history(
      row,
      `Refund${status}`,
      ctx,
      "Verified payment-provider refund event.",
      "",
      tx,
    );
    await audit(
      ctx,
      `BOOKING_REFUND_${status.toUpperCase()}`,
      row.BookingId,
      { status: refund.RefundStatus },
      {
        refundId: refund.RefundId,
        gatewayRefundId: remote.id,
        status,
        amount: remote.amount / 100,
      },
      tx,
    );
    await syncPayout(row, ctx, tx);
    if (status !== "Processing")
      await milestone(
        row,
        `refund-${status}:${refund.RefundId}`,
        `Refund ${status.toLowerCase()}`,
        `${row.BookingNumber}: INR ${(remote.amount / 100).toFixed(2)} refund ${status.toLowerCase()}.`,
        tx,
      );
    return { message: "Refund reconciled.", status };
  });
}
export async function providerRequest(path, body, key) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    fail("Refund provider credentials are not configured.", 503);
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(key ? { "X-Refund-Idempotency": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    fail("Refund provider request requires retry or reconciliation.", 502);
  return remoteSchema.parse(await response.json());
}
export async function processRefundQueue({
  request = providerRequest,
  limit = 10,
} = {}) {
  let processed = 0;
  for (let i = 0; i < limit; i++) {
    const refund = await repo.transaction(async (tx) => {
      const [r] = await repo.select(
        "SELECT TOP(1) r.*,p.GatewayTransactionId FROM dbo.Refunds r WITH(UPDLOCK,READPAST,ROWLOCK) JOIN dbo.Payments p ON p.PaymentId=r.PaymentId WHERE r.AdminOperationId IS NOT NULL AND r.RefundStatus IN('Pending','Processing') AND (r.LeaseUntil IS NULL OR r.LeaseUntil<SYSUTCDATETIME()) AND (r.NextAttemptAt IS NULL OR r.NextAttemptAt<=SYSUTCDATETIME()) ORDER BY r.CreatedAt,r.RefundId",
        {},
        tx,
      );
      if (!r) return null;
      await repo.update(
        { table: "Refunds", id: "RefundId" },
        r.RefundId,
        { LeaseUntil: new Date(Date.now() + 120000), Attempts: r.Attempts + 1 },
        tx,
      );
      return r;
    });
    if (!refund) break;
    try {
      const remote = refund.GatewayRefundId
        ? await request(`/refunds/${refund.GatewayRefundId}`)
        : await request(
            `/payments/${refund.GatewayTransactionId}/refund`,
            {
              amount: minor(refund.RefundAmount),
              speed: "normal",
              receipt: refund.RefundReference,
            },
            refund.RefundId,
          );
      if (
        remote.payment_id !== refund.GatewayTransactionId ||
        remote.amount !== minor(refund.RefundAmount)
      )
        fail("Refund response mismatch.");
      await reconcileRefund(remote);
      processed++;
    } catch {
      await repo.select(
        "UPDATE dbo.Refunds SET LeaseUntil=NULL,NextAttemptAt=:next,LastError='Provider confirmation unavailable; retry queued.' WHERE RefundId=:id AND RefundStatus IN('Pending','Processing')",
        {
          id: refund.RefundId,
          next: new Date(
            Date.now() +
              Math.min(3600000, 30000 * 2 ** Math.min(refund.Attempts, 7)),
          ),
        },
      );
    }
  }
  return { processed };
}
