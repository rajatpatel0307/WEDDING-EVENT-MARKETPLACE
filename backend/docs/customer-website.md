# Customer website implementation report

Verified 30 October 2026 against the existing React/Tailwind, Express/JWT and MSSQL project. Work extends the existing repository and customer workspace. It does not publish a separate Site, replace authentication, introduce production mock data or create parallel booking/payment modules.

## Protected Home Page

The finalized Home Page, all Home components, navbar/header/footer, shared public cards, global styles, public GraphQL query definitions, branding and assets were left unchanged. No sections, images, typography, spacing, effects or responsive rules were changed. Existing Home links now reach functional discovery/detail routes without changing the links or their appearance.

`frontend/tests/fixtures/home-protected.json` records the initial fingerprints of 65 protected files, including all assets. `home-protection.test.js` verifies their contents and checks that every new marketplace CSS selector stays within `.customer-marketplace`. New styles are loaded with the new routes; they do not target `html`, `body`, existing Home selectors or global typography. The root Home route still renders the same HomePage inside PublicPage.

**Verification limit:** the in-app browser connection failed before a session could be established. Desktop/tablet/mobile screenshots and interaction comparisons were not obtained. Source/asset/style protection passed; this is not a claim of completed pixel comparisons or browser accessibility QA. Responsive rules for the new pages were built and checked statically, but need browser/device verification.

## Initial audit and reuse

| Area | Existing implementation | Work completed |
|---|---|---|
| Home and public shell | Database-backed GraphQL Home, finalized hero/categories/collections, navbar and footer | Protected without edits |
| Public discovery | Capped featured collections; service listing sometimes displayed categories/vendors; detail pages incorrectly said checkout was not live | Added real paginated service/vendor/package discovery and complete public details, retaining Home's GraphQL API |
| Private customer workspace | Dashboard, discovery, wishlist, events, guests, quotations, bookings, payments, reviews, messages, profile/addresses/settings | Extended these modules and reused their clients, forms, dialogs, status badges, permissions and transactions |
| Booking | Migration 015 lifecycle, immutable pricing, availability locks, changes, refunds and payouts | Reused unchanged business workflows; linked discovery to secure booking/quote actions |
| Payments | Razorpay order creation, server capture verification, signed webhooks and idempotent settlement | Added checkout/status screens and scoped transaction details; reused the existing gateway implementation |
| Guest planning | Single event date, simple name/email/phone/RSVP guest records | Added event metadata, guest groups/attendees/invitation/preferences/notes, filters/pagination, export and archive rules |
| Reviews and messages | Completed-booking eligibility, duplicate-review prevention, private cursor-paginated messaging and attachments | Added service-specific public review ordering, related-record links and fixed the attachment download route |

Inspected actual live MSSQL columns for Events, EventGuests, Services, Wishlists and PaymentTransactions before verification. These confirmed that the event/guest additions were genuinely missing. Existing Services, Vendors, Categories/SubCategories, ServicePackages/PackageItems, ServiceItems, VendorAvailability, Booking/BookingItems/BookingStatusHistory, Quotations/QuotationRequests/QuotationItems, Payments/PaymentTransactions/Refunds, Reviews, Media, Conversations/Messages, Addresses, Notifications and user/role records remain the data sources.

## Delivered pages and behavior

