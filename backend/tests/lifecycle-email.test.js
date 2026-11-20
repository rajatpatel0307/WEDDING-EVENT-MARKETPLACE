import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import nodemailer from "nodemailer";
import { sequelize } from "../src/config/database.js";
import { queueLifecycleEmail } from "../src/modules/notifications/email.service.js";
import { processLifecycleMail, deliveryFailure } from "../src/modules/notifications/email.jobs.js";
import { renderLifecycleEmail, siteOrigin, validEmail } from "../src/modules/notifications/email.templates.js";
import { sendTransactionalMail } from "../src/modules/auth/mail.service.js";
import { milestone } from "../src/modules/admin/booking-finance.js";
import { updateOrderStatus } from "../src/modules/shopping/order-management.js";
import { decideVendor } from "../src/modules/admin/vendor-verification.service.js";
import { decide as decideService } from "../src/modules/admin/service-approval.service.js";
import { settleProductPayment } from "../src/modules/shopping/shopping.service.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800";
const userId = "734b9588-c47c-40eb-8c17-1797d65a2801";
const vendorId = "734b9588-c47c-40eb-8c17-1797d65a2802";
const brand = { name: "MarryNest", origin: "https://marrynest.example", supportEmail: "help@marrynest.example" };
const event = {
  id, userId, email: "registered@example.test", name: "Asha <script>alert(1)</script>",
  vendor: "Wedding Studio", service: "Celebration package", reference: "MNBK2600042", cycle: 2,
  services: "Celebration package", bookingDate: "2026-12-20", startTime: "09:30:00", endTime: "11:00:00",
  status: "Approved", paymentStatus: "Paid", deliveryDate: "2026-11-21", total: 120, subtotal: 100, tax: 10, shipping: 10,
  advance: 50, paid: 0, address: { fullName: "Asha", line1: "10 Rose Road", city: "Delhi", postalCode: "110001" },
  items: [{ name: "Celebration package", quantity: 2, price: 50, total: 100 }],
};
const events = ["vendor.approved", "service.approved", "order.placed", "order.delivered", "booking.placed", "booking.accepted"];

for (const type of events) test(`${type} renders branded HTML and a useful plain-text alternative`, () => {
  const mail = renderLifecycleEmail(type, event, brand);
  assert.match(mail.subject, /MarryNest/);
  assert.match(mail.html, /cid:marrynest-logo/);
  assert.match(mail.html, /max-width:620px/);
  assert.match(mail.html, /#8c414e/);
  assert.match(mail.html, /help@marrynest.example/);
  assert.match(mail.html, /Asha &lt;script&gt;/);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.text, /Wedding/);
  assert.equal(mail.replyTo, brand.supportEmail);
  if (type.startsWith("booking.")) {
    assert.match(mail.text, /20 December 2026/);
    assert.match(mail.text, /09:30 IST/);
    assert.match(mail.text, /Booking amount/);
  }
  if (type.startsWith("order.")) {
    for (const field of ["Order ID", "Quantity: 2", "Total amount", "Payment status", "10 Rose Road"])
      assert.ok(mail.text.includes(field), field);
  }
});

test("templates handle undated reservations, SQL time objects and unsafe configuration", () => {
  const mail = renderLifecycleEmail("booking.accepted", { ...event, bookingDate: null, startTime: new Date("1970-01-01T14:45:00Z") }, brand);
  assert.match(mail.text, /To be arranged/);
  assert.match(mail.text, /14:45 IST/);
  assert.equal(siteOrigin("javascript:alert(1)"), null);
  assert.equal(siteOrigin("https://secret:password@example.test"), null);
  assert.equal(siteOrigin("https://example.test/path?private=true"), "https://example.test");
  for (const address of ["x@example.test,second@example.test", "x@example.test\r\nBcc:y@example.test", "Name <x@example.test>"])
    assert.equal(validEmail(address), false);
});

