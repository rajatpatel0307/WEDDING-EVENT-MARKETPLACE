import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import express from "express";
import helmet from "helmet";
import { sequelize } from "../src/config/database.js";
import { prepareImage } from "../src/modules/media/media.storage.js";
import {
  uploadInput,
  reorderInput,
} from "../src/modules/media/media.validation.js";
import { createMediaRouter } from "../src/modules/media/media.routes.js";
import { variants, folderFor } from "../src/modules/media/media.policy.js";
test("images are fully decoded, dimensions bounded, and metadata stripped before storage", async () => {
  const png = await sharp({
    create: { width: 20, height: 12, channels: 3, background: "#43744c" },
  })
    .png()
    .toBuffer();
  const result = await prepareImage(
    png.toString("base64"),
    "photo.png",
    "image/png",
  );
  assert.equal(result.width, 20);
  assert.equal(result.height, 12);
  assert.equal(result.mimeType, "image/webp");
  const metadata = await sharp(result.bytes).metadata();
  assert.equal(metadata.exif, undefined);
  await assert.rejects(
    () => prepareImage(png.toString("base64"), "image.jpg", "image/jpeg"),
    /match/,
  );
  await assert.rejects(
    () =>
      prepareImage(
        png.subarray(0, 25).toString("base64"),
        "broken.png",
        "image/png",
      ),
    /corrupted/,
  );
  await assert.rejects(
    () =>
      prepareImage(
        Buffer.from('<svg onload="bad()"/>').toString("base64"),
        "image.png",
        "image/png",
      ),
    /single|corrupted/,
  );
  await assert.rejects(
    () =>
      prepareImage(
        Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64"),
        "big.png",
        "image/png",
      ),
    /limit/,
  );
});
test("ownership overrides, unknown types, duplicate reordering and injected storage parameters are rejected", () => {
  const input = {
    entityType: "Service",
    entityId: randomUUID(),
    requestKey: randomUUID(),
    fileName: "image.png",
    mimeType: "image/png",
    base64: "YWJjZA==",
  };
  assert.equal(uploadInput.safeParse(input).success, true);
  for (const extra of [
    { ownerId: randomUUID() },
    { publicId: "someone-elses-image" },
    { transform: "arbitrary" },
    { entityType: "Users" },
  ])
    assert.equal(uploadInput.safeParse({ ...input, ...extra }).success, false);
  const id = randomUUID();
  assert.equal(
    reorderInput.safeParse({
      entityType: "Service",
      entityId: randomUUID(),
      ids: [id, id.toUpperCase()],
    }).success,
    false,
  );
  assert.equal(folderFor("Vendor", "Logo"), "wedding-marketplace/vendors/logo");
  assert.deepEqual(Object.keys(variants), ["thumb", "card", "gallery"]);
});
test("media REST rejects anonymous, wrong-role, and cross-origin writes before uploads", async () => {
  const customer = {
    id: randomUUID(),
    active: true,
    emailVerified: true,
    roles: [{ code: "CUSTOMER", active: true }],
  };
  const app = express();
  app.use(
    "/api",
    createMediaRouter({
      authenticateRequest: async (req) =>
        req.get("x-test-user") ? { user: customer } : null,
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    for (const path of [
      "/media",
      "/media/metadata",
      "/admin/media/statistics",
      "/vendor/media",
    ])
      assert.equal((await fetch(base + path)).status, 401);
    assert.equal(
      (await fetch(base + "/admin/media", { headers: { "x-test-user": "1" } }))
        .status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/media/upload", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-test-user": "1",
            origin: "https://forged.invalid",
            "x-media-request": "1",
          },
          body: "{}",
        })
      ).status,
      403,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("private image responses allow the same-site frontend while retaining ownership checks", async (t) => {
  const ownerId = randomUUID();
  const id = randomUUID();
  const image = await sharp({
    create: { width: 20, height: 12, channels: 3, background: "#43744c" },
  }).webp().toBuffer();
  const row = {
    MediaId: id,
    OwnerId: ownerId,
    EntityType: "Service",
    MediaType: "Image",
    ModerationStatus: "Pending",
    UploadStatus: "Ready",
    ResourceType: "image",
    StorageKey: `cloudinary:image:authenticated:wedding-marketplace/services/gallery/${id}`,
    PublicId: `wedding-marketplace/services/gallery/${id}`,
  };
  t.mock.method(sequelize, "query", async () => [row]);
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    const previous = process.env[key];
    process.env[key] = "test";
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  const realFetch = globalThis.fetch;
  let storageReads = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (String(url).startsWith("https://res.cloudinary.com/")) {
      storageReads++;
      return new Response(image, { headers: { "Content-Type": "image/webp" } });
    }
    return realFetch(url, options);
  });
  const app = express();
  app.use(helmet());
  app.use("/api", createMediaRouter({
    authenticateRequest: async (req) => req.get("x-test-user") ? {
      user: { id: req.get("x-test-user"), active: true, emailVerified: true, roles: [{ code: "VENDOR", active: true }] },
    } : null,
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const path = `${base}/media/${id}/content?variant=thumb`;
  const response = await fetch(path, { headers: { "x-test-user": ownerId } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cross-Origin-Resource-Policy"), "same-site");
  assert.equal(response.headers.get("Content-Type"), "image/webp");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
  assert.equal((await fetch(path)).status, 401);
  assert.equal((await fetch(path, { headers: { "x-test-user": randomUUID() } })).status, 404);
  assert.equal(storageReads, 1);
  const metadata = await fetch(`${base}/media/metadata`);
  assert.equal(metadata.status, 401);
  assert.equal(metadata.headers.get("Cross-Origin-Resource-Policy"), "same-origin");
});
