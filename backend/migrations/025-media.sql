IF COL_LENGTH('dbo.Media','OwnerId') IS NULL ALTER TABLE dbo.Media ADD
 OwnerId uniqueidentifier NULL REFERENCES dbo.Users(UserId), UploadedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId),
 VendorId uniqueidentifier NULL REFERENCES dbo.Vendors(VendorId), MediaCategory varchar(20) NULL,
 Purpose varchar(30) NOT NULL DEFAULT 'Gallery', StorageKey nvarchar(700) NULL,SecureUrl nvarchar(1000) NULL, ResourceType varchar(10) NOT NULL DEFAULT 'image', DeliveryType varchar(20) NOT NULL DEFAULT 'upload',
 Width int NULL,Height int NULL,ModerationStatus varchar(20) NOT NULL DEFAULT 'Approved' CHECK(ModerationStatus IN('Pending','Approved','Rejected','Hidden')),
 UploadStatus varchar(20) NOT NULL DEFAULT 'Ready' CHECK(UploadStatus IN('Uploading','Ready','Failed')),RequestKey uniqueidentifier NULL,RequestHash varchar(64) NULL,
 ErrorMessage nvarchar(1000) NULL,VariantsJson nvarchar(max) NULL,UpdatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),DeletedAt datetime2 NULL,
 ModeratedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId),ModeratedAt datetime2 NULL,ModerationReason nvarchar(2000) NULL,
 CleanupStatus varchar(20) NOT NULL DEFAULT 'None',CleanupAttempts int NOT NULL DEFAULT 0,NextCleanupAt datetime2 NULL,CleanupLeaseUntil datetime2 NULL;
GO
UPDATE m SET MediaCategory=CASE WHEN EntityType IN('Vendor','Service','Package','Review') THEN EntityType ELSE 'Admin' END,
 OwnerId=COALESCE(v.UserId,sv.UserId,pv.UserId,r.CustomerId),VendorId=COALESCE(v.VendorId,s.VendorId,ps.VendorId,r.VendorId)
FROM dbo.Media m LEFT JOIN dbo.Vendors v ON m.EntityType='Vendor' AND v.VendorId=m.EntityId LEFT JOIN dbo.Services s ON m.EntityType='Service' AND s.ServiceId=m.EntityId LEFT JOIN dbo.Vendors sv ON sv.VendorId=s.VendorId LEFT JOIN dbo.ServicePackages p ON m.EntityType='Package' AND p.PackageId=m.EntityId LEFT JOIN dbo.Services ps ON ps.ServiceId=p.ServiceId LEFT JOIN dbo.Vendors pv ON pv.VendorId=ps.VendorId LEFT JOIN dbo.Reviews r ON m.EntityType='Review' AND r.ReviewId=m.EntityId WHERE m.MediaCategory IS NULL;
IF COL_LENGTH('dbo.ReviewImages','MediaId') IS NULL ALTER TABLE dbo.ReviewImages ADD MediaId uniqueidentifier NULL REFERENCES dbo.Media(MediaId);
GO
INSERT dbo.Media(MediaId,EntityType,EntityId,MediaType,MediaUrl,PublicId,FileName,MimeType,FileSize,SortOrder,OwnerId,UploadedBy,VendorId,MediaCategory,Purpose,StorageKey,ResourceType,DeliveryType,CreatedAt)
 SELECT i.ReviewImageId,'Review',i.ReviewId,'Image',i.ImageUrl,CASE WHEN i.StorageKey LIKE 'cloudinary:raw:authenticated:%' THEN REPLACE(i.StorageKey,'cloudinary:raw:authenticated:','') END,i.ImageName,i.MimeType,i.ImageSize,i.SortOrder,r.CustomerId,r.CustomerId,r.VendorId,'Review','Gallery',i.StorageKey,'raw','authenticated',i.CreatedAt
 FROM dbo.ReviewImages i JOIN dbo.Reviews r ON r.ReviewId=i.ReviewId WHERE NOT EXISTS(SELECT 1 FROM dbo.Media m WHERE m.MediaId=i.ReviewImageId);
UPDATE dbo.ReviewImages SET MediaId=ReviewImageId WHERE MediaId IS NULL;
UPDATE dbo.Media SET EntityType=CASE LOWER(EntityType) WHEN 'vendor' THEN 'Vendor' WHEN 'service' THEN 'Service' WHEN 'package' THEN 'Package' WHEN 'review' THEN 'Review' WHEN 'admin' THEN 'Admin' ELSE EntityType END;
UPDATE dbo.Media SET SecureUrl=MediaUrl WHERE SecureUrl IS NULL AND MediaUrl LIKE 'https://res.cloudinary.com/%';
INSERT dbo.Media(EntityType,EntityId,MediaType,MediaUrl,MediaCategory,Purpose,OwnerId,UploadedBy,VendorId,FileName)
 SELECT 'Vendor',v.VendorId,'Image',a.Url,'Vendor',a.Purpose,v.UserId,NULL,v.VendorId,LOWER(a.Purpose)+' image' FROM dbo.Vendors v CROSS APPLY(VALUES('Logo',v.LogoUrl),('Cover',v.CoverImageUrl)) a(Purpose,Url) WHERE NULLIF(a.Url,'') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Media m WHERE m.EntityType='Vendor' AND m.EntityId=v.VendorId AND m.Purpose=a.Purpose AND m.DeletedAt IS NULL);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Media_Request') CREATE UNIQUE INDEX UX_Media_Request ON dbo.Media(UploadedBy,RequestKey) WHERE RequestKey IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Media_Entity') CREATE INDEX IX_Media_Entity ON dbo.Media(EntityType,EntityId,DeletedAt,SortOrder) INCLUDE(ModerationStatus,UploadStatus,IsPrimary);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Media_Owner') CREATE INDEX IX_Media_Owner ON dbo.Media(OwnerId,CreatedAt);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Media_Library') CREATE INDEX IX_Media_Library ON dbo.Media(MediaCategory,ModerationStatus,CreatedAt) INCLUDE(FileSize,UploadStatus,VendorId,DeletedAt);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Media_Cleanup') CREATE INDEX IX_Media_Cleanup ON dbo.Media(CleanupStatus,NextCleanupAt,CleanupLeaseUntil);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_ReviewImages_Media') CREATE UNIQUE INDEX IX_ReviewImages_Media ON dbo.ReviewImages(MediaId) WHERE MediaId IS NOT NULL;
