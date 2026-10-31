# Wishlist and address/location implementation

Implemented for the existing React/Express/MSSQL application. The working customer/vendor workspace APIs and existing tables were extended; the empty legacy module placeholders were not wired into duplicate APIs.

## User-facing entry points

- `/customer/wishlist`: vendor/service/package tabs, counts, search, category/city/vendor and price filters, sorting, grid/list display, current saved state and unavailable historical items.
- `/customer/addresses`: address search, contact details, district, optional coordinates, editing, confirmed deletion and default-address selection.
- `/customer/events/:id`: independent event venue, saved-address copy, custom address, contact details and access instructions.
- Service booking/quotation dialog: event venue editor and saved-address selection; direct bookings also support a separate optional billing address, supported delivery modes and assigned vendor locations.
- `/customer/bookings/:id/checkout`: agreed event and billing address snapshots in the existing checkout view (use the existing booking checkout link).
- `/vendor/locations`: business-location cards, city/state filters, search, primary selection, editing, activation and archival.
- Vendor service editor, location step: assigned business locations, delivery mode, cities/postal codes, radius, travel charge, minimum value and active status.
- `/admin/customer-addresses`, `/admin/vendor-locations`, `/admin/service-locations`, `/admin/event-locations`: read-only inspections through the existing administrator resource system. Existing booking details retain historical snapshots.

The finalized Home Page, shared public navigation/footer, global style sources and protected assets were left unchanged. New pages reuse workspace styles and local Tailwind utility classes.

## APIs

These paths intentionally follow the existing workspace conventions rather than adding `/api/wishlist` or a second address module.

| Method                    | Endpoint                                                          | Behavior                                                                                                                |
| ------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| GET                       | `/api/customer/wishlist`                                          | All owned saved targets, current price and eligibility                                                                  |
| GET                       | `/api/customer/wishlist/counts`                                   | Vendor/service/package and total counts                                                                                 |
| POST                      | `/api/customer/wishlist`                                          | Existing `{type: Vendor/Service/Package, id}` API; eligible targets only, idempotent duplicates                         |
| DELETE                    | `/api/customer/wishlist/:id`                                      | Remove an owned wishlist record                                                                                         |
| GET                       | `/api/customer/addresses`                                         | Searchable, paginated owned addresses                                                                                   |
| GET                       | `/api/customer/addresses/:id`                                     | Owned address details                                                                                                   |
| POST / PUT / DELETE       | `/api/customer/addresses[/:id]`                                   | Existing CRUD with added validated fields                                                                               |
| PATCH                     | `/api/customer/addresses/:id/default`                             | Transactional default switch                                                                                            |
| GET / POST / PUT / DELETE | `/api/customer/events/:id/location`                               | Owned event venue; POST/PUT accepts a complete location or `{addressId}` to copy an owned address                       |
| GET                       | `/api/vendor/locations`                                           | Owned business locations                                                                                                |
| GET / POST / PUT          | `/api/vendor/locations[/:id]`                                     | Existing detail/create/update APIs with extended fields                                                                 |
| PATCH                     | `/api/vendor/locations/:id/primary`                               | Transactional primary switch                                                                                            |
| PATCH                     | `/api/vendor/locations/:id/active`                                | Existing activation API, guarded against active service references                                                      |
| DELETE                    | `/api/vendor/locations/:id`                                       | Archive; referenced active locations must be reassigned first                                                           |
| GET / PUT                 | `/api/vendor/services/:id`                                        | Existing service document includes its location/coverage configuration                                                  |
| GET                       | `/api/marketplace/discover`                                       | Existing discovery supports city/coverage and optional `postalCode` filtering                                           |
| POST                      | `/api/customer/bookings/preview`, `/api/customer/bookings`        | Validated event/service location, server travel prices, optional `billingAddressId`, `locationMode`, `vendorLocationId` |
| POST                      | `/api/customer/bookings/:id/change-requests`                      | Existing reschedule request accepts an optional complete `location` with date/time                                      |
| POST                      | `/api/vendor/bookings/:id/change-requests/:request/decision`      | Vendor approval/rejection of the proposed venue using the existing change workflow                                      |
| POST                      | `/api/admin/bookings/:id/change-requests/:request/decision`       | Existing authorized administrative decision workflow                                                                    |
| GET                       | Existing admin resource endpoints for the four location resources | Authorized inspection/search; no new address editing privileges                                                         |

