# Admin bookings management

The dashboard is `/admin/bookings`; full details are at `/admin/bookings/:bookingId`. The navigation includes pending, confirmed, in-progress, completed, cancelled, rejected and disputed bookings. The table fetches a single page from the server and presents cards on mobile. Detail tabs cover parties/event, booked items, payments, payouts, policy, status history, audit logs and a linked quotation.

## Database and runtime

Inspect and back up the database before `npm run db:migrate` in `backend`. Migration `013-admin-bookings` adds cancellation/policy snapshots, history reason/notes/role, audit user agents, refund-operation idempotency and worker lease fields, notification deduplication and payout refund/fee deductions. Existing commission rows and payment transactions are preserved. Existing payout amounts with zero new deductions retain their prior calculation. The payout net calculation floors at zero.

The API startup checks this migration. Restart a backend running without watch mode after applying changes.

The server starts booking jobs once per minute unless `BOOKING_JOBS_ENABLED=false`. Jobs process up to ten eligible refund records, retry uncertain provider responses, poll accepted refunds and send deduplicated event reminders. Run `node scripts/process-booking-jobs.js` from an external scheduler if in-process jobs are disabled. Row leases and notification keys support multiple API instances. Shutdown waits for the active job before closing SQL connections.

## APIs

All endpoints below are under `/api/admin` and require a verified admin JWT/session. Mutations also require the configured frontend Origin and `X-Admin-Request: 1`. Existing IP rate limits and sanitized errors apply. A missing booking returns 404; stale or forbidden transitions return 409; invalid payloads return 400. Refund initiation returns 202 because completion requires provider confirmation.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/bookings` | Paginated search/filter/sort |
| GET | `/bookings/statistics` | Global booking counts, value, recorded commission and unpaid payout balances |
| GET | `/bookings/options` | Bounded vendor/customer selectors and categories |
| GET | `/bookings/:id` | Full details, server financial summary, policies, history and audit |
| GET | `/bookings/:id/items` | Historical booked service/package line values |
| GET | `/bookings/:id/status-history` | Status/payment/refund/policy timeline |
| GET | `/bookings/:id/payment` | Original payments, refunds and append-only transaction events |
| GET | `/bookings/:id/payout` | Payout rows, commission records and financial summary |
| POST | `/bookings/:id/cancel` | Audited cancellation; holds unpaid payouts without altering original payments |
| POST | `/bookings/:id/status` | Confirm, start, complete or dispute within permitted transitions |
| POST | `/bookings/:id/policy-review` | Explicitly record unclear cancellation terms after reviewing the agreement |
| POST | `/bookings/:id/refund` | Idempotently reserve and queue the server-calculated eligible refund |

The legacy generic admin booking action endpoint delegates to this implementation; it cannot bypass cancellation or transition rules. Bookings have no delete endpoint.

### Search and filters

`q` searches booking number/ID, customer name/ID, vendor name/ID, event and booked service name. Supported filters: `status`, `payment`, `vendor`, `customer`, `category`, `location`, `eventFrom`, `eventTo`, `bookedFrom`, `bookedTo`, `minAmount`, `maxAmount`. Booking creation date filters include complete Indian calendar days. `sort` supports `createdAt`, `number`, `customer`, `vendor`, `eventDate`, `bookingDate`, `amount`, `status`, with `direction=asc|desc` and a booking-ID tie breaker. `pageSize` is limited to 100 and defaults to 20.

The inherited database `BookingDate` represents the booked service/event day. `CreatedAt` is the date the booking was placed; the UI labels that as the booking/created date. Historical booking line prices are read from `BookingItems`, not recalculated using current service prices.

### Status/cancellation payload

```json
{
  "expectedUpdatedAt": "2026-10-29T10:00:00.000Z",
  "reason": "Customer requested cancellation under the agreement.",
  "notes": "Administrative context."
}
```

For `/status`, add `status` as `Confirmed`, `InProgress`, `Completed` or `Disputed`. Vendor acceptance/rejection remains in the vendor workspace. Pending bookings cannot skip acceptance. Starting/completing before the booked day is rejected. Completion requires captured payments to cover the booking and no pending refund. Completed bookings cannot return to Pending. Cancellation is allowed for Pending, Accepted, PaymentPending and Confirmed, and is blocked while a payout is paid or processing.

Cancellation does not automatically refund money or erase a payment. The cancellation timestamp, administrator, reason, notes, history, notifications and payout hold are committed together.

### Policy review and refund calculation

Existing commission rules are preserved. New bookings snapshot cancellation/refund text and any structured `policies.bookingRefundPolicy` available on every service. With multiple services, the most restrictive refund percentage, charge percentage and notice requirement are captured. Free text is never interpreted as an automatic monetary entitlement.

Legacy or unclear terms require an explicit admin policy review:

```json
{
  "expectedUpdatedAt": "2026-10-29T10:00:00.000Z",
  "policy": {
    "refundPercent": 80,
    "cancellationFeePercent": 10,
    "minimumNoticeHours": 0
  },
  "reason": "Original agreement reviewed and these terms verified.",
  "notes": "Optional review notes."
}
```

These are audited policy decisions, not trusted currency amounts. They must match the actual agreement. Review is blocked after a refund is pending, processing or completed. Zero notice hours means no notice cutoff. Otherwise eligibility is checked using the booking event day and recorded cancellation time.

The server uses integer paise: captured eligible INR payments × refundable percentage − cancellation percentage of the booking total − completed/reserved refunds. It caps the result at the unrefunded captured balance and never permits a negative refund. Failed payment attempts add no funds. Paid/processing payouts and unsupported providers block automatic initiation.

Refund payload:

```json
{
  "expectedUpdatedAt": "2026-10-29T10:00:00.000Z",
  "idempotencyKey": "734b9588-c47c-40eb-8c17-1797d65a2802",
  "reason": "Refund according to the verified cancellation policy.",
  "notes": "Optional admin notes."
}
```

No client amount, commission, party ID or payment-status override is accepted. The entire remaining policy-eligible balance is allocated across captured payments. Reusing the same key and command returns the original operation even if its version is now stale; changing the booking, actor or request body with that key returns a conflict. Different keys cannot reserve the same balance because allocation locks the booking and financial rows.

## Provider processing

Automatic refunds use the existing Razorpay integration and require server-only `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Normal refunds use a stable per-refund UUID in the provider's [documented idempotency header](https://raw.githubusercontent.com/razorpay/markdown-docs/master/api/refunds/normal-refunds-idempotent.md). A lost response is retried with the identical amount, receipt and key.

