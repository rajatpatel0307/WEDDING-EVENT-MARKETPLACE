import nodemailer from "nodemailer";
import { required, production } from "../../config/environment.js";
export const mailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
export function createMailTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
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
}
export async function sendTransactionalMail({ to, subject, text }) {
  const result = await createMailTransport().sendMail({
    from: required("SMTP_FROM"),
    to,
    subject,
    text,
  });
  if (!result.accepted?.length)
    throw new Error("The recipient was not accepted.");
  return result;
}
