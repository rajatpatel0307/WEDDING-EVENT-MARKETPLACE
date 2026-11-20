import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/033-order-management.js";
import { up as outForDeliveryUp } from "../migrations/034-order-out-for-delivery.js";

// Runs just the order extension against an existing installation.
try {
  await sequelize.transaction(async transaction => {
    await sequelize.query("DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;", { transaction });
    for (const [name, migrate] of [["033-order-management", up], ["034-order-out-for-delivery", outForDeliveryUp]]) {
      const [rows] = await sequelize.query("SELECT Name FROM dbo.AuthMigrations WHERE Name=:name", { replacements: { name }, transaction });
      if (rows.length) continue;
      await migrate(sequelize.getQueryInterface(), transaction);
      await sequelize.query("INSERT dbo.AuthMigrations(Name) VALUES(:name)", { replacements: { name }, transaction });
    }
  });
  console.log("Order management migration is current.");
} catch (error) {
  console.error("Order migration failed; transaction rolled back.", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
