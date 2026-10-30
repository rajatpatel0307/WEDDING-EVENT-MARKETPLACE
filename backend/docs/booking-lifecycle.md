# Booking lifecycle implementation report

Implemented against the existing React/Tailwind, Express REST, JWT and Sequelize/MSSQL architecture. Verified on 30 October 2026. Migration 015 is prepared and registered, but has **not been committed to the configured database**. Verification applies it in a transaction and rolls back all schema changes and fixtures.

## Audit and reuse

Inspected the running database's `Booking`, `BookingItems`, `BookingStatusHistory` and `VendorAvailability` columns, the SQL schema, migrations 008–014, customer/vendor/admin routers, role guards, quotation acceptance, service pricing/schedules, Razorpay settlement/webhooks, refund processing, commission and payout services.

Existing customer booking creation and quotation acceptance already used transactions, authoritative catalog prices, historical line items and notifications. Vendor acceptance/rejection and extensive admin booking, refund and payout functionality also existed. The files in the legacy `bookings` module and `VendorBookingsPage.jsx` were empty; these are now used for shared lifecycle behavior and vendor details. No parallel booking API or duplicate booking/payment tables were created.

The gaps addressed were inconsistent calendar conflict checks, no customer cancellation/reschedule request lifecycle, no public/private history boundary, incomplete event/pricing snapshots, no server price-review step, missing optional-item controls, unapplied coupon usage and missing vendor booking detail/change-request views.

## Resulting behavior

- Customers select an existing event, approved service/package, optional items, requirements and optional coupon, then review a server-generated itemized price and terms. A server-generated digest detects changes to event details, prices, inclusions or terms between review and creation. The server recalculates all values at creation; the digest never supplies a price.
- Creation returns the existing unique `BK-…` reference, booking ID and separate booking/payment statuses. Duplicate service/event submissions and conflicting reservations fail without creating a second agreement.
- Per-person service charges derive quantity from the event guest count. Existing pricing rules supply quantity limits, seasonal/weekend rates, discounts, charges and taxes. Configured travel charges appear as a separate line; the existing platform-fee default remains zero. Advance percentages come from service policy.
- Coupons reuse `Coupons`, vendor ownership, validity dates, minimums, caps and usage limits. Coupons apply to the base service/package, excluding add-ons. Usage is consumed once when the request is created, in the same transaction, and is not automatically restored after cancellation. Preview does not consume usage.
- Snapshot fields preserve event location/guests/requirements, booking times, pricing rules, terms, package inclusions, item descriptions and line prices. Catalog edits do not reprice existing agreements.
- Before vendor acceptance/payment, customers can change optional quantities or remove optional items. The server recomputes totals/advance from stored prices and audits/notifies. Base services/packages remain required. Confirmed items require a separate agreement.
- Customer cancellation and reschedule requests preserve the original booking status and reservation. Vendors review customer requests; vendor-initiated cancellation requires an administrator. Request state is visibly distinct from booking and financial state.
- Reschedule approval rechecks current eligibility, calendar conflicts, working hours, lead time, guest limits and location inside the transaction. Failed approval preserves the original slot. Price-changing dates require a revised quotation/payment agreement, and no charge or refund is invented.
- Cancellation approval changes booking state, holds eligible payouts and alerts admins to review captured payments. The existing policy-based, idempotent refund queue remains the only mechanism for provider refunds. Cancellation does not mark payment refunded.
- Customer/vendor history exposes explicit public notes and actor roles. Admin notes, vendor internal notes, policy review notes, payout details and gateway payloads are not exposed by public booking details. Legacy history keeps its statuses/actors while unclassified notes remain private.
- Customer event forms now accept paired start/end times. Existing bookings prevent direct event edits to date, time, city or guest count; each booking must go through its change workflow. Rescheduling one booked service does not move unrelated service bookings or the parent event.
- Vendor lists support pending change queues, date ranges, and searches by reference/customer/service. Admin lists filter pending cancellation/reschedule requests and use the booking's actual scheduled date after rescheduling.

## API paths

All paths reuse the existing customer/vendor/admin routers and their authentication, role, origin/header protections, validation and error formats. Read data uses the router's existing response envelope; mutations return `success` plus their result. Admin routes retain their established direct result format.

