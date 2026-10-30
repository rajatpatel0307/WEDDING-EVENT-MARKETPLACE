// Extend the existing booking aggregate; request state is separate from booking/payment state.
export async function up(q, transaction) {
  const run = (sql) => q.sequelize.query(sql, { transaction });
  await run(`
    IF COL_LENGTH('dbo.Booking','EventSnapshotJson') IS NULL ALTER TABLE dbo.Booking ADD EventSnapshotJson nvarchar(max) NULL,PriceSnapshotJson nvarchar(max) NULL,StartTime time(0) NULL,EndTime time(0) NULL;
    IF COL_LENGTH('dbo.BookingItems','ServiceItemId') IS NULL ALTER TABLE dbo.BookingItems ADD ServiceItemId bigint NULL REFERENCES dbo.ServiceItems(ServiceItemId),DescriptionSnapshot nvarchar(max) NULL;
    IF COL_LENGTH('dbo.BookingStatusHistory','PublicNote') IS NULL ALTER TABLE dbo.BookingStatusHistory ADD PublicNote nvarchar(1000) NULL,ActionType varchar(60) NULL;
    IF OBJECT_ID('dbo.BookingChangeRequests') IS NULL BEGIN
      CREATE TABLE dbo.BookingChangeRequests(
        RequestId uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        BookingId uniqueidentifier NOT NULL REFERENCES dbo.Booking(BookingId),
        Kind varchar(20) NOT NULL CHECK(Kind IN('Cancellation','Reschedule')),
        Status varchar(20) NOT NULL DEFAULT 'Pending' CHECK(Status IN('Pending','Approved','Rejected')),
        RequestedBy uniqueidentifier NOT NULL REFERENCES dbo.Users(UserId),
        Reason nvarchar(1000) NOT NULL,OriginalDate date NOT NULL,OriginalStart time(0) NULL,OriginalEnd time(0) NULL,
        RequestedDate date NULL,RequestedStart time(0) NULL,RequestedEnd time(0) NULL,
        DecidedBy uniqueidentifier NULL REFERENCES dbo.Users(UserId),DecisionReason nvarchar(1000) NULL,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),DecidedAt datetime2(3) NULL,
        CONSTRAINT CK_BookingChange_Date CHECK(Kind='Cancellation' OR RequestedDate IS NOT NULL));
      CREATE UNIQUE INDEX UX_BookingChange_Pending ON dbo.BookingChangeRequests(BookingId) WHERE Status='Pending';
      CREATE INDEX IX_BookingChange_List ON dbo.BookingChangeRequests(BookingId,CreatedAt);
    END;
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Booking_Reservation' AND object_id=OBJECT_ID('dbo.Booking')) CREATE INDEX IX_Booking_Reservation ON dbo.Booking(VendorId,BookingDate,BookingStatus) INCLUDE(BookingId);
  `);
  // Existing bookings retain their existing financial amounts and calendar commitments.
  await run(
    `UPDATE b SET StartTime=e.StartTime,EndTime=e.EndTime,EventSnapshotJson=(SELECT e.EventName AS name,e.EventType AS type,e.City AS city,e.State AS state,e.GuestCount AS guests,e.Description AS requirements FOR JSON PATH,WITHOUT_ARRAY_WRAPPER) FROM dbo.Booking b JOIN dbo.Events e ON e.EventId=b.EventId WHERE b.EventSnapshotJson IS NULL;`,
  );
}
