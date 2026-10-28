export async function up(queryInterface, transaction) {
  await queryInterface.sequelize.query(
    `
    IF COL_LENGTH('dbo.Conversations','EventId') IS NULL ALTER TABLE dbo.Conversations ADD EventId uniqueidentifier NULL REFERENCES dbo.Events(EventId);
    IF COL_LENGTH('dbo.Booking','QuotationId') IS NULL ALTER TABLE dbo.Booking ADD QuotationId uniqueidentifier NULL REFERENCES dbo.Quotations(QuotationId);

    IF OBJECT_ID('dbo.QuotationRequests') IS NULL CREATE TABLE dbo.QuotationRequests(
      RequestId uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
      CustomerId uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),
      VendorId uniqueidentifier NOT NULL REFERENCES dbo.Vendors(VendorId),
      EventId uniqueidentifier NOT NULL REFERENCES dbo.Events(EventId),
      ServiceId uniqueidentifier NOT NULL REFERENCES dbo.Services(ServiceId),
      PackageId uniqueidentifier NULL REFERENCES dbo.ServicePackages(PackageId),
      OriginalQuotationId uniqueidentifier NULL REFERENCES dbo.Quotations(QuotationId),
      Message nvarchar(2000) NOT NULL,
      Status varchar(20) NOT NULL DEFAULT 'Pending' CHECK(Status IN('Pending','Responded','Closed')),
      CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
    IF OBJECT_ID('dbo.CustomerPaymentOrders') IS NULL CREATE TABLE dbo.CustomerPaymentOrders(
      OrderId uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
      BookingId uniqueidentifier NOT NULL REFERENCES dbo.Booking(BookingId),
      CustomerId uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),
      GatewayOrderId varchar(100) NOT NULL UNIQUE,
      AmountMinor bigint NOT NULL CHECK(AmountMinor>0),
      Currency char(3) NOT NULL DEFAULT 'INR',
      Status varchar(20) NOT NULL DEFAULT 'Created',
      CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_QuotationRequests_Vendor') CREATE INDEX IX_QuotationRequests_Vendor ON dbo.QuotationRequests(VendorId,Status,CreatedAt);
  `,
    { transaction },
  );
  await queryInterface.sequelize.query(
    "IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Booking_Quotation') CREATE UNIQUE INDEX UX_Booking_Quotation ON dbo.Booking(QuotationId) WHERE QuotationId IS NOT NULL;",
    { transaction },
  );
}
