import { notifyAdmins } from "../notifications/admin-events.js";
import { z } from "zod";
import * as repo from "./admin.repository.js";
import { postLedger } from "../payments/ledger.js";
import {
  ruleForServices,
  calculateCommission,
} from "../payments/commission-rules.js";
export const fail = (message, status = 409) => {
  throw Object.assign(new Error(message), { status });
};
export const minor = (value) => {
  const text = String(value ?? 0);
  if (!/^\d+(?:\.\d+)?$/.test(text)) fail("Invalid stored financial amount.");
  const [whole, fraction = ""] = text.split(".");
  const amount =
    BigInt(whole) * 100n +
    BigInt((fraction + "00").slice(0, 2)) +
    (Number(fraction[2] || 0) >= 5 ? 1n : 0n);
  if (amount > BigInt(Number.MAX_SAFE_INTEGER))
    fail("Invalid stored financial amount.");
  return Number(amount);
};
export const moneyValue = (n) => n / 100;
export const policySchema = z
  .object({
    refundPercent: z.number().min(0).max(100).multipleOf(0.01),
    cancellationFeePercent: z.number().min(0).max(100).multipleOf(0.01),
    minimumNoticeHours: z.number().int().min(0).max(8760),
  })
  .strict();
export async function commissionRate(tx) {
  const [configured] = await repo.select(
    "SELECT SettingValue FROM dbo.PlatformSettings WHERE SettingKey='bookingCommissionPercent'",
    {},
    tx,
  );
  if (configured) {
    const value = Number(configured.SettingValue);
    if (!Number.isFinite(value) || value < 0 || value > 100)
      fail("Booking commission configuration is invalid.", 503);
    return value;
  }
  if (
    process.env.BOOKING_COMMISSION_PERCENT === undefined ||
    process.env.BOOKING_COMMISSION_PERCENT === ""
  )
    return null;
  const value = Number(process.env.BOOKING_COMMISSION_PERCENT);
  if (!Number.isFinite(value) || value < 0 || value > 100)
    fail("Booking commission configuration is invalid.", 503);
  return value;
}
export const audit = async (ctx, action, bookingId, old, next, tx) => {
  await repo.select(
    "INSERT INTO dbo.AuditLogs(UserId,ActionType,EntityType,EntityId,OldValue,NewValue,IPAddress,UserAgent) VALUES(:user,:action,'Booking',:id,:old,:next,:ip,:agent)",
    {
      user: ctx.auth?.user?.id || null,
      action,
      id: bookingId,
      old: JSON.stringify(old),
      next: JSON.stringify(next),
      ip: ctx.req?.ip || "booking-worker",
      agent: String(ctx.req?.get?.("user-agent") || "booking-worker").slice(
        0,
        1000,
      ),
    },
    tx,
  );
  await notifyAdmins(action, "Booking", bookingId, tx);
};
export async function milestone(
  row,
  key,
  title,
  message,
  tx,
  recipient = "both",
) {
  const [prior] = await repo.select(
    "SELECT Milestone FROM dbo.BookingNotificationKeys WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=:id AND Milestone=:key",
    { id: row.BookingId, key },
    tx,
  );
  if (prior) return;
  await repo.select(
    "INSERT INTO dbo.BookingNotificationKeys(BookingId,Milestone) VALUES(:id,:key)",
    { id: row.BookingId, key },
    tx,
  );
  await repo.select(
    "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) SELECT target.UserId,'BookingUpdate',:title,:message,'Booking',:id FROM (SELECT :customer AS UserId UNION SELECT UserId FROM dbo.Vendors WHERE VendorId=:vendor AND :customerOnly = 0) target",
    {
      customer: row.CustomerId,
      vendor: row.VendorId,
      customerOnly: recipient === "customer" ? 1 : 0,
      title,
      message: message.slice(0, 2000),
      id: row.BookingId,
    },
    tx,
  );
}
export async function history(
  row,
  status,
  ctx,
  reason,
  notes,
  tx,
  oldStatus = row.BookingStatus,
) {
  const roles = ctx.auth?.user?.roles || [];
  const role =
    ctx.actorRole ||
    (roles.some((r) => r.code === "ADMIN" && r.active)
      ? "Admin"
      : roles.some((r) => r.code === "VENDOR" && r.active)
        ? "Vendor"
        : ctx.auth?.user?.id
          ? "Customer"
          : "System");
  await repo.insert(
    { table: "BookingStatusHistory", id: "BookingStatusHistoryId" },
    {
      BookingId: row.BookingId,
      OldStatus: oldStatus,
      NewStatus: status,
      ChangedBy: ctx.auth?.user?.id || null,
      Remarks: (reason || notes || "").slice(0, 1000),
      ActorRole: role,
      Reason: reason || null,
      Notes: notes || null,
    },
    tx,
  );
}
export async function financialRows(id, tx, lock = false) {
  const hint = lock ? "WITH(UPDLOCK,HOLDLOCK)" : "";
  const payments = await repo.select(
    `SELECT PaymentId,PaymentReference,GatewayName,GatewayTransactionId,PaymentMethod,Amount,Currency,PaymentStatus,PaidAt,CreatedAt FROM dbo.Payments ${hint} WHERE BookingId=:id ORDER BY CreatedAt,PaymentId`,
    { id },
    tx,
  );
  const refunds = await repo.select(
    `SELECT * FROM dbo.Refunds ${hint} WHERE BookingId=:id ORDER BY CreatedAt,RefundId`,
    { id },
    tx,
  );
  const payouts = await repo.select(
    `SELECT * FROM dbo.VendorPayouts ${hint} WHERE BookingId=:id ORDER BY CreatedAt,PayoutId`,
    { id },
    tx,
  );
  const commissions = await repo.select(
    `SELECT * FROM dbo.PlatformCommission ${hint} WHERE BookingId=:id ORDER BY CreatedAt,CommissionId`,
    { id },
    tx,
  );
  return { payments, refunds, payouts, commissions };
}
export function financialSummary(row, ledger, now = new Date()) {
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
  const reserved = ledger.refunds
    .filter((r) => ["Pending", "Processing"].includes(r.RefundStatus))
    .reduce((n, r) => n + minor(r.RefundAmount), 0);
  let snapshot = {};
  try {
    snapshot = JSON.parse(row.PolicySnapshotJson || "{}");
  } catch {
    /* Requires review. */
  }
  const parsed = policySchema.safeParse(snapshot.policy),
    policy = parsed.success ? parsed.data : null;
  const bookedDate =
    row.BookingDate instanceof Date
      ? row.BookingDate.toISOString().slice(0, 10)
      : String(row.BookingDate || row.EventDate).slice(0, 10);
  const bookedStart =
    row.StartTime instanceof Date
      ? row.StartTime.toISOString().slice(11, 19)
      : String(row.StartTime || "00:00:00").slice(0, 8);
  const notice =
    (new Date(
      `${bookedDate}T${bookedStart.length === 5 ? `${bookedStart}:00` : bookedStart}+05:30`,
    ).getTime() -
      new Date(row.CancelledAt || now).getTime()) /
    3600000;
  const cutoffPassed =
    policy &&
    policy.minimumNoticeHours > 0 &&
    notice < policy.minimumNoticeHours;
  const charges = policy
    ? Math.round(
        (minor(row.TotalAmount) *
          Math.round(policy.cancellationFeePercent * 100)) /
          10000,
      )
    : 0;
  const ceiling =
    policy && !cutoffPassed
      ? Math.max(
          0,
          Math.floor(
            (captured * Math.round(policy.refundPercent * 100)) / 10000,
          ) - charges,
        )
      : 0;
  const available = Math.max(
    0,
    Math.min(captured - refunded - reserved, ceiling - refunded - reserved),
  );
  const commission = ledger.commissions.reduce(
    (n, c) => n + minor(c.CommissionAmount),
    0,
  );
  const fees = ledger.payouts.length
    ? ledger.payouts.reduce(
        (n, p) => n + minor(p.TaxDeduction) + minor(p.ApplicableFees),
        0,
      )
    : minor(row.PlatformFee);
  const blockedPayout = ledger.payouts.some((p) =>
    ["Paid", "Processing"].includes(p.PayoutStatus),
  );
  const supported = ledger.payments
    .filter((p) => ["Success", "Refunded"].includes(p.PaymentStatus))
    .every(
      (p) =>
        p.Currency === "INR" &&
        p.GatewayName === "Razorpay" &&
        /^pay_[A-Za-z0-9]+$/.test(p.GatewayTransactionId || ""),
    );
  const reason = !policy
    ? "Cancellation terms require an audited policy review."
    : !["Cancelled", "Rejected"].includes(row.BookingStatus)
      ? "Cancel or reject the booking before initiating a refund."
      : cutoffPassed
        ? "The policy cancellation notice period has passed."
        : blockedPayout
          ? "A payout is paid or processing. Reconcile it before refunding."
          : !supported
            ? "A payment requires provider reconciliation before automatic refunds."
            : available <= 0
              ? "No refundable balance remains under the policy."
              : null;
  return {
    subtotal: Number(row.SubTotal),
    discount: Number(row.DiscountAmount),
    tax: Number(row.TaxAmount),
    platformFees: Number(row.PlatformFee),
    travelCharges: 0,
    total: Number(row.TotalAmount),
    paid: moneyValue(captured),
    recordedPaid: Number(row.PaidAmount),
    remaining: moneyValue(Math.max(0, minor(row.TotalAmount) - captured)),
    refunded: moneyValue(refunded),
    refundPending: moneyValue(reserved),
    cancellationCharges: moneyValue(charges),
    refundEligible: moneyValue(available),
    commission: moneyValue(commission),
    commissionRecorded: !!ledger.commissions.length,
    vendorPayable: moneyValue(
      Math.max(
        0,
        minor(row.TotalAmount) - commission - refunded - reserved - fees,
      ),
    ),
    canRefund: !reason,
    refundBlockedReason: reason,
    policy,
    policyReview: snapshot.review || null,
    policyTerms: snapshot.terms || [],
  };
}
export async function capturePolicy(row, tx) {
  const rows = await repo.select(
    "SELECT s.ServiceId,s.ServiceName,s.DetailsJson FROM dbo.BookingItems bi JOIN dbo.Services s ON s.ServiceId=bi.ServiceId WHERE bi.BookingId=:id",
    { id: row.BookingId },
    tx,
  );
  const terms = rows.map((s) => {
    let d = {};
    try {
      d = JSON.parse(s.DetailsJson || "{}");
    } catch {}
    return {
      service: s.ServiceName,
      cancellation: d.policies?.cancellation || "",
      refund: d.policies?.refund || "",
      policy: d.policies?.bookingRefundPolicy || null,
    };
  });
  const valid = terms.map((t) => policySchema.safeParse(t.policy));
  const policy =
    valid.length && valid.every((p) => p.success)
      ? {
          refundPercent: Math.min(...valid.map((p) => p.data.refundPercent)),
          cancellationFeePercent: Math.max(
            ...valid.map((p) => p.data.cancellationFeePercent),
          ),
          minimumNoticeHours: Math.max(
            ...valid.map((p) => p.data.minimumNoticeHours),
          ),
        }
      : null;
  await repo.update(
    { table: "Booking", id: "BookingId" },
    row.BookingId,
    {
      PolicySnapshotJson: JSON.stringify({
        terms,
        policy,
        capturedAt: new Date().toISOString(),
        commissionRate: await commissionRate(tx),
        commissionRule: await ruleForServices(
          rows.map((s) => s.ServiceId),
          tx,
        ),
      }),
    },
    tx,
  );
}
export async function syncPayout(row, ctx, tx) {
  const ledger = await financialRows(row.BookingId, tx, true),
    summary = financialSummary(row, ledger);
  if (ledger.payouts.length > 1) {
    for (const p of ledger.payouts)
      if (!["Paid", "Processing"].includes(p.PayoutStatus))
        await repo.update(
          { table: "VendorPayouts", id: "PayoutId" },
          p.PayoutId,
          { PayoutStatus: "OnHold" },
          tx,
        );
    await audit(
      ctx,
      "BOOKING_PAYOUT_REVIEW_REQUIRED",
      row.BookingId,
      ledger.payouts,
      {
        reason:
          "Multiple historical payout records require reconciliation; amounts preserved.",
      },
      tx,
    );
    return;
  }
  if (row.BookingStatus !== "Completed") {
    for (const p of ledger.payouts)
      if (!["Paid", "Processing"].includes(p.PayoutStatus))
        await repo.update(
          { table: "VendorPayouts", id: "PayoutId" },
          p.PayoutId,
          {
            PayoutStatus: "OnHold",
            RefundDeduction: summary.refunded + summary.refundPending,
          },
          tx,
        );
    if (ledger.payouts.length)
      await audit(
        ctx,
        "BOOKING_PAYOUT_HELD",
        row.BookingId,
        ledger.payouts,
        {
          reason: row.BookingStatus,
          refunds: summary.refunded,
          reserved: summary.refundPending,
        },
        tx,
      );
    return;
  }
  let rate = null;
  let appliedRule = null;
  try {
    const snapshot = JSON.parse(row.PolicySnapshotJson || "{}");
    rate = snapshot.commissionRate ?? null;
    appliedRule = snapshot.commissionRule || null;
  } catch {}
  if (!ledger.commissions.length && (rate !== null || appliedRule)) {
    const amount = calculateCommission(row, appliedRule, rate);
    await repo.insert(
      { table: "PlatformCommission", id: "CommissionId" },
      {
        BookingId: row.BookingId,
        VendorId: row.VendorId,
        CommissionType: appliedRule?.type || "Percentage",
        CommissionRate: appliedRule?.rate ?? rate,
        BookingAmount: row.TotalAmount,
        CommissionAmount: amount,
      },
      tx,
    );
    summary.commission = amount;
    summary.commissionRecorded = true;
    await postLedger(row, "Commission", amount, row.BookingId, tx);
    await audit(
      ctx,
      "BOOKING_COMMISSION_RECORDED",
      row.BookingId,
      null,
      { rate, amount },
      tx,
    );
  }
  const status =
    summary.refundPending ||
    !summary.commissionRecorded ||
    summary.paid < Number(row.TotalAmount)
      ? "OnHold"
      : "Pending";
  const [requestedRefund] = await repo.select(
    "SELECT RequestId FROM dbo.CustomerRefundRequests WHERE BookingId=:id AND Status='Requested'",
    { id: row.BookingId },
    tx,
  );
  const values = {
    GrossAmount: row.TotalAmount,
    PlatformCommission: summary.commission,
    RefundDeduction: summary.refunded + summary.refundPending,
    PayoutStatus: requestedRefund ? "OnHold" : status,
  };
  if (!ledger.payouts.length) {
    const [created] = await repo.insert(
      { table: "VendorPayouts", id: "PayoutId" },
      {
        BookingId: row.BookingId,
        VendorId: row.VendorId,
        ...values,
        ApplicableFees: row.PlatformFee,
      },
      tx,
    );
    if (created?.id)
      await notifyAdmins("PAYOUT_REQUESTED", "VendorPayouts", created.id, tx);
    if (created?.id)
      await repo.select(
        "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) SELECT UserId,'PayoutUpdate','Settlement calculated',:message,'Booking',:booking FROM dbo.Vendors WHERE VendorId=:vendor",
        {
          message: `${row.BookingNumber}: settlement calculated. ${values.PayoutStatus === "Pending" ? "Earnings are awaiting payout review." : "Settlement is on hold pending financial review."}`,
          booking: row.BookingId,
          vendor: row.VendorId,
        },
        tx,
      );
  } else
    for (const p of ledger.payouts)
      if (!["Paid", "Processing"].includes(p.PayoutStatus))
        await repo.update(
          { table: "VendorPayouts", id: "PayoutId" },
          p.PayoutId,
          values,
          tx,
        );
  await audit(
    ctx,
    "BOOKING_PAYOUT_CALCULATED",
    row.BookingId,
    ledger.payouts,
    values,
    tx,
  );
}
