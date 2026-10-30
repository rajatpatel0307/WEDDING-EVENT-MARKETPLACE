import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  quoteInput,
  requestInput,
  decisionInput,
  calculateQuotation,
} from "../src/modules/quotations/quotations.validation.js";
import * as quotations from "../src/modules/quotations/quotations.service.js";
const service = randomUUID(),
  line = {
    serviceId: service,
    name: "Wedding service",
    quantity: 1,
    price: 100,
  };
const proposal = {
  eventId: randomUUID(),
  validUntil: "2090-01-01",
  status: "Draft",
  items: [line],
};
test("quotation calculates percentage discounts, tax and advance in paise", () => {
  const result = calculateQuotation(
    [
      {
        ...line,
        quantity: 10,
        discountType: "Percentage",
        discountValue: 10,
        taxRate: 18,
      },
      { ...line, kind: "Travel", price: 100, taxRate: 0 },
    ],
    25,
  );
  assert.deepEqual(
    [
      result.subtotal,
      result.discount,
      result.tax,
      result.total,
      result.advance,
      result.additionalCharges,
    ],
    [1100, 100, 162, 1162, 290.5, 100],
  );
});
test("quantity multiplication avoids floating point drift and rejects fractional paise", () => {
  assert.equal(
    calculateQuotation([{ ...line, price: 4.06 }], 25).advance,
    1.02,
  );
  assert.throws(() => calculateQuotation([line], 101));
  assert.equal(
    calculateQuotation([{ ...line, quantity: 3, price: 0.1 }]).total,
    0.3,
  );
  assert.equal(
    calculateQuotation([{ ...line, quantity: 0.125, price: 80 }]).total,
    10,
  );
  assert.throws(
    () => calculateQuotation([{ ...line, quantity: 0.001, price: 0.01 }]),
    /fractions of a paise/,
  );
});
test("tax rounds per line after discounts", () => {
  const result = calculateQuotation([
    { ...line, price: 0.05, taxRate: 10 },
    { ...line, price: 0.05, taxRate: 10 },
  ]);
  assert.equal(result.tax, 0.02);
  assert.equal(result.total, 0.12);
});
test("discount cannot exceed the base or one hundred percent", () => {
  for (const patch of [
    { discount: 101 },
    { discountType: "Percentage", discountValue: 100.01 },
  ])
    assert.throws(
      () => calculateQuotation([{ ...line, ...patch }]),
      /Discount/,
    );
});
test("legacy fixed tax is an instruction; computed totals are always server generated", () => {
  assert.equal(
    calculateQuotation([{ ...line, discount: 10, tax: 18 }]).total,
    108,
  );
  assert.equal(
    calculateQuotation([{ ...line, tax: 999, taxRate: 18 }]).total,
    118,
  );
  for (const patch of [
    { total: 1 },
    { customerId: randomUUID() },
    { vendorId: randomUUID() },
    { paymentStatus: "Paid" },
  ])
    assert.equal(
      quoteInput.safeParse({ ...proposal, ...patch }).success,
      false,
    );
  assert.equal(
    quoteInput.safeParse({ ...proposal, items: [{ ...line, total: 1 }] })
      .success,
    false,
  );
});
test("money and quantity precision, unsafe totals and invalid values are rejected", () => {
  for (const patch of [
    { quantity: 0 },
    { quantity: -1 },
    { quantity: 0.0001 },
    { price: -1 },
    { price: 1.001 },
    { price: Infinity },
    { taxRate: 101 },
  ])
    assert.throws(() => calculateQuotation([{ ...line, ...patch }]));
  assert.throws(
    () => calculateQuotation([{ ...line, quantity: 100000, price: 1e8 }]),
    /supported/,
  );
  assert.throws(() => calculateQuotation([{ ...line, price: 0 }]), /positive/);
});
test("quotation expiry accepts dates and offset timestamps but rejects invalid dates", () => {
  for (const validUntil of [
    "2090-12-31",
    "2090-12-31T14:30:00+05:30",
    "2090-12-31T09:00:00Z",
  ])
    assert(quoteInput.safeParse({ ...proposal, validUntil }).success);
  for (const validUntil of ["2090-02-30", "tomorrow", "2090-12-31T14:30:00"])
    assert.equal(
      quoteInput.safeParse({ ...proposal, validUntil }).success,
      false,
    );
});
test("requests cannot forge customer ownership, status or attach unvalidated files", () => {
  const request = {
    eventId: proposal.eventId,
    serviceId: service,
    message: "Please quote for our wedding.",
  };
  assert(
    requestInput.safeParse({
      ...request,
      services: [{ serviceId: randomUUID() }],
      items: [{ serviceId: service, id: 1, quantity: 3 }],
    }).success,
  );
  for (const patch of [
    { customerId: randomUUID() },
    { vendorId: randomUUID() },
    { status: "Accepted" },
    { attachments: ["/private/secret"] },
  ])
    assert.equal(
      requestInput.safeParse({ ...request, ...patch }).success,
      false,
    );
});
test("decisions cannot set amounts or skip status and ownership checks", () => {
  assert.equal(
    decisionInput.parse({ action: "Accept", convert: false }).convert,
    false,
  );
  for (const patch of [
    { action: "Paid" },
    { action: "Accept", amount: 1 },
    { action: "Accept", customerId: randomUUID() },
  ])
    assert.equal(decisionInput.safeParse(patch).success, false);
});
test("all quotation services reject anonymous identities before database access", async () => {
  const id = randomUUID(),
    ctx = {};
  for (const work of [
    () => quotations.request({}, ctx),
    () => quotations.requestDetail(id, ctx, "Customer"),
    () => quotations.requestAction(id, {}, ctx, "Customer"),
    () => quotations.save(null, {}, ctx),
    () => quotations.action(id, {}, ctx),
    () => quotations.details(id, ctx, "Customer"),
    () => quotations.decide(id, {}, ctx),
    () => quotations.convert(id, ctx),
    () => quotations.list({}, ctx, "Customer"),
    () => quotations.statistics(ctx, "Customer"),
    () => quotations.adminNote(id, {}, ctx),
  ])
    await assert.rejects(work, (e) => e.extensions?.code === "UNAUTHENTICATED");
});
test("quotation roles cannot be substituted by caller-controlled roles", () => {
  assert.throws(
    () => quotations.actor({}, "Owner"),
    (e) => e.status === 403 || e.extensions?.code === "FORBIDDEN",
  );
  const ctx = {
    auth: {
      user: {
        id: randomUUID(),
        active: true,
        emailVerified: true,
        roles: [{ code: "CUSTOMER", active: true }],
      },
    },
  };
  assert.throws(
    () => quotations.actor(ctx, "Vendor"),
    (e) => e.status === 403 || e.extensions?.code === "FORBIDDEN",
  );
  assert.throws(
    () => quotations.actor(ctx, "Admin"),
    (e) => e.status === 403 || e.extensions?.code === "FORBIDDEN",
  );
});
