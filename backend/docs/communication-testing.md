# Communication verification

Verified on 31 October 2026 against the configured development Microsoft SQL Server.

| Check | Result |
| --- | --- |
| Backend `npm test` | 184 passed, 0 failed |
| Frontend `npm test` | 27 passed, 0 failed |
| Frontend `npm run build` | Production build passed |
| Complete Express/Apollo application smoke check | Startup, health HTTP 200 and unauthenticated communication HTTP 401 passed |
| `node scripts/verify-communication.js` from `backend` | 45 real MSSQL / REST / Socket.IO checks passed; fixtures and session/limiter writes rolled back |
| `node scripts/verify-booking-lifecycle.js` from `backend` | Passed full booking lifecycle and independent MSSQL reservation-lock checks; fixtures rolled back |
| `node scripts/verify-quotations.js` from `backend` | Passed requests, proposals, revisions, ownership, acceptance, conversion, expiry, audit and context-aware messaging; fixtures rolled back |
| `npm run db:migrate` from `backend` | Migration 023 applied successfully |
| Home protection | Existing integrity tests passed; all 49 files in the additional before/after SHA-256 snapshot were unchanged |
| CSS isolation | All communication selectors remain under `.comm-*`; scoped-style regression test passed |

The new database verification covers customer creation, context deduplication, vendor replies, foreign customer/vendor denial, ownership of related service/package records, idempotent retry and changed-payload rejection, sent/delivered/read state, archive isolation and restore, mute/preferences, essential status notifications, duplicate notification events, mark-read and dismissal ownership, tombstone deletion, protected attachment access and signature rejection, message pagination including equal timestamps and MSSQL GUID order, authenticated room joins, arbitrary-room rejection, room-scoped typing, persistence-before-acknowledgement, no broadcast before commit, realtime receive events after the commit boundary, authenticated reconnect/rejoin, and REST recovery of missed messages.

Tests use real MSSQL queries inside a transaction. The verification harness redirects calls into that transaction and explicitly invokes registered post-commit callbacks to test broadcast ordering without committing fixture messages or notifying real accounts. Socket authentication uses real signed JWT cookies and fixture sessions. Socket.IO traffic uses a real local HTTP/WebSocket server. The unit suite separately simulates a failed message insert and asserts that no success event is emitted.

The attachment integration uses the existing Cloudinary upload/download implementation with a stubbed external HTTP response; no fixture is transmitted to Cloudinary. It verifies signed upload token use, authorized download, foreign user denial, cross-conversation token denial and denial after deletion. Live Cloudinary account credentials, remote upload/download and provider availability remain deployment checks.

Booking and quotation verification fixture locations were brought up to date with the existing location requirements. The quotation messaging check now supplies the actual quotation context on both sides. Unit tests that formerly required chat to create no notifications were updated to require transactional notification creation. Former admin message-collection expectations now require denial.

Browser QA could not start because the installed in-app browser tool failed during initialization (`sandboxPolicy` metadata was missing). Consequently, desktop/mobile rendering, interaction accessibility, image-preview appearance, scroll behavior and screenshot-based pixel comparison remain unverified. Source hashes and CSS isolation checks support Home Page protection but are not a substitute for a pixel comparison. No Home Page, public navbar/footer, global style, shared visual-component or Home asset file was changed.

No external email, payment, push or refund operation was sent by these checks. Multi-instance Socket.IO routing, production proxy upgrades, load testing, storage retention cleanup and live external-service behavior were not exercised.

Run database verification scripts sequentially: the pre-existing lifecycle scripts inspect/apply schema inside their rollback transaction and can contend for schema locks when run concurrently.
