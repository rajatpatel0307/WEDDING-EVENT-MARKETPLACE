import { randomBytes, randomUUID } from "node:crypto";
import { TableHints } from "sequelize";
import { sequelize } from "../../config/database.js";
import { Session, User, Role, Vendor } from "../../models/index.js";
import { sign, verify } from "../../config/jwt.js";
import { production } from "../../config/environment.js";
import { digest, fail } from "./security.service.js";
export const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: "strict",
  path: "/graphql",
};
export const cookieNames = {
  access: production ? "__Secure-mn_access" : "mn_access",
  refresh: production ? "__Secure-mn_refresh" : "mn_refresh",
};
export const clearCookies = (ctx) =>
  Object.values(cookieNames).forEach((name) =>
    ctx.res.clearCookie(name, cookieOptions),
  );
export function setCookies(ctx, id, refresh, userId) {
  ctx.res.cookie(
    cookieNames.access,
    sign({ sub: userId, sid: id, purpose: "access" }, "10m"),
    { ...cookieOptions, maxAge: 600000 },
  );
  ctx.res.cookie(cookieNames.refresh, `${id}.${refresh}`, {
    ...cookieOptions,
    maxAge: 30 * 86400000,
  });
}
export async function issueSession(user, ctx, transaction) {
  const id = randomUUID(),
    refresh = randomBytes(48).toString("hex");
  await Session.create(
    {
      id,
      userId: user.id,
      digest: digest(refresh),
      expiresAt: new Date(Date.now() + 30 * 86400000),
      createdAt: new Date(),
    },
    { transaction },
  );
  if (transaction)
    transaction.afterCommit(() => setCookies(ctx, id, refresh, user.id));
  else setCookies(ctx, id, refresh, user.id);
}
export const loadUser = (id) =>
  User.findByPk(id, {
    include: [
      { model: Role, as: "roles" },
      { model: Vendor, as: "vendor" },
    ],
  });
export function eligible(user) {
  return (
    !!user &&
    user.active &&
    !user.blocked &&
    user.emailVerified &&
    user.roles.some(
      (r) => r.active && ["ADMIN", "CUSTOMER", "VENDOR"].includes(r.code),
    )
  );
}
export async function authenticate(req) {
  const token = req.cookies?.[cookieNames.access];
  if (!token) return null;
  try {
    const claims = verify(token);
    if (claims.purpose !== "access") return null;
    const session = await Session.findByPk(claims.sid);
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.userId !== claims.sub
    )
      return null;
    const user = await loadUser(claims.sub);
    return eligible(user) ? { user, session } : null;
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    )
      return null;
    throw error;
  }
}
export async function rotateSession(ctx) {
  const [id, secret] = String(
    ctx.req.cookies?.[cookieNames.refresh] || "",
  ).split(".");
  if (!id || !secret) fail("Please sign in again.", "UNAUTHENTICATED");
  const refresh = randomBytes(48).toString("hex");
  const result = await sequelize.transaction(async (transaction) => {
    const session = await Session.findByPk(id, {
      transaction,
      tableHint: TableHints.UPDLOCK,
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date())
      return null;
    if (session.digest !== digest(secret)) {
      await session.update({ revokedAt: new Date() }, { transaction });
      return null;
    }
    await session.update({ digest: digest(refresh) }, { transaction });
    return session;
  });
  if (!result) fail("Please sign in again.", "UNAUTHENTICATED");
  const user = await loadUser(result.userId);
  if (!eligible(user)) fail("Account unavailable.", "UNAUTHENTICATED");
  setCookies(ctx, id, refresh, user.id);
  return user;
}
