// Integration verification. All business data, decisions, sessions and notifications roll back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sequelize } from "../src/config/database.js";
import {
  vendorDetails,
  vendorRecords,
  setVendorActive,
  reviewVendorDocument,
  vendorDocumentFile,
} from "../src/modules/admin/vendor-details.service.js";
import { reviewVendor } from "../src/modules/admin/admin.service.js";
import { auditAdmin } from "../src/modules/admin/admin.repository.js";

const rollback = new Error("ROLLBACK_VENDOR_VERIFICATION");
let passed = false;
const documentRoot = await mkdtemp(
  path.join(os.tmpdir(), "marrynest-vendor-check-"),
);
const previousRoot = process.env.DOCUMENT_STORAGE_PATH;
process.env.DOCUMENT_STORAGE_PATH = documentRoot;
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction;
    sequelize.query = function (sql, options = {}) {
      return originalQuery.call(this, sql, { ...options, transaction: tx });
    };
    sequelize.transaction = async (fn) => fn(tx);
    try {
      const ids = Object.fromEntries(
        [
          "customer",
          "prospect",
          "otherCustomer",
          "owner",
          "otherOwner",
          "admin",
          "vendor",
          "otherVendor",
          "service",
          "otherService",
          "package",
          "otherPackage",
          "event",
          "otherEvent",
          "completedBooking",
          "pendingBooking",
          "cancelledBooking",
          "otherBooking",
          "document",
          "conversation",
          "otherConversation",
          "session",
        ].map((key) => [key, randomUUID()]),
      );
      const query = (sql, replacements = {}) =>
        sequelize.query(sql, { replacements: { ...ids, ...replacements } });
      const key = `${randomUUID()}.pdf`;
      await writeFile(
        path.join(documentRoot, key),
        "%PDF-1.7\nCRM test document",
      );
      for (const id of [
        ids.customer,
        ids.prospect,
        ids.otherCustomer,
        ids.owner,
        ids.otherOwner,
        ids.admin,
      ])
        await query(
          "INSERT INTO dbo.Users(UserId,FirstName,LastName,Email,PasswordHash,IsEmailVerified) VALUES(:userId,'Vendor CRM','Fixture',:email,'fixture-not-a-password-hash',1)",
          { userId: id, email: `vendor-check-${id}@example.invalid` },
        );
      for (const [vendorId, ownerId] of [
        [ids.vendor, ids.owner],
        [ids.otherVendor, ids.otherOwner],
      ])
        await query(
          "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,GSTNumber,PANNumber) VALUES(:vendorId,:ownerId,'Vendor CRM fixture',:vendorId,'GST-fixture','PAN-fixture')",
          { vendorId, ownerId },
        );
      const [categories] = await query(
        "SELECT TOP(1) CategoryId AS id FROM dbo.Categories",
      );
      assert.ok(categories.length, "At least one service category must exist.");
      await query(
        "INSERT INTO dbo.VendorCategories(VendorId,CategoryId,IsPrimary) VALUES(:vendor,:category,1)",
        { category: categories[0].id },
      );
      await query(
        "INSERT INTO dbo.VendorLocations(VendorId,AddressLine1,City,State) VALUES(:vendor,'CRM fixture street','Jaipur','Rajasthan')",
      );
      await query(
        "INSERT INTO dbo.VendorDocuments(VendorDocumentId,VendorId,DocumentType,DocumentNumber,DocumentUrl) VALUES(:document,:vendor,'PAN','fixture-number',:key)",
        { key },
      );
      for (const [serviceId, vendorId] of [
        [ids.service, ids.vendor],
        [ids.otherService, ids.otherVendor],
      ])
        await query(
          "INSERT INTO dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,BasePrice,ApprovalStatus) VALUES(:serviceId,:vendorId,:category,'CRM fixture service',:serviceId,1000,'Approved')",
          { serviceId, vendorId, category: categories[0].id },
        );
      for (const [packageId, serviceId] of [
        [ids.package, ids.service],
        [ids.otherPackage, ids.otherService],
      ])
        await query(
          "INSERT INTO dbo.ServicePackages(PackageId,ServiceId,PackageName,Price,DiscountPercentage,MinimumGuests,MaximumGuests) VALUES(:packageId,:serviceId,'CRM fixture package',1000,10,50,100)",
          { packageId, serviceId },
        );
      await query(
        "INSERT INTO dbo.Media(EntityType,EntityId,MediaType,MediaUrl) VALUES('Service',:service,'Image','https://example.invalid/fixture.jpg')",
      );
      await query(
        "INSERT INTO dbo.VendorAvailability(VendorId,AvailableDate,Status) VALUES(:vendor,'2027-01-01','Available')",
      );
      for (const [eventId, customerId] of [
        [ids.event, ids.customer],
        [ids.otherEvent, ids.otherCustomer],
      ])
        await query(
          "INSERT INTO dbo.Events(EventId,CustomerId,EventName,EventType,EventDate) VALUES(:eventId,:customerId,'CRM fixture wedding','Wedding','2027-01-01')",
          { eventId, customerId },
        );
      for (const [bookingId, vendorId, customerId, eventId, status, paid] of [
        [
          ids.completedBooking,
          ids.vendor,
          ids.customer,
          ids.event,
          "Completed",
          400,
        ],
        [
          ids.pendingBooking,
          ids.vendor,
          ids.customer,
          ids.event,
          "Confirmed",
          0,
        ],
        [
          ids.cancelledBooking,
          ids.vendor,
          ids.customer,
          ids.event,
          "Cancelled",
          0,
        ],
        [
          ids.otherBooking,
          ids.otherVendor,
          ids.otherCustomer,
          ids.otherEvent,
          "Completed",
          0,
        ],
      ])
        await query(
          "INSERT INTO dbo.Booking(BookingId,BookingNumber,EventId,CustomerId,VendorId,BookingDate,SubTotal,PaidAmount,BookingStatus) VALUES(:bookingId,:reference,:eventId,:customerId,:vendorId,'2027-01-01',1000,:paid,:status)",
          {
            bookingId,
            vendorId,
            customerId,
            eventId,
            status,
            paid,
            reference: `VC-${bookingId.slice(0, 8)}`,
          },
        );
      await query(
        "INSERT INTO dbo.BookingItems(BookingId,ServiceId,ItemName,UnitPrice) VALUES(:completedBooking,:service,'CRM fixture service',1000)",
      );
      await query(
        "INSERT INTO dbo.Quotations(QuotationNumber,EventId,CustomerId,VendorId,SubTotal,Status) VALUES(:reference,:event,:prospect,:vendor,1000,'Sent')",
        { reference: `VC-${randomUUID().slice(0, 8)}` },
      );
      for (const [bookingId, vendorId, gross, commission, tax, status] of [
        [ids.completedBooking, ids.vendor, 500, 50, 10, "Paid"],
        [ids.pendingBooking, ids.vendor, 1000, 100, 20, "Pending"],
        [ids.otherBooking, ids.otherVendor, 10000, 1000, 200, "Paid"],
      ])
        await query(
          "INSERT INTO dbo.VendorPayouts(BookingId,VendorId,GrossAmount,PlatformCommission,TaxDeduction,PayoutStatus) VALUES(:bookingId,:vendorId,:gross,:commission,:tax,:status)",
          { bookingId, vendorId, gross, commission, tax, status },
        );
      for (const [bookingId, amount, currency, status] of [
        [ids.completedBooking, 400, "INR", "Success"],
        [ids.completedBooking, 900, "INR", "Failed"],
        [ids.completedBooking, 25, "USD", "Success"],
        [ids.otherBooking, 10000, "INR", "Success"],
      ])
        await query(
          "INSERT INTO dbo.Payments(BookingId,PaymentReference,PaymentMethod,Amount,Currency,PaymentStatus) VALUES(:bookingId,:reference,'UPI',:amount,:currency,:status)",
          {
            bookingId,
            amount,
            currency,
            status,
            reference: `VC-${randomUUID()}`,
          },
        );
      for (const [bookingId, customerId, vendorId, rating, published] of [
        [ids.completedBooking, ids.customer, ids.vendor, 5, 1],
        [ids.pendingBooking, ids.customer, ids.vendor, 1, 0],
        [ids.otherBooking, ids.otherCustomer, ids.otherVendor, 2, 1],
      ])
        await query(
          "INSERT INTO dbo.Reviews(BookingId,CustomerId,VendorId,Rating,ReviewText,IsPublished) VALUES(:bookingId,:customerId,:vendorId,:rating,'CRM fixture review',:published)",
          { bookingId, customerId, vendorId, rating, published },
        );
      for (const [vendorId, serviceId] of [
        [ids.vendor, null],
        [null, ids.service],
        [ids.otherVendor, null],
        [null, null],
      ])
        await query(
          "INSERT INTO dbo.Offers(VendorId,ServiceId,OfferName,DiscountType,DiscountValue,StartDate,EndDate) VALUES(:vendorId,:serviceId,'CRM fixture offer','Percentage',10,'2027-01-01','2027-02-01')",
          { vendorId, serviceId },
        );
      await query(
        "INSERT INTO dbo.Conversations(ConversationId,CustomerId,VendorId) VALUES(:conversation,:prospect,:vendor); INSERT INTO dbo.Conversations(ConversationId,CustomerId,VendorId) VALUES(:otherConversation,:otherCustomer,:otherVendor); INSERT INTO dbo.Messages(ConversationId,SenderUserId,MessageText) VALUES(:conversation,:prospect,'CRM fixture inquiry'); INSERT INTO dbo.Messages(ConversationId,SenderUserId,MessageText) VALUES(:conversation,:owner,'CRM fixture reply'); INSERT INTO dbo.Messages(ConversationId,SenderUserId,MessageText) VALUES(:otherConversation,:otherOwner,'Other vendor message')",
      );
      await query(
        "INSERT INTO dbo.AuthSessions(id,userId,digest,expiresAt,createdAt) VALUES(:session,:owner,:digest,DATEADD(hour,1,SYSUTCDATETIME()),SYSUTCDATETIME())",
        { digest: "0".repeat(64) },
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
      let details = await vendorDetails(ids.vendor, ctx);
      assert.equal(details.summary.services, 1);
      assert.equal(details.summary.activeServices, 1);
      assert.equal(details.summary.bookings, 3);
      assert.equal(details.summary.completed, 1);
      assert.equal(details.summary.cancelled, 1);
      assert.equal(details.summary.reviews, 2);
      assert.equal(Number(details.summary.rating), 5);
      assert.equal(Number(details.revenue.gross), 1500);
      assert.equal(Number(details.revenue.commission), 150);
      assert.equal(Number(details.revenue.tax), 30);
      assert.equal(Number(details.revenue.net), 1320);
      assert.equal(Number(details.revenue.paid), 440);
      assert.equal(Number(details.revenue.pending), 880);
      assert.equal(Number(details.revenue.collected), 400);
      const expected = {
        documents: 1,
        services: 1,
        packages: 1,
        locations: 1,
        availability: 1,
        bookings: 3,
        quotations: 1,
        customers: 2,
        revenue: 2,
        payouts: 2,
        reviews: 2,
        offers: 2,
        messages: 2,
      };
      for (const [section, count] of Object.entries(expected)) {
        const result = await vendorRecords(ids.vendor, section, {}, ctx);
        assert.equal(
          result.total,
          count,
          `${section}: vendor isolation must hold`,
        );
      }
      const secondPage = await vendorRecords(
        ids.vendor,
        "bookings",
        { page: 2, pageSize: 2 },
        ctx,
      );
      assert.equal(secondPage.rows.length, 1);
      assert.equal(secondPage.total, 3);
      await assert.rejects(
        () => vendorDocumentFile(ids.otherVendor, ids.document, ctx),
        { status: 404 },
      );
      await reviewVendorDocument(
        ids.vendor,
        ids.document,
        {
          status: "Rejected",
          expectedStatus: "Pending",
          reason: "Unclear scan",
        },
        ctx,
      );
      await assert.rejects(
        () =>
          reviewVendorDocument(
            ids.vendor,
            ids.document,
            { status: "Approved", expectedStatus: "Pending" },
            ctx,
          ),
        { status: 409 },
      );
      await reviewVendorDocument(
        ids.vendor,
        ids.document,
        { status: "Approved", expectedStatus: "Rejected" },
        ctx,
      );
      const file = await vendorDocumentFile(ids.vendor, ids.document, ctx);
      assert.equal(file.mimeType, "application/pdf");
      assert.match(
        Buffer.from(file.base64, "base64").toString(),
        /CRM test document/,
      );
      for (const [status, expectedStatus, reason] of [
        ["Approved", "Pending", ""],
        ["Suspended", "Approved", "Compliance review"],
        ["Approved", "Suspended", "Compliance check complete"],
      ])
        await reviewVendor(
          ids.vendor,
          { status, expectedStatus, reason, note: "Rolled back verification" },
          ctx,
        );
      await setVendorActive(
        ids.vendor,
        { active: false, expectedActive: true, note: "CRM test deactivate" },
        ctx,
      );
      details = await vendorDetails(ids.vendor, ctx);
      assert.equal(!!details.vendor.active, false);
      assert.equal(details.vendor.status, "Approved");
      await setVendorActive(
        ids.vendor,
        { active: true, expectedActive: false, note: "CRM test activate" },
        ctx,
      );
      const [sessions] = await query(
        "SELECT revokedAt FROM dbo.AuthSessions WHERE id=:session",
      );
      assert.ok(sessions[0].revokedAt);
      await auditAdmin(
        ctx,
        "CRM_TEST_BOOKING_CHANGE",
        "Booking",
        ids.completedBooking,
        { status: "Pending" },
        { status: "Confirmed", passwordHash: "private" },
        tx,
      );
      const audit = await vendorRecords(ids.vendor, "audit", {}, ctx);
      assert.ok(
        audit.rows.some((row) => row.action === "ADMIN_DOCUMENT_VIEWED"),
      );
      assert.ok(
        audit.rows.some((row) => row.action === "ADMIN_VENDOR_APPROVED"),
      );
      assert.equal(
        audit.rows.find((row) => row.action === "CRM_TEST_BOOKING_CHANGE")
          .newValue.passwordHash,
        "[redacted]",
      );
      const [notifications] = await query(
        "SELECT COUNT(*) AS total FROM dbo.Notifications WHERE UserId=:owner",
      );
      assert.equal(notifications[0].total, 5);
      passed = true;
    } finally {
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
    }
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    console.error("Vendor integration verification failed:", error.message);
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
  if (previousRoot === undefined) delete process.env.DOCUMENT_STORAGE_PATH;
  else process.env.DOCUMENT_STORAGE_PATH = previousRoot;
  // The exact directory returned by mkdtemp contains only this script's temporary PDF.
  if (
    path.dirname(path.resolve(documentRoot)) !== path.resolve(os.tmpdir()) ||
    !path.basename(documentRoot).startsWith("marrynest-vendor-check-")
  )
    throw new Error("Unexpected temporary directory; cleanup refused.");
  await rm(documentRoot, { recursive: true, force: true });
}
if (passed && !process.exitCode)
  console.log(
    "PASS: every vendor tab, vendor isolation, prospective customers, ledger totals, document viewing/review, approval/rejection/suspension, activation, session revocation, notifications and redacted audit values. All fixtures rolled back.",
  );
