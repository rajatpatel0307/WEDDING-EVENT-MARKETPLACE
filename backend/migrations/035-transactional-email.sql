-- Review before applying. Adds only an email outbox; existing tables are unchanged.
IF OBJECT_ID('dbo.TransactionalEmailOutbox', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TransactionalEmailOutbox (
    EmailId uniqueidentifier NOT NULL CONSTRAINT DF_Email_Id DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    EventKey varchar(200) NOT NULL CONSTRAINT UQ_Email_Event UNIQUE,
    EventType varchar(40) NOT NULL,
    EntityId uniqueidentifier NOT NULL,
    RecipientUserId uniqueidentifier NOT NULL,
    RecipientEmail nvarchar(320) NOT NULL,
    Subject nvarchar(250) NOT NULL,
    TextBody nvarchar(max) NOT NULL,
    HtmlBody nvarchar(max) NOT NULL,
    ReplyTo nvarchar(320) NULL,
    DeliveryStatus varchar(20) NOT NULL CONSTRAINT DF_Email_Status DEFAULT 'Pending'
      CONSTRAINT CK_Email_Status CHECK (DeliveryStatus IN ('Pending','Sending','Sent','Failed','Unknown')),
    AttemptCount int NOT NULL CONSTRAINT DF_Email_Attempts DEFAULT 0,
    NextAttemptAt datetime2 NOT NULL CONSTRAINT DF_Email_Next DEFAULT SYSUTCDATETIME(),
    LeaseUntil datetime2 NULL,
    SentAt datetime2 NULL,
    ErrorCode varchar(60) NULL,
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_Email_Created DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2 NOT NULL CONSTRAINT DF_Email_Updated DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_Email_Pending ON dbo.TransactionalEmailOutbox(DeliveryStatus,NextAttemptAt,CreatedAt);
END;
