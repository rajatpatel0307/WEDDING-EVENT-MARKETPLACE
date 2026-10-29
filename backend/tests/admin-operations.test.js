import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import {
  eligiblePayout,
  decide,
} from "../src/modules/admin/payouts.service.js";
import * as operations from "../src/modules/admin/operations.service.js";
import * as commission from "../src/modules/admin/commission.service.js";
import { dashboard } from "../src/modules/admin/admin.analytics.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
const id = "734b9588-c47c-40eb-8c17-1797d65a2800",
  key = "734b9588-c47c-40eb-8c17-1797d65a2801";
const ctx = {
  req: { ip: "127.0.0.1" },
  auth: {
    user: {
      id: key,
      active: true,
      emailVerified: true,
      roles: [{ code: "ADMIN", active: true }],
    },
  },
};
const booking = {
  BookingId: id,
  VendorId: key,
  BookingStatus: "Completed",
  TotalAmount: 1000,
};
const payout = {
  PayoutId: id,
  BookingId: id,
  VendorId: key,
  GrossAmount: 1000,
  PlatformCommission: 100,
  TaxDeduction: 10,
  RefundDeduction: 0,
  ApplicableFees: 5,
  NetAmount: 885,
};
const ledger = () => ({
  payments: [{ PaymentStatus: "Success", Amount: 1000, Currency: "INR" }],
  refunds: [],
  payouts: [payout],
  commissions: [{ VendorId: key, CommissionAmount: 100 }],
});
test("payout eligibility rejects unsupported money, duplicate payouts, unsettled refunds and ledger mismatches", () => {
  assert.match(eligiblePayout(booking, payout, ledger()), /^[a-f0-9]{64}$/);
  for (const mutate of [
    (b) => {
      b.BookingStatus = "Disputed";
    },
    (b, p, l) => {
      l.payments[0].Currency = "USD";
    },
    (b, p, l) => {
      l.payments[0].PaymentStatus = "Failed";
    },
    (b, p, l) => {
      l.refunds.push({ RefundStatus: "Processing", RefundAmount: 10 });
    },
    (b, p, l) => {
      l.refunds.push({ RefundStatus: "Completed", RefundAmount: 10 });
    },
    (b, p, l) => {
      l.payouts.push({ ...p });
    },
    (b, p, l) => {
      l.commissions = [];
    },
    (b, p) => {
      p.NetAmount = 900;
    },
    (b, p) => {
      p.PlatformCommission = 0;
    },
    (b, p) => {
      p.VendorId = id;
    },
    (b, p, l) => {
      l.commissions[0].VendorId = id;
    },
  ]) {
    const b = { ...booking },
      p = { ...payout },
      l = ledger();
    mutate(b, p, l);
    assert.throws(() => eligiblePayout(b, p, l));
  }
});
test("new operational services reject missing identities before database access", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => {
    throw new Error("Unexpected SQL");
  });
  for (const operation of [
    () => operations.search({ q: "customer" }, { auth: null }),
    () => operations.inbox({ auth: null }),
    () => operations.details("payments", id, { auth: null }),
    () => operations.readNotification(id, { read: true }, { auth: null }),
    () => commission.configuration({ auth: null }),
    () => commission.configure({}, { auth: null }),
    () => decide(id, {}, { auth: null }),
    () => dashboard({}, { auth: null }),
  ])
    await assert.rejects(operation, /sign in/);
  assert.equal(query.mock.callCount(), 0);
});
test("financial identifiers, search input and payout amounts cannot be injected", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(() => operations.details("constructor", id, ctx), {
    status: 404,
  });
  await assert.rejects(() => operations.details("payments", "bad-id", ctx));
  await assert.rejects(() => operations.search({ q: "a" }, ctx));
  await assert.rejects(() =>
    decide(
      id,
      {
        action: "confirm-paid",
        expectedUpdatedAt: new Date().toISOString(),
        note: "Attempt",
        amount: 1,
      },
      ctx,
    ),
  );
  assert.equal(query.mock.callCount(), 0);
});
test("paid settlement replays return before stale checks without another ledger mutation", async (t) => {
  t.mock.method(sequelize, "transaction", async (fn) => fn({}));
  const paid = {
    ...payout,
    PayoutStatus: "Paid",
    SettlementKey: key,
    SettlementReference: "bank-reference",
    UpdatedAt: "2026-10-29T10:00:00.000Z",
  };
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.startsWith("SELECT BookingId")) return [{ BookingId: id }];
    if (sql.includes("FROM dbo.[Booking]")) return [booking];
    if (sql.includes("FROM dbo.VendorPayouts")) return [paid];
    return [];
  });
  const result = await decide(
    id,
    {
      action: "confirm-paid",
      expectedUpdatedAt: "2000-01-01T00:00:00.000Z",
      note: "Settlement confirmation",
      idempotencyKey: key,
      reference: "bank-reference",
    },
    ctx,
  );
  assert.equal(result.replayed, true);
  assert.ok(
    !query.mock.calls.some((call) =>
      /^(UPDATE|INSERT|DELETE)/.test(call.arguments[0]),
    ),
  );
});
test("notification mutations bind the authenticated recipient and fail closed for other recipients", async (t) => {
  t.mock.method(sequelize, "transaction", async (fn) => fn({}));
  const query = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(
    () => operations.readNotification(id, { read: true }, ctx),
    { status: 404 },
  );
  assert.equal(query.mock.calls[0].arguments[1].replacements.user, key);
  assert.match(
    query.mock.calls[0].arguments[0],
    /NotificationId=:id AND UserId=:user/,
  );
});
test("every new REST capability requires administrator authorization", async () => {
  const app = express();
  let auth = null;
  app.use(
    "/api/admin",
    createAdminRouter({ authenticateRequest: async () => auth }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    for (const path of [
      "/search?q=vendor",
      "/notifications/inbox",
      `/finance/payments/${id}`,
      "/commission/configuration",
    ])
      for (const role of [null, "CUSTOMER", "VENDOR"]) {
        auth = role
          ? {
              user: { ...ctx.auth.user, roles: [{ code: role, active: true }] },
            }
          : null;
        assert.equal(
          (
            await fetch(
              `http://127.0.0.1:${server.address().port}/api/admin${path}`,
            )
          ).status,
          role ? 403 : 401,
        );
      }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
