import { save } from "./workspace.api";
import { loadCheckout } from "./checkout-loader";
export async function checkout(bookingId, user, options = {}) {
  await loadCheckout();
  const order = await save(`/bookings/${bookingId}/payment-order`, "POST", {
    idempotencyKey: options.idempotencyKey || crypto.randomUUID(),
    mode: options.mode || 'balance', termsAccepted: options.termsAccepted === true,
    ...(options.mode === "custom" ? { customAmount: options.customAmount } : {}),
  });
  if(order.alreadyPaid) return order;
  return new Promise((resolve, reject) => {
    let verifying = false;
    const instance = new window.Razorpay({
      key: order.key,
      order_id: order.orderId,
      amount: order.amount,
      currency: "INR",
      name: "MarryNest",
      description: order.bookingNumber,
      prefill: {
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        email: user.email,
        contact: user.phone || "",
      },
      theme: { color: "#955365" },
      handler: async (result) => {
        verifying = true;
        try {
          const r = await save("/payments/verify", "POST", {
            razorpay_order_id: result.razorpay_order_id,
            razorpay_payment_id: result.razorpay_payment_id,
            razorpay_signature: result.razorpay_signature,
          });
          resolve(r);
        } catch (e) {
          // Checkout completed, but server confirmation is still unresolved.
          e.paymentPending = true;
          reject(e);
        }
      },
      modal: {
        ondismiss: () => {
          if (verifying) return;
          resolve({
            closed: true,
            message: "Checkout closed. Check server status if money was deducted.",
          });
        },
      },
    });
    instance.on("payment.failed", () =>
      reject(
        Object.assign(
          new Error(
            "Payment did not complete. You can retry from your booking.",
          ),
          { paymentFailed: true },
        ),
      ),
    );
    instance.open();
  });
}