function queueFixture(t, type, { email = event.email, cycle = 2 } = {}) {
  const writes = [], tx = {};
  const status = type === "booking.placed" ? "Pending" : type === "booking.accepted" ? "Accepted" : type === "order.delivered" ? "Delivered" : "Approved";
  const data = { ...event, cycle, email, status, addressJson: JSON.stringify(event.address), eventJson: JSON.stringify({ location: event.address }), occurredAt: new Date("2026-11-20T20:00:00Z") };
  if (!type.endsWith("approved")) delete data.cycle;
  const calls = t.mock.method(sequelize, "query", async (sql, options) => {
    assert.equal(options.transaction, tx);
    if (sql.includes("OBJECT_ID")) return [{ outboxId: 1 }];
    if (sql.includes("FROM dbo.CMSPageVersions")) return [{ ContentJson: JSON.stringify({ contact: { supportEmail: brand.supportEmail } }) }];
    if (sql.includes("FROM dbo.OrderLineItems") || sql.includes("FROM dbo.BookingItems")) return event.items;
    if (/^SELECT/.test(sql)) return [data];
    if (sql.includes("INSERT dbo.TransactionalEmailOutbox")) writes.push(options.replacements);
    return [];
  });
  return { tx, writes, data, calls };
}
for (const type of events) test(`${type} queues only the registered recipient in its existing transaction`, async t => {
  const { tx, writes } = queueFixture(t, type);
  await queueLifecycleEmail(type, id.toUpperCase(), tx);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].email, event.email);
  assert.equal(writes[0].status, "Pending");
  assert.equal(writes[0].key, `${type}:${id}${type.endsWith("approved") ? ":2" : ""}`);
  assert.doesNotMatch(writes[0].html, /password|GatewayPaymentId|AdminNote/i);
  if (type === "order.delivered") assert.match(writes[0].text, /21 November 2026/);
});

test("permanent event keys distinguish approval cycles but coalesce Accepted and Confirmed", async t => {
  const { tx, writes, data } = queueFixture(t, "booking.accepted");
  delete data.cycle;
  await queueLifecycleEmail("booking.accepted", id, tx);
  data.status = "Confirmed";
  await queueLifecycleEmail("booking.accepted", id, tx);
  assert.equal(writes[0].key, writes[1].key);
  assert.equal(writes[0].key, `booking.accepted:${id}`);
});

test("invalid registered recipients are logged as failed without using a vendor contact fallback", async t => {
  const { tx, writes } = queueFixture(t, "vendor.approved", { email: "invalid,email@example.test" });
  await queueLifecycleEmail("vendor.approved", id, tx);
  assert.equal(writes[0].status, "Failed");
  assert.equal(writes[0].error, "INVALID_REGISTERED_EMAIL");
});

test("queue rejects inactive transactions and refuses uncommitted status mismatches", async t => {
  for (const tx of [null, undefined, { finished: "commit" }, { finished: "rollback" }])
    await assert.rejects(() => queueLifecycleEmail("vendor.approved", id, tx), /active transaction/);
  const { tx, data, writes } = queueFixture(t, "order.placed");
  data.paymentStatus = "Pending";
  await assert.rejects(() => queueLifecycleEmail("order.placed", id, tx), /saved record/);
  assert.equal(writes.length, 0);
});

test("missing migration keeps existing actions available and records the setup blocker", async t => {
  t.mock.method(sequelize, "query", async () => [{ outboxId: null }]);
  const log = t.mock.method(console, "error", () => {});
  await queueLifecycleEmail("vendor.approved", id, {});
  assert.ok(log.mock.calls.some(call => /035-transactional-email/.test(call.arguments[0])));
});

function workerFixture(t, overrides = {}) {
  t.mock.method(console, "error", () => {});
  const row = { EmailId: id, RecipientEmail: event.email, Subject: "Confirmation", TextBody: "Summary", HtmlBody: "<p>Summary</p>",
    DeliveryStatus: "Pending", AttemptCount: 0, ...overrides };
  const query = async (sql, params = {}) => {
    if (sql.startsWith("SELECT TOP")) return row.DeliveryStatus === "Pending" ? [{ EmailId: row.EmailId }] : [];
    if (sql.includes("OUTPUT inserted.*")) {
      if (row.DeliveryStatus !== "Pending") return [];
      row.DeliveryStatus = "Sending"; row.AttemptCount++;
      return [{ ...row }];
    }
    if (sql.includes("ErrorCode='LEASE_EXPIRED'")) {
      if (row.DeliveryStatus === "Sending" && row.expired) { row.DeliveryStatus = "Unknown"; row.ErrorCode = "LEASE_EXPIRED"; }
    } else if (sql.includes("DeliveryStatus='Sent'")) row.DeliveryStatus = "Sent";
    else if (params.status) { row.DeliveryStatus = params.status; row.ErrorCode = params.code; row.delay = params.delay; }
    return [];
  };
  return { row, query, configured: () => true, ready: async () => true };
}

