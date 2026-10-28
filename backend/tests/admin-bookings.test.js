import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import {
  financialSummary,
  minor,
  policySchema,
} from "../src/modules/admin/booking-finance.js";
import {
  listInput,
  filters,
  assertTransition,
  changeStatus,
  reviewPolicy,
} from "../src/modules/admin/bookings-management.service.js";
import {
  initiate,
  refundInput,
  reconcileRefund,
} from "../src/modules/admin/booking-refunds.service.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
const id = "734b9588-c47c-40eb-8c17-1797d65a2800",
  admin = "734b9588-c47c-40eb-8c17-1797d65a2801",
  key = "734b9588-c47c-40eb-8c17-1797d65a2802";
const ctx = {
  req: { ip: "127.0.0.1", get: () => "test-agent" },
  auth: {
    user: {
      id: admin,
      active: true,
      emailVerified: true,
      roles: [{ code: "ADMIN", active: true }],
    },
  },
};
const row = {
  BookingId: id,
  BookingNumber: "BK-TEST",
  CustomerId: admin,
  VendorId: key,
  BookingStatus: "Cancelled",
  PaymentStatus: "Paid",
  SubTotal: 1000,
  TotalAmount: 1000,
  DiscountAmount: 0,
  TaxAmount: 0,
  PlatformFee: 0,
  PaidAmount: 1000,
  AdvanceAmount: 0,
  BookingDate: "2026-12-01",
  UpdatedAt: "2026-10-29T10:00:00.000Z",
  PolicySnapshotJson: JSON.stringify({
    policy: {
      refundPercent: 80,
      cancellationFeePercent: 10,
      minimumNoticeHours: 0,
    },
  }),
};
const ledger = () => ({
  payments: [
    {
      PaymentId: key,
      PaymentStatus: "Success",
      Amount: 1000,
      Currency: "INR",
      GatewayName: "Razorpay",
      GatewayTransactionId: "pay_fixture",
    },
  ],
  refunds: [],
  payouts: [],
  commissions: [{ CommissionAmount: 100 }],
});
function setup(t, extra = () => [], booking = row) {
  t.mock.method(sequelize, "transaction", async (fn) => fn({ test: true }));
  return t.mock.method(sequelize, "query", async (sql, opts) =>
    sql.startsWith("SELECT * FROM dbo.Booking") ? [booking] : extra(sql, opts),
  );
}
test("booking queries reject injected identifiers, unbounded paging and inverted ranges", () => {
  for (const q of [
    { sort: "amount;DROP TABLE Booking" },
    { pageSize: 101 },
    { page: 0 },
    { customer: "bad" },
    { vendor: "bad" },
    { category: -1 },
    { minAmount: 100, maxAmount: 10 },
    { eventFrom: "2026-11-01", eventTo: "2026-10-01" },
    { bookedFrom: "2026-11-01", bookedTo: "2026-10-01" },
    { commission: 0 },
  ])
    assert.equal(listInput.safeParse(q).success, false);
});
test("search/date filters are bound and include whole Indian calendar days", () => {
  const { p, where } = filters(
    listInput.parse({
      q: "'[%_",
      location: "Jaipur",
      customer: id,
      vendor: admin,
      category: 2,
      bookedFrom: "2026-10-29",
      bookedTo: "2026-10-29",
      page: 2,
      pageSize: 10,
    }),
  );
  assert.equal(p.offset, 10);
  assert.equal(p.from.toISOString(), "2026-10-28T18:30:00.000Z");
  assert.equal(p.to.toISOString(), "2026-10-29T18:30:00.000Z");
  assert.ok(!where.includes("'[%_"));
  assert.match(where, /b.CustomerId=:customer/);
  assert.match(where, /s.CategoryId=:category/);
});
test("completed bookings cannot go pending and pending bookings cannot bypass vendor acceptance", () => {
  assert.throws(() =>
    assertTransition({ ...row, BookingStatus: "Completed" }, "Pending"),
  );
  assert.throws(() =>
    assertTransition({ ...row, BookingStatus: "Pending" }, "Confirmed"),
  );
  assert.throws(() =>
    assertTransition(
      { ...row, BookingStatus: "Accepted", PaidAmount: 0, AdvanceAmount: 10 },
      "Confirmed",
    ),
  );
  assert.doesNotThrow(() =>
    assertTransition({ ...row, BookingStatus: "Confirmed" }, "InProgress"),
  );
});
test("refund values use captured payments, reviewed policy and existing commission", () => {
  const f = financialSummary({ ...row, PaidAmount: 999999 }, ledger());
  assert.equal(f.paid, 1000);
  assert.equal(f.refundEligible, 700);
  assert.equal(f.cancellationCharges, 100);
  assert.equal(f.commission, 100);
  assert.equal(f.canRefund, true);
  assert.equal(f.vendorPayable, 900);
});
test("completed and in-flight refunds reserve the captured balance", () => {
  const l = ledger();
  l.refunds = [
    { PaymentId: key, RefundStatus: "Completed", RefundAmount: 500 },
    { PaymentId: key, RefundStatus: "Processing", RefundAmount: 200 },
  ];
  const f = financialSummary(row, l);
  assert.equal(f.refundEligible, 0);
  assert.equal(f.canRefund, false);
  assert.equal(f.refundPending, 200);
  assert.equal(f.refunded, 500);
  assert.equal(f.vendorPayable, 200);
});
test("unknown terms, unsupported providers and paid payouts block refund initiation", () => {
  assert.equal(
    financialSummary({ ...row, PolicySnapshotJson: null }, ledger()).canRefund,
    false,
  );
  const manual = ledger();
  manual.payments[0].GatewayName = "Manual";
  assert.equal(financialSummary(row, manual).canRefund, false);
  const paid = ledger();
  paid.payouts = [{ PayoutStatus: "Paid", TaxDeduction: 0, ApplicableFees: 0 }];
  assert.equal(financialSummary(row, paid).canRefund, false);
});
test("failed payments cannot increase the refundable balance", () => {
  const l = ledger();
  l.payments.push({
    PaymentId: id,
    PaymentStatus: "Failed",
    Amount: 99999,
    Currency: "INR",
  });
  assert.equal(financialSummary(row, l).paid, 1000);
});
test("policy bounds and currency validation reject unsafe values", () => {
  for (const policy of [
    { refundPercent: 101, cancellationFeePercent: 0, minimumNoticeHours: 0 },
    { refundPercent: 100, cancellationFeePercent: -1, minimumNoticeHours: 0 },
    { refundPercent: 100, cancellationFeePercent: 0, minimumNoticeHours: 8761 },
  ])
    assert.equal(policySchema.safeParse(policy).success, false);
  assert.throws(() => minor(-1));
  assert.throws(() => minor(Infinity));
  assert.equal(minor("10.01"), 1001);
});
test("refund API refuses client-supplied financial values and identity overrides", () => {
  const base = {
    expectedUpdatedAt: row.UpdatedAt,
    idempotencyKey: key,
    reason: "Customer refund",
  };
  for (const field of [
    "refundAmount",
    "amount",
    "commission",
    "paymentStatus",
    "customerId",
    "vendorId",
  ])
    assert.equal(
      refundInput.safeParse({ ...base, [field]: 100 }).success,
      false,
    );
});
test("idempotency replay succeeds before the stale-version check without new writes", async (t) => {
  const reason = "Customer refund",
    notes = "",
    hash = createHash("sha256")
      .update(JSON.stringify({ id, reason, notes }))
      .digest("hex");
  const q = setup(t, (sql) =>
    sql.includes("FROM dbo.AdminBookingOperations")
      ? [
          {
            OperationId: key,
            BookingId: id,
            RequestedBy: admin,
            RequestHash: hash,
          },
        ]
      : [],
  );
  const r = await initiate(
    id,
    {
      expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
      idempotencyKey: key,
      reason,
    },
    ctx,
  );
  assert.equal(r.replayed, true);
  assert.ok(!q.mock.calls.some((c) => /^(INSERT|UPDATE)/.test(c.arguments[0])));
});
test("reusing an idempotency key for another request fails closed", async (t) => {
  const q = setup(t, (sql) =>
    sql.includes("FROM dbo.AdminBookingOperations")
      ? [
          {
            OperationId: key,
            BookingId: id,
            RequestedBy: admin,
            RequestHash: "different",
          },
        ]
      : [],
  );
  await assert.rejects(
    () =>
      initiate(
        id,
        {
          expectedUpdatedAt: row.UpdatedAt,
          idempotencyKey: key,
          reason: "Changed refund request",
        },
        ctx,
      ),
    (e) => e.status === 409,
  );
  assert.ok(!q.mock.calls.some((c) => /^(INSERT|UPDATE)/.test(c.arguments[0])));
});
test("stale cancellation does not update booking, payments or payouts", async (t) => {
  const q = setup(t, () => [], { ...row, BookingStatus: "Confirmed" });
  await assert.rejects(
    () =>
      changeStatus(
        id,
        "Cancelled",
        {
          expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
          reason: "Customer cancelled",
        },
        ctx,
      ),
    (e) => e.status === 409,
  );
  assert.ok(!q.mock.calls.some((c) => /^(INSERT|UPDATE)/.test(c.arguments[0])));
});
test("policy cannot change once a refund is reserved or completed", async (t) => {
  setup(t, (sql) =>
    sql.includes("FROM dbo.Refunds")
      ? [{ RefundStatus: "Processing", RefundAmount: 100 }]
      : [],
  );
  await assert.rejects(
    () =>
      reviewPolicy(
        id,
        {
          expectedUpdatedAt: row.UpdatedAt,
          policy: {
            refundPercent: 100,
            cancellationFeePercent: 0,
            minimumNoticeHours: 0,
          },
          reason: "Review the original agreement.",
        },
        ctx,
      ),
    (e) => e.status === 409,
  );
});
test("provider refund mismatches cannot post financial changes", async (t) => {
  const q = t.mock.method(sequelize, "query", async (sql) =>
    sql.startsWith("SELECT * FROM dbo.Payments")
      ? [{ BookingId: id, PaymentId: key, Currency: "INR", Amount: 100 }]
      : sql.startsWith("SELECT * FROM dbo.Booking")
        ? [row]
        : [],
  );
  t.mock.method(sequelize, "transaction", async (fn) => fn({ test: true }));
  await assert.rejects(
    () =>
      reconcileRefund({
        id: "rfnd_fixture",
        payment_id: "pay_fixture",
        amount: 10001,
        currency: "INR",
        status: "processed",
      }),
    (e) => e.status === 409,
  );
  assert.ok(!q.mock.calls.some((c) => /^(INSERT|UPDATE)/.test(c.arguments[0])));
});
test("every booking endpoint rejects unauthenticated and non-admin identities before SQL", async (t) => {
  const q = t.mock.method(sequelize, "query", async () => {
    throw new Error("Must not query");
  });
  let auth = null;
  const app = express();
  app.use(
    "/api/admin",
    createAdminRouter({ authenticateRequest: async () => auth }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}/api/admin/bookings`;
  for (const [identity, status] of [
    [null, 401],
    [
      { user: { ...ctx.auth.user, roles: [{ code: "VENDOR", active: true }] } },
      403,
    ],
    [
      {
        user: { ...ctx.auth.user, roles: [{ code: "CUSTOMER", active: true }] },
      },
      403,
    ],
  ]) {
    auth = identity;
    for (const path of [
      "",
      "/statistics",
      "/options",
      `/${id}`,
      `/${id}/items`,
      `/${id}/status-history`,
      `/${id}/payment`,
      `/${id}/payout`,
    ])
      assert.equal((await fetch(base + path)).status, status);
    for (const action of ["cancel", "refund", "policy-review", "status"])
      assert.equal(
        (
          await fetch(`${base}/${id}/${action}`, {
            method: "POST",
            headers: {
              Origin: process.env.FRONTEND_URL,
              "X-Admin-Request": "1",
            },
          })
        ).status,
        status,
      );
  }
  assert.equal(q.mock.callCount(), 0);
});
