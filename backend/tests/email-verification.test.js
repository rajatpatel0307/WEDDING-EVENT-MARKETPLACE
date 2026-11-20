import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { Audit, Limit, Otp, Session, User } from "../src/models/index.js";
import { verifyEmailOtp } from "../src/modules/auth/auth.service.js";
import { digest } from "../src/modules/auth/security.service.js";
import { authenticate, cookieNames } from "../src/modules/auth/token.service.js";

const input = { email: "registered@example.test", code: "123456" };

function setup(t, role = "CUSTOMER", overrides = {}, otpOverrides = {}) {
  process.env.OTP_SECRET = "email-verification-test-secret-with-32-characters";
  process.env.JWT_SECRET = "email-verification-test-jwt-secret-with-32-characters";
  const cookies = {};
  const ctx = {
    req: { ip: "127.0.0.1" },
    res: {
      cookie: t.mock.fn((name, value) => { cookies[name] = value; }),
      clearCookie: t.mock.fn(),
    },
  };
  const user = {
    id: "734b9588-c47c-40eb-8c17-1797d65a2801",
    email: input.email,
    active: true,
    blocked: false,
    emailVerified: false,
    roles: [{ code: role, active: true }],
    ...(role === "VENDOR" ? { vendor: { id: "vendor-id", active: false, verificationStatus: "Pending" } } : {}),
    ...overrides,
  };
  const update = t.mock.fn(async (values) => Object.assign(user, values));
  user.update = update;
  const otpId = digest(`${user.id}:email`);
  const otp = {
    id: otpId,
    digest: createHmac("sha256", process.env.OTP_SECRET).update(`${otpId}:${input.code}`).digest("hex"),
    consumedAt: null,
    expiresAt: new Date(Date.now() + 600000),
    attempts: 0,
    save: async () => {},
    ...otpOverrides,
  };
  t.mock.method(sequelize, "transaction", async (...args) => {
    const callbacks = [];
    const result = await args.at(-1)({ afterCommit: (fn) => callbacks.push(fn) });
    for (const callback of callbacks) await callback();
    return result;
  });
  t.mock.method(Limit, "findByPk", async () => ({
    count: 0, expiresAt: new Date(Date.now() + 600000), save: async () => {},
  }));
  t.mock.method(User, "findOne", async () => user);
  t.mock.method(User, "findByPk", async () => user);
  t.mock.method(Otp, "findByPk", async () => otp);
  const session = t.mock.method(Session, "create", async (values) => values);
  const audit = t.mock.method(Audit, "create", async () => ({}));
  return { ctx, cookies, user, otp, update, session, audit };
}

for (const [role, expectedRole] of [["CUSTOMER", "Customer"], ["VENDOR", "Vendor"], ["ADMIN", "Admin"]]) {
  test(`valid email OTP signs in ${expectedRole} and supports authenticated requests`, async (t) => {
    const { ctx, cookies, user, otp, session, audit } = setup(t, role);
    const result = await verifyEmailOtp(input, ctx);
    assert.equal(result.success, true);
    assert.equal(result.user.role, expectedRole);
    assert.equal(result.user.accountStatus, "Active");
    assert.equal(user.emailVerified, true);
    assert.ok(otp.consumedAt instanceof Date);
    assert.equal(session.mock.callCount(), 1);
    assert.equal(audit.mock.calls[0].arguments[0].action, "EMAIL_VERIFIED");
    assert.ok(cookies[cookieNames.access]);
    assert.ok(cookies[cookieNames.refresh]);
    const savedSession = session.mock.calls[0].arguments[0];
    assert.equal(savedSession.userId, user.id);
    const refreshSecret = cookies[cookieNames.refresh].split(".")[1];
    assert.equal(savedSession.digest, digest(refreshSecret));
    t.mock.method(Session, "findByPk", async () => savedSession);
    const auth = await authenticate({ cookies });
    assert.equal(auth.user.id, user.id);
    if (role === "VENDOR") {
      assert.equal(result.user.vendor.verificationStatus, "Pending");
      assert.equal(result.user.vendor.active, false);
    }
    await assert.rejects(verifyEmailOtp(input, ctx), /Invalid or expired code/);
    assert.equal(session.mock.callCount(), 1);
  });
}

for (const [name, overrides] of [
  ["inactive account", { active: false }],
  ["blocked account", { blocked: true }],
  ["inactive role", { roles: [{ code: "CUSTOMER", active: false }] }],
]) {
  test(`email OTP cannot sign in an ${name}`, async (t) => {
    const { ctx, session } = setup(t, "CUSTOMER", overrides);
    await assert.rejects(verifyEmailOtp(input, ctx), (error) => error.extensions.code === "FORBIDDEN");
    assert.equal(session.mock.callCount(), 0);
    assert.equal(ctx.res.cookie.mock.callCount(), 0);
  });
}

for (const [name, otpOverrides, code] of [
  ["incorrect", {}, "654321"],
  ["malformed", {}, "123"],
  ["expired", { expiresAt: new Date(0) }, input.code],
  ["consumed", { consumedAt: new Date() }, input.code],
  ["exhausted", { attempts: 5 }, input.code],
]) {
  test(`${name} OTP cannot verify email or create a session`, async (t) => {
    const { ctx, session, update, user } = setup(t, "CUSTOMER", {}, otpOverrides);
    await assert.rejects(verifyEmailOtp({ ...input, code }, ctx));
    assert.equal(user.emailVerified, false);
    assert.equal(update.mock.callCount(), 0);
    assert.equal(session.mock.callCount(), 0);
    assert.equal(ctx.res.cookie.mock.callCount(), 0);
  });
}
