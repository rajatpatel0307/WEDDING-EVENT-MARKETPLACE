-- Extends existing purchase orders. Internal IDs, payment records and totals are preserved.
SET XACT_ABORT ON;
DECLARE @ownsTransaction bit=CASE WHEN @@TRANCOUNT=0 THEN 1 ELSE 0 END;
IF @ownsTransaction=1 BEGIN TRANSACTION;
BEGIN TRY
  DECLARE @lock int;
  EXEC @lock=sys.sp_getapplock @Resource='MarryNestOrderMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=30000;
  IF @lock<0 THROW 51000,'Order migration is busy.',1;
  IF OBJECT_ID('dbo.Orders','U') IS NULL OR OBJECT_ID('dbo.OrderLineItems','U') IS NULL
    THROW 51000,'Existing order tables must be installed first.',1;
  DECLARE @count bigint;
  SELECT @count=COUNT_BIG(*) FROM dbo.Orders WITH(TABLOCKX,HOLDLOCK);
  IF COL_LENGTH('dbo.Orders','LegacyOrderNumber') IS NULL ALTER TABLE dbo.Orders ADD LegacyOrderNumber varchar(50) NULL;
  IF COL_LENGTH('dbo.Orders','StatusVersion') IS NULL ALTER TABLE dbo.Orders ADD StatusVersion int NOT NULL CONSTRAINT DF_Orders_StatusVersion DEFAULT(0);
  IF COL_LENGTH('dbo.Orders','StatusUpdatedAt') IS NULL ALTER TABLE dbo.Orders ADD StatusUpdatedAt datetime2 NULL;
  IF COL_LENGTH('dbo.Orders','PaymentMethod') IS NULL ALTER TABLE dbo.Orders ADD PaymentMethod varchar(40) NULL;
  IF COL_LENGTH('dbo.OrderLineItems','DescriptionSnapshot') IS NULL ALTER TABLE dbo.OrderLineItems ADD DescriptionSnapshot nvarchar(max) NULL;
  IF COL_LENGTH('dbo.ProductOrderHistory','VendorId') IS NULL ALTER TABLE dbo.ProductOrderHistory ADD VendorId uniqueidentifier NULL REFERENCES dbo.Vendors(VendorId);
  IF COL_LENGTH('dbo.ProductOrderHistory','PreviousStatus') IS NULL ALTER TABLE dbo.ProductOrderHistory ADD PreviousStatus varchar(30) NULL;
  IF COL_LENGTH('dbo.ProductOrderHistory','IsOverride') IS NULL ALTER TABLE dbo.ProductOrderHistory ADD IsOverride bit NOT NULL CONSTRAINT DF_ProductOrderHistory_Override DEFAULT(0);
  IF OBJECT_ID('dbo.OrderNumberCounter','U') IS NULL
    CREATE TABLE dbo.OrderNumberCounter(Year int NOT NULL PRIMARY KEY,LastValue bigint NOT NULL CHECK(LastValue>=0));

  -- Replace only legacy references, preserving their original values for support/auditing.
  EXEC sys.sp_executesql N'
    SELECT o.OrderId,o.OrderNumber AS LegacyNumber,
      ''MNOR''+RIGHT(CONVERT(varchar(4),YEAR(DATEADD(minute,330,o.CreatedAt))),2)+
      CASE WHEN n<100000 THEN RIGHT(''00000''+CONVERT(varchar(20),n),5) ELSE CONVERT(varchar(20),n) END AS NewNumber
    INTO #OrderNumberBackfill FROM (
      SELECT o.*,COALESCE((SELECT MAX(TRY_CONVERT(bigint,SUBSTRING(existing.OrderNumber,7,44))) FROM dbo.Orders existing
        WHERE LEFT(existing.OrderNumber,6)=''MNOR''+RIGHT(CONVERT(varchar(4),YEAR(DATEADD(minute,330,o.CreatedAt))),2)),0)
        +ROW_NUMBER() OVER(PARTITION BY YEAR(DATEADD(minute,330,o.CreatedAt)) ORDER BY o.CreatedAt,o.OrderId) AS n
      FROM dbo.Orders o WHERE LEFT(o.OrderNumber,4) COLLATE Latin1_General_100_BIN2<>''MNOR'' OR LEN(o.OrderNumber)<11
        OR SUBSTRING(o.OrderNumber,5,46) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%''
        OR TRY_CONVERT(bigint,SUBSTRING(o.OrderNumber,7,44))<=0
    ) o;
    UPDATE o SET LegacyOrderNumber=COALESCE(o.LegacyOrderNumber,m.LegacyNumber),OrderNumber=''~MNOR~''+REPLACE(CONVERT(varchar(36),o.OrderId),''-'','''')
      FROM dbo.Orders o JOIN #OrderNumberBackfill m ON m.OrderId=o.OrderId;
    UPDATE o SET OrderNumber=m.NewNumber FROM dbo.Orders o JOIN #OrderNumberBackfill m ON m.OrderId=o.OrderId;
    UPDATE n SET Message=REPLACE(n.Message,m.LegacyNumber,m.NewNumber)
      FROM dbo.Notifications n JOIN #OrderNumberBackfill m ON n.ReferenceId=m.OrderId WHERE n.ReferenceType=''Order'';
    DROP TABLE #OrderNumberBackfill;
    MERGE dbo.OrderNumberCounter WITH(HOLDLOCK) AS target
    USING(SELECT 2000+CONVERT(int,SUBSTRING(OrderNumber,5,2)) AS Year,MAX(CONVERT(bigint,SUBSTRING(OrderNumber,7,44))) AS LastValue
      FROM dbo.Orders GROUP BY SUBSTRING(OrderNumber,5,2)) AS source ON source.Year=target.Year
    WHEN MATCHED AND source.LastValue>target.LastValue THEN UPDATE SET LastValue=source.LastValue
    WHEN NOT MATCHED THEN INSERT(Year,LastValue) VALUES(source.Year,source.LastValue);
    UPDATE dbo.Orders SET StatusUpdatedAt=COALESCE(StatusUpdatedAt,CreatedAt);
    UPDATE i SET DescriptionSnapshot=p.Description FROM dbo.OrderLineItems i JOIN dbo.Products p ON p.ProductId=i.ProductId WHERE i.DescriptionSnapshot IS NULL;
  ';

  DECLARE @checks nvarchar(max)=N'';
  SELECT @checks=@checks+N'ALTER TABLE '+QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id))+N'.'+QUOTENAME(OBJECT_NAME(parent_object_id))+N' DROP CONSTRAINT '+QUOTENAME(name)+N';'
    FROM sys.check_constraints WHERE (parent_object_id=OBJECT_ID('dbo.Orders') AND definition LIKE '%OrderStatus%')
      OR (parent_object_id=OBJECT_ID('dbo.OrderLineItems') AND definition LIKE '%FulfillmentStatus%');
  IF @checks<>N'' EXEC sys.sp_executesql @checks;
  UPDATE i SET FulfillmentStatus=o.OrderStatus FROM dbo.OrderLineItems i JOIN dbo.Orders o ON o.OrderId=i.OrderId
    WHERE i.FulfillmentStatus='Pending' AND o.OrderStatus IN('Processing','Shipped','Delivered','Cancelled');
  UPDATE dbo.Orders SET OrderStatus='Pending' WHERE OrderStatus IN('Confirmed','AwaitingPayment');
  ALTER TABLE dbo.Orders ADD CONSTRAINT CK_Orders_Fulfillment CHECK(OrderStatus IN('Pending','Processing','Shipped','Delivered','Cancelled'));
  ALTER TABLE dbo.OrderLineItems ADD CONSTRAINT CK_OrderLineItems_Fulfillment CHECK(FulfillmentStatus IN('Pending','Processing','Shipped','Delivered','Cancelled'));
  DECLARE @default sysname;
  SELECT @default=dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.default_object_id=dc.object_id
    WHERE c.object_id=OBJECT_ID('dbo.Orders') AND c.name='OrderStatus';
  IF @default IS NOT NULL
  BEGIN
    SET @checks=N'ALTER TABLE dbo.Orders DROP CONSTRAINT '+QUOTENAME(@default);
    EXEC sys.sp_executesql @checks;
  END;
  ALTER TABLE dbo.Orders ADD CONSTRAINT DF_Orders_Fulfillment DEFAULT('Pending') FOR OrderStatus;
  DECLARE @existingNumberIndex sysname;
  SELECT TOP(1) @existingNumberIndex=i.name FROM sys.indexes i
    WHERE i.object_id=OBJECT_ID('dbo.Orders') AND i.is_unique=1 AND i.is_disabled=0 AND i.has_filter=0 AND i.name<>'UX_Orders_ManagementNumber'
      AND (SELECT COUNT(*) FROM sys.index_columns ic WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=1
      AND EXISTS(SELECT 1 FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
        WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal=1 AND c.name='OrderNumber');
  IF @existingNumberIndex IS NOT NULL AND EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Orders') AND name='UX_Orders_ManagementNumber')
    DROP INDEX UX_Orders_ManagementNumber ON dbo.Orders;
  IF @existingNumberIndex IS NULL AND NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Orders') AND name='UX_Orders_ManagementNumber')
    CREATE UNIQUE INDEX UX_Orders_ManagementNumber ON dbo.Orders(OrderNumber);
  IF OBJECT_ID('dbo.CK_Orders_ManagementNumber','C') IS NULL
    ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT CK_Orders_ManagementNumber CHECK(
      LEFT(OrderNumber,4) COLLATE Latin1_General_100_BIN2='MNOR' AND LEN(OrderNumber)>=11
      AND SUBSTRING(OrderNumber,5,46) COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9]%'
      AND TRY_CONVERT(bigint,SUBSTRING(OrderNumber,7,44))>0);
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.OrderLineItems') AND name='IX_OrderLineItems_VendorOrder')
    CREATE INDEX IX_OrderLineItems_VendorOrder ON dbo.OrderLineItems(VendorId,OrderId) INCLUDE(FulfillmentStatus,Quantity,LineTotal);
  EXEC sys.sp_executesql N'
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.ProductOrderHistory'') AND name=''IX_OrderHistory_OrderVendor'')
      CREATE INDEX IX_OrderHistory_OrderVendor ON dbo.ProductOrderHistory(OrderId,VendorId,CreatedAt);
    INSERT dbo.ProductOrderHistory(OrderId,VendorId,Status,Note,CreatedAt)
      SELECT i.OrderId,i.VendorId,MIN(i.FulfillmentStatus),''Order received.'',MIN(i.CreatedAt)
      FROM dbo.OrderLineItems i WHERE NOT EXISTS(SELECT 1 FROM dbo.ProductOrderHistory h WHERE h.OrderId=i.OrderId AND h.VendorId=i.VendorId)
      GROUP BY i.OrderId,i.VendorId;
  ';
  EXEC(N'CREATE OR ALTER PROCEDURE dbo.AllocateOrderNumber AS
  BEGIN
    SET NOCOUNT ON;
    IF @@TRANCOUNT=0 THROW 51000,''Order numbers require an active transaction.'',1;
    DECLARE @year int=YEAR(DATEADD(minute,330,SYSUTCDATETIME())),@n bigint,@r int;
    DECLARE @key varchar(80)=''MarryNestOrderNumber:''+CONVERT(varchar(4),@year);
    EXEC @r=sys.sp_getapplock @Resource=@key,@LockMode=''Exclusive'',@LockOwner=''Transaction'',@LockTimeout=10000;
    IF @r<0 THROW 51000,''Order number allocation is busy.'',1;
    IF NOT EXISTS(SELECT 1 FROM dbo.OrderNumberCounter WITH(UPDLOCK,HOLDLOCK) WHERE Year=@year)
      INSERT dbo.OrderNumberCounter(Year,LastValue) VALUES(@year,0);
    UPDATE dbo.OrderNumberCounter SET LastValue=LastValue+1 WHERE Year=@year;
    SELECT @n=LastValue FROM dbo.OrderNumberCounter WHERE Year=@year;
    SELECT ''MNOR''+RIGHT(CONVERT(varchar(4),@year),2)+CASE WHEN @n<100000 THEN RIGHT(''00000''+CONVERT(varchar(20),@n),5) ELSE CONVERT(varchar(20),@n) END AS number;
  END');
  IF @ownsTransaction=1 COMMIT;
END TRY
BEGIN CATCH
  IF @ownsTransaction=1 AND @@TRANCOUNT>0 ROLLBACK;
  THROW;
END CATCH;
