export async function up(q, transaction) {
  await q.sequelize.query(
    `
    IF COL_LENGTH('dbo.Vendors','VerifiedAt') IS NULL ALTER TABLE dbo.Vendors ADD VerifiedAt datetime2(3) NULL;
    IF COL_LENGTH('dbo.Vendors','VerifiedBy') IS NULL ALTER TABLE dbo.Vendors ADD VerifiedBy uniqueidentifier NULL;
    IF COL_LENGTH('dbo.Vendors','VerificationCycle') IS NULL ALTER TABLE dbo.Vendors ADD VerificationCycle int NOT NULL CONSTRAINT DF_Vendors_VerificationCycle DEFAULT 1;
    IF OBJECT_ID('dbo.VendorVerificationHistory') IS NULL
    CREATE TABLE dbo.VendorVerificationHistory(
      HistoryId bigint IDENTITY(1,1) PRIMARY KEY,
      VendorId uniqueidentifier NOT NULL REFERENCES dbo.Vendors(VendorId),
      CycleNumber int NOT NULL,
      FromStatus varchar(30) NOT NULL,
      ToStatus varchar(30) NOT NULL,
      Reason nvarchar(1000) NULL,
      Notes nvarchar(2000) NULL,
      AdminId uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),
      CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_VendorVerificationHistory_Vendor' AND object_id=OBJECT_ID('dbo.VendorVerificationHistory'))
      CREATE INDEX IX_VendorVerificationHistory_Vendor ON dbo.VendorVerificationHistory(VendorId,CycleNumber,CreatedAt);
  `,
    { transaction },
  );
}
