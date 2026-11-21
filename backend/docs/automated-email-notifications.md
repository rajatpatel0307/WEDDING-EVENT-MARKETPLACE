# Automated email notifications

> Current status: The Quotations feature is retired. Quotation pages, requests, proposals, conversion APIs, reminders and preferences described in this historical report are no longer available. Historical database records and migrations remain for compatibility.

The backend sends six lifecycle emails through the existing Nodemailer SMTP transport. No frontend screens, routes, authentication rules, prices, status transitions or existing in-app notifications are changed.

## Database rollout — review the SQL first

Review [035-transactional-email.sql](../migrations/035-transactional-email.sql) before applying it. **This implementation has not applied the migration or changed the database.**

The single new table, `dbo.TransactionalEmailOutbox`, is necessary to persist the delivery state independently of the web process, enforce a unique event key across servers, preserve an immutable email summary, and retain delivery logs. The existing contact inquiry mail table is tied to inquiries and cannot hold these lifecycle events. No existing table or field is altered.

After SQL review and a database backup, apply migration `035-transactional-email` through the existing `npm run db:migrate` command, or execute the separate SQL with the normal database deployment process. The general migration runner can also apply other outstanding migrations; inspect those before using it. Executing just the separate SQL creates only the email outbox. A later run of the migration runner recognizes the existing table and records the migration normally.

Until the table exists, existing actions continue to work and the backend reports that lifecycle email setup is missing. Those earlier events are **not queued or backfilled**. Apply this migration before enabling this code in production if every new event must generate an email. Once the table exists, the event and outbox entry must commit together; a failed outbox database write rolls back the transaction rather than losing a notification.

## Triggers and recipients

| Event | Existing successful operation | Recipient | Duplicate key |
| --- | --- | --- | --- |
| Vendor approval | Admin saves `Approved` in `decideVendor` | Vendor owner's registered `Users.Email` | Vendor ID + verification cycle |
| Service/product approval | Admin runs `approve` in the existing service review workflow | Vendor owner's registered `Users.Email` | Service ID + approval cycle |
| Order placed | Razorpay capture is verified and the saved order becomes `Paid` | Customer's registered `Users.Email` | Order ID + placed |
| Order delivered | Vendor/admin update makes the aggregate order `Delivered` | Customer's registered `Users.Email` | Order ID + delivered |
| Booking placed | Shared booking creation records the `created` milestone | Customer's registered `Users.Email` | Booking ID + placed |
| Booking accepted | Existing vendor acceptance records `status:Accepted`; admin confirmation also checks the same email event | Customer's registered `Users.Email` | Booking ID + accepted |

The existing purchase flow first reserves an unpaid order and then confirms it after verified payment. An abandoned reservation or failed payment does not send an order confirmation. Both payment verification and payment reconciliation/webhook paths use the shared settlement function. Replayed payment callbacks do not create a second email.

Multi-vendor delivery waits for all active fulfillment groups to reach `Delivered`; cancelled items retain their recorded status in the email summary. An administrator correction followed by another delivery update cannot resend the same delivery event. Vendor reactivation in the same verification cycle also does not repeat the registration approval email; a new approval cycle has a distinct key.

The shared booking creation helper covers direct service bookings, package/commerce bookings and accepted quotation bookings. Booking acceptance and later admin confirmation share one email key, preventing a second acceptance email. The current business rules require vendor acceptance before admin confirmation and do not allow admins to accept pending bookings; this implementation preserves that restriction. Other booking status transitions produce no new email type.

## Branding and content

All six templates use MarryNest's existing rose (`#8c414e`), cream (`#faf8f5`), serif headings and transparent PNG logo. The unchanged logo is bundled in `src/modules/notifications/assets/marrynest-logo.png` so backend-only deployments can send it as an inline CID attachment. HTML uses presentation tables, inline styles, a fluid 600px container and mobile media rules. Every email includes a plain-text alternative.

Recipient addresses are taken from the registered user record, never from checkout input or a vendor's separate public contact email. The email is a snapshot of the committed event: later price, contact or address changes do not rewrite a queued confirmation. Booking emails show the vendor's public contact details when present. Scheduled dates preserve the saved calendar date; saved booking times are displayed in IST. Undated reservations explicitly say the date/time must be arranged. Delivery dates use the database event time converted to IST.

Email content is explicitly selected: names, reference numbers, public vendor contacts, historical item names, quantity, price, applicable totals, booking dates/times, payment status and the relevant delivery/booking address. Passwords, tokens, identity documents, payment credentials, gateway payloads and private admin/vendor notes are excluded. Dynamic HTML is escaped, and links are built from an HTTP(S) website origin and existing account routes.

Footer support details use `EMAIL_SUPPORT_EMAIL` when configured, otherwise the published Contact page's support email and phone, then verified non-placeholder company contact details. The footer also links to `/contact`. Placeholder contact addresses from `public-site.json` are not presented as real support channels.

