// Integration verification: all fixtures, edits, notifications and audit logs roll back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import {
  customerDetails,
  customerRecords,
  editCustomer,
  changeCustomerStatus,
  notifyCustomer,
} from "../src/modules/admin/customers.service.js";
const rollback = new Error("ROLLBACK_CUSTOMER_VERIFICATION");
let passed = false;
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query;
    const originalTransaction = sequelize.transaction;
    sequelize.query = function (sql, options = {}) {
      return originalQuery.call(this, sql, { ...options, transaction: tx });
    };
    sequelize.transaction = async (fn) => fn(tx);
    try {
      const ids = Object.fromEntries(
        [
          "customer",
          "other",
          "admin",
          "vendor",
          "event",
          "otherEvent",
          "booking",
          "otherBooking",
          "service",
          "package",
          "conversation",
        ].map((k) => [k, randomUUID()]),
      );
      const query = (sql, replacements = {}) =>
        sequelize.query(sql, { replacements: { ...ids, ...replacements } });
      for (const id of [ids.customer, ids.other, ids.admin])
        await query(
          "INSERT INTO dbo.Users(UserId,FirstName,LastName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'CRM','Verification',:email,'fixture-not-a-password-hash',1)",
          { id, email: `crm-${id}@example.invalid` },
        );
      await query(
        "INSERT INTO dbo.UserRoles(UserId,RoleId) SELECT u.id,r.RoleId FROM (VALUES(CAST(:customer AS uniqueidentifier)),(CAST(:other AS uniqueidentifier))) u(id) CROSS JOIN dbo.Roles r WHERE r.RoleCode='CUSTOMER'",
      );
      await query(
        "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug) VALUES(:vendor,:admin,'CRM fixture vendor',:vendor)",
      );
      const [categories] = await query(
        "SELECT TOP(1) CategoryId AS id FROM dbo.Categories",
      );
      assert.ok(
        categories.length,
        "A service category must exist for integration checks.",
      );
      await query(
        "INSERT INTO dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug) VALUES(:service,:vendor,:category,'CRM fixture service',:service)",
        { category: categories[0].id },
      );
      await query(
        "INSERT INTO dbo.ServicePackages(PackageId,ServiceId,PackageName,Price) VALUES(:package,:service,'CRM fixture package',1000)",
      );
      for (const [event, customer] of [
        [ids.event, ids.customer],
        [ids.otherEvent, ids.other],
      ])
        await query(
          "INSERT INTO dbo.Events(EventId,CustomerId,EventName,EventType,EventDate,City,GuestCount,Budget) VALUES(:eventId,:owner,'CRM fixture event','Wedding','2027-01-01','Jaipur',100,50000)",
          { eventId: event, owner: customer },
        );
      for (const [booking, customer, event] of [
        [ids.booking, ids.customer, ids.event],
        [ids.otherBooking, ids.other, ids.otherEvent],
      ])
        await query(
          "INSERT INTO dbo.Booking(BookingId,BookingNumber,EventId,CustomerId,VendorId,BookingDate,SubTotal,PaidAmount,BookingStatus) VALUES(:bookingId,:reference,:eventId,:owner,:vendor,'2027-01-01',1000,400,'Confirmed')",
          {
            bookingId: booking,
            owner: customer,
            eventId: event,
            reference: `CRM-${booking.slice(0, 8)}`,
          },
        );
      await query(
        "INSERT INTO dbo.BookingItems(BookingId,ServiceId,ItemName,UnitPrice) VALUES(:booking,:service,'Ceremony coverage',1000)",
      );
      await query(
        "INSERT INTO dbo.Quotations(QuotationNumber,EventId,CustomerId,VendorId,SubTotal,Status) VALUES(:reference,:event,:customer,:vendor,1000,'Sent')",
        { reference: `CRM-${randomUUID().slice(0, 8)}` },
      );
      for (const [booking, currency, status, amount] of [
        [ids.booking, "INR", "Success", 400],
        [ids.booking, "INR", "Failed", 999],
        [ids.booking, "USD", "Success", 25],
        [ids.otherBooking, "INR", "Success", 900],
      ])
        await query(
          "INSERT INTO dbo.Payments(BookingId,PaymentReference,PaymentMethod,Amount,Currency,PaymentStatus,PaidAt) VALUES(:bookingId,:reference,'UPI',:amount,:currency,:status,SYSUTCDATETIME())",
          {
            bookingId: booking,
            reference: `CRM-${randomUUID()}`,
            currency,
            status,
            amount,
          },
        );
      await query(
        "INSERT INTO dbo.Reviews(BookingId,CustomerId,VendorId,Rating,ReviewText) VALUES(:booking,:customer,:vendor,5,'CRM verification review')",
      );
      await query(
        "INSERT INTO dbo.Wishlists(CustomerId,VendorId) VALUES(:customer,:vendor); INSERT INTO dbo.Wishlists(CustomerId,ServiceId) VALUES(:customer,:service); INSERT INTO dbo.Wishlists(CustomerId,PackageId) VALUES(:customer,:package)",
      );
      await query(
        "INSERT INTO dbo.Conversations(ConversationId,CustomerId,VendorId) VALUES(:conversation,:customer,:vendor); INSERT INTO dbo.Messages(ConversationId,SenderUserId,MessageText) VALUES(:conversation,:customer,'CRM verification message'); INSERT INTO dbo.Messages(ConversationId,SenderUserId,MessageText) VALUES(:conversation,:admin,'CRM verification reply')",
      );
      await query(
        "INSERT INTO dbo.Addresses(UserId,AddressType,AddressLine1,City,State) VALUES(:customer,'Home','CRM fixture street','Jaipur','Rajasthan')",
      );
      const ctx = {
        auth: {
          user: {
            id: ids.admin,
            active: true,
            emailVerified: true,
            roles: [{ code: "ADMIN", active: true }],
          },
        },
        req: { ip: "127.0.0.1" },
      };
      const details = await customerDetails(ids.customer, ctx);
      assert.equal(
        Number(details.summary.spending),
        400,
        "Only successful INR payments belong in the INR spending card.",
      );
      assert.equal(Number(details.summary.pending), 600);
      assert.equal(Number(details.summary.events), 1);
      assert.equal(Number(details.summary.bookings), 1);
      assert.equal(Number(details.summary.wishlist), 3);
      for (const section of [
        "events",
        "bookings",
        "quotations",
        "payments",
        "reviews",
        "wishlist",
        "messages",
        "addresses",
        "audit",
      ]) {
        const result = await customerRecords(
          ids.customer,
          section,
          { pageSize: 20 },
          ctx,
        );
        if (section === "audit") continue;
        assert.equal(
          result.total,
          section === "payments" || section === "wishlist"
            ? 3
            : section === "messages"
              ? 2
              : 1,
          `${section} must only include this customer's records`,
        );
      }
      assert.deepEqual(
        new Set(details.timeline.map((i) => i.type)),
        new Set([
          "account",
          "event",
          "quotation",
          "booking",
          "payment",
          "review",
        ]),
      );
      const wishlist = await customerRecords(ids.customer, "wishlist", {}, ctx);
      assert.deepEqual(
        new Set(wishlist.rows.map((i) => i.type)),
        new Set(["Vendor", "Service", "Package"]),
      );
      await changeCustomerStatus(
        ids.customer,
        {
          action: "Block",
          expectedActive: true,
          expectedBlocked: false,
          note: "CRM test block",
        },
        ctx,
      );
      await changeCustomerStatus(
        ids.customer,
        {
          action: "Deactivate",
          expectedActive: true,
          expectedBlocked: true,
          note: "CRM test deactivate",
        },
        ctx,
      );
      await changeCustomerStatus(
        ids.customer,
        {
          action: "Unblock",
          expectedActive: false,
          expectedBlocked: true,
          note: "CRM test unblock",
        },
        ctx,
      );
      let updated = await customerDetails(ids.customer, ctx);
      assert.equal(!!updated.customer.active, false);
      assert.equal(!!updated.customer.blocked, false);
      await changeCustomerStatus(
        ids.customer,
        {
          action: "Activate",
          expectedActive: false,
          expectedBlocked: false,
          note: "CRM test activate",
        },
        ctx,
      );
      updated = await customerDetails(ids.customer, ctx);
      await editCustomer(
        ids.customer,
        {
          firstName: "Updated",
          lastName: "Fixture",
          email: `updated-${ids.customer}@example.invalid`,
          phone: "",
          dateOfBirth: "1995-01-01",
          expectedUpdatedAt: new Date(updated.customer.updatedAt).toISOString(),
        },
        ctx,
      );
      updated = await customerDetails(ids.customer, ctx);
      assert.equal(updated.customer.firstName, "Updated");
      assert.equal(!!updated.customer.emailVerified, false);
      await notifyCustomer(
        ids.customer,
        { title: "CRM test", message: "Rolled back notification" },
        ctx,
      );
      const [notifications] = await query(
        "SELECT COUNT(*) AS total FROM dbo.Notifications WHERE UserId=:customer",
      );
      assert.equal(notifications[0].total, 1);
      const audit = await customerRecords(ids.customer, "audit", {}, ctx);
      assert.equal(audit.total, 6);
      passed = true;
    } finally {
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
    }
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    console.error("Customer integration verification failed:", error.message);
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
if (passed && !process.exitCode)
  console.log(
    "PASS: all customer tabs, record isolation, currency-safe totals, six activity types, wishlist targets, account actions, edits, notifications and audits. All fixtures rolled back.",
  );
