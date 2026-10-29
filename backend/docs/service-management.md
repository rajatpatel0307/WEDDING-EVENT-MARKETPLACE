# Vendor service management

This feature extends the existing React/Tailwind/Lucide vendor portal and Express/MSSQL REST API. It uses the existing JWT cookies, refresh flow, live user/role lookup, Cloudinary provider and audit log. There are no seeded demonstration records or frontend secrets.

## Setup and rollout

1. Inspect and back up the existing database according to the repository deployment process.
2. Run `npm run db:migrate` from `backend` before starting the updated application. Migration `010-service-management` adds typed JSON document columns to Services/ServicePackages, rejection and review-cycle metadata, a daily metrics table and a vendor-list index. It extends the existing approval constraint with `Draft`; existing `Pending` values remain compatible with other marketplace queries.
3. Preserve the existing MSSQL/JWT configuration. Set `FRONTEND_URL` to the exact frontend origin. Service mutations require that Origin and `X-Vendor-Request: 1`.
4. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` only on the backend, using the existing upload integration. Browser upload requests contain image bytes, never provider secrets. PNG/JPEG files are limited to 5 MB, validated by file signature, and delivered through Cloudinary format/quality/size optimization. Up to 30 images are allowed per service.
5. Run backend/frontend `npm test`, then frontend `npm run build`. Start both projects with their existing development or production commands.

The implementation was tested against MSSQL using rollback-only fixtures. Persistent migration 010 is deliberately left to the database deployment process; verification does not migrate the running database permanently. Browser-based visual/interaction QA could not run because the browser connector failed during initialization. Live Cloudinary uploads still require a credentialed smoke test; file validation and provider upload behavior are covered by the existing upload tests.

## UI routes

| Route                               | Purpose                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/vendor/services`                  | Statistics, search, advanced filters, sorting and server pagination; desktop table/mobile cards                      |
| `/vendor/services/add`              | Nine-step service editor; `/new` remains a compatibility alias                                                        |
| `/vendor/services/:id/edit`         | Same editor, populated from stored records; `?step=0` through `?step=8` open a specific step                         |
| `/vendor/services/:id`              | Overview, pricing, items, packages, media, location, schedule, policies, bookings, published reviews and performance |
| `/vendor/services/:id/packages`     | Create, edit, duplicate, activate/deactivate and conditionally delete packages                                       |
| `/vendor/services/:id/availability` | Service calendar, date ranges, holidays, custom timing, blocked dates and override removal                           |

The metadata API supplies category schemas and active subcategories only for categories assigned to the vendor's business profile. Category fields use the existing stable attribute keys, expanded to cover the requested category-specific information. Vendors must assign a category to their business before saving a service in it; the editor links directly to the business profile when no eligible category is available. New or unapproved vendors can prepare service/package drafts; submission and listing activation require an approved, active vendor. Other vendor tools retain their existing approval guard. The pending-account page links to draft preparation.

The editor warns on internal navigation, browser back/forward and page unload when unsaved changes exist. Media changes are saved immediately; other draft changes must be saved before the media manager is enabled. The reusable native modal traps focus, status actions use confirmations, and operation feedback uses the existing toast system plus inline messages.

## Lifecycle and business decisions

- New services and duplicates are inactive `Draft` records. Vendor identity is always derived from the authenticated user. No payload accepts a vendor ID, approval decision, active flag or computed service price.
- Submission accepts only `Draft`/`Rejected`, requires a short description, detailed description, city, cancellation policy and at least one image, then rechecks the locked vendor's live approval. It sets `Pending` (displayed as “Pending Approval”), increments ApprovalCycle and clears the previous rejection context.
- Pending and suspended listings cannot be edited. Admin decisions use the existing admin endpoint and expected status. Rejection stores the reason, note and rejection date. Approval leaves the service inactive; the vendor explicitly activates it. A vendor cannot approve their own listing.
- **All customer-visible service, item, package and media edits conservatively require re-approval.** An approved listing is atomically withdrawn into an inactive Draft. This avoids publishing price, location, category, included-item or description changes without review. Existing bookings and quotations remain intact. Date-specific calendar overrides can change without content re-approval; booked/committed dates are protected.
- Updates use an expected timestamp plus row locks. Stale editors receive HTTP 409. Child IDs must match both the owning vendor and the requested service. Package updates cannot reparent records.
- Service duplication copies document settings, category attributes, items, all images, packages/package items and future non-booked date overrides. New image/package IDs are generated and package image references are remapped. Bookings, reviews, approval history and performance are not copied.
- Only drafts/rejected services without booking, quotation, request or offer dependencies can be deleted. Packages with booking, quotation or request history cannot be deleted. The server enforces these restrictions even if a client fabricates an action.

