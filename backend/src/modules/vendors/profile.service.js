import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import { phone } from "../auth/auth.validation.js";
import { repo, fail, assertVersion, audit } from "./workspace.common.js";
const input = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100),
    phone: z.union([phone, z.literal("")]),
    expectedUpdatedAt: z.iso.datetime(),
  })
  .strict();
export async function profile(ctx) {
  const user = requireRole(ctx, "VENDOR");
  const [row] = await repo.select(
    "SELECT FirstName AS firstName,LastName AS lastName,Email AS email,PhoneNumber AS phone,UpdatedAt AS updatedAt FROM dbo.Users WHERE UserId=:id",
    { id: user.id },
  );
  if (!row) fail("Profile not found.", 404);
  return row;
}
export async function saveProfile(body, ctx) {
  const user = requireRole(ctx, "VENDOR"),
    values = input.parse(body);
  return repo.transaction(async (tx) => {
    const [old] = await repo.select(
      "SELECT UpdatedAt,PhoneNumber FROM dbo.Users WITH(UPDLOCK,HOLDLOCK) WHERE UserId=:id",
      { id: user.id },
      tx,
    );
    if (!old) fail("Profile not found.", 404);
    assertVersion(old, values.expectedUpdatedAt);
    const next = {
      FirstName: values.firstName,
      LastName: values.lastName || null,
      PhoneNumber: values.phone || null,
      ...(values.phone !== (old.PhoneNumber || "")
        ? { IsPhoneVerified: 0 }
        : {}),
      UpdatedAt: new Date(),
    };
    await repo.update({ table: "Users", id: "UserId" }, user.id, next, tx);
    await audit(
      ctx,
      "PROFILE_UPDATED",
      "Users",
      user.id,
      null,
      {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      },
      tx,
    );
    return { message: "Profile updated." };
  });
}
