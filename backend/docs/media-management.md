# Central media management

The module extends the existing `Media` table and Cloudinary upload utility. Vendor, service, package, review and administrator images share ownership checks, validation, storage, moderation, delivery, idempotency, audit and cleanup services. `ReviewImages` remains a compatibility relationship table linked to its canonical `Media` record; it is not a second upload system.

## Setup and operation

```powershell
# backend
npm ci
npm run db:migrate
npm test
node scripts/verify-media.js
node scripts/verify-reviews.js

# Optional live storage verification, with a disposable generated image and cleanup
node scripts/verify-media-cloudinary.js --live

# Inspect cleanup decisions without deleting storage assets
node scripts/process-media-cleanup.js

# Optional external scheduler, if the built-in worker is disabled
node scripts/process-media-cleanup.js --apply

# frontend
npm test
npm run build
```

Restart the backend after updating source. Startup now checks migration `025-media`. It follows the existing migration ledger/application-lock convention. The migration is transactional and idempotent; `025-media.sql` is also provided as GO-separated SQL batches.

New dashboard routes are `/vendor/media`, `/admin/media`, and `/customer/media`. The vendor navigation includes Media Library; the existing admin Media item opens the dedicated library. Customer reviews link to photo management. The service editor reuses the same library, and the business logo/cover controls link to it. Public vendor/service/package details use responsive galleries and lightboxes. Marketplace cards use smaller media variants. Existing review forms still handle submission and preview, and persist images through the central service.

## Environment

| Variable                                      | Purpose/default                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `CLOUDINARY_CLOUD_NAME`                       | Existing storage account.                                                                           |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Existing server-only credentials. Never put secrets in `VITE_*` values.                             |
| `PUBLIC_API_URL`                              | Public API **origin**, such as `https://api.example.com`; local default is `http://localhost:${PORT |     | 5000}`. Set this behind a reverse proxy so persisted media links use the correct host. |
| `MEDIA_MAX_MB`                                | Maximum input size, default 5 MB; bounded to 1–10 MB. Review images also retain their 2 MB limit.   |
| `MEDIA_MAX_PER_ENTITY`                        | Default 30, bounded to 1–100. Reviews always allow at most five current images.                     |
| `MEDIA_RETENTION_DAYS`                        | Default 30, bounded to 1–3650. Minimum wait before storage cleanup, subject to reference checks.    |
| `MEDIA_CLEANUP_ENABLED`                       | Default true. Set false only when an external scheduler runs the cleanup CLI with `--apply`.        |
| `REVIEW_EDIT_DAYS`                            | Existing review/response edit window, default 14 days.                                              |
| `FRONTEND_URL`                                | Existing exact allowed frontend origin for cookie-authenticated mutations.                          |
| `VITE_GRAPHQL_URL`                            | Existing frontend API origin; `/api` is derived from it.                                            |

Existing MSSQL/JWT/session configuration is reused. Sharp is the only new package: it supplies full image decoding, dimensions, pixel limits, orientation correction, metadata stripping and WebP encoding.

## Ownership and publishing

| Category | Owner and checks                                                                                                   | Public delivery                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Vendor   | Vendor's `UserId`; vendors manage their own approved, active business.                                             | Image approved/ready/undeleted; vendor and account approved/active.                                  |
| Service  | Service → vendor → user. Draft editing follows the existing service policy.                                        | Image approved; service approved/active; category and vendor/account active.                         |
| Package  | Package → service → vendor → user, checked on every write.                                                         | Image approved; package active and parent service/vendor publicly eligible.                          |
| Review   | Review → customer; only its author with the customer role may upload/edit during the existing review window.       | Image approved **and** review approved/published/verified/undeleted with a completed, owned booking. |
| Admin    | Uploader's administrator account for new platform uploads. Active administrators can moderate platform-wide media. | Image explicitly approved. Uploading a banner does not attach it to any website section.             |

Owners can preview private images through authenticated delivery; administrators can inspect private images for moderation. Vendors cannot read another vendor's private media. Public visitors receive only approved, eligible images. Metadata details require ownership or administrator access. The active ADMIN role is the project's existing admin permission boundary; no fictitious media-specific permission claim is introduced.

