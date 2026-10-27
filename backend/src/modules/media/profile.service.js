import { sign, verify } from "../../config/jwt.js";
import { email } from "../auth/auth.validation.js";
import { fail, limit } from "../auth/security.service.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { publicUser } from "../auth/auth.service.js";
import { uploadAsset } from "./cloudinary.service.js";

export async function uploadProfilePhoto(input, ctx) {
  await limit(`photo-upload:${ctx.req.ip}`, 12, 3600);
  const owner = ctx.auth ? requireAuth(ctx).email : email.parse(input.email);
  const { url } = await uploadAsset(input.base64, true);
  return {
    uploadToken: sign({ purpose: "profile-photo", owner, url }, "24h"),
    url,
  };
}
export function profilePhotoUrl(token, owner) {
  try {
    const claims = verify(token);
    if (
      claims.purpose !== "profile-photo" ||
      claims.owner !== owner ||
      !claims.url?.startsWith("https://res.cloudinary.com/")
    )
      throw Error();
    return claims.url;
  } catch {
    fail("Photo upload expired. Please upload again.");
  }
}
export async function updateProfilePhoto(token, ctx) {
  const user = requireAuth(ctx);
  const url = profilePhotoUrl(token, user.email);
  await user.update({ profilePhotoUrl: url, updatedAt: new Date() });
  return {
    success: true,
    message: "Profile photo updated.",
    user: publicUser(user),
  };
}
