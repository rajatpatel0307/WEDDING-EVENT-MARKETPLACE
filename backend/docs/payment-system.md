# Payment management implementation

## Audit and integration decisions

The live MSSQL schema and existing REST, authentication, booking, quotation,
notification and finance services were inspected before implementation.

The application already used Razorpay Standard Checkout, `CustomerPaymentOrders`,
`Payments`, `PaymentTransactions`, `Refunds`, `AdminBookingOperations`,
`PlatformCommission`, `VendorPayouts`, `BookingNotificationKeys`, `Notifications`
and `AuditLogs`. These remain the authoritative operational records. Empty
`payments.*` scaffold files were not turned into a competing payment API.

Existing accepted-booking payment eligibility and separate vendor acceptance
are preserved. Direct service bookings now retain their server-calculated
advance installment. Customer booking routes were corrected to render customer
pages; admin booking review pages are mounted under `/admin/bookings`.

## Implemented workflows

### Payments

1. An authenticated customer reviews their own accepted, payable booking.
2. Checkout requires terms acceptance and a GUID idempotency key. The caller
   selects 10%, 25%, 50%, 75%, 100% of the current outstanding balance, the
   agreed advance, or a custom INR amount. The server calculates percentages in
   integer paise and validates custom amounts (at least ₹1, at most the remaining
   balance, and at most two decimal places). Custom amounts are bound to the
   checkout key so retries cannot change an existing payment's amount.
   Arbitrary amounts, currencies, identities and statuses are rejected.
3. The booking is locked. Verified captures must reconcile with its recorded
   paid balance. A processing refund or a provider payment awaiting confirmation blocks
   checkout. Orders with the selected amount are reused. Changing the amount is
   allowed after checking the older orders and their payments with Razorpay: an
   unpaid order with no payments or only failed attempts does not block a new
   installment. Earlier orders remain tracked for late captures. Check server
   status refreshes every unpaid order, including orders from prior installments.
4. The backend creates the Razorpay order and returns only public checkout fields.
   An order created remotely before a local transaction failure is never returned
   to checkout. It cannot be paid through an application-issued checkout response.
5. Callback HMAC verification is followed by a server-to-server payment fetch.
   Signed webhooks are verified against their exact raw bytes, sanitized and
   durably saved before acknowledgment.
6. The background worker validates captured amount, currency, provider order and
   booking ownership. Booking, payment, transaction, financial journal, audit and
   notification writes commit together. Duplicate events and callback/webhook
   races cannot apply a capture twice. A late captured payment can upgrade a
   previously failed attempt while preserving its failed transaction event.
7. Capture and proportional commission accrual events are journaled. Commission
   recognition and settlement preparation follow the existing completion policy.
   Cancelled/rejected or excessive captures are retained and flagged for review.

Order creation is locally idempotent; this does not assume an undocumented
Razorpay order-creation idempotency header. Failed attempts stay in the existing
transaction history. No raw card information is collected or retained.

### Refunds

Customers request full or partial policy-eligible refunds after cancellation or
vendor rejection, through checkout or transaction details. One open request per
booking is enforced by SQL. Request replay checks the customer and payload hash.

An administrator approves or rejects with a reason. Approval revalidates the
booking and original captures under lock, atomically creates the existing
`AdminBookingOperations`/`Refunds` queue entries and links the customer request.
Approved amounts reserve captured funds; approval never means completion.
Existing direct booking-admin refunds continue to calculate the full eligible
amount on the server and reject client financial overrides.

The existing refund worker uses Razorpay's `X-Refund-Idempotency` header, stable
refund reference, provider status refresh, retry backoff and leases. Only verified
provider confirmation completes a refund. Cumulative completed refunds cannot
exceed their original payment. Duplicate and older events cannot regress a
completed refund. Customer history derives processing/completed/failed status
from the linked refund operations rather than treating approval as payment.

Policy limits account for notice periods, cancellation fees, previous refunds and
reserved refunds. Missing policies require the existing audited policy review.
Paid or processing payouts block ordinary refund initiation. An externally
confirmed refund after payout creates an explicit `RecoveryRequired` financial
event and administrator alert; completed payouts are preserved.

