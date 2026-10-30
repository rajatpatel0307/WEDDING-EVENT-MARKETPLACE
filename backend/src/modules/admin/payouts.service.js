import { createHash } from "node:crypto";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as repo from "./admin.repository.js";
import { assertVersion } from "../vendors/workspace.common.js";
import { financialRows, minor, fail } from "./booking-finance.js";
import { postLedger } from "../payments/ledger.js";
const input = z
  .object({
    action: z.enum([
      "approve",
      "hold",
      "reject",
      "start-settlement",
      "confirm-paid",
      "record-failure",
    ]),
    expectedUpdatedAt: z.iso.datetime(),
    note: z.string().trim().min(3).max(2000),
    idempotencyKey: z.guid().optional(),
    reference: z.string().trim().min(6).max(150).optional(),
    destination: z.string().trim().min(6).max(150).optional(),
    destinationVerified: z.literal(true).optional(),
  })
  .strict();
export function eligiblePayout(booking, row, ledger) {
  if (
    row.BookingId?.toLowerCase() !== booking.BookingId?.toLowerCase() ||
    !row.VendorId ||
    row.VendorId.toLowerCase() !== booking.VendorId?.toLowerCase()
  )
    fail("Payout ownership does not match the booking.");
  if (
    ledger.commissions.some(
      (commission) =>
        !commission.VendorId ||
        commission.VendorId.toLowerCase() !== row.VendorId.toLowerCase(),
    )
  )
    fail("Commission ownership does not match the payout.");
  if (booking.BookingStatus !== "Completed")
    fail("Only completed bookings can be settled.");
  if (ledger.payouts.length !== 1)
    fail("Multiple payouts require reconciliation before settlement.");
  if (!ledger.commissions.length) fail("A recorded commission is required.");
  if (
    ledger.refunds.some((r) =>
      ["Pending", "Processing"].includes(r.RefundStatus),
    )
  )
    fail("A refund is still in progress.");
  const captured = ledger.payments
    .filter(
      (p) =>
        ["Success", "Refunded"].includes(p.PaymentStatus) &&
        p.Currency === "INR",
    )
    .reduce((n, p) => n + minor(p.Amount), 0);
  const refunded = ledger.refunds
    .filter((r) => r.RefundStatus === "Completed")
    .reduce((n, r) => n + minor(r.RefundAmount), 0);
  const commission = ledger.commissions.reduce(
    (n, c) => n + minor(c.CommissionAmount),
    0,
  );
  const net =
    minor(row.GrossAmount) -
    commission -
    minor(row.TaxDeduction) -
    refunded -
    minor(row.ApplicableFees);
  if (
    captured < minor(booking.TotalAmount) ||
    minor(row.GrossAmount) !== minor(booking.TotalAmount) ||
    minor(row.PlatformCommission) !== commission ||
    minor(row.RefundDeduction) !== refunded ||
    net <= 0 ||
    minor(row.NetAmount) !== net ||
    captured - refunded < net
  )
    fail(
      "The payout ledger must be reconciled with captured payments, commission and refunds.",
    );
  return createHash("sha256")
    .update(
      JSON.stringify({
        booking: booking.BookingId,
        vendor: row.VendorId,
        captured,
        refunded,
        commission,
        net,
        gross: minor(row.GrossAmount),
        tax: minor(row.TaxDeduction),
        fees: minor(row.ApplicableFees),
      }),
    )
    .digest("hex");
}
export async function decide(id, body, ctx) {
  const user = requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const b = input.parse(body);
  return repo.transaction(async (tx) => {
    const [source] = await repo.select(
      "SELECT BookingId FROM dbo.VendorPayouts WHERE PayoutId=:id",
      { id },
      tx,
    );
    if (!source) fail("Payout not found.", 404);
    const booking = await repo.lockRecord(
      { table: "Booking", id: "BookingId" },
      source.BookingId,
      tx,
    );
    const ledger = await financialRows(source.BookingId, tx, true);
    const row = ledger.payouts.find(
      (p) => p.PayoutId.toLowerCase() === id.toLowerCase(),
    );
    if (!row) fail("Payout not found.", 404);
    const [refundRequest] = await repo.select(
      "SELECT RequestId FROM dbo.CustomerRefundRequests WHERE BookingId=:id AND Status='Requested'",
      { id: source.BookingId },
      tx,
    );
    if (
      refundRequest &&
      ["approve", "start-settlement", "confirm-paid"].includes(b.action)
    )
      fail("A customer refund request must be reviewed before settlement.");
    if (
      b.action === "confirm-paid" &&
      b.idempotencyKey &&
      b.reference &&
      row.PayoutStatus === "Paid" &&
      row.SettlementKey?.toLowerCase() === b.idempotencyKey.toLowerCase() &&
      row.SettlementReference === b.reference
    )
      return { message: "Settlement already recorded.", replayed: true };
    assertVersion(row, b.expectedUpdatedAt);
    if (row.PayoutStatus === "Paid") fail("Paid payouts cannot be changed.");
    const values = {
      ReviewReason: b.note,
      ReviewedBy: user.id,
      ReviewedAt: new Date(),
      UpdatedAt: new Date(),
    };
    if (["approve", "hold", "reject"].includes(b.action)) {
      if (row.PayoutStatus === "Processing")
        fail("Resolve the in-flight settlement before changing review status.");
      Object.assign(values, {
        ReviewStatus: {
          approve: "Approved",
          hold: "OnHold",
          reject: "Rejected",
        }[b.action],
        PayoutStatus: b.action === "approve" ? "Pending" : "OnHold",
        ReviewLedgerHash:
          b.action === "approve" ? eligiblePayout(booking, row, ledger) : null,
      });
    } else {
      if (process.env.PAYOUT_SETTLEMENT_MODE !== "manual")
        fail(
          "Manual settlement recording must be enabled by the server operator. No transfer has been initiated.",
          503,
        );
      if (row.ReviewStatus !== "Approved")
        fail("Approve this payout before settlement.");
      const hash =
        b.action === "record-failure"
          ? row.ReviewLedgerHash
          : eligiblePayout(booking, row, ledger);
      if (hash !== row.ReviewLedgerHash)
        fail("Financial records changed. Review the payout again.");
      if (b.action === "start-settlement") {
        if (row.PayoutStatus !== "Pending")
          fail("Settlement is already in flight.");
        values.PayoutStatus = "Processing";
        if (
          !b.destination ||
          !b.destinationVerified ||
          (b.destination.match(/\d/g)?.length || 0) > 4
        )
          fail(
            "A masked destination reference and external beneficiary verification are required. Never enter a complete bank account number.",
            400,
          );
        values.DestinationLabel = b.destination;
        values.SettlementStartedBy = user.id;
      } else if (b.action === "record-failure") {
        if (row.PayoutStatus !== "Processing" || !b.reference)
          fail(
            "An in-flight settlement and external failure reference are required.",
          );
        Object.assign(values, {
          PayoutStatus: "Failed",
          ReviewStatus: "OnHold",
          ReviewLedgerHash: null,
        });
      } else {
        if (row.PayoutStatus !== "Processing")
          fail("Reserve this payout for external settlement first.");
        if (!b.idempotencyKey || !b.reference)
          fail("A settlement reference and idempotency key are required.", 400);
        const threshold = Number(
          process.env.PAYOUT_DUAL_APPROVAL_THRESHOLD || 0,
        );
        if (!Number.isFinite(threshold) || threshold < 0)
          fail("Payout approval threshold configuration is invalid.", 503);
        if (
          threshold > 0 &&
          Number(row.NetAmount) >= threshold &&
          row.SettlementStartedBy?.toLowerCase() === user.id.toLowerCase()
        )
          fail(
            "Policy requires a second administrator to confirm this payout.",
            403,
          );
        Object.assign(values, {
          PayoutStatus: "Paid",
          PaidAt: new Date(),
          SettlementReference: b.reference,
          SettlementKey: b.idempotencyKey,
        });
      }
    }
    await repo.update(
      { table: "VendorPayouts", id: "PayoutId" },
      id,
      values,
      tx,
    );
    if (b.action === "confirm-paid")
      await postLedger(booking, "Payout", -Number(row.NetAmount), id, tx);
    if (b.action === "start-settlement")
      await postLedger(
        booking,
        "PayoutReserved",
        Number(row.NetAmount),
        `${id}:${new Date(row.UpdatedAt).getTime()}`,
        tx,
      );
    await repo.auditAdmin(
      ctx,
      b.action === "record-failure"
        ? "ADMIN_PAYOUT_FAILED"
        : "ADMIN_PAYOUT_DECISION",
      "VendorPayouts",
      id,
      { status: row.PayoutStatus, review: row.ReviewStatus },
      {
        ...values,
        note: b.note,
        action: b.action,
        reference: b.reference || null,
      },
      tx,
    );
    await repo.select(
      "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) SELECT UserId,'PayoutUpdate','Payout update',:message,'Booking',:booking FROM dbo.Vendors WHERE VendorId=:vendor",
      {
        message: `Your payout status: ${{ approve: "Approved", hold: "On hold", reject: "Rejected", "start-settlement": "Reserved for external settlement", "record-failure": "External settlement failed", "confirm-paid": "External settlement confirmed" }[b.action]}. Open your earnings ledger for details.`,
        booking: row.BookingId,
        vendor: row.VendorId,
      },
      tx,
    );
    return {
      message:
        b.action === "confirm-paid"
          ? "Confirmed external settlement recorded. No transfer was initiated by this application."
          : "Payout review updated.",
    };
  });
}
