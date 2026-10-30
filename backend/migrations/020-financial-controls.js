export async function up(q, transaction) {
  const run = (sql) => q.sequelize.query(sql, { transaction });
  await run(`
    IF OBJECT_ID('dbo.CommissionRules') IS NULL BEGIN
      CREATE TABLE dbo.CommissionRules(
        RuleId uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),Name nvarchar(150) NOT NULL,
        VendorId uniqueidentifier NULL REFERENCES dbo.Vendors(VendorId),CategoryId int NULL REFERENCES dbo.Categories(CategoryId),
        Type varchar(20) NOT NULL CHECK(Type IN('Percentage','Fixed','Combined')),
        Rate decimal(8,4) NOT NULL CHECK(Rate BETWEEN 0 AND 100),FixedAmount decimal(18,2) NOT NULL CHECK(FixedAmount>=0),
        Base varchar(20) NOT NULL CHECK(Base IN('BookingTotal','NetSubtotal')),
        Priority int NOT NULL DEFAULT 0,EffectiveFrom datetime2(3) NOT NULL,EffectiveTo datetime2(3) NULL,
        IsActive bit NOT NULL DEFAULT 1,CreatedBy uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),CHECK(EffectiveTo IS NULL OR EffectiveTo>EffectiveFrom));
      CREATE INDEX IX_CommissionRules_Active ON dbo.CommissionRules(IsActive,EffectiveFrom,EffectiveTo);
    END;
    IF COL_LENGTH('dbo.VendorPayouts','DestinationLabel') IS NULL
      ALTER TABLE dbo.VendorPayouts ADD DestinationLabel nvarchar(150) NULL,SettlementStartedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId);
  `);
  await run(
    `CREATE OR ALTER TRIGGER dbo.TR_Commission_Immutable ON dbo.PlatformCommission INSTEAD OF UPDATE,DELETE AS BEGIN SET NOCOUNT ON; THROW 51000,'Commission history is append-only. Record an explicit adjustment.',1; END`,
  );
  await run(
    `CREATE OR ALTER TRIGGER dbo.TR_PaidPayout_Immutable ON dbo.VendorPayouts AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM deleted WHERE PayoutStatus='Paid') THROW 51000,'Completed payouts cannot be altered or deleted.',1; END`,
  );
  await run(
    `CREATE OR ALTER TRIGGER dbo.TR_CompletedRefund_Immutable ON dbo.Refunds AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM deleted WHERE RefundStatus='Completed') THROW 51000,'Completed refunds cannot be altered or deleted.',1; END`,
  );
  await run(`CREATE OR ALTER TRIGGER dbo.TR_CapturedPayment_Immutable ON dbo.Payments AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.PaymentId=d.PaymentId WHERE d.PaymentStatus IN('Success','Refunded') AND
      (i.PaymentId IS NULL OR i.BookingId<>d.BookingId OR i.PaymentReference<>d.PaymentReference OR i.Amount<>d.Amount OR i.Currency<>d.Currency OR
       ISNULL(i.GatewayName,'')<>ISNULL(d.GatewayName,'') OR ISNULL(i.GatewayTransactionId,'')<>ISNULL(d.GatewayTransactionId,'') OR
       i.PaymentStatus NOT IN('Success','Refunded') OR (d.PaymentStatus='Refunded' AND i.PaymentStatus<>'Refunded')))
      THROW 51000,'Captured payment identity and amounts are immutable.',1; END`);
}
