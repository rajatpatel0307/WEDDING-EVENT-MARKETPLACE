import "dotenv/config";
import { sequelize } from "../src/config/database.js";
try {
  // if (!process.env.DB_USER) throw new Error("DB_USER is required"); // Server SQL authentication.
  await sequelize.authenticate();
  const [result] = await sequelize.query(
    "SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE,IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('Users','Roles','UserRoles','Vendors','VendorDocuments','VendorCategories','VendorLocations','Categories','AuditLogs') ORDER BY TABLE_NAME,ORDINAL_POSITION",
  );
  console.log(JSON.stringify(result, null, 2));
} catch {
  console.error(
    "Database inspection unavailable. Check database connectivity and configuration.",
  );
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