- `/services`, `/venues`, `/vendors`, `/packages`, `/offers` and `/search`: database-backed discovery, grid/list modes, URL filters, debounced keywords, category/subcategory/location/price/rating/date/guest/type criteria where applicable, allowlisted sorting and server pagination. Venue navigation starts in Venue & Location. Keyword and filters remain combined during pagination. Mobile filters use a native modal dialog; chips/reset and meaningful loading/error/empty states are included.
- Service comparison keeps up to three selected services across listing pagination and compares real names, vendors, prices, locations, ratings and guest limits. It is a local shortlist, not a separate database entity.
- `/services/:id` and `/venues/:id`: gallery, service/vendor links, coverage, typed attributes, packages, inclusions/add-ons, advisory availability calendar, cancellation/refund/rescheduling terms, sorted published reviews, sharing, wishlist and secure booking/quotation handoff.
- `/vendors/:id`: approved business profile, cover/logo, categories, served locations, published services and reviews. Personal account details, documents, approval notes and payout data are omitted. Contact happens through authenticated platform messaging.
- `/packages/:id`: resolves the active package to an eligible service and preserves package selection for the booking flow.
- `/customer/discover`: reuses the same discovery interface and query implementation inside the existing private workspace. Customer actions still require verified customer authentication; a public listing does not grant access to private APIs.
- Wishlist persistence, removal and unavailable-item management reuse the existing Wishlists API and private wishlist page. Public cards/details can add approved services, packages and vendors. Saves refresh account counts.
- Customer event creation/editing includes end date and optional bride/groom names alongside existing start date, paired times, location, guest count, budget and description. Event details show linked bookings, quotations, committed amounts and captured payments from server records. Upcoming event selection excludes archived/past events.
- Archive is a confirmed, audited soft transition to the existing Cancelled event status. Active bookings/quotation requests/proposals must be resolved first; history is retained. Archived/completed guest lists are read-only.
- Guest management includes name/contact, family/group, invitation state, RSVP, attendee count, dietary preferences and private notes. Search/RSVP filters and 50-row pagination run on the server. Overall attendee/confirmation totals do not depend on the current page. Owner-only CSV export uses the existing formula-safe CSV escaping helper.
- Booking uses the existing server review/digest, package/add-on/coupon snapshots and transaction-owned reservation locks from migration 015. No client-side total or payment-success redirect is authoritative. Existing cancellation/reschedule requests, history and refund status remain available on booking details.
- Quotation requests now have a review step before submission. Event and package preferences remain linked to their existing records; no automatic confirmation or charge occurs. Quotation details show stored revision requests. Existing ownership, expiry, state and acceptance checks remain in force.
- `/customer/bookings/:id/checkout` provides review, processing, pending, failed-attempt and server-verified success views. The optional `checkout/:result` path is supported but its URL cannot assert success. Only the backend's Paid status produces the success screen. Pending attempts poll server status; late verified payment can supersede a failed attempt. Gateway-disabled, cancelled and unaccepted bookings cannot open payment. The configured workflow collects the full outstanding balance and displays the recorded advance and policy terms explicitly.
- `/customer/payments/:id`: owner-scoped transaction/reference, method, amount/currency, status, recorded transaction history and refunds. Raw provider responses/card data are not returned.
- My Bookings adds server-backed All/Pending/Confirmed/Upcoming/Completed/Cancelled tabs. Checkout links and transaction links use the same booking/payment records.
- Review submission continues to require an eligible completed booking and prevents duplicates. Service review queries now follow the service's BookingItems relationship rather than displaying every review for the vendor. Vendor review summaries remain vendor-specific.
- Existing message polling, membership checks, read/unread state, earlier-message cursors and validated private attachments remain in use. Related booking/event links were added, and the customer download button now uses the existing `/file` endpoint instead of an invalid `/attachment` URL.
- Existing profile/photo/address/password/recovery/verification flows were retained. Customer login resumes an allowlisted local customer destination; vendor/admin login destinations remain their own dashboards. No JWT storage change was made.

Optional workflows without an existing implementation or configured policy were not invented: event-image/review-image uploads, customer review deletion/moderation, event checklists, legal-policy authoring and automatic incremental charges for price-changing reschedules. Guest export is provided; a new invoice-generation system is not introduced. Service-day exclusivity and refund/payout policies remain those documented in `booking-lifecycle.md`.

## API endpoints

