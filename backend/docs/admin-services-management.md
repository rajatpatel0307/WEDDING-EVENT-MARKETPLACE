# Admin services management

The central catalog is `/admin/services`. Details are at `/admin/services/:serviceId`, creation at `/admin/services/new`, and editing at `/admin/services/:serviceId/edit`. The existing approval queue and review page remain available at `/admin/services/pending` and `/admin/services/:serviceId/review`.

Navigation includes all, pending, approved, rejected and suspended services, categories, subcategories, service items and service packages. Item and package indexes use their own paginated endpoints; each entry links to management in the parent service.

## Database setup

Apply migrations through `npm run db:migrate` in `backend` after database inspection and backup. `011-service-approval` is required first. `012-admin-services` adds `ServiceItems.IsActive` with a default of true and an index for administrative date queries. No existing service is approved or activated by migration. Pricing tax rates are stored in the existing validated pricing document and default to zero for older records.

## REST API

All routes are under `/api/admin`, require an authenticated administrator, and use the existing JWT/session middleware, role verification, rate limiting and sanitized errors. Mutations require the configured frontend Origin and `X-Admin-Request: 1`. Invalid input returns 400; authentication/authorization failures return 401/403, missing resources return 404, and stale or prohibited transitions return 409.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/services` | Paginated catalog with server-side search, filters and sorting |
| GET | `/services/statistics` | Global counts, distinct bookings and completed service revenue |
| GET | `/services/metadata?q=&vendorId=` | Categories, subcategories, category forms and up to 30 matching vendors plus the selected vendor |
| GET | `/services/export` | Stream a CSV matching the list filters; query database in pages of 100 |
| POST | `/services` | Create an inactive draft for a vendor |
| GET | `/services/:id` | Service, pricing calculation, items, packages, package items, media, vendor, availability and history |
| PUT | `/services/:id` | Edit information, pricing, location, working schedule and policies |
| DELETE | `/services/:id` | Delete an unreferenced draft or rejected service, preserving audit logs |
| POST | `/services/:id/duplicate` | Copy information, items, packages and images to an inactive draft |
| POST | `/services/:id/submit` | Submit a complete draft/rejected service for review |
| GET | `/services/:id/performance` | Views, enquiries, quotations, bookings, completed/cancelled bookings, revenue, rating, review count and a 90-day series |
| GET | `/services/:id/records/bookings` | Paginated service bookings |
| GET | `/services/:id/records/reviews` | Paginated service reviews |
| POST | `/services/:id/items` | Add item |
| PUT | `/services/:id/items/:itemId` | Edit item and active/included flags |
| DELETE | `/services/:id/items/:itemId` | Remove item |
| PUT | `/services/:id/packages/:packageId` | Edit package information, price, discount, guest range and active flag |
| POST | `/services/:id/images/:imageId` | Set primary image or remove media from this listing |
| POST | `/services/:id/images/upload` | Upload a JPEG/PNG of at most 5 MB through the existing Cloudinary integration |
| GET | `/service-items` | Paginated item index; accepts `q`, `page`, `pageSize` |
| GET | `/service-packages` | Paginated package index; accepts `q`, `page`, `pageSize` |

Approval, rejection, suspension, activation and deactivation use the existing [service approval APIs](service-approval.md).

### List filters

`q` searches service name/ID, vendor business name/ID, category and service city. Supported filters are `category`, `subcategory`, `vendor`, `status`, `active`, `minPrice`, `maxPrice`, `rating`, `location`, `createdFrom`, `createdTo`, `updatedFrom`, `updatedTo`. Date filters include whole Indian calendar days. `status` supports Draft, Pending (including Admin Review), UnderReview, Approved, Rejected, Suspended, Active and Inactive. `active` is `true`/`false`. Active listings require approval; Inactive filters services whose listing flag is off.

`sort` supports `name`, `vendor`, `category`, `price`, `bookings`, `rating`, `createdAt`, `updatedAt`; `direction` is `asc`/`desc`. Service ID is a deterministic tie-breaker. `pageSize` defaults to 20 and is limited to 100. SQL identifiers come from internal allowlists and values use parameter binding.

### Mutation payloads

Existing-service mutations require `expectedUpdatedAt` from the latest service details, including item, package and image edits. Stale snapshots are rejected. The service editor accepts the existing vendor `serviceSchema` plus required `vendorId`. Ownership cannot be transferred. Service items use dedicated endpoints on existing services so changing listing information preserves item IDs.

Item requests use `{ expectedUpdatedAt, item: { name, description, quantity, unit, price, included, active } }`. Deletion needs only `expectedUpdatedAt`.

Package requests use `{ expectedUpdatedAt, name, description, price, discount, minimumGuests, maximumGuests, active }`. The MSSQL computed `FinalPrice` remains authoritative. Existing package contents, terms and images are retained.

Image moderation uses `{ expectedUpdatedAt, action: "primary" | "delete" }`. Upload uses `{ expectedUpdatedAt, base64 }`, where `base64` contains raw file bytes encoded as Base64, without a data-URL prefix. File signatures are validated by the shared upload service. Media deletion removes the reference from this listing; shared Cloudinary files are preserved for duplicated listings. Cloudinary configuration is required for upload.

## Pricing and reporting

The shared backend pricing calculator uses integer paise. It calculates base/special price plus unit price times quantity, applies the percentage discount, adds charges, and then applies optional `taxRate` to the subtotal. `taxRate` is bounded to 0–100 with at most two decimal places. Seasonal/weekend rules still apply for dated bookings. UI estimates never authorize booking prices. The admin details endpoint returns a server-produced calculation breakdown, displayed to two decimal places.

Service revenue is the sum of completed booking line totals for the service, rather than whole booking totals, avoiding duplication across services. It is a completed-sale value, not net collections after refunds. Rating counts published reviews linked through service booking items. Charts cover the most recent 90 Indian calendar dates; booking/revenue activity is grouped by booking creation date.

## Safety and state rules

Information, item and package edits are available for Draft, Rejected and Approved services. Editing approved content withdraws the service to an inactive draft that must be submitted and reviewed again. Pending/Admin Review content is protected from concurrent editorial changes. Admin image moderation is permitted across states; it withdraws approved content and preserves suspension. Vendor approval and service approval remain independent.

All writes, parent timestamps and audit entries share one transaction. IDs for items, packages and images are checked against the parent service. Deletion is restricted to unreferenced drafts/rejections; historical bookings, quotations, offers and approval audit records are preserved. Duplication creates fresh identifiers and remaps package image references; booking history and booked dates are never duplicated. CSV cells are quoted and formula-leading text is neutralized.

The interface includes desktop tables, mobile cards, filter and confirmation dialogs, loading skeletons, empty/error states, toasts, pagination and lazy-loaded routes. It never fetches the full service catalog to render a table.

## Verification

```powershell
cd backend
npm test
node scripts/verify-admin-services.js
node scripts/verify-service-management.js
cd ../frontend
npm test
npm run lint
npm run build
```

`verify-admin-services.js` runs real MSSQL and REST checks covering creation/editing, filtering, tax calculations, metadata, item/package changes, image moderation, submission/approval, stale updates, withdrawal, analytics, CSV, duplication, deletion and audit history. Fixture data and schema changes are rolled back. It does not contact Cloudinary.
