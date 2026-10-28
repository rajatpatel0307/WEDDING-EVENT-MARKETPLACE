import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
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
  !!(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_WEBHOOK_SECRET
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
async function gateway(path, body) {
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
  const data = await response.json();
  if (!response.ok)
    fail(
      "Payment provider could not process this request. Try again or contact support.",
      502,
    );
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
export async function createOrder(recordId, ctx) {
  const { id } = scope(ctx);
  if (!configured())
    fail(
      "Online payments are not configured yet. Please contact support.",
      503,
    );
  return repo.transaction(async (tx) => {
    const booking = await owned("bookings", recordId, id, tx);
    paymentEligible(booking);
    const amount = Math.round(Number(booking.RemainingAmount) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0)
      fail("Invalid booking balance.", 409);
    const [existing] = await repo.select(
      "SELECT TOP(1) * FROM dbo.CustomerPaymentOrders WHERE BookingId=:booking AND Status='Created' AND AmountMinor=:amount ORDER BY CreatedAt DESC",
      { booking: recordId, amount },
      tx,
    );
    let order = existing;
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
  if (payment.status !== "captured")
    fail("Payment is awaiting capture. Refresh payments shortly.", 409);
  return repo.transaction(async (tx) => {
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
      "SELECT PaymentId FROM dbo.Payments WHERE GatewayName='Razorpay' AND GatewayTransactionId=:payment",
      { payment: payment.id },
      tx,
    );
    if (prior) return { message: "Payment already confirmed." };
    const amount = payment.amount / 100;
    const reconciliation =
      Number(booking.RemainingAmount) < amount ||
      ["Cancelled", "Rejected", "Refunded"].includes(booking.BookingStatus);
    const p = await insert(
      "Payments",
      "PaymentId",
      {
        BookingId: booking.BookingId,
        PaymentReference: payment.id,
        GatewayName: "Razorpay",
        GatewayTransactionId: payment.id,
        PaymentMethod: payment.method || "Online",
        Amount: amount,
        Currency: "INR",
        PaymentStatus: "Success",
        PaidAt: new Date(payment.created_at * 1000),
        GatewayResponse: JSON.stringify({
          orderId: payment.order_id,
          captured: true,
          reconciliation,
        }),
      },
      tx,
    );
    const paid = Math.round((Number(booking.PaidAmount) + amount) * 100) / 100;
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
      { Status: "Paid" },
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
    await audit(
      ctx,
      "PAYMENT_CONFIRMED",
      "Payments",
      p.id,
      null,
      { amount, payment: payment.id, reconciliation },
      tx,
    );
    await notify(
      order.CustomerId,
      "Payment received",
      `${booking.BookingNumber}: INR ${amount} received.${reconciliation ? " Support will review your booking balance." : ""}`,
      "Booking",
      booking.BookingId,
      tx,
    );
    await notifyBusiness(
      booking.VendorId,
      "Booking payment received",
      `${booking.BookingNumber}: INR ${amount} received.`,
      "Booking",
      booking.BookingId,
      tx,
    );
    return { message: "Payment verified and confirmed." };
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
export async function webhook(req, res) {
  try {
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
    if (event.event === "payment.captured")
      await settle(event.payload.payment.entity);
    return res.json({ success: true });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.status ? e.message : "Payment reconciliation failed.",
    });
  }
}
