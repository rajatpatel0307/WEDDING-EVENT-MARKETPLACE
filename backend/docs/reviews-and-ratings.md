# Reviews and ratings

Media migration 025 now centralizes review-photo storage, decoding, moderation and cleanup. See [Media management](media-management.md) for the current image pipeline; the review eligibility, rating, response and report rules below remain applicable.

The module reuses `Reviews`, `ReviewImages`, `Booking`, `BookingItems`, the JWT session middleware, Cloudinary, `AuditLogs`, the notification center, and the shared communication socket. It does not change the Home Page, navbar, footer, global stylesheet, or shared layout components.

## Running it

From `backend`:

```powershell
npm run db:migrate
npm test
node scripts/verify-reviews.js
node scripts/reconcile-review-ratings.js
```

From `frontend`:

```powershell
npm test
npm run build
```

Restart the backend after updating its source. Existing authenticated navigation links open `/customer/reviews`, `/vendor/reviews`, and `/admin/reviews`. `/admin/review-reports` opens the same moderation workspace with the report history section. Public vendor, service, and package detail pages include the review component; customer booking details open the complete submission form.

## Configuration

| Variable                                       | Purpose                                                                                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `REVIEW_EDIT_DAYS`                             | Optional; defaults to 14, clamped to 0–365 days. Applies to customer reviews and vendor response edits from their original creation time. |
| `CLOUDINARY_CLOUD_NAME`                        | Existing server storage account.                                                                                                          |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Existing server-only Cloudinary credentials.                                                                                              |
| `FRONTEND_URL`                                 | Existing allowed origin, including the port. Defaults to `http://localhost:5173` for review routes.                                       |
| Existing MSSQL and JWT/session settings        | Reused without introducing another database or authentication service.                                                                    |
| `VITE_GRAPHQL_URL`                             | Existing frontend API origin; review requests derive `/api` from it. Defaults to `http://localhost:5000/graphql`.                         |

No additional dependencies, cloud providers, or frontend secrets are required.

## Eligibility and rating policy

The current database has one vendor per booking and multiple service/package booking items. The backend derives customer identity from the JWT session and vendor/service/package ownership from the booking and selected booking item. A review requires a booking owned by the customer with `BookingStatus='Completed'`. Cancelled, rejected, refunded, unfinished, foreign, and mismatched booking-item targets fail validation.

Omit `bookingItemId` for an overall vendor review. Provide a booked item ID for a service/package experience. The unique database index `(BookingId, VendorId, BookingItemId)` and a locked booking transaction prevent duplicates, including duplicates after soft deletion. Customer/vendor/service IDs cannot be supplied as ownership overrides.

All submissions enter `Pending`. Eligible public reviews must be approved, published, verified, undeleted, and still associated with a completed booking owned by the same customer/vendor. The central `publicPredicate()` is shared by public review queries, ratings, discovery, and management performance views.

- **Vendor rating:** only overall vendor reviews (`BookingItemId IS NULL`).
- **Service rating:** only reviews explicitly assigned to that `ServiceId`, including package experiences for that service.
- **Package rating:** only reviews assigned to that exact `PackageId`.

The backend computes `AVG(CAST(Rating AS decimal))` and counts from eligible rows. It never copies a vendor review into all services on a booking or accepts frontend aggregate values. Vendor cache columns are recalculated inside moderation/edit/delete transactions with a vendor lock. Service/package summaries are calculated directly from source reviews. Reconciliation rebuilds vendor caches and should also be run after external database maintenance that changes completed-booking eligibility.

Customers can edit pending/approved reviews within the configured window. Edits immediately withdraw publication and require fresh moderation. Hidden, flagged, rejected, deleted, or expired reviews cannot be edited. Owners can withdraw undeleted reviews at any time. Deletion is soft, revokes public image access, preserves moderation/audit history, and does not free the target for a replacement review.

## Permissions

