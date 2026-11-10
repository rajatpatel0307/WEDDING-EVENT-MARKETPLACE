-- Reviewed against live INFORMATION_SCHEMA and sys.foreign_keys on 2026-11-04.
-- Additive only. Run manually after review; deliberately not in the migration runner.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.Categories','AllowAddToCart') IS NULL
 ALTER TABLE dbo.Categories ADD AllowAddToCart bit NOT NULL CONSTRAINT DF_Categories_Cart DEFAULT 0;
IF COL_LENGTH('dbo.Categories','AllowBuyOnline') IS NULL
 ALTER TABLE dbo.Categories ADD AllowBuyOnline bit NOT NULL CONSTRAINT DF_Categories_Online DEFAULT 0;
IF COL_LENGTH('dbo.Addresses','AlternatePhone') IS NULL
 ALTER TABLE dbo.Addresses ADD AlternatePhone nvarchar(30) NULL;
IF OBJECT_ID('dbo.Products','U') IS NULL
CREATE TABLE dbo.Products (
 ProductId uniqueidentifier NOT NULL CONSTRAINT PK_Products PRIMARY KEY DEFAULT NEWID(),
 CategoryId int NOT NULL REFERENCES dbo.Categories(CategoryId),
 VendorId uniqueidentifier NOT NULL REFERENCES dbo.Vendors(VendorId),
 ProductName nvarchar(200) NOT NULL, SKU nvarchar(100) NOT NULL UNIQUE,
 Description nvarchar(max) NULL, ImageUrl nvarchar(2000) NULL,
 UnitPrice decimal(18,2) NOT NULL CHECK(UnitPrice>0 AND UnitPrice<=10000000),
 Stock int NOT NULL DEFAULT 0 CHECK(Stock>=0),
 TaxRate decimal(5,2) NOT NULL DEFAULT 0 CHECK(TaxRate>=0 AND TaxRate<=100),
 ShippingAmount decimal(18,2) NOT NULL DEFAULT 0 CHECK(ShippingAmount>=0 AND ShippingAmount<=1000000),
 IsActive bit NOT NULL DEFAULT 0, IsPublished bit NOT NULL DEFAULT 0,
 CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(), UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
IF OBJECT_ID('dbo.Cart','U') IS NULL
CREATE TABLE dbo.Cart (
 CartId uniqueidentifier NOT NULL CONSTRAINT PK_Cart PRIMARY KEY DEFAULT NEWID(),
 CustomerId uniqueidentifier NOT NULL UNIQUE REFERENCES dbo.Users(UserId),
 CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(), UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
IF OBJECT_ID('dbo.CartAndProducts','U') IS NULL
CREATE TABLE dbo.CartAndProducts (
 ItemId uniqueidentifier NOT NULL CONSTRAINT PK_CartAndProducts PRIMARY KEY DEFAULT NEWID(),
 CartId uniqueidentifier NOT NULL REFERENCES dbo.Cart(CartId),
 ProductId uniqueidentifier NOT NULL REFERENCES dbo.Products(ProductId),
 Quantity int NOT NULL CHECK(Quantity BETWEEN 1 AND 999),
 CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(), UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_Cart_Product UNIQUE(CartId,ProductId)
);
IF OBJECT_ID('dbo.Orders','U') IS NULL
CREATE TABLE dbo.Orders (
 OrderId uniqueidentifier NOT NULL CONSTRAINT PK_ProductOrders PRIMARY KEY DEFAULT NEWID(),
 OrderNumber varchar(50) NOT NULL UNIQUE, CustomerId uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),
 CheckoutKey uniqueidentifier NOT NULL, RequestHash varchar(64) NOT NULL,
 AddressSnapshot nvarchar(max) NOT NULL CHECK(ISJSON(AddressSnapshot)=1),
 Subtotal decimal(18,2) NOT NULL, ShippingAmount decimal(18,2) NOT NULL, TaxAmount decimal(18,2) NOT NULL,
 DiscountAmount decimal(18,2) NOT NULL DEFAULT 0, TotalAmount decimal(18,2) NOT NULL CHECK(TotalAmount>0),
 PaymentStatus varchar(20) NOT NULL DEFAULT 'Pending' CHECK(PaymentStatus IN('Pending','Failed','Paid')),
 OrderStatus varchar(20) NOT NULL DEFAULT 'AwaitingPayment' CHECK(OrderStatus IN('AwaitingPayment','Confirmed','Processing','Shipped','Delivered')),
 CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(), UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_ProductCheckout UNIQUE(CustomerId,CheckoutKey),
 CONSTRAINT CK_ProductOrderTotals CHECK(Subtotal>=0 AND ShippingAmount>=0 AND TaxAmount>=0 AND DiscountAmount>=0 AND TotalAmount=Subtotal+ShippingAmount+TaxAmount-DiscountAmount)
);
IF OBJECT_ID('dbo.OrderLineItems','U') IS NULL
CREATE TABLE dbo.OrderLineItems (
 ItemId uniqueidentifier NOT NULL CONSTRAINT PK_ProductOrderItems PRIMARY KEY DEFAULT NEWID(),
 OrderId uniqueidentifier NOT NULL REFERENCES dbo.Orders(OrderId),
 ProductId uniqueidentifier NOT NULL REFERENCES dbo.Products(ProductId),
 VendorId uniqueidentifier NOT NULL REFERENCES dbo.Vendors(VendorId),
 ProductNameSnapshot nvarchar(200) NOT NULL, SKUSnapshot nvarchar(100) NOT NULL, ImageSnapshot nvarchar(2000) NULL,
 UnitPrice decimal(18,2) NOT NULL, Quantity int NOT NULL CHECK(Quantity BETWEEN 1 AND 999),
 TaxAmount decimal(18,2) NOT NULL, ShippingAmount decimal(18,2) NOT NULL, LineTotal decimal(18,2) NOT NULL,
 FulfillmentStatus varchar(20) NOT NULL DEFAULT 'Pending' CHECK(FulfillmentStatus IN('Pending','Processing','Shipped','Delivered')),
 CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT CK_ProductLineTotals CHECK(UnitPrice>0 AND TaxAmount>=0 AND ShippingAmount>=0 AND LineTotal=UnitPrice*Quantity+TaxAmount+ShippingAmount)
);
-- Existing Payments requires BookingId; keep that booking ledger untouched.
IF OBJECT_ID('dbo.ProductPaymentOrders','U') IS NULL
CREATE TABLE dbo.ProductPaymentOrders (
 OrderId uniqueidentifier NOT NULL CONSTRAINT PK_ProductPaymentOrders PRIMARY KEY REFERENCES dbo.Orders(OrderId),
 GatewayOrderId varchar(100) NOT NULL UNIQUE, AmountMinor bigint NOT NULL CHECK(AmountMinor>0),
 Currency char(3) NOT NULL DEFAULT 'INR', GatewayPaymentId varchar(100) NULL,
 Status varchar(20) NOT NULL DEFAULT 'Created' CHECK(Status IN('Created','Failed','Paid')),
 LastCheckedAt datetime2(3) NULL,
 UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
IF COL_LENGTH('dbo.ProductPaymentOrders','LastCheckedAt') IS NULL
 ALTER TABLE dbo.ProductPaymentOrders ADD LastCheckedAt datetime2(3) NULL;
IF OBJECT_ID('dbo.ProductOrderHistory','U') IS NULL
CREATE TABLE dbo.ProductOrderHistory (
 HistoryId uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(), OrderId uniqueidentifier NOT NULL REFERENCES dbo.Orders(OrderId),
 ActorId uniqueidentifier NULL REFERENCES dbo.Users(UserId), Status varchar(30) NOT NULL,
 Note nvarchar(500) NOT NULL, CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Products') AND name='IX_Products_Category')
 CREATE INDEX IX_Products_Category ON dbo.Products(CategoryId,IsActive,IsPublished);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Products') AND name='IX_Products_Vendor')
 CREATE INDEX IX_Products_Vendor ON dbo.Products(VendorId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Orders') AND name='IX_ProductOrders_Customer')
 CREATE INDEX IX_ProductOrders_Customer ON dbo.Orders(CustomerId,CreatedAt DESC);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.OrderLineItems') AND name='IX_ProductOrderItems_Vendor')
 CREATE INDEX IX_ProductOrderItems_Vendor ON dbo.OrderLineItems(VendorId,OrderId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.OrderLineItems') AND name='IX_ProductOrderItems_Order')
 CREATE INDEX IX_ProductOrderItems_Order ON dbo.OrderLineItems(OrderId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ProductPaymentOrders') AND name='UX_ProductCapturedPayment')
 CREATE UNIQUE INDEX UX_ProductCapturedPayment ON dbo.ProductPaymentOrders(GatewayPaymentId) WHERE GatewayPaymentId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ProductOrderHistory') AND name='IX_ProductOrderHistory_Order')
 CREATE INDEX IX_ProductOrderHistory_Order ON dbo.ProductOrderHistory(OrderId,CreatedAt);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ProductPaymentOrders') AND name='IX_ProductPaymentOrders_Reconcile')
 CREATE INDEX IX_ProductPaymentOrders_Reconcile ON dbo.ProductPaymentOrders(Status,LastCheckedAt);
COMMIT;
-- Rollback: disable purchase flags through Admin, stop new checkout traffic, and
-- revert application changes. Retain these tables/columns and order snapshots.
-- No data-destructive down migration is supplied. A failed transaction rolls back.
