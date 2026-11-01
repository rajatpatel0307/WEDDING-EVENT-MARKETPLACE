IF COL_LENGTH('dbo.Reviews','ModerationStatus') IS NULL
BEGIN
 ALTER TABLE dbo.Reviews ADD ModerationStatus varchar(20) NOT NULL CONSTRAINT DF_ReviewModeration DEFAULT 'Pending',
 ServiceId uniqueidentifier NULL REFERENCES dbo.Services(ServiceId), PackageId uniqueidentifier NULL REFERENCES dbo.ServicePackages(PackageId), BookingItemId bigint NULL REFERENCES dbo.BookingItems(BookingItemId),
 ServiceQualityRating tinyint NULL CHECK(ServiceQualityRating BETWEEN 1 AND 5), CommunicationRating tinyint NULL CHECK(CommunicationRating BETWEEN 1 AND 5), ValueForMoneyRating tinyint NULL CHECK(ValueForMoneyRating BETWEEN 1 AND 5), ProfessionalismRating tinyint NULL CHECK(ProfessionalismRating BETWEEN 1 AND 5),
 ModeratedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId), ModeratedAt datetime2 NULL, ModerationReason nvarchar(2000) NULL, DeletedAt datetime2 NULL;
END;
GO
-- Legacy reviews remain available to their authors and moderators, pending approval.
UPDATE dbo.Reviews SET IsPublished=0 WHERE ModerationStatus<>'Approved';
IF EXISTS(SELECT 1 FROM sys.key_constraints WHERE name='UQ_Reviews_Booking') ALTER TABLE dbo.Reviews DROP CONSTRAINT UQ_Reviews_Booking;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Reviews_Target') CREATE UNIQUE INDEX UX_Reviews_Target ON dbo.Reviews(BookingId,VendorId,BookingItemId);
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Reviews_Moderation') ALTER TABLE dbo.Reviews ADD CONSTRAINT CK_Reviews_Moderation CHECK(ModerationStatus IN ('Pending','Approved','Rejected','Hidden','Flagged'));
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Reviews_Public') CREATE INDEX IX_Reviews_Public ON dbo.Reviews(VendorId,ModerationStatus,CreatedAt) INCLUDE(Rating,IsPublished,DeletedAt,ServiceId,PackageId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Reviews_Customer') CREATE INDEX IX_Reviews_Customer ON dbo.Reviews(CustomerId,CreatedAt);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Reviews_Service') CREATE INDEX IX_Reviews_Service ON dbo.Reviews(ServiceId,PackageId,CreatedAt);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Reviews_Package') CREATE INDEX IX_Reviews_Package ON dbo.Reviews(PackageId,CreatedAt);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Reviews_Moderation') CREATE INDEX IX_Reviews_Moderation ON dbo.Reviews(ModerationStatus,CreatedAt);
IF COL_LENGTH('dbo.ReviewImages','StorageKey') IS NULL ALTER TABLE dbo.ReviewImages ADD StorageKey nvarchar(500) NULL, ImageName nvarchar(200) NULL, ImageSize int NULL, MimeType varchar(30) NULL;
IF OBJECT_ID('dbo.VendorReviewResponses') IS NULL CREATE TABLE dbo.VendorReviewResponses(
 ResponseId uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY, ReviewId uniqueidentifier NOT NULL UNIQUE REFERENCES dbo.Reviews(ReviewId), VendorId uniqueidentifier NOT NULL REFERENCES dbo.Vendors(VendorId),
 ResponseText nvarchar(3000) NOT NULL, ModerationStatus varchar(20) NOT NULL DEFAULT 'Approved' CHECK(ModerationStatus IN ('Approved','Hidden')), CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),UpdatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),DeletedAt datetime2 NULL);
IF OBJECT_ID('dbo.ReviewReports') IS NULL CREATE TABLE dbo.ReviewReports(
 ReportId uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY, ReviewId uniqueidentifier NOT NULL REFERENCES dbo.Reviews(ReviewId),ResponseId uniqueidentifier NULL REFERENCES dbo.VendorReviewResponses(ResponseId),
 ReportedBy uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),ReportReason nvarchar(100) NOT NULL,ReportDescription nvarchar(2000) NULL,ReportStatus varchar(20) NOT NULL DEFAULT 'Pending' CHECK(ReportStatus IN ('Pending','Accepted','Dismissed')),
 ReviewedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId),ReviewedAt datetime2 NULL,AdminNotes nvarchar(2000) NULL,CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_ReviewReports_Active') CREATE UNIQUE INDEX UX_ReviewReports_Active ON dbo.ReviewReports(ReportedBy,ReviewId,ResponseId) WHERE ReportStatus='Pending';
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_ReviewReports_Status') CREATE INDEX IX_ReviewReports_Status ON dbo.ReviewReports(ReportStatus,CreatedAt);
IF OBJECT_ID('dbo.ReviewModerationHistory') IS NULL CREATE TABLE dbo.ReviewModerationHistory(
 HistoryId uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,ReviewId uniqueidentifier NOT NULL REFERENCES dbo.Reviews(ReviewId),PreviousStatus varchar(20) NULL,NewStatus varchar(20) NOT NULL,ModeratedBy uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),ModerationReason nvarchar(2000) NULL,CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
GO
IF COL_LENGTH('dbo.ReviewModerationHistory','InternalNotes') IS NULL ALTER TABLE dbo.ReviewModerationHistory ADD InternalNotes nvarchar(2000) NULL;
UPDATE v SET AverageRating=COALESCE(a.rating,0),TotalReviews=a.total FROM dbo.Vendors v OUTER APPLY(SELECT AVG(CAST(r.Rating AS decimal(10,2))) AS rating,COUNT(*) AS total FROM dbo.Reviews r JOIN dbo.Booking b ON b.BookingId=r.BookingId AND b.CustomerId=r.CustomerId AND b.VendorId=r.VendorId AND b.BookingStatus='Completed' WHERE r.VendorId=v.VendorId AND r.BookingItemId IS NULL AND r.ModerationStatus='Approved' AND r.IsPublished=1 AND r.IsVerified=1 AND r.DeletedAt IS NULL) a;
