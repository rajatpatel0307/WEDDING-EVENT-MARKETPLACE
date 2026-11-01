import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import { sequelize } from "../src/config/database.js";
import {
  serviceTemplates,
  templateFor,
  templatesFor,
} from "../src/modules/vendors/service-templates.js";

import {
  availabilityInput,
  packageInput,
  promotionInput,
  quoteInput,
  serviceInput,
  validateAttributes,
} from "../src/modules/vendors/workspace.validation.js";
import { owned } from "../src/modules/vendors/workspace.common.js";
import * as workspace from "../src/modules/vendors/workspace.service.js";
import * as operations from "../src/modules/vendors/workspace.operations.js";
import * as messaging from "../src/modules/vendors/workspace.messaging.js";
import {
  dashboard,
  analyticsInput,
} from "../src/modules/vendors/workspace.analytics.js";
const vendorId = "734b9588-c47c-40eb-8c17-1797d65a2800",
  ownerId = "734b9588-c47c-40eb-8c17-1797d65a2801";
const ctx = {
  req: { ip: "127.0.0.1" },
  auth: {
    user: {
      id: ownerId,
      active: true,
      emailVerified: true,
      roles: [{ code: "VENDOR", active: true }],
      vendor: { id: vendorId, active: true, verificationStatus: "Approved" },
    },
  },
};

