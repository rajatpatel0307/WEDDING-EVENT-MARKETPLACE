// Transactional integration checks. Fixtures and every mutation are rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import {
  select,
  insert,
  update,
} from "../src/modules/admin/admin.repository.js";
import { getResource } from "../src/modules/admin/admin.resources.js";
import { reviewVendor } from "../src/modules/admin/admin.service.js";
let passed = false;
const rollback = new Error("ROLLBACK_TEST_FIXTURES");
try {
  await sequelize.transaction(async (tx) => {
    const adminId = randomUUID(),
      ownerId = randomUUID(),
      vendorId = randomUUID();
    for (const id of [adminId, ownerId])
      await sequelize.query(
        "INSERT INTO dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Integration check',:email,'test-fixture-not-a-login-hash',1)",
        {
          replacements: { id, email: `admin-check-${id}@example.invalid` },
          transaction: tx,
        },
      );
    await sequelize.query(
      "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug) VALUES(:id,:owner,'Integration check vendor',:slug)",
      {
        replacements: {
          id: vendorId,
          owner: ownerId,
          slug: `integration-${vendorId}`,
        },
        transaction: tx,
      },
    );
    const ctx = {
        auth: {
          user: {
            id: adminId,
            active: true,
            emailVerified: true,
            roles: [{ code: "ADMIN", active: true }],
          },
        },
        req: { ip: "127.0.0.1" },
      },
      run = (fn) => fn(tx);
    await reviewVendor(
      vendorId,
      {
        status: "Approved",
        expectedStatus: "Pending",
        note: "Integration verification",
      },
      ctx,
      run,
    );
    let [row] = await select(
      "SELECT VerificationStatus AS status FROM dbo.Vendors WHERE VendorId=:id",
      { id: vendorId },
      tx,
    );
    assert.equal(row.status, "Approved");
    await assert.rejects(
      () =>
        reviewVendor(
          vendorId,
          { status: "Rejected", expectedStatus: "Pending", reason: "Test" },
          ctx,
          run,
        ),
      { status: 409 },
    );
    await assert.rejects(() =>
      reviewVendor(
        vendorId,
        { status: "Rejected", expectedStatus: "Approved", reason: "" },
        ctx,
        run,
      ),
    );
    await reviewVendor(
      vendorId,
      {
        status: "Suspended",
        expectedStatus: "Approved",
        reason: "Verification check",
        note: "Internal test note",
      },
      ctx,
      run,
    );
    [row] = await select(
      "SELECT COUNT(*) AS total FROM dbo.Notifications WHERE UserId=:id",
      { id: ownerId },
      tx,
    );
    assert.equal(row.total, 2);
    [row] = await select(
      "SELECT COUNT(*) AS total FROM dbo.AuditLogs WHERE EntityId=:id AND ActionType LIKE 'ADMIN_VENDOR_%'",
      { id: vendorId },
      tx,
    );
    assert.equal(row.total, 3);
    const r = getResource("categories");
    const [category] = await insert(
      r,
      {
        CategoryCode: `CHECK_${randomUUID().slice(0, 8)}`,
        CategoryName: `Integration ${randomUUID()}`,
      },
      tx,
    );
    assert.ok(category.id);
    await update(r, category.id, { IsActive: 0 }, tx);
    passed = true;
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    console.error("FAIL mutation verification:", error.message);
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
if (passed && !process.exitCode)
  console.log(
    "PASS vendor approval/suspension, reason validation, stale status rejection, audit and notifications, category insert/update. All fixtures rolled back.",
  );