| Actor                  | Allowed                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public visitor         | Approved eligible review listings, separate summaries, and approved review images. Customer names are abbreviated; booking references and moderation reasons are removed.                  |
| Customer               | Own eligible bookings; create/read/edit/withdraw own reviews; read published vendor responses; report public reviews/responses.                                                            |
| Approved active vendor | Read its own published reviews, booking links, dimensions and analytics; create/edit/delete its own response; report public content. Cannot modify customer reviews.                       |
| Active administrator   | Review all statuses and deleted records; inspect customer information, images, audit/history; approve/reject/hide/restore/flag; add private notes; hide responses; accept/dismiss reports. |

Authorization is enforced in services and REST middleware. Admin access uses the existing active `ADMIN` role policy; this project does not have a separate review-permission claim. Cookie-authenticated writes require the configured `Origin` and `X-Review-Request: 1` (existing role-specific request headers are also accepted for corresponding role routes). Read and write limits are 180 and 20 requests per minute per IP respectively. SQL values are bound parameters, identifiers are server-selected, and all customer-facing content is plain text rendered as React text, never raw HTML.

## REST API

All paths below are prefixed with `/api`. Responses use `{ success: true, data: ... }`; errors use `{ success: false, message: ... }` with 400/401/403/404/409/413/429 or a safe 500 error. Private responses and images use `Cache-Control: no-store`.

| Method              | Path                                                    | Purpose                                                                                                |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| GET                 | `/reviews/eligible-bookings`                            | Customer's completed bookings and booked items.                                                        |
| POST                | `/reviews`                                              | Submit a pending review.                                                                               |
| GET                 | `/reviews/my-reviews` or `/reviews`                     | Customer's paginated reviews.                                                                          |
| GET / PUT / DELETE  | `/reviews/:id`                                          | Own review details, edit, or withdrawal.                                                               |
| POST                | `/reviews/:id/report`                                   | Report a review or its public response.                                                                |
| GET                 | `/vendors/:id/reviews`                                  | Overall vendor reviews.                                                                                |
| GET                 | `/services/:id/reviews`                                 | Explicit service reviews.                                                                              |
| GET                 | `/packages/:id/reviews`                                 | Explicit package reviews.                                                                              |
| GET                 | `/{vendors,services,packages}/:id/rating-summary`       | Average, count, verified count, star distribution, monthly trends, response rate.                      |
| GET                 | `/review-images/:id`                                    | Proxied image bytes with publication/owner/admin checks.                                               |
| GET                 | `/vendor/reviews`                                       | Own published review management.                                                                       |
| GET                 | `/vendor/reviews/:id`                                   | Own review details.                                                                                    |
| POST / PUT / DELETE | `/vendor/reviews/:id/response`                          | One public response per review, owned by the vendor.                                                   |
| GET                 | `/vendor/rating-summary`                                | Vendor overview plus monthly trends, response rate, service ratings.                                   |
| GET                 | `/admin/reviews`                                        | Moderation listing including retained deleted records.                                                 |
| GET                 | `/admin/reviews/filters`                                | Database-backed vendor/service/category filter choices.                                                |
| GET                 | `/admin/reviews/:id`                                    | Review, permitted customer information, response, moderation history, and edit/response audit records. |
| PATCH               | `/admin/reviews/:id/{approve,reject,hide,restore,flag}` | Audited moderation.                                                                                    |
| PATCH               | `/admin/reviews/:id/notes`                              | Append an administrator-only note without changing publication.                                        |
| PATCH               | `/admin/reviews/:id/response/hide`                      | Hide a vendor response.                                                                                |
| GET                 | `/admin/review-reports`                                 | Paginated report decisions/history.                                                                    |
| PATCH               | `/admin/review-reports/:id/{resolve,dismiss}`           | Accept/dismiss a pending report.                                                                       |
| GET                 | `/admin/review-analytics`                               | Real status counts, approved platform average, pending reports, vendor rankings, monthly trends.       |