Public read endpoints are mounted at `/api/marketplace`, with a 100-per-minute limit, validated filters, safe errors and no private account fields. They share the existing customer discovery query functions; protected wrappers continue to enforce the customer role.

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/marketplace/catalog` | Active categories/subcategories and eligible business cities |
| GET | `/api/marketplace/discover` | Combined filters, stable allowlisted sorting and pagination for services/packages/vendors/offers |
| GET | `/api/marketplace/services/:id` | Eligible service details, gallery, packages/items, public policies and scoped reviews; `reviewSort=newest|highest|lowest` |
| GET | `/api/marketplace/services/:id/availability?from=YYYY-MM-DD` | 31 advisory days, respecting service schedule/overrides and active service-day commitments; no other customer's booking identifiers |
| GET | `/api/marketplace/vendors/:id` | Public business fields, locations/categories, services and published reviews |
| GET | `/api/marketplace/packages/:id` | Active package-to-eligible-service resolution |
| GET | `/api/customer/catalog`, `/discover`, `/services/:id`, `/vendors/:id` | Existing private paths extended through shared discovery logic |
| POST / PUT | `/api/customer/events`, `/events/:id` | Existing event create/update extended with metadata and validation |
| GET | `/api/customer/events/:id?q=&rsvp=&guestPage=1` | Existing owner-scoped overview extended with paginated guests, total guest stats, quotations and authoritative financial summaries |
| POST | `/api/customer/events/:id/archive` | Guarded, audited archive; no physical deletion |
| POST / PUT / DELETE | `/api/customer/events/:id/guests[/:guest]` | Existing owned guest operations extended with validated metadata |
| GET | `/api/customer/events/:id/guests/export` | Owned, formula-safe UTF-8 CSV |
| GET | `/api/customer/records/bookings?status=Upcoming` | Existing private list; supported status tabs and pagination |
| GET | `/api/customer/records/events?status=Upcoming` | Active future events for booking/quote selection |
| GET | `/api/customer/payments/:id` | Owned transaction/ledger/refund details |
| GET | `/api/customer/quotations/:id` | Existing quotation detail plus stored revision requests |
| GET | `/api/customer/conversations` | Existing list plus related booking/event IDs, still bound to the authenticated customer |

Discovery query parameters: `q`, numeric `category`/`subcategory`, `city`, `min`, `max`, `rating`, optional ISO `date`, `guests`, `serviceType`, `sort`, `type`, `page`, `pageSize`. Public URLs with named categories are resolved through the database catalog by the frontend. Vendor discovery exposes its supported business/category/location/rating criteria rather than treating service prices as vendor prices.

All booking, quotation-request/decision, wishlist, payment-order/verification, review, message, private-attachment, profile and address mutation endpoints reuse the existing customer router. Its role, origin/header validation and mutation limits are preserved. Financial writes still use backend calculation, transactions, verified provider data and idempotency protections.

## Migration and rollout

Migration `016-customer-website.js` extends existing tables only:

- Events: nullable `EndDate`, `BrideName`, `GroomName`; a constraint prevents end dates before the start date.
- EventGuests: `GroupName`, nullable `InvitationStatus`, `Attendees` (default 1), `DietaryPreferences`, `Notes`; constraints bound attendee counts to 1–100 and known invitation values. Legacy invitation state remains unrecorded instead of fabricating that an invitation was sent.

There are **no new business tables or dependencies**. Migration 016 is registered after 015 in the existing serialized migration runner and was tested for safe repeated execution inside the rollback-only verification transaction.

The configured database has not been migrated by this task. Follow the README's inspection/backup requirement, then run `npm run db:migrate` from `backend` and deploy backend/frontend together. Migration 015 from the booking work is also required. Do not deploy queries that expect the new columns before applying the migrations.

## Files

Created:

- `backend/migrations/016-customer-website.js`
- `backend/src/modules/customers/marketplace.routes.js`
- `backend/tests/customer-website.test.js`
- `frontend/src/modules/marketplace/api.js`, `BrowsePage.jsx`, `DetailPage.jsx`, `marketplace.css`
- `frontend/src/modules/customer/pages/CustomerCheckout.jsx`
- `frontend/src/modules/customer/services/checkout-state.js`
- `frontend/tests/home-protection.test.js`, `fixtures/home-protected.json`, `customer-return.test.js`, `checkout-state.test.js`
- `backend/docs/customer-website.md`

Modified:

- `backend/src/app.js`, `backend/scripts/migrate.js`, `backend/scripts/verify-customer-workspace.js`
- `backend/src/modules/customers/workspace.discovery.js`, `workspace.service.js`, `workspace.routes.js`, `workspace.operations.js`, `workspace.messaging.js`
- `frontend/src/modules/customer/pages/CustomerDiscovery.jsx`, `CustomerEvents.jsx`, `CustomerRecords.jsx`, `CustomerMessagesPage.jsx`
- `frontend/src/modules/customer/services/checkout.js`
- `frontend/src/modules/auth/pages/LoginPage.jsx`
- `frontend/src/routes/AppRoutes.jsx`, `ProtectedRoute.jsx`, `authNavigation.js`
- `README.md`

Home/shared-shell protected files are deliberately absent from this change list. Existing empty legacy public/vendor page stubs and the Home's featured GraphQL endpoints were not duplicated or repurposed as separate mutation modules.

## Verification

| Check | Result |
|---|---|
| Backend `npm test` | 144 passed, 0 failed |
| Frontend `npm test` | 14 passed, 0 failed |
| Frontend production build | Passed |
| Frontend lint | Exit 0; warnings remain in the repository, including URL-input synchronization hooks |
| Protected Home/shared-shell/assets fingerprints | All 65 passed |
| New CSS scope test | Passed |
| `node scripts/verify-customer-workspace.js` | Passed against MSSQL and customer/vendor/public HTTP routers |
| `node scripts/verify-booking-lifecycle.js` | Passed; reservation-lock contention, snapshots, changes, settlement and completion |
| `node scripts/verify-admin-bookings.js` | Passed; refund/payout/provider-response/webhook replay regression coverage |
| Desktop/tablet/mobile browser comparison | Not run: browser connection could not be established |

The customer verification exercises anonymous public discovery/detail reads; combined filters, invalid inputs and private-field omission; customer role/ownership denials; event metadata and guest search/counts; event archive rules; wishlist persistence; vendor quotations; booking creation; both sides of messaging; profile/addresses; signed and amount-checked payment settlement and duplicates; owned transaction details; and eligible/duplicate reviews. Test fixtures, notifications, schema changes and financial rows all roll back. Provider network responses are simulated only in verification; no external payment/refund or email is sent.

The final local verification run measured nine public API checks at **31.1 ms median / 187.3 ms p95**. These are actual local fixture-request measurements, including validation/error cases; they are not production throughput or page-load claims. Browser page-load performance remains unmeasured.

Outstanding checks before rollout: database backup/migration, authenticated browser/device/keyboard QA (including Home visual comparisons after visiting new routes), real Razorpay test-mode callbacks/webhook delivery and any configured SMTP/background-job delivery. Optional unsupported workflows listed above remain outside the current schema/policy-backed implementation.
