import { sequelize } from "../src/config/database.js";
import { processRefundQueue } from "../src/modules/admin/booking-refunds.service.js";
import { reminders } from "../src/modules/admin/bookings-management.service.js";
try {
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
