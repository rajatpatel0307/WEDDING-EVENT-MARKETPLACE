export async function up(q, transaction) {
  await q.sequelize.query(
    `IF OBJECT_ID('dbo.ContactMessages') IS NULL
    BEGIN
      CREATE TABLE dbo.ContactMessages (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        FirstName NVARCHAR(100) NOT NULL, LastName NVARCHAR(100) NOT NULL,
        Email NVARCHAR(320) NOT NULL, Phone NVARCHAR(20) NULL,
        Subject NVARCHAR(200) NOT NULL, Category VARCHAR(30) NOT NULL,
        Message NVARCHAR(MAX) NOT NULL, Status VARCHAR(30) NOT NULL DEFAULT 'New',
        ConsentedAt DATETIME2(3) NOT NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_ContactMessages_Category CHECK (Category IN ('GENERAL','BOOKING','VENDOR','PAYMENT','CANCELLATION','TECHNICAL','PARTNERSHIP','OTHER')),
        CONSTRAINT CK_ContactMessages_Length CHECK (LEN(Message) BETWEEN 20 AND 5000)
      );
      CREATE INDEX IX_ContactMessages_Status_CreatedAt ON dbo.ContactMessages(Status, CreatedAt DESC);
    END`,
    { transaction },
  );
}
