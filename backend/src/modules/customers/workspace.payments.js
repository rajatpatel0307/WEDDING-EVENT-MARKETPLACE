import {
  milestone,
  history as bookingHistory,
  financialRows,
  financialSummary,
} from "../admin/booking-finance.js";
import { reconcileRefund } from "../admin/booking-refunds.service.js";
import {
  createHmac,
  timingSafeEqual,
  randomUUID,
  createHash,
} from "node:crypto";
import { minor } from "../admin/booking-finance.js";
import { postLedger } from "../payments/ledger.js";
import { calculateCommission } from "../payments/commission-rules.js";
import { notifyAdmins } from "../notifications/admin-events.js";
import { z } from "zod";
import {
  scope,
  repo,
  owned,
  fail,
  audit,
  insert,
  notify,
  notifyBusiness,
} from "./workspace.common.js";
export const configured = () =>
  // Checkout and API reconciliation use API credentials. The webhook endpoint
  // separately requires its own signing secret before accepting any event.
  !!(
    process.env.RAZORPAY_KEY_ID?.trim() &&
    process.env.RAZORPAY_KEY_SECRET?.trim()
  );
export function validSignature(text, signature, secret) {
  if (
    !secret ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(signature)
  )
    return false;
  const expected = createHmac("sha256", secret).update(text).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export async function gateway(path, body) {
  if (!configured())
    fail(
      "Online payments are not configured yet. Please contact support.",
      503,
    );
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  }).catch(() =>
    fail("Payment provider is unavailable. Try again shortly.", 502),
  );
  const data = await response.json().catch(() =>
    fail("Payment provider returned an invalid response. Try again shortly.", 502),
  );
  if (!response.ok) {
    // Map known provider failures to safe messages; never expose raw payloads.
    if (
      response.status === 400 &&
      /amount exceeds (?:the )?maximum amount allowed/i.test(data?.error?.description || "")
    )
      fail(
        "This payment exceeds the Razorpay account's per-order limit. Contact support to request a higher limit before paying this booking.",
        422,
      );
    if ([401, 403].includes(response.status))
      fail("The payment provider could not authorize checkout. Contact support to check the payment account configuration.", 503);
    if (response.status === 429)
      fail("The payment provider is busy. Wait a moment and try again.", 503);
    fail(
      "Payment provider could not process this request. Try again or contact support.",
      502,
    );
  }
  return data;
}
export function paymentEligible(booking) {
  if (
    !["Accepted", "PaymentPending", "Confirmed", "InProgress"].includes(
      booking.BookingStatus,
    )
  )
    fail("The vendor must accept this booking before you can pay.", 409);
  if (Number(booking.RemainingAmount) <= 0)
    fail("This booking is already paid.", 409);
}
export const checkoutInput = z
  .object({
    idempotencyKey: z.guid(),
    mode: z.enum(["advance", "balance"]).default("balance"),
    termsAccepted: z.literal(true),
  })
  .strict();
