# Purchase order management

This feature extends `Orders`, `OrderLineItems` and `ProductOrderHistory`. Existing service bookings continue to use their existing booking workflow.

## Installation

From `backend`, run `npm run db:migrate:orders` against an existing installation. This applies [033-order-management.sql](../migrations/033-order-management.sql) and [034-order-out-for-delivery.sql](../migrations/034-order-out-for-delivery.sql), recording each in `AuthMigrations`. The general migration runner also includes both migrations. The current repository is missing the older `030-sell-book.sql`, so a full migration run needs that separate prerequisite restored; the order-only command avoids replaying unrelated migrations.

The migration preserves internal IDs, payment references and amounts. Legacy display references are retained in `Orders.LegacyOrderNumber`. No order records are removed. The only new table is the persistent annual order-number counter.

## Pages and APIs

- Admin: `/admin/orders` and `/admin/orders/:id`.
- Vendor: `/vendor/orders` and `/vendor/orders/:id`.
- Customer: existing `/customer/orders` pages, with automatic tracking updates.
- Existing `/api/admin/orders` and `/api/vendor/orders` now provide paginated `rows`, `total`, `page`, `pageSize`, `summary` and filter options.
- Under each admin/vendor API, `GET /orders/:id` reads details and `PATCH /orders/:id/status` accepts `status`, `expectedVersion` and an optional `note`. Admins may also supply `vendorId` and an explicit `override` with a required reason.
- The existing customer API retains its list and checkout endpoints.

Vendors receive only their own items, totals and fulfillment history. Each vendor progresses independently; the parent order represents the earliest unfinished fulfillment. Cancelled fulfillments remain visible in the per-vendor tracking timeline. Stale status writes return 409 and must be refreshed.

Normal progression is Pending → Processing → Shipped → Delivered. Active fulfillments may be cancelled. Fulfillment requires payment; delivered and cancelled fulfillments need an explicit administrator override. Unpaid multi-vendor orders can only be cancelled together. Unpaid orders with an existing payment checkout require payment reconciliation before cancellation. Reopening an unpaid order rechecks and reserves inventory.

Cancellation does not initiate a refund or restock a paid purchase. Use the existing payment/refund process. No payment gateway capture or verification rules are replaced.

`MNOR` references use the India calendar year and a transaction-held database lock for allocation. Rollback does not consume a permanent number; application restarts do not reset the counter. Socket events publish after commit, with periodic REST reconciliation for missed events.

## Verification

- `npm test` runs backend unit and regression checks without running the database integration script.
- `npm run test:orders:integration` explicitly tests checkout, a mocked captured payment and replay, vendor isolation, fulfillment, admin override, customer tracking, mixed-vendor totals and concurrent allocation against the configured database. It requires existing purchasable inventory and two approved vendors. All fixtures, inventory changes and number allocations are rolled back. No actual gateway payment is made.
- In `frontend`, use `node --test tests/order-status.test.js tests/order-management-ui.test.js` and `npm run build`.
