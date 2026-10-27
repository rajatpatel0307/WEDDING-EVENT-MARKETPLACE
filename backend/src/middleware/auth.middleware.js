import { fail } from "../modules/auth/security.service.js";
import { eligible } from "../modules/auth/token.service.js";
export function requireAuth(ctx) {
  if (!eligible(ctx.auth?.user)) fail("Please sign in.", "UNAUTHENTICATED");
  return ctx.auth.user;
}
export function requireRole(ctx, role) {
  const user = requireAuth(ctx);
  if (!user.roles.some((r) => r.code === role && r.active))
    fail("Access denied.", "FORBIDDEN");
  return user;
}
export function requireApprovedVendor(ctx) {
  const user = requireRole(ctx, "VENDOR");
  if (user.vendor?.verificationStatus !== "Approved" || !user.vendor.active)
    fail("Vendor approval required.", "FORBIDDEN");
  return user;
}
