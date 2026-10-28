export async function up(q, transaction) {
  await q.sequelize.query(
    `
    IF COL_LENGTH('dbo.Services','AttributesJson') IS NULL ALTER TABLE dbo.Services ADD AttributesJson nvarchar(max) NULL;
    IF COL_LENGTH('dbo.Coupons','VendorId') IS NULL ALTER TABLE dbo.Coupons ADD VendorId uniqueidentifier NULL REFERENCES dbo.Vendors(VendorId);
    IF COL_LENGTH('dbo.Messages','AttachmentName') IS NULL ALTER TABLE dbo.Messages ADD AttachmentName nvarchar(255) NULL;
    IF COL_LENGTH('dbo.Messages','AttachmentMime') IS NULL ALTER TABLE dbo.Messages ADD AttachmentMime varchar(100) NULL;
  `,
    { transaction },
  );
}