## Configuration

Existing server environment settings are reused; no new provider or dependency is required. The local environment already has nonempty SMTP host, sender, port, security, username and password settings. This check did not display their values, connect to the SMTP server or send a real email.

| Setting | Purpose |
| --- | --- |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | Usually `587` for STARTTLS or `465` for implicit TLS |
| `SMTP_SECURE` | `false` for port 587, `true` for port 465; existing transport defaults are preserved |
| `SMTP_FROM` | Provider-approved sender mailbox, optionally with a display name |
| `SMTP_USER` | SMTP account username; omit only for a trusted relay that allows no authentication |
| `SMTP_PASSWORD` | SMTP/app password when a username is supplied |
| `PUBLIC_SITE_URL` | Public website origin for account/support links; falls back to existing `FRONTEND_URL` |
| `EMAIL_SUPPORT_EMAIL` | Optional real support mailbox override and Reply-To address |
| `EMAIL_JOBS_ENABLED` | Defaults to enabled; set `false` only when an external scheduler runs the worker |

Use the existing `FRONTEND_URL` or configure `PUBLIC_SITE_URL` with the deployed customer website origin. Publish real Contact page support details or set `EMAIL_SUPPORT_EMAIL`. Keep secrets in server environment configuration.

The API worker starts automatically and checks the queue every 30 seconds without overlapping its own runs. It stops cleanly with the server. For an external scheduler, set `EMAIL_JOBS_ENABLED=false` and run:

```sh
cd backend
node scripts/process-lifecycle-mail.js
```

This processes at most 10 due events per invocation. If SMTP host/sender configuration is absent, pending events remain queued and no attempt is consumed. The standalone command exits nonzero when setup is missing. Existing OTP, password reset and contact inquiry emails continue using their existing behavior.

## Delivery logs and recovery

`TransactionalEmailOutbox` is the durable email log. Inspect status without printing email bodies or addresses:

```sql
SELECT TOP (100) EmailId, EventType, EntityId, DeliveryStatus,
       AttemptCount, ErrorCode, CreatedAt, SentAt, NextAttemptAt
FROM dbo.TransactionalEmailOutbox
ORDER BY CreatedAt DESC, EmailId;
```

`Pending` means waiting for delivery or a safe retry. `Sending` means one worker has atomically claimed the event with a five-minute lease. `Sent` means the SMTP server accepted it, which is not proof of inbox delivery. `Failed` means a permanent rejection, invalid registered email or exhausted retry budget. `Unknown` means the message might already have been accepted; it is held for operator review.

Explicit SMTP 4xx responses and confirmed pre-delivery connection failures retry with exponential backoff, with at most five total attempts. Explicit 5xx responses fail immediately. SMTP timeouts or broken connections during DATA, expired worker leases and failures saving a successful SMTP receipt become `Unknown`. They are never automatically resent. SMTP cannot guarantee exactly-once inbox delivery after a lost acknowledgement; holding uncertain results prevents the application from knowingly sending duplicates.

Provider reconciliation uses the stable Message-ID `<email-id@notifications.marrynest>`. Before retrying an `Unknown` event, inspect the provider logs for that Message-ID and establish that it was not accepted. Correct configuration or recipient issues before manually resetting a `Failed` event to `Pending`; preserve the same row and event key. Do not delete sent rows to trigger another send. Database rows contain customer email/address summaries and should follow the application's access controls and retention policy. Console delivery logs include only the email ID, status and an allowlisted error code, never raw SMTP error text or customer details.

## Verification

Run `npm test` in `backend`. The lifecycle email tests cover all six templates and recipient snapshots, transaction requirements, fixed event keys, invalid addresses, escaping, dates and time, worker concurrency, bounded retries, permanent errors, uncertain outcomes, database receipt failures, missing SMTP, shared booking milestones, multi-vendor delivery and compatibility with existing text-only mail.

Run `node scripts/preview-lifecycle-mail.js` from `backend` to generate all six HTML/plain-text examples under `.tmp/email-previews/index.html` in the project root. The preview script uses synthetic data and embedded copies of the logo; it does not access the database or SMTP. Open the previews at mobile, tablet and desktop widths for design review.

Verification result: all **400 backend tests passed**, including **29 lifecycle email tests**. Syntax checks for the server, migration runner, migration wrapper and worker script also passed. A read-only inspection of the configured MSSQL database confirmed that every existing column used by the new email queries is present and that `TransactionalEmailOutbox` does not yet exist.

No real messages were sent, and the new table has not been created against the configured MSSQL database. Database/SMTP end-to-end verification must follow migration review and deployment. Browser visual verification was attempted, but the available browser connection failed before opening a page. Responsive markup is covered by automated checks; actual inbox rendering has not been visually verified.
