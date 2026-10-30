import { up as paymentIntegrityUp } from "../migrations/019-payment-integrity.js";
import { up as financialControlsUp } from '../migrations/020-financial-controls.js';
import { up as quotationHardeningUp } from "../migrations/018-quotation-history-hardening.js";
import { up as quotationsUp } from "../migrations/017-quotation-lifecycle.js";
import { up as customerWebsiteUp } from "../migrations/016-customer-website.js";
import { up as lifecycleUp } from "../migrations/015-booking-lifecycle.js";
import { up as operationsUp } from "../migrations/014-admin-operations.js";
import { up as adminBookingsUp } from "../migrations/013-admin-bookings.js";
import { up as adminServicesUp } from "../migrations/012-admin-services.js";
import { up as serviceApprovalUp } from "../migrations/011-service-approval.js";
import { up as serviceManagementUp } from "../migrations/010-service-management.js";
import { up as customerWorkspaceUp } from "../migrations/009-customer-workspace.js";
import { up as workspaceUp } from "../migrations/008-vendor-workspace.js";
import { up as verificationUp } from "../migrations/007-vendor-verification.js";
import { up as profileUp } from "../migrations/005-profile-photo.js";
import { up as customerDetailsUp } from "../migrations/006-customer-details.js";
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
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @result int; EXEC @result=sp_getapplock @Resource='MarryNestAdminMigration', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; IF @result < 0 THROW 51000, 'Migration lock unavailable', 1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='006-customer-details'",
      { transaction },
    );
    if (!rows.length) {
      await customerDetailsUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES ('006-customer-details')",
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
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='007-vendor-verification'",
      { transaction },
    );
    if (!rows.length) {
      await verificationUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES ('007-vendor-verification')",
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
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='008-vendor-workspace'",
      { transaction },
    );
    if (!rows.length) {
      await workspaceUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES ('008-vendor-workspace')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='009-customer-workspace'",
      { transaction },
    );
    if (!rows.length) {
      await customerWorkspaceUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES('009-customer-workspace')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='010-service-management'",
      { transaction },
    );
    if (!rows.length) {
      await serviceManagementUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES('010-service-management')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='011-service-approval'",
      { transaction },
    );
    if (!rows.length) {
      await serviceApprovalUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES('011-service-approval')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='012-admin-services'",
      { transaction },
    );
    if (!rows.length) {
      await adminServicesUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES('012-admin-services')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='013-admin-bookings'",
      { transaction },
    );
    if (!rows.length) {
      await adminBookingsUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES('013-admin-bookings')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='014-admin-operations'",
      { transaction },
    );
    if (!rows.length) {
      await operationsUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES('014-admin-operations')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='015-booking-lifecycle'",
      { transaction },
    );
    if (!rows.length) {
      await lifecycleUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES('015-booking-lifecycle')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='016-customer-website'",
      { transaction },
    );
    if (!rows.length) {
      await customerWebsiteUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES('016-customer-website')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='017-quotation-lifecycle'",
      { transaction },
    );
    if (!rows.length) {
      await quotationsUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES('017-quotation-lifecycle')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",
      { transaction },
    );
    const [rows] = await sequelize.query(
      "SELECT Name FROM dbo.AuthMigrations WHERE Name='018-quotation-history-hardening'",
      { transaction },
    );
    if (!rows.length) {
      await quotationHardeningUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query(
        "INSERT INTO dbo.AuthMigrations(Name) VALUES('018-quotation-history-hardening')",
        { transaction },
      );
    }
  });
  await sequelize.transaction(async (transaction) => {
    await sequelize.query("DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;", { transaction });
    const [rows] = await sequelize.query("SELECT Name FROM dbo.AuthMigrations WHERE Name='019-payment-integrity'", { transaction });
    if (!rows.length) {
      await paymentIntegrityUp(sequelize.getQueryInterface(), transaction);
      await sequelize.query("INSERT INTO dbo.AuthMigrations(Name) VALUES('019-payment-integrity')", { transaction });
    }
  });
  await sequelize.transaction(async transaction=>{
    await sequelize.query("DECLARE @r int; EXEC @r=sp_getapplock @Resource='MarryNestAdminMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Migration lock unavailable',1;",{transaction});
    const [rows]=await sequelize.query("SELECT Name FROM dbo.AuthMigrations WHERE Name='020-financial-controls'",{transaction});
    if(!rows.length){await financialControlsUp(sequelize.getQueryInterface(),transaction);await sequelize.query("INSERT INTO dbo.AuthMigrations(Name) VALUES('020-financial-controls')",{transaction});}
  });
  console.log("Database migrations are current.");
} catch (error) {
  console.error("Migration failed; transaction rolled back.", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
