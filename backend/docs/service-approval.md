# Service approval workflow

Vendor approval and service approval are independent. Vendor approval never publishes services.

Apply `011-service-approval` using `npm run db:migrate` in `backend`, after inspecting and backing up the database as described in the project README. It adds approval/rejection reviewer fields, the `UnderReview` state, and a queue index. The integration verifier applies migrations in a transaction and rolls them back; it does not install them permanently.

Admin pages:

- `/admin/services/pending`: searchable, paginated queue with vendor verification, document count, price, location and submission date.
- `/admin/services/:serviceId/review`: full listing, vendor contacts, items, package items, pricing, images, policies, vendor-wide and service availability, document verification links and approval history.
- Vendor service details include rejection feedback, Edit & Resubmit, and an Approval History tab.

Status storage uses `Draft → Pending → UnderReview → Approved / Rejected`. The UI labels `Pending` as Pending Approval and `UnderReview` as Admin Review. Approval activates the service when vendor verification, vendor activity and owner account eligibility permit. Inactive is represented by `ApprovalStatus=Approved, IsActive=0`; suspended is a separate approval status. Approved edits withdraw the listing and require a fresh approval cycle. Rejected submissions increment the cycle and require review again.

REST endpoints (authenticated JWT/session; admin role required for all admin endpoints):

| Method | Endpoint | Body / query |
| --- | --- | --- |
| GET | `/api/admin/services/pending` | `page`, `pageSize`, `q` |
| GET | `/api/admin/services/pending-count` | Returns `pendingCount` |
| GET | `/api/admin/services/:id/review` | Complete review data |
| GET | `/api/admin/services/:id/approval-history` | Chronological audit timeline |
| POST | `/api/admin/services/:id/start-review` | Optional `expectedUpdatedAt` |
| POST | `/api/admin/services/:id/approve` | Optional `notes`, `expectedUpdatedAt` |
| POST | `/api/admin/services/:id/reject` | Required `reason`; optional `notes`, `expectedUpdatedAt`; `customReason` required when reason is Other |
| POST | `/api/admin/services/:id/suspend` | Optional `notes`, `expectedUpdatedAt` |
| POST | `/api/admin/services/:id/activate` | Optional `notes`, `expectedUpdatedAt` |
| POST | `/api/admin/services/:id/deactivate` | Optional `notes`, `expectedUpdatedAt` |
| POST | `/api/vendor/services/:id/submit` | Required `expectedUpdatedAt` from vendor service details |

Admin mutations require the configured frontend Origin and `X-Admin-Request: 1`. Vendor mutations require `X-Vendor-Request: 1`. Existing generic admin service status actions delegate to the same decision implementation. API responses use 200 for success, 400 for invalid input, 401/403 for authentication/authorization failures, 404 for missing services, 409 for stale or invalid transitions, 422 for missing rejection context, and sanitized 500 errors.

Service decisions acquire service/vendor update locks. Status, reviewer identity, timestamps, audit entries and vendor notifications share one database transaction. A notification or audit failure rolls back the decision. The UI sends `expectedUpdatedAt` to reject stale snapshots. Self-review is forbidden even for a user who also holds an admin role. Vendor ownership checks protect editing, submission and history. Audit records are appended across all cycles; current rejection fields may clear on resubmission without erasing earlier decisions.

Public discovery and booking creation continue to require both service approval and activity, alongside vendor/account eligibility. Draft, pending, review, rejected, suspended and inactive services cannot be booked or publicly listed.

Verification:

```powershell
cd backend
npm test
node scripts/verify-service-management.js
cd ../frontend
npm test
npm run lint
npm run build
```

The MSSQL verifier exercises all 17 categories, ownership, review data, rejection/resubmission, history, reviewer identity, vendor notifications, activation, customer booking, and edits requiring reapproval. All fixtures and schema changes roll back.
