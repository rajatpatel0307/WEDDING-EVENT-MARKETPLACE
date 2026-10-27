# Admin workspace

The React workspace is at `/admin/dashboard`. It uses the existing admin role and
cookie session. Express serves its REST API at `/api/admin`. Routes, controllers,
services, validation, and repositories live in `src/modules/admin`.

## Run

1. Keep the existing MSSQL and authentication environment configuration.
2. Run `npm run db:migrate` in `backend`. The additive `004-admin-workspace`
   migration adds `EventGuests` and `PlatformSettings`; it preserves marketplace data.
3. Start the backend with `npm run dev` and the frontend with `npm run dev`.
4. Sign in with an administrator account. Existing accounts keep their roles.
   `npm run admin:create` is the existing interactive administrator provisioning tool.

The frontend derives the REST host from `VITE_GRAPHQL_URL`. Optionally set
`VITE_ADMIN_API_URL` to the full `/api/admin` base URL. `FRONTEND_URL` on the backend
must match the frontend origin. Do not put credentials in frontend environment variables.

## API

All endpoints require an active, verified administrator. Mutations also require
an exact `Origin: FRONTEND_URL` and `X-Admin-Request: 1`. Cookies are HttpOnly and
SameSite Strict, scoped to `/` for shared REST/GraphQL authentication. The frontend
refreshes an expired access token through the existing refresh operation and retries once.

| Method    | Path                                       | Behavior                                                                                                  |
| --------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| GET       | `/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD` | Eight KPIs, monthly analytics, category analytics, recent activity; maximum 366-day difference            |
| GET       | `/:resource`                               | Paginated safe projections; `q`, `status`, `from`, `to`, `page`, `pageSize`, `sort`, `direction`          |
| GET       | `/:resource/export`                        | CSV with the same filters, maximum 10,000 records; audited and formula-escaped                            |
| GET       | `/documents/:id/download`                  | Audited private document download; no storage paths returned                                              |
| POST      | `/vendors/:id/review`                      | `{status,expectedStatus,reason,note}`; locked, transactional update, audit and in-app vendor notification |
| PATCH     | `/:resource/:id/action`                    | `{action,expectedStatus,note}`; explicit resource action allowlist                                        |
| POST      | `/:resource`                               | Create a category, subcategory, coupon or offer                                                           |
| PATCH     | `/:resource/:id`                           | Edit a category, subcategory, coupon or offer; updated-at check where the schema supplies it              |
| GET / PUT | `/settings`                                | General platform settings, with audited writes                                                            |

Resources: customers, vendors, applications, documents, categories, sub-categories,
services, bookings, quotations, payments, refunds, payouts, commission, reviews,
wishlists, messages, notifications, coupons, offers, events, guests, media, audit-logs.

## Behavior and limits

- Customer blocking revokes sessions and cannot target admin accounts. Documents,
  services, reviews, categories, promotions and bookings support confirmed status actions.
- Booking transitions are restricted and recorded in `BookingStatusHistory`.
- Rejection requires a reason. Vendor decisions reject stale expected statuses
  with 409; admin notes are retained in the audit log, separate from vendor-facing reasons.
- Financial pages are read-only ledgers. No payment provider integration exists in
  this project, so this workspace does not initiate refunds or transfers, mark them
  settled, or change commission amounts. These require a provider integration and
  verified settlement webhooks before enabling money movement.
- Quotations, events, event guests, media, wishlists and messages are inspection/export
  views; their originating workflows retain ownership of record creation.
- KPI totals are all-time current-state totals. Changes compare additions in the
  selected period to the preceding equal-length period, not historical state snapshots.
  Today's bookings compare Indian calendar days. Gross collected revenue includes
  successful/refunded INR payments before refunds; category revenue is paid,
  non-cancelled booking item revenue and may differ from collected revenue.
- Reporting dates use Asia/Kolkata day boundaries and UTC database timestamps.
- No placeholder business rows or chart values are supplied. Empty data renders
  empty states or zero series; failed APIs render explicit retry/error states.
- The general platform settings are stored here; payment credentials, database
  credentials, access policy and tax rules remain server-managed.

## Verification

`npm test` covers access control, REST 401/403/500 behavior, origin enforcement,
validation, resource allowlists, and Indian day boundaries.

`node scripts/verify-admin.js` runs read-only queries for every resource and analytics.
`node scripts/verify-admin-mutations.js` verifies vendor approval/rejection, stale
status protection, notification/audit writes and category persistence with fixtures
inside a transaction that is always rolled back. It leaves no sample records.

`node scripts/verify-admin-http.js` checks real authenticated REST requests with
an existing verified admin and a temporary session that is removed afterward.

Frontend production check: `npm run build` in `frontend`.

# Customer details

Open **Customers → customer name** (or the view action) for `/admin/customers/:id`. The page provides Overview, Personal Information, Events, Bookings, Quotations, Payments, Reviews, Wishlist, Messages, Addresses, and Audit History. Tabs use the `tab` query parameter and support keyboard navigation. Records are paginated on the server.

