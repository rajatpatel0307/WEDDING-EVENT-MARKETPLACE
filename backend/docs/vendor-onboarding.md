Vendor registration now creates an account and an inactive vendor record using only
the existing account fields and legal acceptances. Signup then opens the existing
email code verification page, like customer signup. After verifying their email,
vendors can sign in and complete their application from `/vendor/dashboard`. Buyer
and admin signup requirements remain unchanged. Business profile completion and
admin approval are not required for this first login.

Before deploying this code, apply `migrations/028-vendor-onboarding.sql` to the
MS SQL Server database (or run the existing migration runner). Exact live SQL:

```sql
IF COL_LENGTH('dbo.Vendors', 'ProfileDraftJson') IS NULL
    ALTER TABLE dbo.Vendors ADD ProfileDraftJson nvarchar(max) NULL;
```

This migration has not been applied by this change. Existing rows retain NULL and
remain submitted applications with their current statuses and approval behavior.
For a new account, ProfileDraftJson contains `{}`. Saving progress updates this
JSON without changing the verification status. Documents are stored immediately
in the existing VendorDocuments table and secure document storage, rather than
as expiring upload tokens in the draft.

The authenticated `/api/vendor/onboarding` endpoints allow profile reads, draft
saves, document uploads/downloads/removal, and submission before approval. All
other vendor workspace endpoints, service mutations and service/package media
uploads require approval. Draft writes use the vendor row lock and UpdatedAt to
reject stale writes. Profile edits and document replacement are available for
draft and rejected applications; submitted applications are read-only.

Submission validates the existing business schema, active categories, and the
existing minimum of one verification document. All rejected documents must be
removed or replaced. The application is committed to the existing business,
category and location tables atomically; ProfileDraftJson becomes NULL and
VerificationStatus becomes Pending (displayed as Pending Approval). Rejected
applications start a new VerificationCycle on resubmission. Vendor submissions
are recorded in AuditLogs and notify admins; the existing administrator decision
history remains administrator-owned. Admin decisions cannot approve or review an
unsubmitted draft. Approval still requires an active, unblocked owner whose email
has been verified.
