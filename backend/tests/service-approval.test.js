import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import {
  decide,
  decisionInput,
  decisionReason,
  assertTransition,
  approvalHistory,
} from "../src/modules/admin/service-approval.service.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800";
const owner = "734b9588-c47c-40eb-8c17-1797d65a2801";
const admin = "734b9588-c47c-40eb-8c17-1797d65a2802";
const ctx = {
  req: { ip: "127.0.0.1" },
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
  ServiceId: id,
  VendorId: id,
  ServiceName: "Wedding Garden",
  ApprovalStatus: "Pending",
  UpdatedAt: "2026-10-28T10:00:00.000Z",
  ApprovalCycle: 2,
  IsActive: false,
};
function setup(t, service = row, vendor = {}, notificationFails = false) {
  const tx = { fixture: true };
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.startsWith("SELECT * FROM dbo.[Services]"))
      return service ? [service] : [];
    if (sql.startsWith("SELECT v.UserId"))
      return [
        {
          UserId: owner,
          VerificationStatus: "Approved",
          IsActive: true,
          OwnerActive: true,
          OwnerBlocked: false,
          IsEmailVerified: true,
          ...vendor,
        },
      ];
    if (notificationFails && sql.startsWith("INSERT INTO dbo.Notifications"))
      throw new Error("Notification write failed");
    return [];
  });
  return { query, tx };
}
test("service decisions validate custom rejection reasons and prevent field injection", () => {
  for (const reason of [undefined, "", " ", "Other"])
    assert.throws(
      () => decisionReason({ reason }, "reject"),
      (e) => e.status === 422,
    );
  assert.equal(
    decisionReason(
      { reason: "Other", customReason: "Needs a venue address" },
      "reject",
    ),
    "Needs a venue address",
  );
  assert.equal(
    decisionInput.safeParse({ notes: "Verified", ApprovedBy: owner }).success,
    false,
  );
  assert.equal(
    decisionInput.safeParse({ notes: "x".repeat(1001) }).success,
    false,
  );
});
test("review transitions reject drafts, repeated decisions and vendor attempts to activate suspension", () => {
  for (const status of ["Draft", "Rejected", "Approved", "Suspended"])
    assert.throws(
      () => assertTransition(status, "approve"),
      (e) => e.status === 409,
    );
  assert.doesNotThrow(() => assertTransition("UnderReview", "reject"));
  assert.throws(() => assertTransition("Suspended", "activate"));
});
test("approval activates and stores admin identity with audit and notification in the same transaction", async (t) => {
  const { query, tx } = setup(t);
  assert.equal(
    (await decide(id, "approve", { notes: "Verified" }, ctx)).active,
    true,
  );
  const calls = query.mock.calls;
  assert.ok(calls.some((c) => c.arguments[0].includes("[ApprovedAt]")));
  const update = calls.find((c) => c.arguments[0].startsWith("UPDATE"));
  assert.ok(Object.values(update.arguments[1].replacements).includes(admin));
  assert.ok(
    calls.some((c) => c.arguments[0].startsWith("INSERT INTO dbo.AuditLogs")),
  );
  assert.ok(
    calls.some((c) =>
      c.arguments[0].startsWith("INSERT INTO dbo.Notifications"),
    ),
  );
  assert.ok(calls.every((c) => c.arguments[1].transaction === tx));
});
test("rejection records reason and reviewer without activating the listing", async (t) => {
  const { query } = setup(t);
  const result = await decide(
    id,
    "reject",
    { reason: "Invalid pricing", notes: "Provide a rate card" },
    ctx,
  );
  assert.deepEqual(
    { status: result.status, active: result.active },
    { status: "Rejected", active: false },
  );
  const update = query.mock.calls.find((c) =>
    c.arguments[0].startsWith("UPDATE"),
  );
  assert.match(update.arguments[0], /RejectedBy/);
  const notification = query.mock.calls.find((c) =>
    c.arguments[0].startsWith("INSERT INTO dbo.Notifications"),
  );
  assert.match(
    notification.arguments[1].replacements.message,
    /Invalid pricing.*Provide a rate card/,
  );
});
test("stale snapshots and missing services cannot be approved", async (t) => {
  const { query } = setup(t);
  await assert.rejects(
    () =>
      decide(
        id,
        "approve",
        { expectedUpdatedAt: "2026-10-27T10:00:00.000Z" },
        ctx,
      ),
    (e) => e.status === 409,
  );
  assert.equal(
    query.mock.calls.filter((c) => c.arguments[0].startsWith("UPDATE")).length,
    0,
  );
});
test("missing services return 404", async (t) => {
  setup(t, null);
  await assert.rejects(
    () => decide(id, "approve", {}, ctx),
    (e) => e.status === 404,
  );
});
test("admins cannot approve services they own", async (t) => {
  setup(t, row, { UserId: admin });
  await assert.rejects(
    () => decide(id, "approve", {}, ctx),
    (e) => e.status === 403,
  );
});
test("unapproved vendors and blocked owners cannot receive service approval", async (t) => {
  for (const vendor of [
    { VerificationStatus: "Rejected" },
    { IsActive: false },
    { OwnerBlocked: true },
  ]) {
    await t.test(JSON.stringify(vendor), async (st) => {
      setup(st, row, vendor);
      await assert.rejects(
        () => decide(id, "approve", {}, ctx),
        (e) => e.status === 409,
      );
    });
  }
});
test("notification failure rejects the entire transaction", async (t) => {
  setup(t, row, {}, true);
  await assert.rejects(
    () => decide(id, "approve", {}, ctx),
    /Notification write failed/,
  );
});
test("vendors cannot use another vendor's approval timeline", async () => {
  const vendorCtx = {
    auth: {
      user: {
        ...ctx.auth.user,
        roles: [{ code: "VENDOR", active: true }],
        vendor: { id: owner },
      },
    },
  };
  await assert.rejects(
    () => approvalHistory(id, vendorCtx, id),
    (e) => e.status === 403,
  );
});
test("all service approval endpoints deny vendor identities before touching the database", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => {
    throw new Error("Database must not be reached");
  });
  const app = express();
  app.use(
    "/api/admin",
    createAdminRouter({
      authenticateRequest: async () => ({
        user: { ...ctx.auth.user, roles: [{ code: "VENDOR", active: true }] },
      }),
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}/api/admin/services`;
  for (const path of [
    "/pending",
    "/pending-count",
    `/${id}/review`,
    `/${id}/approval-history`,
  ])
    assert.equal((await fetch(base + path)).status, 403);
  for (const action of [
    "approve",
    "reject",
    "start-review",
    "suspend",
    "activate",
    "deactivate",
  ])
    assert.equal(
      (
        await fetch(`${base}/${id}/${action}`, {
          method: "POST",
          headers: { Origin: process.env.FRONTEND_URL, "X-Admin-Request": "1" },
        })
      ).status,
      403,
    );
  assert.equal(query.mock.callCount(), 0);
});