Configure `/api/payments/razorpay/webhook` for `payment.captured`, `payment.failed`, `refund.created`, `refund.processed` and `refund.failed`. [Razorpay refund events](https://razorpay.com/docs/webhooks/refunds/) identify provider-confirmed completion or failure. The existing raw-body signature check is required before any reconciliation. The worker can also poll known refund IDs. Amount, currency, payment ID, receipt and stored refund amount are validated before posting changes.

Refund initiation writes pending `Refunds` and `PaymentTransactions` records, reserves the balance and sets booking payment status to RefundPending. The original payment is retained. Completion appends a transaction and updates the refund; full payment refunds mark that payment Refunded, while partial refunds retain the original successful payment. Booking payment status distinguishes PartiallyRefunded. Completion and failure notifications are deduplicated. Out-of-order pending/failed events cannot undo a completed refund. Unknown response/network failures remain reserved and are retried, rather than falsely reporting that money moved.

Refund records created outside this module can be reconciled from signed provider events if their payment is known. Non-INR or unsupported-provider payments need provider reconciliation; the module does not fabricate manual refunds. Uncertain hard failures remain visible with a retry/reconciliation warning. No live provider operation occurs merely from opening a booking.

## Commission and payout

Existing `PlatformCommission` amounts are authoritative and remain unchanged. Optional server-only `BOOKING_COMMISSION_PERCENT` applies only as a snapshot on newly created bookings. Leave it unset to avoid inventing a rule. Without a recorded commission or captured server rule, new completed-booking payouts remain OnHold. The frontend cannot supply a commission amount or rate.

Vendor payable is gross booking value less recorded commission, confirmed/reserved refunds, applicable platform fees and existing tax deductions. Completed and fully funded bookings generate an unpaid payout; cancellation/dispute/refunds hold applicable unpaid payouts. Paid or processing payout records are never rewritten as though money had not moved. Multiple historical payout rows are held for reconciliation while preserving their amounts. This module displays and calculates payouts; it does not transfer vendor funds.

## Notifications and auditing

Creation, vendor acceptance/rejection, confirmation, payment success/failure, cancellation, refund initiation/completion/failure, event reminders, completion and review requests write to `Notifications`. Customer review requests go only to the customer. Other booking milestones notify both parties and use per-booking deduplication keys.

Audit entries record the actor, action, entity, old/new values, IP, user agent and UTC timestamp. UI timestamps display in India. Business mutations, history, payout changes, notifications and audit writes share a transaction. Provider calls run after durable queue reservation, outside SQL transactions. No historical booking or original payment is deleted.

## Verification

```powershell
cd backend
npm test
node scripts/verify-admin-bookings.js
node scripts/verify-service-management.js
cd ../frontend
npm test
npm run lint
npm run build
```

The booking verifier uses real MSSQL and REST with fixture-only data. It exercises policy review, partial refunds, idempotent replay, the refund worker with a provider stub, valid/invalid signed webhook events, payment capture/failure, commission preservation, payout holds/completion, audit metadata, authorization-related invariants and forbidden transitions/deletion. All database changes roll back and no real payment provider is contacted. Live provider testing and deployment webhook configuration remain environment-specific checks.
