export async function up(q, transaction) {
  await q.sequelize.query(
    `
    IF OBJECT_ID('dbo.AdminLocations','U') IS NULL
    CREATE TABLE dbo.AdminLocations (
      LocationId uniqueidentifier NOT NULL CONSTRAINT PK_AdminLocations PRIMARY KEY DEFAULT NEWID(),
      City nvarchar(100) NOT NULL,
      State nvarchar(100) NOT NULL,
      Country nvarchar(100) NOT NULL,
      IsActive bit NOT NULL DEFAULT 1,
      CreatedBy uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),
      CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
      UpdatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
      DeletedAt datetime2 NULL
    );
    IF COL_LENGTH('dbo.Vendors','AdminLocationId') IS NULL
      ALTER TABLE dbo.Vendors ADD AdminLocationId uniqueidentifier NULL
        CONSTRAINT FK_Vendors_AdminLocations REFERENCES dbo.AdminLocations(LocationId);
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.AdminLocations') AND name='UX_AdminLocations_Name')
      CREATE UNIQUE INDEX UX_AdminLocations_Name ON dbo.AdminLocations(City,State,Country) WHERE DeletedAt IS NULL;
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Vendors') AND name='IX_Vendors_AdminLocation')
      CREATE INDEX IX_Vendors_AdminLocation ON dbo.Vendors(AdminLocationId,VerificationStatus,IsActive);
  `,
    { transaction },
  );
}