## Pricing and scheduling

The pricing formula is `(base or special price + unit price × quantity) − percentage discount + additional charges`. A matching seasonal base overrides a weekend base; otherwise a weekend base replaces the ordinary/special base. Discounts and amounts use integer paise arithmetic and are recalculated on the server. A quote can be requested for Custom pricing. Package final prices use the existing MSSQL persisted computed column.

The stored Services.BasePrice is the calculated starting price at the minimum quantity, for compatibility with discovery filters. Direct customer booking recomputes flexible prices for the event date and actual quantity. A flexible-price booking stores the complete charge as one booking line, with the ordered quantity/unit in its description, to avoid rounding when distributing fixed charges across quantities. Existing legacy services and package booking calculations retain their established behavior.

Customer booking checks weekly working days, available date overrides, start/end hours when an event start time exists, advance period, minimum notice and blocked/booked dates. Dates use India time. Accepting bookings through the existing vendor flow continues to honor blocked dates. Overrides are serialized through the parent service lock and cannot overwrite recorded booked availability or accepted/confirmed/in-progress bookings.

## REST contract

All paths below are relative to `/api/vendor`.

| Method         | Path                                              | Payload/behavior                                                                                                                                     |
| -------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET            | `/services/metadata`                              | Categories, subcategories, dynamic fields, vendor name and submission eligibility                                                                    |
| GET            | `/services`                                       | `page`, `pageSize` (1–100), `q`, `category`, `subcategory`, `approval`, `active`, `minPrice`, `maxPrice`, `location`, `rating`, `from`, `to`, `sort` |
| GET/POST       | `/services`                                       | GET lists; POST saves a strict service document as draft                                                                                             |
| GET/PUT/DELETE | `/services/:id`                                   | Details/update/conditional delete; updates and deletes require `expectedUpdatedAt`                                                                   |
| POST           | `/services/:id/submit`                            | `{expectedUpdatedAt}`                                                                                                                                |
| POST           | `/services/:id/duplicate`                         | Copies into a new draft                                                                                                                              |
| PATCH          | `/services/:id/active`                            | `{active, expectedUpdatedAt}`                                                                                                                        |
| GET/POST/PUT   | `/services/:id/images`                            | List; mutate with `{expectedUpdatedAt, base64}` or `{expectedUpdatedAt, order:[imageId...]}` or `{expectedUpdatedAt, primaryId}`                     |
| DELETE         | `/services/:id/images/:imageId`                   | `{expectedUpdatedAt}`                                                                                                                                |
| GET/POST       | `/services/:id/items`                             | List or `{expectedUpdatedAt, item:{name,description,quantity,unit,price,included}}`; POST can also accept `{expectedUpdatedAt,order:[itemId...]}`    |
| PUT/DELETE     | `/services/:id/items/:itemId`                     | Update item envelope or delete with expected service timestamp                                                                                       |
| GET/POST       | `/services/:id/packages`                          | List/create; package fields follow the existing package schema plus `terms`, `optionalItems`, `images` (owned service media IDs)                     |
| GET/PUT/DELETE | `/packages/:id`                                   | Read/update/conditional delete; mutations require expected package timestamp                                                                         |
| POST           | `/packages/:id/duplicate`                         | `{expectedUpdatedAt}`                                                                                                                                |
| GET/POST       | `/services/:id/availability`                      | List overrides; create `{from,to,status,startTime,endTime,notes}`, up to 91 days                                                                     |
| PUT/DELETE     | `/services/:id/availability/:availabilityId`      | Update or remove an owned override                                                                                                                   |
| GET            | `/services/:id/bookings`, `/services/:id/reviews` | Latest 50 associated records                                                                                                                         |
| GET            | `/services/:id/performance`                       | Lifetime counters and 90-day chart series                                                                                                            |

