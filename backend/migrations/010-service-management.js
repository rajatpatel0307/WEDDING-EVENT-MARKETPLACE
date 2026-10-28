export async function up(q, transaction) {
  await q.sequelize.query(
    `
    IF COL_LENGTH('dbo.Services','DetailsJson') IS NULL ALTER TABLE dbo.Services ADD DetailsJson nvarchar(max) NULL;
    IF COL_LENGTH('dbo.Services','RejectionReason') IS NULL ALTER TABLE dbo.Services ADD RejectionReason nvarchar(2000) NULL, AdminNote nvarchar(2000) NULL, RejectedAt datetime2(3) NULL, SubmittedAt datetime2(3) NULL, ApprovalCycle int NOT NULL CONSTRAINT DF_Service_Cycle DEFAULT 0;
    IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Services_ApprovalStatus') ALTER TABLE dbo.Services DROP CONSTRAINT CK_Services_ApprovalStatus;
    ALTER TABLE dbo.Services WITH CHECK ADD CONSTRAINT CK_Services_ApprovalStatus CHECK(ApprovalStatus IN ('Draft','Pending','Approved','Rejected','Suspended'));
    IF COL_LENGTH('dbo.ServicePackages','DetailsJson') IS NULL ALTER TABLE dbo.ServicePackages ADD DetailsJson nvarchar(max) NULL;
    IF OBJECT_ID('dbo.ServiceDailyMetrics') IS NULL CREATE TABLE dbo.ServiceDailyMetrics(
      ServiceId uniqueidentifier NOT NULL REFERENCES dbo.Services(ServiceId), MetricDate date NOT NULL,
      Views bigint NOT NULL DEFAULT 0, Enquiries bigint NOT NULL DEFAULT 0,
      CONSTRAINT PK_ServiceDailyMetrics PRIMARY KEY(ServiceId,MetricDate));
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Services_VendorManagement' AND object_id=OBJECT_ID('dbo.Services')) CREATE INDEX IX_Services_VendorManagement ON dbo.Services(VendorId,ApprovalStatus,UpdatedAt) INCLUDE(CategoryId,SubCategoryId,BasePrice,IsActive);
  `,
    { transaction },
  );
}