| Method | Path | Change |
|---|---|---|
| POST | `/api/customer/bookings/preview` | Added; validates event/catalog/calendar and returns reviewed prices/terms/digest |
| POST | `/api/customer/bookings` | Extended; items, requirements, coupon, optional reviewToken, immutable snapshots, reservation check, reference/status response |
| GET | `/api/customer/bookings/:id` | Extended; safe details, snapshot items, public history, requests, policy/refund estimate/status and eligibility |
| PATCH | `/api/customer/bookings/:id/items/:item` | Added; pending optional-item quantity only |
| DELETE | `/api/customer/bookings/:id/items/:item` | Added; pending optional-item removal only |
| POST | `/api/customer/bookings/:id/change-requests` | Added; Cancellation or Reschedule with reason; new date/times for rescheduling |
| POST | `/api/customer/quotations/:id/decision` | Extended existing acceptance to share reservation/snapshot behavior and package guest validation |
| POST/PUT | `/api/customer/events` / `/api/customer/events/:id` | Extended existing event fields with validated start/end times and booking edit restrictions |
| GET | `/api/vendor/bookings/:id` | Added; vendor-scoped booking details and public history |
| POST | `/api/vendor/bookings/:id/decision` | Existing; now rechecks shared reservation/service eligibility and requests prepaid rejection review |
| POST | `/api/vendor/bookings/:id/change-requests` | Added; vendor cancellation request |
| POST | `/api/vendor/bookings/:id/change-requests/:request/decision` | Added; vendor review, excluding self-approval |
| GET | `/api/vendor/records/bookings` | Extended existing paginated listing; `status=cancellations` / `reschedules`, `eventFrom`, `eventTo`, broader `q` |
| GET | `/api/admin/bookings` | Extended existing listing; `changeRequest=Cancellation` / `Reschedule`, scheduled-date filters |
| GET | `/api/admin/bookings/:id/change-requests` | Added; authorized request review data |
| POST | `/api/admin/bookings/:id/change-requests/:request/decision` | Added; reason-required admin decision |
| POST | `/api/admin/bookings/:id/status` | Existing; confirmation now uses shared reservation checks |

Create/preview input: `{eventId, serviceId, packageId?, quantity?, requirements?, coupon?, items?: [{id, quantity}], reviewToken?}`. Server rejects unknown fields including caller prices, totals, taxes and owner IDs.

Request input: `{kind: "Cancellation", reason}` or `{kind: "Reschedule", reason, date: "YYYY-MM-DD", start?: "HH:mm" | null, end?: "HH:mm" | null}`. Times must be paired and ordered on the same day. Decision input: `{action: "Approve" | "Reject", reason}`.

Existing payment-order, verification, webhook, admin cancellation, policy-review, refund and payout routes remain in use. No alternate payment-success endpoint was introduced.

## Database migration

`015-booking-lifecycle.js` adds:

- `Booking.EventSnapshotJson`, `PriceSnapshotJson`, `StartTime`, `EndTime`.
- `BookingItems.ServiceItemId` (foreign key to existing ServiceItems) and `DescriptionSnapshot`.
- `BookingStatusHistory.PublicNote` and `ActionType`.
- `BookingChangeRequests`, because no existing request table could preserve pending requests, original/proposed dates, decision/actor/reason and timestamps. It has booking/user foreign keys, constrained kinds/statuses, a required reschedule date and a filtered unique index allowing one pending request per booking.
- A vendor/date/status reservation lookup index on the existing Booking table.

Existing bookings receive event/time snapshots without financial changes. Historical pricing is not fabricated; a legacy booking lacking a price snapshot requires a new quotation before rescheduling. New request/history timestamps use UTC defaults. Event calendar dates/times and notice calculations use the project's India timezone.

Rollout: inspect and back up the target database as required by the repository README, then run `npm run db:migrate` from `backend`. Deploy backend/frontend together after migration. A schema backup or migration commit was not performed by verification. Do not drop historical request/snapshot fields as a rollback strategy; restore the coordinated application/database backup when necessary.

## Status rules

No new values were added to `CK_Booking_Status`.

| State | Authorized flow |
|---|---|
| Pending | Vendor → Accepted or Rejected; approved cancellation → Cancelled |
| Accepted / PaymentPending | Verified captured payment or authorized admin confirmation → Confirmed; approved cancellation → Cancelled |
| Confirmed | Admin → InProgress or Disputed; approved cancellation → Cancelled |
| InProgress | Admin → Completed or Disputed |
| Completed | Existing admin dispute workflow only; no reopening |
| Rejected / Cancelled / Refunded | Terminal for booking editing; separate policy/refund/payout workflows remain available |

Completion requires the event date to have arrived and the captured ledger balance/refund reservations to reconcile. Request state is separately `Pending → Approved | Rejected`; rescheduling is available only for Accepted/PaymentPending/Confirmed future bookings, and approval retains the booking's state. Requests cannot decide themselves twice. Payment/refund/payout status always remains separate.

## Security and concurrency

Every lifecycle entry point authorizes a known role before SQL; customer/vendor lookups bind the current owner. IDs, quantities, dates, paired times and reasons are validated with Zod. Queries use the repository's bound replacements. Customer booking mutations have an additional 20-per-minute limit in addition to the existing workspace limit and origin/header checks.

