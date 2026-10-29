# Admin dashboard and operations

This extends the existing React/Tailwind/Lucide admin workspace and Express/MSSQL REST API. The customer/vendor detail pages, independent approval queues, service studio, booking management, private document viewer, JWT authentication, session refresh, API client, generic record tables, confirmation dialogs, audit log and refund worker remain the shared implementation. Production pages use database data; fixtures exist only in tests.

## Rollout

1. Inspect and back up the existing database using the deployment process.
2. Run `npm run db:migrate` from `backend`. Migration `014-admin-operations` extends **VendorPayouts**, adding review status/reason/reviewer/time, a financial ledger fingerprint, settlement reference, settlement idempotency key and an update timestamp. Filtered unique indexes protect settlement keys and references. No duplicate financial tables are created. Existing financial amounts and payment statuses are preserved.
3. Install frontend dependencies with `npm ci`, then run `npm run build`. Recharts supplies dashboard trend and distribution charts.
4. Preserve the configured JWT, exact `FRONTEND_URL`, MSSQL and Razorpay refund-worker settings. Mutation requests require the trusted Origin and `X-Admin-Request: 1`.
5. Payout review works independently of settlement configuration. Set `PAYOUT_SETTLEMENT_MODE=manual` **only when the operator has an approved external payout procedure**. This application does not initiate bank transfers. Do not enable manual settlement merely to remove the configuration message.

Migration 014 was verified inside rollback transactions. It has not been applied permanently by this task. Review metadata on historical payout rows starts Pending; historical approval actors/times are not invented.

## Pages and shared components

- `/admin/dashboard`: all requested lifetime KPI dimensions, current/previous-period comparisons, monthly revenue/bookings/registrations/commission, booking/payment/category distributions, current payout distribution, category totals and recent activity. Revenue is gross confirmed INR collections, including payments later refunded; it is not net profit. Pending payment/refund amount cards use INR. Count cards use records. Date filters use IST calendar boundaries.
- Existing customer and vendor lists now include identifiers, booking totals and spending/earnings; vendor account activation remains separate from verification. Existing detail pages provide permitted profile edits, account actions, business records, private documents and audit history. Vendor details also expose Categories, Payments, Coupons and Approval History as separate tabs, plus independent internal audit notes that do not change account or verification status.
- Category/subcategory pages use the existing `Categories` and `SubCategories` resources. `CategoryCode`/`SubCategoryCode` are the existing unique code/slug fields; `IconName` and `SortOrder` are reused. Duplicate codes/names and invalid parents are rejected. A used subcategory cannot move to another parent, and activating a subcategory requires an active parent. Deactivation dialogs show service usage. Inactive categories are excluded from customer discovery, direct service lookup and new booking eligibility; historical booking and financial records are retained.
- Category selections in signup, public navigation and service forms come from the active database catalogue. Built-in `AUTH_SERVICE_*` codes remain stable so display-name edits preserve the 17 category-specific schemas. Custom categories use the standard service form with strict empty category attributes. Category management does not need another category table.
- `/admin/finance/:kind/:id`: detailed quotations, payments, refunds, payouts and commission. These reuse the underlying tables and link to the existing booking ledger, vendor details and original payment. Related transactions, quotation items, linked bookings/refunds and administrative notes/history are shown. Agreed quotation and captured payment amounts are read-only. Raw gateway responses, transaction payloads, tokens and bank account data are excluded.
- `/admin/notifications`: paginated inbox scoped to the signed-in administrator, unread count, read/unread changes and record links. Registration, service submission, booking, payment failure, refund initiation and payout events reuse `Notifications`; new events are recorded in the same transaction as the business action. Historical notifications are not fabricated.
- `/admin/commission`: the existing commission ledger and CSV export, plus an audited default percentage configuration. Category filtering applies to associated booked services; date filtering supports monthly reporting. The existing dashboard supplies monthly commission trends.
- `/admin/profile` and `/admin/settings`: existing profile/settings workflows, linked from the header and sidebar.

Navigation has Overview, Users & Vendors, Marketplace, Transactions and System groups. Groups collapse independently; the existing desktop/mobile sidebar toggle remains. The header adds bounded real-record search, an unread notification dropdown and the current IST date. Financial detail routes retain the relevant sidebar highlight. Existing responsive tables, loading/empty/error states, keyboard-accessible native dialogs and toasts are reused.

## New and extended APIs

