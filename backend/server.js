import { startBookingJobs } from "./src/modules/admin/booking-jobs.js";
import { validateEnvironment } from "./src/config/environment.js";
import { sequelize } from "./src/config/database.js";
import { createApp } from "./src/app.js";
try {
  validateEnvironment();
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
  const [migrations] = await sequelize.query(
    "SELECT Name FROM dbo.AuthMigrations WHERE Name='001-auth'",
  );
  if (!migrations.length)
    throw new Error("Run npm run db:migrate before starting the API.");
  const [profileColumns] = await sequelize.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='Users' AND COLUMN_NAME='ProfilePhotoUrl'",
  );
  if (!profileColumns.length)
    throw new Error(
      "Profile photo migration is missing. Run npm run db:migrate before starting the API.",
    );
  const [verificationMigration] = await sequelize.query(
    "SELECT Name FROM dbo.AuthMigrations WHERE Name='007-vendor-verification'",
  );
  if (!verificationMigration.length)
    throw new Error(
      "Vendor verification migration is missing. Run npm run db:migrate before starting the API.",
    );
  const [workspaceMigration] = await sequelize.query(
    "SELECT Name FROM dbo.AuthMigrations WHERE Name='008-vendor-workspace'",
  );
  if (!workspaceMigration.length)
    throw new Error(
      "Vendor workspace migration is missing. Run npm run db:migrate before starting the API.",
    );
  const [customerMigration] = await sequelize.query(
    "SELECT Name FROM dbo.AuthMigrations WHERE Name='009-customer-workspace'",
  );
  if (!customerMigration.length)
    throw new Error(
      "Customer workspace migration missing. Run npm run db:migrate.",
    );
  const [bookingMigration] = await sequelize.query(
    "SELECT Name FROM dbo.AuthMigrations WHERE Name='013-admin-bookings'",
  );
  if (!bookingMigration.length)
    throw new Error(
      "Admin bookings migration is missing. Run npm run db:migrate before starting the API.",
    );
  const [quotationMigration] = await sequelize.query(
    "SELECT Name FROM dbo.AuthMigrations WHERE Name='018-quotation-history-hardening'",
  );
  if (!quotationMigration.length)
    throw new Error(
      "Quotation lifecycle migration is missing. Run npm run db:migrate before starting the API.",
    );
  const [paymentMigration] = await sequelize.query("SELECT Name FROM dbo.AuthMigrations WHERE Name='020-financial-controls'");
  if(!paymentMigration.length) throw new Error('Payment integrity migration is missing. Run npm run db:migrate before starting the API.');
  const { httpServer, apollo } = await createApp();
  httpServer.listen(Number(process.env.PORT || 5000), () =>
    console.log("Wedding marketplace API started."),
  );
  const stopJobs =
    process.env.BOOKING_JOBS_ENABLED === "false"
      ? async () => {}
      : startBookingJobs();
  const stop = async () => {
    await stopJobs();
    await apollo.stop();
    await sequelize.close();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
} catch (error) {
  console.error("Startup failed:", error.message);
  process.exitCode = 1;
}
