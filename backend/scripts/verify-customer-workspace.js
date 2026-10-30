import { up as quotationLifecycleUp } from "../migrations/017-quotation-lifecycle.js";
// Real MSSQL + REST verification. All fixture records and changes are rolled back.
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { up as serviceManagementUp } from "../migrations/010-service-management.js";
import { up as lifecycleUp } from "../migrations/015-booking-lifecycle.js";
import { up as customerWebsiteUp } from "../migrations/016-customer-website.js";
import { createMarketplaceRouter } from "../src/modules/customers/marketplace.routes.js";
import { createCustomerRouter } from "../src/modules/customers/workspace.routes.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import {
  settle,
  webhook,
} from "../src/modules/customers/workspace.payments.js";
const rollback = new Error("ROLLBACK_CUSTOMER_WORKSPACE");
let passed = false;
const publicTimings = [];
const originalEnv = Object.fromEntries(
  ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"].map(
    (k) => [k, process.env[k]],
  ),
);
try {
  const [schema] = await sequelize.query(
    "SELECT TABLE_NAME,STRING_AGG(CONVERT(nvarchar(max),COLUMN_NAME),', ') AS columns FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN('Events','EventGuests','Services','Wishlists','PaymentTransactions') GROUP BY TABLE_NAME",
  );
  console.log("Inspected customer schema:", JSON.stringify(schema));
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction,
      originalFetch = globalThis.fetch;
    let server;
    sequelize.query = function (sql, options = {}) {
      return originalQuery
        .call(this, sql, { ...options, transaction: tx })
        .catch((e) => {
          console.error(
            "SQL verification:",
            e.message,
            e.original?.errors?.map((x) => x.message),
            e.original?.message,
          );
          throw e;
        });
    };
    sequelize.transaction = async (fn) => fn(tx);
    try {
      await serviceManagementUp(sequelize.getQueryInterface(), tx);
      await lifecycleUp(sequelize.getQueryInterface(), tx);
      await customerWebsiteUp(sequelize.getQueryInterface(), tx);
      await quotationLifecycleUp(sequelize.getQueryInterface(), tx);
      await customerWebsiteUp(sequelize.getQueryInterface(), tx);
      const owner = randomUUID(),
        customer = randomUUID(),
        other = randomUUID(),
        vendor = randomUUID(),
        service = randomUUID(),
        pack = randomUUID();
      const query = (sql, replacements = {}) =>
        sequelize.query(sql, { replacements });
      for (const id of [owner, customer, other])
        await query(
          "INSERT INTO dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Customer fixture',:email,'not-a-login-password',1)",
          { id, email: `customer-check-${id}@example.invalid` },
        );
      await query(
        "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:vendor,:owner,'Customer verification fixture',:slug,'Approved',1)",
        { vendor, owner, slug: `fixture-${vendor}` },
      );
      const [[category]] = await query(
        "SELECT TOP(1) CategoryId FROM dbo.Categories WHERE IsActive=1 ORDER BY CategoryId",
      );
      await query(
        "INSERT INTO dbo.VendorLocations(VendorId,AddressLine1,City,State,PostalCode,IsPrimary) VALUES(:vendor,'Test address','Fixture City','Test State','100001',1)",
        { vendor },
      );
      await query(
        "INSERT INTO dbo.VendorCategories(VendorId,CategoryId) VALUES(:vendor,:category)",
        { vendor, category: category.CategoryId },
      );
      await query(
        "INSERT INTO dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,PricingType,BasePrice,ApprovalStatus,IsActive,IsCustomQuoteAvailable) VALUES(:service,:vendor,:category,'Fixture Service',:slug,'Fixed',5000,'Approved',1,1)",
        {
          service,
          vendor,
          category: category.CategoryId,
          slug: `fixture-${service}`,
        },
      );
      await query(
        "INSERT INTO dbo.ServicePackages(PackageId,ServiceId,PackageName,Price,DiscountPercentage,IsActive) VALUES(:pack,:service,'Fixture Package',10000,10,1)",
        { pack, service },
      );
      const user = (id) => ({
        id,
        active: true,
        emailVerified: true,
        roles: [{ code: "CUSTOMER", active: true }],
      });
      const vendorUser = {
        id: owner,
        active: true,
        emailVerified: true,
        roles: [{ code: "VENDOR", active: true }],
        vendor: { id: vendor, active: true, verificationStatus: "Approved" },
      };
      const app = express();
      app.use("/api/marketplace", createMarketplaceRouter());
      app.use(
        "/api/customer",
        createCustomerRouter({
          authenticateRequest: async (req) =>
            req.get("x-test-role") === "vendor"
              ? { user: vendorUser }
              : req.get("x-test-role") === "none"
                ? null
                : {
                    user: user(
                      req.get("x-test-role") === "other" ? other : customer,
                    ),
                  },
        }),
      );
      app.use(
        "/api/vendor",
        createVendorRouter({
          authenticateRequest: async () => ({ user: vendorUser }),
        }),
      );
      app.post("/webhook", express.raw({ type: "application/json" }), webhook);
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const base = `http://127.0.0.1:${server.address().port}`;
      const request = async (
        path,
        method = "GET",
        body,
        role,
        expected = 200,
      ) => {
        const started = performance.now();
        const response = await originalFetch(`${base}${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            Origin: process.env.FRONTEND_URL || "http://localhost:5173",
            "X-Customer-Request": "1",
            "X-Vendor-Request": "1",
            ...(role ? { "X-Test-Role": role } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const result = await response.json();
        if (path.startsWith("/api/marketplace"))
          publicTimings.push(performance.now() - started);
        assert.equal(
          response.status,
          expected,
          `${method} ${path}: ${JSON.stringify(result)}`,
        );
        return result.data ?? result;
      };
      const api = (p, ...args) => request(`/api/customer${p}`, ...args);
      await api("/dashboard", "GET", null, "none", 401);
      await api("/dashboard", "GET", null, "vendor", 403);
      const future = new Date(Date.now() + 60 * 86400000)
        .toISOString()
        .slice(0, 10);
      const event = await api("/events", "POST", {
        name: "Fixture wedding",
        type: "Wedding",
        eventDate: future,
        city: "Fixture City",
        state: "Test State",
        guests: 100,
        budget: 100000,
        description: "Rollback verification",
        endDate: future,
        brideName: "Fixture bride",
        groomName: "Fixture groom",
      });
      await api(`/events/${event.id}`, "GET", null, "other", 404);
      const exportDenied = await originalFetch(
        `${base}/api/customer/events/${event.id}/guests/export`,
        { headers: { "X-Test-Role": "other" } },
      );
      assert.equal(exportDenied.status, 404);
      await api(`/events/${event.id}/guests`, "POST", {
        name: "Fixture Guest",
        group: "Family",
        invitation: "Sent",
        attendees: 2,
        dietary: "Vegetarian",
        notes: "Private guest note",
        email: "guest@example.invalid",
        phone: "",
        status: "Invited",
      });
      const details = await api(`/events/${event.id}`);
      assert.equal(details.guests.length, 1);
      assert.equal(details.guests[0].attendees, 2);
      assert.equal(details.guests[0].group, "Family");
      assert.equal(details.guestStats.attendees, 2);
      assert.equal(details.event.brideName, "Fixture bride");
      assert.equal(
        (await api(`/events/${event.id}?q=not-found&rsvp=Accepted`)).guests
          .length,
        0,
      );
      await api(`/events/${event.id}/guests/${details.guests[0].id}`, "PUT", {
        name: "Fixture Guest",
        email: "",
        phone: "",
        status: "Accepted",
      });
      await api(
        `/events/${event.id}/guests/${details.guests[0].id}`,
        "DELETE",
        {},
      );
      for (const type of ["services", "packages", "vendors", "offers"])
        await api(`/discover?type=${type}&city=Fixture%20City`);
      const found = await api(
        `/discover?q=Fixture%20Service&city=Fixture%20City`,
      );
      assert(
        found.rows.some((r) => r.id.toLowerCase() === service.toLowerCase()),
      );
      await api(`/services/${service}`);
      const publicList = await request(
        "/api/marketplace/discover?q=Fixture%20Service&city=Fixture%20City&sort=priceAsc&pageSize=1",
      );
      assert.equal(publicList.rows.length, 1);
      assert.equal(publicList.rows[0].id.toLowerCase(), service.toLowerCase());
      await request("/api/marketplace/catalog");
      const combined = await request(
        `/api/marketplace/discover?q=Fixture%20Service&category=${category.CategoryId}&guests=100&date=${future}&min=100&max=6000&sort=newest`,
      );
      assert.ok(
        combined.rows.some((s) => s.id.toLowerCase() === service.toLowerCase()),
      );
      assert.equal(
        (
          await request(
            "/api/marketplace/discover?q=Fixture%20Service&min=6000&max=7000",
          )
        ).rows.length,
        0,
      );
      const publicDetail = await request(
        `/api/marketplace/services/${service}`,
      );
      assert.equal(
        publicDetail.service.id.toLowerCase(),
        service.toLowerCase(),
      );
      const publicVendor = await request(`/api/marketplace/vendors/${vendor}`);
      assert.ok(!publicVendor.vendor.phone);
      assert.ok(!publicVendor.vendor.email);
      assert.ok(!publicVendor.vendor.UserId);
      const availableDays = await request(
        `/api/marketplace/services/${service}/availability?from=${future}`,
      );
      assert.equal(availableDays.days.length, 31);
      await request(
        "/api/marketplace/discover?sort=invalid",
        "GET",
        undefined,
        undefined,
        400,
      );
      await request(
        "/api/marketplace/services/not-an-id",
        "GET",
        undefined,
        undefined,
        400,
      );
      await api(`/vendors/${vendor}`);
      await api("/catalog");
      for (const [type, id] of [
        ["Service", service],
        ["Package", pack],
        ["Vendor", vendor],
      ]) {
        await api("/wishlist", "POST", { type, id });
        await api("/wishlist", "POST", { type, id });
      }
      assert.equal((await api("/wishlist")).length, 3);
      assert.equal((await api("/wishlist", "GET", null, "other")).length, 0);
      const wish = (await api("/wishlist"))[0];
      await api(`/wishlist/${wish.id}`, "DELETE", {});
      await api("/quotation-requests", "POST", {
        eventId: event.id,
        serviceId: service,
        message: "Please quote for our wedding.",
      });
      await api(
        "/quotation-requests",
        "POST",
        {
          eventId: event.id,
          serviceId: service,
          message: "Duplicate request.",
        },
        null,
        409,
      );
      const options = await request("/api/vendor/quotation-options");
      assert(
        options.events.some(
          (e) => e.id.toLowerCase() === event.id.toLowerCase(),
        ),
      );
      const requests = await request("/api/vendor/records/requests");
      assert.equal(requests.rows.length, 1);
      const quote = await request("/api/vendor/quotations", "POST", {
        eventId: event.id,
        validUntil: future,
        status: "Sent",
        message: "A tailored proposal",
        items: [
          {
            serviceId: service,
            name: "Fixture Service",
            quantity: 1,
            price: 4500,
            discount: 0,
            tax: 0,
          },
        ],
      });
      assert.equal(
        (await api("/records/requests")).rows[0].status,
        "Responded",
      );
      await api(`/quotations/${quote.id}`, "GET", null, "other", 404);
      await api(`/quotations/${quote.id}`);
      for (const action of ["Reject", "Modify"]) {
        const proposal = await request("/api/vendor/quotations", "POST", {
          eventId: event.id,
          validUntil: future,
          status: "Sent",
          message: "Additional proposal",
          items: [
            {
              serviceId: service,
              name: "Fixture Service",
              quantity: 1,
              price: 6000,
              discount: 0,
              tax: 0,
            },
          ],
        });
        await api(`/quotations/${proposal.id}/decision`, "POST", {
          action,
          message:
            action === "Modify"
              ? "Please revise the guest count."
              : "We chose another proposal.",
        });
        const decided = await api(`/quotations/${proposal.id}`);
        assert.equal(
          decided.quotation.Status,
          action === "Modify" ? "Cancelled" : "Rejected",
        );
      }
      const draft = await request("/api/vendor/quotations", "POST", {
        eventId: event.id,
        validUntil: future,
        status: "Draft",
        message: "Revised proposal",
        items: [
          {
            serviceId: service,
            name: "Fixture Service",
            quantity: 1,
            price: 6000,
            discount: 0,
            tax: 0,
          },
        ],
      });
      await api(`/quotations/${draft.id}`, "GET", null, null, 404);
      await request(`/api/vendor/quotations/${draft.id}/action`, "POST", {
        action: "Send",
      });
      assert(
        (await api("/records/requests")).rows.every(
          (r) => r.status === "Responded",
        ),
      );
      const another = await api("/events", "POST", {
        name: "Second fixture event",
        type: "Reception",
        eventDate: new Date(new Date(future).getTime() + 86400000)
          .toISOString()
          .slice(0, 10),
        city: "Fixture City",
        state: "Test State",
        guests: 100,
        budget: 50000,
      });
      await api(
        "/bookings",
        "POST",
        { eventId: another.id, serviceId: service, quantity: 1, price: 1 },
        null,
        400,
      );
      const direct = await api("/bookings", "POST", {
        eventId: another.id,
        serviceId: service,
        quantity: 2,
      });
      assert.equal(
        Number((await api(`/bookings/${direct.id}`)).booking.TotalAmount),
        10000,
      );
      await api(`/bookings/${direct.id}/payment-order`, "POST", {}, null, 503);
      const booking = await api(`/quotations/${quote.id}/decision`, "POST", {
        action: "Accept",
        message: "Looks good",
      });
      await api(
        `/quotations/${quote.id}/decision`,
        "POST",
        { action: "Accept" },
        null,
        409,
      );
      await api(`/bookings/${booking.id}`, "GET", null, "other", 404);
      await api(`/bookings/${booking.id}`);
      await api(
        "/bookings",
        "POST",
        { eventId: event.id, serviceId: service, quantity: 1 },
        null,
        409,
      );
      await api(
        "/reviews",
        "POST",
        { bookingId: booking.id, rating: 5, text: "Excellent service" },
        null,
        409,
      );
      await request(`/api/vendor/bookings/${booking.id}/decision`, "POST", {
        action: "Accept",
      });
      const chat = await api("/conversations", "POST", {
        vendorId: vendor,
        eventId: event.id,
        bookingId: booking.id,
      });
      await api(`/conversations/${chat.id}/messages`, "POST", {
        text: "Hello from your customer",
      });
      await api(
        `/conversations/${chat.id}/messages`,
        "GET",
        null,
        "other",
        404,
      );
      const vendorChats = await request("/api/vendor/conversations");
      assert(vendorChats.some((c) => c.id === chat.id));
      await request(`/api/vendor/conversations/${chat.id}/messages`, "POST", {
        text: "Hello from your vendor",
      });
      assert.equal(
        (await api(`/conversations/${chat.id}/messages`)).messages.length,
        2,
      );
      await api(`/conversations/${chat.id}/read`, "PATCH", {});
      const address = await api("/addresses", "POST", {
        type: "Home",
        line1: "Test address",
        city: "Fixture City",
        state: "Test State",
        postalCode: "100001",
        country: "India",
        isDefault: true,
      });
      const addresses = await api("/records/addresses");
      assert.equal(addresses.rows.length, 1);
      await api(`/addresses/${addresses.rows[0].id}`, "DELETE", {});
      const profile = await api("/profile");
      await api("/profile", "PUT", {
        firstName: "Updated fixture",
        lastName: "",
        phone: "",
        dateOfBirth: "",
        expectedUpdatedAt: profile.updatedAt,
      });
      // Provider is mocked at the network boundary; the local order, signature and ledger remain real.
      process.env.RAZORPAY_KEY_ID = "rzp_test_fixture";
      process.env.RAZORPAY_KEY_SECRET = "fixture-secret";
      process.env.RAZORPAY_WEBHOOK_SECRET = "fixture-webhook";
      let remoteOrder;
      globalThis.fetch = async (url, options) => {
        if (String(url) === "https://api.razorpay.com/v1/orders") {
          remoteOrder = JSON.parse(options.body);
          return Response.json({
            id: "order_fixture123",
            amount: remoteOrder.amount,
            currency: "INR",
          });
        }
        if (
          String(url) === "https://api.razorpay.com/v1/payments/pay_fixture123"
        )
          return Response.json({
            id: "pay_fixture123",
            order_id: "order_fixture123",
            amount: 450000,
            currency: "INR",
            status: "captured",
            method: "upi",
            created_at: Math.floor(Date.now() / 1000),
          });
        return originalFetch(url, options);
      };
      const order = await api(
        `/bookings/${booking.id}/payment-order`,
        "POST",
        {idempotencyKey:randomUUID(),termsAccepted:true},
      );
      assert.equal(order.amount, 450000);
      assert.equal(
        (await api(`/bookings/${booking.id}/payment-order`, "POST", {idempotencyKey:randomUUID(),termsAccepted:true}))
          .orderId,
        order.orderId,
      );
      await api(
        "/payments/verify",
        "POST",
        {
          razorpay_order_id: order.orderId,
          razorpay_payment_id: "pay_fixture123",
          razorpay_signature: "0".repeat(64),
        },
        null,
        400,
      );
      const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${order.orderId}|pay_fixture123`)
        .digest("hex");
      await api("/payments/verify", "POST", {
        razorpay_order_id: order.orderId,
        razorpay_payment_id: "pay_fixture123",
        razorpay_signature: signature,
      });
      await api("/payments/verify", "POST", {
        razorpay_order_id: order.orderId,
        razorpay_payment_id: "pay_fixture123",
        razorpay_signature: signature,
      });
      assert.equal((await api("/records/payments")).total, 1);
      const paymentList = await api("/records/payments");
      const transaction = await api(`/payments/${paymentList.rows[0].id}`);
      assert.equal(Number(transaction.payment.amount), 4500);
      await api(
        `/payments/${paymentList.rows[0].id}`,
        "GET",
        null,
        "other",
        404,
      );
      const paid = await api(`/bookings/${booking.id}`);
      assert.equal(Number(paid.booking.PaidAmount), 4500);
      assert.equal(paid.booking.BookingStatus, "Confirmed");
      const captured = {
        id: "pay_fixture123",
        order_id: "order_fixture123",
        amount: 450000,
        currency: "INR",
        status: "captured",
        method: "upi",
        created_at: Math.floor(Date.now() / 1000),
      };
      await settle(captured);
      const raw = JSON.stringify({
        event: "payment.captured",
        payload: { payment: { entity: captured } },
      });
      const sig = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(raw)
        .digest("hex");
      const hook = await originalFetch(`${base}/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": sig,
        },
        body: raw,
      });
      assert.equal(hook.status, 200);
      assert.equal((await api("/records/payments")).total, 1);
      await query(
        "UPDATE dbo.Booking SET BookingStatus='Completed' WHERE BookingId=:id",
        { id: booking.id },
      );
      await api("/reviews", "POST", {
        bookingId: booking.id,
        rating: 5,
        text: "A wonderful experience.",
      });
      await api(
        "/reviews",
        "POST",
        { bookingId: booking.id, rating: 5, text: "Duplicate review" },
        null,
        409,
      );
      for (const section of [
        "events",
        "bookings",
        "quotations",
        "requests",
        "payments",
        "reviews",
        "addresses",
        "notifications",
      ])
        await api(`/records/${section}`);
      const archived = await api("/events", "POST", {
        name: "Archive fixture",
        type: "Other",
        eventDate: future,
        city: "Fixture City",
        guests: 1,
        budget: 0,
      });
      await api(`/events/${archived.id}/archive`, "POST", {}, "other", 404);
      await api(`/events/${archived.id}/archive`, "POST", {});
      assert.equal(
        (await api(`/events/${archived.id}`)).event.status,
        "Cancelled",
      );
      await api(
        `/events/${archived.id}/guests`,
        "POST",
        { name: "Archived guest" },
        null,
        409,
      );
      const dashboard = await api("/dashboard");
      assert.equal(Number(dashboard.stats.spent), 4500);
      assert.equal(dashboard.stats.events, 2);
      const notices = await api("/records/notifications");
      assert(notices.rows.length > 0);
      await api(`/notifications/${notices.rows[0].id}/read`, "PATCH", {});
      await api("/records/audit", "GET", null, null, 404);
      await query(
        "UPDATE dbo.Vendors SET VerificationStatus='Rejected' WHERE VendorId=:vendor",
        { vendor },
      );
      await api(`/services/${service}`, "GET", null, null, 404);
      const available = await api("/wishlist");
      assert(available.every((w) => w.available === 0));
      passed = true;
    } finally {
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
      globalThis.fetch = originalFetch;
      if (server) await new Promise((r) => server.close(r));
    }
    throw rollback;
  });
} catch (e) {
  if (e !== rollback) throw e;
} finally {
  for (const [k, v] of Object.entries(originalEnv))
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  await sequelize.close();
}
assert(passed);
publicTimings.sort((a, b) => a - b);
console.log(
  `Public API fixture checks: ${publicTimings.length} requests; median ${publicTimings[Math.floor(publicTimings.length / 2)].toFixed(1)} ms; p95 ${publicTimings[Math.min(publicTimings.length - 1, Math.ceil(publicTimings.length * 0.95) - 1)].toFixed(1)} ms. Local verification timings, not a production benchmark.`,
);
console.log(
  "Customer MSSQL/REST verification passed; all fixtures rolled back.",
);
