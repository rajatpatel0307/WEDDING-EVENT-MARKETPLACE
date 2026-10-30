# Quotation system implementation and verification

## Existing architecture and reuse

The audit found `Quotations` and `QuotationItems` in the marketplace schema and `QuotationRequests` in migration 009. Customer and vendor workspace routers already provided quotation creation and decisions. Customers, vendors, events, catalogue packages/items, notifications, conversations, audit logs, payments and booking reservations already existed. Their authentication, response conventions, ownership helpers and parameterized repositories are reused.

Previously, sent quotations could be edited without a revision chain, and acceptance created a booking inside the same operation. An unavailable date could therefore prevent durable acceptance. There was no append-only quotation history, independent conversion, current-revision constraint or expiry reconciliation.

The implementation extends those existing records. Each revision is a separate `Quotations` row linked to its root and predecessor; it does not duplicate services, events, users, bookings, payments or conversations.

## Delivered behavior

- Customers request one or several eligible services from the same vendor, select their existing event/package and requested item quantities, review the request, track it, cancel a pending request and open an owned vendor conversation.
- Vendors search/filter/paginate assigned requests, ask for more information, reject with a reason, prepare drafts, preview server prices, send proposals and prepare revisions/counteroffers. A request can have one live proposal chain; cancelled unsent drafts can be replaced.
- The builder supports catalogue services, packages, service items, custom items and travel/setup/delivery/other fee lines. Every line is anchored to an owned service to satisfy the existing booking-item schema.
- Server calculations validate quantity and currency precision, discounts, tax rates and bounds. Calculations use integer paise, reject fractional paise and calculate advance and balance. Existing fixed-tax instructions remain supported for legacy callers; the new builder uses percentage tax rates.
- Customers see item snapshots, agreed event details, vendor/customer names, prices, advance/balance, terms, server-based validity display, version history/comparison and negotiation history. Decisions require an explicit confirmation dialog in the UI.
- Acceptance is committed independently. The new customer UI sends `convert:false`, then offers conversion as a separate action. The legacy decision endpoint retains its default accept-and-convert behavior, using separate transactions so a failed conversion preserves acceptance.
- Conversion rechecks ownership, current accepted revision, expiry, vendor/service/package eligibility, guest constraints and locked availability. It copies agreed prices, item/package descriptions, units, taxes, discounts, event/terms/policy snapshots and acceptance metadata. It creates a Pending, unpaid booking and uses the existing payment workflow.
- A second conversion returns the same booking. Existing `Booking.QuotationId` uniqueness remains the database safeguard. Payment success, booking confirmation and quotation acceptance remain separate.
- Customer/vendor dashboards and quotation pages display real quotation statistics. Lists support status, reference/name/service search, event date range, order and pagination. Converted and negotiating are derived views over the existing status model.
- Administrators inspect requests, quotations, versions, history and conversion links and append private administrative notes. They cannot edit agreed prices through these pages/APIs.
- Notifications are written transactionally to the existing notification tables. Customer/vendor notification lists link to quotation/request details. Existing private messaging and attachment validation are reused.
- Background reconciliation expires current sent/viewed or accepted-but-unconverted proposals, records history and notifies both parties. The 24-hour reminders are deduplicated and removed from future reminder candidate batches so they do not starve later quotations. Converted bookings are excluded.

## API map

Existing prefixes and mutation conventions are retained. Responses follow the existing customer/vendor envelope and direct admin response conventions.