Vendor logo/cover approval projects the selected image into existing vendor profile fields. Other vendor portfolio/gallery images remain in the library. Service/package image changes withdraw an approved service to Draft/inactive so it can follow the existing resubmission workflow. Image approval and parent-service approval are independent requirements; either can happen first. Rejected media remain visible to owners for correction. Review image changes send the parent review back to Pending, except an administrator's individual image moderation, which does not alter the customer's rating or review text.

Each entity has ordered images and a primary selection. Vendor logos/covers are separate slots; a service/package has one primary across its purposes. Replacement preserves the previous primary/order and retains the previous record for safe cleanup. Renaming changes the display name and never changes storage identifiers. Moderator-hidden images cannot be made public by their owner.

All writes use JWT sessions, exact-origin checks, `X-Media-Request: 1` (or the corresponding existing role request header), role checks, parameterized SQL, and entity ownership checks. Read limits are 240 requests/minute/IP; mutations are limited to 30. Private responses and image proxies use `Cache-Control: no-store` and `nosniff`.

## REST API

Paths are relative to `/api`. Success is `{ "success": true, "data": ... }`; errors are `{ "success": false, "message": "..." }`. Listings return `rows`, `total`, `page`, and `pageSize`.

| Method       | Path                                                           | Purpose                                                                                |
| ------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| GET          | `/media/metadata`                                              | Authorized vendor/service/package/review choices and upload limits.                    |
| GET          | `/media`                                                       | Owner's library, or full library for administrators.                                   |
| POST         | `/media/upload`                                                | Upload one image to its validated entity.                                              |
| GET          | `/media/:id`                                                   | Authorized details and admin audit/uploader information.                               |
| GET          | `/media/:id/content?variant=thumb`                             | Authorized optimized image bytes; variants are `thumb`, `card`, `gallery`, `original`. |
| PATCH        | `/media/:id`                                                   | Rename with `{ "fileName": "Display name" }`.                                          |
| PATCH        | `/media/:id/primary`                                           | Select primary.                                                                        |
| PATCH        | `/media/reorder`                                               | Complete ordering for an entity.                                                       |
| DELETE       | `/media/:id`                                                   | Withdraw and retain for cleanup.                                                       |
| GET / POST   | `/vendor/media`, `/vendor/media/upload`                        | Vendor aliases using the same service.                                                 |
| GET / POST   | `/admin/media`, `/admin/media/upload`                          | Admin aliases using the same service.                                                  |
| GET          | `/admin/media/statistics`                                      | Database-derived category/status/failed/retained/storage metrics.                      |
| GET / DELETE | `/admin/media/:id`                                             | Details or withdrawal.                                                                 |
| PATCH        | `/admin/media/:id/{approve,reject,hide,restore}`               | Audited image moderation; rejection/hiding require `reason`.                           |
| GET / POST   | `/services/:id/media`, `/packages/:id/media`                   | Public eligible listings; owner uploads.                                               |
| DELETE       | `/services/:id/media/:mediaId`, `/packages/:id/media/:mediaId` | Validate both the requested entity and image.                                          |
| GET          | `/vendors/:id/media`                                           | Public business gallery.                                                               |
| GET / POST   | `/reviews/:id/images`                                          | Public eligible photos; author uploads.                                                |
| DELETE       | `/reviews/:id/images/:imageId`                                 | Author withdrawal within review editing policy, or admin moderation.                   |

Vendor/service/package aliases force the entity type/ID from the route. Existing service-image APIs delegate to this implementation after their existing ownership/version checks. The old unassociated `/vendor/images` token upload is retired; business image controls link to the library, preventing unmoderated token URLs from bypassing the new policy. Account-authentication profile photos and protected vendor-document workflows are separate existing features and remain in place.

Library filters: `q`, `category` (`Vendor`, `Service`, `Package`, `Review`, `Admin`), `vendorId`, `entityId`, `status`, `uploadStatus`, inclusive UTC `from`/`to`, `deleted=true`, `orphaned=true`, `page`, `pageSize` (maximum 60). `orphaned` identifies missing owning entities, not proof that physical deletion is safe. Public galleries also include a package's existing explicitly assigned service-image references, while new package uploads are attached directly to PackageId.

Example upload:

```json
{
  "entityType": "Service",
  "entityId": "actual-service-guid",
  "purpose": "Gallery",
  "requestKey": "client-generated-guid-retained-for-retries",
  "fileName": "celebration.png",
  "mimeType": "image/png",
  "base64": "...",
  "replaceId": "optional-existing-image-guid"
}
```

