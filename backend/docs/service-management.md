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
| `/vendor/services/add`              | Ten-step service editor; `/new` remains a compatibility alias                                                        |
| `/vendor/services/:id/edit`         | Same editor, populated from stored records; `?step=0` through `?step=9` open a specific step                         |
| `/vendor/services/:id`              | Overview, pricing, items, packages, media, location, schedule, policies, bookings, published reviews and performance |
| `/vendor/services/:id/packages`     | Create, edit, duplicate, activate/deactivate and conditionally delete packages                                       |
| `/vendor/services/:id/availability` | Service calendar, date ranges, holidays, custom timing, blocked dates and override removal                           |

The metadata API supplies all 17 category schemas and active subcategories. Category fields use the existing stable attribute keys, expanded to cover the requested category-specific information. Vendors must assign a category to their business before saving a service in it. New or unapproved vendors can prepare service/package drafts; submission and listing activation require an approved, active vendor. Other vendor tools retain their existing approval guard. The pending-account page links to draft preparation.

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

The service verifier temporarily runs migration 010 in a transaction, creates isolated fixture users/vendors/services for every category, exercises real REST and MSSQL operations, verifies direct booking pricing and then rolls back both schema changes and fixture data. It does not call Cloudinary or modify real business records. The existing vendor/customer verifiers also test migration 010 inside their rollback transactions.