Wishlist categories share one API response and one account-scoped frontend store. It reloads backend truth after writes and on window focus, shares initial requests between cards, ignores responses from previous accounts, and preserves saved state when a write fails. Detail buttons retain a pending save through login. No optimistic database state is invented.

## Data and business rules

- `Wishlists` retains its existing customer/vendor/service/package foreign keys. Exactly one target is required, with a filtered unique index for each customer/target combination and a customer/date retrieval index. Unavailable items stay saved until the customer removes them; package prices are read live.
- `Addresses.UserId` remains the owner. Added `FullName`, `Phone` and `District`; existing latitude/longitude fields are reused. A filtered unique index enforces one default. Customer-row locks serialize default changes. Deleting a default chooses a remaining address without updating old booking snapshots.
- `VendorLocations` retains its vendor foreign key. Added location name/type, district and contact number. Existing coordinates/primary/active fields are reused. A filtered unique index enforces one primary; owner-row locking serializes primary changes. Removal archives the record.
- Service coverage stays in the existing validated `Services.DetailsJson.location`. `vendorLocationIds` are checked against the owning vendor and active locations when saving/booking. Active assignments prevent archival/deactivation. This JSON relationship is validated by the application; it is not presented as a new SQL foreign key.
- Each `Events` record has an independent `LocationJson` value. Copying a saved address copies its values rather than retaining a mutable dependency on that address.
- Booking `EventSnapshotJson` includes the agreed event venue, selected service/business location and separate billing address. `PriceSnapshotJson` retains service location and pricing terms. Quotation request and quotation snapshots include the event venue.
- Existing bookings block direct event-location overwrites. Accepted bookings can propose a venue through the existing reschedule workflow. The current agreed venue remains effective until approval. `BookingChangeRequests` retains both original and proposed locations; approval rechecks coverage and rejects changed travel pricing requiring a new quotation. Approval changes only the reviewed booking, not the event or other bookings.
- Backend checks enforce city/postal/country coverage, configured radius using real coordinates, minimum booking value, active locations and supported delivery mode. Travel charges come from service configuration; visiting the vendor does not add customer travel charges.

## Migrations and rollout

- `021-wishlist-locations.js`: additive address/vendor/event columns and wishlist/default/primary constraints. It refuses ambiguous historical wishlist targets and duplicate data rather than silently deleting or rewriting them.
- `022-booking-location-changes.js`: original/proposed location columns on the existing booking change-request table.
- Both migrations are registered in the regular migration runner and have been applied to the configured local MSSQL database.
- `node scripts/migrate-wishlist-locations.js` applies only these module migrations. Before the initial 021 application, it exports affected `Addresses`, `VendorLocations`, `Wishlists` and `Events` rows plus column metadata into the Git-ignored `.temp/location-backups/` directory. This private export is not a complete SQL Server database backup. Follow the deployment environment's full database backup policy before production rollout.

## Security and verification

All private routes retain JWT authentication, customer/vendor/admin role checks, ownership scopes, mutation origin/header checks, rate limits, no-store responses and sanitized errors. IDs and whitelisted fields are validated, SQL values are bound, coordinate ranges/pairs and postal codes are checked, and changes use the existing audit/notification mechanisms. Public coverage responses omit private address contact details.

Passing checks:

- Backend: **179 tests**.
- Frontend: **25 tests**, including protected Home Page file/asset hashes and scoped-style checks.
- Frontend production build.
- Real MSSQL migration rollback verification.
- Extended real MSSQL/REST fixture verification: all three wishlist types and duplicate adds, counts, unavailable history, cross-customer address/event checks, default switching, primary vendor locations, independent event venue, booking/quotation flows, immutable pre-approval venue, approved venue amendment with retained original address, and payment regression paths. All verification fixture writes roll back.
- New store tests cover shared loads, remounts, late responses after account changes, failed mutation preservation and successful server refresh.