test("all 17 category templates validate their intended field types and reject injected attributes", () => {
  assert.equal(Object.keys(serviceTemplates).length, 17);
  for (const [name, fields] of Object.entries(serviceTemplates)) {
    const data = Object.fromEntries(
      fields.map((f) => [
        f.key,
        f.type === "number"
          ? 10
          : f.type === "boolean"
            ? true
            : f.type === "select"
              ? f.options[0]
              : "Details",
      ]),
    );
    assert.deepEqual(validateAttributes(name, data), data);
    assert.throws(() =>
      validateAttributes(name, { ...data, unauthorizedColumn: "Approved" }),
    );
    const numeric = fields.find((f) => f.type === "number");
    if (numeric)
      assert.throws(() =>
        validateAttributes(name, { ...data, [numeric.key]: -1 }),
      );
  }
  assert.throws(() => validateAttributes("Not a category", {}));
});
test("service and package input cannot override owner, approval or computed price", () => {
  const service = {
    name: "Service",
    categoryId: 1,
    description: "A real service description.",
    price: 1000,
    pricingType: "Fixed",
    attributes: {},
  };
  assert.doesNotThrow(() => serviceInput.parse(service));
  assert.throws(() => serviceInput.parse({ ...service, price: 1000.123 }));
  assert.throws(() => serviceInput.parse({ ...service, price: null }));
  for (const injected of [
    { VendorId: vendorId },
    { ApprovalStatus: "Approved" },
    { IsActive: true },
  ])
    assert.throws(() => serviceInput.parse({ ...service, ...injected }));
  assert.throws(() =>
    serviceInput.parse({ ...service, minimumGuests: 100, maximumGuests: 50 }),
  );
  assert.throws(() => serviceInput.parse({ ...service, duration: 1.5 }));
  const pack = {
    serviceId: vendorId,
    name: "Package",
    price: 1000,
    discount: 10,
    featured: false,
    active: true,
    items: [],
  };
  assert.throws(() => packageInput.parse({ ...pack, finalPrice: 1 }));
  assert.throws(() => packageInput.parse({ ...pack, discount: 101 }));
});
test("category capacity and catering currency reject invalid ranges, fractions and precision", () => {
  assert.throws(() =>
    validateAttributes("Venue & Location", {
      minimumCapacity: 200,
      maximumCapacity: 100,
    }),
  );
  assert.throws(() =>
    validateAttributes("Venue & Location", { minimumCapacity: 10.5 }),
  );
  assert.throws(() =>
    validateAttributes("Catering & Food", { perPlate: 100.123 }),
  );
  assert.deepEqual(
    validateAttributes("Venue & Location", {
      minimumCapacity: 100,
      maximumCapacity: 200,
    }),
    { minimumCapacity: 100, maximumCapacity: 200 },
  );
});
test("vendor resource checks accept MSSQL sequential GUIDs and always bind ownership", async (t) => {
  const guid = "1D375B0C-89D2-F111-8F30-14133304FA5C";
  const query = t.mock.method(sequelize, "query", async () => [
    { ServiceId: guid },
  ]);
  await owned("services", guid, vendorId, undefined, false);
  const [sql, options] = query.mock.calls[0].arguments;
  assert.match(sql, /t\.VendorId=:vendorId/);
  assert.equal(options.replacements.vendorId, vendorId);
  assert.equal(options.replacements.recordId, guid);
  assert.ok(!sql.includes(guid));
  await assert.rejects(() => owned("items", "1;DROP TABLE Users", vendorId));
});
test("every workspace service rejects non-approved contexts before database access", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => {
    throw Error("Database should not be called");
  });
  for (const status of ["Pending", "UnderReview", "Rejected", "Suspended"]) {
    const blocked = {
      ...ctx,
      auth: {
        user: {
          ...ctx.auth.user,
          vendor: { ...ctx.auth.user.vendor, verificationStatus: status },
        },
      },
    };
    for (const operation of [
      () => workspace.records("services", {}, blocked),
      () => workspace.saveService(null, {}, blocked),
      () => workspace.savePackage(null, {}, blocked),
      () => workspace.business(blocked),
      () => workspace.saveSimple("coupons", null, {}, blocked),
      () => operations.bookingDecision(vendorId, {}, blocked),
      () => operations.saveQuote(null, {}, blocked),
      () => operations.setAvailability({}, blocked),
      () => messaging.conversations(blocked),
      () => messaging.sendMessage(vendorId, {}, blocked),
      () => messaging.attachmentFile(vendorId, vendorId, blocked),
      () => dashboard({}, blocked),
    ])
      await assert.rejects(
        operation,
        (e) => e.extensions?.code === "FORBIDDEN",
      );
  }
  assert.equal(query.mock.callCount(), 0);
});
test("vendor records cannot select audit logs, verification notes or authentication tables", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  for (const section of [
    "audit",
    "history",
    "AuthSessions",
    "constructor",
    "__proto__",
    "services;DROP TABLE Users",
  ])
    await assert.rejects(() => workspace.records(section, {}, ctx), {
      status: 404,
    });
  assert.equal(query.mock.callCount(), 0);
});
test("vendor coupons and notifications are scoped to the current business and owner", async (t) => {
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("COUNT_BIG") ? [{ total: 0 }] : [],
  );
  await workspace.records("coupons", {}, ctx);
  assert.match(query.mock.calls[0].arguments[0], /t\.VendorId=:id/);
  assert.equal(query.mock.calls[0].arguments[1].replacements.id, vendorId);
  await assert.rejects(() => workspace.readNotification(vendorId, ctx), {
    status: 404,
  });
  const lookup = query.mock.calls.at(-1).arguments;
  assert.match(lookup[0], /UserId=:user/);
  assert.equal(lookup[1].replacements.user, ownerId);
});
test("booking lists apply payment and date filters before pagination and allow only safe sorting", async (t) => {
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("COUNT_BIG") ? [{ total: 51 }] : [],
  );
  const result = await workspace.records("bookings", {
    status: "reschedules", payment: "Paid", eventFrom: "2027-01-01", eventTo: "2027-02-01",
    sort: "amount", direction: "asc", page: 2, pageSize: 20,
  }, ctx);
  assert.equal(result.total, 51);
  for (const call of query.mock.calls) {
    const [sql, { replacements }] = call.arguments;
    assert.match(sql, /t\.VendorId=:id/);
    assert.match(sql, /cr\.Kind='Reschedule' AND cr\.Status='Pending'/);
    assert.match(sql, /t\.PaymentStatus=:payment/);
    assert.match(sql, /t\.BookingDate>=:eventFrom/);
    assert.equal(replacements.id, vendorId);
    assert.equal(replacements.payment, "Paid");
    assert.equal(replacements.offset, 20);
  }
  assert.match(query.mock.calls[1].arguments[0], /ORDER BY t\.TotalAmount ASC,t\.BookingId OFFSET/);
  query.mock.resetCalls();
  await assert.rejects(() => workspace.records("bookings", { sort: "amount;DROP TABLE Booking" }, ctx));
  await assert.rejects(() => workspace.records("bookings", { direction: "invalid" }, ctx));
  assert.equal(query.mock.callCount(), 0);
});