### Vendor settlements and payouts

The existing booking completion workflow calculates settlement gross, commission,
refunds, fees and net payable. Vendor financial cards query verified SQL records
and distinguish customer collections, approved available funds, holds, processing,
completed payouts and failures.

Manual settlement is disabled unless `PAYOUT_SETTLEMENT_MODE=manual`. The sequence
is approval, reserve for external settlement, then record verified external success
or failure. Reservation requires a masked destination label and an explicit
administrator attestation that the external beneficiary belongs to the vendor.
The application does not transfer money or collect complete bank account details.

An open customer refund request, incomplete booking, duplicate settlement,
unreconciled capture, missing commission, outstanding refund or changed ledger
blocks payout release. Confirmation requires a unique external transfer reference
and idempotency key. Optional `PAYOUT_DUAL_APPROVAL_THRESHOLD` is an INR threshold
requiring a different administrator from the settlement initiator to confirm it.
Invalid threshold configuration fails closed. There is no automatic bank payout
integration in the existing provider setup.

### Commission

The existing default percentage setting remains available. New effective-dated
rules support percentage, fixed and combined fees, optional vendor/category
scope, priority, promotional time windows and disabling future use.

Precedence: vendor, category, global, then the existing default. Within a scope,
higher priority, later effective start and rule ID give deterministic ordering.
Category rules apply to bookings/quotations whose services all have that category;
mixed-category documents use vendor/global rules.

The base is either booking total (including tax/platform fee), or subtotal after
discount before tax/fees. Percentage calculations use integer arithmetic, with
paise rounding; fixed fees are added for combined rules. Commission is capped at
the selected base. Bookings and quotations snapshot the rule parameters. Rule
changes cannot recalculate historical snapshots or recognized commission.

The existing refund policy retains recognized commission and deducts refunds
from vendor payables; the UI and reports disclose this. No automatic commission
reversal policy or undisclosed gateway fee is invented. Accrual journal entries
are distinct from recognized commission and must not be added together as revenue.
Gross customer collections are never labeled platform revenue.

## API inventory

All customer/vendor/admin APIs keep existing JWT cookies, server role checks,
record ownership, mutation-origin protections, no-store responses and rate limits.
The webhook authenticates using its provider HMAC instead of a customer session.

