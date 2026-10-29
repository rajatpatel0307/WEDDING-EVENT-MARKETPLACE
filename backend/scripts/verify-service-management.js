import { up as approvalUp } from "../migrations/011-service-approval.js";
import {
  review as reviewService,
  pending as pendingServices,
  decide as decideService,
} from "../src/modules/admin/service-approval.service.js";
// Real MSSQL/REST integration. Migration, fixtures and all changes roll back together.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/010-service-management.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import { loadUser } from "../src/modules/auth/token.service.js";
import { serviceSchema } from "../src/modules/vendors/service-management.validation.js";
import { action as adminAction } from "../src/modules/admin/admin.service.js";
import { recordServiceMetric } from "../src/modules/vendors/service-metrics.js";
import { book } from "../src/modules/customers/workspace.operations.js";
const rollback = new Error("ROLLBACK_SERVICE_MANAGEMENT");
let passed = false;
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction;
    let server;
    sequelize.query = function (sql, options = {}) {
      return originalQuery
        .call(this, sql, { ...options, transaction: tx })
        .catch((error) => {
          console.error("SQL verification:", error.message);
          throw error;
        });
    };
    sequelize.transaction = async (fn) => fn(tx);
    try {
      await up(sequelize.getQueryInterface(), tx);
      await approvalUp(sequelize.getQueryInterface(), tx);
      const owner = randomUUID(),
        otherOwner = randomUUID(),
        admin = randomUUID(),
        customer = randomUUID(),
        eventId = randomUUID(),
        vendor = randomUUID(),
        otherVendor = randomUUID();
      const query = (sql, replacements = {}) =>
        sequelize.query(sql, { replacements });
      for (const id of [owner, otherOwner, admin, customer])
        await query(
          "INSERT INTO dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Service fixture',:email,'not-a-login-password',1)",
          { id, email: `service-fixture-${id}@example.invalid` },
        );
      for (const [id, role] of [
        [owner, "VENDOR"],
        [otherOwner, "VENDOR"],
        [admin, "ADMIN"],
        [customer, "CUSTOMER"],
      ])
        await query(
          "INSERT INTO dbo.UserRoles(UserId,RoleId) SELECT :id,RoleId FROM dbo.Roles WHERE RoleCode=:role",
          { id, role },
        );
      for (const [id, user] of [
        [vendor, owner],
        [otherVendor, otherOwner],
      ])
        await query(
          "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:id,:user,'Service fixture',:id,'Approved',1)",
          { id, user },
        );
      const app = express();
      app.use(
        "/api/vendor",
        createVendorRouter({
          authenticateRequest: async (req) => ({
            user: await loadUser(
              req.get("x-fixture-other") === "1" ? otherOwner : owner,
            ),
          }),
        }),
      );
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const base = `http://127.0.0.1:${server.address().port}/api/vendor`;
      async function request(
        path,
        method = "GET",
        body,
        expected = 200,
        other = false,
      ) {
        const response = await fetch(base + path, {
          method,
          headers: {
            "Content-Type": "application/json",
            Origin: process.env.FRONTEND_URL,
            "X-Vendor-Request": "1",
            "X-Fixture-Other": other ? "1" : "0",
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const result = await response.json();
        assert.equal(
          response.status,
          expected,
          `${method} ${path}: ${JSON.stringify(result)}`,
        );
        return result.data ?? result;
      }
      await query(
        "INSERT INTO dbo.VendorCategories(VendorId,CategoryId) SELECT :vendor,CategoryId FROM dbo.Categories WHERE IsActive=1",
        { vendor },
      );
      for (const [vendorId, city] of [
        [vendor, "Jaipur"],
        [otherVendor, "Delhi"],
      ])
        await query(
          "INSERT INTO dbo.VendorLocations(VendorId,AddressLine1,City,State,Country) VALUES(:vendorId,'Fixture address',:city,'Fixture state','India')",
          { vendorId, city },
        );
      const metadata = await request("/services/metadata");
      assert.equal(metadata.locations.length, 1);
      assert.equal(metadata.locations[0].city, "Jaipur");
      const otherMetadata = await request(
        "/services/metadata",
        "GET",
        undefined,
        200,
        true,
      );
      assert.equal(otherMetadata.locations.length, 1);
      assert.equal(otherMetadata.locations[0].city, "Delhi");
      assert.equal(Object.keys(metadata.templates).length, 17);
      const ids = [];
      for (const category of metadata.categories) {
        const attributes = Object.fromEntries(
          metadata.templates[category.name].map((f) => [
            f.key,
            f.type === "boolean"
              ? true
              : f.type === "number"
                ? 10
                : f.type === "select"
                  ? f.options[0]
                  : "Fixture detail",
          ]),
        );
        const body = serviceSchema.parse({
          name: `${category.name} fixture`,
          categoryId: category.id,
          description: "A complete integration fixture for wedding services.",
          shortDescription: "A celebration to remember.",
          attributes,
          pricing: {
            basePrice: 100000,
            discount: 10,
            minimumPrice: 80000,
            maximumPrice: 150000,
            customQuote: true,
          },
          location: { city: "Jaipur", state: "Rajasthan" },
          availability: {},
          policies: {
            duration: 120,
            cancellation: "Cancel at least 30 days before the event.",
          },
          seo: { slug: `fixture-${randomUUID()}` },
        });
        const created = await request("/services", "POST", body);
        ids.push(created.id);
        const [[native]] = await query(
          "SELECT MinimumGuests,MaximumGuests,DurationMinutes FROM dbo.Services WHERE ServiceId=:id",
          { id: created.id },
        );
        assert.equal(
          native.MinimumGuests,
          attributes.minimumGuests ?? attributes.minimumCapacity ?? null,
        );
        assert.equal(
          native.MaximumGuests,
          attributes.maximumGuests ??
            attributes.maximumCapacity ??
            attributes.capacity ??
            null,
        );
        assert.equal(native.DurationMinutes, 120);
        const detail = await request(`/services/${created.id}`);
        assert.equal(detail.status, "Draft");
        assert.equal(detail.active, false);
        assert.equal(Number(detail.price), 90000);
        assert.deepEqual(detail.attributes, attributes);
      }
      const id = ids[0];
      let detail = await request(`/services/${id}`);
      await request(`/services/${id}`, "GET", undefined, 404, true);
      await request(`/services/${id}/items`, "POST", {
        expectedUpdatedAt: detail.updatedAt,
        item: {
          name: "Stage",
          description: "Included stage",
          quantity: 1,
          unit: "setup",
          price: 0,
          included: true,
        },
      });
      detail = await request(`/services/${id}`);
      assert.equal(detail.items.length, 1);
      await request(
        `/services/${id}/submit`,
        "POST",
        { expectedUpdatedAt: detail.updatedAt },
        400,
      );
      // Exercise the real service upload API and SQL persistence with a provider stub.
      // Only the external transport is substituted; no asset is sent to Cloudinary.
      const originalFetch = globalThis.fetch;
      const fixtureSettings = {
        CLOUDINARY_CLOUD_NAME: "fixture",
        CLOUDINARY_API_KEY: "fixture-key",
        CLOUDINARY_API_SECRET: "fixture-secret",
      };
      const previousSettings = Object.fromEntries(
        Object.keys(fixtureSettings).map((key) => [key, process.env[key]]),
      );
      Object.assign(process.env, fixtureSettings);
      let providerUploads = 0;
      globalThis.fetch = async (url, options) => {
        if (!String(url).startsWith("https://api.cloudinary.com/"))
          return originalFetch(url, options);
        providerUploads++;
        assert.ok(options.body.get("signature"));
        assert.equal(options.body.get("type"), "upload");
        return {
          ok: true,
          json: async () => ({
            public_id: options.body.get("public_id"),
            secure_url: `https://res.cloudinary.com/fixture/image/upload/service-${providerUploads}.png`,
          }),
        };
      };
      try {
        const png =
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZioAAAAASUVORK5CYII=";
        await request(
          `/services/${id}/images`,
          "POST",
          { expectedUpdatedAt: detail.updatedAt, base64: png },
          404,
          true,
        );
        await request(
          `/services/${id}/images`,
          "POST",
          { expectedUpdatedAt: "2000-01-01T00:00:00.000Z", base64: png },
          409,
        );
        await request(
          `/services/${id}/images`,
          "POST",
          {
            expectedUpdatedAt: detail.updatedAt,
            base64: Buffer.from("not an image").toString("base64"),
          },
          400,
        );
        assert.equal(providerUploads, 0);
        for (let index = 0; index < 2; index++) {
          await request(`/services/${id}/images`, "POST", {
            expectedUpdatedAt: detail.updatedAt,
            base64: png,
          });
          detail = await request(`/services/${id}`);
        }
        assert.equal(providerUploads, 2);
        assert.equal(detail.images.length, 2);
        assert.match(detail.images[0].url, /f_auto,q_auto,w_1600,c_limit/);
      } finally {
        globalThis.fetch = originalFetch;
        for (const [key, value] of Object.entries(previousSettings)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
      const [image1, image2] = detail.images.map((image) => image.id);
      await request(`/services/${id}/images`, "POST", {
        expectedUpdatedAt: detail.updatedAt,
        order: [image2, image1],
      });
      detail = await request(`/services/${id}`);
      await request(`/services/${id}/images`, "POST", {
        expectedUpdatedAt: detail.updatedAt,
        primaryId: image2,
      });
      detail = await request(`/services/${id}`);
      assert.equal(detail.images[0].id.toLowerCase(), image2.toLowerCase());
      const pack = await request(`/services/${id}/packages`, "POST", {
        serviceId: id,
        name: "Royal Wedding Package",
        description: "Complete celebration",
        price: 100000,
        discount: 10,
        featured: false,
        active: true,
        items: [
          {
            name: "Stage",
            description: "Stage setup",
            quantity: 1,
            unit: "setup",
          },
        ],
        terms: "Fixture terms",
        optionalItems: "Flowers",
        images: [image1],
      });
      const packages = await request(`/services/${id}/packages`);
      assert.equal(Number(packages[0].finalPrice), 90000);
      assert.equal(packages[0].items[0].name, "Stage");
      assert.equal(packages[0].optionalItems, "Flowers");
      await request(
        `/packages/${pack.id}`,
        "PUT",
        {
          serviceId: id,
          name: "Attempt",
          price: 1,
          discount: 0,
          featured: false,
          active: false,
          items: [],
          expectedUpdatedAt: packages[0].updatedAt,
        },
        404,
        true,
      );
      const future = new Date(Date.now() + 40 * 86400000)
        .toISOString()
        .slice(0, 10);
      await request(`/services/${id}/availability`, "POST", {
        from: future,
        to: future,
        status: "Blocked",
        startTime: null,
        endTime: null,
        notes: "Fixture holiday",
      });
      const dates = await request(`/services/${id}/availability`);
      assert.equal(dates.length, 1);
      await request(
        `/services/${id}/availability/${dates[0].id}`,
        "DELETE",
        {},
      );
      detail = await request(`/services/${id}`);
      await request(`/services/${id}/submit`, "POST", {
        expectedUpdatedAt: detail.updatedAt,
      });
      detail = await request(`/services/${id}`);
      assert.equal(detail.status, "Pending");
      const adminCtx = {
        req: { ip: "127.0.0.1" },
        auth: { user: await loadUser(admin) },
      };
      const queue = await pendingServices({}, adminCtx);
      assert.ok(
        queue.rows.some((row) => row.id.toLowerCase() === id.toLowerCase()),
      );
      await decideService(id, "start-review", {}, adminCtx);
      const reviewed = await reviewService(id, adminCtx);
      assert.equal(reviewed.ApprovalStatus, "UnderReview");
      assert.equal(reviewed.images.length, 2);
      assert.equal(reviewed.packages.length, 1);
      await adminAction(
        "services",
        id,
        {
          action: "Rejected",
          expectedStatus: "UnderReview",
          note: "Please improve your description.",
        },
        adminCtx,
      );
      detail = await request(`/services/${id}`);
      assert.equal(detail.status, "Rejected");
      assert.equal(detail.rejectionReason, "Please improve your description.");
      await request(`/services/${id}/submit`, "POST", {
        expectedUpdatedAt: detail.updatedAt,
      });
      await adminAction(
        "services",
        id,
        {
          action: "Approved",
          expectedStatus: "Pending",
          note: "Meets listing requirements.",
        },
        adminCtx,
      );
      detail = await request(`/services/${id}`);
      assert.equal(detail.active, true);
      const approvedReview = await reviewService(id, adminCtx);
      assert.equal(
        approvedReview.ApprovedBy.toLowerCase(),
        admin.toLowerCase(),
      );
      assert.ok(approvedReview.ApprovedAt);
      assert.ok(
        detail.approvalHistory.some((h) => h.action === "SERVICE_REJECT"),
      );
      assert.ok(
        detail.approvalHistory.some(
          (h) => h.action === "VENDOR_SERVICE_RESUBMITTED",
        ),
      );
      assert.ok(
        detail.approvalHistory.some((h) => h.action === "SERVICE_APPROVE"),
      );
      const [[notifications]] = await query(
        "SELECT COUNT(*) AS total FROM dbo.Notifications WHERE ReferenceType='Service' AND ReferenceId=:id",
        { id },
      );
      assert.equal(notifications.total, 2);
      await decideService(id, "deactivate", {}, adminCtx);
      assert.equal((await reviewService(id, adminCtx)).IsActive, false);
      await decideService(id, "activate", {}, adminCtx);
      detail = await request(`/services/${id}`);
      await request(`/services/${id}/active`, "PATCH", {
        active: true,
        expectedUpdatedAt: detail.updatedAt,
      });
      const eventDay = new Date(Date.now() + 50 * 86400000);
      while ([0, 6].includes(eventDay.getUTCDay()))
        eventDay.setUTCDate(eventDay.getUTCDate() + 1);
      await query(
        "INSERT INTO dbo.Events(EventId,CustomerId,EventName,EventType,EventDate,StartTime,GuestCount) VALUES(:eventId,:customer,'Fixture wedding','Wedding',:date,'10:00',11)",
        { eventId, customer, date: eventDay.toISOString().slice(0, 10) },
      );
      const customerContext = {
        req: { ip: "127.0.0.1" },
        auth: { user: await loadUser(customer) },
      };
      await assert.rejects(
        () => book({ eventId, serviceId: id, quantity: 1 }, customerContext),
        /guest count is outside/,
      );
      await query(
        "UPDATE dbo.Events SET GuestCount=10 WHERE EventId=:eventId",
        { eventId },
      );
      const booking = await book(
        { eventId, serviceId: id, quantity: 1 },
        { req: { ip: "127.0.0.1" }, auth: { user: await loadUser(customer) } },
      );
      const [[bookingPrice]] = await query(
        "SELECT SubTotal,BookingStatus FROM dbo.Booking WHERE BookingId=:id",
        { id: booking.id },
      );
      assert.equal(Number(bookingPrice.SubTotal), 90000);
      await recordServiceMetric(id, "Views", tx);
      await recordServiceMetric(id, "Enquiries", tx);
      const performance = await request(`/services/${id}/performance`);
      assert.equal(Number(performance.views), 1);
      assert.equal(Number(performance.enquiries), 1);
      assert.equal(Number(performance.bookings), 1);
      assert.equal(Number(performance.completedBookings), 0);
      await query(
        "UPDATE dbo.Booking SET BookingStatus='Completed' WHERE BookingId=:id",
        { id: booking.id },
      );
      const completed = await request(`/services/${id}/performance`);
      assert.equal(Number(completed.completedBookings), 1);
      assert.equal(Number(completed.revenue), 90000);
      await query(
        "UPDATE dbo.Booking SET BookingStatus=:status WHERE BookingId=:id",
        { id: booking.id, status: bookingPrice.BookingStatus },
      );
      await request(`/services/${id}/bookings`);
      await request(`/services/${id}/reviews`);
      const filtered = await request(
        "/services?pageSize=5&sort=priceAsc&location=Jaipur",
      );
      assert.equal(filtered.rows.length, 5);
      assert.equal(filtered.total, 17);
      assert.equal(Number(filtered.stats.suspendedServices), 0);
      const exported = await fetch(
        `${base}/services/export?page=9&pageSize=1&location=Jaipur`,
      );
      assert.equal(exported.status, 200);
      assert.match(exported.headers.get("content-type"), /text\/csv/);
      assert.match(
        exported.headers.get("content-disposition"),
        /vendor-services.csv/,
      );
      assert.equal((await exported.text()).split("\r\n").length, 18);
      const otherExport = await fetch(`${base}/services/export`, {
        headers: { "X-Fixture-Other": "1" },
      });
      assert.equal((await otherExport.text()).split("\r\n").length, 1);
      const copy = await request(`/services/${id}/duplicate`, "POST", {});
      const copied = await request(`/services/${copy.id}`);
      assert.equal(copied.status, "Draft");
      assert.equal(copied.pricing.minimumPrice, 80000);
      assert.equal(copied.pricing.maximumPrice, 150000);
      assert.equal(copied.pricing.customQuote, true);
      assert.ok(copied.createdAt);
      const [[copiedColumns]] = await query(
        "SELECT MinimumPrice,MaximumPrice,IsCustomQuoteAvailable FROM dbo.Services WHERE ServiceId=:id",
        { id: copy.id },
      );
      assert.equal(Number(copiedColumns.MinimumPrice), 80000);
      assert.equal(Number(copiedColumns.MaximumPrice), 150000);
      assert.equal(copiedColumns.IsCustomQuoteAvailable, true);
      assert.equal(copied.items.length, 1);
      assert.equal(copied.images.length, 2);
      assert.equal((await request(`/services/${copy.id}/packages`)).length, 1);
      await request(`/services/${copy.id}`, "DELETE", {
        expectedUpdatedAt: copied.updatedAt,
      });
      detail = await request(`/services/${id}`);
      // Reuse the persisted authoritative document, excluding read-only response fields.
      const [[stored]] = await query(
        "SELECT DetailsJson FROM dbo.Services WHERE ServiceId=:id",
        { id },
      );
      await request(`/services/${id}`, "PUT", {
        ...JSON.parse(stored.DetailsJson),
        items: detail.items.map(({ id, ...item }) => ({
          ...item,
          included: !!item.included,
        })),
        expectedUpdatedAt: detail.updatedAt,
      });
      detail = await request(`/services/${id}`);
      assert.equal(detail.status, "Draft");
      assert.equal(detail.active, false);
      passed = true;
      console.log(
        "PASS: 17 categories; MSSQL migration; REST ownership; items; images; packages; availability; rejection/resubmission; approval; activation; re-approval; pagination; metrics.",
      );
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
    }
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    console.error("Service management verification failed:", error.message);
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
if (passed)
  console.log("All fixture records and schema changes were rolled back.");
