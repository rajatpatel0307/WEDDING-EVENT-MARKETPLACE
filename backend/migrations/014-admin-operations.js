export async function up(q, transaction) {
  await q.sequelize.query(
    `
    IF COL_LENGTH('dbo.VendorPayouts','ReviewStatus') IS NULL
    ALTER TABLE dbo.VendorPayouts ADD ReviewStatus varchar(20) NOT NULL CONSTRAINT DF_PayoutReview DEFAULT 'Pending',
      ReviewReason nvarchar(2000) NULL,ReviewedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId),
      ReviewedAt datetime2(3) NULL,ReviewLedgerHash varchar(64) NULL,
      SettlementReference varchar(150) NULL,SettlementKey uniqueidentifier NULL,
      UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_PayoutUpdated DEFAULT SYSUTCDATETIME();
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Payout_SettlementKey')
      EXEC('CREATE UNIQUE INDEX UX_Payout_SettlementKey ON dbo.VendorPayouts(SettlementKey) WHERE SettlementKey IS NOT NULL');
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Payout_SettlementReference')
      EXEC('CREATE UNIQUE INDEX UX_Payout_SettlementReference ON dbo.VendorPayouts(SettlementReference) WHERE SettlementReference IS NOT NULL');
  `,
    { transaction },
  );
}
