-- New reviews publish immediately. Keep existing status values for historical
-- decisions and compatibility; Approved now means published without an approval step.
DECLARE @defaultName sysname;
DECLARE @dropDefault nvarchar(500);
SELECT @defaultName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.Reviews') AND c.name = 'ModerationStatus';
IF @defaultName IS NOT NULL
BEGIN
  SET @dropDefault = 'ALTER TABLE dbo.Reviews DROP CONSTRAINT ' + QUOTENAME(@defaultName);
  EXEC sp_executesql @dropDefault;
END;
ALTER TABLE dbo.Reviews ADD CONSTRAINT DF_ReviewModeration DEFAULT 'Approved' FOR ModerationStatus;

SET @defaultName = NULL;
SELECT @defaultName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.Reviews') AND c.name = 'IsPublished';
IF @defaultName IS NOT NULL
BEGIN
  SET @dropDefault = 'ALTER TABLE dbo.Reviews DROP CONSTRAINT ' + QUOTENAME(@defaultName);
  EXEC sp_executesql @dropDefault;
END;
ALTER TABLE dbo.Reviews ADD CONSTRAINT DF_Reviews_AutoPublish DEFAULT 1 FOR IsPublished;

-- Release only verified reviews of completed bookings. Explicit admin decisions
-- (Hidden, Rejected, Flagged) and customer deletions remain intact.
UPDATE r SET ModerationStatus = 'Approved', IsPublished = 1,
  ModeratedBy = NULL, ModeratedAt = NULL, ModerationReason = NULL,
  UpdatedAt = SYSUTCDATETIME()
FROM dbo.Reviews r
JOIN dbo.Booking b ON b.BookingId = r.BookingId
  AND b.CustomerId = r.CustomerId AND b.VendorId = r.VendorId
WHERE r.ModerationStatus = 'Pending' AND r.DeletedAt IS NULL
  AND r.IsVerified = 1 AND b.BookingStatus = 'Completed';

-- Rebuild vendor totals in the same transaction as the publication change.
UPDATE v SET AverageRating = COALESCE(a.rating, 0), TotalReviews = a.total
FROM dbo.Vendors v
OUTER APPLY (
  SELECT AVG(CAST(r.Rating AS decimal(10,2))) AS rating, COUNT(*) AS total
  FROM dbo.Reviews r JOIN dbo.Booking b ON b.BookingId = r.BookingId
    AND b.CustomerId = r.CustomerId AND b.VendorId = r.VendorId
    AND b.BookingStatus = 'Completed'
  WHERE r.VendorId = v.VendorId AND r.BookingItemId IS NULL
    AND r.ModerationStatus = 'Approved' AND r.IsPublished = 1
    AND r.IsVerified = 1 AND r.DeletedAt IS NULL
) a;
