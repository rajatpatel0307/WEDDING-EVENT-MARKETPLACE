import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import * as repo from "../admin/admin.repository.js";
import { accessible, roleUser } from "./bookings.service.js";
import { manualPaymentBlockedReason } from "./booking-status.js";
import { assertVersion } from "../vendors/workspace.common.js";
import { audit, fail, financialRows, financialSummary, history, milestone, minor, syncPayout } from "../admin/booking-finance.js";
import { postLedger } from "../payments/ledger.js";
import { calculateCommission } from "../payments/commission-rules.js";

export const manualPaymentInput = z.object({
  expectedUpdatedAt: z.iso.datetime(),
  idempotencyKey: z.guid(),
  method: z.enum(["Cash", "UPI", "BankTransfer", "Card", "Other"]),
  reference: z.string().trim().max(200).default(""),
  reason: z.string().trim().min(3).max(1000),
  notes: z.string().trim().max(2000).default(""),
}).strict().refine((input) => input.method === "Cash" || input.reference.length >= 3, {
  message: "Enter the payment transaction reference.", path: ["reference"],
});

export async function markBookingPaid(id, input, ctx) {
  const user = roleUser(ctx, "Vendor");
  const body = manualPaymentInput.parse(input);
  ctx = { ...ctx, actorRole: "Vendor" };
  const requestHash = createHash("sha256").update(JSON.stringify({
    id: id.toLowerCase(), actor: user.id.toLowerCase(), method: body.method,
    reference: body.reference, reason: body.reason, notes: body.notes,
  })).digest("hex");
  const reference = `VM-${body.idempotencyKey.toLowerCase()}`;
  return repo.transaction(async (tx) => {
    const row = await accessible(id, ctx, "Vendor", tx, true);
    const [prior] = await repo.select(
      "SELECT * FROM dbo.Payments WITH(UPDLOCK,HOLDLOCK) WHERE PaymentReference=:reference",
      { reference }, tx,
    );
    if (prior) {
      let snapshot = {};
      try { snapshot = JSON.parse(prior.GatewayResponse || "{}"); } catch {}
      if (prior.BookingId.toLowerCase() !== id.toLowerCase() || snapshot.requestHash !== requestHash || prior.GatewayName !== "VendorManual")
        fail("Idempotency key was already used for a different payment.");
      return { message: "Payment already recorded.", replayed: true, paymentId: prior.PaymentId, amount: Number(prior.Amount) };
    }
    assertVersion(row, body.expectedUpdatedAt);
    const ledger = await financialRows(id, tx, true);
    const summary = financialSummary(row, ledger);
    const blocked = manualPaymentBlockedReason(row, ledger, summary);
    if (blocked) fail(blocked);
    const amount = summary.remaining;
    const paymentId = randomUUID();
    const transactionData = JSON.stringify({ requestHash, recordedBy: user.id, reference: body.reference, reason: body.reason, notes: body.notes });
    await repo.insert({ table: "Payments", id: "PaymentId" }, {
      PaymentId: paymentId, BookingId: id, PaymentReference: reference,
      GatewayName: "VendorManual", GatewayTransactionId: body.idempotencyKey.toLowerCase(),
      PaymentMethod: body.method, Amount: amount, Currency: "INR", PaymentStatus: "Success",
      PaidAt: new Date(), GatewayResponse: transactionData,
    }, tx);
    await repo.insert({ table: "PaymentTransactions", id: "TransactionId" }, {
      PaymentId: paymentId, TransactionType: "ManualPayment", Amount: amount,
      TransactionStatus: "Success", GatewayTransactionId: body.reference || reference,
      TransactionData: transactionData,
    }, tx);
    await postLedger(row, "VendorPaymentReceived", amount, reference, tx);
    const snapshot = JSON.parse(row.PolicySnapshotJson || "{}");
    const commission = calculateCommission(row, snapshot.commissionRule, snapshot.commissionRate);
    if (commission !== null && minor(row.TotalAmount) > 0) {
      const total = BigInt(minor(row.TotalAmount));
      const before = BigInt(minor(summary.paid));
      const accrued = BigInt(minor(commission));
      await postLedger(row, "CommissionAccrued", Number(accrued - accrued * before / total) / 100, reference, tx);
    }
    const values = { PaidAmount: Number(row.TotalAmount), PaymentStatus: "Paid", UpdatedAt: new Date() };
    await repo.update({ table: "Booking", id: "BookingId" }, id, values, tx);
    await history(row, "PaymentReceived", ctx, body.reason, body.notes, tx);
    await audit(ctx, "BOOKING_PAYMENT_MARKED_PAID", id,
      { paymentStatus: row.PaymentStatus, paid: row.PaidAmount },
      { paymentId, amount, method: body.method, reference: body.reference, paymentStatus: "Paid", reason: body.reason }, tx);
    await syncPayout({ ...row, ...values }, ctx, tx);
    await milestone(row, `payment:${reference}`, "Booking payment received",
      `${row.BookingNumber}: the vendor recorded INR ${amount.toFixed(2)} received by ${body.method}. The booking is fully paid.`, tx);
    return { message: "Booking payment marked as paid.", paymentId, amount };
  });
}
