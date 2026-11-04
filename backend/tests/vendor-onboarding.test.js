import * as basicProfile from "../src/modules/vendors/profile.service.js";
import { createCommunicationRouter } from "../src/modules/messaging/communication.routes.js";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { eligible } from "../src/modules/auth/token.service.js";
import { requireApprovedVendor } from "../src/middleware/auth.middleware.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import {
  draftInput,
  validateSubmission,
  canEdit,
  saveProfile,
  profile,
  document,
  upload,
} from "../src/modules/vendors/onboarding.service.js";
import { decideVendor } from "../src/modules/admin/vendor-verification.service.js";
import { login, register } from "../src/modules/auth/auth.service.js";
import {
  User,
  Vendor,
  Role,
  UserRole,
  Limit,
  Audit,
  Session,
} from "../src/models/index.js";
import { hashPassword } from "../src/modules/auth/password.service.js";

const requiredDocs = ["PAN", "Identity Proof", "Address Proof"].map(type => ({ type, status: "Pending" }));
const id = "734b9588-c47c-40eb-8c17-1797d65a2800";
const owner = "734b9588-c47c-40eb-8c17-1797d65a2801";
const version = "2026-10-28T10:00:00.000Z";
const user = {
  id: owner,
  active: true,
  blocked: false,
  emailVerified: true,
  roles: [{ code: "VENDOR", active: true }],
  vendor: { id, verificationStatus: "Pending", active: false },
};
const ctx = { req: { ip: "127.0.0.1" }, auth: { user } };
const row = {
  VendorId: id,
  UserId: owner,
  VerificationStatus: "Pending",
  ProfileDraftJson: "{}",
  VerificationCycle: 1,
  UpdatedAt: version,
};
const fields = {
  businessName: "Wedding Studio",
  businessDescription: "Photography for wedding celebrations",
  businessEmail: "studio@example.com",
  businessPhone: "+919876543210",
  gst: "",
  pan: "",
  categories: ["Photography & Videography"],
  location: {
    address: "1 Main Road",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    postalCode: "411001",
    latitude: null,
    longitude: null,
  },
  expectedUpdatedAt: version,
};
function setup(
  t,
  record = row,
  docs = requiredDocs,
) {
  const tx = {};
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (
      sql.startsWith("SELECT * FROM dbo.Vendors") ||
      sql.startsWith("SELECT * FROM dbo.[Vendors]")
    )
      return [record];
    if (sql.startsWith("SELECT VendorDocumentId AS id")) return docs;
    if (sql.startsWith("SELECT CategoryId AS id")) return [{ id: 1 }];
    return [];
  });
  return { query, tx };
}
const writes = (q) =>
  q.mock.calls.filter((c) => /^(UPDATE|DELETE|INSERT)/.test(c.arguments[0]));

test("vendors, buyers and admins must verify email before authentication", () => {
  for (const code of ["VENDOR", "CUSTOMER", "ADMIN"]) {
    assert.equal(eligible({ ...user, emailVerified: false, roles: [{ code, active: true }] }), false);
  }
  assert.equal(eligible(user), true);
  assert.equal(eligible({ ...user, blocked: true }), false);
  assert.equal(eligible({ ...user, active: false }), false);
  assert.throws(() => requireApprovedVendor(ctx), /approval required/);
});

test("basic account registration creates an inactive draft vendor without business details or documents", async (t) => {
  const tx = {};
  t.mock.method(sequelize, "transaction", async (opts, fn) => (fn || opts)(tx));
  t.mock.method(sequelize, "query", async () => []);
  t.mock.method(Limit, "findByPk", async () => ({
    count: 0,
    expiresAt: new Date(Date.now() + 60000),
    save: async () => {},
  }));
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "create", async (values) => ({ ...values, id: owner }));
  t.mock.method(Role, "findOne", async () => ({ id: 2 }));
  t.mock.method(UserRole, "create", async () => ({}));
  const created = t.mock.method(Vendor, "create", async () => ({}));
  t.mock.method(Audit, "create", async () => ({}));
  // Fail before SMTP or OTP storage to exercise the account-created delivery-delay path.
  t.mock.method(User, "findByPk", async () => {
    throw new Error("Email delivery unavailable");
  });
  const result = await register(
    {
      firstName: "Test",
      lastName: "Vendor",
      email: "vendor@example.com",
      phone: "+919876543210",
      password: "TestPass123!",
      confirmPassword: "TestPass123!",
      terms: true,
      privacy: true,
    },
    "VENDOR",
    ctx,
  );
  assert.equal(result.success, true);
  assert.match(result.message, /verification page/i);
  const data = created.mock.calls[0].arguments[0];
  assert.equal(data.userId, owner);
  assert.equal(data.active, false);
  assert.equal(data.profileDraftJson, "{}");
});

