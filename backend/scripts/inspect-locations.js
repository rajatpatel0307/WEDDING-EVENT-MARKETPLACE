import { sequelize } from "../src/config/database.js";
try {
  await sequelize.authenticate();
  const [rows] = await sequelize.query(
    "SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('Addresses','VendorLocations','Services','Wishlists','Events','EventLocations','ServiceLocations','Booking','Quotations') ORDER BY TABLE_NAME,ORDINAL_POSITION",
  );
  console.log(JSON.stringify(rows));
} catch {
  console.error(
    "MSSQL inspection unavailable: connection or configuration failed.",
  );
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
