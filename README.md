# MarryNest Wedding Marketplace

React + Tailwind + Apollo Client frontend and Express + Apollo GraphQL + Sequelize/MSSQL backend.

[Automated email notifications](backend/docs/automated-email-notifications.md) covers approval, order and booking triggers, SMTP reuse, durable deduplication, delivery logs and the separate, unapplied `035-transactional-email.sql` migration.

The customer planning workspace is at `/customer/dashboard`. See [Customer workspace and Razorpay setup](backend/docs/customer-workspace.md) for event and guest management, service discovery, bookings, private messaging, payments, migrations and verification commands.

See the [Customer website implementation report](backend/docs/customer-website.md) for public discovery/details, protected Home Page checks, event/guest extensions, checkout/transaction pages, migration `016-customer-website`, API mapping and verification limits.

The approved vendor workspace is at `/vendor/dashboard`. See [Vendor workspace setup and API](backend/docs/vendor-workspace.md) for migrations, the 17 category forms, management routes, ownership rules and verification commands.

The vendor service studio is at `/vendor/services`. See [Service management setup and API](backend/docs/service-management.md) for the nine-step editor, draft and approval lifecycle, media, pricing, packages, calendar, performance, migration `010-service-management`, and rollback-only MSSQL verification.

Service approvals are at `/admin/services/pending`. See [Service approval workflow](backend/docs/service-approval.md) for migration `011-service-approval`, review and decision APIs, rejection/resubmission, notifications and approval history.

The [Admin dashboard and operations extension](backend/docs/admin-operations.md) adds Recharts analytics, database-backed record search, category management, administrator notifications, financial detail views, audited default commission configuration and payout review with guarded external-settlement recording. Payout metadata requires migration `014-admin-operations`; see the document for rollout and verification limits.

The centralized [Admin services management module](backend/docs/admin-services-management.md) is at `/admin/services`, with search, filtering, CSV export, service editing, item/package/media moderation and performance reporting. It requires migration `012-admin-services`.

[Admin bookings management](backend/docs/admin-bookings-management.md) is at `/admin/bookings`, with party/event details, historical items, payment and payout ledgers, cancellation, reviewed refund policies, idempotent Razorpay refunds, notifications and audit history. It requires migration `013-admin-bookings`.

The [Booking lifecycle implementation report](backend/docs/booking-lifecycle.md) covers customer price review and add-ons, server-side coupons, exclusive reservations, vendor decisions, cancellation and rescheduling approvals, private history, migration `015-booking-lifecycle`, actual API paths, verification results and rollout requirements.

[Permanent sequential Booking IDs](backend/docs/booking-numbers.md) documents the `MNBK26` reference sequence, existing-booking backfill, concurrency protection, migration `032-booking-numbers`, standalone SQL, display coverage and verification.

Cloudinary handles new signup documents and profile photos. See [Cloudinary setup](backend/docs/cloudinary.md) for required credentials and the profile photo database migration.

The role-based authentication implementation, environment setup, database mapping, migration commands, secure administrator provisioning and verification limitations are documented in [Authentication setup](backend/docs/authentication.md).

Run `npm test` in each project and `npm run build` in `frontend`. Configure MSSQL, SMTP and signing secrets before running the backend. Do not apply database migrations until the existing database has been inspected and backed up.

Quotations have been retired across customer, vendor and admin workspaces. Pages, request/proposal APIs, booking conversion, reminder jobs and notification preferences are removed. Existing booking snapshots, historical schema/migrations and reference protections are retained; no data cleanup is required.

Wishlist, addresses, business locations, service coverage and approved booking venue changes: [implementation and verification report](backend/docs/wishlist-and-locations.md).

Admin-managed registration locations and approval-controlled customer discovery: [location setup and verification](backend/docs/admin-locations.md).

[Category-based Sell & Book setup](backend/docs/sell-and-book.md) documents category permissions, vendor configuration, independent purchase and booking checkout, migration `030-sell-book`, APIs, rollback-only integration verification, and rollout requirements.
