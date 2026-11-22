# Purchase order management

This feature extends `Orders`, `OrderLineItems` and `ProductOrderHistory`. Existing service bookings continue to use their existing booking workflow.

## Installation

From `backend`, run `npm run db:migrate:orders` against an existing installation. This applies [033-order-management.sql](../migrations/033-order-management.sql) and [034-order-out-for-delivery.sql](../migrations/034-order-out-for-delivery.sql), recording each in `AuthMigrations`. The general migration runner also includes both migrations. The current repository is missing the older `030-sell-book.sql`, so a full migration run needs that separate prerequisite restored; the order-only command avoids replaying unrelated migrations.

The migration preserves internal IDs, payment references and amounts. Legacy display references are retained in `Orders.LegacyOrderNumber`. No order records are removed. The only new table is the persistent annual order-number counter.

Order detail queries also require `036-order-invoices`, included in the order-only runner. It adds the independent invoice ledger and counter described below.

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

## Customer invoices

Customers download the blue A4 PDF from the invoice panel at the top of their existing Order details page once payment is Paid and all active fulfillments are Delivered. `GET /api/customer/orders/:id/invoice` checks ownership and returns a private PDF attachment; another customer's order returns 404, and an unpaid or undelivered order returns 409.

Admin and vendor Order details pages provide the same invoice panel through `GET /api/admin/orders/:id/invoice` and `GET /api/vendor/orders/:id/invoice`. Admins receive the complete invoice. Approved vendors receive a marked vendor copy with only their own items, sender address, allocated discount and totals; other vendors' details are excluded. Every role reuses the same saved invoice number for the order. The vendor download becomes available only when the complete parent order is paid and delivered, even if that vendor finished earlier. Existing workspace role and ownership checks apply, and every download uses `Cache-Control: no-store`.

Admin and vendor panels also offer **View invoice**, which opens the PDF in a centered modal popup with close and download controls. The popup traps keyboard focus, locks background scrolling, closes with Escape or a backdrop click, and returns focus to the View invoice button. It uses the same authenticated endpoint and saved number as downloading. Requests are cancelled when leaving an order or switching workspace roles; preview URLs are released on close, replacement or unmount. Browsers without inline PDF support can use the download link.

Invoice numbers are independent of order numbers: the first invoice for order `MNOR2600003` is `NESTIN2600001`, and the next order's invoice is `NESTIN2600002`. `OrderInvoices` saves one number per order; `OrderInvoiceCounter` tracks the annual sequence. Transaction-held locks prevent simultaneous downloads from allocating duplicates. Repeat downloads reuse the saved number, and failed PDF generation rolls back a new assignment. The year uses India time. The page displays the saved reference, and the download uses the server's filename.

The From section lists each vendor's business name, public contacts and primary active business address, falling back to the oldest active location. Orders do not store a separate dispatch-address snapshot. A missing vendor address is shown as unavailable. The invoice retains the customer's saved delivery address, item prices, shipping, tax, discount and total. Separate refunds do not alter its saved order amounts. Large orders and vendor address lists paginate with repeated headings and page numbers.

Invoice code is in `src/modules/shopping/order-invoice.js`. PDFKit is a backend dependency. After database inspection and backup, run `npm run db:migrate:orders` to apply migration `036-order-invoices` with the existing order migrations. The general migration runner also includes it. Install dependencies and restart the backend after deployment. Invoice numbers and issue times are stored; PDF files and separate accounting snapshots are generated on demand. Later profile changes can affect newly downloaded address details.

Invoice checks live in the existing `tests/order-management.test.js` and frontend `tests/order-management-ui.test.js`. These cover all three roles, vendor isolation, delivery and payment gates, independent numbering, repeated downloads, vendor addresses, pagination, server filenames and existing receipt downloads. Run those tests and the frontend production build after changes.
