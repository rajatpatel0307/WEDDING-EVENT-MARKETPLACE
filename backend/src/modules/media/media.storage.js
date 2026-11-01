import sharp from "sharp";
import { createHash } from "node:crypto";
import { uploadAsset, signature, downloadAsset } from "./cloudinary.service.js";
import { variants, maxBytes, fail } from "./media.policy.js";
export async function prepareImage(base64, fileName, mimeType, review = false) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 !== 0)
    fail("Invalid image encoding.");
  const bytes = Buffer.from(base64, "base64"),
    limit = review ? Math.min(maxBytes(), 2 * 1024 * 1024) : maxBytes();
  if (!bytes.length || bytes.length > limit)
    fail(`Image exceeds the ${limit / 1024 / 1024} MB limit.`);
  let meta, result;
  try {
    const image = sharp(bytes, {
      failOn: "warning",
      limitInputPixels: 40000000,
      animated: false,
    });
    meta = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format) ||
      !meta.width ||
      !meta.height ||
      meta.width > 12000 ||
      meta.height > 12000 ||
      meta.pages > 1
    )
      fail(
        "Choose a single JPEG, PNG or WebP image up to 12000 pixels per side.",
      );
    const expected = {
      jpeg: ["image/jpeg", /\.jpe?g$/i],
      png: ["image/png", /\.png$/i],
      webp: ["image/webp", /\.webp$/i],
    }[meta.format];
    if (expected[0] !== mimeType || !expected[1].test(fileName))
      fail("File content, type and extension must match.");
    result = await image
      .rotate()
      .webp({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    if (error.status) throw error;
    fail("This image is corrupted, unsupported or too large to decode.");
  }
  if (result.data.length > maxBytes())
    fail("The processed image is too large. Choose a smaller image.");
  return {
    bytes: result.data,
    extension: "webp",
    mimeType: "image/webp",
    width: result.info.width,
    height: result.info.height,
    originalSize: bytes.length,
  };
}
export const storeImage = (file, publicId) =>
  uploadAsset("", true, {
    file,
    publicId,
    authenticated: true,
    eager: Object.values(variants).join("|"),
  });
const storageConfig = () => {
  const {
    CLOUDINARY_CLOUD_NAME: cloud,
    CLOUDINARY_API_KEY: apiKey,
    CLOUDINARY_API_SECRET: secret,
  } = process.env;
  if (!cloud || !apiKey || !secret) fail("Cloudinary is not configured.", 503);
  return { cloud, apiKey, secret };
};
export async function retrieveImage(row, variant = "gallery") {
  if (row.ResourceType === "raw" && row.StorageKey) {
    const asset = await downloadAsset(row.StorageKey);
    return {
      bytes: Buffer.from(asset.base64, "base64"),
      mimeType: asset.mimeType,
    };
  }
  const { cloud, secret } = storageConfig();
  if (
    !row.PublicId ||
    !/^wedding-marketplace\/(vendors|services|packages|reviews|admin)\/[a-z-]+\/[a-f0-9-]{36}$/.test(
      row.PublicId,
    )
  )
    fail("Legacy image requires storage reconciliation.", 404);
  const transform = variant === "original" ? "" : variants[variant];
  if (variant !== "original" && !transform) fail("Invalid image variant.");
  const path = [transform, `${row.PublicId}.webp`].filter(Boolean).join("/");
  const digest = createHash("sha256")
    .update(path + secret)
    .digest("base64url")
    .slice(0, 8);
  const response = await fetch(
    `https://res.cloudinary.com/${encodeURIComponent(cloud)}/image/authenticated/s--${digest}--/${path}`,
    { signal: AbortSignal.timeout(30000) },
  );
  if (!response.ok) fail("Image delivery is temporarily unavailable.", 502);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 15 * 1024 * 1024)
    fail("Image response exceeds delivery limits.", 502);
  return { bytes, mimeType: "image/webp" };
}
export async function destroyImage(row) {
  const { cloud, apiKey, secret } = storageConfig();
  const legacyRaw =
    row.ResourceType === "raw" &&
    row.DeliveryType === "authenticated" &&
    /^marrynest\/documents\/[a-f0-9-]{36}\.(png|jpg)$/.test(row.PublicId || "");
  if (
    !row.PublicId ||
    (!legacyRaw &&
      !/^wedding-marketplace\/(vendors|services|packages|reviews|admin)\/[a-z-]+\/[a-f0-9-]{36}$/.test(
        row.PublicId,
      ))
  )
    fail("Unmanaged legacy storage requires manual reconciliation.", 409);
  const params = {
    public_id: row.PublicId,
    type: row.DeliveryType || "authenticated",
    timestamp: String(Math.floor(Date.now() / 1000)),
    invalidate: "true",
  };
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/${legacyRaw ? "raw" : "image"}/destroy`,
    {
      method: "POST",
      body: new URLSearchParams({
        ...params,
        api_key: apiKey,
        signature: signature(params, secret),
      }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) fail("Cloudinary deletion failed.", 502);
  const result = await response.json();
  if (!["ok", "not found"].includes(result.result))
    fail("Cloudinary did not confirm deletion.", 502);
}