test("concurrent workers claim each committed event once and never resend Sent events", async t => {
  const worker = workerFixture(t);
  let sends = 0;
  const send = async mail => { sends++; assert.equal(worker.row.DeliveryStatus, "Sending"); assert.equal(mail.messageId, `<${id}@notifications.marrynest>`); };
  const results = await Promise.all([processLifecycleMail({ ...worker, send }), processLifecycleMail({ ...worker, send })]);
  assert.equal(sends, 1);
  assert.equal(results.reduce((sum, result) => sum + result.sent, 0), 1);
  await processLifecycleMail({ ...worker, send });
  assert.equal(sends, 1);
});

test("definitive temporary rejection retries with backoff and stops after five attempts", async t => {
  const worker = workerFixture(t);
  const send = async () => { throw Object.assign(new Error("private provider response"), { responseCode: 451 }); };
  const result = await processLifecycleMail({ ...worker, send });
  assert.equal(result.deferred, 1); assert.equal(worker.row.delay, 30);
  for (let i = 0; i < 4; i++) await processLifecycleMail({ ...worker, send });
  assert.equal(worker.row.DeliveryStatus, "Failed");
  assert.equal(worker.row.AttemptCount, 5);
  await processLifecycleMail({ ...worker, send });
  assert.equal(worker.row.AttemptCount, 5);
});

test("permanent rejection is logged without disclosing raw SMTP errors", async t => {
  const worker = workerFixture(t);
  const result = await processLifecycleMail({ ...worker, send: async () => { throw Object.assign(new Error("secret@email.test private credentials"), { responseCode: 550 }); } });
  assert.equal(result.failed, 1); assert.equal(worker.row.ErrorCode, "SMTP_REJECTED_550");
  assert.equal(worker.row.DeliveryStatus, "Failed");
});

test("SMTP timeouts during DATA and expired worker leases are held for review, never retried", async t => {
  for (const overrides of [{}, { DeliveryStatus: "Sending", expired: true }]) {
    const worker = workerFixture(t, overrides);
    let sends = 0;
    const send = async () => { sends++; throw Object.assign(new Error("Outcome uncertain"), { code: "ETIMEDOUT", command: "DATA" }); };
    await processLifecycleMail({ ...worker, send });
    await processLifecycleMail({ ...worker, send });
    assert.equal(worker.row.DeliveryStatus, "Unknown");
    assert.equal(sends, overrides.expired ? 0 : 1);
  }
  assert.equal(deliveryFailure({ code: "ETIMEDOUT", command: "CONN" }).certain, true);
  assert.equal(deliveryFailure({ code: "ESOCKET", command: "DATA" }).certain, false);
});

test("SMTP acceptance followed by a database failure cannot trigger a second send", async t => {
  const worker = workerFixture(t);
  const query = async (sql, params) => {
    if (sql.includes("DeliveryStatus='Sent'")) throw new Error("Receipt database write failed");
    return worker.query(sql, params);
  };
  let sends = 0;
  const send = async () => { sends++; };
  await processLifecycleMail({ ...worker, query, send });
  await processLifecycleMail({ ...worker, query, send });
  assert.equal(sends, 1);
  assert.equal(worker.row.DeliveryStatus, "Unknown");
  assert.equal(worker.row.ErrorCode, "RECEIPT_WRITE_FAILED");
});

test("unconfigured SMTP leaves the durable Pending email available for later delivery", async t => {
  const worker = workerFixture(t);
  const result = await processLifecycleMail({ ...worker, configured: () => false, send: async () => assert.fail("Must not send") });
  assert.equal(result.skipped, "smtp_missing");
  assert.equal(worker.row.AttemptCount, 0);
  assert.equal(worker.row.DeliveryStatus, "Pending");
});

