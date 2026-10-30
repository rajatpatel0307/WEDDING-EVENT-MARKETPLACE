import { sequelize } from "../src/config/database.js";
try {
  await sequelize.authenticate();
  const [rows] = await sequelize.query(
    "SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE,NUMERIC_PRECISION,NUMERIC_SCALE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('Booking','Payments','PaymentTransactions','Refunds','VendorPayouts','PlatformCommission','CustomerPaymentOrders','FinancialLedger','PaymentWebhookEvents','CustomerRefundRequests') ORDER BY TABLE_NAME,ORDINAL_POSITION",
  );
  console.log(JSON.stringify(rows, null, 2));
} catch {
  console.error(
    "Financial database inspection unavailable. Check database connectivity and configuration.",
  );
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