## Verification limits

- Browser-based desktop/mobile interaction and screenshot comparison could not run: the provided in-app Browser tool failed during initialization with a missing sandbox configuration field. The Home Page's protected source/assets are verified unchanged; a pixel comparison has not been performed.
- No autocomplete/map provider was configured. Manual address entry remains functional; real optional coordinates can be opened on OpenStreetMap. No fabricated coordinates or autocomplete responses are used. Interactive maps/marker picking require a configured provider.
- Existing events need a complete venue before new booking/quotation requests. Historical bookings are not backfilled with guessed locations. If legacy booking terms cannot validate a venue change or pricing changes, the workflow requires a replacement quotation.

## Files

The inventory below includes implementation, migration, verification and documentation changes for this task.

Modified:

- `README.md`
- `backend/scripts/migrate.js`
- `backend/scripts/verify-customer-workspace.js`
- `backend/src/modules/admin/admin.resources.js`
- `backend/src/modules/admin/customers.service.js`
- `backend/src/modules/bookings/bookings.service.js`
- `backend/src/modules/bookings/bookings.validation.js`
- `backend/src/modules/customers/workspace.discovery.js`
- `backend/src/modules/customers/workspace.operations.js`
- `backend/src/modules/customers/workspace.routes.js`
- `backend/src/modules/customers/workspace.service.js`
- `backend/src/modules/quotations/quotations.service.js`
- `backend/src/modules/vendors/service-management.service.js`
- `backend/src/modules/vendors/service-management.validation.js`
- `backend/src/modules/vendors/workspace.routes.js`
- `backend/src/modules/vendors/workspace.service.js`
- `backend/src/modules/vendors/workspace.validation.js`
- `frontend/src/modules/admin/navigation.js`
- `frontend/src/modules/bookings/BookingChanges.jsx`
- `frontend/src/modules/customer/components/ServiceCards.jsx`
- `frontend/src/modules/customer/pages/CustomerCheckout.jsx`
- `frontend/src/modules/customer/pages/CustomerDiscovery.jsx`
- `frontend/src/modules/customer/pages/CustomerEvents.jsx`
- `frontend/src/modules/customer/pages/CustomerRecords.jsx`
- `frontend/src/modules/customer/services/workspace.api.js`
- `frontend/src/modules/marketplace/BrowsePage.jsx`
- `frontend/src/modules/marketplace/DetailPage.jsx`
- `frontend/src/modules/vendor/components/WorkspaceForms.jsx`
- `frontend/src/modules/vendor/service-management/ServiceEditor.jsx`
- `frontend/src/modules/vendor/service-management/service-validation.js`
- `frontend/src/routes/AppRoutes.jsx`

Created:

- `backend/docs/wishlist-and-locations.md`
- `backend/migrations/021-wishlist-locations.js`
- `backend/migrations/022-booking-location-changes.js`
- `backend/scripts/inspect-locations.js`
- `backend/scripts/migrate-wishlist-locations.js`
- `backend/scripts/verify-location-migration.js`
- `backend/src/modules/addresses/location.validation.js`
- `backend/src/modules/addresses/locations.service.js`
- `backend/src/modules/addresses/vendor-locations.service.js`
- `backend/tests/wishlist-locations.test.js`
- `frontend/src/modules/customer/components/EventLocationPanel.jsx`
- `frontend/src/modules/customer/components/LocationFields.jsx`
- `frontend/src/modules/customer/components/WishlistButton.jsx`
- `frontend/src/modules/customer/pages/CustomerWishlist.jsx`
- `frontend/src/modules/customer/services/wishlist-store.js`
- `frontend/src/modules/customer/services/wishlist.js`
- `frontend/src/modules/vendor/pages/BusinessLocations.jsx`
- `frontend/tests/wishlist-store.test.js`
