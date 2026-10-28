# Customer planning workspace

Customer pages live at `/customer/dashboard`, with nested events, discovery, service/vendor details, bookings, quotations, wishlist, messages, notifications, payments, reviews, addresses, profile and settings. Every `/api/customer` endpoint authenticates the current session and requires an active, verified CUSTOMER role. Mutations require the configured frontend Origin and `X-Customer-Request: 1`. IDs and request bodies are validated; financial values and identity are never accepted from the browser.

Run `npm run db:migrate` in `backend` before starting. Migration 009 adds event-linked conversations, immutable quotation-to-booking links, quotation requests and payment orders. It retains existing customer and vendor records.

Discovery exposes active approved services and vendors with eligible owner accounts. Wishlist supports vendors, services and packages, preserving unavailable entries for removal. Customer events and guest lists are scoped to their owner. Once bookings exist, changing the event date or city requires coordination with vendors. Booking requests use current service/package prices; accepted quotations copy their agreed line prices into a new booking atomically. The vendor must accept a booking before checkout becomes available.

Vendors see incoming quotation requests at `/vendor/requests`. They can quote only the specific event shared by a request or existing booking/quotation. Sending a proposal marks matching requests responded. Modification requests close the original proposal and create a new pending request with the original quotation reference. Original quotations, booking histories and audit entries are retained.

Messages use the same conversation records on both sides, with customer/vendor ownership checks, cursor pagination, unread status, polling and private Cloudinary PDF/JPEG/PNG attachments limited to 5 MB. Attachment URLs are never exposed. Downloads require conversation membership.

## Razorpay INR checkout

Configure the backend environment (never the frontend):

```
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Use test credentials first. In Razorpay, configure automatic capture and a `payment.captured` webhook to `https://YOUR_API_HOST/api/payments/razorpay/webhook`. Configure the webhook secret independently. No card details are stored by the application.

The backend creates an order for the authenticated customer's outstanding booking balance in paise and reuses its unpaid order. Checkout receives only the public key and server order. Confirmation validates HMAC against the stored order, fetches the payment from Razorpay, and verifies its captured status, order, amount and currency. A raw-body HMAC-verified webhook performs the same idempotent ledger settlement when the browser closes. Repeated callback/webhook delivery cannot double-credit a payment. Captures for changed/cancelled bookings are retained and flagged for reconciliation instead of silently discarded or reopening a cancelled booking. Refund/dispute handling remains with the existing administrative workflow.

Without credentials checkout is explicitly unavailable. No simulated success is shown. Complete a Razorpay test checkout and verify webhook delivery on the deployed HTTPS host before enabling real payments.

Official reference: [Razorpay integration and signature verification](https://razorpay.com/docs/server-integration/python/test-app/), [Razorpay security checklist](https://razorpay.com/security/checklist/).

## Validation

- `npm test` in backend and frontend.
- `npm run build` in frontend.
- `node scripts/verify-customer-workspace.js` in backend: real MSSQL transaction and HTTP routes; seeds temporary fixtures, exercises discovery, events/guests, role and ownership denials, wishlist, vendor quotation response, booking, bidirectional chat, addresses/profile, mocked Razorpay network with real ledger/signature validation, duplicate settlement and reviews. Everything is rolled back. It never charges a payment provider or sends email.
- Gateway unit tests use signed fixtures; live credentials and external charges are never used in automated checks.
