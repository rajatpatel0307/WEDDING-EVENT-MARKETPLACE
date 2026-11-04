-- Existing vendors start Pending; verification never implicitly grants either permission.
-- AuditLogs already provides the required immutable action history.
IF COL_LENGTH('dbo.Vendors','ServiceAccessStatus') IS NULL
  ALTER TABLE dbo.Vendors ADD ServiceAccessStatus varchar(20) NOT NULL CONSTRAINT DF_Vendors_ServiceAccess DEFAULT 'Pending' WITH VALUES;
IF COL_LENGTH('dbo.Vendors','BookingAccessStatus') IS NULL
  ALTER TABLE dbo.Vendors ADD BookingAccessStatus varchar(20) NOT NULL CONSTRAINT DF_Vendors_BookingAccess DEFAULT 'Pending' WITH VALUES;
IF COL_LENGTH('dbo.Vendors','ServiceAccessChangedBy') IS NULL
  ALTER TABLE dbo.Vendors ADD ServiceAccessChangedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId);
IF COL_LENGTH('dbo.Vendors','ServiceAccessChangedAt') IS NULL
  ALTER TABLE dbo.Vendors ADD ServiceAccessChangedAt datetime2(3) NULL;
IF COL_LENGTH('dbo.Vendors','ServiceAccessReason') IS NULL
  ALTER TABLE dbo.Vendors ADD ServiceAccessReason nvarchar(1000) NULL;
IF COL_LENGTH('dbo.Vendors','BookingAccessChangedBy') IS NULL
  ALTER TABLE dbo.Vendors ADD BookingAccessChangedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId);
IF COL_LENGTH('dbo.Vendors','BookingAccessChangedAt') IS NULL
  ALTER TABLE dbo.Vendors ADD BookingAccessChangedAt datetime2(3) NULL;
IF COL_LENGTH('dbo.Vendors','BookingAccessReason') IS NULL
  ALTER TABLE dbo.Vendors ADD BookingAccessReason nvarchar(1000) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Vendors_ServiceAccess')
  EXEC('ALTER TABLE dbo.Vendors ADD CONSTRAINT CK_Vendors_ServiceAccess CHECK(ServiceAccessStatus IN (''Pending'',''Approved'',''Rejected'',''Suspended''))');
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Vendors_BookingAccess')
  EXEC('ALTER TABLE dbo.Vendors ADD CONSTRAINT CK_Vendors_BookingAccess CHECK(BookingAccessStatus IN (''Pending'',''Approved'',''Rejected'',''Suspended''))');
