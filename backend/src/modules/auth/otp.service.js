import { randomInt, createHmac } from "node:crypto";
import { TableHints } from "sequelize";
import nodemailer from "nodemailer";
import { sequelize } from "../../config/database.js";
import { Otp, User } from "../../models/index.js";
import { digest, fail, limit } from "./security.service.js";
import { required, production } from "../../config/environment.js";
const hash = (id, code) =>
  createHmac("sha256", required("OTP_SECRET"))
    .update(`${id}:${code}`)
    .digest("hex");
export async function sendOtp(user, purpose) {
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: required("SMTP_HOST"),
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    requireTLS: production,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: required("SMTP_PASSWORD") }
      : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: { rejectUnauthorized: true },
  });
  const from = required("SMTP_FROM");
  const id = digest(`${user.id}:${purpose}`),
    code = String(randomInt(100000, 1000000));
  await sequelize.transaction(async (transaction) => {
    await User.findByPk(user.id, {
      transaction,
      tableHint: TableHints.UPDLOCK,
    });
    const old = await Otp.findByPk(id, {
      transaction,
      tableHint: TableHints.UPDLOCK,
    });
    if (old && Date.now() - old.sentAt.getTime() < 60000)
      fail("Please wait 60 seconds before requesting another code.");
    const values = {
      userId: user.id,
      purpose,
      digest: hash(id, code),
      expiresAt: new Date(Date.now() + 600000),
      sentAt: new Date(),
      attempts: 0,
      consumedAt: null,
    };
    if (old) await old.update(values, { transaction });
    else await Otp.create({ id, ...values }, { transaction });
  });
  try {
    const result = await transport.sendMail({
      from,
      to: user.email,
      subject: "Your MarryNest verification code",
      text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this code, ignore this email.`,
    });
    if (!result.accepted?.length) {
      const error = new Error("SMTP did not accept the recipient.");
      error.code = "ERECIPIENT";
      throw error;
    }
  } catch (error) {
    const quotaExceeded = /\b5\.4\.5\b|daily .*sending limit exceeded|sending quota exceeded/i.test(
      error.response || "",
    );
    // Log diagnostics without exposing credentials, recipients or OTPs.
    console.error("OTP email delivery failed:", {
      code: error.code || "SMTP_ERROR",
      command: error.command,
      responseCode: error.responseCode,
    });
    // A failed delivery must not leave an unusable code or a resend cooldown.
    // Match the digest so a concurrent, newer request cannot be deleted.
    await Otp.destroy({ where: { id, digest: hash(id, code) } });
    if (quotaExceeded)
      fail(
        "Verification emails are temporarily unavailable because our email provider's sending limit has been reached. Please try again later.",
        "EMAIL_QUOTA_EXCEEDED",
      );
    fail(
      "Email delivery is unavailable. Please try sending the code again shortly.",
      "EMAIL_DELIVERY_FAILED",
    );
  }
}
export async function consumeOtp(user, purpose, code, onSuccess) {
  if (!/^\d{6}$/.test(code)) fail("Enter the six-digit code.");
  await limit(`verify:${user?.id || "unknown"}:${purpose}`, 15);
  if (!user) fail("Invalid or expired code.");
  const result = await sequelize.transaction(async (transaction) => {
    const row = await Otp.findByPk(digest(`${user.id}:${purpose}`), {
      transaction,
      tableHint: TableHints.UPDLOCK,
    });
    if (
      !row ||
      row.consumedAt ||
      row.expiresAt <= new Date() ||
      row.attempts >= 5
    )
      return false;
    row.attempts++;
    const valid = row.digest === hash(row.id, code);
    if (valid) row.consumedAt = new Date();
    await row.save({ transaction });
    if (valid) await onSuccess(transaction);
    return valid;
  });
  if (!result) fail("Invalid or expired code. Request a new code if needed.");
}