test("vendor booking list HTTP endpoint returns records for all seven categories", async (t) => {
  t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("COUNT_BIG") ? [{ total: 1 }] : [{ id: vendorId, number: "BK-001", customer: "Customer", status: "Pending" }],
  );
  const app = express();
  app.use("/api/vendor", createVendorRouter({ authenticateRequest: async () => ctx.auth }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  for (const category of ["requests", "upcoming", "active", "completed", "cancelled", "cancellations", "reschedules"]) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/vendor/records/bookings?status=${category}&sort=createdAt&direction=desc&pageSize=20`);
    assert.equal(response.status, 200, category);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.total, 1);
    assert.equal(body.data.rows[0].number, "BK-001");
  }
});

test("vendor booking statistics bind vendor ownership for every category", async (t) => {
  const summary = { total: 10, requests: 2, upcoming: 3, active: 4, completed: 2, cancelled: 2, cancellations: 1, reschedules: 1 };
  const query = t.mock.method(sequelize, "query", async () => [Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, String(value)]))]);
  assert.deepEqual(await workspace.bookingStatistics(ctx), summary);
  const [sql, options] = query.mock.calls[0].arguments;
  assert.equal(options.replacements.id, vendorId);
  assert.equal((sql.match(/t.VendorId=:id/g) || []).length, 8);
  assert.match(sql, /BookingDate>=CONVERT\(date,DATEADD\(minute,330,SYSUTCDATETIME\(\)\)\)/);
  assert.match(sql, /cr.Kind='Cancellation' AND cr.Status='Pending'/);
  assert.match(sql, /cr.Kind='Reschedule' AND cr.Status='Pending'/);
  query.mock.resetCalls();
  await assert.rejects(() => workspace.bookingStatistics({ auth: null }));
  assert.equal(query.mock.callCount(), 0);
});

test("vendor booking statistics HTTP route is resolved before booking details", async (t) => {
  t.mock.method(sequelize, "query", async () => [{ total: 1, requests: 0 }]);
  const app = express();
  app.use("/api/vendor", createVendorRouter({ authenticateRequest: async () => ctx.auth }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/vendor/bookings/statistics`);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, { total: 1, requests: 0 });
});

test("availability limits ranges and rejects partial or backwards time windows", () => {
  const valid = {
    from: "2027-01-01",
    to: "2027-01-01",
    serviceId: null,
    startTime: "10:00",
    endTime: "18:00",
    status: "Available",
  };
  assert.doesNotThrow(() => availabilityInput.parse(valid));
  for (const patch of [
    { endTime: null },
    { startTime: "19:00" },
    { status: "Booked" },
    { to: "2028-01-01" },
  ])
    assert.throws(() => availabilityInput.parse({ ...valid, ...patch }));
});
test("quotation validation preserves customer authority and prevents negative line totals", () => {
  const quote = {
    eventId: vendorId,
    validUntil: "2027-01-01",
    status: "Draft",
    items: [
      {
        serviceId: vendorId,
        name: "Venue",
        quantity: 1,
        price: 1000,
        discount: 0,
        tax: 0,
      },
    ],
  };
  assert.doesNotThrow(() => quoteInput.parse(quote));
  assert.throws(() => quoteInput.parse({ ...quote, status: "Accepted" }));
  assert.throws(() => quoteInput.parse({ ...quote, customerId: ownerId }));
  assert.throws(() =>
    quoteInput.parse({
      ...quote,
      items: [{ ...quote.items[0], discount: 1001 }],
    }),
  );
});
test("promotion and analytics date ranges are bounded and validated", () => {
  const offer = {
    name: "Offer",
    discountType: "Percentage",
    discountValue: 10,
    startDate: "2027-01-01",
    endDate: "2027-02-01",
    active: true,
  };
  assert.throws(() => promotionInput.parse({ ...offer, discountValue: 101 }));
  assert.throws(() =>
    promotionInput.parse({ ...offer, endDate: "2026-01-01" }),
  );
  assert.throws(() => analyticsInput.parse({ period: "untrusted" }));
  assert.throws(() => analyticsInput.parse({ from: "2026-01-01" }));
  assert.throws(() =>
    analyticsInput.parse({ from: "2026-01-01", to: "2028-01-01" }),
  );
});
test("chat attachments cannot be injected or reused from another purpose", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(
    () =>
      messaging.sendMessage(
        vendorId,
        { text: "Test", attachmentToken: "forged-token" },
        ctx,
      ),
    /Attachment expired/,
  );
  await assert.rejects(() =>
    messaging.sendMessage(
      vendorId,
      { text: "Test", AttachmentUrl: "https://untrusted.invalid" },
      ctx,
    ),
  );
  await assert.rejects(
    () => messaging.sendMessage(vendorId, {}, ctx),
    /Write a message/,
  );
  assert.equal(query.mock.callCount(), 0);
});

test("database category names can change without losing built-in service templates", () => {
  const category = { name: "Renamed wedding venues", code: "AUTH_SERVICE_1" };
  assert.equal(templateFor(category), serviceTemplates["Venue & Location"]);
  assert.equal(
    templatesFor([category])[category.name],
    serviceTemplates["Venue & Location"],
  );
  const custom = { name: "New celebration service", code: "CUSTOM_SERVICE" };
  assert.deepEqual(
    validateAttributes(custom.name, {}, templateFor(custom)),
    {},
  );
  assert.throws(() =>
    validateAttributes(
      custom.name,
      { unauthorizedColumn: true },
      templateFor(custom),
    ),
  );
});
