// Real MSSQL lifecycle verification. DDL, fixtures, notifications and ledgers roll back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { createCustomerRouter } from "../src/modules/customers/workspace.routes.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/015-booking-lifecycle.js";
import { loadUser } from "../src/modules/auth/token.service.js";
import {
  book,
  decideQuote,
} from "../src/modules/customers/workspace.operations.js";
import { bookingDecision } from "../src/modules/vendors/workspace.operations.js";
import {
  details,
  requestChange,
  decideChange,
  editOptionalItem,
} from "../src/modules/bookings/bookings.service.js";
import { changeStatus } from "../src/modules/admin/bookings-management.service.js";
import { settle } from "../src/modules/customers/workspace.payments.js";
const rollback = new Error("ROLLBACK_LIFECYCLE");
let passed = false;
try {
  const [schema] = await sequelize.query(
    "SELECT TABLE_NAME,STRING_AGG(CONVERT(nvarchar(max),COLUMN_NAME),', ') AS columns FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN('Booking','BookingItems','BookingStatusHistory','BookingChangeRequests','VendorAvailability') GROUP BY TABLE_NAME",
  );
  console.log("Inspected live booking schema:", JSON.stringify(schema));
  // Prove independent SQL sessions cannot hold the reservation lock together.
  const first = await sequelize.transaction(),
    second = await sequelize.transaction();
  try {
    const key = `BookingLockVerification:${randomUUID()}`;
    const sql =
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource=:key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=50; SELECT @r AS result;";
    const [a] = await sequelize.query(sql, {
      replacements: { key },
      transaction: first,
    });
    const [b] = await sequelize.query(sql, {
      replacements: { key },
      transaction: second,
    });
    assert.ok(a[0].result >= 0);
    assert.ok(b[0].result < 0);
    console.log(
      "PASS independent MSSQL sessions serialize exclusive reservation locks",
    );
  } finally {
    await first.rollback();
    await second.rollback();
  }
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction;
    let server;
    sequelize.query = function (sql, options = {}) {
      return originalQuery.call(this, sql, { ...options, transaction: tx });
    };
    sequelize.transaction = async (fn) => fn(tx);
    const sql = (s, replacements = {}) => sequelize.query(s, { replacements });
    try {
      await up(sequelize.getQueryInterface(), tx);
      await up(sequelize.getQueryInterface(), tx); // safe to re-run
      const admin = randomUUID(),
        customer = randomUUID(),
        other = randomUUID(),
        owner = randomUUID(),
        vendor = randomUUID(),
        event = randomUUID(),
        service = randomUUID();
      for (const [id, role] of [
        [admin, "ADMIN"],
        [customer, "CUSTOMER"],
        [other, "CUSTOMER"],
        [owner, "VENDOR"],
      ]) {
        await sql(
          "INSERT INTO dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Lifecycle fixture',:email,'no-login',1)",
          { id, email: `lifecycle-${id}@example.invalid` },
        );
        await sql(
          "INSERT INTO dbo.UserRoles(UserId,RoleId) SELECT :id,RoleId FROM dbo.Roles WHERE RoleCode=:role",
          { id, role },
        );
      }
      await sql(
        "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:vendor,:owner,'Lifecycle fixture',:vendor,'Approved',1)",
        { vendor, owner },
      );
      const [[category]] = await sql(
        "SELECT TOP(1) CategoryId AS id FROM dbo.Categories WHERE IsActive=1 ORDER BY CategoryId",
      );
      await sql(
        "INSERT INTO dbo.Events(EventId,CustomerId,EventName,EventType,EventDate,City,GuestCount,Budget) VALUES(:event,:customer,'Lifecycle fixture','Wedding','2090-01-10','Jaipur',100,100000)",
        { event, customer },
      );
      const document = {
        policies: {
          advanceRequired: true,
          advancePercentage: 25,
          bookingRefundPolicy: {
            refundPercent: 80,
            cancellationFeePercent: 5,
            minimumNoticeHours: 24,
          },
          cancellation: "Cancellation subject to approval",
          refund: "80 percent less cancellation fees",
        },
      };
      await sql(
        "INSERT INTO dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,BasePrice,ApprovalStatus,IsActive,DetailsJson) VALUES(:service,:vendor,:category,'Lifecycle lawn',:service,1000,'Approved',1,:document)",
        {
          service,
          vendor,
          category: category.id,
          document: JSON.stringify(document),
        },
      );
      const [[item]] = await sql(
        "INSERT INTO dbo.ServiceItems(ServiceId,ItemName,Description,UnitPrice,IsIncluded) OUTPUT INSERTED.ServiceItemId AS id VALUES(:service,'Extra flowers','Flowers snapshot',100,0)",
        { service },
      );
      const context = async (id) => ({
        auth: { user: await loadUser(id) },
        req: { ip: "127.0.0.1", get: () => "lifecycle-verification" },
      });
      const c = await context(customer),
        v = await context(owner),
        a = await context(admin),
        stranger = await context(other);
      const app = express(),
        contexts = { customer: c, vendor: v, admin: a, stranger };
      const authenticateRequest = async (req) =>
        contexts[req.get("x-fixture-user")]?.auth || { user: null };
      app.use("/api/customer", createCustomerRouter({ authenticateRequest }));
      app.use("/api/vendor", createVendorRouter({ authenticateRequest }));
      app.use("/api/admin", createAdminRouter({ authenticateRequest }));
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const http = async (role, path, body, expected = 200) => {
        const response = await fetch(
          `http://127.0.0.1:${server.address().port}/api/${role}${path}`,
          {
            method: body ? "POST" : "GET",
            headers: {
              "x-fixture-user": role,
              "Content-Type": "application/json",
              Origin: process.env.FRONTEND_URL || "http://localhost:5173",
              [`X-${role}-Request`]: "1",
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
          },
        );
        const result = await response.json();
        assert.equal(response.status, expected, JSON.stringify(result));
        return result.data || result;
      };
      const body = {
        eventId: event,
        serviceId: service,
        quantity: 1,
        items: [{ id: item.id, quantity: 2 }],
        requirements: "Pastel flowers",
      };
      const preview = await http("customer", "/bookings/preview", body);
      assert.equal(preview.total, 1200);
      assert.equal(preview.advance, 300);
      await http("customer", "/bookings", { ...body, total: 1 }, 400);
      await assert.rejects(
        () => book({ ...body, total: 1 }, c),
        (e) => e.name === "ZodError",
      );
      const created = await http("customer", "/bookings", {
        ...body,
        reviewToken: preview.reviewToken,
      });
      assert.match(created.number, /^BK-/);
      await assert.rejects(() => book(body, c), /already have|reserves/);
      let d = await details(created.id, c, "Customer");
      assert.equal(Number(d.booking.TotalAmount), 1200);
      assert.equal(Number(d.booking.AdvanceAmount), 300);
      assert.equal(d.items.length, 2);
      assert.equal(
        JSON.parse(d.booking.EventSnapshotJson).requirements,
        "Pastel flowers",
      );
      await assert.rejects(
        () => details(created.id, stranger, "Customer"),
        /not found/,
      );
      await sql(
        "UPDATE dbo.Booking SET AdminNotes='SECRET ADMIN',VendorNotes='SECRET VENDOR' WHERE BookingId=:id",
        { id: created.id },
      );
      await sql(
        "INSERT INTO dbo.BookingStatusHistory(BookingId,OldStatus,NewStatus,ActorRole,Notes,Remarks) VALUES(:id,'Pending','Pending','Admin','SECRET ADMIN','SECRET ADMIN')",
        { id: created.id },
      );
      d = await details(created.id, c, "Customer");
      assert.ok(!JSON.stringify(d).includes("SECRET"));
      const addon = d.items.find((i) => i.serviceItemId);
      await editOptionalItem(created.id, addon.id, { quantity: 3 }, c);
      d = await details(created.id, c, "Customer");
      assert.equal(Number(d.booking.TotalAmount), 1300);
      await editOptionalItem(created.id, addon.id, { quantity: 2 }, c);
      await bookingDecision(created.id, { action: "Accept" }, v);
      const vendorView = await http("vendor", `/bookings/${created.id}`);
      assert.equal(
        vendorView.booking.BookingId.toLowerCase(),
        created.id.toLowerCase(),
      );
      await assert.rejects(
        () => editOptionalItem(created.id, addon.id, { quantity: 1 }, c),
        /before vendor acceptance/,
      );
      d = await details(created.id, c, "Customer");
      assert.equal(d.booking.BookingStatus, "Accepted");
      assert.equal(d.booking.PaymentStatus, "Pending");
      await sql(
        "UPDATE dbo.Services SET BasePrice=9999 WHERE ServiceId=:service",
        { service },
      );
      d = await details(created.id, c, "Customer");
      assert.equal(Number(d.booking.TotalAmount), 1200);
      const reschedule = await http(
        "customer",
        `/bookings/${created.id}/change-requests`,
        { kind: "Reschedule", date: "2090-01-11", reason: "Move celebration" },
      );
      await assert.rejects(
        () =>
          requestChange(
            created.id,
            { kind: "Cancellation", reason: "Duplicate request" },
            c,
          ),
        /already pending/,
      );
      d = await details(created.id, c, "Customer");
      assert.equal(String(d.booking.BookingDate).slice(0, 10), "2090-01-10");
      // Newly blocked slot must fail approval while preserving original dates.
      await sql(
        "INSERT INTO dbo.VendorAvailability(VendorId,ServiceId,AvailableDate,Status) VALUES(:vendor,:service,'2090-01-11','Blocked')",
        { vendor, service },
      );
      await assert.rejects(
        () =>
          decideChange(
            created.id,
            reschedule.id,
            { action: "Approve", reason: "Checked new date" },
            v,
            "Vendor",
          ),
        /unavailable/,
      );
      d = await details(created.id, c, "Customer");
      assert.equal(String(d.booking.BookingDate).slice(0, 10), "2090-01-10");
      await sql(
        "DELETE FROM dbo.VendorAvailability WHERE VendorId=:vendor AND AvailableDate='2090-01-11'",
        { vendor },
      );
      await http(
        "vendor",
        `/bookings/${created.id}/change-requests/${reschedule.id}/decision`,
        { action: "Approve", reason: "New date available" },
      );
      const adminRequests = await http(
        "admin",
        `/bookings/${created.id}/change-requests`,
      );
      assert.ok(
        adminRequests.some(
          (r) => r.id.toLowerCase() === reschedule.id.toLowerCase(),
        ),
      );
      d = await details(created.id, c, "Customer");
      assert.equal(String(d.booking.BookingDate).slice(0, 10), "2090-01-11");
      await assert.rejects(
        () =>
          decideChange(
            created.id,
            reschedule.id,
            { action: "Approve", reason: "Replay approval" },
            v,
            "Vendor",
          ),
        /already been decided/,
      );
      // Settlement uses provider-verified captured data (no external charge).
      const order = `order_${randomUUID().replaceAll("-", "")}`,
        payment = `pay_${randomUUID().replaceAll("-", "")}`;
      await sql(
        "INSERT INTO dbo.CustomerPaymentOrders(BookingId,CustomerId,GatewayOrderId,AmountMinor,Currency,Status) VALUES(:id,:customer,:order,120000,'INR','Created')",
        { id: created.id, customer, order },
      );
      await settle({
        id: payment,
        order_id: order,
        amount: 120000,
        currency: "INR",
        status: "captured",
        captured: true,
        method: "card",
        created_at: Math.floor(Date.now() / 1000),
      });
      d = await details(created.id, c, "Customer");
      assert.equal(d.booking.BookingStatus, "Confirmed");
      assert.equal(d.booking.PaymentStatus, "Paid");
      const cancel = await requestChange(
        created.id,
        { kind: "Cancellation", reason: "Event cancelled by family" },
        v,
        "Vendor",
      );
      await assert.rejects(
        () =>
          decideChange(
            created.id,
            cancel.id,
            { action: "Approve", reason: "Approve own cancellation" },
            v,
            "Vendor",
          ),
        /administrator/,
      );
      await http(
        "admin",
        `/bookings/${created.id}/change-requests/${cancel.id}/decision`,
        { action: "Approve", reason: "Reviewed vendor cancellation" },
      );
      d = await details(created.id, c, "Customer");
      assert.equal(d.booking.BookingStatus, "Cancelled");
      assert.equal(d.booking.PaymentStatus, "Paid");
      assert.equal(d.refunds.length, 0);
      assert.equal(d.refundEstimate, 900);
      assert.ok(d.history.some((h) => h.action === "RescheduleApproved"));
      assert.ok(d.history.some((h) => h.action === "CancellationApproved"));
      // Rejection is terminal, frees the day, and never invents a payment.
      const next = await book(body, c);
      await bookingDecision(
        next.id,
        { action: "Reject", note: "Unavailable staff" },
        v,
      );
      await assert.rejects(
        () => bookingDecision(next.id, { action: "Accept" }, v),
        /no longer pending/,
      );
      // Quotation acceptance copies agreed item totals into the same booking aggregate.
      const quote = randomUUID();
      await sql(
        "INSERT INTO dbo.Quotations(QuotationId,QuotationNumber,EventId,CustomerId,VendorId,Status,SubTotal,ValidUntil) VALUES(:quote,:number,:event,:customer,:vendor,'Sent',500,'2090-02-01')",
        { quote, number: `Q-${quote.slice(0, 20)}`, event, customer, vendor },
      );
      await sql(
        "INSERT INTO dbo.QuotationItems(QuotationId,ServiceId,ItemName,Quantity,UnitPrice) VALUES(:quote,:service,'Agreed lawn',1,500)",
        { quote, service },
      );
      const accepted = await decideQuote(quote, { action: "Accept" }, c);
      d = await details(accepted.id, c, "Customer");
      assert.equal(Number(d.booking.TotalAmount), 500);
      await bookingDecision(accepted.id, { action: "Accept" }, v);
      await sql(
        "UPDATE dbo.Booking SET BookingStatus='InProgress',BookingDate=DATEADD(day,-1,CONVERT(date,SYSUTCDATETIME())),PaidAmount=500,PaymentStatus='Paid' WHERE BookingId=:id",
        { id: accepted.id },
      );
      await sql(
        "INSERT INTO dbo.Payments(BookingId,PaymentReference,GatewayName,GatewayTransactionId,PaymentMethod,Amount,Currency,PaymentStatus) VALUES(:id,:reference,'Razorpay',:reference,'card',500,'INR','Success')",
        {
          id: accepted.id,
          reference: `pay_${randomUUID().replaceAll("-", "")}`,
        },
      );
      d = await details(accepted.id, c, "Customer");
      await changeStatus(
        accepted.id,
        "Completed",
        {
          expectedUpdatedAt: new Date(d.booking.UpdatedAt).toISOString(),
          reason: "Event fulfilled and payment verified",
        },
        a,
      );
      d = await details(accepted.id, c, "Customer");
      assert.equal(d.booking.BookingStatus, "Completed");
      console.log(
        "PASS preview, snapshots, add-ons, duplicate rejection, ownership, private history, vendor acceptance/rejection, blocked reschedule rollback, reschedule approval/replay, captured settlement, vendor cancellation/admin decision, refund estimate, quotation and completion",
      );
      // Date-dependent pricing requires a revised agreement; original day survives.
      await sql(
        "UPDATE dbo.Services SET BasePrice=1000,DetailsJson=:document WHERE ServiceId=:service",
        {
          service,
          document: JSON.stringify({
            pricing: {
              basePrice: 1000,
              minimumQuantity: 1,
              maximumQuantity: 1000,
              seasonalPrice: 1500,
              seasonalFrom: "2090-01-15",
              seasonalTo: "2090-01-15",
            },
          }),
        },
      );
      const seasonalEvent = randomUUID();
      const couponCode = `LIFE_${randomUUID().slice(0, 8).toUpperCase()}`;
      await sql(
        "INSERT INTO dbo.Coupons(CouponCode,VendorId,DiscountType,DiscountValue,MinimumBookingAmount,UsageLimit,StartDate,EndDate) VALUES(:code,:vendor,'Percentage',10,500,1,'2020-01-01','2091-01-01')",
        { code: couponCode, vendor },
      );
      await sql(
        "INSERT INTO dbo.Events(EventId,CustomerId,EventName,EventType,EventDate,City,GuestCount,Budget) VALUES(:event,:customer,'Seasonal fixture','Wedding','2090-01-10','Jaipur',100,100000)",
        { event: seasonalEvent, customer },
      );
      const priced = await book(
        { eventId: seasonalEvent, serviceId: service, coupon: couponCode },
        c,
      );
      await bookingDecision(priced.id, { action: "Accept" }, v);
      await assert.rejects(
        () =>
          requestChange(
            priced.id,
            { kind: "Reschedule", date: "2090-01-15", reason: "Seasonal date" },
            c,
          ),
        /revised quotation/,
      );
      const same = await details(priced.id, c, "Customer");
      assert.equal(Number(same.booking.TotalAmount), 900);
      const [[used]] = await sql(
        "SELECT UsedCount FROM dbo.Coupons WHERE CouponCode=:code",
        { code: couponCode },
      );
      assert.equal(used.UsedCount, 1);
      assert.equal(String(same.booking.BookingDate).slice(0, 10), "2090-01-10");
      console.log(
        "PASS optional item edits, confirmed item protection, transactional coupon redemption and price-changing reschedule rejection",
      );
      passed = true;
    } finally {
      if (server) await new Promise((r) => server.close(r));
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
    }
    throw rollback;
  });
} catch (e) {
  if (e !== rollback) {
    console.error(
      "Lifecycle verification failed:",
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
    "PASS all lifecycle fixtures and migration changes rolled back; no external payments or refunds sent.",
  );
