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

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD` | Eight KPIs, monthly analytics, category analytics, recent activity; maximum 366-day difference |
| GET | `/:resource` | Paginated safe projections; `q`, `status`, `from`, `to`, `page`, `pageSize`, `sort`, `direction` |
| GET | `/:resource/export` | CSV with the same filters, maximum 10,000 records; audited and formula-escaped |
| GET | `/documents/:id/download` | Audited private document download; no storage paths returned |
| POST | `/vendors/:id/review` | `{status,expectedStatus,reason,note}`; locked, transactional update, audit and in-app vendor notification |
| PATCH | `/:resource/:id/action` | `{action,expectedStatus,note}`; explicit resource action allowlist |
| POST | `/:resource` | Create a category, subcategory, coupon or offer |
| PATCH | `/:resource/:id` | Edit a category, subcategory, coupon or offer; updated-at check where the schema supplies it |
| GET / PUT | `/settings` | General platform settings, with audited writes |

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
