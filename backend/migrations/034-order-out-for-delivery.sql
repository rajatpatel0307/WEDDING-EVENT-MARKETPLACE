-- Separate Shipped and OutForDelivery without changing existing orders or history.
SET XACT_ABORT ON;
DECLARE @ownsTransaction bit=CASE WHEN @@TRANCOUNT=0 THEN 1 ELSE 0 END;
IF @ownsTransaction=1 BEGIN TRANSACTION;
BEGIN TRY
  DECLARE @lock int;
  EXEC @lock=sys.sp_getapplock @Resource='MarryNestOrderMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=30000;
  IF @lock<0 THROW 51000,'Order migration is busy.',1;
  IF OBJECT_ID('dbo.CK_Orders_Fulfillment','C') IS NOT NULL
    ALTER TABLE dbo.Orders DROP CONSTRAINT CK_Orders_Fulfillment;
  IF OBJECT_ID('dbo.CK_OrderLineItems_Fulfillment','C') IS NOT NULL
    ALTER TABLE dbo.OrderLineItems DROP CONSTRAINT CK_OrderLineItems_Fulfillment;
  ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT CK_Orders_Fulfillment
    CHECK(OrderStatus IN('Pending','Processing','Shipped','OutForDelivery','Delivered','Cancelled'));
  ALTER TABLE dbo.OrderLineItems WITH CHECK ADD CONSTRAINT CK_OrderLineItems_Fulfillment
    CHECK(FulfillmentStatus IN('Pending','Processing','Shipped','OutForDelivery','Delivered','Cancelled'));
  IF @ownsTransaction=1 COMMIT;
END TRY
BEGIN CATCH
  IF @ownsTransaction=1 AND @@TRANCOUNT>0 ROLLBACK;
  THROW;
END CATCH;
