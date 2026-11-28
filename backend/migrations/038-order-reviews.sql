IF COL_LENGTH('dbo.Reviews','OrderId') IS NULL
  ALTER TABLE dbo.Reviews ADD OrderId uniqueidentifier NULL, OrderItemId uniqueidentifier NULL;
GO
IF EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Reviews') AND name='UX_Reviews_Target')
  DROP INDEX UX_Reviews_Target ON dbo.Reviews;
IF EXISTS(SELECT 1 FROM sys.key_constraints WHERE parent_object_id=OBJECT_ID('dbo.Reviews') AND name='UQ_Reviews_Booking')
  ALTER TABLE dbo.Reviews DROP CONSTRAINT UQ_Reviews_Booking;
ALTER TABLE dbo.Reviews ALTER COLUMN BookingId uniqueidentifier NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_Reviews_Order')
  ALTER TABLE dbo.Reviews ADD CONSTRAINT FK_Reviews_Order FOREIGN KEY(OrderId) REFERENCES dbo.Orders(OrderId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_Reviews_OrderItem')
  ALTER TABLE dbo.Reviews ADD CONSTRAINT FK_Reviews_OrderItem FOREIGN KEY(OrderItemId) REFERENCES dbo.OrderLineItems(ItemId);
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Reviews_Source')
  ALTER TABLE dbo.Reviews ADD CONSTRAINT CK_Reviews_Source CHECK(
    (BookingId IS NOT NULL AND OrderId IS NULL AND OrderItemId IS NULL) OR
    (BookingId IS NULL AND BookingItemId IS NULL AND OrderId IS NOT NULL AND OrderItemId IS NOT NULL)
  );
CREATE UNIQUE INDEX UX_Reviews_Target ON dbo.Reviews(BookingId,VendorId,BookingItemId) WHERE BookingId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Reviews') AND name='UX_Reviews_OrderTarget')
  CREATE UNIQUE INDEX UX_Reviews_OrderTarget ON dbo.Reviews(OrderId,OrderItemId) WHERE OrderId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Reviews') AND name='IX_Reviews_Order')
  CREATE INDEX IX_Reviews_Order ON dbo.Reviews(OrderId,CustomerId) INCLUDE(OrderItemId,Rating,ModerationStatus,DeletedAt);
