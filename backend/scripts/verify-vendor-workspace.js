import { chat } from "../src/modules/vendors/workspace.messaging.js";
// Real REST/database verification. Every fixture and mutation is rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import { loadUser } from "../src/modules/auth/token.service.js";
import { sign } from "../src/config/jwt.js";
import { serviceTemplates } from "../src/modules/vendors/service-templates.js";

const rollback = new Error("ROLLBACK_VENDOR_WORKSPACE"),
  previousRoot = process.env.DOCUMENT_STORAGE_PATH;
const root = await mkdtemp(
  path.join(os.tmpdir(), "marrynest-workspace-check-"),
);
process.env.DOCUMENT_STORAGE_PATH = root;
let passed = false;
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction;
    sequelize.query = function (sql, options = {}) {
      return originalQuery.call(this, sql, { ...options, transaction: tx });
    };
    sequelize.transaction = async (fn) => fn(tx);
    let server;
    try {
      const ids = Object.fromEntries(
        [
          "owner",
          "otherOwner",
          "customer",
          "otherCustomer",
          "vendor",
          "otherVendor",
          "event",
          "privateEvent",
          "otherEvent",
          "booking",
          "rejectBooking",
          "otherBooking",
          "otherService",
          "otherConversation",
          "document",
          "notification",
          "otherNotification",
        ].map((k) => [k, randomUUID()]),
      );
      const query = (sql, replacements = {}) =>
        sequelize.query(sql, { replacements: { ...ids, ...replacements } });
      const future = (days) =>
          new Date(Date.now() + days * 86400000).toISOString().slice(0, 10),
        eventDate = future(60),
        rejectDate = future(61),
        expiry = future(30);
      const key = `${randomUUID()}.pdf`;
      await writeFile(path.join(root, key), "%PDF-1.7\nprivate fixture");
      for (const id of [
        ids.owner,
        ids.otherOwner,
        ids.customer,
        ids.otherCustomer,
      ])
        await query(
          "INSERT INTO dbo.Users(UserId,FirstName,LastName,Email,PasswordHash,IsEmailVerified) VALUES(:userId,'Workspace','Fixture',:email,'fixture-not-a-login-password',1)",
          { userId: id, email: `workspace-${id}@example.invalid` },
        );
      for (const id of [ids.owner, ids.otherOwner])
        await query(
          "INSERT INTO dbo.UserRoles(UserId,RoleId) SELECT :userId,RoleId FROM dbo.Roles WHERE RoleCode='VENDOR'",
          { userId: id },
        );
      for (const [vendorId, userId] of [
        [ids.vendor, ids.owner],
        [ids.otherVendor, ids.otherOwner],
      ])
        await query(
          "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:vendorId,:userId,'Workspace fixture business',:vendorId,'Approved',1)",
          { vendorId, userId },
        );
      for (const [eventId, userId] of [
        [ids.event, ids.customer],
        [ids.privateEvent, ids.customer],
        [ids.otherEvent, ids.otherCustomer],
      ])
        await query(
          "INSERT INTO dbo.Events(EventId,CustomerId,EventName,EventType,EventDate) VALUES(:eventId,:userId,'Fixture celebration','Wedding',:date)",
          { eventId, userId, date: eventDate },
        );
      for (const [bookingId, vendorId, customerId, eventId, bookingDate] of [
        [ids.booking, ids.vendor, ids.customer, ids.event, eventDate],
        [ids.rejectBooking, ids.vendor, ids.customer, ids.event, rejectDate],
        [
          ids.otherBooking,
          ids.otherVendor,
          ids.otherCustomer,
          ids.otherEvent,
          eventDate,
        ],
      ])
        await query(
          "INSERT INTO dbo.Booking(BookingId,BookingNumber,EventId,CustomerId,VendorId,BookingDate,SubTotal,PaidAmount) VALUES(:bookingId,:number,:eventId,:customerId,:vendorId,:date,1000,100)",
          {
            bookingId,
            vendorId,
            customerId,
            eventId,
            date: bookingDate,
            number: `WS-${bookingId.slice(0, 8)}`,
          },
        );
      await query(
        "INSERT INTO dbo.Conversations(ConversationId,CustomerId,VendorId) VALUES(:otherConversation,:otherCustomer,:otherVendor)",
      );
      await query(
        "INSERT INTO dbo.VendorDocuments(VendorDocumentId,VendorId,DocumentType,DocumentUrl) VALUES(:document,:vendor,'GST',:key)",
        { key },
      );
      for (const [notificationId, userId] of [
        [ids.notification, ids.owner],
        [ids.otherNotification, ids.otherOwner],
      ])
        await query(
          "INSERT INTO dbo.Notifications(NotificationId,UserId,NotificationType,Title,Message) VALUES(:notificationId,:userId,'System','Fixture notice','Fixture message')",
          { notificationId, userId },
        );
      const app = express();
      app.use(
        "/api/vendor",
        createVendorRouter({
          authenticateRequest: async (req) =>
            req.get("x-test-owner") === "anonymous"
              ? null
              : {
                  user: await loadUser(
                    req.get("x-test-owner") === "other"
                      ? ids.otherOwner
                      : ids.owner,
                  ),
                },
        }),
      );
      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      const base = `http://127.0.0.1:${server.address().port}/api/vendor`;
      async function request(
        url,
        method = "GET",
        body,
        owner = "self",
        origin,
      ) {
        const response = await fetch(base + url, {
          method,
          headers: {
            Origin: origin || process.env.FRONTEND_URL,
            "X-Vendor-Request": "1",
            "X-Test-Owner": owner,
            "Content-Type": "application/json",
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = response.headers
          .get("content-type")
          ?.includes("application/json")
          ? await response.json()
          : await response.text();
        return {
          status: response.status,
          body: data,
          headers: response.headers,
        };
      }
      async function ok(url, method = "GET", body) {
        const result = await request(url, method, body);
        assert.equal(
          result.status,
          200,
          `${method} ${url}: ${JSON.stringify(result.body)}`,
        );
        return result.body.data ?? result.body;
      }
      assert.equal(
        (await request("/dashboard", "GET", undefined, "anonymous")).status,
        401,
      );
      assert.equal(
        (
          await request(
            "/business",
            "PUT",
            {},
            "self",
            "https://untrusted.invalid",
          )
        ).status,
        403,
      );
      const catalog = await ok("/catalog");
      assert.equal(Object.keys(catalog.templates).length, 17);
      const serviceIds = [];
      let baseService;
      for (const [name, fields] of Object.entries(serviceTemplates)) {
        const category = catalog.categories.find((c) => c.name === name);
        assert.ok(category, `${name} must be available`);
        const attributes = Object.fromEntries(
          fields.map((f) => [
            f.key,
            f.type === "boolean"
              ? true
              : f.type === "number"
                ? 10
                : f.type === "select"
                  ? f.options[0]
                  : "Fixture details",
          ]),
        );
        const body = {
          name: `${name} fixture`,
          categoryId: category.id,
          description: "A service for integration verification.",
          price: 1000,
          pricingType: "Fixed",
          attributes,
        };
        const result = await ok("/services", "POST", body);
        serviceIds.push(result.id);
        if (!baseService) baseService = body;
        const detail = await ok(`/services/${result.id}`);
        assert.deepEqual(detail.attributes, attributes);
        assert.equal(detail.status, "Pending");
      }
      const service = serviceIds[0];
      await query(
        "INSERT INTO dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,BasePrice) VALUES(:otherService,:otherVendor,:category,'Other business service',:otherService,9999)",
        { category: catalog.categories[0].id },
      );
      assert.equal(
        (await request(`/services/${ids.otherService}`)).status,
        404,
      );
      assert.equal(
        (await request(`/services/${ids.otherService}`, "PUT", baseService))
          .status,
        404,
      );
      assert.equal(
        (
          await request("/services", "POST", {
            ...baseService,
            ApprovalStatus: "Approved",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/services", "POST", {
            ...baseService,
            attributes: { injectedField: true },
          })
        ).status,
        400,
      );
      const first = await ok(`/services/${service}`);
      await ok(`/services/${service}`, "PUT", {
        ...baseService,
        name: "Updated venue fixture",
        attributes: baseService.attributes,
        expectedUpdatedAt: first.updatedAt,
      });
      assert.equal(
        (
          await request(`/services/${service}`, "PUT", {
            ...baseService,
            expectedUpdatedAt: "2000-01-01T00:00:00.000Z",
          })
        ).status,
        409,
      );
      const item = await ok("/items", "POST", {
        serviceId: service,
        name: "Stage",
        description: "Included stage",
        quantity: 1,
        unit: "setup",
        price: 500,
        included: true,
      });
      assert.equal((await ok(`/items/${item.id}`)).name, "Stage");
      const duplicate = await ok(`/services/${service}/duplicate`, "POST", {}),
        copied = await ok(`/services/${duplicate.id}`);
      assert.equal(copied.status, "Pending");
      assert.equal(!!copied.active, false);
      const pack = {
        serviceId: service,
        name: "Fixture package",
        description: "Full wedding package",
        price: 10000,
        discount: 10,
        minimumGuests: 50,
        maximumGuests: 100,
        duration: 120,
        featured: true,
        active: true,
        items: [
          {
            name: "Flowers",
            description: "Seasonal",
            quantity: 10,
            unit: "sets",
          },
        ],
      };
      const createdPackage = await ok("/packages", "POST", pack);
      const packageData = await ok(`/packages/${createdPackage.id}`);
      assert.equal(packageData.items.length, 1);
      const packageList = await ok("/records/packages");
      assert.equal(Number(packageList.rows[0].finalPrice), 9000);
      assert.equal(
        (
          await request("/packages", "POST", {
            ...pack,
            serviceId: ids.otherService,
          })
        ).status,
        404,
      );
      await ok(`/packages/${createdPackage.id}/active`, "PATCH", {
        active: false,
        expectedUpdatedAt: packageData.updatedAt,
      });
      const location = await ok("/locations", "POST", {
        address: "Fixture address",
        city: "Jaipur",
        state: "Rajasthan",
        country: "India",
        primary: true,
        active: true,
      });
      assert.equal((await ok(`/locations/${location.id}`)).city, "Jaipur");
      const promotion = {
        name: `WS_${randomUUID().slice(0, 8)}`,
        description: "Fixture promotion",
        discountType: "Percentage",
        discountValue: 10,
        startDate: future(1),
        endDate: future(30),
        active: true,
      };
      const offer = await ok("/offers", "POST", {
        ...promotion,
        serviceId: service,
      });
      assert.equal((await ok(`/offers/${offer.id}`)).discountValue, 10);
      const coupon = await ok("/coupons", "POST", {
        ...promotion,
        usageLimit: 10,
      });
      assert.equal(
        (await ok(`/coupons/${coupon.id}`)).startDate,
        promotion.startDate,
      );
      await query(
        "INSERT INTO dbo.Coupons(CouponCode,DiscountType,DiscountValue,StartDate,EndDate) VALUES(:code,'Percentage',10,:start,:end)",
        {
          code: `GLOBAL_${randomUUID().slice(0, 8)}`,
          start: future(1),
          end: future(30),
        },
      );
      assert.equal((await ok("/records/coupons")).total, 1);
      const availability = {
        from: eventDate,
        to: eventDate,
        serviceId: null,
        startTime: null,
        endTime: null,
        status: "Blocked",
        notes: "Fixture block",
      };
      await ok("/availability", "PUT", availability);
      assert.equal(
        (
          await request(`/bookings/${ids.booking}/decision`, "POST", {
            action: "Accept",
          })
        ).status,
        409,
      );
      await ok("/availability", "PUT", {
        ...availability,
        status: "Available",
      });
      await ok(`/bookings/${ids.booking}/decision`, "POST", {
        action: "Accept",
        note: "Happy to help",
      });
      assert.equal(
        (await request("/availability", "PUT", availability)).status,
        409,
      );
      assert.equal(
        (
          await request(`/bookings/${ids.rejectBooking}/decision`, "POST", {
            action: "Reject",
          })
        ).status,
        400,
      );
      await ok(`/bookings/${ids.rejectBooking}/decision`, "POST", {
        action: "Reject",
        note: "Already committed",
      });
      assert.equal(
        (
          await request(`/bookings/${ids.otherBooking}/decision`, "POST", {
            action: "Accept",
          })
        ).status,
        404,
      );
      const quoteOptions = await ok("/quotation-options");
      assert.ok(
        quoteOptions.events.some(
          (e) => e.id.toLowerCase() === ids.event.toLowerCase(),
        ),
      );
      assert.ok(
        !quoteOptions.events.some(
          (e) => e.id.toLowerCase() === ids.privateEvent.toLowerCase(),
        ),
      );
      const quote = {
        eventId: ids.event,
        validUntil: expiry,
        message: "Fixture proposal",
        status: "Draft",
        items: [
          {
            serviceId: service,
            name: "Venue service",
            quantity: 2,
            price: 1000,
            discount: 100,
            tax: 50,
          },
        ],
      };
      const createdQuote = await ok("/quotations", "POST", quote);
      const [totals] = await query(
        "SELECT TotalAmount FROM dbo.Quotations WHERE QuotationId=:quote",
        { quote: createdQuote.id },
      );
      assert.equal(Number(totals[0].TotalAmount), 1950);
      assert.equal(
        (
          await request("/quotations", "POST", {
            ...quote,
            eventId: ids.privateEvent,
          })
        ).status,
        404,
      );
      assert.equal(
        (await request("/quotations", "POST", { ...quote, status: "Accepted" }))
          .status,
        400,
      );
      assert.equal(
        (
          await request(`/quotations/${createdQuote.id}/action`, "POST", {
            action: "Send",
          })
        ).status,
        409,
      );
      await query(
        "UPDATE dbo.Services SET ApprovalStatus='Approved' WHERE ServiceId=:service",
        { service },
      );
      await ok(`/quotations/${createdQuote.id}/action`, "POST", {
        action: "Send",
      });
      assert.equal(
        (await request(`/quotations/${createdQuote.id}`, "PUT", quote)).status,
        409,
      );
      await ok(`/quotations/${createdQuote.id}/action`, "POST", {
        action: "Cancel",
      });
      const conversation = await ok("/conversations", "POST", {
        bookingId: ids.booking,
      });
      await ok(`/conversations/${conversation.id}/messages`, "POST", {
        text: "Hello from the vendor fixture",
      });
      assert.equal(
        (await request(`/conversations/${ids.otherConversation}/messages`))
          .status,
        404,
      );
      const token = sign(
        {
          purpose: "vendor-chat",
          vendorId: ids.vendor.toUpperCase(),
          owner: ids.owner.toUpperCase(),
          conversation: conversation.id,
          key,
          name: "fixture.pdf",
        },
        "1h",
      );
      // Sequelize MSSQL uses uppercase IDs; token ownership is case-insensitive across UUID spellings.
      const attachment = await ok(
        `/conversations/${conversation.id}/messages`,
        "POST",
        { text: "Private document", attachmentToken: token },
      );
      const file = await request(
        `/conversations/${conversation.id}/messages/${attachment.id}/attachment`,
      );
      assert.equal(file.status, 200);
      assert.match(file.body, /private fixture/);
      assert.equal(
        (
          await request(
            `/conversations/${conversation.id}/messages/${attachment.id}/attachment`,
            "GET",
            undefined,
            "other",
          )
        ).status,
        404,
      );
      await chat(
        conversation.id,
        {},
        { auth: { user: await loadUser(ids.owner) } },
      );
      const messages = await ok(`/conversations/${conversation.id}/messages`);
      assert.ok(
        messages.messages.some((m) => m.attachmentName === "fixture.pdf"),
      );
      assert.ok(
        messages.messages.every(
          (m) => !("AttachmentUrl" in m) && !("key" in m),
        ),
      );
      await ok(`/conversations/${conversation.id}/read`, "PATCH", {});
      assert.equal(
        (
          await request(
            `/conversations/${conversation.id}/messages`,
            "POST",
            {},
          )
        ).status,
        400,
      );
      const document = await request(`/documents/${ids.document}/file`);
      assert.equal(document.status, 200);
      assert.match(document.body, /private fixture/);
      assert.equal(
        (
          await request(
            `/documents/${ids.document}/file`,
            "GET",
            undefined,
            "other",
          )
        ).status,
        404,
      );
      await ok(`/notifications/${ids.notification}/read`, "PATCH", {});
      assert.equal(
        (
          await request(
            `/notifications/${ids.otherNotification}/read`,
            "PATCH",
            {},
          )
        ).status,
        404,
      );
      await query(
        "INSERT INTO dbo.BookingItems(BookingId,ServiceId,ItemName,UnitPrice) VALUES(:booking,:first,'First service',600); INSERT INTO dbo.BookingItems(BookingId,ServiceId,ItemName,UnitPrice) VALUES(:booking,:second,'Second service',400)",
        { first: serviceIds[0], second: serviceIds[1] },
      );
      for (const [bookingId, amount, currency, status] of [
        [ids.booking, 100, "INR", "Success"],
        [ids.booking, 900, "INR", "Failed"],
        [ids.booking, 25, "USD", "Success"],
        [ids.otherBooking, 9999, "INR", "Success"],
      ])
        await query(
          "INSERT INTO dbo.Payments(BookingId,PaymentReference,PaymentMethod,Amount,Currency,PaymentStatus) VALUES(:bookingId,:reference,'UPI',:amount,:currency,:status)",
          { bookingId, amount, currency, status, reference: randomUUID() },
        );
      await query(
        "INSERT INTO dbo.VendorPayouts(VendorId,BookingId,GrossAmount,PlatformCommission,TaxDeduction,PayoutStatus) VALUES(:vendor,:booking,100,10,10,'Pending')",
      );
      await query(
        "UPDATE dbo.Services SET ApprovalStatus='Approved' WHERE ServiceId=:service",
        { service },
      );
      for (const period of ["daily", "weekly", "monthly"]) {
        const report = await ok(`/dashboard?period=${period}`);
        assert.equal(Number(report.stats.totalRevenue), 100);
        assert.equal(Number(report.stats.pendingPayout), 80);
        assert.equal(report.stats.totalServices, 18);
        assert.equal(report.stats.activeServices, 1);
        assert.equal(
          Math.round(
            report.byService.reduce((sum, r) => sum + Number(r.amount), 0),
          ),
          100,
        );
        assert.ok(report.series.length);
      }
      const business = await ok("/business");
      await ok("/business", "PUT", {
        name: "Updated fixture business",
        description:
          "An updated business profile for the verification fixture.",
        email: "fixture@example.invalid",
        phone: "+919876543210",
        gst: "GST-fixture",
        pan: "PAN-fixture",
        expectedUpdatedAt: business.vendor.updatedAt,
      });
      for (const section of [
        "services",
        "packages",
        "items",
        "locations",
        "documents",
        "availability",
        "bookings",
        "quotations",
        "customers",
        "revenue",
        "payouts",
        "transactions",
        "reviews",
        "offers",
        "coupons",
        "notifications",
      ])
        await ok(`/records/${section}`);
      assert.equal((await ok("/records/bookings?status=upcoming")).total, 1);
      assert.equal((await request("/records/audit")).status, 404);
      assert.equal(
        (await request("/records/services?pageSize=10000")).status,
        400,
      );
      assert.equal(
        (
          await ok(
            `/records/services?${new URLSearchParams({ q: "' OR 1=1 --" })}`,
          )
        ).total,
        0,
      );
      await query(
        "UPDATE dbo.Vendors SET VerificationStatus='Rejected',IsActive=0 WHERE VendorId=:vendor",
      );
      assert.equal((await request("/dashboard")).status, 403);
      passed = true;
    } finally {
      server?.close();
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
    }
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    console.error("Vendor workspace verification failed:", error.message);
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
  if (previousRoot === undefined) delete process.env.DOCUMENT_STORAGE_PATH;
  else process.env.DOCUMENT_STORAGE_PATH = previousRoot;
  if (
    path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) ||
    !path.basename(root).startsWith("marrynest-workspace-check-")
  )
    throw Error("Unexpected fixture directory; cleanup refused.");
  await rm(root, { recursive: true, force: true });
}
if (passed && !process.exitCode)
  console.log(
    "PASS: all 17 category forms, service/item/package CRUD, pending approval, duplication, scoped locations/promotions/coupons, booking decisions, quotes and totals, calendar conflicts, private messages/attachments/documents, notifications, daily/weekly/monthly analytics, cross-vendor denial and live approval guard. All fixtures rolled back.",
  );
