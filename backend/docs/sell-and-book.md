# Category-based selling and booking

This extension uses the existing `Services` catalog and service approval workflow. It reuses `Categories`, `Products`, `Cart`, `CartAndProducts`, `Orders`, `OrderLineItems`, `ProductPaymentOrders`, users, vendors, addresses, and the existing booking/payment/refund system. It does not create purchase orders for reservations.

## Rollout

1. Back up the existing database and inspect the target schema.
2. From `backend`, run `npm run db:migrate`. Migration `030-sell-book` is registered in the existing runner. It creates missing shopping tables, adds `Categories.AllowBooking` (default true), links selling inventory to `Services`, and adds a booking capacity ledger and checkout idempotency keys. Existing selling permissions remain in `AllowBuyOnline`. Existing category and product records are retained. Event foreign keys remain in place; standalone reservations may omit an event and date.
3. Deploy the backend and frontend together after the migration succeeds. The new projections require the new columns.
4. Configure the existing Razorpay API keys. Keep the existing signed webhook URL `/api/payments/razorpay/webhook`; captured purchase payments now reconcile through that endpoint too. No additional payment provider is introduced.

The migration has been tested twice in a single real MSSQL transaction and rolled back. It has **not** been permanently applied by this implementation. No real payment or external notification delivery was performed during integration verification.

Rollback the application and disable new selling/booking traffic if necessary. Retain the additive columns and tables, order snapshots, and payment records. Do not drop financial history or change nullable event references back while standalone reservations exist.

## Behavior

- Admin category create/edit forms include **Product Service Options**. Both is available when Sell and Book are enabled. Changing category permissions takes effect at checkout; historical orders, bookings, and their financial records remain accessible.
- Vendor service creation/editing includes Sell Only, Book Only, and Sell & Book Both cards. Category options are fetched when the category changes. Separate configurations appear in the Pricing step and in the existing approval review. Saving approved content withdraws it for the existing review cycle.
- New configurations are stored in `Services.DetailsJson.offer`; selling inventory and SKU use the existing `Products` record. Stock is read from that record when editing, so completed purchases cannot be restored from an old JSON snapshot. Copies receive a fresh SKU, zero selling stock, and disabled availability until reviewed by the vendor.
- Existing listings without an `offer` retain the legacy event/package/quotation booking workflow. Their booking action still respects the category permission. Legacy exclusive bookings continue to block new capacity reservations.
- Customer discovery, saved cards, and service details show distinct Selling Price and Booking Price labels and permitted actions. Buy Now and Add to Cart use `/customer/cart`. Reservations use `/customer/booking-checkout/:serviceId`.
- Purchases use owned address snapshots, current selling prices, quantity limits, shipping charges, existing tax configuration, server review tokens, and Razorpay capture verification. Unresolved payment orders reserve selling stock; capture deducts that stock once. My Orders is at `/customer/orders`. Booking capacity never changes selling stock.
- Booking checkout supports quantities, optional addresses, instructions, daily/hourly/weekly/custom durations, date windows, time slots, policy review, and a server-calculated summary. Quantity-only reservations need no date or event. Scheduled reservations hold their entire duration. This preserves vendor acceptance before payment; the customer chooses advance or full payment through the existing booking payment screen after acceptance. Configured offerings use their own base offer price; legacy package/quotation checkout remains available for legacy listings.
- Booking availability is counted in `BookingReservations` against active booking statuses. Rejection, cancellation, refund, and completion release capacity through the existing status workflow. Terminal records stay in the ledger. Transaction-owned application locks and row locks serialize availability checks and creation. Purchase holds and booking capacity are independent; there is no shared inventory switch.
- Existing vendor/admin booking views include standalone reservations. Vendor lists show booking quantity and time. The authorized vendor can complete a configured, fully paid reservation after its reserved duration ends. Existing cancellation/refund review, notifications, audit history, and administrator analytics remain in use. Configured reservations use cancellation and replacement for changing a duration; the legacy rescheduling workflow remains unchanged for legacy bookings.

## API additions

All private routes use the existing role middleware, cookies, origin checks, request headers, error handling, and no-store responses.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/marketplace/categories/:id/service-options` | Active category permissions |
| GET | `/api/vendor/categories/:id/service-options` | Options for the vendor editor |
| GET | `/api/marketplace/services/:id/booking-availability` | Check quantity/date/time capacity |
| GET / PUT / DELETE | `/api/customer/cart`, `/cart/items`, `/cart/items/:serviceId` | Read/update/remove cart selections |
| POST | `/api/customer/cart/preview` | Server-priced purchase summary |
| POST / GET | `/api/customer/orders` | Create an idempotent purchase/read purchase history |
| GET | `/api/customer/orders/:id` | Owned order confirmation/details |
| POST | `/api/customer/orders/:id/payment-order` | Reuse/create Razorpay checkout |
| POST | `/api/customer/orders/:id/payment-refresh` | Reconcile payment after an interrupted checkout |
| POST | `/api/customer/order-payments/verify` | Verify signature and captured provider payment |
| POST | `/api/customer/booking-checkout/preview` | Server-priced booking/capacity summary |
| POST | `/api/customer/booking-checkout` | Idempotent booking request with independent capacity |
| POST | `/api/vendor/bookings/:id/complete` | Complete a paid configured reservation |
| GET | `/api/vendor/orders`, `/api/admin/orders` | Role-scoped purchase summaries |

Existing category save, vendor/admin service save/submit/approval, booking decision, booking cancellation, payment, and refund endpoints are extended or reused.

## Verification

Run `npm test` in each project and `npm run build` in `frontend`. Run `node scripts/verify-sell-book.js` from `backend` for rollback-only MSSQL verification. It inserts disposable fixtures within one transaction, stubs Razorpay responses, tests both checkouts and captured payments, and rolls back all schema and fixture changes even on failure.

Covered cases include Sell/Book/Both permissions, configuration validation, separate prices, tax/shipping arithmetic, stale summary rejection, stock limits and unpaid holds, payment replay, quantity-only booking, scheduled slots and non-overlapping availability, vendor acceptance/completion, visibility across customer/vendor/admin views, and purchase/booking inventory independence. Unit coverage also checks role access, forged prices/owners/statuses, and transaction locks. Cross-connection load testing and real gateway/browser end-to-end verification remain deployment checks.

The existing Home Page protection test has a baseline mismatch for `src/App.jsx`: the current file matches Git HEAD, but HEAD differs from the stored checksum fixture. That file and fixture are unchanged by this feature.

Unpaid purchase holds intentionally do not expire automatically: a dismissed Razorpay checkout can complete later. Customers can resume payment or check server status. Automatic release would need provider-safe cancellation/reconciliation before returning stock to sale. Existing legacy booking coupons and refund rules are preserved; this extension does not introduce a separate purchasing coupon engine.

Selling SKUs are now assigned automatically on save from the product name, location and stored vendor business name, with a unique suffix and a transaction-protected collision check. The SKU field is read-only. Existing inventory codes remain stable on subsequent edits. No database migration is needed for this change.