test("password login allows verified vendors with incomplete profiles and rejects unverified vendors and buyers", async (t) => {
  const passwordHash = await hashPassword("TestPass123!");
  const loaded = { ...user, passwordHash };
  const tx = { afterCommit: () => {} };
  t.mock.method(sequelize, "transaction", async (opts, fn) => (fn || opts)(tx));
  t.mock.method(Limit, "findByPk", async () => ({
    count: 0,
    expiresAt: new Date(Date.now() + 60000),
    save: async () => {},
  }));
  t.mock.method(User, "findOne", async () => loaded);
  t.mock.method(User, "findByPk", async () => loaded);
  t.mock.method(Audit, "create", async () => ({}));
  const session = t.mock.method(Session, "create", async () => ({}));
  const result = await login(
    { identifier: "vendor@example.com", password: "TestPass123!" },
    ctx,
  );
  assert.equal(result.user.role, "Vendor");
  assert.equal(session.mock.callCount(), 1);
  loaded.emailVerified = false;
  for (const code of ["VENDOR", "CUSTOMER"]) {
    loaded.roles = [{ code, active: true }];
    await assert.rejects(
      () => login({ identifier: "vendor@example.com", password: "TestPass123!" }, ctx),
      /Verify your email/,
    );
  }
  assert.equal(session.mock.callCount(), 1);
});

test("draft input saves incomplete fields but rejects owner, status and oversized field overrides", () => {
  assert.doesNotThrow(() =>
    draftInput.parse({ location: {}, expectedUpdatedAt: version }),
  );
  for (const extra of [
    { vendorId: id },
    { VerificationStatus: "Approved" },
    { businessName: "x".repeat(201) },
  ])
    assert.throws(() => draftInput.parse({ ...fields, ...extra }));
  assert.throws(() =>
    validateSubmission({ ...fields, businessDescription: "" }, [
      { status: "Pending" },
    ]),
  );
  assert.throws(() => validateSubmission(fields, []), /document/);
  assert.throws(
    () => validateSubmission(fields, [{ status: "Rejected" }]),
    /document/,
  );
  assert.throws(
    () =>
      validateSubmission(fields, [
        { status: "Approved" },
        { status: "Rejected" },
      ]),
    /rejected documents/,
  );
  assert.doesNotThrow(() =>
    validateSubmission(fields, requiredDocs),
  );
});

test("draft saves are durable and do not change verification status or activate a vendor", async (t) => {
  const { query } = setup(t);
  await saveProfile({ location: {}, expectedUpdatedAt: version }, ctx);
  const calls = writes(query);
  assert.equal(calls.length, 1);
  assert.match(calls[0].arguments[0], /ProfileDraftJson/);
  assert.doesNotMatch(calls[0].arguments[0], /VerificationStatus|IsActive/);
  const draft = Object.values(calls[0].arguments[1].replacements).find(
    (v) => typeof v === "string" && v.startsWith('{"businessName"'),
  );
  assert.equal(JSON.parse(draft).businessName, "");
});

test("profile reads load saved draft fields and permanently associated documents", async (t) => {
  setup(t, { ...row, ProfileDraftJson: JSON.stringify(fields) });
  const result = await profile(ctx);
  assert.equal(result.fields.businessName, fields.businessName);
  assert.equal(result.documents.length, 3);
  assert.equal(result.incomplete, true);
  assert.equal(result.editable, true);
});

test("submission persists business, categories and location and enters Pending approval", async (t) => {
  const { query, tx } = setup(t);
  const result = await saveProfile(fields, ctx, true);
  assert.match(result.message, /Pending Approval/);
  const update = query.mock.calls.find((c) =>
    c.arguments[0].startsWith("UPDATE dbo.[Vendors]"),
  );
  assert.match(update.arguments[0], /ProfileDraftJson/);
  assert.ok(
    Object.values(update.arguments[1].replacements).includes("Pending"),
  );
  assert.ok(Object.values(update.arguments[1].replacements).includes(null));
  assert.ok(
    writes(query).some((c) =>
      c.arguments[0].includes("INSERT INTO dbo.[VendorLocations]"),
    ),
  );
  assert.ok(
    writes(query).some((c) =>
      c.arguments[0].includes("INSERT INTO dbo.[VendorCategories]"),
    ),
  );
  for (const call of writes(query))
    assert.equal(call.arguments[1].transaction, tx);
});

