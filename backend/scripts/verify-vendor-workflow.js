// Real HTTP + database verification. All fixtures and decisions are rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import { loadUser } from "../src/modules/auth/token.service.js";
import { resolvers } from "../src/graphql/auth/auth.resolvers.js";

const rollback = new Error("ROLLBACK_VERIFICATION_WORKFLOW");
let passed = false;
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction;
    sequelize.query = function (sql, options = {}) {
      return originalQuery.call(this, sql, { ...options, transaction: tx });
    };
    sequelize.transaction = async (fn) => fn(tx);
    let server;
    try {
      const ids = Object.fromEntries(
        ["admin", "owner", "otherOwner", "vendor", "otherVendor"].map((key) => [
          key,
          randomUUID(),
        ]),
      );
      const prefix = `workflow-${randomUUID().slice(0, 8)}`;
      const query = (sql, replacements = {}) =>
        sequelize.query(sql, { replacements: { ...ids, ...replacements } });
      for (const id of [ids.admin, ids.owner, ids.otherOwner])
        await query(
          "INSERT INTO dbo.Users(UserId,FirstName,LastName,Email,PasswordHash,IsEmailVerified) VALUES(:userId,'Workflow','Fixture',:email,'fixture-not-a-password',1)",
          { userId: id, email: `${id}@example.invalid` },
        );
      await query(
        "INSERT INTO dbo.UserRoles(UserId,RoleId) SELECT :owner,RoleId FROM dbo.Roles WHERE RoleCode='VENDOR'",
      );
      for (const [id, owner] of [
        [ids.vendor, ids.owner],
        [ids.otherVendor, ids.otherOwner],
      ])
        await query(
          "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,IsActive) VALUES(:vendorId,:ownerId,:name,:vendorId,0)",
          { vendorId: id, ownerId: owner, name: `${prefix}-${id}` },
        );
      const [categories] = await query(
        "SELECT TOP(1) CategoryId AS id FROM dbo.Categories WHERE IsActive=1",
      );
      assert.ok(categories.length, "At least one active category is required.");
      await query(
        "INSERT INTO dbo.VendorCategories(VendorId,CategoryId) VALUES(:vendor,:category)",
        { category: categories[0].id },
      );
      await query(
        "INSERT INTO dbo.VendorLocations(VendorId,AddressLine1,City,State) VALUES(:vendor,'Workflow fixture address','Workflow city','Test state'); INSERT INTO dbo.VendorDocuments(VendorId,DocumentType,DocumentUrl) VALUES(:vendor,'GST','fixture-only-not-a-file')",
      );
      const context = {
        auth: {
          user: {
            id: ids.admin,
            active: true,
            emailVerified: true,
            roles: [{ code: "ADMIN", active: true }],
          },
        },
        req: { ip: "127.0.0.1" },
      };
      const app = express();
      app.use(
        "/api/admin",
        createAdminRouter({
          authenticateRequest: async (req) =>
            req.get("x-test-role") === "anonymous"
              ? null
              : req.get("x-test-role") === "customer"
                ? {
                    user: {
                      ...context.auth.user,
                      roles: [{ code: "CUSTOMER", active: true }],
                    },
                  }
                : context.auth,
        }),
      );
      app.use(
        "/api/vendor",
        createVendorRouter({
          authenticateRequest: async () => ({
            user: await loadUser(ids.owner),
          }),
        }),
      );
      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      const base = `http://127.0.0.1:${server.address().port}`;
      async function request(path, method = "GET", body, role = "admin") {
        const response = await fetch(`${base}${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            Origin: process.env.FRONTEND_URL || "http://localhost:5173",
            "X-Admin-Request": "1",
            "X-Test-Role": role,
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        return { status: response.status, body: await response.json() };
      }
      assert.equal((await request("/api/vendor/workspace")).status, 403);
      assert.equal(
        (
          await request(
            "/api/admin/vendors/pending",
            "GET",
            undefined,
            "anonymous",
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await request(
            "/api/admin/vendors/pending",
            "GET",
            undefined,
            "customer",
          )
        ).status,
        403,
      );
      const filter = new URLSearchParams({
        q: prefix,
        category: String(categories[0].id),
        city: "Workflow city",
        documentStatus: "Pending",
      });
      const queue = await request(`/api/admin/vendors/pending?${filter}`);
      assert.equal(queue.status, 200);
      assert.equal(queue.body.total, 1);
      assert.equal(
        queue.body.rows[0].id.toLowerCase(),
        ids.vendor.toLowerCase(),
      );
      const path = `/api/admin/vendors/${ids.vendor}`;
      assert.equal(
        (await request(`${path}/approve`, "PUT", { notes: "Test" }, "customer"))
          .status,
        403,
      );
      assert.equal(
        (await request(`/api/admin/vendors/${randomUUID()}/approve`, "PUT", {}))
          .status,
        404,
      );
      assert.equal(
        (
          await request(`${path}/start-review`, "PUT", {
            notes: "Review started",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request(`${path}/reject`, "PUT", {
            reason: "Invalid documents",
          })
        ).status,
        400,
      );
      const approved = await request(`${path}/approve`, "PUT", {
        notes: "All vendor documents verified successfully.",
        expectedStatus: "UnderReview",
      });
      assert.equal(approved.status, 200);
      assert.equal(approved.body.success, true);
      assert.equal(approved.body.message, "Vendor approved successfully");
      assert.equal(approved.body.data.status, "Approved");
      assert.equal(approved.body.data.isActive, true);
      assert.ok(approved.body.data.verifiedAt);
      assert.equal((await request("/api/vendor/workspace")).status, 200);
      const [verified] = await query(
        "SELECT VerifiedAt,VerifiedBy,IsActive FROM dbo.Vendors WHERE VendorId=:vendor",
      );
      assert.ok(verified[0].VerifiedAt);
      assert.equal(
        verified[0].VerifiedBy.toLowerCase(),
        ids.admin.toLowerCase(),
      );
      assert.equal(!!verified[0].IsActive, true);
      assert.equal((await request(`${path}/approve`, "PUT", {})).status, 409);
      assert.equal(
        (
          await request(`${path}/reject`, "PUT", {
            reason: "Invalid documents",
            notes: "This must be a suspension instead",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request(`${path}/suspend`, "PUT", {
            reason: "Compliance review",
            notes: "Documents need another check",
          })
        ).status,
        200,
      );
      assert.equal((await request("/api/vendor/workspace")).status, 403);
      assert.throws(
        () =>
          resolvers.Query.vendorWorkspace(
            null,
            {},
            {
              auth: {
                user: {
                  ...context.auth.user,
                  roles: [{ code: "VENDOR", active: true }],
                  vendor: { verificationStatus: "Rejected", active: true },
                },
              },
            },
          ),
        (e) => e.extensions.code === "FORBIDDEN",
      );
      assert.equal(
        (
          await request(`${path}/approve`, "PUT", {
            notes: "Compliance check complete",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request(`${path}/account`, "PATCH", {
            active: false,
            expectedActive: true,
            note: "Temporarily deactivate",
          })
        ).status,
        200,
      );
      assert.equal((await request("/api/vendor/workspace")).status, 403);
      assert.equal(
        (
          await request(`${path}/account`, "PATCH", {
            active: true,
            expectedActive: false,
            note: "Reactivate after review",
          })
        ).status,
        200,
      );
      assert.equal((await request("/api/vendor/workspace")).status, 200);
      const other = `/api/admin/vendors/${ids.otherVendor}`;
      const rejected = await request(`${other}/reject`, "PUT", {
        reason: "Invalid business documents",
        notes: "Please upload a valid GST certificate.",
      });
      assert.equal(rejected.status, 200);
      assert.equal(rejected.body.message, "Vendor rejected successfully");
      assert.equal((await request(`${other}/approve`, "PUT", {})).status, 409);
      assert.equal(
        (
          await request(`${other}/account`, "PATCH", {
            active: true,
            expectedActive: false,
            note: "Bypass attempt",
          })
        ).status,
        409,
      );
      const rejectedList = await request(
        `/api/admin/vendors/pending?${new URLSearchParams({ q: prefix, status: "Rejected", documentStatus: "Missing" })}`,
      );
      assert.equal(rejectedList.body.total, 1);
      const reapplied = await request(`${other}/reapply`, "PUT", {
        notes: "Corrected GST documents received",
      });
      assert.equal(reapplied.status, 200);
      assert.equal(reapplied.body.data.cycle, 2);
      assert.equal(reapplied.body.data.verifiedAt, null);
      assert.equal(
        (
          await request(`${other}/approve`, "PUT", {
            notes: "Second cycle verified",
          })
        ).status,
        200,
      );
      const history = await request(`${other}/records/history`);
      assert.equal(history.status, 200);
      assert.equal(history.body.total, 4);
      assert.ok(
        history.body.rows.some(
          (row) =>
            row.status === "Rejected" &&
            row.cycle === 1 &&
            row.reason === "Invalid business documents",
        ),
      );
      assert.ok(
        history.body.rows.some(
          (row) => row.status === "Approved" && row.cycle === 2,
        ),
      );
      const [notifications] = await query(
        "SELECT Message FROM dbo.Notifications WHERE UserId=:otherOwner",
      );
      assert.ok(
        notifications.some((n) => n.Message.includes("valid GST certificate")),
      );
      const [audit] = await query(
        "SELECT COUNT(*) AS total FROM dbo.AuditLogs WHERE EntityId=CONVERT(varchar(100),:otherVendor) AND ActionType='ADMIN_VENDOR_REJECTED'",
      );
      assert.equal(audit[0].total, 1);
      const afterQueue = await request(
        `/api/admin/vendors/pending?${new URLSearchParams({ q: prefix })}`,
      );
      assert.equal(afterQueue.body.total, 0);
      assert.equal(afterQueue.body.pendingCount, queue.body.pendingCount - 2);
      passed = true;
    } finally {
      server?.close();
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
    }
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    console.error("Vendor workflow integration failed:", error.message);
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
if (passed && !process.exitCode)
  console.log(
    "PASS: approval/rejection HTTP contracts, validation and conflicts, queue filters/counts, active/timestamp updates, suspension/resumption, backend REST/GraphQL access checks, retained history/new cycles, audit and notifications. All fixtures rolled back.",
  );
