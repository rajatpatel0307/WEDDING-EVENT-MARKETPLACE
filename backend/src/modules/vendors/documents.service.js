import { uploadAsset, downloadAsset } from "../media/cloudinary.service.js";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { sign, verify } from "../../config/jwt.js";
import { fail, limit } from "../auth/security.service.js";
import { email } from "../auth/auth.validation.js";
const root = () =>
  path.resolve(process.env.DOCUMENT_STORAGE_PATH || "private-documents");
export async function uploadDocument(input, ctx) {
  await limit(`upload:${ctx.req.ip}`, 12, 3600);
  const owner = email.parse(input.email);
  const { key } = await uploadAsset(input.base64);
  return {
    uploadToken: sign({ purpose: "document", owner, key }, "24h"),
    name: input.name.slice(0, 200),
  };
}
export function documentKey(token, owner) {
  try {
    const claims = verify(token);
    if (claims.purpose !== "document" || claims.owner !== owner) throw Error();
    return claims.key;
  } catch {
    fail("Document upload expired. Please upload again.");
  }
}
export async function downloadDocument(document) {
  const key = document.key;
  if (key.startsWith("cloudinary:")) return downloadAsset(key);
  if (!/^[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(key))
    fail("Document storage requires migration.");
  return {
    name: key,
    base64: (await readFile(path.join(root(), key))).toString("base64"),
    mimeType: key.endsWith(".pdf")
      ? "application/pdf"
      : key.endsWith(".png")
        ? "image/png"
        : "image/jpeg",
  };
}
export async function removeStoredFile(key) {
  await unlink(path.join(root(), key));
}
