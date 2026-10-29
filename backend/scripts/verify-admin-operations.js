// Rollback-only verification against the configured MSSQL database. No transfers.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/014-admin-operations.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import { loadUser } from "../src/modules/auth/token.service.js";
import { capturePolicy } from "../src/modules/admin/booking-finance.js";
import { serviceSchema } from "../src/modules/vendors/service-management.validation.js";
import { availableService } from "../src/modules/customers/workspace.operations.js";
const rollback = new Error("ROLLBACK_ADMIN_OPERATIONS");
let passed = false;
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction,
      mode = process.env.PAYOUT_SETTLEMENT_MODE;
    let server;
    sequelize.query = function (sql, options = {}) {
      return originalQuery
        .call(this, sql, { ...options, transaction: tx })
        .catch((error) => {
          console.error(
            "SQL verification:",
            sql,
            error.original?.errors?.map((item) => item.message) ||
              error.original?.message ||
              error.message,
          );
          throw error;
        });
    };
    sequelize.transaction = async (fn) => fn(tx);
    const sql = (query, replacements = {}) =>
      sequelize.query(query, { replacements });
    try {
      await up(sequelize.getQueryInterface(), tx);
      const admin = randomUUID(),
        customer = randomUUID(),
        owner = randomUUID(),
        vendor = randomUUID(),
        event = randomUUID(),
        booking = randomUUID(),
        payment = randomUUID(),
        payout = randomUUID(),
        commission = randomUUID(),
        quotation = randomUUID(),
        refund = randomUUID(),
        notification = randomUUID();
      for (const [id, role] of [
        [admin, "ADMIN"],
        [customer, "CUSTOMER"],
        [owner, "VENDOR"],
      ]) {
        await sql(
          "INSERT INTO dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Operations fixture',:email,'not-a-login-password',1)",
          { id, email: `operations-${id}@example.invalid` },
        );
        await sql(
          "INSERT INTO dbo.UserRoles(UserId,RoleId) SELECT :id,RoleId FROM dbo.Roles WHERE RoleCode=:role",
          { id, role },
        );
      }
      await sql(
        "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:vendor,:owner,'Operations fixture vendor',:vendor,'Approved',1)",
        { vendor, owner },
      );
      await sql(
        "INSERT INTO dbo.Events(EventId,CustomerId,EventName,EventType,EventDate,GuestCount) VALUES(:event,:customer,'Operations fixture wedding','Wedding',CONVERT(date,SYSUTCDATETIME()),10)",
        { event, customer },
      );
      await sql(
        "INSERT INTO dbo.Quotations(QuotationId,QuotationNumber,EventId,CustomerId,VendorId,ValidUntil,SubTotal,Status) VALUES(:quotation,:quotation,:event,:customer,:vendor,DATEADD(day,7,SYSUTCDATETIME()),1000,'Accepted')",
        { quotation, event, customer, vendor },
      );
      await sql(
        "INSERT INTO dbo.QuotationItems(QuotationId,ItemName,Quantity,UnitPrice) VALUES(:quotation,'Fixture service',1,1000)",
        { quotation },
      );
      await sql(
        "INSERT INTO dbo.Booking(BookingId,BookingNumber,EventId,CustomerId,VendorId,BookingDate,SubTotal,PaidAmount,BookingStatus,PaymentStatus,QuotationId) VALUES(:booking,:booking,:event,:customer,:vendor,CONVERT(date,SYSUTCDATETIME()),1000,1000,'Completed','Paid',:quotation)",
        { booking, event, customer, vendor, quotation },
      );
      await sql(
        "INSERT INTO dbo.Payments(PaymentId,BookingId,PaymentReference,GatewayName,GatewayTransactionId,PaymentMethod,Amount,PaymentStatus,PaidAt) VALUES(:payment,:booking,:payment,'Razorpay','pay_fixture','UPI',1000,'Success',SYSUTCDATETIME())",
        { payment, booking },
      );
      await sql(
        "INSERT INTO dbo.PaymentTransactions(PaymentId,TransactionType,Amount,TransactionStatus) VALUES(:payment,'Capture',1000,'Success')",
        { payment },
      );
      await sql(
        "INSERT INTO dbo.PlatformCommission(CommissionId,BookingId,VendorId,CommissionRate,BookingAmount,CommissionAmount) VALUES(:commission,:booking,:vendor,10,1000,100)",
        { commission, booking, vendor },
      );
      await sql(
        "INSERT INTO dbo.VendorPayouts(PayoutId,VendorId,BookingId,GrossAmount,PlatformCommission) VALUES(:payout,:vendor,:booking,1000,100)",
        { payout, vendor, booking },
      );
      await sql(
        "INSERT INTO dbo.Refunds(RefundId,PaymentId,BookingId,RefundReference,RefundAmount,RefundStatus) VALUES(:refund,:payment,:booking,:refund,20,'Rejected')",
        { refund, payment, booking },
      );
      await sql(
        "INSERT INTO dbo.Notifications(NotificationId,UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) VALUES(:notification,:admin,'AdminEvent','Fixture notice','Fixture message','Booking',:booking)",
        { notification, admin, booking },
      );
      const adminUser = await loadUser(admin),
        customerUser = await loadUser(customer);
      const app = express();
      app.use(
        "/api/admin",
        createAdminRouter({
          authenticateRequest: async (req) =>
            req.get("x-fixture-anonymous")
              ? null
              : {
                  user: req.get("x-fixture-customer")
                    ? customerUser
                    : adminUser,
                },
        }),
      );
      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      const root = `http://127.0.0.1:${server.address().port}/api/admin`;
      async function request(
        path,
        method = "GET",
        body,
        expected = 200,
        headers = {},
      ) {
        const response = await fetch(root + path, {
          method,
          headers: {
            Origin: process.env.FRONTEND_URL,
            "X-Admin-Request": "1",
            "Content-Type": "application/json",
            ...headers,
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const result = await response.json();
        assert.equal(
          response.status,
          expected,
          `${method} ${path}: ${JSON.stringify(result)}`,
        );
        return result;
      }
      for (const path of [
        "/search?q=Operations",
        "/notifications/inbox",
        `/finance/payments/${payment}`,
        "/commission/configuration",
      ])
        for (const [headers, status] of [
          [{ "x-fixture-anonymous": "1" }, 401],
          [{ "x-fixture-customer": "1" }, 403],
        ])
          await request(path, "GET", undefined, status, headers);
      const day = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      const dashboard = await request(`/dashboard?from=${day}&to=${day}`);
      for (const key of [
        "customers",
        "vendors",
        "approvedVendors",
        "totalServices",
        "pendingServices",
        "bookings",
        "pendingBookings",
        "revenue",
        "pendingPayments",
        "pendingRefunds",
        "payouts",
        "commission",
      ])
        assert.ok(Number.isFinite(dashboard.kpis[key].total), key);
      assert.ok(Array.isArray(dashboard.paymentStatus));
      assert.ok(Array.isArray(dashboard.serviceCategories));
      assert.ok(
        (await request("/search?q=Operations")).rows.some(
          (row) => row.id.toLowerCase() === vendor.toLowerCase(),
        ),
      );
      const page = await request("/notifications/inbox?pageSize=1");
      assert.equal(page.rows.length, 1);
      await request(`/notifications/${notification}/read`, "PATCH", {
        read: true,
      });
      const own = await request("/notifications/inbox");
      assert.ok(
        own.rows.find(
          (row) => row.id.toLowerCase() === notification.toLowerCase(),
        ).read,
      );
      await sql(
        "UPDATE dbo.Notifications SET UserId=:customer WHERE NotificationId=:notification",
        { customer, notification },
      );
      await request(
        `/notifications/${notification}/read`,
        "PATCH",
        { read: false },
        404,
      );
      for (const [kind, id] of [
        ["quotations", quotation],
        ["payments", payment],
        ["refunds", refund],
        ["payouts", payout],
        ["commission", commission],
      ]) {
        const detail = await request(`/finance/${kind}/${id}`);
        assert.equal(detail.record.id.toLowerCase(), id.toLowerCase());
        await request(`/finance/${kind}/${id}/notes`, "POST", {
          note: "Integration review note",
        });
        assert.ok(
          (await request(`/finance/${kind}/${id}`)).history.some(
            (row) => row.note === "Integration review note",
          ),
        );
        assert.equal((await request(`/${kind}?q=${id}`)).total, 1);
      }
      const category = await request(
        "/categories",
        "POST",
        {
          name: `Operations ${admin}`,
          code: `OPS-${admin}`,
          description: "Integration category",
          icon: "Store",
          sortOrder: 99,
        },
        201,
      );
      await request(
        "/categories",
        "POST",
        {
          name: `Operations ${admin}`,
          code: `OTHER-${admin}`,
          description: "Duplicate",
        },
        409,
      );
      await request(
        "/sub-categories",
        "POST",
        {
          name: "Invalid parent",
          code: `SUB-${admin}`,
          categoryId: 2147483647,
          description: "Invalid",
        },
        400,
      );
      const subcategory = await request(
        "/sub-categories",
        "POST",
        {
          name: "Operations subcategory",
          code: `SUB-${admin}`,
          categoryId: category.id,
          description: "Valid parent",
          sortOrder: 0,
        },
        201,
      );
      assert.ok(subcategory.id);
      await sql(
        "INSERT INTO dbo.VendorCategories(VendorId,CategoryId) VALUES(:vendor,:category)",
        { vendor, category: category.id },
      );
      await sql(
        "INSERT INTO dbo.VendorLocations(VendorId,AddressLine1,City,State,Country) VALUES(:vendor,'Operations fixture address','Jaipur','Rajasthan','India')",
        { vendor },
      );
      assert.equal(
        (
          await request(
            `/vendors?category=${category.id}&location=Jaipur&q=${vendor}`,
          )
        ).total,
        1,
      );
      assert.equal(
        (await request(`/sub-categories?category=${category.id}`)).total,
        1,
      );
      assert.equal(
        (await request(`/payments?gateway=Razorpay&q=${payment}`)).total,
        1,
      );
      assert.equal(
        (await request(`/vendors/${vendor}/records/payments`)).total,
        1,
      );
      assert.equal(
        (await request(`/vendors/${vendor}/records/coupons`)).total,
        0,
      );
      await request(`/vendors/${vendor}/notes`, "POST", {
        note: "Independent vendor review note",
      });
      assert.ok(
        (await request(`/vendors/${vendor}/records/audit`)).rows.some(
          (row) => row.action === "ADMIN_VENDOR_NOTE_ADDED",
        ),
      );
      const customerList = await request(`/customers?q=${customer}`);
      assert.equal(Number(customerList.rows[0].totalBookings), 1);
      assert.equal(Number(customerList.rows[0].totalSpending), 1000);
      const categoryRow = (await request(`/categories?q=OPS-${admin}`)).rows[0];
      const editCategory = {
        name: `Updated ${admin}`,
        code: categoryRow.code,
        description: "Edited category",
        icon: "Store",
        sortOrder: 10,
        expectedUpdatedAt: categoryRow.updatedAt,
      };
      await request(`/categories/${category.id}`, "PATCH", editCategory);
      await request(`/categories/${category.id}`, "PATCH", editCategory, 409);
      const createdService = await request(
        "/services",
        "POST",
        {
          vendorId: vendor,
          ...serviceSchema.parse({
            name: "New category service",
            categoryId: category.id,
            subcategoryId: subcategory.id,
            pricing: { basePrice: 500 },
            location: {},
            availability: {},
            policies: {},
            seo: { slug: `ops-${randomUUID()}` },
          }),
        },
        201,
      );
      assert.ok(createdService.id);
      await sql(
        "UPDATE dbo.Services SET ApprovalStatus='Approved',IsActive=1 WHERE ServiceId=:id",
        { id: createdService.id },
      );
      await availableService(createdService.id, null, tx);
      assert.equal(
        (await request(`/categories?q=OPS-${admin}`)).rows[0].usageCount,
        1,
      );
      await request(`/categories/${category.id}/action`, "PATCH", {
        action: "Inactive",
        expectedStatus: "Active",
        note: "Review category usage",
      });
      await assert.rejects(
        () => availableService(createdService.id, null, tx),
        /Service unavailable/,
      );
      await request(
        `/sub-categories/${subcategory.id}/action`,
        "PATCH",
        {
          action: "Active",
          expectedStatus: "Active",
          note: "Inactive parent test",
        },
        409,
      );
      await request(`/categories/${category.id}/action`, "PATCH", {
        action: "Active",
        expectedStatus: "Inactive",
        note: "Restore reviewed category",
      });
      const builtIn = (
        await request("/categories?q=AUTH_SERVICE_1&pageSize=100")
      ).rows.find((row) => row.code === "AUTH_SERVICE_1");
      if (builtIn) {
        const renamed = `Operations venue ${admin}`;
        await request(`/categories/${builtIn.id}`, "PATCH", {
          name: renamed,
          code: builtIn.code,
          description: builtIn.description || "",
          sortOrder: builtIn.sortOrder,
          expectedUpdatedAt: builtIn.updatedAt,
        });
        assert.ok(
          (await request("/services/metadata")).templates[renamed].some(
            (field) => field.key === "minimumCapacity",
          ),
        );
      }
      const config = await request("/commission/configuration");
      await request("/commission/configuration", "PUT", {
        rate: 12.5,
        note: "New snapshot rate",
        expectedUpdatedAt: config.updatedAt,
      });
      await request(
        "/commission/configuration",
        "PUT",
        {
          rate: 20,
          note: "Stale configuration",
          expectedUpdatedAt: config.updatedAt,
        },
        409,
      );
      const futureBooking = randomUUID();
      await sql(
        "INSERT INTO dbo.Booking(BookingId,BookingNumber,EventId,CustomerId,VendorId,BookingDate,SubTotal,BookingStatus,PaymentStatus) VALUES(:futureBooking,:futureBooking,:event,:customer,:vendor,CONVERT(date,SYSUTCDATETIME()),1000,'Pending','Pending')",
        { futureBooking, event, customer, vendor },
      );
      await capturePolicy({ BookingId: futureBooking }, tx);
      const [[snapshot]] = await sql(
        "SELECT PolicySnapshotJson FROM dbo.Booking WHERE BookingId=:booking",
        { booking: futureBooking },
      );
      assert.equal(
        JSON.parse(snapshot.PolicySnapshotJson).commissionRate,
        12.5,
      );
      assert.equal(
        Number(
          (await request(`/finance/commission/${commission}`)).record
            .CommissionRate,
        ),
        10,
      );
      let detail = await request(`/finance/payouts/${payout}`);
      const decision = async (action, extra = {}, expected = 200) =>
        request(
          `/payouts/${payout}/decision`,
          "POST",
          {
            action,
            expectedUpdatedAt: detail.record.UpdatedAt,
            note: "Fixture settlement review",
            ...extra,
          },
          expected,
        );
      await decision("hold");
      detail = await request(`/finance/payouts/${payout}`);
      await decision("approve");
      detail = await request(`/finance/payouts/${payout}`);
      assert.equal(detail.record.status, "Pending");
      process.env.PAYOUT_SETTLEMENT_MODE = "disabled";
      await decision("start-settlement", {}, 503);
      process.env.PAYOUT_SETTLEMENT_MODE = "manual";
      await sql(
        "UPDATE dbo.VendorPayouts SET ApplicableFees=1 WHERE PayoutId=:payout",
        { payout },
      );
      await decision("start-settlement", {}, 409);
      await sql(
        "UPDATE dbo.VendorPayouts SET ApplicableFees=0 WHERE PayoutId=:payout",
        { payout },
      );
      await decision("start-settlement");
      detail = await request(`/finance/payouts/${payout}`);
      assert.equal(detail.record.status, "Processing");
      await decision("record-failure", {
        reference: "confirmed-failed-fixture",
        note: "Private settlement failure review",
      });
      detail = await request(`/finance/payouts/${payout}`);
      assert.equal(detail.record.status, "Failed");
      assert.ok(
        (await request("/notifications/inbox")).rows.some(
          (row) => row.title === "Payout failed",
        ),
      );
      const [vendorUpdates] = await sql(
        "SELECT Message FROM dbo.Notifications WHERE ReferenceId=:booking AND NotificationType='PayoutUpdate'",
        { booking },
      );
      assert.ok(vendorUpdates.length > 0);
      assert.ok(
        vendorUpdates.every(
          (row) => !row.Message.includes("Private settlement failure review"),
        ),
      );
      await decision("approve");
      detail = await request(`/finance/payouts/${payout}`);
      await decision("start-settlement");
      detail = await request(`/finance/payouts/${payout}`);
      await decision("hold", {}, 409);
      const key = randomUUID(),
        reference = `external-fixture-${key}`;
      const version = detail.record.UpdatedAt;
      await decision("confirm-paid", { idempotencyKey: key, reference });
      const replay = await request(`/payouts/${payout}/decision`, "POST", {
        action: "confirm-paid",
        expectedUpdatedAt: version,
        note: "Fixture settlement review",
        idempotencyKey: key,
        reference,
      });
      assert.equal(replay.replayed, true);
      detail = await request(`/finance/payouts/${payout}`);
      assert.equal(detail.record.status, "Paid");
      assert.equal(Number(detail.record.NetAmount), 900);
      await decision("hold", {}, 409);
      assert.ok(
        (await request("/notifications/inbox")).rows.some(
          (row) => row.title === "Payout status updated",
        ),
      );
      passed = true;
      console.log(
        "PASS: admin dashboard; real search; inbox ownership/read state; category CRUD/relationships; financial details/notes; commission snapshots/history; payout hold/approval/manual reservation/idempotent confirmation.",
      );
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
      if (mode === undefined) delete process.env.PAYOUT_SETTLEMENT_MODE;
      else process.env.PAYOUT_SETTLEMENT_MODE = mode;
    }
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    console.error("Admin operations verification failed:", error.message);
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
if (passed)
  console.log(
    "All fixtures and schema changes were rolled back. No external transfers occurred.",
  );