| Role | Method and endpoint | Purpose |
|---|---|---|
| Customer | POST `/api/customer/quotation-requests` | Submit an owned-event request |
| Customer | GET `/api/customer/quotation-requests` | Filtered request history |
| Customer | GET `/api/customer/quotation-requests/:id` | Requirements, request history and proposals |
| Customer | POST `/api/customer/quotation-requests/:id/action` | Cancel a pending request |
| Customer | GET `/api/customer/quotations` | Filtered received proposals |
| Customer | GET `/api/customer/quotations/statistics` | Dashboard counts |
| Customer | GET `/api/customer/quotations/:id` | Items, versions, history, terms and allowed actions |
| Customer | POST `/api/customer/quotations/:id/decision` | Accept, Reject or Modify |
| Customer | POST `/api/customer/quotations/:id/convert` | Transactional, repeat-safe booking conversion |
| Vendor | GET `/api/vendor/quotation-requests` | Assigned request queue |
| Vendor | GET `/api/vendor/quotation-requests/:id` | Assigned requirements/history |
| Vendor | POST `/api/vendor/quotation-requests/:id/action` | Reject or request Information |
| Vendor | GET `/api/vendor/quotations` | Filtered proposal queue |
| Vendor | GET `/api/vendor/quotations/statistics` | Counts and current quotation value |
| Vendor | GET `/api/vendor/quotation-options` | Shared events, requests, owned packages/items |
| Vendor | POST `/api/vendor/quotations/preview` | Authoritative pricing preview without persistence |
| Vendor | POST `/api/vendor/quotations` | Create draft, sent proposal or new revision |
| Vendor | PUT `/api/vendor/quotations/:id` | Edit an owned draft only |
| Vendor | GET `/api/vendor/quotations/:id` | Proposal, versions and history |
| Vendor | POST `/api/vendor/quotations/:id/action` | Send or cancel |
| Admin | GET `/api/admin/quotation-requests` | All requests, with filters |
| Admin | GET `/api/admin/quotation-requests/:id` | Requirements and history |
| Admin | GET `/api/admin/quotations` | All current chains, with filters |
| Admin | GET `/api/admin/quotations/statistics` | Global statistics |
| Admin | GET `/api/admin/quotations/:id` | Items, revision/history and booking links |
| Admin | POST `/api/admin/quotations/:id/notes` | Audited internal note |
| Customer/Vendor | POST existing workspace `/conversations` | Reuse event-scoped conversation; vendor accepts one owned request/quotation/booking reference |

Revision and negotiation history are returned by the existing detail endpoints rather than duplicating history APIs. Revised proposals use POST quotations with `previousQuotationId` and a reason, or the assigned modification request. Sent predecessors remain unchanged. Only the current revision can be accepted.

## Database migrations and rollout

`017-quotation-lifecycle.js` adds root/predecessor/revision/current fields, request linkage, event/terms snapshots, currency, advance, sent/decision metadata and optional creation idempotency key/hash to `Quotations`. It extends item snapshots and request references and adds **one** append-only `QuotationHistory` table. Foreign keys, unique root/revision and current-root indexes, request references, history event keys and expiry/history indexes enforce the relationships.

`018-quotation-history-hardening.js` upgrades installations that already recorded 017. It installs the final triggers that prohibit edits/deletion of sent content, prevent returning sent records to Draft, prevent changes to sent items, and prevent rewriting/deleting history. It also fills missing idempotency columns/indexes for earlier 017 installations. Both migrations can be rerun safely in verification.

Unsent drafts, including cancelled drafts, stay private to vendors and administrators across details, list, related-request, event and generic-record endpoints. Legacy non-draft rows without creation hashes are backfilled with a sent timestamp because the older schema did not retain that distinction; historical snapshots that never existed cannot be reconstructed.

The connected database was inspected and already records migrations 015, 016 and 017. Migration 018 was tested inside rolled-back transactions; it was **not permanently applied by this work**. Back up the target database, then run `npm run db:migrate` from `backend` during deployment. The API startup guard requires 018 before serving the new lifecycle. The existing migration runner serializes migration execution.

Quotation expiry runs through the existing 60-second booking job runner (`BOOKING_JOBS_ENABLED` must not be false), or `node scripts/process-booking-jobs.js`. Backend/SQL time controls validity. The frontend countdown cannot authorize a decision.

## Security and transactional guarantees

JWT authentication, active role checks and approved-vendor checks are retained. Customer and vendor record ownership is bound in SQL; draft details are excluded from customer queries even after cancellation. Service/package/item membership and public eligibility are revalidated. `IsCustomQuoteAvailable` is enforced for requests; disabled custom-quote actions are explained in the new detail pages.

Inputs are validated with strict Zod schemas; owner/status/total overrides and unvalidated attachments are rejected. SQL identifiers are server-owned and user values are bound. Existing origin checks, error handling and session refresh remain in use. Quotation mutations are limited to 20/minute for customer and 25/minute for vendor routes in addition to workspace limits.

A root-scoped transaction application lock serializes decisions, revisions, expiry and conversion. Row/range locks and existing reservation locks protect state and availability. Creation keys detect exact retries versus conflicting payloads. Request row/event locks, pending-request checks, once-only history keys and conversion uniqueness prevent duplicate effects. Important changes write audit and history records in the same transaction. Internal notes and commission rates are omitted from customer views.

## Changed files for this quotation work

