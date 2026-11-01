import sharp from "sharp";
// Live MSSQL integration verification. Every fixture and notification is rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { createReviewRouter } from "../src/modules/reviews/reviews.routes.js";
import { sequelize } from "../src/config/database.js";
import * as reviews from "../src/modules/reviews/reviews.service.js";
import { up } from "../migrations/024-reviews.js";
import {
  publicDiscover,
  publicServiceDetails,
} from "../src/modules/customers/workspace.discovery.js";
const rollback = new Error("ROLLBACK_REVIEW_VERIFICATION");
let passed = false,
  checks = 0;
const check = (actual, expected) => {
  assert.equal(actual, expected);
  checks++;
};
const rejected = async (fn, status) => {
  await assert.rejects(fn, (e) => e.status === status);
  checks++;
};
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction,
      originalFetch = globalThis.fetch;
    const cloudEnv = Object.fromEntries(
      [
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
      ].map((k) => [k, process.env[k]]),
    );
    process.env.CLOUDINARY_CLOUD_NAME = "review-fixture";
    process.env.CLOUDINARY_API_KEY = "fixture";
    process.env.CLOUDINARY_API_SECRET = "fixture";
    const photo = await sharp({
      create: { width: 12, height: 12, channels: 3, background: "#43744c" },
    })
      .png()
      .toBuffer();
    const delivered = await sharp(photo).webp({ quality: 88 }).toBuffer();
    let cloudUploads = 0;
    globalThis.fetch = async (url, options) => {
      const value = String(url);
      if (value.startsWith("https://api.cloudinary.com/")) {
        if (value.includes("/image/upload")) {
          cloudUploads++;
          check(options.body.get("type"), "authenticated");
          return new Response(
            JSON.stringify({
              public_id: options.body.get("public_id"),
              secure_url: `https://res.cloudinary.com/review-fixture/image/authenticated/${options.body.get("public_id")}.webp`,
            }),
            { status: 200 },
          );
        }
        if (value.includes("/raw/download"))
          return new Response(photo, { status: 200 });
        if (value.includes("/raw/destroy"))
          return new Response("{}", { status: 200 });
        throw new Error("Unexpected Cloudinary fixture call.");
      }
      if (
        value.startsWith(
          "https://res.cloudinary.com/review-fixture/image/authenticated/",
        )
      )
        return new Response(delivered);
      return originalFetch(url, options);
    };
    sequelize.query = function (sql, options = {}) {
      return originalQuery.call(this, sql, { ...options, transaction: tx });
    };
    sequelize.transaction = async (fn) => fn(tx);
    const ids = Object.fromEntries(
      [
        "customer",
        "other",
        "owner",
        "admin",
        "vendor",
        "otherVendor",
        "service",
        "secondService",
        "package",
        "event",
        "booking",
        "cancelled",
      ].map((k) => [k, randomUUID()]),
    );
    const query = (sql, replacements = {}) =>
      sequelize.query(sql, { replacements });
    const user = (id, role) => ({
      id,
      active: true,
      emailVerified: true,
      roles: [{ code: role, active: true }],
      ...(role === "VENDOR"
        ? {
            vendor: {
              id: ids.vendor,
              active: true,
              verificationStatus: "Approved",
            },
          }
        : {}),
    });
    const ctx = (id, role) => ({
      auth: { user: user(id, role) },
      req: { ip: "127.0.0.1", get: () => "" },
    });
    const customer = ctx(ids.customer, "CUSTOMER"),
      other = ctx(ids.other, "CUSTOMER"),
      vendor = ctx(ids.owner, "VENDOR"),
      admin = ctx(ids.admin, "ADMIN");
    const foreignVendor = {
      ...vendor,
      auth: {
        user: {
          ...vendor.auth.user,
          vendor: {
            id: ids.otherVendor,
            active: true,
            verificationStatus: "Approved",
          },
        },
      },
    };
    try {
      // Exercise migration idempotency against the actual schema.
      await up(sequelize.getQueryInterface(), tx);
      await up(sequelize.getQueryInterface(), tx);
      for (const id of [ids.customer, ids.other, ids.owner, ids.admin])
        await query(
          "INSERT dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Review fixture',:email,'not-a-login-password',1)",
          { id, email: `review-${id}@example.invalid` },
        );
      await query(
        "INSERT dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:id,:owner,'Review fixture',:slug,'Approved',1)",
        { id: ids.vendor, owner: ids.owner, slug: `reviews-${ids.vendor}` },
      );
      const [[category]] = await query(
        "SELECT TOP(1) CategoryId FROM dbo.Categories WHERE IsActive=1",
      );
      for (const id of [ids.service, ids.secondService])
        await query(
          "INSERT dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,PricingType,BasePrice,ApprovalStatus,IsActive) VALUES(:id,:vendor,:category,'Review test service',:slug,'Fixed',100,'Approved',1)",
          {
            id,
            vendor: ids.vendor,
            category: category.CategoryId,
            slug: `reviews-${id}`,
          },
        );
      await query(
        "INSERT dbo.ServicePackages(PackageId,ServiceId,PackageName,Price,IsActive) VALUES(:id,:service,'Review package',100,1)",
        { id: ids.package, service: ids.service },
      );
      await query(
        "INSERT dbo.Events(EventId,CustomerId,EventName,EventType,EventDate) VALUES(:id,:customer,'Review test event','Wedding','2026-10-01')",
        { id: ids.event, customer: ids.customer },
      );
      for (const id of [ids.booking, ids.cancelled])
        await query(
          "INSERT dbo.Booking(BookingId,BookingNumber,EventId,CustomerId,VendorId,BookingDate,BookingStatus) VALUES(:id,:number,:event,:customer,:vendor,'2026-10-01',:status)",
          {
            id,
            number: `RV-${id}`,
            event: ids.event,
            customer: ids.customer,
            vendor: ids.vendor,
            status: id === ids.booking ? "Completed" : "Cancelled",
          },
        );
      const [[item]] = await query(
        "INSERT dbo.BookingItems(BookingId,ServiceId,PackageId,ItemName,UnitPrice) OUTPUT inserted.BookingItemId AS id VALUES(:booking,:service,:package,'Test package',100)",
        { booking: ids.booking, service: ids.service, package: ids.package },
      );
      const [[second]] = await query(
        "INSERT dbo.BookingItems(BookingId,ServiceId,ItemName,UnitPrice) OUTPUT inserted.BookingItemId AS id VALUES(:booking,:service,'Second service',100)",
        { booking: ids.booking, service: ids.secondService },
      );
      const body = {
        bookingId: ids.booking,
        rating: 5,
        title: "Great celebration",
        text: "Professional service and excellent communication.",
      };
      await rejected(() => reviews.create(body, other), 404);
      await rejected(
        () => reviews.create({ ...body, bookingId: ids.cancelled }, customer),
        409,
      );
      await rejected(
        () => reviews.create({ ...body, bookingItemId: 999999999 }, customer),
        404,
      );
      const r = await reviews.create(body, customer);
      await rejected(() => reviews.create(body, customer), 409);
      check(
        (
          await reviews.list({}, null, "Public", {
            type: "vendor",
            id: ids.vendor,
          })
        ).total,
        0,
      );
      check(
        Number(
          (await reviews.summary({ type: "vendor", id: ids.vendor }))
            .totalReviews,
        ),
        0,
      );
      check(
        (await reviews.list({}, customer, "Customer")).rows[0].status,
        "Pending",
      );
      await reviews.moderate(r.id, "approve", {}, admin);
      check(
        Number(
          (await reviews.summary({ type: "vendor", id: ids.vendor }))
            .averageRating,
        ),
        5,
      );
      check(
        Number(
          (await reviews.summary({ type: "service", id: ids.service }))
            .totalReviews,
        ),
        0,
      );
      const published = (
        await reviews.list({}, null, "Public", {
          type: "vendor",
          id: ids.vendor,
        })
      ).rows[0];
      check(Object.hasOwn(published, "reason"), false);
      check(Object.hasOwn(published, "bookingId"), false);
      await rejected(
        () =>
          reviews.respond(
            r.id,
            { text: "Thank you for choosing us." },
            foreignVendor,
          ),
        404,
      );
      await reviews.respond(
        r.id,
        { text: "Thank you for celebrating with us." },
        vendor,
        false,
        "POST",
      );
      await rejected(
        () =>
          reviews.respond(
            r.id,
            { text: "Duplicate response." },
            vendor,
            false,
            "POST",
          ),
        409,
      );
      check(
        Boolean(
          (
            await reviews.list({}, null, "Public", {
              type: "vendor",
              id: ids.vendor,
            })
          ).rows[0].response,
        ),
        true,
      );
      await assert.rejects(
        () =>
          reviews.edit(
            r.id,
            { rating: 1, text: "Attempted vendor modification" },
            vendor,
          ),
        (e) => e.extensions?.code === "FORBIDDEN",
      );
      checks++;
      await reviews.report(r.id, { reason: "Spam" }, other);
      await rejected(
        () => reviews.report(r.id, { reason: "Spam" }, other),
        409,
      );
      check(
        Number(
          (await reviews.summary({ type: "vendor", id: ids.vendor }))
            .averageRating,
        ),
        5,
      );
      const reports = await reviews.reports({}, admin),
        report = reports.rows.find(
          (x) => x.ReviewId.toLowerCase() === r.id.toLowerCase(),
        );
      await reviews.resolveReport(
        report.ReportId,
        "dismiss",
        { reason: "Verified experience" },
        admin,
      );
      check(
        Number(
          (await reviews.summary({ type: "vendor", id: ids.vendor }))
            .totalReviews,
        ),
        1,
      );
      const response = (
        await reviews.list({}, null, "Public", {
          type: "vendor",
          id: ids.vendor,
        })
      ).rows[0].response;
      await reviews.report(
        r.id,
        { reason: "Abusive language", responseId: response.id },
        other,
      );
      await reviews.moderateResponse(
        r.id,
        { reason: "Inappropriate response" },
        admin,
      );
      check(
        (
          await reviews.list({}, null, "Public", {
            type: "vendor",
            id: ids.vendor,
          })
        ).rows[0].response,
        null,
      );
      await reviews.moderate(
        r.id,
        "hide",
        { reason: "Under investigation" },
        admin,
      );
      check(
        Number(
          (await reviews.summary({ type: "vendor", id: ids.vendor }))
            .totalReviews,
        ),
        0,
      );
      await reviews.moderate(r.id, "restore", {}, admin);
      await reviews.edit(
        r.id,
        { rating: 4, text: "Updated detailed experience with this vendor." },
        customer,
      );
      check(
        Number(
          (await reviews.summary({ type: "vendor", id: ids.vendor }))
            .totalReviews,
        ),
        0,
      );
      await reviews.moderate(
        r.id,
        "reject",
        { reason: "Needs further verification" },
        admin,
      );
      check((await reviews.details(r.id, admin, "Admin")).history.length, 4);
      await reviews.addNote(
        r.id,
        { notes: "Private moderation investigation note" },
        admin,
      );
      check(
        (await reviews.details(r.id, admin, "Admin")).history[0].InternalNotes,
        "Private moderation investigation note",
      );
      check(
        Object.hasOwn(await reviews.details(r.id, customer), "history"),
        false,
      );
      await reviews.moderate(r.id, "approve", {}, admin);
      const serviceReview = await reviews.create(
        { ...body, bookingItemId: Number(item.id), rating: 3 },
        customer,
      );
      await reviews.moderate(serviceReview.id, "approve", {}, admin);
      check(
        Number(
          (await reviews.summary({ type: "vendor", id: ids.vendor }))
            .averageRating,
        ),
        4,
      );
      check(
        Number(
          (await reviews.summary({ type: "service", id: ids.service }))
            .averageRating,
        ),
        3,
      );
      check(
        Number(
          (await reviews.summary({ type: "package", id: ids.package }))
            .averageRating,
        ),
        3,
      );
      check(
        Number(
          (await reviews.summary({ type: "service", id: ids.secondService }))
            .totalReviews,
        ),
        0,
      );
      const secondReview = await reviews.create(
        {
          ...body,
          bookingItemId: Number(second.id),
          rating: 2,
          images: [
            {
              name: "celebration.png",
              mimeType: "image/png",
              base64: photo.toString("base64"),
            },
          ],
        },
        customer,
      );
      const mine = (await reviews.list({}, customer, "Customer")).rows.find(
        (row) => row.id === secondReview.id,
      );
      check(mine.images.length, 1);
      check(cloudUploads, 1);
      await assert.rejects(
        () => reviews.image(mine.images[0].id, { auth: null }),
        (e) => e.extensions?.code === "UNAUTHENTICATED",
      );
      checks++;
      await rejected(() => reviews.image(mine.images[0].id, other), 404);
      check(
        (await reviews.image(mine.images[0].id, customer)).mimeType,
        "image/webp",
      );
      await reviews.moderate(secondReview.id, "approve", {}, admin);
      check(
        (await reviews.image(mine.images[0].id, { auth: null })).bytes.equals(
          delivered,
        ),
        true,
      );
      const catalog = await publicDiscover({
        type: "packages",
        q: "Review package",
      });
      check(
        Number(
          catalog.rows.find((p) => p.id.toLowerCase() === ids.package).rating,
        ),
        3,
      );
      const servicePage = await publicServiceDetails(ids.secondService, false);
      check(Number(servicePage.service.rating), 2);
      check(servicePage.reviews.length, 1);
      const app = express();
      app.use(
        "/api",
        createReviewRouter({
          authenticateRequest: async (req) =>
            req.get("x-review-test") === "admin"
              ? admin.auth
              : req.get("x-review-test") === "customer"
                ? customer.auth
                : null,
        }),
      );
      const server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      const base = `http://127.0.0.1:${server.address().port}/api`;
      try {
        const publicResult = await originalFetch(
          `${base}/services/${ids.service}/reviews`,
        );
        check(publicResult.status, 200);
        check((await publicResult.json()).data.rows.length, 1);
        const adminResult = await originalFetch(
          `${base}/admin/reviews?vendorId=${ids.vendor}`,
          { headers: { "x-review-test": "admin" } },
        );
        check((await adminResult.json()).data.total, 3);
        const metadata = await originalFetch(`${base}/admin/reviews/filters`, {
          headers: { "x-review-test": "admin" },
        });
        check(
          (await metadata.json()).data.vendors.some(
            (v) => v.id.toLowerCase() === ids.vendor,
          ),
          true,
        );
        const imageResult = await originalFetch(
          `${base}/review-images/${mine.images[0].id}`,
        );
        check(imageResult.status, 200);
        check(
          Buffer.from(await imageResult.arrayBuffer()).equals(delivered),
          true,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
      const [[notificationBefore]] = await query(
        "SELECT COUNT(*) AS count FROM dbo.Notifications WHERE ReferenceId=:id",
        { id: secondReview.id },
      );
      await reviews.moderate(secondReview.id, "approve", {}, admin);
      const [[notificationAfter]] = await query(
        "SELECT COUNT(*) AS count FROM dbo.Notifications WHERE ReferenceId=:id",
        { id: secondReview.id },
      );
      check(notificationBefore.count, notificationAfter.count);
      await reviews.moderate(
        secondReview.id,
        "hide",
        { reason: "Image moderation test" },
        admin,
      );
      await assert.rejects(
        () => reviews.image(mine.images[0].id, { auth: null }),
        (e) => e.extensions?.code === "UNAUTHENTICATED",
      );
      checks++;
      await reviews.moderate(secondReview.id, "restore", {}, admin);
      check(
        (await reviews.list({ page: 1, pageSize: 1 }, customer, "Customer"))
          .rows.length,
        1,
      );
      check((await reviews.list({ rating: 3 }, customer, "Customer")).total, 1);
      check(
        (await reviews.list({ status: "Pending" }, admin, "Admin")).rows.some(
          (x) => x.id.toLowerCase() === r.id.toLowerCase(),
        ),
        false,
      );
      const [[notifications]] = await query(
        "SELECT COUNT(*) AS count FROM dbo.Notifications WHERE ReferenceType='Review' AND ReferenceId=:id",
        { id: r.id },
      );
      assert.ok(notifications.count >= 6);
      checks++;
      await reviews.edit(r.id, null, customer, true);
      check(
        Number(
          (await reviews.summary({ type: "vendor", id: ids.vendor }))
            .totalReviews,
        ),
        0,
      );
      const [[cache]] = await query(
        "SELECT AverageRating,TotalReviews FROM dbo.Vendors WHERE VendorId=:id",
        { id: ids.vendor },
      );
      check(Number(cache.TotalReviews), 0);
      check(Number(cache.AverageRating), 0);
      await rejected(() => reviews.moderate(r.id, "restore", {}, admin), 409);
      const analytics = await reviews.analytics(admin);
      assert.ok(analytics.counts.length > 0);
      checks++;
      console.log(
        `Passed ${checks} live MSSQL review checks; rolling back all fixtures.`,
      );
      passed = true;
    } finally {
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
      globalThis.fetch = originalFetch;
      for (const [key, value] of Object.entries(cloudEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    console.error(
      "Review verification failed:",
      error.message,
      error.original?.message,
    );
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
if (!passed) process.exitCode = 1;
