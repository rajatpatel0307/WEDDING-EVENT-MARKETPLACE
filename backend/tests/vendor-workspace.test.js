import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { serviceTemplates } from "../src/modules/vendors/service-templates.js";
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
