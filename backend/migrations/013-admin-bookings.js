export async function up(q, transaction) {
  await q.sequelize.query(
    `
    IF COL_LENGTH('dbo.Booking','PolicySnapshotJson') IS NULL ALTER TABLE dbo.Booking ADD PolicySnapshotJson nvarchar(max) NULL,CancelledAt datetime2(3) NULL,CancelledBy uniqueidentifier NULL,CancellationReason nvarchar(1000) NULL,AdminNotes nvarchar(2000) NULL;
    IF COL_LENGTH('dbo.BookingStatusHistory','ActorRole') IS NULL ALTER TABLE dbo.BookingStatusHistory ADD ActorRole varchar(30) NULL,Reason nvarchar(1000) NULL,Notes nvarchar(2000) NULL;
    IF COL_LENGTH('dbo.AuditLogs','UserAgent') IS NULL ALTER TABLE dbo.AuditLogs ADD UserAgent nvarchar(1000) NULL;
    IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Booking_PaymentStatus') ALTER TABLE dbo.Booking DROP CONSTRAINT CK_Booking_PaymentStatus;
    ALTER TABLE dbo.Booking WITH CHECK ADD CONSTRAINT CK_Booking_PaymentStatus CHECK(PaymentStatus IN('Pending','PartiallyPaid','Paid','Failed','RefundPending','Refunded','PartiallyRefunded'));
    IF OBJECT_ID('dbo.AdminBookingOperations') IS NULL CREATE TABLE dbo.AdminBookingOperations(
      OperationId uniqueidentifier NOT NULL PRIMARY KEY,BookingId uniqueidentifier NOT NULL REFERENCES dbo.Booking(BookingId),
      IdempotencyKey uniqueidentifier NOT NULL UNIQUE,RequestedBy uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),
      RequestHash varchar(64) NOT NULL,CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME());
    IF COL_LENGTH('dbo.Refunds','AdminOperationId') IS NULL ALTER TABLE dbo.Refunds ADD AdminOperationId uniqueidentifier NULL REFERENCES dbo.AdminBookingOperations(OperationId),RequestedBy uniqueidentifier NULL,Attempts int NOT NULL DEFAULT 0,LeaseUntil datetime2(3) NULL,NextAttemptAt datetime2(3) NULL,LastError nvarchar(500) NULL;
    IF COL_LENGTH('dbo.VendorPayouts','RefundDeduction') IS NULL BEGIN
      ALTER TABLE dbo.VendorPayouts ADD RefundDeduction decimal(18,2) NOT NULL DEFAULT 0,ApplicableFees decimal(18,2) NOT NULL DEFAULT 0;
      ALTER TABLE dbo.VendorPayouts DROP COLUMN NetAmount;
      EXEC('ALTER TABLE dbo.VendorPayouts ADD NetAmount AS (CASE WHEN GrossAmount-PlatformCommission-TaxDeduction-RefundDeduction-ApplicableFees<0 THEN 0 ELSE GrossAmount-PlatformCommission-TaxDeduction-RefundDeduction-ApplicableFees END) PERSISTED');
    END;
    IF OBJECT_ID('dbo.BookingNotificationKeys') IS NULL CREATE TABLE dbo.BookingNotificationKeys(BookingId uniqueidentifier NOT NULL REFERENCES dbo.Booking(BookingId),Milestone varchar(80) NOT NULL,CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),PRIMARY KEY(BookingId,Milestone));
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Booking_Admin' AND object_id=OBJECT_ID('dbo.Booking')) CREATE INDEX IX_Booking_Admin ON dbo.Booking(CreatedAt,BookingId) INCLUDE(CustomerId,VendorId,EventId,BookingStatus,PaymentStatus,BookingDate);
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Refunds_BookingStatus' AND object_id=OBJECT_ID('dbo.Refunds')) CREATE INDEX IX_Refunds_BookingStatus ON dbo.Refunds(BookingId,RefundStatus) INCLUDE(PaymentId,RefundAmount,AdminOperationId);
  `,
    { transaction },
  );
}