test("shared booking milestones queue creation and acceptance; confirmation uses the same event key", async t => {
  const { tx, data, writes } = queueFixture(t, "booking.placed");
  const row = { BookingId: id, CustomerId: userId, VendorId: vendorId };
  // These tables are unrelated to the email snapshot; provide the existing
  // in-app notification helper with empty prior keys and no additional targets.
  const original = sequelize.query;
  t.mock.method(sequelize, "query", async (sql, options) => {
    if (/BookingNotificationKeys|Notifications|SELECT UserId FROM dbo.Vendors/.test(sql)) return [];
    return original(sql, options);
  });
  delete data.cycle;
  await milestone(row, "created", "Booking created", "Created", tx);
  data.status = "Accepted";
  await milestone(row, "status:Accepted", "Booking accepted", "Accepted", tx);
  data.status = "Confirmed";
  await milestone(row, "status:Confirmed", "Booking confirmed", "Confirmed", tx);
  assert.deepEqual(writes.map(mail => mail.type), ["booking.placed", "booking.accepted", "booking.accepted"]);
  assert.equal(writes[1].key, writes[2].key);
});

test("multi-vendor delivery sends only when the last active fulfillment is delivered", async t => {
  const vendorContext = { auth: { user: { id: userId, active: true, emailVerified: true, roles: [{ code: "VENDOR", active: true }],
    vendor: { id: vendorId, active: true, verificationStatus: "Approved" } } }, req: { ip: "127.0.0.1", get: () => "test" } };
  const fixture = queueFixture(t, "order.delivered");
  const tx = { afterCommit: () => {} };
  fixture.tx.afterCommit = tx.afterCommit;
  t.mock.method(sequelize, "transaction", async callback => callback(fixture.tx));
  let otherStatus = "Processing", queued = 0;
  const original = sequelize.query;
  t.mock.method(sequelize, "query", async (sql, options) => {
    if (sql.startsWith("SELECT o.*")) return [{ OrderId: id, OrderNumber: "MNOR2600042", OrderStatus: "OutForDelivery", PaymentStatus: "Paid", StatusVersion: 0, CustomerId: userId }];
    if (sql.startsWith("SELECT * FROM dbo.OrderLineItems")) return [
      { ItemId: id, VendorId: vendorId, FulfillmentStatus: "OutForDelivery" },
      { ItemId: userId, VendorId: userId, FulfillmentStatus: otherStatus },
    ];
    if (sql.includes("INSERT dbo.TransactionalEmailOutbox")) { queued++; return original(sql, options); }
    if (sql.includes("TransactionalEmailOutbox") || sql.startsWith("SELECT o.OrderId") || sql.includes("AS name,Quantity AS quantity") || sql.includes("FROM dbo.CMSPageVersions")) return original(sql, options);
    return [];
  });
  await updateOrderStatus(id, { status: "Delivered", expectedVersion: 0 }, vendorContext, "Vendor");
  assert.equal(queued, 0);
  otherStatus = "Delivered";
  await updateOrderStatus(id, { status: "Delivered", expectedVersion: 0 }, vendorContext, "Vendor");
  assert.equal(queued, 1);
});

const adminContext = { auth: { user: { id: userId, active: true, emailVerified: true, roles: [{ code: "ADMIN", active: true }] } },
  req: { ip: "127.0.0.1", get: () => "test" } };
for (const kind of ["vendor", "service"]) test(`${kind} approval queues only after the saved approval and rolls back if the outbox write fails`, async t => {
  const fixture = queueFixture(t, `${kind}.approved`);
  const original = sequelize.query;
  let updated = false, committed = false, failOutbox = false;
  t.mock.method(sequelize, "transaction", async callback => {
    const result = await callback(fixture.tx);
    committed = true;
    return result;
  });
  t.mock.method(sequelize, "query", async (sql, options) => {
    if (sql.startsWith("SELECT * FROM dbo.[Vendors]")) return [{ VendorId: id, UserId: vendorId, VerificationStatus: "Pending", VerificationCycle: 2, IsActive: false }];
    if (sql.startsWith("SELECT IsEmailVerified")) return [{ IsEmailVerified: true, IsActive: true, IsBlocked: false }];
    if (sql.startsWith("SELECT * FROM dbo.[Services]")) return [{ ServiceId: id, VendorId: vendorId, ServiceName: event.service, ApprovalStatus: "Pending", ApprovalCycle: 2 }];
    if (sql.startsWith("SELECT v.UserId")) return [{ UserId: vendorId, VerificationStatus: "Approved", IsActive: true, OwnerActive: true, OwnerBlocked: false, IsEmailVerified: true }];
    if (sql.startsWith(`UPDATE dbo.[${kind === "vendor" ? "Vendors" : "Services"}]`)) { updated = true; return []; }
    if (sql.includes("INSERT dbo.TransactionalEmailOutbox")) {
      assert.equal(updated, true); assert.equal(committed, false);
      if (failOutbox) throw new Error("Outbox database failure");
    }
    if (sql.includes("TransactionalEmailOutbox") || sql.startsWith("SELECT u.UserId") || sql.includes("FROM dbo.CMSPageVersions")) return original(sql, options);
    return [];
  });
  const approve = () => kind === "vendor" ? decideVendor(id, "Approved", {}, adminContext) : decideService(id, "approve", {}, adminContext);
  await approve();
  assert.equal(fixture.writes.length, 1);
  assert.equal(committed, true);
  committed = false; updated = false; failOutbox = true;
  await assert.rejects(approve, /Outbox database failure/);
  assert.equal(committed, false);
});

