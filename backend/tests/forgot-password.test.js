import { test } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { Op } from "sequelize";
import { sequelize } from "../src/config/database.js";
import { Audit, Limit, Otp, User } from "../src/models/index.js";
import { forgotPassword } from "../src/modules/auth/auth.service.js";

const ctx = { req: { ip: "127.0.0.1" } };

function setup(t, user) {
  t.mock.method(sequelize, "transaction", async (...args) => args.at(-1)({}));
  t.mock.method(Limit, "findByPk", async () => ({
    count: 0,
    expiresAt: new Date(Date.now() + 3600000),
    save: async () => {},
  }));
  const lookup = t.mock.method(User, "findOne", async () => user);
  const audit = t.mock.method(Audit, "create", async () => ({}));
  const createOtp = t.mock.method(Otp, "create", async () => ({}));
  return { lookup, audit, createOtp };
}

for (const [identifier, message] of [
  ["missing@example.test", "Please enter a correct email address."],
  ["+919876543210", "Please enter a correct phone number."],
]) {
  test(`unknown identifier ${identifier} returns a validation error without an OTP`, async (t) => {
    const { audit, createOtp } = setup(t, null);
    await assert.rejects(forgotPassword({ identifier }, ctx), (error) => {
      assert.equal(error.message, message);
      assert.equal(error.extensions.code, "BAD_USER_INPUT");
      return true;
    });
    assert.equal(createOtp.mock.callCount(), 0);
    assert.equal(audit.mock.callCount(), 1);
  });
}

test("registered email is normalized and still receives a reset OTP", async (t) => {
  const user = {
    id: "test-user", email: "registered@example.test",
    active: true, blocked: false, emailVerified: true,
  };
  const { lookup, createOtp } = setup(t, user);
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.SMTP_FROM = "sender@example.test";
  process.env.OTP_SECRET = "test-secret-with-at-least-32-characters";
  t.mock.method(User, "findByPk", async () => user);
  t.mock.method(Otp, "findByPk", async () => null);
  const sendMail = t.mock.fn(async (mail) => {
    assert.equal(mail.to, user.email);
    return { accepted: [user.email] };
  });
  t.mock.method(nodemailer, "createTransport", () => ({ sendMail }));
  const result = await forgotPassword({ identifier: "  REGISTERED@example.test  " }, ctx);
  assert.equal(result.success, true);
  assert.equal(lookup.mock.calls[0].arguments[0].where[Op.or][0].email, user.email);
  assert.equal(createOtp.mock.callCount(), 1);
  assert.equal(sendMail.mock.callCount(), 1);
});