Customer review routes also support the existing `/customer/reviews` prefix. The previous customer service export delegates to the new policy. The generic admin `reviews/:id/action` endpoint cannot bypass the audited moderation flow.

Review listing query parameters: `page`, `pageSize` (1–50), `q`, `rating` (1–5), `status`, `vendorId`, `serviceId`, `categoryId`, `from`, `to`, and `reported=true`. Dates use inclusive UTC dates. Public/vendor listings always enforce publication regardless of filters. Report history uses `page` and `pageSize`.

Example submission:

```json
{
  "bookingId": "a-booking-guid",
  "bookingItemId": null,
  "rating": 5,
  "title": "A wonderful celebration",
  "text": "Professional service and excellent communication.",
  "serviceQualityRating": 5,
  "communicationRating": 5,
  "valueForMoneyRating": 4,
  "professionalismRating": 5,
  "images": [
    { "name": "celebration.jpg", "mimeType": "image/jpeg", "base64": "..." }
  ],
  "keepImageIds": []
}
```

PUT uses the same content fields without booking identifiers. `keepImageIds` explicitly preserves existing images; omitted images are removed. A response body is `{ "text": "Thank you for choosing us." }`. A report body is `{ "reason": "Spam", "description": "Optional context", "responseId": "optional-response-guid" }`.

Moderation accepts `{ "reason": "Customer-visible decision reason", "notes": "Administrator-only context" }`. Rejection, hiding, and flagging require a reason. The notes endpoint requires `notes`. Internal notes live exclusively in admin history/audit responses. Deleted reviews cannot be restored. Only administrators can reverse a hidden review; vendors cannot edit a moderator-hidden response to republish it.

## Moderation, reports, and notifications

1. Customer submits or edits a review. It enters Pending and contributes no rating.
2. Administrator reviews its booking, text, dimensions, images, and history. Approval publishes it and updates the correct rating target. Rejection/hidden/flagged status excludes it. Each decision records administrator, UTC time, reason and optional private note.
3. Vendor can respond to an approved review. A unique `ReviewId` constraint allows one response row; deleted responses are reused rather than creating threads. Response edits use the configured window, and every create/edit/delete/hide action is audited.
4. Customers/vendors can report a public review or response. Only one pending report per reporter/content is allowed. Reporting does not alter publication, status, or ratings. Administrators accept/dismiss reports, then explicitly hide the review/response when warranted. Report decisions and prior reports are retained.

Notifications originate inside backend transactions and broadcast through the existing notification center after commit. Customers receive submission, moderation, response, and report-decision events. Vendors receive submission/update/publication/moderation and response-hiding events. Existing admin events cover submissions, edits, and reports. Repeated moderation to the current state and unchanged response saves do not create duplicate notifications. Existing notification preferences are reused; review lifecycle notifications are essential/general notifications because there is no separate review preference in the project.

Review workspaces share the existing Socket.IO connection and refresh on notification/reconnect. Existing polling infrastructure provides a 30-second visible-page fallback, focus/reconnect refresh, request cancellation, and no overlapping requests. Public review sections use this fallback as well.

## Images and storage

Up to five PNG/JPEG images are accepted, each no larger than 2 MB. MIME, extension, decoded size, and PNG/JPEG file signatures are checked. Request JSON is bounded to 16 MB. Files use unique server-generated Cloudinary names and authenticated raw storage through the existing upload/download service. MSSQL stores the private URL, key, name, size, MIME and order, never image bytes.

Clients receive image IDs and use the authorized image proxy. Pending/hidden/rejected/deleted images are limited to the author and administrators. A vendor can view approved images. Public access is revoked with the parent review, and raw Cloudinary storage keys/URLs are never returned by public APIs. Image status follows parent-review moderation; hiding a review hides all its photos.

