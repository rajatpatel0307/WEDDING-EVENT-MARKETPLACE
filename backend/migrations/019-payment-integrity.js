export async function up(q, transaction) {
  const run = (sql) => q.sequelize.query(sql, { transaction });
  await run(`
    IF COL_LENGTH('dbo.CustomerPaymentOrders','CheckoutKey') IS NULL
      ALTER TABLE dbo.CustomerPaymentOrders ADD CheckoutKey uniqueidentifier NULL,PaymentMode varchar(10) NOT NULL DEFAULT 'balance',UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),LastCheckedAt datetime2(3) NULL;
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Payment_CheckoutKey' AND object_id=OBJECT_ID('dbo.CustomerPaymentOrders'))
      EXEC('CREATE UNIQUE INDEX UX_Payment_CheckoutKey ON dbo.CustomerPaymentOrders(CheckoutKey) WHERE CheckoutKey IS NOT NULL');
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Payment_Provider' AND object_id=OBJECT_ID('dbo.Payments'))
      CREATE UNIQUE INDEX UX_Payment_Provider ON dbo.Payments(GatewayName,GatewayTransactionId) WHERE GatewayTransactionId IS NOT NULL;
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Refund_Provider' AND object_id=OBJECT_ID('dbo.Refunds'))
      CREATE UNIQUE INDEX UX_Refund_Provider ON dbo.Refunds(GatewayRefundId) WHERE GatewayRefundId IS NOT NULL;
    IF OBJECT_ID('dbo.PaymentWebhookEvents') IS NULL BEGIN
      CREATE TABLE dbo.PaymentWebhookEvents(
        EventId varchar(150) NOT NULL PRIMARY KEY,EventType varchar(60) NOT NULL,PayloadHash char(64) NOT NULL,
        PayloadJson nvarchar(max) NOT NULL CHECK(ISJSON(PayloadJson)=1),
        Status varchar(20) NOT NULL DEFAULT 'Pending' CHECK(Status IN('Pending','Processed','Review')),
        Attempts int NOT NULL DEFAULT 0,LeaseUntil datetime2(3) NULL,NextAttemptAt datetime2(3) NULL,
        LastError nvarchar(500) NULL,CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),ProcessedAt datetime2(3) NULL);
      CREATE INDEX IX_Webhook_Queue ON dbo.PaymentWebhookEvents(Status,NextAttemptAt,CreatedAt);
    END;
    IF OBJECT_ID('dbo.CustomerRefundRequests') IS NULL BEGIN
      CREATE TABLE dbo.CustomerRefundRequests(
        RequestId uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        BookingId uniqueidentifier NOT NULL REFERENCES dbo.Booking(BookingId),
        CustomerId uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),
        Amount decimal(18,2) NOT NULL CHECK(Amount>0),Reason nvarchar(1000) NOT NULL,
        Status varchar(20) NOT NULL DEFAULT 'Requested' CHECK(Status IN('Requested','Approved','Rejected')),
        IdempotencyKey uniqueidentifier NOT NULL UNIQUE,RequestHash char(64) NOT NULL,
        OperationId uniqueidentifier NULL REFERENCES dbo.AdminBookingOperations(OperationId),
        DecisionReason nvarchar(1000) NULL,DecidedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId),
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),DecidedAt datetime2(3) NULL);
      CREATE UNIQUE INDEX UX_RefundRequest_Open ON dbo.CustomerRefundRequests(BookingId) WHERE Status='Requested';
      CREATE INDEX IX_RefundRequest_Customer ON dbo.CustomerRefundRequests(CustomerId,CreatedAt);
    END;
    IF OBJECT_ID('dbo.FinancialLedger') IS NULL BEGIN
      CREATE TABLE dbo.FinancialLedger(
        EntryId bigint NOT NULL IDENTITY PRIMARY KEY,EventKey varchar(150) NOT NULL UNIQUE,
        BookingId uniqueidentifier NOT NULL REFERENCES dbo.Booking(BookingId),
        VendorId uniqueidentifier NOT NULL REFERENCES dbo.Vendors(VendorId),
        Kind varchar(40) NOT NULL,Amount decimal(18,2) NOT NULL,Currency char(3) NOT NULL CHECK(Currency='INR'),
        Reference varchar(200) NOT NULL,CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME());
      CREATE INDEX IX_FinancialLedger_Booking ON dbo.FinancialLedger(BookingId,CreatedAt);
    END;
  `);
  await run(
    `CREATE OR ALTER TRIGGER dbo.TR_FinancialLedger_Immutable ON dbo.FinancialLedger INSTEAD OF UPDATE,DELETE AS BEGIN SET NOCOUNT ON; THROW 51000,'Financial ledger entries are append-only.',1; END`,
  );
  await run(
    `CREATE OR ALTER TRIGGER dbo.TR_PaymentTransactions_Immutable ON dbo.PaymentTransactions INSTEAD OF UPDATE,DELETE AS BEGIN SET NOCOUNT ON; THROW 51000,'Financial transaction history is append-only.',1; END`,
  );
  // Refuse ambiguous legacy provider references rather than deleting or merging money records.
  // Unique index creation above deliberately fails and rolls back if duplicates exist.
}