test("rejected profiles can be corrected and resubmitted into a new verification cycle", async (t) => {
  const { query } = setup(t, {
    ...row,
    VerificationStatus: "Rejected",
    ProfileDraftJson: null,
    VerificationCycle: 3,
  });
  await saveProfile(fields, ctx, true);
  const update = query.mock.calls.find((c) =>
    c.arguments[0].startsWith("UPDATE dbo.[Vendors]"),
  );
  assert.ok(Object.values(update.arguments[1].replacements).includes(4));
});

test("stale writes, missing documents and review/approved/suspended edits fail before mutation", async (t) => {
  const { query } = setup(t);
  await assert.rejects(
    () =>
      saveProfile(
        { ...fields, expectedUpdatedAt: "2026-10-27T00:00:00.000Z" },
        ctx,
      ),
    /record changed/,
  );
  assert.equal(writes(query).length, 0);
  assert.equal(canEdit({ ...row, ProfileDraftJson: null }), false);
  for (const VerificationStatus of ["UnderReview", "Approved", "Suspended"])
    assert.equal(canEdit({ ...row, VerificationStatus }), false);
});

test("documents are scoped to the signed-in vendor before downloading or removing", async (t) => {
  const { query } = setup(t);
  await assert.rejects(() => document(id, ctx, true), /Document not found/);
  const scoped = query.mock.calls.find((c) =>
    c.arguments[0].includes("VendorDocumentId=:id AND VendorId=:vendorId"),
  );
  assert.equal(scoped.arguments[1].replacements.vendorId, id);
  assert.equal(writes(query).length, 0);
});

test("document uploads persist authenticated storage keys and vendor ownership without expiring draft tokens", async (t) => {
  const { query } = setup(t, row, []);
  const values = {
    CLOUDINARY_CLOUD_NAME: "test",
    CLOUDINARY_API_KEY: "key",
    CLOUDINARY_API_SECRET: "secret",
  };
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  t.mock.method(globalThis, "fetch", async (url, options) => ({
    ok: true,
    json: async () => ({
      public_id: options.body.get("public_id"),
      secure_url: "https://res.cloudinary.com/test/raw/upload/document.pdf",
    }),
  }));
  const result = await upload(
    {
      type: "Identity Proof",
      number: "TEST-123",
      base64: Buffer.from("%PDF-1.7\nexample").toString("base64"),
    },
    ctx,
  );
  assert.match(result.message, /saved securely/);
  const insert = query.mock.calls.find((c) =>
    c.arguments[0].startsWith("INSERT INTO dbo.[VendorDocuments]"),
  );
  const persisted = Object.values(insert.arguments[1].replacements);
  assert.ok(persisted.includes(id));
  assert.ok(persisted.includes("Pending"));
  assert.ok(
    persisted.some(
      (value) =>
        typeof value === "string" &&
        value.startsWith("cloudinary:raw:authenticated:"),
    ),
  );
});

test("admins cannot review or approve an unsubmitted vendor draft", async (t) => {
  const { query } = setup(t);
  const admin = {
    ...ctx,
    auth: {
      user: {
        ...user,
        emailVerified: true,
        roles: [{ code: "ADMIN", active: true }],
      },
    },
  };
  await assert.rejects(
    () => decideVendor(id, "Approved", {}, admin),
    /not submitted/,
  );
  assert.equal(writes(query).length, 0);
});

test("unapproved vendors can read onboarding via REST while business activities remain forbidden", async (t) => {
  const { query } = setup(t);
  const app = express();
  app.use(
    "/api/vendor",
    createVendorRouter({ authenticateRequest: async () => ctx.auth }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/vendor`;
  assert.equal((await fetch(`${base}/onboarding`)).status, 200);
  for (const path of [
    "/services",
    "/packages",
    "/bookings/statistics",
    "/workspace",
    "/business",
  ])
    assert.equal((await fetch(`${base}${path}`)).status, 403);
  const before = query.mock.callCount();
  assert.equal(
    (
      await fetch(`${base}/onboarding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      })
    ).status,
    403,
  );
  assert.equal(query.mock.callCount(), before);
});


