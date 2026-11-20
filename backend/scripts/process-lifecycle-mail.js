import { sequelize } from "../src/config/database.js";
import { processLifecycleMail } from "../src/modules/notifications/email.jobs.js";

try {
  const result = await processLifecycleMail();
  console.log("Lifecycle email processing:", result);
  if (result.skipped) process.exitCode = 1;
} catch {
  console.error("Lifecycle email processing failed. Inspect database connectivity and the email outbox.");
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
