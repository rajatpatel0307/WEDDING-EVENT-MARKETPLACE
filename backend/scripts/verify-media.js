// Uses real MSSQL and HTTP. All fixture rows/changes are rolled back; Cloudinary is mocked.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import sharp from "sharp";
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/025-media.js";
import * as media from "../src/modules/media/media.service.js";
import * as reviews from "../src/modules/reviews/reviews.service.js";
import {
  references,
  processCleanup,
} from "../src/modules/media/media.cleanup.js";
import { createMediaRouter } from "../src/modules/media/media.routes.js";
const rollback = new Error("ROLLBACK_MEDIA_FIXTURES");
let passed = false,
  checks = 0;
const equal = (a, b) => {
  assert.equal(a, b);
  checks++;
};
const denies = async (fn, status) => {
  await assert.rejects(fn, (e) => e.status === status);
  checks++;
};
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction,
      originalFetch = globalThis.fetch;
    const env = Object.fromEntries(
      [
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
      ].map((key) => [key, process.env[key]]),
    );
    process.env.CLOUDINARY_CLOUD_NAME = "fixture";
    process.env.CLOUDINARY_API_KEY = "fixture";
    process.env.CLOUDINARY_API_SECRET = "fixture";
    sequelize.query = function (sql, options = {}) {
      return originalQuery
        .call(this, sql, { ...options, transaction: tx })
        .catch((error) => {
          console.error("Failed SQL:", sql);
          throw error;
        });
    };
    sequelize.transaction = async (fn) => fn(tx);
    const ids = Object.fromEntries(
      [
        "owner",
        "other",
        "customer",
        "admin",
        "vendor",
        "service",
        "package",
        "event",
        "booking",
      ].map((k) => [k, randomUUID()]),
    );
    const query = (sql, replacements = {}) =>
      sequelize.query(sql, { replacements });
    const ctx = (id, role) => ({
      auth: {
        user: {
          id,
          active: true,
          emailVerified: true,
          roles: [{ code: role, active: true }],
          vendor: {
            id: ids.vendor,
            active: true,
            verificationStatus: "Approved",
          },
        },
      },
      req: { ip: "127.0.0.1", get: () => "" },
    });
    const vendor = ctx(ids.owner, "VENDOR"),
      foreign = ctx(ids.other, "VENDOR"),
      customer = ctx(ids.customer, "CUSTOMER"),
      admin = ctx(ids.admin, "ADMIN");
    const png = await sharp({
        create: { width: 20, height: 12, channels: 3, background: "#52744c" },
      })
        .png()
        .toBuffer(),
      webp = await sharp(png).webp({ quality: 88 }).toBuffer();
    let uploadCount = 0,
      destroyCount = 0,
      failUpload = false,
      failDelete = false;
    globalThis.fetch = async (url, options = {}) => {
      const value = String(url);
      if (value.startsWith("https://api.cloudinary.com/")) {
        if (value.endsWith("/image/upload")) {
          uploadCount++;
          equal(options.body.get("type"), "authenticated");
          assert.ok(
            options.body.get("public_id").startsWith("wedding-marketplace/"),
          );
          checks++;
          if (failUpload) throw new Error("Simulated provider outage");
          return new Response(
            JSON.stringify({
              public_id: options.body.get("public_id"),
              secure_url: `https://res.cloudinary.com/fixture/image/authenticated/${options.body.get("public_id")}.webp`,
              eager: [],
            }),
          );
        }
        if (value.endsWith("/image/destroy")) {
          destroyCount++;
          return new Response(JSON.stringify({ result: "ok" }), {
            status: failDelete ? 503 : 200,
          });
        }
        throw new Error("Unexpected Cloudinary API request.");
      }
      if (
        value.startsWith(
          "https://res.cloudinary.com/fixture/image/authenticated/",
        )
      ) {
        assert.ok(value.includes("/s--"));
        checks++;
        return new Response(webp, {
          headers: { "content-type": "image/webp" },
        });
      }
      return originalFetch(url, options);
    };
    try {
      await up(sequelize.getQueryInterface(), tx);
      await up(sequelize.getQueryInterface(), tx);
      for (const id of [ids.owner, ids.other, ids.customer, ids.admin])
        await query(
          "INSERT dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Media fixture',:email,'not-a-login-password',1)",
          { id, email: `media-${id}@example.invalid` },
        );
      await query(
        "INSERT dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:id,:owner,'Media verification vendor',:slug,'Approved',1)",
        { id: ids.vendor, owner: ids.owner, slug: `media-${ids.vendor}` },
      );
      const [[category]] = await query(
        "SELECT TOP(1) CategoryId FROM dbo.Categories WHERE IsActive=1",
      );
      await query(
        "INSERT dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,PricingType,BasePrice,ApprovalStatus,IsActive) VALUES(:id,:vendor,:category,'Media verification service',:slug,'Fixed',100,'Draft',0)",
        {
          id: ids.service,
          vendor: ids.vendor,
          category: category.CategoryId,
          slug: `media-${ids.service}`,
        },
      );
      await query(
        "INSERT dbo.ServicePackages(PackageId,ServiceId,PackageName,Price,IsActive) VALUES(:id,:service,'Media verification package',100,1)",
        { id: ids.package, service: ids.service },
      );
      await query(
        "INSERT dbo.Events(EventId,CustomerId,EventName,EventType,EventDate) VALUES(:id,:customer,'Media event','Wedding','2026-10-01')",
        { id: ids.event, customer: ids.customer },
      );
      await query(
        "INSERT dbo.Booking(BookingId,BookingNumber,EventId,CustomerId,VendorId,BookingDate,BookingStatus) VALUES(:id,:number,:event,:customer,:vendor,'2026-10-01','Completed')",
        {
          id: ids.booking,
          number: `M-${ids.booking}`,
          event: ids.event,
          customer: ids.customer,
          vendor: ids.vendor,
        },
      );
      await query(
        "INSERT dbo.BookingItems(BookingId,ServiceId,PackageId,ItemName,UnitPrice) VALUES(:booking,:service,:package,'Historical package',100)",
        { booking: ids.booking, service: ids.service, package: ids.package },
      );
      const body = (entityType, entityId, purpose = "Gallery") => ({
        entityType,
        entityId,
        purpose,
        requestKey: randomUUID(),
        fileName: "celebration.png",
        mimeType: "image/png",
        base64: png.toString("base64"),
      });
      await denies(
        () => media.upload(body("Vendor", ids.vendor), foreign),
        404,
      );
      const logoBody = body("Vendor", ids.vendor, "Logo"),
        logo = await media.upload(logoBody, vendor);
      equal(logo.uploadStatus, "Ready");
      const countBefore = uploadCount;
      equal((await media.upload(logoBody, vendor)).id, logo.id);
      equal(uploadCount, countBefore);
      await denies(
        () => media.upload({ ...logoBody, purpose: "Cover" }, vendor),
        409,
      );
      await assert.rejects(
        () => media.content(logo.id, { auth: null }),
        (e) => e.extensions?.code === "UNAUTHENTICATED",
      );
      checks++;
      await denies(() => media.content(logo.id, foreign), 404);
      equal(
        (await media.content(logo.id, vendor, "thumb")).bytes.equals(webp),
        true,
      );
      await media.mutate(
        logo.id,
        "approve",
        { reason: "Verified business image" },
        admin,
      );
      equal(
        (await media.content(logo.id, { auth: null })).mimeType,
        "image/webp",
      );
      const [[projected]] = await query(
        "SELECT LogoUrl FROM dbo.Vendors WHERE VendorId=:id",
        { id: ids.vendor },
      );
      assert.ok(projected.LogoUrl.includes(logo.id));
      checks++;
      const cover = await media.upload(
          body("Vendor", ids.vendor, "Cover"),
          vendor,
        ),
        gallery = await media.upload(body("Vendor", ids.vendor), vendor);
      await media.mutate(cover.id, "approve", {}, admin);
      await media.mutate(gallery.id, "approve", {}, admin);
      await media.mutate(gallery.id, "primary", {}, vendor);
      equal((await media.details(gallery.id, vendor)).primary, true);
      await media.reorder(
        {
          entityType: "Vendor",
          entityId: ids.vendor,
          ids: [gallery.id, cover.id, logo.id],
        },
        vendor,
      );
      equal((await media.details(gallery.id, vendor)).order, 0);
      await denies(
        () =>
          media.reorder(
            { entityType: "Vendor", entityId: ids.vendor, ids: [gallery.id] },
            vendor,
          ),
        400,
      );
      const replacement = await media.upload(
        { ...body("Vendor", ids.vendor), replaceId: gallery.id },
        vendor,
      );
      equal(Boolean((await media.details(gallery.id, admin)).deletedAt), true);
      equal((await media.details(replacement.id, vendor)).primary, true);
      const serviceImage = await media.upload(
        body("Service", ids.service),
        vendor,
      );
      await media.mutate(serviceImage.id, "approve", {}, admin);
      equal(
        (await media.list({}, null, { type: "Service", id: ids.service }))
          .total,
        0,
      );
      await query(
        "UPDATE dbo.Services SET ApprovalStatus='Approved',IsActive=1 WHERE ServiceId=:id",
        { id: ids.service },
      );
      equal(
        (await media.list({}, null, { type: "Service", id: ids.service }))
          .total,
        1,
      );
      const secondImage = await media.upload(
        body("Service", ids.service),
        vendor,
      );
      const [[withdrawn]] = await query(
        "SELECT ApprovalStatus,IsActive FROM dbo.Services WHERE ServiceId=:id",
        { id: ids.service },
      );
      equal(withdrawn.ApprovalStatus, "Draft");
      equal(withdrawn.IsActive, false);
      await media.mutate(secondImage.id, "approve", {}, admin);
      await query(
        "UPDATE dbo.Services SET ApprovalStatus='Approved',IsActive=1 WHERE ServiceId=:id",
        { id: ids.service },
      );
      const packageImage = await media.upload(
        body("Package", ids.package, "Cover"),
        vendor,
      );
      await media.mutate(packageImage.id, "approve", {}, admin);
      await query(
        "UPDATE dbo.Services SET ApprovalStatus='Approved',IsActive=1 WHERE ServiceId=:id",
        { id: ids.service },
      );
      equal(
        (
          await media.list({}, null, { type: "Package", id: ids.package })
        ).rows[0].id.toLowerCase(),
        packageImage.id.toLowerCase(),
      );
      await denies(
        () => media.upload(body("Package", ids.package), foreign),
        404,
      );
      const review = await reviews.create(
        {
          bookingId: ids.booking,
          rating: 5,
          text: "An excellent celebration and a verified experience.",
        },
        customer,
      );
      const reviewImage = await media.upload(
        body("Review", review.id),
        customer,
      );
      equal(
        (await media.list({}, null, { type: "Review", id: review.id })).total,
        0,
      );
      await reviews.moderate(review.id, "approve", {}, admin);
      equal(
        (await media.list({}, null, { type: "Review", id: review.id })).total,
        1,
      );
      await media.mutate(
        reviewImage.id,
        "hide",
        { reason: "Individual image moderation" },
        admin,
      );
      equal(
        (await reviews.details(review.id, customer)).ModerationStatus,
        "Approved",
      );
      equal(
        (await media.list({}, null, { type: "Review", id: review.id })).total,
        0,
      );
      await media.mutate(reviewImage.id, "restore", {}, admin);
      equal(
        (await reviews.list({}, customer, "Customer")).rows[0].images.length,
        1,
      );
      await denies(() => media.upload(body("Review", review.id), foreign), 404);
      failUpload = true;
      const failed = body("Vendor", ids.vendor);
      await assert.rejects(() => media.upload(failed, vendor));
      checks++;
      failUpload = false;
      const failedRows = await media.list({ uploadStatus: "Failed" }, admin);
      assert.ok(failedRows.rows.length);
      checks++;
      await media.mutate(secondImage.id, "delete", {}, vendor);
      const [[retained]] = await query(
        "SELECT * FROM dbo.Media WHERE MediaId=:id",
        { id: secondImage.id },
      );
      assert.ok(await references(retained));
      checks++;
      const asset = await media.upload(
        body("Admin", ids.admin, "Banner"),
        admin,
      );
      await media.mutate(asset.id, "approve", {}, admin);
      await media.mutate(asset.id, "delete", {}, admin);
      await query(
        "UPDATE dbo.Media SET NextCleanupAt=DATEADD(day,-1,SYSUTCDATETIME()) WHERE MediaId=:id",
        { id: asset.id },
      );
      equal((await processCleanup({ ids: [asset.id] })).candidates.length, 1);
      equal(destroyCount, 0);
      failDelete = true;
      equal((await processCleanup({ apply: true, ids: [asset.id] })).failed, 1);
      failDelete = false;
      await query(
        "UPDATE dbo.Media SET NextCleanupAt=DATEADD(day,-1,SYSUTCDATETIME()) WHERE MediaId=:id",
        { id: asset.id },
      );
      equal(
        (await processCleanup({ apply: true, ids: [asset.id] })).deleted,
        1,
      );
      equal(destroyCount, 2);
      const sharedAsset = await media.upload(
          body("Admin", ids.admin, "General"),
          admin,
        ),
        shadow = randomUUID();
      await query(
        "INSERT dbo.Media(MediaId,EntityType,EntityId,MediaType,MediaUrl,PublicId,StorageKey,ResourceType,DeliveryType,OwnerId,UploadedBy,MediaCategory,FileSize) SELECT :shadow,EntityType,EntityId,MediaType,MediaUrl,PublicId,StorageKey,ResourceType,DeliveryType,OwnerId,UploadedBy,MediaCategory,FileSize FROM dbo.Media WHERE MediaId=:id",
        { shadow, id: sharedAsset.id },
      );
      await media.mutate(sharedAsset.id, "delete", {}, admin);
      const [[sharedRow]] = await query(
        "SELECT * FROM dbo.Media WHERE MediaId=:id",
        { id: sharedAsset.id },
      );
      assert.ok(await references(sharedRow));
      checks++;
      await media.mutate(shadow, "delete", {}, admin);
      await query(
        "UPDATE dbo.Media SET NextCleanupAt=DATEADD(day,-1,SYSUTCDATETIME()) WHERE MediaId IN(:ids)",
        { ids: [sharedAsset.id, shadow] },
      );
      equal(
        (await processCleanup({ apply: true, ids: [sharedAsset.id, shadow] }))
          .deleted,
        2,
      );
      const stats = await media.statistics(admin);
      assert.ok(stats.categories.some((c) => c.category === "Review"));
      checks++;
      const info = await media.details(logo.id, admin);
      assert.ok(info.history.length >= 2);
      checks++;
      const app = express();
      app.use(
        "/api",
        createMediaRouter({
          authenticateRequest: async (req) =>
            req.get("x-test-role") === "admin"
              ? admin.auth
              : req.get("x-test-role") === "vendor"
                ? vendor.auth
                : null,
        }),
      );
      const server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      const base = `http://127.0.0.1:${server.address().port}/api`;
      try {
        const list = await originalFetch(
          `${base}/admin/media?category=Vendor`,
          { headers: { "x-test-role": "admin" } },
        );
        equal(list.status, 200);
        assert.ok((await list.json()).data.rows.length);
        checks++;
        const picture = await originalFetch(
          `${base}/media/${logo.id}/content?variant=thumb`,
        );
        equal(picture.status, 200);
        equal(Buffer.from(await picture.arrayBuffer()).equals(webp), true);
        const summary = await originalFetch(`${base}/admin/media/statistics`, {
          headers: { "x-test-role": "vendor" },
        });
        equal(summary.status, 403);
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
      console.log(
        `Passed ${checks} live MSSQL/HTTP media checks. All fixtures are being rolled back.`,
      );
      passed = true;
    } finally {
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
      globalThis.fetch = originalFetch;
      for (const [key, value] of Object.entries(env)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    console.error(
      "Media verification failed:",
      error.message,
      error.original?.message,
      error.stack?.split("\n").slice(0, 4).join("\n"),
    );
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
if (!passed) process.exitCode = 1;