test("vendor basic profile updates use authenticated ownership and reject status or owner overrides", async t => {
  const { query } = setup(t);
  query.mock.mockImplementation(async sql => sql.startsWith("SELECT UpdatedAt,PhoneNumber") ? [{ UpdatedAt: version, PhoneNumber: "" }] : []);
  const body = { firstName: "Vendor", lastName: "Owner", phone: "+919876543210", expectedUpdatedAt: version };
  for (const injected of [{ vendorId: id }, { userId: id }, { verificationStatus: "Approved" }, { active: true }])
    await assert.rejects(() => basicProfile.saveProfile({ ...body, ...injected }, ctx));
  assert.equal(writes(query).length, 0);
  await basicProfile.saveProfile(body, ctx);
  const update = writes(query).find(call => call.arguments[0].startsWith("UPDATE dbo.[Users]"));
  assert.ok(update);
  assert.ok(Object.values(update.arguments[1].replacements).includes(owner));
  assert.doesNotMatch(update.arguments[0], /VerificationStatus|IsActive|IsEmailVerified/);
  assert.match(update.arguments[0], /IsPhoneVerified/);
  await assert.rejects(() => basicProfile.saveProfile({ ...body, expectedUpdatedAt: "2026-01-01T00:00:00.000Z" }, ctx), /record changed/);
  for (const code of ["ADMIN", "CUSTOMER", "EMPLOYEE"])
    await assert.rejects(() => basicProfile.profile({ auth: { user: { ...user, roles: [{ code, active: true }] } } }), /Access denied|Please sign in/);
});

test("onboarding history is scoped to the signed-in vendor and excludes private admin notes", async t => {
  const { query } = setup(t);
  await profile(ctx);
  const history = query.mock.calls.find(call => call.arguments[0].includes("FROM dbo.VendorVerificationHistory"));
  assert.equal(history.arguments[1].replacements.id, id);
  assert.match(history.arguments[0], /WHERE VendorId=:id/);
  assert.doesNotMatch(history.arguments[0], /Notes|AdminId/);
});

test("profile REST access remains available while workspace and communication APIs reject unapproved vendors", async t => {
  const { query } = setup(t);
  query.mock.mockImplementation(async sql => {
    if (sql.startsWith("SELECT FirstName AS")) return [{ firstName: "Vendor", updatedAt: version }];
    if (sql.includes("v.ServiceAccessStatus AS serviceStatus")) return [{ id, serviceStatus: "Approved", bookingStatus: "Approved" }];
    return [];
  });
  const current = { ...user, vendor: { ...user.vendor } };
  const app = express();
  const authenticateRequest = async () => ({ user: current });
  app.use("/api/vendor", createVendorRouter({ authenticateRequest }));
  app.use("/api/communication", createCommunicationRouter({ authenticateRequest }));
  app.use((error, req, res, next) => res.status(error.extensions?.code === "FORBIDDEN" ? 403 : error.status || 500).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const verificationStatus of ["Pending", "UnderReview", "Rejected", "Suspended"]) {
    current.vendor.verificationStatus = verificationStatus;
    assert.equal((await fetch(`${base}/api/vendor/profile`)).status, 200);
    for (const path of ["services", "workspace", "business", "communications/counts", "earnings"])
      assert.equal((await fetch(`${base}/api/vendor/${path}`)).status, 403);
    assert.equal((await fetch(`${base}/api/communication/notifications`, { headers: { "x-communication-role": "Vendor" } })).status, 403);
  }
  current.vendor.verificationStatus = "Approved";
  current.vendor.active = true;
  assert.equal((await fetch(`${base}/api/vendor/services/metadata`)).status, 200);
});


test("verification submission requires a valid PAN, Identity Proof and Address Proof separately", () => {
  assert.doesNotThrow(() => validateSubmission(fields, requiredDocs));
  for (const type of ["PAN", "Identity Proof", "Address Proof"]) {
    const remaining = requiredDocs.filter(doc => doc.type !== type);
    assert.throws(() => validateSubmission(fields, [...remaining, { type: "GST", status: "Approved" }]), new RegExp(type));
    assert.throws(() => validateSubmission(fields, [...remaining, { type, status: "Rejected" }]), /rejected documents/);
  }
  assert.throws(() => validateSubmission(fields, [requiredDocs[0], requiredDocs[0], requiredDocs[0]]), /Identity Proof, Address Proof/);
});
