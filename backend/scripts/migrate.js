import { up as profileUp } from "../migrations/005-profile-photo.js";
import { up as contactUp } from "../migrations/003-contact-messages.js";
import { up as adminUp } from "../migrations/004-admin-workspace.js";
import { sequelize } from "../src/config/database.js";
import { up as newsletterUp } from "../migrations/002-newsletter.js";
import { up } from "../migrations/001-auth.js";
try {
  await sequelize.authenticate();
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @result int; EXEC @result=sp_getapplock @Resource='MarryNestAuthMigration', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; IF @result < 0 THROW 51000, 'Migration lock unavailable', 1;",
      { transaction },
    );
    await sequelize.query(
      "IF OBJECT_ID('dbo.AuthMigrations') IS NULL CREATE TABLE dbo.AuthMigrations (Name varchar(100) PRIMARY KEY, AppliedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME())",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='001-auth'",
      { transaction },
    );
    if (!rows.length) {
      await up(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES ('001-auth')",
        { transaction },
      );
    }
    const [newsletterRows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='002-newsletter'",
      { transaction },
    );
    if (!newsletterRows.length) {
      await newsletterUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES ('002-newsletter')",
        { transaction },
      );
    }
    const [contactRows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='003-contact-messages'",
      { transaction },
    );
    if (!contactRows.length) {
      await contactUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES ('003-contact-messages')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @result int; EXEC @result=sp_getapplock @Resource='MarryNestAdminMigration', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; IF @result < 0 THROW 51000, 'Migration lock unavailable', 1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='004-admin-workspace'",
      { transaction },
    );
    if (!rows.length) {
      await adminUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES ('004-admin-workspace')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @result int; EXEC @result=sp_getapplock @Resource='MarryNestAuthMigration', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; IF @result < 0 THROW 51000, 'Migration lock unavailable', 1;",
      { transaction },
    );
    await profileUp(sequelize.getQueryInterface(), transaction);
    await sequelize.query(
      "IF NOT EXISTS (SELECT 1 FROM dbo.AuthMigrations WHERE Name='005-profile-photo') INSERT INTO dbo.AuthMigrations(Name) VALUES ('005-profile-photo')",
      { transaction },
    );
  });
  console.log("Database migrations are current.");
} catch (error) {
  console.error("Migration failed; transaction rolled back.", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