| Area | Files |
|---|---|
| Schema | `backend/migrations/017-quotation-lifecycle.js`, `018-quotation-history-hardening.js` |
| Lifecycle | `backend/src/modules/quotations/quotations.service.js`, `quotations.validation.js` |
| Customer integration | `backend/src/modules/customers/workspace.operations.js`, `workspace.routes.js`, `workspace.discovery.js`, `workspace.service.js`, `workspace.messaging.js` |
| Vendor integration | `backend/src/modules/vendors/workspace.operations.js`, `workspace.routes.js`, `workspace.service.js`, `workspace.messaging.js` |
| Admin/jobs/startup | `backend/src/modules/admin/admin.routes.js`, `booking-jobs.js`, `backend/server.js`, `backend/scripts/migrate.js`, `process-booking-jobs.js` |
| Quotation UI | `frontend/src/modules/quotations/QuotationBuilder.jsx`, `QuotationPages.jsx`, `quotation.api.js`, `quotations.css` |
| Customer UI | `frontend/src/modules/customer/pages/CustomerDiscovery.jsx`, `CustomerRecords.jsx`, `CustomerDashboard.jsx` |
| Vendor UI | `frontend/src/modules/vendor/components/WorkspaceForms.jsx`, `pages/VendorResourcesPage.jsx`, `pages/VendorDashboard.jsx`, `navigation.js` |
| Public detail action eligibility | `frontend/src/modules/marketplace/DetailPage.jsx` |
| Routing/admin navigation | `frontend/src/routes/AppRoutes.jsx`, `frontend/src/modules/admin/navigation.js` |
| Verification | `backend/tests/quotation-lifecycle.test.js`, `backend/scripts/verify-quotations.js`, updates to `verify-customer-workspace.js`, `verify-booking-lifecycle.js`, `frontend/tests/home-protection.test.js` |
| Documentation | This report and `README.md` |

The working tree also contains earlier customer-website work and concurrent administrator header/sidebar/layout changes. Those remain intact; this report does not attribute those independent changes to quotation implementation. No new runtime dependency was added.

## Verification

| Check | Result |
|---|---|
| Backend `npm test` | 155 passed, 0 failed, including 11 quotation validation/pricing/authorization tests |
| Frontend `npm test` | 15 passed, 0 failed |
| Production frontend build | Passed |
| Frontend lint | Exit 0; existing warnings remain outside the new quotation module |
| Home/shared-shell/assets fingerprint check | All 65 protected files unchanged |
| New quotation CSS isolation, including mobile/print rules | Passed |
| `node scripts/verify-quotations.js` | Passed against real MSSQL and customer/vendor/admin HTTP routes |
| `node scripts/verify-customer-workspace.js` | Passed, including signed payment settlement/replay and messaging/reviews |
| `node scripts/verify-booking-lifecycle.js` | Passed, including independent MSSQL reservation-lock sessions and booking/settlement regressions |
| `node scripts/verify-admin-bookings.js` | Passed, including refunds, provider-response verification and signed webhook replay |
| Desktop/tablet/mobile visual and keyboard comparison | Not run: in-app browser connection failed during bootstrap |

The dedicated quotation verification exercises a multi-service request, information-request deduplication, pricing/advance preview, creation replay/conflict, draft privacy including cancelled drafts, sent-edit rejection, foreign customer/vendor denials, modification and revised immutable items/terms, superseded acceptance denial, private admin notes, acceptance without booking, duplicate acceptance, blocked-date conversion preserving acceptance, price preservation after catalogue edits, once-only conversion, unpaid Pending booking, unavailable gateway handling, expiry, repeat-safe reminders, filtered/statistical/admin endpoints and shared conversations. Migrations 017/018 are rerun within the verification transaction.

All fixture records, notifications, audit/financial rows and verification DDL are rolled back. HTTP tests use injected fixture authentication adapters; production routers retain their real JWT middleware. No external provider charge/refund or email is sent. Existing payment regressions simulate provider responses only within verification and validate signed/amount-checked settlement on the backend.

## Remaining deployment and acceptance checks

Apply migration 018 through the runner after backing up the deployment database, then restart the API and keep reconciliation enabled. Browser QA remains required for the quotation forms/dialogs, authenticated navigation, keyboard use, mobile layouts and Home screenshots at desktop/tablet/mobile sizes after visiting the new routes. Source fingerprints and scoped CSS checks are evidence of preservation, not a substitute for a pixel comparison.

Run the configured gateway's real test-mode checkout and signed webhook delivery before production rollout. A missing gateway deliberately returns a clear unavailable-payment response; a redirect never proves payment. Notifications use the existing database inbox; separate email/SMS delivery and configurable response deadlines are not introduced. Request attachments use the existing authorized conversation workflow rather than a new upload/table system. Quotation printing uses the browser print dialog; no new PDF-generation service is added. Administrators can investigate through history and private notes; no separate reported-quotation case-management schema is invented.
