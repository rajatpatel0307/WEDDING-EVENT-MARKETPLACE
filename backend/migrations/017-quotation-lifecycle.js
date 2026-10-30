export async function up(q, transaction) {
  const run = (sql) => q.sequelize.query(sql, { transaction });
  await run(`IF COL_LENGTH('dbo.Quotations','RootQuotationId') IS NULL ALTER TABLE dbo.Quotations ADD RootQuotationId uniqueidentifier NULL REFERENCES dbo.Quotations(QuotationId),PreviousQuotationId uniqueidentifier NULL REFERENCES dbo.Quotations(QuotationId),RevisionNumber int NOT NULL DEFAULT 1,IsCurrent bit NOT NULL DEFAULT 1,RequestId uniqueidentifier NULL REFERENCES dbo.QuotationRequests(RequestId),Title nvarchar(200) NULL,EventSnapshotJson nvarchar(max) NULL,TermsJson nvarchar(max) NULL,AdvanceAmount decimal(18,2) NOT NULL DEFAULT 0,Currency char(3) NOT NULL DEFAULT 'INR',SentAt datetime2(3) NULL,AcceptedAt datetime2(3) NULL,AcceptedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId),RejectedAt datetime2(3) NULL,RejectedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId),CreationKey uniqueidentifier NULL,CreationHash varchar(64) NULL;
 IF COL_LENGTH('dbo.QuotationItems','ServiceItemId') IS NULL ALTER TABLE dbo.QuotationItems ADD ServiceItemId bigint NULL REFERENCES dbo.ServiceItems(ServiceItemId),Unit nvarchar(50) NULL,DiscountType varchar(20) NULL,DiscountValue decimal(18,2) NULL,TaxRate decimal(6,2) NULL,ItemKind varchar(20) NOT NULL DEFAULT 'Service',SnapshotJson nvarchar(max) NULL;
 IF COL_LENGTH('dbo.QuotationRequests','RequestNumber') IS NULL ALTER TABLE dbo.QuotationRequests ADD RequestNumber varchar(40) NULL,SnapshotJson nvarchar(max) NULL,DecisionReason nvarchar(1000) NULL;
 IF OBJECT_ID('dbo.QuotationHistory') IS NULL CREATE TABLE dbo.QuotationHistory(HistoryId bigint IDENTITY PRIMARY KEY,QuotationId uniqueidentifier NULL REFERENCES dbo.Quotations(QuotationId),RequestId uniqueidentifier NULL REFERENCES dbo.QuotationRequests(RequestId),Action varchar(60) NOT NULL,PreviousStatus varchar(30) NULL,NewStatus varchar(30) NULL,ActorId uniqueidentifier NULL REFERENCES dbo.Users(UserId),ActorRole varchar(20) NOT NULL,Message nvarchar(2000) NULL,MetadataJson nvarchar(max) NULL,Visibility varchar(20) NOT NULL DEFAULT 'Public' CHECK(Visibility IN('Public','Internal')),EventKey varchar(80) NULL,CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),CHECK(QuotationId IS NOT NULL OR RequestId IS NOT NULL));`);
  await run(`UPDATE dbo.Quotations SET RootQuotationId=QuotationId WHERE RootQuotationId IS NULL;
 UPDATE dbo.QuotationRequests SET RequestNumber='QR-'+REPLACE(CONVERT(varchar(36),RequestId),'-','') WHERE RequestNumber IS NULL;
 IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Quotation_CreationKey') CREATE UNIQUE INDEX UX_Quotation_CreationKey ON dbo.Quotations(CreationKey) WHERE CreationKey IS NOT NULL;
 IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Quotation_RootRevision') CREATE UNIQUE INDEX UX_Quotation_RootRevision ON dbo.Quotations(RootQuotationId,RevisionNumber) WHERE RootQuotationId IS NOT NULL;
 IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Quotation_Current') CREATE UNIQUE INDEX UX_Quotation_Current ON dbo.Quotations(RootQuotationId) WHERE IsCurrent=1 AND RootQuotationId IS NOT NULL;
 IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_QuotationRequest_Number') CREATE UNIQUE INDEX UX_QuotationRequest_Number ON dbo.QuotationRequests(RequestNumber) WHERE RequestNumber IS NOT NULL;
 IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_QuotationHistory_Key') CREATE UNIQUE INDEX UX_QuotationHistory_Key ON dbo.QuotationHistory(QuotationId,EventKey) WHERE QuotationId IS NOT NULL AND EventKey IS NOT NULL;
 IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Quotation_Expiry') CREATE INDEX IX_Quotation_Expiry ON dbo.Quotations(IsCurrent,Status,ValidUntil) INCLUDE(RootQuotationId,CustomerId,VendorId);
 IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_QuotationHistory_Quote') CREATE INDEX IX_QuotationHistory_Quote ON dbo.QuotationHistory(QuotationId,HistoryId);
 IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_QuotationHistory_Request') CREATE INDEX IX_QuotationHistory_Request ON dbo.QuotationHistory(RequestId,HistoryId);`);
  await q.sequelize.query(
    "UPDATE dbo.Quotations SET SentAt=CreatedAt WHERE SentAt IS NULL AND CreationHash IS NULL AND Status<>'Draft';",
    { transaction },
  );
  await hardenQuotationHistory(q, transaction);
}
export async function hardenQuotationHistory(q, transaction) {
  const run = (sql) => q.sequelize.query(sql, { transaction });
  await run(
    `CREATE OR ALTER TRIGGER dbo.TR_Quotation_Immutable ON dbo.Quotations AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.QuotationId=d.QuotationId WHERE i.QuotationId IS NULL AND d.Status<>'Draft') THROW 51001,'Sent quotations cannot be deleted.',1; IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.QuotationId=i.QuotationId WHERE d.Status<>'Draft' AND (i.Status='Draft' OR EXISTS(SELECT i.QuotationNumber,i.RootQuotationId,i.PreviousQuotationId,i.RevisionNumber,i.EventId,i.CustomerId,i.VendorId,i.RequestId,i.Title,i.ValidUntil,i.SubTotal,i.DiscountAmount,i.TaxAmount,i.AdvanceAmount,i.Currency,i.VendorMessage,i.EventSnapshotJson,i.TermsJson EXCEPT SELECT d.QuotationNumber,d.RootQuotationId,d.PreviousQuotationId,d.RevisionNumber,d.EventId,d.CustomerId,d.VendorId,d.RequestId,d.Title,d.ValidUntil,d.SubTotal,d.DiscountAmount,d.TaxAmount,d.AdvanceAmount,d.Currency,d.VendorMessage,d.EventSnapshotJson,d.TermsJson))) THROW 51001,'Sent quotation content is immutable; create a revision.',1; END;`,
  );
  await run(
    `CREATE OR ALTER TRIGGER dbo.TR_QuotationItems_Immutable ON dbo.QuotationItems AFTER INSERT,UPDATE,DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM (SELECT QuotationId FROM inserted UNION SELECT QuotationId FROM deleted) x JOIN dbo.Quotations q ON q.QuotationId=x.QuotationId WHERE q.Status<>'Draft') THROW 51001,'Sent quotation items are immutable; create a revision.',1; END;`,
  );
  await run(
    `CREATE OR ALTER TRIGGER dbo.TR_QuotationHistory_AppendOnly ON dbo.QuotationHistory AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; THROW 51001,'Quotation history is append-only.',1; END;`,
  );
}
