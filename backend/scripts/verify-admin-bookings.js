// MSSQL + REST verification. All fixtures and migration changes roll back.
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/013-admin-bookings.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import { loadUser } from "../src/modules/auth/token.service.js";
import { processRefundQueue } from "../src/modules/admin/booking-refunds.service.js";
import {
  settle,
  recordFailedPayment,
  webhook,
} from "../src/modules/customers/workspace.payments.js";
const rollback = new Error("ROLLBACK_ADMIN_BOOKINGS");
let passed = false;
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction;
    let server;
    const oldSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    sequelize.query = function (sql, options = {}) {
      return originalQuery
        .call(this, sql, { ...options, transaction: tx })
        .catch((e) => {
          console.error(
            "SQL verification:",
            e.message,
            e.original?.errors?.map((x) => x.message),
          );
          throw e;
        });
    };
    sequelize.transaction = async (fn) => fn(tx);
    const sql = (s, replacements = {}) => sequelize.query(s, { replacements });
    try {
      await up(sequelize.getQueryInterface(), tx);
      const admin = randomUUID(),
        customer = randomUUID(),
        owner = randomUUID(),
        vendor = randomUUID(),
        event = randomUUID(),
        service = randomUUID(),
        id = randomUUID(),
        second = randomUUID(),
        pending = randomUUID(),
        payment = randomUUID(),
        gateway = `pay_${randomUUID().replaceAll("-", "")}`;
      for (const [uid, role] of [
        [admin, "ADMIN"],
        [customer, "CUSTOMER"],
        [owner, "VENDOR"],
      ]) {
        await sql(
          "INSERT INTO dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Booking fixture',:email,'not-a-login-password',1)",
          { id: uid, email: `booking-${uid}@example.invalid` },
        );
        await sql(
          "INSERT INTO dbo.UserRoles(UserId,RoleId) SELECT :id,RoleId FROM dbo.Roles WHERE RoleCode=:role",
          { id: uid, role },
        );
      }
      await sql(
        "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:vendor,:owner,'Booking fixture vendor',:vendor,'Approved',1)",
        { vendor, owner },
      );
      await sql(
        "INSERT INTO dbo.Events(EventId,CustomerId,EventName,EventType,EventDate,City,GuestCount,Budget) VALUES(:event,:customer,'Booking fixture event','Wedding',DATEADD(day,-1,CONVERT(date,SYSUTCDATETIME())),'Jaipur',100,100000)",
        { event, customer },
      );
      const [[category]] = await sql(
        "SELECT TOP(1) CategoryId AS id FROM dbo.Categories WHERE IsActive=1 ORDER BY CategoryId",
      );
      await sql(
        "INSERT INTO dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,BasePrice,ApprovalStatus,IsActive) VALUES(:service,:vendor,:category,'Fixture booked lawn',:service,1000,'Approved',1)",
        { service, vendor, category: category.id },
      );
      for (const [bid, status, paid] of [
        [id, "Confirmed", 1000],
        [second, "InProgress", 1000],
        [pending, "Pending", 0],
      ]) {
        await sql(
          "INSERT INTO dbo.Booking(BookingId,BookingNumber,EventId,CustomerId,VendorId,BookingDate,SubTotal,PaidAmount,BookingStatus,PaymentStatus) VALUES(:id,:number,:event,:customer,:vendor,DATEADD(day,-1,CONVERT(date,SYSUTCDATETIME())),1000,:paid,:status,:payment)",
          {
            id: bid,
            number: `BK-${bid.replaceAll("-", "")}`,
            event,
            customer,
            vendor,
            paid,
            status,
            payment: paid ? "Paid" : "Pending",
          },
        );
        await sql(
          "INSERT INTO dbo.BookingItems(BookingId,ServiceId,ItemName,Quantity,UnitPrice) VALUES(:id,:service,'Fixture lawn',1,1000)",
          { id: bid, service },
        );
      }
      await sql(
        "INSERT INTO dbo.Payments(PaymentId,BookingId,PaymentReference,GatewayName,GatewayTransactionId,PaymentMethod,Amount,Currency,PaymentStatus,PaidAt) VALUES(:payment,:id,:gateway,'Razorpay',:gateway,'UPI',1000,'INR','Success',SYSUTCDATETIME())",
        { payment, id, gateway },
      );
      const gateway2 = `pay_${randomUUID().replaceAll("-", "")}`;
      await sql(
        "INSERT INTO dbo.Payments(BookingId,PaymentReference,GatewayName,GatewayTransactionId,PaymentMethod,Amount,Currency,PaymentStatus) VALUES(:id,:gateway,'Razorpay',:gateway,'UPI',1000,'INR','Success')",
        { id: second, gateway: gateway2 },
      );
      for (const bid of [id, second])
        await sql(
          "INSERT INTO dbo.PlatformCommission(BookingId,VendorId,CommissionType,CommissionRate,BookingAmount,CommissionAmount) VALUES(:id,:vendor,'Percentage',10,1000,100)",
          { id: bid, vendor },
        );
      await sql(
        "INSERT INTO dbo.VendorPayouts(BookingId,VendorId,GrossAmount,PlatformCommission,PayoutStatus) VALUES(:id,:vendor,1000,100,'Pending')",
        { id, vendor },
      );
      const user = await loadUser(admin),
        app = express();
      app.use(
        "/api/admin",
        createAdminRouter({ authenticateRequest: async () => ({ user }) }),
      );
      app.post("/webhook", express.raw({ type: "application/json" }), webhook);
      app.use((req, res) => res.status(404).json({ message: "Not found" }));
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const root = `http://127.0.0.1:${server.address().port}`;
      async function request(path, method = "GET", body, expected = 200) {
        const response = await fetch(root + "/api/admin" + path, {
          method,
          headers: {
            "Content-Type": "application/json",
            Origin: process.env.FRONTEND_URL,
            "X-Admin-Request": "1",
            "User-Agent": "booking-integration-fixture",
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await response.json();
        assert.equal(
          response.status,
          expected,
          `${method} ${path}: ${JSON.stringify(data)}`,
        );
        return data;
      }
      const version = (d) => ({
        expectedUpdatedAt: new Date(d.booking.UpdatedAt).toISOString(),
      });
      let d = await request(`/bookings/${id}`);
      assert.equal(d.items.length, 1);
      assert.equal(d.financial.canRefund, false);
      assert.equal(d.financial.commission, 100);
      assert.equal((await request(`/bookings?q=${id}`)).total, 1);
      assert.equal(
        (
          await request(
            `/bookings?vendor=${vendor}&customer=${customer}&category=${category.id}&location=Jaipur&minAmount=900&maxAmount=1100&sort=amount&direction=asc`,
          )
        ).total,
        3,
      );
      await request("/bookings/statistics");
      await request(`/bookings/options?vendor=${vendor}&customer=${customer}`);
      await request(`/bookings/${id}/items`);
      await request(`/bookings/${id}/status-history`);
      await request(`/bookings/${id}/cancel`, "POST", {
        ...version(d),
        reason: "Customer requested cancellation",
        notes: "Review the original agreement.",
      });
      d = await request(`/bookings/${id}`);
      assert.equal(d.booking.BookingStatus, "Cancelled");
      assert.equal(d.booking.PaymentStatus, "Paid");
      assert.equal(Number(d.booking.PaidAmount), 1000);
      await request(
        `/bookings/${id}/refund`,
        "POST",
        {
          ...version(d),
          idempotencyKey: randomUUID(),
          reason: "Refund customer",
        },
        409,
      );
      await request(`/bookings/${id}/policy-review`, "POST", {
        ...version(d),
        policy: {
          refundPercent: 80,
          cancellationFeePercent: 10,
          minimumNoticeHours: 0,
        },
        reason: "Original agreement reviewed and refund terms verified.",
        notes: "Existing commission remains unchanged.",
      });
      d = await request(`/bookings/${id}`);
      assert.equal(d.financial.refundEligible, 700);
      const body = {
        ...version(d),
        idempotencyKey: randomUUID(),
        reason: "Refund according to the verified policy",
        notes: "Fixture refund only",
      };
      await request(
        `/bookings/${id}/refund`,
        "POST",
        { ...body, refundAmount: 10000 },
        400,
      );
      const initiated = await request(
        `/bookings/${id}/refund`,
        "POST",
        body,
        202,
      );
      const replay = await request(`/bookings/${id}/refund`, "POST", body, 202);
      assert.equal(
        initiated.operationId.toLowerCase(),
        replay.operationId.toLowerCase(),
      );
      assert.equal(replay.replayed, true);
      let payments = await request(`/bookings/${id}/payment`);
      assert.equal(payments.refunds.length, 1);
      assert.equal(payments.refunds[0].RefundAmount, 700);
      assert.equal(payments.payments[0].PaymentStatus, "Success");
      assert.equal(payments.summary.refundPending, 700);
      const remote = {
        id: `rfnd_${randomUUID().replaceAll("-", "")}`,
        payment_id: gateway,
        amount: 70000,
        currency: "INR",
        status: "processed",
        receipt: payments.refunds[0].RefundReference,
      };
      const result = await processRefundQueue({
        limit: 1,
        request: async (path, providerBody, key) => {
          assert.equal(path, `/payments/${gateway}/refund`);
          assert.equal(providerBody.amount, 70000);
          assert.equal(
            key.toLowerCase(),
            payments.refunds[0].RefundId.toLowerCase(),
          );
          return remote;
        },
      });
      assert.equal(result.processed, 1);
      process.env.RAZORPAY_WEBHOOK_SECRET = "integration-test-secret-only";
      const payload = JSON.stringify({
          event: "refund.processed",
          payload: { refund: { entity: remote } },
        }),
        signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
          .update(payload)
          .digest("hex");
      assert.equal(
        (
          await fetch(root + "/webhook", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-razorpay-signature": signature,
            },
            body: payload,
          })
        ).status,
        200,
      );
      payments = await request(`/bookings/${id}/payment`);
      assert.equal(payments.refunds[0].RefundStatus, "Completed");
      assert.equal(payments.summary.refunded, 700);
      assert.equal(payments.summary.refundEligible, 0);
      assert.equal(
        payments.transactions.filter(
          (t) => t.TransactionType === "RefundCompleted",
        ).length,
        1,
      );
      assert.equal(payments.payments[0].PaymentStatus, "Success");
      d = await request(`/bookings/${id}`);
      assert.equal(d.booking.PaymentStatus, "PartiallyRefunded");
      assert.ok(d.history.some((h) => h.status === "RefundCompleted"));
      assert.ok(
        d.audits.some((a) => a.userAgent === "booking-integration-fixture"),
      );
      const payout = await request(`/bookings/${id}/payout`);
      assert.equal(payout.rows[0].PayoutStatus, "OnHold");
      assert.equal(Number(payout.rows[0].NetAmount), 200);
      assert.equal(Number(payout.commissions[0].CommissionAmount), 100);
      await request(
        `/bookings/${id}/status`,
        "POST",
        {
          ...version(d),
          status: "Completed",
          reason: "Invalid cancelled completion",
        },
        409,
      );
      await request(`/bookings/${id}`, "DELETE", undefined, 404);
      let complete = await request(`/bookings/${second}`);
      await request(`/bookings/${second}/status`, "POST", {
        ...version(complete),
        status: "Completed",
        reason: "Event successfully completed",
      });
      complete = await request(`/bookings/${second}`);
      assert.equal(complete.booking.BookingStatus, "Completed");
      const completePayout = await request(`/bookings/${second}/payout`);
      assert.equal(completePayout.rows[0].PayoutStatus, "Pending");
      assert.equal(Number(completePayout.rows[0].NetAmount), 900);
      const pendingData = await request(`/bookings/${pending}`);
      await request(
        `/bookings/${pending}/status`,
        "POST",
        {
          ...version(pendingData),
          status: "Confirmed",
          reason: "Bypass vendor acceptance",
        },
        409,
      );
      await sql(
        "UPDATE dbo.Booking SET BookingStatus='Accepted' WHERE BookingId=:id",
        { id: pending },
      );
      const order = `order_${randomUUID().replaceAll("-", "")}`,
        capturedPayment = `pay_${randomUUID().replaceAll("-", "")}`;
      await sql(
        "INSERT INTO dbo.CustomerPaymentOrders(BookingId,CustomerId,GatewayOrderId,AmountMinor,Currency,Status) VALUES(:id,:customer,:order,100000,'INR','Created')",
        { id: pending, customer, order },
      );
      const captured = {
        id: capturedPayment,
        order_id: order,
        status: "captured",
        amount: 100000,
        currency: "INR",
        method: "upi",
        created_at: Math.floor(Date.now() / 1000),
      };
      await settle(captured);
      await settle(captured);
      let capturedDetails = await request(`/bookings/${pending}`);
      assert.equal(capturedDetails.booking.BookingStatus, "Confirmed");
      assert.equal(capturedDetails.financial.paid, 1000);
      assert.ok(
        capturedDetails.history.some((h) => h.status === "PaymentReceived"),
      );
      await recordFailedPayment({
        ...captured,
        id: `pay_${randomUUID().replaceAll("-", "")}`,
        status: "failed",
      });
      capturedDetails = await request(`/bookings/${pending}`);
      assert.equal(capturedDetails.booking.PaymentStatus, "Paid");
      assert.equal(capturedDetails.financial.paid, 1000);
      const captureLedger = await request(`/bookings/${pending}/payment`);
      assert.equal(
        captureLedger.transactions.filter(
          (t) => t.TransactionType === "Capture",
        ).length,
        1,
      );
      assert.equal(
        captureLedger.transactions.filter(
          (t) => t.TransactionType === "PaymentFailed",
        ).length,
        1,
      );
      const [[reviewNotice]] = await sql(
        "SELECT COUNT(*) AS total FROM dbo.Notifications WHERE ReferenceId=:id AND Title='Review requested' AND UserId=:customer",
        { id: second, customer },
      );
      assert.equal(reviewNotice.total, 1);
      assert.equal(
        (
          await fetch(root + "/webhook", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-razorpay-signature": "invalid",
            },
            body: payload,
          })
        ).status,
        400,
      );
      passed = true;
      console.log(
        "PASS: admin booking REST; scoped search/filters; details/items/history; cancellation; policy review; server refund calculation; idempotent initiation; provider worker; signed replay webhook; preserved transactions/commission; payout holds and completion; audit user agent; invalid transitions; no deletion.",
      );
    } finally {
      if (server) await new Promise((r) => server.close(r));
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
      if (oldSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
      else process.env.RAZORPAY_WEBHOOK_SECRET = oldSecret;
    }
    throw rollback;
  });
} catch (e) {
  if (e !== rollback) {
    console.error(
      "Admin booking verification failed:",
      e.message,
      e.original?.errors?.map((x) => x.message),
    );
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
if (passed)
  console.log(
    "All fixtures and schema changes were rolled back; no payment provider was contacted.",
  );
