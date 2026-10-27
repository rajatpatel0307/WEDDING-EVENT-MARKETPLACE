import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { Op, TableHints } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  User,
  Role,
  UserRole,
  Vendor,
  VendorCategory,
  VendorLocation,
  VendorDocument,
  Category,
  Session,
  ResetGrant,
} from "../../models/index.js";
import {
  account,
  business,
  email,
  phone,
  password,
} from "./auth.validation.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import { sendOtp, consumeOtp } from "./otp.service.js";
import { digest, fail, limit, audit } from "./security.service.js";
import {
  issueSession,
  loadUser,
  eligible,
  rotateSession,
  clearCookies,
  cookieNames,
} from "./token.service.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { profilePhotoUrl } from "../media/profile.service.js";
import { documentKey } from "../vendors/documents.service.js";
const generic =
  "If an account exists with these details, a verification code has been sent.";
const response = (message, user = null, extra = {}) => ({
  success: true,
  message,
  user,
  ...extra,
});
export function publicUser(user) {
  if (!user) return null;
  const roles = user.roles.filter((r) => r.active).map((r) => r.code);
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    profilePhotoUrl: user.profilePhotoUrl,
    role: roles.includes("ADMIN")
      ? "Admin"
      : roles.includes("VENDOR")
        ? "Vendor"
        : "Customer",
    accountStatus: !user.active
      ? "Inactive"
      : user.blocked
        ? "Blocked"
        : !user.emailVerified
          ? "Unverified"
          : "Active",
    vendor: user.vendor,
  };
}
export async function register(input, role, ctx) {
  if (!["CUSTOMER", "VENDOR"].includes(role))
    fail(
      "Public registration supports customers and vendors only.",
      "FORBIDDEN",
    );
  await limit(`signup:${ctx.req.ip}`, 5, 3600);
  const data = account.parse(input);
  const vendor = role === "VENDOR" ? business.parse(input) : null;
  const passwordHash = await hashPassword(data.password);
  const user = await sequelize.transaction(async (transaction) => {
    if (
      await User.findOne({
        where: { [Op.or]: [{ email: data.email }, { phone: data.phone }] },
        transaction,
      })
    )
      fail(
        "An account already uses these details. Please sign in or reset your password.",
      );
    const dbRole = await Role.findOne({
      where: { code: role, active: true },
      transaction,
    });
    if (!dbRole) throw Error("Required role missing");
    const now = new Date();
    const user = await User.create(
      {
        ...data,
        profilePhotoUrl: data.profilePhotoToken
          ? profilePhotoUrl(data.profilePhotoToken, data.email)
          : null,
        passwordHash,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      },
      { transaction },
    );
    await UserRole.create(
      { userId: user.id, roleId: dbRole.id },
      { transaction },
    );
    if (vendor) {
      const v = await Vendor.create(
        {
          ...vendor,
          active: false,
          userId: user.id,
          slug: `${vendor.businessName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 100)}-${randomUUID()}`,
        },
        { transaction },
      );
      const names = [...new Set(vendor.categories)];
      const selected = await Category.findAll({
        where: { name: names, active: true },
        transaction,
      });
      if (selected.length !== names.length)
        fail("A selected service category is unavailable.");
      await VendorCategory.bulkCreate(
        selected.map((c, i) => ({
          vendorId: v.id,
          categoryId: c.id,
          primary: i === 0,
        })),
        { transaction },
      );
      await VendorLocation.create(
        { ...vendor.location, vendorId: v.id },
        { transaction },
      );
      await VendorDocument.bulkCreate(
        vendor.documents.map((d) => ({
          vendorId: v.id,
          type: d.type,
          key: documentKey(d.uploadToken, data.email),
        })),
        { transaction },
      );
    }
    await audit("SIGNUP", ctx, user.id, null, transaction);
    return user;
  });
  try {
    await sendOtp(user, "email");
  } catch (error) {
    await audit("EMAIL_DELIVERY_FAILED", ctx, user.id);
    if (error.extensions?.code === "EMAIL_QUOTA_EXCEEDED")
      return response(`Account created. ${error.message}`);
    return response(
      "Account created. Email delivery is delayed; use Resend code on the verification page.",
    );
  }
  return response("Account created. Check your email for a verification code.");
}
export async function login(input, ctx) {
  z.object({
    identifier: z.string().min(3).max(320),
    password: z
      .string()
      .min(1)
      .max(72)
      .refine((v) => Buffer.byteLength(v, "utf8") <= 72),
  }).parse(input);
  const identifier = String(input.identifier).trim().toLowerCase();
  await limit(`login-ip:${ctx.req.ip}`, 30);
  await limit(`login:${identifier}`, 10);
  return sequelize.transaction(async (transaction) => {
    const user = await User.findOne({
      where: { [Op.or]: [{ email: identifier }, { phone: identifier }] },
      transaction,
      tableHint: TableHints.UPDLOCK,
    });
    // A valid dummy bcrypt hash keeps missing-user checks comparable to existing-user checks.
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ||
        "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
    );
    if (!user || !valid) {
      await audit("LOGIN_FAILED", ctx, user?.id);
      fail("Invalid email / phone or password.", "UNAUTHENTICATED");
    }
    if (!user.active || user.blocked)
      fail("Your account is unavailable. Contact support.", "FORBIDDEN");
    if (!user.emailVerified)
      fail("Verify your email before signing in.", "EMAIL_UNVERIFIED");
    const loaded = await User.findByPk(user.id, {
      include: [
        { model: Role, as: "roles" },
        { model: Vendor, as: "vendor" },
      ],
      transaction,
    });
    if (!eligible(loaded)) fail("Account unavailable.", "FORBIDDEN");
    await issueSession(loaded, ctx, transaction);
    await audit("LOGIN", ctx, user.id, null, transaction);
    return response("Welcome back.", publicUser(loaded));
  });
}
export async function logout(ctx) {
  const id = String(ctx.req.cookies?.[cookieNames.refresh] || "").split(".")[0];
  if (ctx.auth)
    await Session.update(
      { revokedAt: new Date() },
      { where: { id: ctx.auth.session.id } },
    );
  if (id && /^[a-f0-9-]{36}$/.test(id)) {
    const [, secret] = String(ctx.req.cookies[cookieNames.refresh]).split(".");
    await Session.update(
      { revokedAt: new Date() },
      { where: { id, digest: digest(secret || "") } },
    );
  }
  clearCookies(ctx);
  return response("Signed out.");
}
export async function verifyEmailOtp(input, ctx) {
  await limit(`otp-ip:${ctx.req.ip}`, 30);
  const user = await User.findOne({
    where: { email: email.parse(input.email) },
  });
  await consumeOtp(user, "email", input.code, async (transaction) => {
    await user.update({ emailVerified: true }, { transaction });
    await audit("EMAIL_VERIFIED", ctx, user.id, null, transaction);
  });
  return response("Email verified. Please sign in.");
}
export async function resendEmailOtp(input, ctx) {
  await limit(`resend-ip:${ctx.req.ip}`, 10, 3600);
  const address = email.parse(input.email);
  await limit(`resend-email:${address}`, 5, 3600);
  const user = await User.findOne({ where: { email: address } });
  if (user && !user.emailVerified && user.active && !user.blocked) {
    try {
      await sendOtp(user, "email");
    } catch (error) {
      await audit("EMAIL_RESEND_DELAYED", ctx, user.id);
      throw error;
    }
  }
  return response(generic);
}
function normalizeIdentifier(value) {
  const trimmed = String(value).trim();
  return trimmed.includes("@") ? email.parse(trimmed) : phone.parse(trimmed);
}
export async function forgotPassword(input, ctx) {
  await limit(`forgot-ip:${ctx.req.ip}`, 10, 3600);
  const identifier = normalizeIdentifier(input.identifier);
  await limit(`forgot:${identifier}`, 5, 3600);
  const user = await User.findOne({
    where: { [Op.or]: [{ email: identifier }, { phone: identifier }] },
  });
  if (user?.active && !user.blocked && user.emailVerified) {
    try {
      await sendOtp(user, "reset");
    } catch (error) {
      await audit("RESET_EMAIL_DELAYED", ctx, user.id);
      throw error;
    }
  }
  await audit("PASSWORD_RESET_REQUEST", ctx);
  return response(generic);
}
export async function verifyResetOtp(input, ctx) {
  await limit(`reset-verify-ip:${ctx.req.ip}`, 20);
  const identifier = normalizeIdentifier(input.identifier);
  const user = await User.findOne({
    where: { [Op.or]: [{ email: identifier }, { phone: identifier }] },
  });
  const token = randomBytes(48).toString("hex");
  await consumeOtp(user, "reset", input.code, async (transaction) => {
    if (!user.active || user.blocked || !user.emailVerified)
      fail("Invalid or expired code.");
    await ResetGrant.create(
      {
        id: digest(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 600000),
      },
      { transaction },
    );
    await audit("RESET_OTP_VERIFIED", ctx, user.id, null, transaction);
  });
  return response("Code verified.", null, { resetToken: token });
}
export async function resetPassword(input, ctx) {
  await limit(`reset-ip:${ctx.req.ip}`, 10);
  password.parse(input.password);
  if (input.password !== input.confirmPassword) fail("Passwords do not match.");
  const hash = await hashPassword(input.password);
  await sequelize.transaction(async (transaction) => {
    const grant = await ResetGrant.findByPk(digest(input.resetToken), {
      transaction,
      tableHint: TableHints.UPDLOCK,
    });
    if (!grant || grant.consumedAt || grant.expiresAt <= new Date())
      fail("Reset authorization expired. Request a new code.");
    await grant.update({ consumedAt: new Date() }, { transaction });
    await User.update(
      { passwordHash: hash, updatedAt: new Date() },
      { where: { id: grant.userId }, transaction },
    );
    await Session.update(
      { revokedAt: new Date() },
      { where: { userId: grant.userId }, transaction },
    );
    await audit("PASSWORD_RESET", ctx, grant.userId, null, transaction);
  });
  clearCookies(ctx);
  return response("Password reset successfully. Please sign in.");
}
export async function changePassword(input, ctx) {
  const user = requireAuth(ctx);
  await limit(`change-password:${user.id}`, 5);
  if (input.password !== input.confirmPassword) fail("Passwords do not match.");
  const newHash = await hashPassword(input.password);
  await sequelize.transaction(async (transaction) => {
    const locked = await User.findByPk(user.id, {
      transaction,
      tableHint: TableHints.UPDLOCK,
    });
    if (!(await verifyPassword(input.currentPassword, locked.passwordHash)))
      fail("Current password is incorrect.");
    await locked.update(
      { passwordHash: newHash, updatedAt: new Date() },
      { transaction },
    );
    await Session.update(
      { revokedAt: new Date() },
      { where: { userId: user.id }, transaction },
    );
    await audit("PASSWORD_CHANGED", ctx, user.id, null, transaction);
  });
  clearCookies(ctx);
  return response("Password changed. Please sign in again.");
}
export async function refreshToken(ctx) {
  const user = await rotateSession(ctx);
  return response("Session refreshed.", publicUser(user));
}
