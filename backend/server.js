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
  const { httpServer, apollo } = await createApp();
  httpServer.listen(Number(process.env.PORT || 5000), () =>
    console.log("Wedding marketplace API started."),
  );
  const stop = async () => {
    await apollo.stop();
    await sequelize.close();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
} catch (error) {
  console.error("Startup failed:", error.message);
  process.exitCode = 1;
}
