# Vendor Service & Booking Access Control

The admin workspace now includes **Vendor Access Control** at `/admin/vendor-access`. Service and booking permissions are separate from vendor verification and from each other. Both support Pending, Approved, Rejected and Suspended. Permission approval does not approve or publish a service.

The page provides vendor name, business name, email, phone, categories, both statuses, registration date, independent actions, search, status/category filters, pagination and paginated access history. Actions require confirmation; rejecting or suspending requires a nonblank reason. The UI changes only after backend success. Stale decisions return 409.

Independent approve/suspend permission actions also appear in the vendor details header, beside the existing vendor approval/account controls. Buttons are selected dynamically from each permission's current database status, with separate status badges, confirmation dialogs and mandatory suspension reasons. Rejection actions remain available in the dedicated Vendor Access Control section.

The vendor dashboard includes two status cards with explanations and reasons. Add-service controls and the new-service route require service access. Existing service editing remains available under its existing rules; creation, duplication and submission are protected on the backend. Existing approved service visibility and activation rules remain unchanged.

New bookings require booking access. The guard is in the shared booking creator used by checkout and quotation acceptance, before any booking write. Existing service approval/publication, ownership, availability, account and verification checks remain in place. Access revocation neither modifies nor cancels existing bookings. Their existing acceptance, rejection, payment and other lifecycle operations remain available under the existing authorization rules.

## Database deployment

Migration: [`029-vendor-access.sql`](../migrations/029-vendor-access.sql), with the JS wrapper registered in `scripts/migrate.js`.

Run from `backend` using the normal configured database connection:

```powershell
npm run db:migrate
```

Apply the migration before running the updated application. **The implementation verification did not persist the migration.** The SQL verification applied it inside a transaction and rolled it back.

Live schema inspection found existing `Vendors.VerificationStatus`, `VerifiedBy`, `VerifiedAt` and `VerificationRemarks`, but no separate service/booking permissions. These existing verification columns remain untouched. The migration adds only these fields to `dbo.Vendors`:

- `ServiceAccessStatus`, `ServiceAccessChangedBy`, `ServiceAccessChangedAt`, `ServiceAccessReason`
- `BookingAccessStatus`, `BookingAccessChangedBy`, `BookingAccessChangedAt`, `BookingAccessReason`

Both permissions default to **Pending for existing and newly registered vendors**, requiring explicit admin approval. No implicit grant follows business verification. Status CHECK constraints and administrator foreign keys enforce database validity. The migration is idempotent.

The existing `dbo.AuditLogs` table supplies history; no duplicate vendor/history table is created. Entries use `EntityType='VendorAccess'`, vendor ID in `EntityId`, actor in `UserId`, old status in `OldValue`, access type/new status/reason/action timestamp in `NewValue`, and the existing database `CreatedAt`, IP and user-agent fields. Status updates and audit inserts share a transaction. Current decision metadata uses ChangedBy/ChangedAt because it also describes rejection and suspension.

## APIs

All admin routes use existing JWT authentication, active ADMIN authorization, request-origin checks and rate limiting. Vendor identity comes from the authenticated session. No user-editable vendor/profile input can set these fields.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/admin/vendor-access` | Search/filter/paginate vendors |
| GET | `/api/admin/vendor-access/:vendorId` | Vendor access details |
| PATCH | `/api/admin/vendor-access/:vendorId/service/approve` | Approve service access |
| PATCH | `/api/admin/vendor-access/:vendorId/service/reject` | Reject service access |
| PATCH | `/api/admin/vendor-access/:vendorId/service/suspend` | Suspend service access |
| PATCH | `/api/admin/vendor-access/:vendorId/booking/approve` | Approve booking access |
| PATCH | `/api/admin/vendor-access/:vendorId/booking/reject` | Reject booking access |
| PATCH | `/api/admin/vendor-access/:vendorId/booking/suspend` | Suspend booking access |
| GET | `/api/admin/vendor-access/:vendorId/history` | Access audit history |
| GET | `/api/vendor/access-status` | Current vendor's independent statuses and reasons |

List query parameters: `q`, `service`, `booking`, `category`, `page` and `pageSize`. History accepts `page` and `pageSize`. Maximum page size is 100. SQL search/filter inputs are parameterized, with literal wildcard escaping.

Decision request example:

```json
{ "expectedStatus": "Approved", "reason": "Required service documentation is missing." }
```

`reason` is optional for approval and mandatory for rejection/suspension, with a 1,000-character maximum. `expectedStatus` must match the locked current status. Any defined status may transition to a different Approved/Rejected/Suspended status. Duplicate and stale actions return 409; invalid input returns 400; missing authentication returns 401; unauthorized roles or unapproved access return 403; missing vendors return 404. Each action changes only its selected permission.

`src/modules/vendors/access.service.js` implements the permission service. `assertAccess(vendorId, type, transaction)` reloads live business/account approval and the chosen permission; its transaction lock serializes revocations with protected writes. Existing role/ownership checks run at the service entry points.

## Verification

```powershell
# backend
npm test
node scripts/verify-vendor-access.js
# frontend
npm test
npm run build
```

- Backend: 259 tests passed, including nine new access tests covering all sixteen permission combinations, account restrictions, blocked create/duplicate/submit, blocked direct and quotation bookings, independent updates, audit contents, stale decisions, invalid inputs, session ownership, parameterization, pagination and REST authorization.
- Real MSSQL verification: passed migration idempotency/defaults, actual service creation, preserved draft approval workflow, actual eligible booking creation while service access is rejected, denied new bookings after booking suspension, preserved customer/vendor access to the existing booking, audit records, filters and stale decisions. All fixture data and schema changes were rolled back.
- Frontend production build: passed.
- Frontend tests: 44 passed, one pre-existing protected-file checksum failure for `src/App.jsx`. That file is byte-for-byte unchanged from Git HEAD; the protected fixture expects an older checksum. Neither the file nor its expected checksum was changed for this feature.
- Browser visual verification could not run: the Browser tool failed during connection setup with a missing `sandboxPolicy` field. No interactive UI verification is claimed.

## Files changed or added

Backend:

- `migrations/029-vendor-access.js` and `migrations/029-vendor-access.sql`
- `scripts/migrate.js` and `scripts/verify-vendor-access.js`
- `src/modules/vendors/access.service.js`
- `src/modules/vendors/workspace.routes.js`
- `src/modules/vendors/service-management.service.js`
- `src/modules/vendors/workspace.service.js` (protects the legacy service writer too)
- `src/modules/customers/workspace.operations.js`
- `src/modules/admin/admin.routes.js`
- `tests/vendor-access.test.js`
- `tests/service-management.test.js` and `tests/vendor-onboarding.test.js` (approved access fixtures)
- `docs/vendor-access-control.md`

Frontend:

- `src/modules/admin/pages/VendorAccessPage.jsx`
- `src/modules/admin/components/VendorAccessActions.jsx`
- `src/modules/admin/pages/VendorDetailsPage.jsx`
- `src/modules/admin/navigation.js`
- `src/routes/AppRoutes.jsx`
- `src/modules/vendor/components/AccessStatus.jsx`
- `src/modules/vendor/pages/VendorDashboard.jsx`
- `src/modules/vendor/service-management/shared.jsx`
- `src/modules/vendor/service-management/ServiceList.jsx`
- `src/modules/vendor/service-management/ServiceEditor.jsx`

Home, navbar, footer, customer UI, dashboard layout shells, authentication/registration, payment, quotation, review, communication and media implementations are unchanged. Only the shared creation boundary used by quotation acceptance gains the booking-access check.
