# Permanent sequential Booking IDs

> Current status: The Quotations feature is retired. Quotation pages, requests, proposals, conversion APIs, reminders and preferences described in this historical report are no longer available. Historical database records and migrations remain for compatibility.

The human-readable Booking ID is stored in the existing `dbo.Booking.BookingNumber` column. Internal `BookingId` GUIDs, URLs, foreign keys, ownership checks, payment identifiers, statuses and booking rules retain their existing behavior. The fixed prefix is `MNBK26`; the positive numeric suffix has a minimum of five digits and grows past `99999` without truncation or an annual reset.

The configured database was backed up and migration `032-booking-numbers` was applied on November 17, 2026. Its five existing bookings now have `MNBK2600001` through `MNBK2600005` in `CreatedAt, BookingId` order. The next successful new booking receives **`MNBK2600006`**. Original references are preserved in `LegacyBookingNumber`. Every other column on each existing booking was compared before commit and remained identical.

The copy-only database backup with checksums is `DB/before-booking-numbers-20261117-1794890784882.bak`; SQL Server backup history reports checksums present and no damage. The old reference mapping is also saved in `DB/booking-reference-map-before-20261117.json`. These local backup files are ignored by Git.

## Database migration

The complete, standalone SQL is [032-booking-numbers.sql](../migrations/032-booking-numbers.sql). It includes column creation when needed, legacy preservation, deterministic backfill, the transactional counter, uniqueness enforcement, format validation, the allocation procedure, and the immutability trigger. It supports an empty database, preserves the original unique BookingNumber constraint when available, and adds a unique index if necessary. Only the Booking table and its dedicated numbering objects change; no primary keys or foreign keys are replaced.

For another environment, back up the database, pause booking writes, and run the standalone SQL against the application database, or run `npm run db:migrate` from `backend` using the existing migration workflow. Deploy the backend changes together with migration 032. The JavaScript migration reads the same SQL file; it does not maintain a separate implementation. Reapplying it preserves assigned references and never resets the counter. On an empty database, the first successful booking receives `MNBK2600001`. With N existing bookings, backfill assigns 1 through N and the first new booking receives N+1, as requested.

## Generation and display

All existing creation paths—direct booking, accepted quotation and commerce booking checkout—call `createBooking`. After existing validation, it calls `allocateBookingNumber` inside the same transaction that stores the booking, items, reservations, notification and audit. SQL Server's `AllocateBookingNumber` procedure increments the singleton `BookingNumberCounter` row under an update lock held through commit, returning the formatted reference. Failed transactions restore the counter and booking together; concurrent committed transactions receive different consecutive numbers. Allocation without a transaction fails. There is no in-memory counter, timestamp-based reference or MAX+1 query.

The stored reference is returned using the existing API fields (`number`, `BookingNumber`, or payment checkout's `bookingNumber`). Customer/vendor/admin dashboards, booking lists and details, calendar, quotation conversion links, confirmation, payment history, refund/payout screens, chats, review links, CSV exports and downloadable payment receipts already consume that stored field. Their components require no format logic. Existing checkout idempotency returns the previously stored reference. Reading or changing a booking never allocates a number. An UPDATE trigger rejects attempts to change its reference, while allowing existing lifecycle updates.

Existing booking notifications can contain a saved legacy reference. Notification queries replace that reference using its associated Booking record at read time, including customer/vendor dashboard lists, the shared notification inbox and administrator notification management. Generic booking notifications include the current ID. Stored notifications and historical audit records are preserved. Previously downloaded files and messages already sent outside the application cannot be retroactively changed. The application currently supplies payment receipts rather than tax invoices; downloaded receipts use the current stored BookingNumber.

## Verification

- Backend `npm test`: **340 passed**, including reference allocation, creation-response/storage/notification/audit consistency, transaction requirements and client override rejection.
- `node scripts/verify-booking-numbers.js`: passed against SQL Server using isolated temporary schemas, which were removed afterward. Covers an empty database; legacy backfill including a conflicting old MNBK26 reference; 20 concurrent committed booking inserts in each scenario; failed transaction rollback; repeatable migrations; unique and format constraints; immutable references; unrelated status updates; digit growth; bigint exhaustion; and legacy notification display without modifying stored messages. Application bookings/counters are untouched by this script.
- Rollback-only migration rehearsal against all five actual bookings passed before application.
- After application, customer/vendor/admin booking lists and details and dashboard/notification read paths returned consistent stored IDs for all five bookings; the counter remained 5 after these reads.
- Frontend `npm run build`: passed. Frontend tests: **90 passed, 1 pre-existing failure** in `home-protection.test.js`, whose hash fixture disagrees with unchanged `src/components/common/CollectionState.jsx`. No frontend files or protected fixtures were changed.

The locking mechanism follows [SQL Server table hints](https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-table) and the [UPDATE transaction semantics](https://learn.microsoft.com/en-us/sql/t-sql/queries/update-transact-sql).
