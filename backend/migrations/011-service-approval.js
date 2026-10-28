export async function up(q, transaction) {
  await q.sequelize.query(
    `
    IF COL_LENGTH('dbo.Services','ApprovedAt') IS NULL
      ALTER TABLE dbo.Services ADD ApprovedAt datetime2(3) NULL, ApprovedBy uniqueidentifier NULL, RejectedBy uniqueidentifier NULL;
    IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Services_ApprovalStatus')
      ALTER TABLE dbo.Services DROP CONSTRAINT CK_Services_ApprovalStatus;
    ALTER TABLE dbo.Services WITH CHECK ADD CONSTRAINT CK_Services_ApprovalStatus
      CHECK(ApprovalStatus IN ('Draft','Pending','UnderReview','Approved','Rejected','Suspended'));
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Services_ApprovalQueue' AND object_id=OBJECT_ID('dbo.Services'))
      CREATE INDEX IX_Services_ApprovalQueue ON dbo.Services(ApprovalStatus,SubmittedAt) INCLUDE(VendorId,CategoryId,IsActive);
  `,
    { transaction },
  );
}
