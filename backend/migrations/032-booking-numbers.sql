-- Run against the application's SQL Server database with bookings paused.
-- Existing bookings receive numbers in CreatedAt, BookingId order. The next
-- booking continues after them. Internal IDs and foreign keys are unchanged.
-- This script works standalone or inside the migration runner's transaction.
SET XACT_ABORT ON;
DECLARE @ownsTransaction bit = CASE WHEN @@TRANCOUNT = 0 THEN 1 ELSE 0 END;
IF @ownsTransaction = 1 BEGIN TRANSACTION;
BEGIN TRY
  DECLARE @lockResult int;
  EXEC @lockResult = sys.sp_getapplock
    @Resource = 'MarryNestAdminMigration', @LockMode = 'Exclusive',
    @LockOwner = 'Transaction', @LockTimeout = 10000;
  IF @lockResult < 0 THROW 51000, 'Booking number migration lock unavailable.', 1;
  IF OBJECT_ID('dbo.Booking', 'U') IS NULL
    THROW 51000, 'dbo.Booking must exist before this migration.', 1;

  -- Hold the booking table against concurrent creation during backfill.
  DECLARE @bookingCount bigint;
  SELECT @bookingCount = COUNT_BIG(*) FROM dbo.Booking WITH (TABLOCKX, HOLDLOCK);

  IF COL_LENGTH('dbo.Booking', 'BookingNumber') IS NULL
    ALTER TABLE dbo.Booking ADD BookingNumber varchar(40) NULL;
  IF COL_LENGTH('dbo.Booking', 'LegacyBookingNumber') IS NULL
    ALTER TABLE dbo.Booking ADD LegacyBookingNumber varchar(40) NULL;

  IF OBJECT_ID('dbo.BookingNumberCounter', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BookingNumberCounter (
      CounterId tinyint NOT NULL CONSTRAINT PK_BookingNumberCounter PRIMARY KEY,
      LastValue bigint NOT NULL,
      CONSTRAINT CK_BookingNumberCounter_Singleton CHECK (CounterId = 1),
      CONSTRAINT CK_BookingNumberCounter_Value CHECK (LastValue >= 0)
    );
    -- Dynamic SQL allows columns added above to compile on a fresh database.
    EXEC sys.sp_executesql N'
      UPDATE dbo.Booking SET LegacyBookingNumber = BookingNumber;
      SELECT BookingId,
        ''MNBK26'' + CASE WHEN n < 100000
          THEN RIGHT(''00000'' + CONVERT(varchar(20), n), 5)
          ELSE CONVERT(varchar(20), n) END AS NewNumber,
        ''~MNBK~'' + REPLACE(CONVERT(varchar(36), BookingId), ''-'', '''') AS TemporaryNumber
      INTO #BookingNumberBackfill
      FROM (SELECT BookingId, ROW_NUMBER() OVER (ORDER BY CreatedAt, BookingId) AS n
            FROM dbo.Booking) numbered;

      -- Two passes avoid collisions with any pre-existing MNBK26 references.
      IF EXISTS (SELECT 1 FROM dbo.Booking b JOIN #BookingNumberBackfill m
                 ON b.BookingNumber = m.TemporaryNumber)
        THROW 51000, ''A legacy booking reference conflicts with backfill staging.'', 1;
      UPDATE b SET BookingNumber = m.TemporaryNumber
        FROM dbo.Booking b JOIN #BookingNumberBackfill m ON m.BookingId = b.BookingId;
      UPDATE b SET BookingNumber = m.NewNumber
        FROM dbo.Booking b JOIN #BookingNumberBackfill m ON m.BookingId = b.BookingId;
      INSERT dbo.BookingNumberCounter(CounterId, LastValue)
        SELECT 1, COUNT_BIG(*) FROM dbo.Booking;
    ';
  END;
  -- Never silently reset a previously initialized counter, even after deletion.
  EXEC sys.sp_executesql N'
    IF NOT EXISTS (SELECT 1 FROM dbo.BookingNumberCounter WHERE CounterId = 1)
      THROW 51000, ''Booking number counter is missing; restore it before continuing.'', 1;
    IF EXISTS (SELECT 1 FROM dbo.Booking
               WHERE TRY_CONVERT(bigint, SUBSTRING(BookingNumber, 7, 34)) >
                     (SELECT LastValue FROM dbo.BookingNumberCounter WHERE CounterId = 1))
      THROW 51000, ''Booking number counter is behind stored bookings.'', 1;
  ';

  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Booking')
             AND name = 'BookingNumber' AND is_nullable = 1)
    EXEC(N'ALTER TABLE dbo.Booking ALTER COLUMN BookingNumber varchar(40) NOT NULL;');
  -- Reuse the original unique constraint when present.
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID('dbo.Booking') AND i.is_unique = 1
      AND i.is_disabled = 0 AND i.has_filter = 0
      AND (SELECT COUNT(*) FROM sys.index_columns ic
           WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal > 0) = 1
      AND EXISTS (SELECT 1 FROM sys.index_columns ic JOIN sys.columns c
                  ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                  WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
                    AND ic.key_ordinal = 1 AND c.name = 'BookingNumber')
  ) CREATE UNIQUE INDEX UX_Booking_Number_Sequential ON dbo.Booking(BookingNumber);

  IF OBJECT_ID('dbo.CK_Booking_Number_Sequential', 'C') IS NULL
    EXEC(N'ALTER TABLE dbo.Booking WITH CHECK ADD CONSTRAINT CK_Booking_Number_Sequential CHECK (
      DATALENGTH(BookingNumber) = LEN(BookingNumber)
      AND LEFT(BookingNumber, 6) COLLATE Latin1_General_100_BIN2 = ''MNBK26''
      AND LEN(BookingNumber) >= 11
      AND SUBSTRING(BookingNumber, 7, 34) COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^0-9]%''
      AND TRY_CONVERT(bigint, SUBSTRING(BookingNumber, 7, 34)) IS NOT NULL
      AND TRY_CONVERT(bigint, SUBSTRING(BookingNumber, 7, 34)) > 0
      AND (LEN(BookingNumber) = 11 OR SUBSTRING(BookingNumber, 7, 1) <> ''0'')
    );');

  EXEC(N'CREATE OR ALTER PROCEDURE dbo.AllocateBookingNumber AS
    BEGIN
      SET NOCOUNT ON;
      IF @@TRANCOUNT = 0
        THROW 51000, ''Booking number allocation requires the booking transaction.'', 1;
      UPDATE dbo.BookingNumberCounter WITH (UPDLOCK, HOLDLOCK)
        SET LastValue = LastValue + 1
        OUTPUT ''MNBK26'' + CASE WHEN inserted.LastValue < 100000
          THEN RIGHT(''00000'' + CONVERT(varchar(20), inserted.LastValue), 5)
          ELSE CONVERT(varchar(20), inserted.LastValue) END AS number
        WHERE CounterId = 1 AND LastValue < 9223372036854775807;
      IF @@ROWCOUNT <> 1
        THROW 51000, ''Booking number counter is missing or exhausted.'', 1;
    END;');

  EXEC(N'CREATE OR ALTER TRIGGER dbo.TR_Booking_Number_Immutable ON dbo.Booking
    AFTER UPDATE AS
    BEGIN
      SET NOCOUNT ON;
      IF UPDATE(BookingNumber) AND EXISTS (
        SELECT 1 FROM inserted i JOIN deleted d ON d.BookingId = i.BookingId
        WHERE i.BookingNumber COLLATE Latin1_General_100_BIN2 <>
              d.BookingNumber COLLATE Latin1_General_100_BIN2
           OR DATALENGTH(i.BookingNumber) <> DATALENGTH(d.BookingNumber)
      ) THROW 51000, ''A booking number cannot be changed after creation.'', 1;
    END;');

  IF @ownsTransaction = 1 COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @ownsTransaction = 1 AND XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
