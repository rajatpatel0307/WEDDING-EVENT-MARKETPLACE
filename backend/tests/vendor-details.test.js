import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import {
  vendorDetails,
  vendorRecords,
  setVendorActive,
  reviewVendorDocument,
  vendorDocumentFile,
  vendorAccountInput,
  documentReviewInput,
  vendorPageQuery,
  redactAudit,
} from "../src/modules/admin/vendor-details.service.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800",
  docId = "734b9588-c47c-40eb-8c17-1797d65a2802";
const vendor = {
  id,
  ownerId: "734b9588-c47c-40eb-8c17-1797d65a2803",
  active: true,
  status: "Pending",
};
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

test("vendor details, records, document viewing and mutations require an administrator", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => {
    throw Error("Database should not be called");
  });
  for (const context of [
    {},
    {
      auth: {
        user: { ...ctx.auth.user, roles: [{ code: "VENDOR", active: true }] },
      },
    },
  ]) {
    for (const call of [
      () => vendorDetails(id, context),
      () => vendorRecords(id, "messages", {}, context),
      () => setVendorActive(id, {}, context),
      () => reviewVendorDocument(id, docId, {}, context),
      () => vendorDocumentFile(id, docId, context),
    ])
      await assert.rejects(call);
  }
  assert.equal(query.mock.callCount(), 0);
});
test("vendor identities, sections and pagination cannot select arbitrary data", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  for (const section of [
    "constructor",
    "__proto__",
    "AuthSessions",
    "Services;DROP TABLE Users",
  ])
    await assert.rejects(() => vendorRecords(id, section, {}, ctx), {
      status: 404,
    });
  await assert.rejects(() => vendorDetails("not-an-id", ctx));
  assert.throws(() => vendorPageQuery.parse({ pageSize: 1000 }));
  assert.equal(query.mock.callCount(), 0);
  await assert.rejects(() => vendorDetails(id, ctx), { status: 404 });
});
test("every vendor collection binds its owner and vendor IDs with bounded pagination", async (t) => {
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("AS businessName")
      ? [vendor]
      : sql.includes("COUNT_BIG")
        ? [{ total: 42 }]
        : [{ id: "record" }],
  );
  for (const section of [
    "documents",
    "services",
    "packages",
    "locations",
    "availability",
    "bookings",
    "quotations",
    "customers",
    "revenue",
    "payouts",
    "reviews",
    "offers",
    "messages",
    "audit",
  ]) {
    const result = await vendorRecords(
      id,
      section,
      { page: 2, pageSize: 20 },
      ctx,
    );
    assert.equal(result.total, 42);
    const [sql, options] = query.mock.calls.at(-1).arguments;
    assert.match(sql, /:id/);
    assert.ok(!sql.includes(id));
    assert.equal(options.replacements.id, id);
    assert.equal(options.replacements.ownerId, vendor.ownerId);
    assert.equal(options.replacements.offset, 20);
    assert.equal(options.replacements.size, 20);
  }
});
test("deactivation preserves verification, revokes sessions and atomically audits and notifies", async (t) => {
  const tx = {};
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("AS businessName") ? [vendor] : [],
  );
  await setVendorActive(
    id,
    { active: false, expectedActive: true, note: "Compliance review" },
    ctx,
  );
  const update = query.mock.calls.find((call) =>
    call.arguments[0].startsWith("UPDATE dbo.[Vendors]"),
  );
  assert.match(update.arguments[0], /IsActive/);
  assert.ok(!update.arguments[0].includes("VerificationStatus"));
  const revoke = query.mock.calls.find((call) =>
    call.arguments[0].startsWith("UPDATE dbo.AuthSessions"),
  );
  assert.equal(revoke.arguments[1].replacements.ownerId, vendor.ownerId);
  assert.ok(
    query.mock.calls.some((call) =>
      call.arguments[0].startsWith("INSERT INTO dbo.Notifications"),
    ),
  );
  const audit = query.mock.calls.find((call) =>
    call.arguments[0].startsWith("INSERT INTO dbo.AuditLogs"),
  );
  assert.equal(
    JSON.parse(audit.arguments[1].replacements.next).note,
    "Compliance review",
  );
  assert.ok(
    query.mock.calls.every((call) => call.arguments[1].transaction === tx),
  );
});
test("stale vendor and document decisions cannot overwrite newer review state", async (t) => {
  t.mock.method(sequelize, "transaction", async (fn) => fn({}));
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("AS businessName")
      ? [vendor]
      : [{ id: docId, status: "Approved" }],
  );
  await assert.rejects(
    () =>
      setVendorActive(
        id,
        { active: true, expectedActive: false, note: "Outdated state" },
        ctx,
      ),
    { status: 409 },
  );
  await assert.rejects(
    () =>
      reviewVendorDocument(
        id,
        docId,
        { status: "Rejected", expectedStatus: "Pending", reason: "Unreadable" },
        ctx,
      ),
    { status: 409 },
  );
  assert.ok(
    !query.mock.calls.some((call) => call.arguments[0].startsWith("UPDATE")),
  );
  assert.throws(() =>
    documentReviewInput.parse({
      status: "Rejected",
      expectedStatus: "Pending",
      reason: " ",
    }),
  );
  assert.throws(() =>
    vendorAccountInput.parse({
      active: false,
      expectedActive: true,
      note: "Ok",
    }),
  );
});
test("document decisions and downloads are scoped to the requested vendor", async (t) => {
  t.mock.method(sequelize, "transaction", async (fn) => fn({}));
  const query = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(
    () =>
      reviewVendorDocument(
        id,
        docId,
        { status: "Approved", expectedStatus: "Pending" },
        ctx,
      ),
    { status: 404 },
  );
  await assert.rejects(() => vendorDocumentFile(id, docId, ctx), {
    status: 404,
  });
  for (const call of query.mock.calls) {
    assert.match(
      call.arguments[0],
      /VendorId=:id AND VendorDocumentId=:documentId/,
    );
    assert.equal(call.arguments[1].replacements.documentId, docId);
    assert.equal(call.arguments[1].replacements.id, id);
  }
});
test("document review saves verifier, date, rejection reason and audit atomically", async (t) => {
  const tx = {};
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.startsWith("SELECT VendorDocumentId")
      ? [{ id: docId, status: "Pending", reason: null }]
      : [],
  );
  await reviewVendorDocument(
    id,
    docId,
    {
      status: "Rejected",
      expectedStatus: "Pending",
      reason: "Please upload a clear scan.",
    },
    ctx,
  );
  const update = query.mock.calls.find((call) =>
    call.arguments[0].startsWith("UPDATE"),
  );
  assert.match(update.arguments[0], /VerifiedBy/);
  assert.match(update.arguments[0], /VerifiedAt/);
  assert.ok(
    Object.values(update.arguments[1].replacements).includes(ctx.auth.user.id),
  );
  const audit = query.mock.calls.find((call) =>
    call.arguments[0].startsWith("INSERT INTO dbo.AuditLogs"),
  );
  assert.equal(
    JSON.parse(audit.arguments[1].replacements.next).reason,
    "Please upload a clear scan.",
  );
  assert.ok(
    query.mock.calls.every((call) => call.arguments[1].transaction === tx),
  );
});
test("audit changes preserve business fields and redact nested credentials", () => {
  const value = redactAudit(
    JSON.stringify({
      status: "Approved",
      note: "Review complete",
      nested: {
        passwordHash: "private",
        apiToken: "private",
        api_key: "private",
        documents: [{ DocumentUrl: "private", type: "PAN" }],
      },
    }),
  );
  assert.equal(value.status, "Approved");
  assert.equal(value.nested.passwordHash, "[redacted]");
  assert.equal(value.nested.apiToken, "[redacted]");
  assert.equal(value.nested.api_key, "[redacted]");
  assert.equal(value.nested.documents[0].DocumentUrl, "[redacted]");
  assert.equal(value.nested.documents[0].type, "PAN");
  assert.equal(redactAudit(null), null);
});
