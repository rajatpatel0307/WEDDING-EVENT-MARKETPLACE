import { processRefundQueue } from "./booking-refunds.service.js";
import { processPaymentEvents, reconcilePendingPayments } from "../payments/reconciliation.js";
import { reminders } from "./bookings-management.service.js";
import { processQuotationJobs } from "../quotations/quotations.service.js";
export function startBookingJobs() {
  let active = null;
  const tick = () => {
    if (active) return;
    active = (async () => {
      await processQuotationJobs();
      await processPaymentEvents();
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
        { await processRefundQueue(); await reconcilePendingPayments(); }
      await reminders();
    })()
      .catch(() =>
        console.error(
          "Booking background reconciliation will retry on the next interval.",
        ),
      )
      .finally(() => {
        active = null;
      });
  };
  const timer = setInterval(tick, 60000);
  timer.unref();
  return async () => {
    clearInterval(timer);
    if (active) await active;
  };
}
