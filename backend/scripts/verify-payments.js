// Real SQL Server verification. All fixture financial records roll back; no provider calls.
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import * as repo from "../src/modules/admin/admin.repository.js";
import {
  createOrder,
  settle,
  recordFailedPayment,
  webhook,
} from "../src/modules/customers/workspace.payments.js";
import {
  requestRefund,
  refunds,
  receipt,
} from "../src/modules/payments/customer-finance.js";
import * as review from "../src/modules/payments/refund-review.js";
import * as reports from "../src/modules/payments/finance-reports.js";
import { processPaymentEvents } from "../src/modules/payments/reconciliation.js";
import { reconcileRefund } from "../src/modules/admin/booking-refunds.service.js";
import {
  financialRows,
  financialSummary,
  syncPayout,
} from "../src/modules/admin/booking-finance.js";
import { decide as payoutDecision } from "../src/modules/admin/payouts.service.js";
import * as rules from "../src/modules/payments/commission-rules.js";
const rollback = new Error("PAYMENT_TEST_ROLLBACK");
const originalEnv = Object.fromEntries(
  [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "PAYOUT_SETTLEMENT_MODE",
  ].map((k) => [k, process.env[k]]),
);
let passed = false;
try {
  await sequelize.authenticate();
  const firstLock = await sequelize.transaction(),
    secondLock = await sequelize.transaction();
  try {
    const missing = randomUUID(),
      query =
        "SELECT BookingId FROM dbo.Booking WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=:id";
    await sequelize.query(query, {
      replacements: { id: missing },
      transaction: firstLock,
    });
    await assert.rejects(
      () =>
        sequelize.query("SET LOCK_TIMEOUT 150; " + query, {
          replacements: { id: missing },
          transaction: secondLock,
        }),
      (e) => /time out|timeout/i.test(e.message),
    );
    console.log(
      "PASS independent SQL sessions serialize payment booking locks",
    );
  } finally {
    await sequelize.query("SET LOCK_TIMEOUT -1", { transaction: secondLock });
    await secondLock.rollback();
    await firstLock.rollback();
  }
  console.log(
    "Gateway configuration present:",
    Boolean(
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_WEBHOOK_SECRET,
    ),
  );
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction,
      originalFetch = globalThis.fetch;
    let server,
      failNextAudit = false;
    sequelize.query = function (sql, options = {}) {
      if (failNextAudit && sql.includes("INSERT INTO dbo.AuditLogs")) {
        failNextAudit = false;
        throw new Error("Injected audit failure");
      }
      return originalQuery.call(this, sql, { ...options, transaction: tx });
    };
    sequelize.transaction = async (fn) =>
      originalTransaction.call(sequelize, { transaction: tx }, fn);
    const sql = (s, p = {}) => repo.select(s, p, tx);
    try {
      const customer = randomUUID(),
        other = randomUUID(),
        admin = randomUUID(),
        owner = randomUUID(),
        vendor = randomUUID(),
        event = randomUUID(),
        booking = randomUUID();
      for (const id of [customer, other, admin, owner])
        await sql(
          "INSERT INTO dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Payment fixture',:email,'no-login',1)",
          { id, email: `finance-${id}@example.invalid` },
        );
      await sql(
        "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:vendor,:owner,'Payment fixture',:vendor,'Approved',1)",
        { vendor, owner },
      );
      await sql(
        "INSERT INTO dbo.Events(EventId,CustomerId,EventName,EventType,EventDate,City,GuestCount,Budget) VALUES(:event,:customer,'Payment fixture','Wedding','2090-01-10','Jaipur',100,1000)",
        { event, customer },
      );
      const policy = JSON.stringify({
        policy: {
          refundPercent: 100,
          cancellationFeePercent: 0,
          minimumNoticeHours: 0,
        },
        terms: [],
        commissionRate: 10,
      });
      await sql(
        "INSERT INTO dbo.Booking(BookingId,BookingNumber,EventId,CustomerId,VendorId,BookingDate,SubTotal,AdvanceAmount,BookingStatus,PolicySnapshotJson) VALUES(:booking,:number,:event,:customer,:vendor,'2090-01-10',1000,250,'Accepted',:policy)",
        {
          booking,
          number: `PF-${booking.slice(0, 30)}`,
          event,
          customer,
          vendor,
          policy,
        },
      );
      const context = (id, role) => ({
        auth: {
          user: {
            id,
            active: true,
            emailVerified: true,
            roles: [{ code: role, active: true }],
            ...(role === "VENDOR"
              ? {
                  vendor: {
                    id: vendor,
                    active: true,
                    verificationStatus: "Approved",
                  },
                }
              : {}),
          },
        },
        req: { ip: "verification", get: () => "" },
      });
      const ctx = context(customer, "CUSTOMER"),
        adminCtx = context(admin, "ADMIN");
      const service = randomUUID(),
        [category] = await sql(
          "SELECT TOP(1) CategoryId FROM dbo.Categories ORDER BY CategoryId",
        );
      await sql(
        "INSERT INTO dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,BasePrice,ApprovalStatus,IsActive) VALUES(:service,:vendor,:category,'Payment fixture service',:service,1000,'Approved',1)",
        { service, vendor, category: category.CategoryId },
      );
      const rule = await rules.create(
        {
          name: "Fixture vendor promotion",
          vendorId: vendor,
          type: "Combined",
          rate: 12,
          fixedAmount: 25,
          base: "NetSubtotal",
          effectiveFrom: new Date(Date.now() - 1000).toISOString(),
          reason: "Verification only",
        },
        adminCtx,
      );
      const snapshot = await rules.ruleForServices([service], tx);
      assert.equal(snapshot.id, rule.id);
      assert.equal(
        rules.calculateCommission(
          { SubTotal: 1000, DiscountAmount: 0, TotalAmount: 1000 },
          snapshot,
          null,
        ),
        145,
      );
      await rules.disable(
        rule.id,
        { reason: "Verification complete" },
        adminCtx,
      );
      assert.notEqual(
        (await rules.ruleForServices([service], tx))?.id,
        rule.id,
      );
      assert.equal(snapshot.rate, 12);
      console.log(
        "PASS vendor commission rule precedence, effective snapshots and disabling future use",
      );
      process.env.RAZORPAY_KEY_ID = "rzp_test_fixture";
      process.env.RAZORPAY_KEY_SECRET = "fixture";
      process.env.RAZORPAY_WEBHOOK_SECRET = "fixture";
      let creates = 0, inFlight = false;
      globalThis.fetch = async (url, options) => {
        if (options.method === "GET") {
          const providerId = new URL(url).pathname.split("/")[3];
          const [order] = await sql("SELECT * FROM dbo.CustomerPaymentOrders WHERE GatewayOrderId=:provider", { provider: providerId });
          assert.ok(order);
          const data = url.endsWith("/payments")
            ? { count: inFlight ? 1 : 0, items: inFlight ? [{ order_id: providerId, amount: Number(order.AmountMinor), currency: order.Currency, status: "authorized" }] : [] }
            : { id: providerId, amount: Number(order.AmountMinor), currency: order.Currency, amount_paid: 0, status: "created" };
          return { ok: true, json: async () => data };
        }
        assert.equal(url, "https://api.razorpay.com/v1/orders");
        creates++;
        const body = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            id: `order_Fixture${creates}`,
            amount: body.amount,
            currency: body.currency,
          }),
        };
      };
      const key = randomUUID(),
        input = { idempotencyKey: key, termsAccepted: true, mode: "advance" };
      await assert.rejects(
        () => createOrder(booking, context(other, "CUSTOMER"), input),
        (e) => e.status === 404,
      );
      const first = await createOrder(booking, ctx, input),
        replay = await createOrder(booking, ctx, input);
      assert.equal(first.amount, 25000);
      assert.equal(first.orderId, replay.orderId);
      assert.equal(creates, 1);
      console.log(
        "PASS server-priced advance checkout, ownership and idempotency",
      );
      inFlight = true;
      const customInput = { idempotencyKey: randomUUID(), termsAccepted: true, mode: "custom", customAmount: "100" };
      await assert.rejects(() => createOrder(booking, ctx, customInput), (e) => e.status === 409);
      assert.equal(creates, 1);
      inFlight = false;
      const custom = await createOrder(booking, ctx, customInput);
      assert.equal(custom.amount, 10000);
      assert.equal((await createOrder(booking, ctx, customInput)).orderId, custom.orderId);
      assert.equal((await createOrder(booking, ctx, { ...input, idempotencyKey: randomUUID() })).orderId, first.orderId);
      const [openCount] = await sql("SELECT COUNT(*) AS total FROM dbo.CustomerPaymentOrders WHERE BookingId=:booking AND Status='Created'", { booking });
      assert.equal(openCount.total, 2);
      assert.equal(creates, 2);
      console.log("PASS SQL installment changes retain unpaid orders, reuse matching amounts and block authorized payments");
      const payment = {
        id: "pay_Fixture1",
        order_id: first.orderId,
        amount: 25000,
        currency: "INR",
        status: "failed",
        method: "upi",
        created_at: Math.floor(Date.now() / 1000),
      };
      await recordFailedPayment(payment);
      await assert.rejects(
        () =>
          reconcileRefund({
            id: "rfnd_BeforeCapture",
            payment_id: payment.id,
            amount: 25000,
            currency: "INR",
            status: "processed",
          }),
        (e) => e.status === 503,
      );
      console.log(
        "PASS refund events arriving before capture are deferred without marking failed attempts refunded",
      );
      failNextAudit = true;
      await assert.rejects(
        () => settle({ ...payment, status: "captured" }),
        /Injected audit failure/,
      );
      const [unpaid] = await sql(
        "SELECT PaidAmount FROM dbo.Booking WHERE BookingId=:booking",
        { booking },
      );
      const [failedAttempt] = await sql(
        "SELECT PaymentStatus FROM dbo.Payments WHERE BookingId=:booking AND GatewayTransactionId='pay_Fixture1'",
        { booking },
      );
      assert.equal(Number(unpaid.PaidAmount), 0);
      assert.equal(failedAttempt.PaymentStatus, "Failed");
      const [noCapture] = await sql(
        "SELECT COUNT(*) AS count FROM dbo.FinancialLedger WHERE BookingId=:booking AND Kind='Capture'",
        { booking },
      );
      assert.equal(noCapture.count, 0);
      console.log(
        "PASS SQL savepoint rollback removes capture, booking and ledger writes when audit fails",
      );
      await settle({ ...payment, status: "captured" });
      await settle({ ...payment, status: "captured" });
      await recordFailedPayment(payment);
      let [b] = await sql(
        "SELECT * FROM dbo.Booking WHERE BookingId=:booking",
        { booking },
      );
      assert.equal(Number(b.PaidAmount), 250);
      assert.equal(b.BookingStatus, "Confirmed");
      let [counts] = await sql(
        "SELECT (SELECT COUNT(*) FROM dbo.Payments WHERE BookingId=:booking) AS payments,(SELECT COUNT(*) FROM dbo.FinancialLedger WHERE BookingId=:booking AND Kind='Capture') AS captures",
        { booking },
      );
      assert.equal(counts.payments, 1);
      assert.equal(counts.captures, 1);
      console.log(
        "PASS late capture upgrades a failed attempt once; later failure cannot regress capture",
      );
      const next = await createOrder(booking, ctx, {
        idempotencyKey: randomUUID(),
        termsAccepted: true,
      });
      assert.equal(next.amount, 75000);
      const captured = {
        ...payment,
        id: "pay_Fixture2",
        order_id: next.orderId,
        amount: 75000,
        status: "captured",
      };
      await assert.rejects(
        () => settle({ ...captured, amount: 1 }),
        (e) => e.status === 409,
      );
      globalThis.fetch = originalFetch;
      const app = express();
      app.post("/", express.raw({ type: "application/json" }), webhook);
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const body = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: { ...captured, card: { number: "DO_NOT_STORE" } },
          },
        },
      });
      const eventId = `evt_${randomUUID().replaceAll("-", "")}`;
      const send = (id = eventId) =>
        originalFetch(`http://127.0.0.1:${server.address().port}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-razorpay-event-id": id,
            "x-razorpay-signature": createHmac("sha256", "fixture")
              .update(body)
              .digest("hex"),
          },
          body,
        });
      // Same signed content with distinct transport event identifiers still cannot double capture.
      assert.equal((await send()).status, 200);
      assert.equal((await send()).status, 200);
      assert.equal(
        (await send(`evt_${randomUUID().replaceAll("-", "")}`)).status,
        200,
      );
      await processPaymentEvents();
      [b] = await sql("SELECT * FROM dbo.Booking WHERE BookingId=:booking", {
        booking,
      });
      assert.equal(Number(b.PaidAmount), 1000);
      const stored = await sql(
        "SELECT PayloadJson FROM dbo.PaymentWebhookEvents WHERE PayloadJson LIKE '%pay_Fixture2%'",
      );
      assert.ok(stored.every((r) => !r.PayloadJson.includes("DO_NOT_STORE")));
      assert.match(
        await receipt(
          (
            await sql(
              "SELECT PaymentId FROM dbo.Payments WHERE BookingId=:booking AND GatewayTransactionId='pay_Fixture1'",
              { booking },
            )
          )[0].PaymentId,
          ctx,
        ),
        /250.00 INR/,
      );
      console.log(
        "PASS raw signed webhook inbox, redaction, duplicate delivery and atomic booking updates",
      );
      await sql(
        "UPDATE dbo.Booking SET BookingStatus='Completed' WHERE BookingId=:booking",
        { booking },
      );
      [b] = await sql("SELECT * FROM dbo.Booking WHERE BookingId=:booking", {
        booking,
      });
      await syncPayout(b, adminCtx, tx);
      const [commission] = await sql(
        "SELECT * FROM dbo.PlatformCommission WHERE BookingId=:booking",
        { booking },
      );
      assert.equal(Number(commission.CommissionAmount), 100);
      let [payout] = await sql(
        "SELECT * FROM dbo.VendorPayouts WHERE BookingId=:booking",
        { booking },
      );
      assert.equal(Number(payout.NetAmount), 900);
      await payoutDecision(
        payout.PayoutId,
        {
          action: "approve",
          expectedUpdatedAt: new Date(payout.UpdatedAt).toISOString(),
          note: "Reviewed captured ledger",
        },
        adminCtx,
      );
      [payout] = await sql(
        "SELECT * FROM dbo.VendorPayouts WHERE BookingId=:booking",
        { booking },
      );
      process.env.PAYOUT_SETTLEMENT_MODE = "manual";
      await payoutDecision(
        payout.PayoutId,
        {
          action: "start-settlement",
          expectedUpdatedAt: new Date(payout.UpdatedAt).toISOString(),
          note: "External settlement reserved",
          destination: "Verified fixture beneficiary ending 1234",
          destinationVerified: true,
        },
        adminCtx,
      );
      [payout] = await sql(
        "SELECT * FROM dbo.VendorPayouts WHERE BookingId=:booking",
        { booking },
      );
      const settlement = {
        action: "confirm-paid",
        expectedUpdatedAt: new Date(payout.UpdatedAt).toISOString(),
        note: "Verified external transfer",
        reference: `test-${randomUUID()}`,
        idempotencyKey: randomUUID(),
      };
      await payoutDecision(payout.PayoutId, settlement, adminCtx);
      await payoutDecision(payout.PayoutId, settlement, adminCtx);
      [counts] = await sql(
        "SELECT COUNT(*) AS count FROM dbo.FinancialLedger WHERE BookingId=:booking AND Kind='Payout'",
        { booking },
      );
      assert.equal(counts.count, 1);
      console.log(
        "PASS commission snapshot, payout eligibility, review, reservation and duplicate settlement",
      );
      // A separate booking exercises customer refund review without touching the completed payout.
      const refundBooking = randomUUID();
      await sql(
        "INSERT INTO dbo.Booking(BookingId,BookingNumber,EventId,CustomerId,VendorId,BookingDate,SubTotal,BookingStatus,PolicySnapshotJson) VALUES(:booking,:number,:event,:customer,:vendor,'2090-01-10',500,'Accepted',:policy)",
        {
          booking: refundBooking,
          number: `RF-${refundBooking.slice(0, 30)}`,
          event,
          customer,
          vendor,
          policy,
        },
      );
      await sql(
        "INSERT INTO dbo.CustomerPaymentOrders(BookingId,CustomerId,GatewayOrderId,AmountMinor,Currency) VALUES(:booking,:customer,'order_RefundFixture',50000,'INR')",
        { booking: refundBooking, customer },
      );
      await settle({
        ...captured,
        id: "pay_RefundFixture",
        order_id: "order_RefundFixture",
        amount: 50000,
      });
      await sql(
        "UPDATE dbo.Booking SET BookingStatus='Cancelled',CancelledAt=SYSUTCDATETIME() WHERE BookingId=:booking",
        { booking: refundBooking },
      );
      const request = {
        bookingId: refundBooking,
        amount: 125.5,
        reason: "Cancelled celebration",
        idempotencyKey: randomUUID(),
      };
      await assert.rejects(
        () => requestRefund({ ...request, amount: 501 }, ctx),
        (e) => e.status === 409,
      );
      const requested = await requestRefund(request, ctx);
      assert.equal((await requestRefund(request, ctx)).id, requested.id);
      assert.equal(
        (await refunds({}, context(other, "CUSTOMER"))).rows.length,
        0,
      );
      await review.decide(
        requested.id,
        { action: "approve", reason: "Policy and captured balance checked" },
        adminCtx,
      );
      assert.ok(
        (await review.list({}, adminCtx)).rows.some(
          (r) => r.RequestId === requested.id,
        ),
      );
      const [reserved] = await sql(
        "SELECT * FROM dbo.Refunds WHERE BookingId=:booking",
        { booking: refundBooking },
      );
      assert.equal(Number(reserved.RefundAmount), 125.5);
      assert.equal(reserved.RefundStatus, "Pending");
      const remote = {
        id: "rfnd_Fixture1",
        payment_id: "pay_RefundFixture",
        amount: 12550,
        currency: "INR",
        status: "processed",
        receipt: reserved.RefundReference,
      };
      await reconcileRefund(remote);
      await reconcileRefund(remote);
      await reconcileRefund({ ...remote, status: "pending" });
      [b] = await sql("SELECT * FROM dbo.Booking WHERE BookingId=:booking", {
        booking: refundBooking,
      });
      const summary = financialSummary(
        b,
        await financialRows(refundBooking, tx),
      );
      assert.equal(summary.refunded, 125.5);
      assert.equal(summary.refundEligible, 374.5);
      assert.equal(
        (await refunds({}, ctx)).rows.find((r) => r.id === requested.id).status,
        "Completed",
      );
      const overview = await reports.overview({}, adminCtx);
      assert.ok(Number(overview.totals.captured) >= 1500);
      await reports.reconciliation({}, adminCtx);
      await reports.earnings(context(owner, "VENDOR"));
      await reports.exportReport({}, adminCtx);
      console.log(
        "PASS partial refund eligibility, review, gateway confirmation, replay, out-of-order events and real reports",
      );
      passed = true;
    } finally {
      if (server) await new Promise((r) => server.close(r));
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
      globalThis.fetch = originalFetch;
    }
    throw rollback;
  });
} catch (e) {
  if (e !== rollback) {
    console.error(
      "Payment verification failed:",
      e.name,
      e.message,
      e.original?.message,
      e.original?.errors?.map((x) => x.message),
      e.stack,
    );
    process.exitCode = 1;
  }
} finally {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await sequelize.close();
}
if (passed)
  console.log(
    "Payment verification passed. All database fixtures rolled back; no real money moved.",
  );