Sort values: `newest`, `oldest`, `updated`, `priceAsc`, `priceDesc`, `bookings`, `rating`. Approval values: `Draft`, `Pending`, `Approved`, `Rejected`, `Suspended`. Active is a separate boolean. User input never becomes SQL syntax; search values are bound and SQL LIKE wildcards are escaped. Errors return safe messages with 400/401/403/404/409/429 status codes as appropriate.

Service documents are defined in `service-management.validation.js`; this is the authoritative API schema. Relational tables remain authoritative for items, media, packages and date overrides. Service DetailsJson stores typed nested pricing, location, weekly schedule, policies, SEO and basic information. AttributesJson preserves category-specific fields. No extra client-calculated total is accepted.

## Performance definitions

Views count authenticated customer service-detail requests, not unique visitors; wishlist validation does not increment them. Enquiries count newly created customer quotation requests. These counters begin after migration and are not backfilled. Bookings and quotations use actual related records; ratings/review counts use published reviews associated through BookingItems. Revenue is completed booking line value before refunds/commission, not settled payout revenue. Conversion is total bookings divided by recorded views; historical bookings can make this exceed 100% when view tracking starts later. Charts show daily views, enquiries, bookings and revenue for the last 90 days. Empty series show a clear empty state.

## Verification commands

```powershell
cd backend
npm test
node scripts/verify-service-management.js
node scripts/verify-vendor-workspace.js
node scripts/verify-customer-workspace.js
cd ../frontend
npm test
npm run build
```

The service verifier temporarily runs migration 010 in a transaction, creates isolated fixture users/vendors/services for every category, exercises real REST and MSSQL operations, verifies direct booking pricing and then rolls back both schema changes and fixture data. Upload verification calls the real service API with a stub for the external Cloudinary transport; it does not send files to Cloudinary or modify real business records. The existing vendor/customer verifiers also test migration 010 inside their rollback transactions.

## Vendor portal completion

The dashboard includes suspended-service counts and a filtered CSV export at `GET /api/vendor/services/export`. Export applies the same server-side search, filters, sort and ownership predicate as the list, exports all matches regardless of the current page, and refuses more than 10,000 matches. CSV cells are quoted and neutralize spreadsheet formulas.

The editor has nine steps; optional SEO fields live with policies. Pricing includes optional minimum/maximum prices and custom quotation availability. Zod validates price bounds, finite currency amounts, precision and ordering. These values use the existing Services.MinimumPrice, MaximumPrice and IsCustomQuoteAvailable columns; duration uses DurationMinutes. No additional migration is required. Duplication preserves these existing fields.

`/vendor/packages/add` and the compatibility `/vendor/packages/new` route select an owned service (or accept `?serviceId=`), then open the same package manager used by the service page. `/vendor/packages/:id/edit` loads the owned package into that manager. Vendors awaiting business approval can prepare packages in their drafts. Package cards show guest ranges, duration and featured status, and offer a read-only view.

Service details include an Information tab, creation timestamp and completed-booking totals from actual booking records. The final preview includes category details, pricing rules and saved packages. Image upload progress reports the number of completed image uploads.

Basic Information also exposes service city and estimated duration, sharing the Location and Policies values. Saved active vendor addresses are loaded through authenticated service metadata and can populate Location. Venue forms support minimum and maximum capacity; capacity and catering guest limits are validated as whole numbers and persisted in the existing Services.MinimumGuests/MaximumGuests columns so public booking enforces them. Catering per-plate values use the currency validator. Duration and setup time use whole minutes.

Pricing Type can be selected explicitly from the existing SQL-supported values or inferred from Pricing Unit for compatibility with existing drafts. Custom-quote services continue to require quotations before booking. Vendor and administrator edits use the same type mapping and native price/guest/duration columns.

Preview includes the full image gallery, saved package contents and optional extras, and upcoming blocked/custom date overrides. Opening an existing calendar override retains its custom hours. The integration verifier checks saved-address ownership, guest-capacity booking rejection, upload ownership/stale-state/file checks before provider access, successful upload persistence, and package content previews. A provider stub is used only for the upload transport; SQL and REST behavior run against the configured MSSQL database.

Validation for this update: backend and frontend unit tests, frontend production build, and `node scripts/verify-service-management.js` against the configured MSSQL database. The integration script rolls back all fixture records and schema changes and covers all 17 categories, editing, approval/rejection/resubmission, ownership, packages, filtered exports and copying price settings. Browser verification was unavailable because the browser connection failed during initialization. A live Cloudinary upload remains an environment smoke test.