Purposes are category-specific: Vendor uses Logo/Cover/Gallery/Portfolio/Office/Team; Service and Package use Cover/Gallery/Portfolio; Review uses Gallery; Admin uses Banner/Category/Promotion/General. Admin platform uploads use the authenticated administrator's ID as `entityId`. Clients cannot submit owner IDs, storage public IDs, arbitrary URLs, transformation parameters, or moderation overrides.

Reordering sends `{ "entityType": "Service", "entityId": "...", "ids": ["..."] }`. Every current ready image must appear exactly once. Moderation sends `{ "reason": "..." }`.

## Validation, Cloudinary and optimization

JPEG, PNG and WebP are supported. The backend validates base64 bounds, decoded size, MIME and extension against actual decoded image metadata, then fully processes the pixels. It rejects malformed/truncated files, unsupported formats, multiple-frame images, dimensions above 12000 pixels per side and inputs above 40 million pixels. Re-encoding removes EXIF/location metadata and corrects orientation. Files use generated identifiers; original names never determine storage paths. Processed output is also size-bounded.

New managed images use the existing backend Cloudinary `uploadAsset` utility with authenticated image storage under `wedding-marketplace/{vendors,services,packages,reviews,admin}/{purpose}/{uuid}`. The API secret is used exclusively on the server. Private originals and eagerly generated variants remain authenticated; the backend checks live publication/ownership before fetching them. Signed provider delivery URLs are not returned to clients.

The server eagerly requests fixed WebP/automatic-quality variants for 320×240 thumbnails, 720×540 cards and 1600×1600 galleries, using limit-fit transforms that preserve aspect ratio. Authenticated Cloudinary assets require eager derived images, so arbitrary on-the-fly transformations and `f_auto` URL rewriting are not used for these private files. Browser galleries use `srcset`, `sizes`, lazy loading, and thumbnail previews; cards request the card variant.