export function payableMinor(booking, mode = "balance") {
  paymentEligible(booking);
  const remaining = minor(booking.RemainingAmount);
  const advance = Math.max(
    0,
    minor(booking.AdvanceAmount) - minor(booking.PaidAmount),
  );
  const amount = mode === "advance" ? Math.min(advance, remaining) : remaining;
  if (!amount)
    fail("No advance installment remains. Pay the outstanding balance.", 409);
  return amount;
}
export async function createOrder(recordId, ctx, input) {
  const { id } = scope(ctx);
  if (!configured())
    fail(
      "Online payments are not configured yet. Please contact support.",
      503,
    );
  const body = checkoutInput.parse(input);
  return repo.transaction(async (tx) => {
    const booking = await owned("bookings", recordId, id, tx);
    const [replay] = await repo.select(
      "SELECT * FROM dbo.CustomerPaymentOrders WITH(UPDLOCK,HOLDLOCK) WHERE CheckoutKey=:key",
      { key: body.idempotencyKey },
      tx,
    );
    if (
      replay &&
      (replay.BookingId.toLowerCase() !== recordId.toLowerCase() ||
        replay.CustomerId.toLowerCase() !== id.toLowerCase() ||
        replay.PaymentMode !== body.mode)
    )
      fail("Idempotency key belongs to another checkout.", 409);
    if (replay?.Status === "Paid")
      return {
        alreadyPaid: true,
        message: "This payment was already verified.",
      };
    const ledger = await financialRows(recordId, tx, true);
    const captured = ledger.payments
      .filter(
        (p) =>
          ["Success", "Refunded"].includes(p.PaymentStatus) &&
          p.Currency === "INR",
      )
      .reduce((n, p) => n + minor(p.Amount), 0);
    if (captured !== minor(booking.PaidAmount))
      fail("The payment balance requires reconciliation before checkout.", 409);
    if (
      ledger.refunds.some((r) =>
        ["Pending", "Processing"].includes(r.RefundStatus),
      )
    )
      fail("A refund is in progress.", 409);
    const amount = payableMinor(booking, body.mode);
    if (!Number.isSafeInteger(amount) || amount <= 0)
      fail("Invalid booking balance.", 409);
    const [existing] = await repo.select(
      "SELECT TOP(1) * FROM dbo.CustomerPaymentOrders WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=:booking AND Status='Created' ORDER BY CreatedAt DESC",
      { booking: recordId, amount },
      tx,
    );
    if (existing && Number(existing.AmountMinor) !== amount)
      fail(
        "Another checkout is active. Contact support to reconcile it before changing installments.",
        409,
      );
    let order = replay || existing;
    if (order && Number(order.AmountMinor) !== amount)
      fail("Booking balance changed. Refresh checkout.", 409);
    if (!order) {
      const remote = await gateway("/orders", {
        amount,
        currency: "INR",
        receipt: `mn_${randomUUID().replaceAll("-", "")}`,
        notes: { booking_id: recordId },
      });
      if (!remote.id || remote.amount !== amount || remote.currency !== "INR")
        fail("Unexpected payment provider response.", 502);
      const row = await insert(
        "CustomerPaymentOrders",
        "OrderId",
        {
          BookingId: recordId,
          CustomerId: id,
          GatewayOrderId: remote.id,
          AmountMinor: amount,
          Currency: "INR",
          Status: "Created",
          CheckoutKey: body.idempotencyKey,
          PaymentMode: body.mode,
        },
        tx,
      );
      order = { ...row, GatewayOrderId: remote.id, AmountMinor: amount };
    }
    return {
      orderId: order.GatewayOrderId,
      amount: Number(order.AmountMinor),
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
      bookingNumber: booking.BookingNumber,
    };
  });
}
export async function settle(payment) {
  z.object({
    id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
    order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
    amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    currency: z.literal("INR"),
    created_at: z.number().int().nonnegative(),
  })
    .passthrough()
    .parse(payment);
  if (payment.status !== "captured")
    fail("Payment is awaiting capture. Refresh payments shortly.", 409);
  const [source] = await repo.select(
    "SELECT BookingId FROM dbo.CustomerPaymentOrders WHERE GatewayOrderId=:order",
    { order: payment.order_id },
  );
  if (!source) fail("Payment order not found.", 404);
  return repo.transaction(async (tx) => {
    await repo.lockRecord(
      { table: "Booking", id: "BookingId" },
      source.BookingId,
      tx,
    );
    const [order] = await repo.select(
      "SELECT * FROM dbo.CustomerPaymentOrders WITH(UPDLOCK,HOLDLOCK) WHERE GatewayOrderId=:order",
      { order: payment.order_id },
      tx,
    );
    if (!order) fail("Payment order not found.", 404);
    if (
      Number(order.AmountMinor) !== payment.amount ||
      payment.currency !== order.Currency
    )
      fail("Payment amount or currency did not match the order.", 409);
    const [booking] = await repo.select(
      "SELECT * FROM dbo.Booking WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=:booking AND CustomerId=:customer",
      { booking: order.BookingId, customer: order.CustomerId },
      tx,
    );
    if (!booking) fail("Booking not found.", 404);
    const [prior] = await repo.select(
      "SELECT PaymentId,PaymentStatus FROM dbo.Payments WHERE GatewayName='Razorpay' AND GatewayTransactionId=:payment",
      { payment: payment.id },
      tx,
    );
    if (prior && ["Success", "Refunded"].includes(prior.PaymentStatus))
      return { verified: true, message: "Payment already confirmed." };
    const amount = payment.amount / 100;
    const reconciliation =
      Number(booking.RemainingAmount) < amount ||
      ["Cancelled", "Rejected", "Refunded"].includes(booking.BookingStatus);
    const capturedValues = {
      BookingId: booking.BookingId,
      PaymentReference: payment.id,
      GatewayName: "Razorpay",
      GatewayTransactionId: payment.id,
      PaymentMethod: String(payment.method || "Online").slice(0, 30),
      Amount: amount,
      Currency: "INR",
      PaymentStatus: "Success",
      PaidAt: new Date(payment.created_at * 1000),
      GatewayResponse: JSON.stringify({
        orderId: payment.order_id,
        captured: true,
        reconciliation,
      }),
    };
    const p = prior
      ? { id: prior.PaymentId }
      : await insert("Payments", "PaymentId", capturedValues, tx);
    if (prior)
      await repo.update(
        { table: "Payments", id: "PaymentId" },
        prior.PaymentId,
        capturedValues,
        tx,
      );
    await postLedger(booking, "Capture", amount, payment.id, tx);
    let commissionSnapshot = {};
    try {
      commissionSnapshot = JSON.parse(booking.PolicySnapshotJson || "{}");
    } catch {}
    const commissionTotal = calculateCommission(
      booking,
      commissionSnapshot.commissionRule,
      commissionSnapshot.commissionRate,
    );
    if (commissionTotal !== null && minor(booking.TotalAmount) > 0) {
      const total = BigInt(minor(booking.TotalAmount)),
        commission = BigInt(minor(commissionTotal));
      const before = BigInt(Math.min(minor(booking.PaidAmount), Number(total)));
      const after = BigInt(
        Math.min(minor(booking.PaidAmount) + payment.amount, Number(total)),
      );
      await postLedger(
        booking,
        "CommissionAccrued",
        Number((commission * after) / total - (commission * before) / total) /
          100,
        payment.id,
        tx,
      );
    }
    const paid = (minor(booking.PaidAmount) + payment.amount) / 100;
    const next = reconciliation
      ? booking.BookingStatus
      : ["Accepted", "PaymentPending"].includes(booking.BookingStatus)
        ? "Confirmed"
        : booking.BookingStatus;
    await repo.update(
      { table: "Booking", id: "BookingId" },
      booking.BookingId,
      {
        PaidAmount: paid,
        PaymentStatus:
          paid >= Number(booking.TotalAmount) ? "Paid" : "PartiallyPaid",
        BookingStatus: next,
        UpdatedAt: new Date(),
      },
      tx,
    );
    await repo.update(
      { table: "CustomerPaymentOrders", id: "OrderId" },
      order.OrderId,
      { Status: "Paid", UpdatedAt: new Date() },
      tx,
    );
    if (next !== booking.BookingStatus)
      await insert(
        "BookingStatusHistory",
        "BookingStatusHistoryId",
        {
          BookingId: booking.BookingId,
          OldStatus: booking.BookingStatus,
          NewStatus: next,
          ChangedBy: order.CustomerId,
          Remarks: "Captured Razorpay payment verified by server.",
        },
        tx,
      );
    const ctx = {
      auth: { user: { id: order.CustomerId } },
      req: { ip: "payment-provider" },
    };
    await insert(
      "PaymentTransactions",
      "TransactionId",
      {
        PaymentId: p.id,
        TransactionType: "Capture",
        Amount: amount,
        TransactionStatus: "Success",
        GatewayTransactionId: payment.id,
      },
      tx,
    );
    await bookingHistory(
      booking,
      "PaymentReceived",
      ctx,
      "Captured payment verified by the server.",
      `INR ${amount}`,
      tx,
    );
    const ledger = await financialRows(booking.BookingId, tx, true),
      summary = financialSummary(booking, ledger);
    if (summary.refunded > 0 || summary.refundPending > 0)
      await repo.update(
        { table: "Booking", id: "BookingId" },
        booking.BookingId,
        {
          PaymentStatus:
            summary.refundPending > 0
              ? "RefundPending"
              : summary.refunded >= summary.paid
                ? "Refunded"
                : "PartiallyRefunded",
        },
        tx,
      );
    await audit(
      ctx,
      "PAYMENT_CONFIRMED",
      "Payments",
      p.id,
      null,
      { amount, payment: payment.id, reconciliation },
      tx,
    );
    if (reconciliation)
      await notifyAdmins(
        "PAYMENT_RECONCILIATION_REVIEW",
        "Booking",
        booking.BookingId,
        tx,
      );
    await milestone(
      booking,
      `payment:${payment.id}`,
      "Payment successful",
      `${booking.BookingNumber}: INR ${amount} received.${reconciliation ? " Support will review the payment balance." : ""}`,
      tx,
    );
    if (next !== booking.BookingStatus)
      await milestone(
        booking,
        `status:${next}`,
        "Booking confirmed",
        `${booking.BookingNumber} is confirmed.`,
        tx,
      );
    return {
      verified: true,
      amount,
      message: "Payment verified and confirmed.",
    };
  });
}
export async function verifyPayment(input, ctx) {
  const { id } = scope(ctx),
    b = z
      .object({
        razorpay_order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/),
        razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
        razorpay_signature: z.string().length(64),
      })
      .strict()
      .parse(input);
  const [order] = await repo.select(
    "SELECT GatewayOrderId FROM dbo.CustomerPaymentOrders WHERE GatewayOrderId=:order AND CustomerId=:id",
    { order: b.razorpay_order_id, id },
  );
  if (!order) fail("Payment order not found.", 404);
  if (
    !validSignature(
      `${order.GatewayOrderId}|${b.razorpay_payment_id}`,
      b.razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET,
    )
  )
    fail("Payment signature is invalid.", 400);
  const payment = await gateway(`/payments/${b.razorpay_payment_id}`);
  if (payment.order_id !== order.GatewayOrderId)
    fail("Payment does not match your order.", 409);
  return settle(payment);
}
export async function recordFailedPayment(payment) {
  if (!payment?.order_id || !payment.id || payment.status !== "failed") return;
  const [source] = await repo.select(
    "SELECT BookingId FROM dbo.CustomerPaymentOrders WHERE GatewayOrderId=:order",
    { order: payment.order_id },
  );
  if (!source) return;
  return repo.transaction(async (tx) => {
    await repo.lockRecord(
      { table: "Booking", id: "BookingId" },
      source.BookingId,
      tx,
    );
    const [order] = await repo.select(
      "SELECT * FROM dbo.CustomerPaymentOrders WITH(UPDLOCK,HOLDLOCK) WHERE GatewayOrderId=:id",
      { id: payment.order_id },
      tx,
    );
    if (
      !order ||
      Number(order.AmountMinor) !== payment.amount ||
      order.Currency !== payment.currency
    )
      return;
    const [booking] = await repo.select(
      "SELECT * FROM dbo.Booking WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=:id",
      { id: order.BookingId },
      tx,
    );
    const [prior] = await repo.select(
      "SELECT PaymentId FROM dbo.Payments WHERE GatewayName='Razorpay' AND GatewayTransactionId=:id",
      { id: payment.id },
      tx,
    );
    if (prior) return;
    const p = await insert(
      "Payments",
      "PaymentId",
      {
        BookingId: booking.BookingId,
        PaymentReference: payment.id,
        GatewayName: "Razorpay",
        GatewayTransactionId: payment.id,
        PaymentMethod: payment.method || "Online",
        Amount: payment.amount / 100,
        Currency: payment.currency,
        PaymentStatus: "Failed",
      },
      tx,
    );
    await insert(
      "PaymentTransactions",
      "TransactionId",
      {
        PaymentId: p.id,
        TransactionType: "PaymentFailed",
        Amount: payment.amount / 100,
        TransactionStatus: "Failed",
        GatewayTransactionId: payment.id,
      },
      tx,
    );
    if (
      !Number(booking.PaidAmount) &&
      !["RefundPending", "Refunded"].includes(booking.PaymentStatus)
    )
      await repo.update(
        { table: "Booking", id: "BookingId" },
        booking.BookingId,
        { PaymentStatus: "Failed", UpdatedAt: new Date() },
        tx,
      );
    const ctx = {
      auth: { user: { id: booking.CustomerId } },
      req: { ip: "payment-provider" },
    };
    await bookingHistory(
      booking,
      "PaymentFailed",
      ctx,
      "The payment provider reported a failed attempt.",
      "",
      tx,
    );
    await audit(
      ctx,
      "PAYMENT_FAILED",
      "Booking",
      booking.BookingId,
      null,
      { payment: payment.id, amount: payment.amount / 100 },
      tx,
    );
    await milestone(
      booking,
      `payment-failed:${payment.id}`,
      "Payment failed",
      `${booking.BookingNumber}: the payment attempt failed.`,
      tx,
    );
  });
}
export async function webhook(req, res) {
  try {
    if (!Buffer.isBuffer(req.body))
      return res
        .status(400)
        .json({
          success: false,
          message: "A raw JSON provider event is required.",
        });
    if (!process.env.RAZORPAY_WEBHOOK_SECRET)
      return res
        .status(503)
        .json({ success: false, message: "Webhook not configured." });
    if (
      !validSignature(
        req.body,
        req.get("x-razorpay-signature"),
        process.env.RAZORPAY_WEBHOOK_SECRET,
      )
    )
      return res
        .status(400)
        .json({ success: false, message: "Invalid webhook signature." });
    const event = JSON.parse(req.body.toString("utf8"));
    if (
      ![
        "payment.captured",
        "payment.failed",
        "refund.created",
        "refund.processed",
        "refund.failed",
      ].includes(event.event)
    )
      return res.json({ success: true, ignored: true });
    const entity = event.event.startsWith("refund.")
      ? event.payload?.refund?.entity
      : event.payload?.payment?.entity;
    if (!entity?.id)
      return res
        .status(400)
        .json({ success: false, message: "Malformed provider event." });
    // Retain only reconciliation fields, never card data, tokens or complete provider responses.
    const safe = Object.fromEntries(
      [
        "id",
        "order_id",
        "payment_id",
        "amount",
        "currency",
        "status",
        "method",
        "created_at",
        "receipt",
      ]
        .filter((k) => entity[k] !== undefined)
        .map((k) => [k, entity[k]]),
    );
    const hash = createHash("sha256").update(req.body).digest("hex");
    const eventId = req.get("x-razorpay-event-id") || hash;
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(eventId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid event identifier." });
    await repo.transaction(async (tx) => {
      const [prior] = await repo.select(
        "SELECT EventId,PayloadHash FROM dbo.PaymentWebhookEvents WITH(UPDLOCK,HOLDLOCK) WHERE EventId=:id OR PayloadHash=:hash",
        { id: eventId, hash },
        tx,
      );
      if (prior) {
        if (
          prior.EventId.toLowerCase() === eventId.toLowerCase() &&
          prior.PayloadHash !== hash
        )
          fail(
            "Provider event identifier was reused with a different payload.",
            409,
          );
        return;
      }
      await insert(
        "PaymentWebhookEvents",
        "EventId",
        {
          EventId: eventId,
          EventType: event.event,
          PayloadHash: hash,
          PayloadJson: JSON.stringify(safe),
        },
        tx,
      );
    });
    return res.json({ success: true });
  } catch (e) {
    return res.status(e instanceof SyntaxError ? 400 : e.status || 500).json({
      success: false,
      message: e.status ? e.message : "Payment reconciliation failed.",
    });
  }
}
