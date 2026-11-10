IF COL_LENGTH('dbo.Conversations','ServiceId') IS NULL ALTER TABLE dbo.Conversations ADD ServiceId uniqueidentifier NULL REFERENCES dbo.Services(ServiceId);
IF COL_LENGTH('dbo.Conversations','PackageId') IS NULL ALTER TABLE dbo.Conversations ADD PackageId uniqueidentifier NULL REFERENCES dbo.ServicePackages(PackageId);
IF COL_LENGTH('dbo.Conversations','QuotationId') IS NULL ALTER TABLE dbo.Conversations ADD QuotationId uniqueidentifier NULL REFERENCES dbo.Quotations(QuotationId);
IF COL_LENGTH('dbo.Conversations','RequestId') IS NULL ALTER TABLE dbo.Conversations ADD RequestId uniqueidentifier NULL REFERENCES dbo.QuotationRequests(RequestId);
IF COL_LENGTH('dbo.Messages','ClientMessageId') IS NULL ALTER TABLE dbo.Messages ADD ClientMessageId uniqueidentifier NULL, DeliveredAt datetime2(3) NULL, ReadAt datetime2(3) NULL, DeletedAt datetime2(3) NULL, AttachmentSize int NULL;
IF COL_LENGTH('dbo.Notifications','EventKey') IS NULL ALTER TABLE dbo.Notifications ADD EventKey varchar(64) NULL, Category varchar(20) NOT NULL CONSTRAINT DF_Notification_Category DEFAULT 'general', DismissedAt datetime2(3) NULL;
IF OBJECT_ID('dbo.ConversationParticipants') IS NULL
CREATE TABLE dbo.ConversationParticipants (
 ConversationId uniqueidentifier NOT NULL REFERENCES dbo.Conversations(ConversationId),
 UserId uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),
 IsArchived bit NOT NULL DEFAULT 0, IsMuted bit NOT NULL DEFAULT 0,
 LastReadAt datetime2(3) NULL,
 CONSTRAINT PK_ConversationParticipants PRIMARY KEY(ConversationId,UserId)
);
IF OBJECT_ID('dbo.NotificationPreferences') IS NULL
CREATE TABLE dbo.NotificationPreferences (
 UserId uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.Users(UserId),
 ChatEnabled bit NOT NULL DEFAULT 1, BookingEnabled bit NOT NULL DEFAULT 1,
 QuotationEnabled bit NOT NULL DEFAULT 1, UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Message_ClientKey' AND object_id=OBJECT_ID('dbo.Messages'))
 EXEC('CREATE UNIQUE INDEX UX_Message_ClientKey ON dbo.Messages(SenderUserId,ClientMessageId) WHERE ClientMessageId IS NOT NULL');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Notification_Event' AND object_id=OBJECT_ID('dbo.Notifications'))
 EXEC('CREATE UNIQUE INDEX UX_Notification_Event ON dbo.Notifications(UserId,EventKey) WHERE EventKey IS NOT NULL');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Message_Cursor' AND object_id=OBJECT_ID('dbo.Messages'))
 CREATE INDEX IX_Message_Cursor ON dbo.Messages(ConversationId,CreatedAt DESC,MessageId DESC) INCLUDE(SenderUserId,IsRead);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Notification_Inbox' AND object_id=OBJECT_ID('dbo.Notifications'))
 EXEC('CREATE INDEX IX_Notification_Inbox ON dbo.Notifications(UserId,DismissedAt,IsRead,CreatedAt DESC) INCLUDE(Category)');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Conversation_Owners' AND object_id=OBJECT_ID('dbo.Conversations'))
 CREATE INDEX IX_Conversation_Owners ON dbo.Conversations(CustomerId,VendorId,LastMessageAt DESC);
