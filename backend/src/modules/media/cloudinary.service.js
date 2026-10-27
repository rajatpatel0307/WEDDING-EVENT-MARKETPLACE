import { createHash, randomUUID } from "node:crypto";
import { GraphQLError } from "graphql";

const fail = (message) => {
  throw new GraphQLError(message, { extensions: { code: "UPLOAD_FAILED" } });
};
function config() {
  const {
    CLOUDINARY_CLOUD_NAME: cloud,
    CLOUDINARY_API_KEY: apiKey,
    CLOUDINARY_API_SECRET: secret,
  } = process.env;
  if (!cloud || !apiKey || !secret)
    fail("Uploads are unavailable. Please configure Cloudinary on the server.");
  return { cloud, apiKey, secret };
}
export function signature(params, secret) {
  return createHash("sha256")
    .update(
      Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&") + secret,
    )
    .digest("hex");
}
export function validateFile(base64, photo = false) {
  if (
    typeof base64 !== "string" ||
    !base64.length ||
    base64.length > 7 * 1024 * 1024 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
  )
    fail("Choose a valid file under 5 MB.");
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024)
    fail("Choose a file under 5 MB.");
  const extension = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "jpg"
      : bytes.subarray(0, 5).toString() === "%PDF-"
        ? "pdf"
        : null;
  if (!extension || (photo && extension === "pdf"))
    fail(
      photo
        ? "Choose a PNG or JPEG photo."
        : "Choose a PDF, PNG or JPEG document.",
    );
  return {
    bytes,
    extension,
    mimeType:
      extension === "pdf"
        ? "application/pdf"
        : `image/${extension === "jpg" ? "jpeg" : "png"}`,
  };
}
export async function uploadAsset(base64, photo = false) {
  const file = validateFile(base64, photo);
  const { cloud, apiKey, secret } = config();
  const resource = photo ? "image" : "raw";
  const params = {
    public_id: `marrynest/${photo ? "profiles" : "documents"}/${randomUUID()}${photo ? "" : `.${file.extension}`}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: photo ? "upload" : "authenticated",
    overwrite: "false",
  };
  const body = new FormData();
  for (const [key, value] of Object.entries(params)) body.set(key, value);
  body.set(
    "file",
    new Blob([file.bytes], { type: file.mimeType }),
    `upload.${file.extension}`,
  );
  body.set("api_key", apiKey);
  body.set("signature", signature(params, secret));
  let response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/${resource}/upload`,
      { method: "POST", body, signal: AbortSignal.timeout(60000) },
    );
  } catch {
    fail("Upload failed. Please try again.");
  }
  if (!response.ok)
    fail(
      "Cloudinary could not store your file. Please try again or contact support.",
    );
  const result = await response.json();
  if (
    result.public_id !== params.public_id ||
    !result.secure_url?.startsWith("https://res.cloudinary.com/")
  )
    fail("Invalid upload response.");
  return {
    key: `cloudinary:${resource}:${params.type}:${result.public_id}`,
    url: result.secure_url,
  };
}
export async function downloadAsset(key) {
  if (
    !/^cloudinary:raw:authenticated:marrynest\/documents\/[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(
      key,
    )
  )
    fail("Invalid document key.");
  const { cloud, apiKey, secret } = config();
  const publicId = key.split(":").slice(3).join(":");
  const params = {
    public_id: publicId,
    type: "authenticated",
    timestamp: String(Math.floor(Date.now() / 1000)),
    expires_at: String(Math.floor(Date.now() / 1000) + 60),
  };
  const query = new URLSearchParams({
    ...params,
    api_key: apiKey,
    signature: signature(params, secret),
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/raw/download?${query}`,
    { signal: AbortSignal.timeout(60000) },
  );
  if (!response.ok) fail("Unable to retrieve the document. Please try again.");
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    name: publicId.split("/").pop(),
    base64: bytes.toString("base64"),
    mimeType: key.endsWith(".pdf")
      ? "application/pdf"
      : key.endsWith(".png")
        ? "image/png"
        : "image/jpeg",
  };
}
