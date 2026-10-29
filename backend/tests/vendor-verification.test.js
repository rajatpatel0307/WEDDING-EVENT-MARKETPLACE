import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import {
  decideVendor,
  validateDecision,
  queueQuery,
  pendingVendors,
} from "../src/modules/admin/vendor-verification.service.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import { resolvers } from "../src/graphql/auth/auth.resolvers.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800";
const ctx = {
  auth: {
    user: {
      id: "734b9588-c47c-40eb-8c17-1797d65a2801",
      active: true,
      emailVerified: true,
      roles: [{ code: "ADMIN", active: true }],
    },
  },
  req: { ip: "127.0.0.1" },
};
const vendor = {
  VendorId: id,
  UserId: "734b9588-c47c-40eb-8c17-1797d65a2802",
  VerificationStatus: "Pending",
  VerificationCycle: 1,
  IsActive: false,
  UpdatedAt: new Date("2026-01-01T00:00:00Z"),
};
function setup(
  t,
  row = vendor,
  owner = { IsEmailVerified: true, IsActive: true, IsBlocked: false },
) {
  const tx = {};
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.startsWith("SELECT * FROM dbo.[Vendors]")
      ? [row]
      : sql.startsWith("SELECT IsEmailVerified")
        ? [owner]
        : [],
  );
  return { query, tx };
}
test("verification flow restricts transitions and requires rejection context", () => {
  for (const [from, target] of [
    ["Pending", "Approved"],
    ["UnderReview", "Approved"],
    ["UnderReview", "Rejected"],
    ["Approved", "Suspended"],
    ["Suspended", "Approved"],
    ["Rejected", "Reapply"],
  ])
    assert.doesNotThrow(() =>
      validateDecision(from, target, {
        reason: "Verification failed",
        notes: "Please correct the documents.",
      }),
    );
  for (const [from, target] of [
    ["Rejected", "Approved"],
    ["Approved", "Rejected"],
    ["Pending", "Suspended"],
    ["Approved", "Approved"],
  ])
    assert.throws(
      () =>
        validateDecision(from, target, {
          reason: "Invalid documents",
          notes: "Review context",
        }),
      { status: 409 },
    );
  assert.throws(
    () =>
      validateDecision("Pending", "Rejected", { reason: "Invalid documents" }),
    /admin notes/,
  );
  assert.throws(
    () =>
      validateDecision("Pending", "Rejected", { notes: "Please reupload." }),
    /rejection reason/,
  );
});
test("approval activates and timestamps a vendor, and writes both review milestones atomically", async (t) => {
  const { query, tx } = setup(t);
  const result = await decideVendor(
    id,
    "Approved",
    { notes: "All documents verified." },
    ctx,
  );
  assert.equal(result.success, true);
  assert.equal(result.message, "Vendor approved successfully");
  assert.equal(result.data.status, "Approved");
  assert.equal(result.data.isActive, true);
  assert.ok(result.data.verifiedAt);
  const history = query.mock.calls.filter((c) =>
    c.arguments[0].startsWith("INSERT INTO dbo.VendorVerificationHistory"),
  );
  assert.deepEqual(
    history.map((c) => c.arguments[1].replacements.next),
    ["UnderReview", "Approved"],
  );
  const update = query.mock.calls.find((c) =>
    c.arguments[0].startsWith("UPDATE dbo.[Vendors]"),
  );
  assert.match(update.arguments[0], /IsActive/);
  assert.match(update.arguments[0], /VerifiedAt/);
  assert.match(update.arguments[0], /VerifiedBy/);
  assert.equal(
    query.mock.calls.filter(
      (c) =>
        c.arguments[0].startsWith("INSERT INTO dbo.Notifications") &&
        !c.arguments[0].includes("AdminEvent"),
    ).length,
    1,
  );
  assert.ok(query.mock.calls.every((c) => c.arguments[1].transaction === tx));
});
test("rejection preserves records, revokes sessions, and sends the reason and notes", async (t) => {
  const { query } = setup(t);
  const result = await decideVendor(
    id,
    "Rejected",
    {
      reason: "Invalid business documents",
      notes: "Please upload a valid GST certificate.",
    },
    ctx,
  );
  assert.equal(result.data.isActive, false);
  const notification = query.mock.calls.find(
    (c) =>
      c.arguments[0].startsWith("INSERT INTO dbo.Notifications") &&
      !c.arguments[0].includes("AdminEvent"),
  );
  assert.match(
    notification.arguments[1].replacements.message,
    /valid GST certificate/,
  );
  assert.ok(
    query.mock.calls.some((c) =>
      c.arguments[0].startsWith("UPDATE dbo.AuthSessions"),
    ),
  );
  assert.ok(
    !query.mock.calls.some((c) => /DELETE|TRUNCATE/.test(c.arguments[0])),
  );
});
test("long rejection notes fit the notification column while history retains the full text", async (t) => {
  const { query } = setup(t);
  const notes = "N".repeat(2000);
  await decideVendor(id, "Rejected", { reason: "R".repeat(1000), notes }, ctx);
  const notification = query.mock.calls.find(
    (c) =>
      c.arguments[0].startsWith("INSERT INTO dbo.Notifications") &&
      !c.arguments[0].includes("AdminEvent"),
  );
  assert.equal(notification.arguments[1].replacements.message.length, 2000);
  const history = query.mock.calls
    .filter((c) =>
      c.arguments[0].startsWith("INSERT INTO dbo.VendorVerificationHistory"),
    )
    .at(-1);
  assert.equal(history.arguments[1].replacements.notes, notes);
});
test("reapplication creates a new cycle and clears current verification timestamp", async (t) => {
  const { query } = setup(t, {
    ...vendor,
    VerificationStatus: "Rejected",
    VerificationCycle: 3,
    VerifiedAt: new Date(),
  });
  const result = await decideVendor(
    id,
    "Reapply",
    { notes: "Updated documents received." },
    ctx,
  );
  assert.equal(result.data.cycle, 4);
  assert.equal(result.data.status, "UnderReview");
  assert.equal(result.data.verifiedAt, null);
  const history = query.mock.calls.find((c) =>
    c.arguments[0].startsWith("INSERT INTO dbo.VendorVerificationHistory"),
  );
  assert.equal(history.arguments[1].replacements.cycle, 4);
  assert.ok(
    !query.mock.calls.some((c) => /DELETE|TRUNCATE/.test(c.arguments[0])),
  );
});
test("approval rejects stale snapshots and unverified or disabled owners", async (t) => {
  const { query } = setup(t);
  await assert.rejects(
    () => decideVendor(id, "Approved", { expectedStatus: "UnderReview" }, ctx),
    { status: 409 },
  );
  await assert.rejects(
    () =>
      decideVendor(
        id,
        "Approved",
        { expectedUpdatedAt: "2025-01-01T00:00:00Z" },
        ctx,
      ),
    { status: 409 },
  );
  assert.ok(!query.mock.calls.some((c) => c.arguments[0].startsWith("UPDATE")));
});
test("blocked owners cannot be approved", async (t) => {
  setup(t, vendor, { IsEmailVerified: true, IsActive: true, IsBlocked: true });
  await assert.rejects(
    () => decideVendor(id, "Approved", {}, ctx),
    /active, unblocked owner/,
  );
});
test("queue filters are validated and escaped instead of inserted into SQL", async (t) => {
  assert.throws(() => queueQuery.parse({ status: "constructor" }));
  assert.throws(() => queueQuery.parse({ category: "1; DROP TABLE Vendors" }));
  assert.throws(() =>
    queueQuery.parse({ from: "2026-12-01", to: "2026-01-01" }),
  );
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("COUNT") ? [{ total: 0 }] : [],
  );
  await pendingVendors(
    {
      q: "special_%'value",
      documentStatus: "Missing",
      category: 1,
      city: "Test city",
      from: "2026-01-01",
      to: "2026-01-31",
    },
    ctx,
  );
  const [sql, options] = query.mock.calls[0].arguments;
  assert.ok(!sql.includes("special"));
  assert.match(sql, /:category/);
  assert.match(sql, /:city/);
  assert.match(sql, /:documentStatus/);
  assert.equal(options.replacements.q, "%special[_][%]'value%");
});
async function getWorkspace(auth) {
  const app = express();
  app.use(
    "/api/vendor",
    createVendorRouter({ authenticateRequest: async () => auth }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/vendor/workspace`,
    );
    return { status: response.status, body: await response.json() };
  } finally {
    server.close();
  }
}
test("REST and GraphQL deny every non-approved vendor status, missing vendors and inactive vendors", async () => {
  const user = { ...ctx.auth.user, roles: [{ code: "VENDOR", active: true }] };
  assert.equal((await getWorkspace(null)).status, 401);
  assert.equal((await getWorkspace(ctx.auth)).status, 403);
  for (const value of [
    undefined,
    ...["Pending", "UnderReview", "Rejected", "Suspended"].map(
      (verificationStatus) => ({ id, verificationStatus, active: true }),
    ),
    { id, verificationStatus: "Approved", active: false },
  ]) {
    const context = { auth: { user: { ...user, vendor: value } } };
    assert.equal((await getWorkspace(context.auth)).status, 403);
    assert.throws(
      () => resolvers.Query.vendorWorkspace(null, {}, context),
      (e) => e.extensions.code === "FORBIDDEN",
    );
  }
  const auth = {
    user: {
      ...user,
      vendor: {
        id,
        businessName: "Approved vendor",
        verificationStatus: "Approved",
        active: true,
      },
    },
  };
  assert.equal((await getWorkspace(auth)).status, 200);
  assert.equal(resolvers.Query.vendorWorkspace(null, {}, { auth }).id, id);
});
