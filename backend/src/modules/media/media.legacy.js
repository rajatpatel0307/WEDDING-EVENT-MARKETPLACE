import { createHash } from "node:crypto";
import { validateFile } from "./cloudinary.service.js";
import { upload, mutate, reorder, lockMedia } from "./media.service.js";
import { same, fail } from "./media.policy.js";
export function legacyKey(id, version, base64) {
  const h = createHash("sha256")
    .update(`${id}:${version}:${base64}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export async function serviceImages(id, b, ctx, removeId) {
  if (removeId || b.primaryId) {
    const { row } = await lockMedia(removeId || b.primaryId, ctx);
    if (row.EntityType !== "Service" || !same(row.EntityId, id))
      fail("Image not found in this service.", 404);
  }
  if (removeId) return mutate(removeId, "delete", {}, ctx);
  if (b.order)
    return reorder({ entityType: "Service", entityId: id, ids: b.order }, ctx);
  if (b.primaryId) return mutate(b.primaryId, "primary", {}, ctx);
  const file = validateFile(b.base64, true);
  return upload(
    {
      entityType: "Service",
      entityId: id,
      purpose: "Gallery",
      requestKey: legacyKey(id, b.expectedUpdatedAt, b.base64),
      fileName: `service.${file.extension}`,
      mimeType: file.mimeType,
      base64: b.base64,
    },
    ctx,
  );
}
