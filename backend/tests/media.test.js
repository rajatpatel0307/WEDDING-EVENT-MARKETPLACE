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
import { isPublic, mutate, upload } from "../src/modules/media/media.service.js";
import { variants, folderFor, publicMedia } from "../src/modules/media/media.policy.js";
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
  t.mock.method(sequelize, "query", async (sql) =>
    sql.startsWith("SELECT * FROM dbo.Media") ? [row] : [],
  );
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

test("completed images ignore legacy approval states while parent visibility and deletion still apply", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => [{ ServiceId: randomUUID() }]);
  const row = { EntityType: "Service", EntityId: randomUUID(), UploadStatus: "Ready" };
  for (const ModerationStatus of ["Pending", "Approved", "Rejected", "Hidden"]) {
    assert.equal(await isPublic({ ...row, ModerationStatus }), true);
  }
  assert.equal(await isPublic({ ...row, UploadStatus: "Uploading" }), false);
  assert.equal(await isPublic({ ...row, UploadStatus: "Failed" }), false);
  assert.equal(await isPublic({ ...row, DeletedAt: new Date() }), false);
  query.mock.mockImplementation(async () => []);
  assert.equal(await isPublic(row), false, "draft or unavailable parents stay private");
  assert.doesNotMatch(publicMedia(), /ModerationStatus/);
  assert.match(publicMedia(), /UploadStatus='Ready'.*DeletedAt IS NULL/);
  for (const action of ["approve", "reject", "hide", "restore"]) {
    await assert.rejects(() => mutate(randomUUID(), action, {}, {}), /Unsupported media action/);
  }
});

test("image uploads complete without review and immediately project vendor logos and covers", async (t) => {
  const owner = randomUUID(), entityId = randomUUID();
  const ctx = { req: { ip: "127.0.0.1" }, auth: { user: {
    id: owner, active: true, emailVerified: true,
    roles: [{ code: "ADMIN", active: true }, { code: "CUSTOMER", active: true }],
  } } };
  const image = await sharp({ create: { width: 20, height: 12, channels: 3, background: "#43744c" } }).png().toBuffer();
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    const previous = process.env[key];
    process.env[key] = "test";
    t.after(() => previous === undefined ? delete process.env[key] : process.env[key] = previous);
  }
  t.mock.method(globalThis, "fetch", async (_url, options) => new Response(JSON.stringify({
    public_id: options.body.get("public_id"), secure_url: "https://res.cloudinary.com/test/image.webp", eager: [],
  })));
  const tx = { fixture: true };
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  let row;
  const query = t.mock.method(sequelize, "query", async (sql, options) => {
    if (sql.startsWith("SELECT v.*") || sql.startsWith("SELECT s.*") || sql.startsWith("SELECT p.*") || sql.startsWith("SELECT r.*"))
      return [{ OwnerId: owner, VendorId: entityId, ServiceId: entityId, BookingId: entityId, CreatedAt: new Date(), ModerationStatus: "Approved", ApprovalStatus: "Approved", VerificationStatus: "Approved", IsActive: true }];
    if (sql.startsWith("SELECT * FROM dbo.Booking"))
      return [{ CustomerId: owner, BookingStatus: "Completed" }];
    if (sql.startsWith("SELECT COUNT(*)")) return [{ total: 0 }];
    if (sql.startsWith("UPDATE dbo.Media SET ErrorMessage='UPLOAD_IN_PROGRESS'")) return [{ id: row.MediaId }];
    if (sql.startsWith("INSERT INTO dbo.[Media]")) {
      const columns = sql.match(/\(([^)]+)\)/)[1].split(",").map((key) => key.replace(/[\[\]]/g, ""));
      row = Object.fromEntries(columns.map((key, i) => [key, options.replacements[`v${i}`]]));
      return [{ id: row.MediaId }];
    }
    if (sql.startsWith("UPDATE dbo.[Media]")) {
      for (const [, column, key] of sql.matchAll(/\[([^\]]+)\]=:(v\d+)/g)) row[column] = options.replacements[key];
      return [];
    }
    if (sql.startsWith("SELECT * FROM dbo.Media") && !sql.includes("RequestKey")) return [row];
    if (sql.startsWith("SELECT TOP(1) MediaId FROM dbo.Media")) return [{ MediaId: row.MediaId }];
    return [];
  });
  for (const [entityType, purpose] of [["Vendor", "Logo"], ["Vendor", "Cover"], ["Service", "Gallery"], ["Package", "Gallery"], ["Review", "Gallery"], ["Admin", "Banner"]]) {
    query.mock.resetCalls();
    const result = await upload({
      entityType, entityId: entityType === "Admin" ? owner : entityId, purpose,
      requestKey: randomUUID(), fileName: "image.png", mimeType: "image/png", base64: image.toString("base64"),
    }, ctx);
    assert.equal(result.uploadStatus, "Ready");
    assert.equal(row.UploadStatus, "Ready");
    assert.equal(await isPublic({ ...row, EntityType: "Admin" }), true);
    await mutate(result.id, "rename", { fileName: "Celebration image" }, ctx);
    const calls = query.mock.calls;
    if (entityType === "Vendor") {
      const column = purpose === "Logo" ? "LogoUrl" : "CoverImageUrl";
      const projection = calls.find((c) => c.arguments[0].startsWith(`UPDATE dbo.Vendors SET ${column}=`));
      assert.ok(projection.arguments[1].replacements.url.includes(result.id));
      assert.equal(projection.arguments[1].transaction, tx);
    }
    for (const call of calls.filter((c) => c.arguments[0].startsWith("UPDATE dbo.Services"))) {
      assert.doesNotMatch(call.arguments[0], /ApprovalStatus=|IsActive=/);
    }
    for (const call of calls.filter((c) => c.arguments[0].startsWith("UPDATE dbo.Reviews"))) {
      assert.doesNotMatch(call.arguments[0], /ModerationStatus=|IsPublished=/);
    }
  }
});
