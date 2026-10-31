import { up as bookingLocationsUp } from "../migrations/022-booking-location-changes.js";
// Apply only this module's additive migration after a local data/schema export.
// Exports contain private addresses and are intentionally kept under ignored .temp/.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/021-wishlist-locations.js";
try {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [applied] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='021-wishlist-locations'",
      { transaction },
    );
    if (applied.length) {
      await bookingLocationsUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "IF NOT EXISTS(SELECT 1 FROM dbo.AuthMigrations WHERE Name='022-booking-location-changes') INSERT INTO dbo.AuthMigrations(Name) VALUES('022-booking-location-changes')",
        { transaction },
      );
      console.log("Wishlist/location migrations 021 and 022 are applied.");
      return;
    }
    const backup = { createdAt: new Date().toISOString(), tables: {} };
    for (const table of [
      "Addresses",
      "VendorLocations",
      "Wishlists",
      "Events",
    ]) {
      const [columns] = await sequelize.query(
        "SELECT COLUMN_NAME,DATA_TYPE,IS_NULLABLE,CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME=:table ORDER BY ORDINAL_POSITION",
        { replacements: { table }, transaction },
      );
      const [rows] = await sequelize.query(
        `SELECT * FROM dbo.[${table}] WITH(HOLDLOCK)`,
        { transaction },
      );
      backup.tables[table] = { columns, rows };
    }
    const directory = new URL("../../.temp/location-backups/", import.meta.url);
    await mkdir(directory, { recursive: true });
    const file = new URL(`before-021-${Date.now()}.json`, directory);
    await writeFile(file, JSON.stringify(backup, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    console.log("Private pre-migration export:", fileURLToPath(file));
    await up(sequelize.getQueryInterface(), transaction);
    await bookingLocationsUp(sequelize.getQueryInterface(), transaction);
    await sequelize.query(
      "IF NOT EXISTS(SELECT 1 FROM dbo.AuthMigrations WHERE Name='022-booking-location-changes') INSERT INTO dbo.AuthMigrations(Name) VALUES('022-booking-location-changes')",
      { transaction },
    );
    await sequelize.query(
      "INSERT INTO dbo.AuthMigrations(Name) VALUES('021-wishlist-locations')",
      { transaction },
    );
    console.log("Wishlist/location migration applied.");
  });
} catch (e) {
  console.error("Migration rolled back:", e.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
