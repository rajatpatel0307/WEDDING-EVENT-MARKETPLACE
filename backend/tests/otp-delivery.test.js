import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { access } from "node:fs/promises";
import nodemailer from "nodemailer";
import { sequelize } from "../src/config/database.js";
import { Otp, User } from "../src/models/index.js";
import { sendOtp } from "../src/modules/auth/otp.service.js";

function setup(t, sendMail, old = null) {
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.SMTP_FROM = "sender@example.test";
  process.env.OTP_SECRET = "test-secret-with-at-least-32-characters";
  t.mock.method(sequelize, "transaction", async (callback) => callback({}));
  t.mock.method(User, "findByPk", async () => ({}));
  t.mock.method(Otp, "findByPk", async () => old);
  const create = t.mock.method(Otp, "create", async () => ({}));
  const destroy = t.mock.method(Otp, "destroy", async () => 1);
  const log = t.mock.method(console, "error", () => {});
  t.mock.method(nodemailer, "createTransport", () => ({ sendMail }));
  return { create, destroy, log };
}

const user = { id: "test-user", email: "recipient@example.test" };

test("accepted OTP stays available for verification", async (t) => {
  let sent;
  const { create, destroy } = setup(t, async (mail) => {
    sent = mail;
    assert.equal(mail.to, user.email);
    assert.match(mail.text, /\b\d{6}\b/);
    return { accepted: [user.email] };
  });
  await sendOtp(user, "email");
  assert.equal(create.mock.callCount(), 1);
  assert.equal(destroy.mock.callCount(), 0);
  const code = sent.text.match(/\b\d{6}\b/)[0];
  assert.ok(sent.html.includes(`>${code}</p>`));
  assert.equal(sent.subject, "Your MarryNest verification code");
  assert.equal(sent.attachments[0].cid, "marrynest-logo");
  await access(sent.attachments[0].path);
  const stored = create.mock.calls[0].arguments[0];
  assert.equal(stored.digest, createHmac("sha256", process.env.OTP_SECRET).update(`${stored.id}:${code}`).digest("hex"));
  assert.ok(Math.abs(stored.expiresAt - stored.sentAt - 600000) < 1000);
});

test("password reset OTP uses its own subject and instructions in HTML and plain text", async (t) => {
  let sent;
  const { create, destroy } = setup(t, async mail => {
    sent = mail;
    return { accepted: [user.email] };
  });
  await sendOtp({ ...user, firstName: "Riya" }, "reset");
  assert.equal(sent.subject, "Your MarryNest password reset code");
  for (const body of [sent.text, sent.html]) {
    assert.match(body, /Hi Riya,/);
    assert.match(body, /password reset screen/);
    assert.match(body, /Your password will stay the same/);
    assert.doesNotMatch(body, /confirm your email/);
  }
  assert.equal(create.mock.calls[0].arguments[0].purpose, "reset");
  assert.equal(destroy.mock.callCount(), 0);
});

test("SMTP failures remove only the failed code and expose a useful error", async (t) => {
  const { create, destroy, log } = setup(t, async () => {
    throw Object.assign(new Error("Private SMTP response"), {
      code: "EAUTH", command: "AUTH", responseCode: 535,
    });
  });
  await assert.rejects(sendOtp(user, "email"), (error) =>
    error.extensions.code === "EMAIL_DELIVERY_FAILED",
  );
  const stored = create.mock.calls[0].arguments[0];
  assert.deepEqual(destroy.mock.calls[0].arguments[0].where, {
    id: stored.id, digest: stored.digest,
  });
  assert.deepEqual(log.mock.calls[0].arguments[1], {
    code: "EAUTH", command: "AUTH", responseCode: 535,
  });
});

test("a rejected recipient is treated as a delivery failure", async (t) => {
  const { destroy } = setup(t, async () => ({ accepted: [], rejected: [user.email] }));
  await assert.rejects(sendOtp(user, "email"), (error) =>
    error.extensions.code === "EMAIL_DELIVERY_FAILED",
  );
  assert.equal(destroy.mock.callCount(), 1);
});

test("Gmail daily quota rejection reports the actual blocker and clears the failed OTP", async (t) => {
  const { destroy } = setup(t, async () => {
    throw Object.assign(new Error("Message failed"), {
      code: "EENVELOPE", command: "DATA", responseCode: 550,
      response: "550-5.4.5 Daily user sending limit exceeded.",
    });
  });
  await assert.rejects(sendOtp(user, "email"), (error) => {
    assert.equal(error.extensions.code, "EMAIL_QUOTA_EXCEEDED");
    assert.match(error.message, /sending limit has been reached/);
    return true;
  });
  assert.equal(destroy.mock.callCount(), 1);
});

test("other SMTP rejections are not incorrectly reported as quota exhaustion", async (t) => {
  setup(t, async () => {
    throw Object.assign(new Error("Message rejected"), {
      responseCode: 550, response: "550 5.1.1 Recipient does not exist",
    });
  });
  await assert.rejects(sendOtp(user, "email"), (error) =>
    error.extensions.code === "EMAIL_DELIVERY_FAILED",
  );
});

test("resend cooldown still blocks repeated successful requests", async (t) => {
  let sent = false;
  const { destroy } = setup(t, async () => { sent = true; }, { sentAt: new Date() });
  await assert.rejects(sendOtp(user, "email"), /wait 60 seconds/);
  assert.equal(sent, false);
  assert.equal(destroy.mock.callCount(), 0);
});
