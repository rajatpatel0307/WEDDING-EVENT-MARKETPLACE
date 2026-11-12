# Admin locations and marketplace visibility

The existing layout and approval workflow are retained. Admins manage registered marketplace locations at `/admin/locations`, using the new Location Management entry in the existing System group. Business addresses, event addresses, service coverage, bookings and checkout remain separate.

## Database and rollout

Migration `031-admin-locations` adds `AdminLocations` and the nullable `Vendors.AdminLocationId` foreign key with an index. Existing `VendorLocations` belong to individual businesses and cannot serve as an admin location catalog; they are preserved. There is no automatic creation or approval of locations from existing free-text cities. Delete archives the admin location and retains foreign keys and historical records.

The configured local database was inspected and a full copy-only backup with checksums was created at `DB/before-admin-locations-20261112.bak` (ignored by Git). SQL Server backup history reports checksums present and no damage. `RESTORE VERIFYONLY` could not run because the configured SQL account lacks CREATE DATABASE permission in master. Only migration 031 was applied and recorded in `AuthMigrations`; earlier migrations were not replayed.

For another environment: inspect and back up the database, then apply migration 031 using the existing migration workflow. Create the desired locations as an administrator and use **Assign registered location** for existing vendors. Following the explicit request to retain the existing approved vendors' locations, their saved active business locations (`Lucknow` and `xcvzcv`) were linked into the managed catalog using their existing administrator's account. Their approval statuses and addresses are preserved. Both are now returned by customer location, catalog and discovery APIs. Other unassigned vendors remain excluded from public discovery.

## Rules and API

- `GET /api/admin/locations`, `POST /api/admin/locations`, `PUT /api/admin/locations/:id`, `DELETE /api/admin/locations/:id`: admin-only management with existing authentication, origin/header protection, validation and audit logging.
- `PUT /api/admin/vendors/:id/registered-location`: admin-only location assignment for existing vendors, without altering approval status.
- `GET /api/marketplace/registration-locations`: active, undeleted admin locations, including locations without approved vendors.
- `GET /api/marketplace/locations`: active, undeleted locations with at least one approved active vendor whose user account is active, verified and unblocked.
- `GET /api/marketplace/catalog`: the same eligible location list with IDs and labels.
- GraphQL `registerVendor` requires `adminLocationId`. The selected active location is validated and saved with the inactive Pending vendor in the account creation transaction. Inactive, deleted, nonexistent and free-text selections are rejected.
- Onboarding draft/resubmission includes `adminLocationId`; the server revalidates availability within its transaction. Rejected vendors can correct and resubmit through the existing approval process. Approved/suspended profiles retain their existing edit restrictions.
- Marketplace discovery, search, service/product/package/vendor listings, public details, homepage collections and vendor-specific offers use registered admin locations. The existing `city` filter accepts the location ID; exact city names remain supported for existing links. Service coverage JSON and secondary business addresses cannot broaden this filter. Global platform offers remain global.

Eligibility is calculated on each database read. No cached visibility flags need synchronization when approval, activation, blocking or deletion changes. Public REST location responses use `Cache-Control: no-store`. Customer location controls refresh on focus and every 30 seconds; selected locations persist across navigation and are shared between header, mobile, hero and browsing controls. A stale location ID cannot return vendors after the location becomes ineligible.

## Verification

- `npm test` in backend: 295 tests passed, including new permission, invalid selection, signup, onboarding, deletion and HTTP tests.
- `node scripts/verify-admin-locations.js`: passed against configured MSSQL. Schema and test fixtures are rolled back. Covers repeatable migration, admin CRUD/assignment, Pending/UnderReview/Approved/Rejected/Suspended vendors, inactive vendors, unverified/blocked/inactive owners, empty locations, multiple vendors, last-vendor removal, inactive/deleted locations, same city in different states, exact vendor location filtering, Sell/Book listings and coverage spoofing, public catalog and GraphQL discovery SQL.
- Frontend tests: 53 passed; the existing Home Page hash-protection test fails first on unchanged `src/App.jsx`. Its fixture also references an absent CSS file and other previously changed files. The test and protected fixture were retained, rather than rebased to hide unrelated differences.
- Actual frontend Home and Offers GraphQL queries execute successfully against the migrated database; the vendor authentication model loads with the new relationship.
- Customer selection tests cover synchronization across controls and tabs, clearing filters and disabled persistent storage.
- Production build passes. Frontend lint has existing warnings; new location files have no lint errors.
- Interactive browser QA could not run: the installed browser tool fails during setup with `missing field sandboxPolicy`. No alternate browser automation was used.


## Linking existing approved vendors

`node scripts/link-approved-vendor-locations.js ADMIN_ID VENDOR_ID ...` previews an explicit import and rolls back all writes. Add `--apply` to commit. The administrator is loaded and checked using existing role permissions; only the specified approved active vendors with eligible owner accounts and active saved addresses can be linked. Existing assignments are preserved, matching active catalog locations are reused, and matching disabled/deleted locations require manual review. Creation and assignment are audited. This command is never run automatically during signup, approval or server startup.

Before repairing the two existing records, a separate copy-only checksum backup was created at `DB/before-approved-vendor-location-link-20261112.bak`. Post-repair verification confirmed both locations in the customer location list, catalog, REST vendor discovery and GraphQL vendor discovery, with each location filtering to its respective vendor. Approval statuses and active flags were unchanged.


## Equivalent state names and duplicate locations

Managed location validation standardizes `UP`, `U.P.` and `Uttar Pradesh` to `Uttar Pradesh` for India, and standardizes country values `India`, `IN` and `IND`. The existing unique location index then prevents those spellings from creating separate entries. Other states and countries retain their supplied names.

The existing Lucknow duplicates were consolidated after a copy-only checksum backup at `DB/before-lucknow-location-consolidation-20261112.bak`. The location ID already assigned to the approved vendor was retained, its state was standardized, and the empty duplicate was archived. Admin and customer APIs now return one Lucknow location with one approved vendor. Repeated Add requests using equivalent state spellings reuse the existing location instead of creating duplicates.

`node scripts/merge-admin-locations.js ADMIN_ID KEEP_ID DUPLICATE_ID` previews the consolidation in a transaction and rolls back. Add `--apply` to commit. Only equivalent, undeleted locations with matching activation states can be merged by an eligible administrator. Vendor assignments and saved onboarding selections are preserved; the duplicate is archived and the correction audited.


## Repeated Add submissions

Adding a location that already exists shows only an "already exists" notice and leaves the form unchanged. It does not open the existing record for editing. The form checks the loaded catalog first; the API also looks up the normalized city/state/country in a transaction with update/range locks. A repeated POST returns HTTP 200 with `existingLocation`, leaving the existing record, activation state and assignments unchanged. Editing one record to collide with another record still returns a clear conflict.

The exact Lucknow request and the UP alias were verified through the actual admin HTTP router against the configured database: both returned HTTP 200, retained the existing location ID, and left a single record with the same activation state and update timestamp. New regression tests cover inactive records, normalization, and distinct cities/states/countries.
