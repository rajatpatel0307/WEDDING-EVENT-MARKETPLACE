import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  uploadAsset,
  downloadAsset,
  validateFile,
  signature,
} from "../src/modules/media/cloudinary.service.js";
import {
  profilePhotoUrl,
  updateProfilePhoto,
} from "../src/modules/media/profile.service.js";
import { sign } from "../src/config/jwt.js";

const pdf = Buffer.from("%PDF-1.7\nexample").toString("base64");
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString(
  "base64",
);
test("uploads enforce size and file signatures, and reject PDF profile photos", () => {
  assert.equal(validateFile(pdf).extension, "pdf");
  assert.equal(validateFile(png, true).extension, "png");
  for (const input of [
    "",
    "invalid!",
    Buffer.from("<script>bad</script>").toString("base64"),
    Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64"),
  ])
    assert.throws(() => validateFile(input));
  assert.throws(() => validateFile(pdf, true), /PNG or JPEG/);
});
test("signatures sort parameters and use SHA256", () => {
  assert.equal(
    signature({ type: "authenticated", timestamp: "123" }, "secret"),
    createHash("sha256")
      .update("timestamp=123&type=authenticatedsecret")
      .digest("hex"),
  );
});
test("documents use authenticated raw uploads and signed downloads; photos use public image uploads", async (t) => {
  const values = {
    CLOUDINARY_CLOUD_NAME: "test",
    CLOUDINARY_API_KEY: "key",
    CLOUDINARY_API_SECRET: "secret",
  };
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (options.method === "POST")
      return {
        ok: true,
        json: async () => ({
          public_id: options.body.get("public_id"),
          secure_url: "https://res.cloudinary.com/test/image/upload/photo.png",
        }),
      };
    return {
      ok: true,
      arrayBuffer: async () => Buffer.from("%PDF-1.7\nexample"),
    };
  });
  const document = await uploadAsset(pdf);
  assert.match(
    document.key,
    /^cloudinary:raw:authenticated:marrynest\/documents\//,
  );
  assert.match(calls[0].url, /\/raw\/upload$/);
  assert.equal(calls[0].options.body.get("type"), "authenticated");
  const params = Object.fromEntries(
    [...calls[0].options.body.entries()].filter(
      ([key]) => !["file", "api_key", "signature"].includes(key),
    ),
  );
  assert.equal(
    calls[0].options.body.get("signature"),
    signature(params, "secret"),
  );
  const downloaded = await downloadAsset(document.key);
  assert.equal(downloaded.base64, pdf);
  const download = new URL(calls[1].url);
  assert.equal(download.searchParams.get("type"), "authenticated");
  assert.ok(download.searchParams.get("signature"));
  await uploadAsset(png, true);
  assert.match(calls[2].url, /\/image\/upload$/);
  assert.equal(calls[2].options.body.get("type"), "upload");
  await assert.rejects(
    downloadAsset("cloudinary:raw:authenticated:../../secret"),
  );
  t.mock.method(globalThis, "fetch", async () => ({ ok: false }));
  await assert.rejects(uploadAsset(pdf), /could not store/);
});
test("photo tokens enforce owner, purpose and expiry; profile mutation requires authentication", async (t) => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-tests";
  t.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
  const claims = {
    purpose: "profile-photo",
    owner: "test@example.com",
    url: "https://res.cloudinary.com/test/image/upload/photo.png",
  };
  assert.equal(profilePhotoUrl(sign(claims, "1h"), claims.owner), claims.url);
  assert.throws(() => profilePhotoUrl(sign(claims, "1h"), "other@example.com"));
  assert.throws(() =>
    profilePhotoUrl(
      sign({ ...claims, purpose: "document" }, "1h"),
      claims.owner,
    ),
  );
  assert.throws(() => profilePhotoUrl(sign(claims, -1), claims.owner));
  await assert.rejects(updateProfilePhoto(sign(claims, "1h"), {}), /sign in/);
});
