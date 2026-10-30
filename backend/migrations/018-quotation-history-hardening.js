import { hardenQuotationHistory } from "./017-quotation-lifecycle.js";
// Existing installations may already have 017 recorded. Reinstall the strengthened
// triggers through a tracked migration instead of silently editing deployed DDL.
export async function up(q, transaction) {
  await q.sequelize.query(
    "IF COL_LENGTH('dbo.Quotations','CreationKey') IS NULL ALTER TABLE dbo.Quotations ADD CreationKey uniqueidentifier NULL; IF COL_LENGTH('dbo.Quotations','CreationHash') IS NULL ALTER TABLE dbo.Quotations ADD CreationHash varchar(64) NULL;",
    { transaction },
  );
  await q.sequelize.query(
    "IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Quotations') AND name='UX_Quotation_CreationKey') CREATE UNIQUE INDEX UX_Quotation_CreationKey ON dbo.Quotations(CreationKey) WHERE CreationKey IS NOT NULL;",
    { transaction },
  );
  await q.sequelize.query(
    "UPDATE dbo.Quotations SET SentAt=CreatedAt WHERE SentAt IS NULL AND CreationHash IS NULL AND Status<>'Draft';",
    { transaction },
  );
  await hardenQuotationHistory(q, transaction);
}
