import test from "node:test";
import assert from "node:assert/strict";
import {
  listQuery,
  reviewInput,
  recordInput,
  dateBounds,
} from "../src/modules/admin/admin.validation.js";
import { getResource } from "../src/modules/admin/admin.resources.js";
import { requireRole } from "../src/middleware/auth.middleware.js";
test("admin role checks deny missing, non-admin, inactive and blocked users", () => {
  for (const user of [
    null,
    {
      active: true,
      emailVerified: true,
      roles: [{ code: "CUSTOMER", active: true }],
    },
    {
      active: true,
      blocked: true,
      emailVerified: true,
      roles: [{ code: "ADMIN", active: true }],
    },
    {
      active: true,
      emailVerified: true,
      roles: [{ code: "ADMIN", active: false }],
    },
  ])
    assert.throws(() => requireRole({ auth: { user } }, "ADMIN"));
  const user = {
    active: true,
    emailVerified: true,
    roles: [{ code: "ADMIN", active: true }],
  };
  assert.equal(requireRole({ auth: { user } }, "ADMIN"), user);
});
test("resource identifiers cannot select arbitrary tables or prototype properties", () => {
  for (const key of [
    "Users; DROP TABLE Users",
    "__proto__",
    "constructor",
    "AuthSessions",
  ])
    assert.throws(() => getResource(key));
  assert.equal(getResource("customers").fields.passwordHash, undefined);
  assert.equal(getResource("documents").fields.key, undefined);
});
test("pagination and date filters are bounded", () => {
  for (const input of [
    { pageSize: 10001 },
    { page: -1 },
    { from: "2026-10-27", to: "2026-01-01" },
    { direction: "desc; drop table Users" },
  ])
    assert.equal(listQuery.safeParse(input).success, false);
});
test("rejection requires a reason and an expected status for concurrency control", () => {
  assert.equal(
    reviewInput.safeParse({
      status: "Rejected",
      expectedStatus: "Pending",
      reason: "  ",
    }).success,
    false,
  );
  assert.equal(reviewInput.safeParse({ status: "Approved" }).success, false);
  assert.equal(
    reviewInput.safeParse({
      status: "Rejected",
      expectedStatus: "Pending",
      reason: "Documents missing",
    }).success,
    true,
  );
});
test("discount validation rejects invalid percentages and inverted validity dates", () => {
  assert.equal(
    recordInput.safeParse({
      name: "Offer",
      discountType: "Percentage",
      discountValue: 101,
    }).success,
    false,
  );
  assert.equal(
    recordInput.safeParse({
      name: "Offer",
      startDate: "2026-10-27",
      endDate: "2026-10-01",
    }).success,
    false,
  );
  assert.equal(
    recordInput.safeParse({ name: "Offer", PasswordHash: "secret" }).success,
    false,
  );
});
test("date bounds include the entire requested Indian calendar day", () => {
  const result = dateBounds("2026-10-27", "2026-10-27");
  assert.equal(result.from.toISOString(), "2026-10-26T18:30:00.000Z");
  assert.equal(result.to.toISOString(), "2026-10-27T18:30:00.000Z");
});
