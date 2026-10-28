export async function up(q, transaction) {
  await q.sequelize.query(
    `
    IF COL_LENGTH('dbo.ServiceItems','IsActive') IS NULL
      ALTER TABLE dbo.ServiceItems ADD IsActive bit NOT NULL CONSTRAINT DF_ServiceItems_IsActive DEFAULT 1;
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Services') AND name='IX_Services_AdminDates')
      CREATE INDEX IX_Services_AdminDates ON dbo.Services(CreatedAt,ServiceId) INCLUDE(VendorId,CategoryId,SubCategoryId,ApprovalStatus,IsActive,BasePrice,UpdatedAt);
  `,
    { transaction },
  );
}
