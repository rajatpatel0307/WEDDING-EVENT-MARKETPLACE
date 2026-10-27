export async function up(q, transaction) {
  // A nullable target preserves existing vendor/service wishlist records.
  await q.sequelize.query(
    `
    IF COL_LENGTH('dbo.Wishlists','PackageId') IS NULL
      ALTER TABLE dbo.Wishlists ADD PackageId uniqueidentifier NULL;
  `,
    { transaction },
  );
  await q.sequelize.query(
    `
    IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_Wishlists_Package')
      ALTER TABLE dbo.Wishlists ADD CONSTRAINT FK_Wishlists_Package FOREIGN KEY(PackageId) REFERENCES dbo.ServicePackages(PackageId);
    IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Wishlists_Target')
      ALTER TABLE dbo.Wishlists DROP CONSTRAINT CK_Wishlists_Target;
    ALTER TABLE dbo.Wishlists WITH CHECK ADD CONSTRAINT CK_Wishlists_Target CHECK(VendorId IS NOT NULL OR ServiceId IS NOT NULL OR PackageId IS NOT NULL);
  `,
    { transaction },
  );
}
