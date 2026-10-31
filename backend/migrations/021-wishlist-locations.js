// Extend existing records; service coverage remains in Services.DetailsJson.
export async function up(q, transaction) {
  const query = (sql) => q.sequelize.query(sql, { transaction });
  await query(`
    IF EXISTS(SELECT 1 FROM dbo.Wishlists WHERE
      (CASE WHEN VendorId IS NULL THEN 0 ELSE 1 END + CASE WHEN ServiceId IS NULL THEN 0 ELSE 1 END + CASE WHEN PackageId IS NULL THEN 0 ELSE 1 END)<>1)
      THROW 51000,'Ambiguous wishlist targets require explicit data repair before migration.',1;
    IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Wishlists_Target') ALTER TABLE dbo.Wishlists DROP CONSTRAINT CK_Wishlists_Target;
    ALTER TABLE dbo.Wishlists ADD CONSTRAINT CK_Wishlists_Target CHECK
      ((CASE WHEN VendorId IS NULL THEN 0 ELSE 1 END + CASE WHEN ServiceId IS NULL THEN 0 ELSE 1 END + CASE WHEN PackageId IS NULL THEN 0 ELSE 1 END)=1);
    IF COL_LENGTH('dbo.Addresses','FullName') IS NULL ALTER TABLE dbo.Addresses ADD FullName nvarchar(200) NULL,Phone varchar(30) NULL,District nvarchar(100) NULL;
    IF COL_LENGTH('dbo.Events','LocationJson') IS NULL ALTER TABLE dbo.Events ADD LocationJson nvarchar(max) NULL;
    IF COL_LENGTH('dbo.VendorLocations','LocationName') IS NULL ALTER TABLE dbo.VendorLocations ADD LocationName nvarchar(200) NULL,LocationType varchar(30) NOT NULL DEFAULT 'Business Location',District nvarchar(100) NULL,ContactNumber varchar(30) NULL;
  `);
  for (const target of ["VendorId", "ServiceId", "PackageId"]) {
    await query(
      `IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Wishlists') AND name='UX_Wishlists_${target}') CREATE UNIQUE INDEX UX_Wishlists_${target} ON dbo.Wishlists(CustomerId,${target}) WHERE ${target} IS NOT NULL;`,
    );
  }
  await query(`
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Addresses') AND name='UX_Addresses_Default') CREATE UNIQUE INDEX UX_Addresses_Default ON dbo.Addresses(UserId) WHERE IsDefault=1;
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.VendorLocations') AND name='UX_VendorLocations_Primary') CREATE UNIQUE INDEX UX_VendorLocations_Primary ON dbo.VendorLocations(VendorId) WHERE IsPrimary=1;
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Wishlists') AND name='IX_Wishlists_Customer') CREATE INDEX IX_Wishlists_Customer ON dbo.Wishlists(CustomerId,CreatedAt DESC);
  `);
}
