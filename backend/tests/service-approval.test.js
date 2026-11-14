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
  review,
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
function setup(t, service = row, vendor = {}, notificationFails = false, images = []) {
  const tx = { fixture: true };
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const runQuery = async (sql) => {
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
    if (sql.startsWith("UPDATE dbo.Media")) return images;
    return [];
  };
  const query = t.mock.method(sequelize, "query", runQuery);
  return { query, tx, runQuery };
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

test("service review includes separate vendor and document reasons with owner eligibility", async (t) => {
  const vendor = { VerificationRemarks: "Business registration expired", OwnerActive: true, OwnerBlocked: false, OwnerEmailVerified: true };
  const document = { id: owner, DocumentType: "Registration", VerificationStatus: "Rejected", RejectionReason: "Unreadable document" };
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.startsWith("SELECT s.*")) return [{ ...row, VendorRejectionReason: vendor.VerificationRemarks }];
    if (sql.startsWith("SELECT VendorId FROM dbo.Services")) return [{ VendorId: id }];
    if (sql.includes("FROM dbo.VendorDocuments")) return [document];
    if (sql.startsWith("SELECT v.BusinessName")) return [vendor];
    return [];
  });
  const result = await review(id, ctx);
  assert.equal(result.VendorRejectionReason, "Business registration expired");
  assert.equal(result.documents[0].RejectionReason, "Unreadable document");
  assert.equal(result.vendor.OwnerEmailVerified, true);
  const sql = query.mock.calls.map((call) => call.arguments[0]).join("\n");
  assert.match(sql, /v.VerificationRemarks AS VendorRejectionReason/);
  assert.match(sql, /DocumentType,VerificationStatus,RejectionReason/);
  assert.match(sql, /u.IsEmailVerified AS OwnerEmailVerified/);
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
    calls.some(
      (c) =>
        c.arguments[0].startsWith("INSERT INTO dbo.Notifications") &&
        !c.arguments[0].includes("AdminEvent"),
    ),
  );
  assert.ok(calls.every((c) => c.arguments[1].transaction === tx));
});
test("approval publishes pending service photos with the same reviewer, timestamp and transaction", async (t) => {
  for (const status of ["Pending", "UnderReview"]) {
    await t.test(status, async (st) => {
      const imageIds = [owner, admin];
      const { query, tx } = setup(st, { ...row, ApprovalStatus: status }, {}, false, imageIds.map((id) => ({ id })));
      await decide(id, "approve", {}, ctx);
      const calls = query.mock.calls;
      const photoUpdate = calls.find((c) => c.arguments[0].startsWith("UPDATE dbo.Media"));
      const [sql, options] = photoUpdate.arguments;
      assert.match(sql, /EntityType='Service' AND EntityId=:id AND MediaType='Image'/);
      assert.match(sql, /ModerationStatus='Pending' AND UploadStatus='Ready' AND DeletedAt IS NULL/);
      assert.equal(options.replacements.id, id);
      assert.equal(options.replacements.admin, admin);
      const serviceUpdate = calls.find((c) => c.arguments[0].startsWith("UPDATE dbo.[Services]"));
      assert.ok(Object.values(serviceUpdate.arguments[1].replacements).includes(options.replacements.now));
      const audits = calls.filter((c) => c.arguments[1].replacements?.action === "MEDIA_APPROVE");
      assert.deepEqual(audits.map((c) => c.arguments[1].replacements.id), imageIds);
      for (const audit of audits) {
        assert.equal(audit.arguments[1].replacements.user, admin);
        assert.deepEqual(JSON.parse(audit.arguments[1].replacements.next), {
          status: "Approved", serviceId: id, source: "ServiceApproval",
        });
      }
      assert.ok(calls.every((c) => c.arguments[1].transaction === tx));
    });
  }
});

test("other service decisions leave photo moderation unchanged", async (t) => {
  for (const action of ["reject", "start-review", "suspend", "deactivate", "activate"]) {
    await t.test(action, async (st) => {
      const { query } = setup(st, { ...row, ApprovalStatus: ["reject", "start-review"].includes(action) ? "Pending" : "Approved" });
      await decide(id, action, action === "reject" ? { reason: "Invalid pricing" } : {}, ctx);
      assert.ok(!query.mock.calls.some((c) => c.arguments[0].startsWith("UPDATE dbo.Media")));
    });
  }
});

test("photo approval or audit failures abort the service decision before notifications", async (t) => {
  for (const failure of ["update", "audit"]) {
    await t.test(failure, async (st) => {
      const { query, runQuery } = setup(st, row, {}, false, [{ id: owner }]);
      query.mock.mockImplementation(async (sql, options) => {
        if ((failure === "update" && sql.startsWith("UPDATE dbo.Media")) ||
            (failure === "audit" && options.replacements?.action === "MEDIA_APPROVE"))
          throw new Error("Photo approval failed");
        return runQuery(sql, options);
      });
      await assert.rejects(() => decide(id, "approve", {}, ctx), /Photo approval failed/);
      assert.ok(!query.mock.calls.some((c) => c.arguments[0].startsWith("INSERT INTO dbo.Notifications")));
    });
  }
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
  const notification = query.mock.calls.find(
    (c) =>
      c.arguments[0].startsWith("INSERT INTO dbo.Notifications") &&
      !c.arguments[0].includes("AdminEvent"),
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
