export async function up(q, transaction) {
  await q.sequelize.query(
    `IF OBJECT_ID('dbo.NewsletterSubscriptions') IS NULL
    CREATE TABLE dbo.NewsletterSubscriptions (
      Email NVARCHAR(320) NOT NULL PRIMARY KEY,
      CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    )`,
    { transaction },
  );
}