All paths are under `/api/admin` and require a live, verified, active administrator.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD` | Extended real-data KPIs, charts and activity; maximum one-year range |
| GET | `/search?q=...` | Bounded customer/vendor/service/booking/payment/quotation search; literal wildcard escaping |
| GET | `/notifications/inbox?page=1&pageSize=20` | Own notifications, total and unread count |
| PATCH | `/notifications/:id/read` | `{read:boolean}`; recipient ownership is checked inside the transaction |
| GET | `/finance/:kind/:id` | Explicit safe projections for quotations, payments, refunds, payouts or commission |
| POST | `/finance/:kind/:id/notes` | Append an internal audit note without changing agreed financial values |
| POST | `/vendors/:id/notes` | Append a vendor administration note without changing approval or account status |
| POST | `/payouts/:id/decision` | Reviewed payout workflow described below; limited to 15 actions/minute |
| GET | `/commission/configuration` | Current default rate, concurrency timestamp and change history |
| PUT | `/commission/configuration` | `{rate,note,expectedUpdatedAt}`; transaction, concurrency check and audit |

Existing generic list/export APIs gain identifier searches and bounded category/location/gateway filters where relevant. The category/subcategory create/edit/status APIs gain parent, uniqueness, display-order and icon support. Existing approval, booking cancellation, policy review and gateway refund APIs are reused.

## Changed source map

| Area | Main files |
| --- | --- |
| Admin queries and validation | `src/modules/admin/admin.analytics.js`, `admin.repository.js`, `admin.resources.js`, `admin.service.js`, `admin.validation.js` |
| Operations and finance | `src/modules/admin/operations.service.js`, `payouts.service.js`, `commission.service.js`, `booking-finance.js`, `vendor-details.service.js`, `admin.routes.js`, `admin.controller.js` |
| Notifications and categories | `src/modules/notifications/admin-events.js`, auth signup/security, vendor service templates/metadata, customer discovery/booking eligibility and public catalogue |
| React admin | `frontend/src/modules/admin/AdminLayout.jsx`, `navigation.js`, `admin.css`, analytics/tables/pickers, dashboard/vendor detail pages, new `FinancialDetails.jsx`, `AdminInbox.jsx`, `CommissionConfiguration.jsx`, `notification-links.js` and route/API wiring |
| Catalogue consumers | Signup, public navigation/footer, marketplace and home category tabs; frontend package files add Recharts |
| Database and verification | `migrations/014-admin-operations.js`, `scripts/migrate.js`, `scripts/verify-admin-operations.js`, `scripts/verify-admin.js`, admin/approval/template tests and `frontend/tests/admin-notifications.test.js` |

Backend paths above are relative to `backend/`; frontend paths are relative to the repository root. Existing customer/vendor modules and tables remain shared.

## Payout safeguards and procedure

The request accepts `action`, `expectedUpdatedAt`, a mandatory `note`, and a settlement `reference`/`idempotencyKey` when appropriate. Client amounts, vendor identities and calculated net totals are rejected.

1. Review: `approve`, `hold` or `reject`. Approval records the acting admin, note and fingerprint of the current ledger. Approval leaves the payment status Pending; it does not pay the vendor.
2. `start-settlement`: enabled only in manual mode. Rechecks the ledger and atomically reserves the payout as Processing **before** an operator starts the approved external procedure. Existing refund logic blocks refunds against in-flight or paid payouts.
3. `confirm-paid`: records a confirmed successful external reference. Requires Processing, a matching reviewed ledger and an idempotency key. The exact successful replay returns the existing result before stale-version checks; changed keys/references cannot pay an already-paid record. Unique reference/key indexes prevent cross-record reuse.
4. `record-failure`: records an externally verified failure reference and reason, releases Processing into Failed/OnHold and requires a new approval before retry. Do not record failure while the external outcome is unknown.

Eligibility checks use locked booking and financial rows. They require a completed booking, one reconciled payout row, recorded commission, sufficient confirmed INR captures, no pending refund, matching gross/commission/refund deductions and an exactly matching positive server-calculated net amount. Disputed, underpaid, duplicate or inconsistent ledgers fail closed. Paid payouts cannot be edited. Reviews and results are audited, and the vendor and administrators receive in-app updates. Full bank details are neither required nor exposed. Vendor notifications contain status updates; internal payout review notes stay in the administrator ledger. Failed external settlements also create an explicit administrator alert.

## Commission history

The default percentage is stored in the existing `PlatformSettings` row `bookingCommissionPercent`. The environment value `BOOKING_COMMISSION_PERCENT` remains the fallback when the database has no configured value. Booking creation captures the applicable rate in `Booking.PolicySnapshotJson`; completion uses that snapshot and stores the actual rate/amount in `PlatformCommission`. Editing today's configuration does not rewrite historical snapshots, completed commission entries or payouts. The configuration endpoint requires a reason and expected update timestamp.

The current financial model supports a default percentage. Category/vendor overrides, fixed-fee schedules and future-dated rules are not modeled; the UI does not offer controls that pretend those capabilities exist. There is no direct API to silently amend a quotation price, mark a payment successful, or mark a refund completed. Refund eligibility, idempotent initiation, retry, gateway confirmation and verified webhook replay remain in the existing booking/refund module.

## Verification and limits

Run:

```powershell
cd backend
npm test
node scripts/verify-admin-operations.js
node scripts/verify-admin-bookings.js
node scripts/verify-admin-services.js
node scripts/verify-vendor-details.js
node scripts/verify-customer-details.js
node scripts/verify-customer-workspace.js
node scripts/verify-vendor-workspace.js
node scripts/verify-admin-mutations.js
node scripts/verify-admin-http.js
node scripts/verify-admin.js
node scripts/verify-vendor-workflow.js
node scripts/verify-service-management.js
cd ../frontend
npm test
npm run build
```

Verified in this workspace: 131 backend tests, 10 frontend tests, all 12 MSSQL/API verification scripts above, and the production frontend build passed.

The operations verifier applies migration 014 inside a rollback transaction, creates isolated users and real ledger records, and checks REST authorization, dashboard SQL, search, inbox ownership/read state, financial projections/notes, category edits/relationships, dynamic service schemas, commission snapshots and payout review/reservation/failure/retry/idempotent confirmation. It never transfers money. Other verifiers cover independent approvals, existing customer/vendor access restrictions, booking/refund provider behavior and service management. Every fixture and schema change is rolled back.

Browser visual/interaction QA could not run because the browser connection failed during initialization. Desktop/tablet/mobile layouts therefore still need a browser smoke test. Live gateway transfers and real Cloudinary uploads were not performed. The production build succeeds. Targeted frontend lint completed without errors; existing React hook/style warnings remain. Apply migration 014 through the deployment process before using payout detail/review endpoints.