Creation, item edits, request submission/decision, snapshots, history, audit records, coupon usage and notifications commit or roll back together. Reservation checks acquire a transaction-owned exclusive `sp_getapplock` for vendor/day, inspect active commitments and blocked/booked calendar rows, and use SQL update/range locks. Accepted/confirmed/in-progress/disputed bookings and pending requests reserve their service day. Pending requests have no automatic expiry because none is configured in the current model. A pending reschedule does not reserve its proposed date; approval must obtain it and recheck it atomically while retaining the original booking.

Catalog rows are validated again on confirmation. Existing exclusive service/day reservations prevent a second conflicting agreement. SQL can abort a contender on timeout/deadlock; the request fails without partial writes and can be retried. No load/throughput claim is made from the lock-contention check.

The existing refund subsystem separately locks captured balances, accounts for completed/in-flight refunds and payout holds, uses idempotency keys and validates provider responses/webhook signatures. Financial tests cover replay protection and prevent excess or duplicate refunds. No user-facing success callback can mark a booking paid.

## Files created or modified

Created:

- `backend/migrations/015-booking-lifecycle.js`
- `backend/src/modules/bookings/reservations.js`
- `backend/tests/booking-lifecycle.test.js`
- `backend/scripts/verify-booking-lifecycle.js`
- `frontend/src/modules/bookings/BookingChanges.jsx`
- `frontend/src/modules/bookings/BookingItemDetails.jsx`
- `backend/docs/booking-lifecycle.md`

Populated existing empty files:

- `backend/src/modules/bookings/bookings.service.js`
- `backend/src/modules/bookings/bookings.validation.js`
- `frontend/src/modules/vendor/pages/VendorBookingsPage.jsx`

Modified integrations:

- `backend/scripts/migrate.js`, `verify-admin-bookings.js`
- `backend/src/modules/customers/workspace.operations.js`, `workspace.routes.js`, `workspace.service.js`, `workspace.discovery.js`
- `backend/src/modules/vendors/workspace.operations.js`, `workspace.routes.js`, `workspace.service.js`, `service-management.validation.js`
- `backend/src/modules/admin/admin.routes.js`, `bookings-management.service.js`, `booking-finance.js`
- `backend/src/modules/notifications/admin-events.js`
- `frontend/src/modules/customer/pages/CustomerDiscovery.jsx`, `CustomerRecords.jsx`, `CustomerEvents.jsx`
- `frontend/src/modules/vendor/pages/VendorResourcesPage.jsx`, `frontend/src/modules/vendor/navigation.js`
- `frontend/src/modules/admin/pages/BookingDetailsPage.jsx`, `BookingsManagementPage.jsx`
- `frontend/src/routes/AppRoutes.jsx`, `README.md`

## Verification and outstanding rollout work

| Check | Result |
|---|---|
| Backend `npm test` | 139 passed, 0 failed |
| Frontend `npm test` | 10 passed, 0 failed |
| Frontend `npm run build` | Passed |
| Frontend `npm run lint` | Exit 0; repository warnings remain |
| `node scripts/verify-booking-lifecycle.js` from backend | Passed against actual MSSQL and customer/vendor/admin HTTP routers; all DDL and fixtures rolled back |
| `node scripts/verify-admin-bookings.js` from backend | Passed; refund worker/provider-response simulation, signed webhook replay, payout/ledger checks; all changes rolled back |

Lifecycle verification covers review/create, injected money rejection, add-on snapshots/quantity changes, duplicate creation, foreign customer denial, internal-note privacy, vendor acceptance/rejection, immutable prices, original date preservation when reschedule approval fails, successful reschedule, decision replay denial, verified captured settlement, admin-only vendor cancellation, separate payment/refund status, policy refund estimate, quotation acceptance, completion, coupon consumption and refusal of price-changing dates. Two independent SQL transactions demonstrate contention for the same exclusive reservation lock. Unit tests additionally exercise invalid dates/times, terminal transitions, role guards, bound ownership and conflict rejection.

Outstanding deployment/operational checks:

- Apply migration 015 after backing up the target database; the existing configured database remains unchanged by these tests.
- Perform authenticated browser/device and assistive-technology QA of the updated forms/dialogs and each role's pages. Build/lint and HTTP/database validation are complete; browser interaction coverage was not performed.
- Verify real Razorpay capture/refund credentials, webhooks, SMTP delivery and scheduled booking/refund jobs in staging. Verification used captured provider fixtures and simulated refund responses; no external payment/refund was sent.
- Reservations intentionally use exclusive service days. There is no capacity-sharing or multiple hourly-slot inventory model to infer from this schema. Pending holds require vendor/admin resolution; no unconfigured expiry or fee rule is assumed.
- Price/fee-changing reschedules require an explicit revised quotation and the existing payment workflow; automated incremental charging/refunding is not introduced. Existing disputes and admin completion remain the supported operational workflows.

These are rollout and policy-model limits, not a claim that an untested deployment is production-certified.