Removed images are deleted from storage after commit; failed transactions attempt to remove newly uploaded files. Cloudinary cleanup is best effort, with a server log on post-commit cleanup failure. If storage is unavailable, content remains private and the operator may need to reconcile orphaned assets. Legacy image rows lacking authenticated storage keys are not fetched from arbitrary external URLs; their original database metadata remains available for a controlled migration.

## Migration and changed files

Migration `024-reviews` extends existing review/image tables, replaces the single-review-per-booking constraint with the booking/vendor/item target index, and adds `VendorReviewResponses`, `ReviewReports`, and `ReviewModerationHistory`. It adds foreign keys, rating/status checks, publication/customer/service/package/moderation indexes and a unique active-report index. `AuditLogs` supplies content/response revision history without adding a duplicate revision table.

Legacy reviews enter Pending and are withdrawn until an administrator approves them under the new policy; text and existing records are retained. Legacy reviews have no explicit item target and therefore remain overall vendor reviews. Cache reconciliation runs during migration. The migration runner records `024-reviews` in the existing migration ledger, under the existing database application lock. The SQL file is also supplied; execute its GO batches within a transaction if applying manually.

Created files:

- `backend/migrations/024-reviews.{js,sql}`
- `backend/src/modules/reviews/reviews.policy.js`
- `backend/scripts/inspect-reviews.js`, `verify-reviews.js`, `reconcile-review-ratings.js`
- `backend/tests/reviews.test.js`
- `backend/docs/reviews-and-ratings.md`
- `frontend/src/modules/reviews/{api.js,Reviews.jsx,reviews.css}`
- `frontend/tests/reviews-protection.test.js`

Implemented existing empty review stubs: `reviews.controller.js`, `reviews.repository.js`, `reviews.routes.js`, `reviews.service.js`, `reviews.validation.js`.

Modified integration files:

- `backend/.env.example`, `backend/scripts/migrate.js`, `backend/src/app.js`
- `backend/src/modules/customers/{workspace.operations.js,workspace.discovery.js}`
- `backend/src/modules/admin/{admin.analytics.js,admin.resources.js,admin.service.js,services-management.service.js,vendor-details.service.js}`
- `backend/src/modules/vendors/{service-management.service.js,workspace.analytics.js,workspace.service.js}`
- `backend/src/modules/notifications/{admin-events.js,notification-center.service.js}`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/modules/customer/pages/{CustomerDiscovery.jsx,CustomerRecords.jsx}`
- `frontend/src/modules/marketplace/DetailPage.jsx`

## Verification and remaining checks

Validated on the configured workspace: 202 backend tests passed, 35 frontend tests passed, 55 live MSSQL/HTTP checks passed, the production frontend build passed, and lint on the new review frontend files passed. The established Home Page protection manifest passed; an additional 16-file Home/shared-source hash comparison reported no changes. Migration 024 and its final indexes/private-note column have been applied to the configured database. Integration fixtures were rolled back.

The rollback-only integration script exercises real MSSQL: ownership, incomplete/mismatched bookings, duplicates, pending/public exclusion, moderation history and private notes, independent vendor/service/package ratings, cache updates, edits/deletion, vendor ownership/responses, reports, notification creation/idempotency, paging/filtering, marketplace package/service ratings, and HTTP response/image authorization. Cloudinary upload/download transport is mocked; no test image or customer fixture is committed or uploaded to a real account.

Unit/HTTP tests cover authorization, request origin, input ownership overrides, rating bounds, content and file validation, policy windows and public eligibility. Frontend protection tests verify the established Home Page file hashes and require every review CSS selector, including mobile rules, to be scoped beneath `.rr-module`.

Browser verification could not run because the browser tool failed before connecting with `codex/sandbox-state-meta: missing field sandboxPolicy`. Therefore a rendered mobile check and before/after screenshot comparison remain unverified. Source/hash protection and CSS scoping pass, but do not substitute for pixel comparisons. Live Cloudinary delivery also needs verification with the configured account.
