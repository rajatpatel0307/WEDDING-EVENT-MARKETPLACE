import { sequelize } from "../src/config/database.js";
import { processRefundQueue } from "../src/modules/admin/booking-refunds.service.js";
import { processPaymentEvents,reconcilePendingPayments } from '../src/modules/payments/reconciliation.js';
import { reminders } from "../src/modules/admin/bookings-management.service.js";
import { processQuotationJobs } from "../src/modules/quotations/quotations.service.js";
try {
  console.log(await processQuotationJobs());
  console.log(await processPaymentEvents());
  if(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) console.log(await reconcilePendingPayments());
  console.log(await processRefundQueue());
  console.log(await reminders());
} catch {
  console.error(
    "Booking processing failed. Inspect configuration and provider reconciliation.",
  );
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
