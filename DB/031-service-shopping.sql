-- Additive service-cart extension; reviewed against the current schema.
-- Run manually after review. This script is not run by the application.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.Cart','U') IS NULL OR COL_LENGTH('dbo.Categories','AllowBuyOnline') IS NULL
 THROW 50001,'Apply 030-product-shopping.sql first.',1;
IF OBJECT_ID('dbo.ServiceCartItems','U') IS NULL
CREATE TABLE dbo.ServiceCartItems (
 ItemId uniqueidentifier NOT NULL CONSTRAINT PK_ServiceCartItems PRIMARY KEY DEFAULT NEWID(),
 CartId uniqueidentifier NOT NULL REFERENCES dbo.Cart(CartId),
 ServiceId uniqueidentifier NOT NULL REFERENCES dbo.Services(ServiceId),
 PackageId uniqueidentifier NULL REFERENCES dbo.ServicePackages(PackageId),
 Quantity int NOT NULL DEFAULT 1 CHECK(Quantity BETWEEN 1 AND 999),
 CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_ServiceCartSelection UNIQUE(CartId,ServiceId,PackageId)
);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ServiceCartItems') AND name='IX_ServiceCart_Service')
 CREATE INDEX IX_ServiceCart_Service ON dbo.ServiceCartItems(ServiceId);
COMMIT;
-- Rollback: revert application changes and retain this table and saved cart data.
-- No booking, payment, product, inventory, or customer data is changed or dropped.
