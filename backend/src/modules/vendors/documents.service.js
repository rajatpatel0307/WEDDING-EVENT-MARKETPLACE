import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { sign, verify } from "../../config/jwt.js";
import { fail, limit } from "../auth/security.service.js";
import { email } from "../auth/auth.validation.js";
const root = () =>
  path.resolve(process.env.DOCUMENT_STORAGE_PATH || "private-documents");
export async function uploadDocument(input, ctx) {
  await limit(`upload:${ctx.req.ip}`, 12, 3600);
  const owner = email.parse(input.email);
  if (input.base64.length > 7 * 1024 * 1024)
    fail("Document must be under 5 MB.");
  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024)
    fail("Document must be under 5 MB.");
  const pdf = bytes.subarray(0, 5).toString() === "%PDF-",
    png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!pdf && !png && !jpg) fail("Upload a PDF, PNG or JPEG document.");
  const key = `${randomUUID()}.${pdf ? "pdf" : png ? "png" : "jpg"}`;
  await mkdir(root(), { recursive: true });
  await writeFile(path.join(root(), key), bytes, { flag: "wx", mode: 0o600 });
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