Apply `npm run db:migrate` before deployment. Migration `006-customer-details` adds a nullable package target to wishlists, its foreign key, and updates the target check; existing vendor/service records are preserved.

All endpoints below require an active, verified administrator session. Mutations also require the configured frontend Origin and `X-Admin-Request: 1`. Customer IDs must be UUIDs belonging to a customer account. Password hashes, session credentials and payment gateway responses are never returned.

| Method | Path under `/api/admin`                              | Purpose                                                                                                                                      |
| ------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/customers/:id/details`                             | Header, lifetime summary and latest 30 activity milestones                                                                                   |
| GET    | `/customers/:id/records/:section?page=1&pageSize=20` | Customer-specific records; sections: `events`, `bookings`, `quotations`, `payments`, `reviews`, `wishlist`, `messages`, `addresses`, `audit` |
| PATCH  | `/customers/:id/details`                             | Edit first/last name, email, phone and date of birth with `expectedUpdatedAt` concurrency protection                                         |
| PATCH  | `/customers/:id/account`                             | `Activate`, `Deactivate`, `Block`, `Unblock`, with `expectedActive`, `expectedBlocked` and a required audit `note`                           |
| POST   | `/customers/:id/notifications`                       | Send an in-app notification with `title` and `message`; record its delivery in the audit log                                                 |

Block and deactivate revoke active sessions. Activation and block status are independent. Administrator accounts cannot be edited through customer endpoints. Email edits clear email verification and revoke sessions; phone edits clear phone verification. Mutations and their audit entries share a database transaction. The audit tab includes customer actions, account changes, and administrator actions on their bookings, events, quotations, reviews, payments and addresses.

Spending shows successful INR payment amounts; other currencies remain visible on individual payment rows without being summed into the INR card. Pending payments show positive outstanding booking balances, excluding cancelled, rejected and refunded bookings. Last login uses recorded `LOGIN` audit events, with `LastLoginAt` as a fallback. The quotation-request milestone uses quotation creation time because the current schema has no separate quotation request entity. The timeline shows up to 30 latest milestones. Dates and times display in IST.

Run `npm test` for security, validation and mutation checks. Run `node scripts/verify-customer-details.js` against a migrated database for integration verification. It creates temporary fixtures and rolls back all records, notifications and audit changes, including on failure.

## Vendor details

Open a vendor name or the view action under **All Vendors** or **Vendor Applications** for `/admin/vendors/:id`. This page has all 16 sections: Overview, Business Information, Documents, Services, Packages, Locations, Availability, Bookings, Quotations, Customers, Revenue, Payouts, Reviews, Offers, Messages, and Audit Logs. Tabs support deep links using `?tab=documents` and keyboard navigation. Record collections use server pagination. The existing schema supplies every field; no additional vendor migration is needed.

| Method | Path under `/api/admin`                            | Purpose                                                                                                               |
| ------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GET    | `/vendors/:id/details`                             | Business/owner header, categories, locations, lifetime KPIs and financial totals                                      |
| GET    | `/vendors/:id/records/:section?page=1&pageSize=20` | Vendor-scoped records; sections correspond to tabs, using `audit` for Audit Logs                                      |
| POST   | `/vendors/:id/review`                              | Existing approval/rejection/suspension workflow with `status`, `expectedStatus`, `reason`, `note`; notifies the owner |
| PATCH  | `/vendors/:id/account`                             | Set `active` with `expectedActive` and a required audit `note`; notifies the owner                                    |
| POST   | `/vendors/:id/documents/:documentId/review`        | Approve/reject a document with `status`, `expectedStatus`, `reason`, `note`                                           |
| GET    | `/vendors/:id/documents/:documentId/download`      | Audited private preview/download; requires that the document belongs to this vendor                                   |

All endpoints use the existing administrator role and mutation-origin protection. Approval requires owner email verification. Deactivation and suspension revoke active owner sessions. Vendor activation remains independent of the verification decision and owner account status. Document and account mutations use locked rows, stale-state checks and transactional audit writes; document rejection requires a reason. The document viewer retrieves a protected blob and revokes its preview URL when closed. Storage keys and private Cloudinary URLs are not exposed by the records API.

Revenue, commission, tax and net earnings are summed from `VendorPayouts`, using each entry's recorded deductions. Paid payouts include `Paid`; pending payouts include `Pending` and `Processing`. Amounts follow the marketplace's INR ledger convention. The Revenue tab separately displays successful INR customer collections from `Payments`; failed or foreign-currency payments do not enter that collections total. Payout entries are shown individually and are not inferred from booking value. Financial views are read-only and do not move money. Average rating uses published reviews; total reviews includes hidden reviews as well. Customers include anyone connected through bookings, quotations or conversations, including prospective customers without bookings.

Audit logs include owner actions and admin/vendor changes linked to the vendor, its owner, documents, services, packages, categories, locations, availability, bookings, quotations, payments, commissions, payouts, offers, reviews, conversations and messages. Old/new values are expandable, with credential and storage fields redacted. The API caps excessively deep or long audit values. All timestamps display in IST.

Run `node scripts/verify-vendor-details.js` for database integration checks. It verifies every record collection with nonempty fixtures, isolation from another vendor, prospective customers, financial totals, private document viewing/review, approval/rejection/suspension, activation, session revocation, notifications and audit redaction. All database fixtures and mutations roll back, and the temporary local test PDF is removed.

## Vendor approval workflow

Run `npm run db:migrate` before deploying this workflow. Migration `007-vendor-verification` adds `Vendors.VerifiedAt`, `VerifiedBy`, `VerificationCycle` and the append-only application history table `VendorVerificationHistory`. Existing audit logs and vendor records are retained; historical approval timestamps are not invented. New signup vendors start inactive until approved.

The dedicated review page is `/admin/vendors/pending`; `/admin/applications` redirects there. It supports business/owner/email search, category, city, registration-date range, aggregate document status and verification-status filters. By default, both Pending and UnderReview applications appear. Document status is Missing when there are no files, Rejected when any file is rejected, Pending when any remaining file is pending, otherwise Approved. Sidebar and dashboard counts refresh after decisions.

| Method | Endpoint                                 | Request                                                                                         |
| ------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| PUT    | `/api/admin/vendors/:id/start-review`    | `{ "notes": "Review started" }`                                                                 |
| PUT    | `/api/admin/vendors/:id/approve`         | `{ "notes": "All vendor documents verified successfully." }`                                    |
| PUT    | `/api/admin/vendors/:id/reject`          | `{ "reason": "Invalid business documents", "notes": "Please upload a valid GST certificate." }` |
| PUT    | `/api/admin/vendors/:id/suspend`         | `{ "reason": "Compliance review", "notes": "Additional checks required" }`                      |
| PUT    | `/api/admin/vendors/:id/reapply`         | `{ "notes": "Corrected documents received" }`                                                   |
| GET    | `/api/admin/vendors/pending`             | Paginated queue and category/city filter options                                                |
| GET    | `/api/admin/vendors/pending-count`       | Global Pending + UnderReview count                                                              |
| GET    | `/api/admin/vendors/:id/records/history` | Paginated verification history, with cycle number and original reasons/notes                    |

Decision requests optionally accept `expectedStatus` and `expectedUpdatedAt`; the frontend sends both from a fresh confirmation snapshot. All mutations run with locked vendor and owner rows. Successful decisions return `{ "success": true, "message": "Vendor approved successfully", "data": { "vendorId": "...", "status": "Approved", "isActive": true, "cycle": 1, "verifiedAt": "..." } }`. Rejection uses `Vendor rejected successfully` and status `Rejected`. Errors use `{ "success": false, "message": "...", "data": null }` with 400, 401, 403, 404, 409 or 500 as applicable.

Pending applications may enter UnderReview explicitly. An approval/rejection from Pending records an UnderReview milestone in the same transaction before recording the final decision. UnderReview may become Approved or Rejected. Approved may become Suspended; Suspended may become Approved. Deactivation uses the existing account endpoint, leaving verification Approved while setting `IsActive=0`. Approval sets `IsActive=1`, `VerifiedAt`, and `VerifiedBy`; rejection and suspension disable the vendor and revoke owner sessions. Approval requires an active, unblocked owner with verified email. Document-review counts are shown in the confirmation; final approval remains an administrator decision.

Rejected vendors cannot be approved directly. The administrator's Reopen Application action starts a new cycle in UnderReview and clears the current verification timestamp; old reasons, notes and decisions remain in history and audit logs. The workflow never deletes the vendor, documents, bookings or historical records. The legacy REST review and GraphQL review mutations delegate to the same transition service and cannot bypass these rules. Legacy rejection calls must now include admin notes (`note` in legacy REST, `notes` in GraphQL).

Each decision atomically writes vendor state, history, audit and an in-app notification. Rejection notifications include the reason and correction notes; the complete text is retained in history/audit, and notification text is bounded to the schema's 2,000-character limit. Approval notes are internal. Suspension and deactivation revoke sessions. No email delivery is assumed: notification delivery uses the application's Notifications table.

Backend enforcement applies to the GraphQL `vendorWorkspace` query and every route mounted under `/api/vendor`, including `GET /api/vendor/workspace`. Authentication reloads the user and vendor from the database; `requireApprovedVendor` checks an active Vendor role, a vendor record, status Approved and an active vendor account. Rejected, suspended, pending, under-review or inactive vendors are denied even if the caller bypasses frontend routes. Account/status metadata remains available to signed-in vendors so they can inspect their application. Frontend guards and navigation also account for inactive vendors.

Run `npm test` and `node scripts/verify-vendor-workflow.js` for verification. The latter exercises the real HTTP API and SQL database with temporary fixtures: response contracts, filters/counts, all status transitions, approval timestamps, rejection validation, conflict errors, REST/GraphQL access checks, retained cycles, audit and notifications. All fixtures and decisions are rolled back.