test("verified product payment queues one order confirmation; payment replay and failed capture queue none", async t => {
  const saved = { RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET };
  t.after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  process.env.RAZORPAY_KEY_ID = "test-key"; process.env.RAZORPAY_KEY_SECRET = "test-secret";
  const fixture = queueFixture(t, "order.placed");
  const original = sequelize.query;
  const order = { OrderId: id, OrderNumber: "MNOR2600042", PaymentStatus: "Pending", StockReserved: 1, CustomerId: userId, OrderStatus: "Pending" };
  const paymentOrder = { OrderId: id, GatewayOrderId: "order_test", AmountMinor: 12000, Currency: "INR", GatewayPaymentId: "pay_test" };
  let captured = true;
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ id: "pay_test", order_id: "order_test", status: captured ? "captured" : "failed", currency: "INR", amount: 12000 }) }));
  fixture.tx.afterCommit = () => {};
  t.mock.method(sequelize, "transaction", async callback => callback(fixture.tx));
  t.mock.method(sequelize, "query", async (sql, options) => {
    if (sql.startsWith("SELECT * FROM dbo.ProductPaymentOrders")) return [paymentOrder];
    if (sql.startsWith("SELECT * FROM dbo.Orders")) return [order];
    if (sql.startsWith("SELECT * FROM dbo.OrderLineItems")) return [{ ProductId: id, VendorId: vendorId, Quantity: 2 }];
    if (sql.startsWith("UPDATE dbo.Products")) return [{ Stock: 5 }];
    if (sql.startsWith("UPDATE dbo.[Orders]")) { order.PaymentStatus = "Paid"; return []; }
    if (sql.includes("INSERT dbo.TransactionalEmailOutbox")) assert.equal(order.PaymentStatus, "Paid");
    if (sql.includes("TransactionalEmailOutbox") || sql.startsWith("SELECT o.OrderId") || sql.includes("AS name,Quantity AS quantity") || sql.includes("FROM dbo.CMSPageVersions")) {
      // The payment order lookup precedes the managed transaction.
      return original(sql, options);
    }
    return [];
  });
  await settleProductPayment("pay_test", "order_test");
  assert.equal(fixture.writes.length, 1);
  await settleProductPayment("pay_test", "order_test");
  assert.equal(fixture.writes.length, 1);
  captured = false;
  await assert.rejects(() => settleProductPayment("pay_test", "order_test"), /captured/);
  assert.equal(fixture.writes.length, 1);
});

test("existing SMTP transport supports HTML, text, inline branding and deterministic message IDs", async t => {
  const prior = Object.fromEntries(["SMTP_HOST", "SMTP_FROM", "SMTP_USER"].map(key => [key, process.env[key]]));
  t.after(() => { for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  process.env.SMTP_HOST = "smtp.example.test"; process.env.SMTP_FROM = "sender@example.test"; process.env.SMTP_USER = "";
  let sent;
  t.mock.method(nodemailer, "createTransport", () => ({ sendMail: async mail => { sent = mail; return { accepted: [mail.to] }; } }));
  const worker = workerFixture(t);
  await processLifecycleMail({ ...worker, send: sendTransactionalMail });
  assert.equal(sent.html, worker.row.HtmlBody);
  assert.equal(sent.text, worker.row.TextBody);
  assert.equal(sent.to, event.email);
  assert.equal(sent.attachments[0].cid, "marrynest-logo");
  await access(sent.attachments[0].path);
  await sendTransactionalMail({ to: event.email, subject: "Existing support mail", text: "Text only" });
  assert.equal(sent.html, undefined);
  assert.equal(sent.attachments, undefined);
});