The implementation follows [Cloudinary's authenticated-asset restrictions](https://cloudinary.com/documentation/control_access_to_media), [delivery signature documentation](https://cloudinary.com/documentation/delivery_url_signatures), and [Sharp's decoder/pixel-limit options](https://sharp.pixelplumbing.com/api-constructor/).

## Upload and storage lifecycle

1. Authenticate, validate the target/relationship, and decode the image.
2. Reserve a durable `Media` record with a server-generated storage public ID and an uploader-scoped unique request key/hash. An atomic claim permits one provider upload; identical replays return the original ready/processing result. Reusing a key for different content fails.
3. Upload privately, then revalidate ownership and parent state while finalizing metadata. Provider failure leaves a Failed record with a known storage ID. A disconnected client can retry with its original request key to discover the existing result. An explicitly failed upload needs a new key for a fresh attempt.
4. Review submission/edit transactions reuse the same service. When an enclosing review transaction rolls back, compensating cleanup records are queued for any uploaded assets. Stale upload/orphan reconciliation supplies a recovery path; a combined database outage can still require operator reconciliation against the managed Cloudinary folders.
5. Deletion/replacement withdraws metadata immediately and schedules retention. Cloudinary deletion never happens on a frontend click. Existing booking/quotation snapshots are not rewritten. Entity deletion queues service/package images rather than dropping their media records. Cloned service images preserve physical storage references so removing one record cannot delete another record's asset.
6. The worker runs every five minutes by default, without overlapping local runs. Database leases permit multiple app instances. It reconciles uploads stalled over 20 minutes and missing/unlinked owning entities, then examines due cleanup candidates.
7. Before destruction it checks other media storage references, package image assignments, profile references, booking/quotation snapshots, active entities and historical booking/quotation items. Shared/historical assets become Blocked and are rechecked later. Storage deletion requires a recognized application-owned Cloudinary identifier. Confirmed deletion is audited; failures retain their key/metadata and retry with bounded exponential delay. Expired processing leases are recoverable after a worker interruption.

Reference checks deliberately favor retention: an asset whose owning entity is active or has booking/quotation history may remain stored even after gallery withdrawal. `--apply` performs cleanup; the CLI without this flag is read-only. Running the worker does not imply that every candidate will be destroyed.

The library's storage figure sums recorded sizes of successful originals, deduplicated by managed storage key and including retained records until confirmed destruction. Unknown legacy sizes and Cloudinary's derived-asset/account-wide billing usage are not guessed. Failed uploads and retained/cleanup counts are separate real database metrics.

## Legacy records and Home Page protection

Migration 025 backfills ownership from existing relationships, imports vendor logo/cover references, and links existing review images to `Media`. Existing published service media are preserved as approved/ready records. Historical uploader identities/sizes that were never recorded cannot be reconstructed. Existing review raw authenticated assets remain readable through the old storage helper and can be cleaned only after reference checks. Legacy non-image assets keep their original document/file workflows.

Existing public Cloudinary URLs may already have been distributed outside the application; hiding metadata cannot revoke copies of such historical URLs. Legacy assets without reliable managed storage IDs require controlled storage reconciliation rather than arbitrary URL fetching or destructive guessing. All **new** uploads use private authenticated storage and the authorized proxy.

No Home Page, navbar, footer, global style, shared public layout, or existing static asset was edited. The public image query now excludes pending/withdrawn/failed media while retaining the existing legacy image selection. Admin banner/category/promotional uploads are library records only; there is no API that automatically attaches them to Home Page sections. Changing existing Home Page assets still requires a separate explicit request.

## Verification

Completed: 205 backend tests, 36 frontend tests, 69 live MSSQL/HTTP media checks, and 55 review integration checks. The frontend production build and lint for the new media files pass. Full-application smoke checks returned health 200, unauthenticated media 401 and invalid image ID 400. Migration 025 is applied; integration fixtures were rolled back. The cleanup dry run found no due assets in the configured database.

Live Cloudinary verification also passed: private upload, unsigned-access denial, 320×240 thumbnail delivery, 720×540 card delivery, gallery/original delivery, and deletion of the disposable generated asset. No customer image was used.

`tests/media.test.js` covers full decode/corruption/MIME/size validation, ownership/storage override rejection, reordering validation, role enforcement and origin checks. `scripts/verify-media.js` uses real MSSQL plus HTTP with rollback-only fixtures to exercise vendor logo/cover/gallery upload, duplicates, private delivery, foreign owners, replacement, primary/order, service/package relationships, independent publication gates, review photos, admin history/statistics, failed uploads, historical retention, cleanup failure/retry and public image endpoints. Cloudinary network calls are mocked; no fixture is uploaded to a live account.

The existing review integration script is updated to exercise the central image pipeline using valid generated fixtures. Frontend tests retain the established Home Page hash manifest and add a scoped-media-CSS check.

Browser connection failed before navigation with `codex/sandbox-state-meta: missing field sandboxPolicy`. Therefore rendered mobile upload tests and before/after pixel screenshots remain unverified. Passing hashes and CSS scoping are source-level evidence, not a pixel comparison.

## Files

New:

- `backend/migrations/025-media.{js,sql}`
- `backend/src/modules/media/{media.policy.js,media.storage.js,media.cleanup.js,media.jobs.js,media.legacy.js}`
- `backend/scripts/{inspect-media.js,verify-media.js,verify-media-cloudinary.js,process-media-cleanup.js}`
- `backend/tests/media.test.js`, `backend/docs/media-management.md`
- `frontend/src/modules/media/{api.js,MediaLibrary.jsx,media.css}`
- `frontend/tests/media-protection.test.js`

Implemented existing empty media stubs: `media.controller.js`, `media.repository.js`, `media.routes.js`, `media.service.js`, `media.validation.js`.

Removed the unused `reviews.storage.js` helper after routing review images through the central media service.

Modified:

- `backend/{package.json,package-lock.json,.env.example,server.js}`, `backend/scripts/migrate.js`, `backend/src/app.js`
- `backend/src/modules/media/cloudinary.service.js`
- `backend/src/modules/vendors/{service-management.service.js,service-management.children.js,workspace.service.js}`
- `backend/src/modules/admin/services-management.service.js`
- `backend/src/modules/customers/workspace.discovery.js`, `backend/src/modules/public/public.service.js`
- `backend/src/modules/reviews/{reviews.service.js,reviews.validation.js}`, `backend/scripts/verify-reviews.js`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/modules/vendor/{navigation.js,components/WorkspaceForms.jsx,service-management/MediaManager.jsx}`
- `frontend/src/modules/marketplace/{DetailPage.jsx,BrowsePage.jsx}`
- `frontend/src/modules/customer/{pages/CustomerDiscovery.jsx,components/ServiceCards.jsx}`
- `frontend/src/modules/reviews/Reviews.jsx`