| Method and path                                                                             | Purpose                                                                                         |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /api/customer/payments/config`                                                         | Public checkout configuration for signed-in customers; fixed route precedes payment IDs         |
| `POST /api/customer/bookings/:id/payment-order`                                             | Existing checkout endpoint, now accepts `{idempotencyKey, mode, termsAccepted:true}`            |
| `POST /api/customer/payments/verify`                                                        | Existing signed callback and trusted provider verification                                      |
| `POST /api/payments/razorpay/webhook`                                                       | Existing raw-body webhook, now durable and retryable                                            |
| `GET /api/customer/bookings/:id/payment-status`                                             | Owned order history and booking/payment states                                                  |
| `POST /api/customer/bookings/:id/payment-refresh`                                           | Trusted provider reconciliation for the owned booking                                           |
| `GET /api/customer/records/payments`                                                        | Existing paginated customer transaction history                                                 |
| `GET /api/customer/payments/:id`                                                            | Existing owned transaction and refund events                                                    |
| `GET /api/customer/payments/:id/receipt`                                                    | Download a verified text receipt; not a tax invoice                                             |
| `GET /api/customer/bookings/:id/refund-eligibility`                                         | Server policy calculation and open-request check                                                |
| `GET /api/customer/refund-requests`                                                         | Paginated owned request progress                                                                |
| `POST /api/customer/refund-requests`                                                        | Submit `{bookingId, amount, reason, idempotencyKey}`                                            |
| `GET /api/vendor/earnings`                                                                  | Verified vendor financial totals                                                                |
| `GET /api/vendor/records/revenue` and `/records/payouts`                                    | Existing scoped earnings and payout histories                                                   |
| `GET /api/admin/payment-overview`                                                           | Real captured/refund/commission/payout totals and charts                                        |
| `GET /api/admin/payment-reconciliation`                                                     | Paginated orders, outstanding webhook events and balance discrepancies                          |
| `POST /api/admin/payment-orders/:id/refresh`                                                | Verify provider payments and audit reconciliation                                               |
| `POST /api/admin/payment-events/:id/retry`                                                  | Audited retry of an unprocessed verified event                                                  |
| `GET /api/admin/refund-requests`                                                            | Paginated customer refund review queue                                                          |
| `POST /api/admin/refund-requests/:id/decision`                                              | `{action:'approve'                                                                              | 'reject', reason}` |
| `POST /api/admin/bookings/:id/refund`                                                       | Existing reviewed booking refund initiation                                                     |
| `POST /api/admin/payouts/:id/decision`                                                      | Existing dedicated review and settlement actions, now checks refund requests/destination/policy |
| `GET /api/admin/commission/configuration` and `PUT`                                         | Existing audited default percentage configuration                                               |
| `GET /api/admin/commission/rules` and `POST`                                                | Inspect/create effective commission rules                                                       |
| `POST /api/admin/commission/rules/:id/disable`                                              | Audited future-use deactivation with a reason                                                   |
| `GET /api/admin/payment-reports/export`                                                     | Date-filtered CSV, latest 10,000 records, formula-safe cells                                    |
| Existing `/api/admin/payments`, `/refunds`, `/payouts`, `/commission`, `/finance/:kind/:id` | Existing search, detail, audit and reporting surfaces                                           |

## Database migrations

Run `npm run db:migrate` in `backend` before starting the server. Both migrations
were applied successfully to the connected MSSQL database. Migration registration
uses the existing migration lock and transaction mechanism.

- `019-payment-integrity.js`: extends `CustomerPaymentOrders`; adds provider/key
  uniqueness, the durable `PaymentWebhookEvents` inbox, separate customer refund
  review requests and append-only `FinancialLedger`. Transaction events are
  append-only. Existing financial amounts are not rewritten or deleted.
- `020-financial-controls.js`: adds `CommissionRules`, masked manual settlement
  metadata and database guards for recognized commission, completed payouts,
  completed refunds and captured payment identity/amounts.

If existing provider identifiers are duplicated, uniqueness migration fails and
rolls back rather than guessing which financial record to remove. New monetary
columns use decimal(18,2); currencies are explicit and timestamps use UTC.

`FinancialLedger` is an immutable movement/event journal introduced from this
migration onward, not a retrospective double-entry general ledger. Legacy totals
continue to reconcile against the authoritative payment/refund/payout tables.

## Operating configuration and verification

Checkout requires both Razorpay API credentials. The webhook secret is required
separately for accepting signed webhook notifications; its absence does not disable
checkout, server-side payment verification, or API reconciliation. Configure secrets
securely on the backend, never in React or chat:

```
RAZORPAY_KEY_ID=<provider public key ID>
RAZORPAY_KEY_SECRET=<server secret>
RAZORPAY_WEBHOOK_SECRET=<signed webhook secret>
BOOKING_JOBS_ENABLED=true
# Optional controlled external settlement procedure:
PAYOUT_SETTLEMENT_MODE=manual
PAYOUT_DUAL_APPROVAL_THRESHOLD=100000
```

Use matching Razorpay test-mode credentials and test webhooks first. Configure the
HTTPS endpoint `/api/payments/razorpay/webhook` for `payment.captured`,
`payment.failed`, `refund.created`, `refund.processed` and `refund.failed`.
The API persists a sanitized inbox entry before responding. The existing worker
runs every minute, handles exponential retries, refreshes pending orders and
processes refunds. If background booking jobs are disabled, schedule
`node scripts/process-booking-jobs.js` instead. Failed business validations enter
review; administrators can investigate and queue a retry. No automatic balancing
entry repairs an unexplained difference.

Razorpay also enforces the account's per-order amount limit, including in test
mode. An `Amount exceeds maximum amount allowed` response is returned to checkout
as an actionable limit rejection (HTTP 422). Request an account limit increase
through Razorpay for the agreed booking amount; the application does not reduce
booking totals or silently split orders. Rejections before checkout opens remain
retryable. Only an unresolved verification after checkout reports a pending payment.

Provider reference documentation:
[webhook validation and ordering](https://github.com/razorpay/markdown-docs/blob/master/webhooks/validate-test.md),
[idempotent refunds](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md).

Validation performed:

- Backend test suite: 164 tests passing, including payment authorization, amount
  validation, signatures, installments, rule arithmetic and CSV protection.
- `node scripts/verify-payments.js`: real MSSQL booking-lock concurrency, vendor
  commission rules, server-calculated checkout, foreign ownership rejection,
  order/capture idempotency, SQL rollback on audit failure, refunds arriving before
  capture, delayed capture after failure, duplicate signed
  webhooks, sensitive payload removal, partial refund review and out-of-order
  confirmation, manual payout replay, and real SQL report queries.
- Existing booking lifecycle, quotation lifecycle and customer workspace SQL/REST
  verification scripts pass. Their fixtures and financial changes roll back.
- All 15 frontend tests and the production build pass. The existing Home Page hash regression
  suite protects Home, shared navigation/footer/styles and assets. No Home Page or
  global CSS files were changed for this work.

## Remaining launch checks and limits

- No real charges, refunds or bank transfers were made. Gateway test-mode and
  live-account end-to-end approval remain required before live use.
- In-app browser verification could not start because the browser connection tool
  returned `missing field sandboxPolicy`. Interactive desktop/mobile visual QA
  remains outstanding; file-level Home Page protection passed before and after.
- INR is the configured two-decimal currency. Receipts are downloadable text
  acknowledgments, not generated tax invoices. Manual settlements require your
  approved external verification procedure.
- Financial exports are deliberately bounded to 10,000 rows. Review queues expose
  up to 50 outstanding events/discrepancies; investigate larger backlogs in SQL.
- Additional refund/commission approval policy, if required by the business,
  must be specified before enabling those high-value operations. Existing ADMIN
  authorization and audit apply; optional second-admin payout confirmation is
  implemented.

## Files created or changed for this implementation

New:

- `backend/migrations/019-payment-integrity.js`, `020-financial-controls.js`
- `backend/src/modules/payments/{ledger,reconciliation,customer-finance,refund-review,finance-reports,commission-rules}.js`
- `backend/scripts/{inspect-payments,verify-payments}.js`
- `backend/tests/payment-system.test.js`, this document
- `frontend/src/modules/customer/pages/CustomerRefunds.jsx`
- `frontend/src/modules/admin/components/CommissionRules.jsx`

Updated existing files:

- `backend/scripts/{migrate,process-booking-jobs,verify-customer-workspace}.js`, `backend/server.js`
- `backend/src/modules/customers/{workspace.payments,workspace.routes,workspace.operations}.js`
- `backend/src/modules/admin/{admin.routes,booking-finance,booking-jobs,booking-refunds.service,payouts.service,operations.service}.js`
- `backend/src/modules/bookings/bookings.service.js`, `backend/src/modules/quotations/quotations.service.js`
- `backend/src/modules/vendors/workspace.routes.js`, `backend/src/modules/notifications/admin-events.js`
- `frontend/src/modules/customer/pages/{CustomerCheckout,CustomerRecords}.jsx`
- `frontend/src/modules/customer/services/{checkout,checkout-state}.js`
- `frontend/src/modules/admin/pages/{PaymentManagementPage,FinancialDetails}.jsx`
- `frontend/src/modules/admin/components/CommissionConfiguration.jsx`, `frontend/src/modules/admin/navigation.js`
- `frontend/src/modules/vendor/pages/VendorEarningsPage.jsx`, `frontend/src/routes/AppRoutes.jsx`
- `frontend/tests/checkout-state.test.js`

Pre-existing working tree changes were preserved.
