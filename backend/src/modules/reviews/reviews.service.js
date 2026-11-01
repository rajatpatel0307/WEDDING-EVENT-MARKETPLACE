import { randomUUID } from "node:crypto";
import { z } from "zod";
import * as db from "./reviews.repository.js";
import * as v from "./reviews.validation.js";
import {
  requireAuth,
  requireRole,
  requireApprovedVendor,
} from "../../middleware/auth.middleware.js";
import {
  assertEligibility,
  editAllowed,
  publicPredicate,
  sameId,
} from "./reviews.policy.js";
import { createNotification } from "../notifications/notification-center.service.js";
import { validateFile } from "../media/cloudinary.service.js";

const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const insert = async (table, id, values, tx) =>
  (await db.insert({ table, id }, values, tx))[0];
const update = (table, id, key, values, tx) =>
  db.update({ table, id }, key, values, tx);
const audit = (ctx, action, id, old, next, tx) =>
  db.auditAdmin(
    ctx,
    `REVIEW_${action}`,
    "Reviews",
    id,
    old ?? null,
    next ?? null,
    tx,
  );
const notify = (userId, title, id, tx) =>
  createNotification(
    { userId, title, message: title, referenceType: "Review", referenceId: id },
    tx,
  );
const who = (ctx, role) =>
  role === "Admin"
    ? requireRole(ctx, "ADMIN")
    : role === "Vendor"
      ? requireApprovedVendor(ctx)
      : requireRole(ctx, "CUSTOMER");
async function lock(id, tx) {
  z.guid().parse(id);
  if (tx) {
    const [target] = await db.select(
      "SELECT VendorId FROM dbo.Reviews WHERE ReviewId=:id",
      { id },
      tx,
    );
    if (!target) fail("Review not found.", 404);
    // Every mutation acquires the vendor lock before a review lock. Reversing
    // this order can deadlock two edits while their rating aggregates are read.
    await db.select(
      "SELECT VendorId FROM dbo.Vendors WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:vendorId",
      { vendorId: target.VendorId },
      tx,
    );
  }
  const [r] = await db.select(
    `SELECT * FROM dbo.Reviews ${tx ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE ReviewId=:id`,
    { id },
    tx,
  );
  if (!r) fail("Review not found.", 404);
  return r;
}
export async function reconcile(vendorId, tx) {
  // Lock the vendor before reading the aggregate, serializing concurrent changes.
  await db.select(
    "SELECT VendorId FROM dbo.Vendors WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:vendorId",
    { vendorId },
    tx,
  );
  await db.select(
    `UPDATE dbo.Vendors SET AverageRating=(SELECT COALESCE(AVG(CAST(r.Rating AS decimal(10,2))),0) FROM dbo.Reviews r WHERE r.VendorId=:vendorId AND r.BookingItemId IS NULL AND ${publicPredicate()}),TotalReviews=(SELECT COUNT(*) FROM dbo.Reviews r WHERE r.VendorId=:vendorId AND r.BookingItemId IS NULL AND ${publicPredicate()}) WHERE VendorId=:vendorId`,
    { vendorId },
    tx,
  );
}
export async function eligible(ctx) {
  const user = who(ctx, "Customer");
  return db.select(
    `SELECT b.BookingId AS bookingId,b.BookingNumber AS number,b.VendorId AS vendorId,v.BusinessName AS vendor,bi.BookingItemId AS bookingItemId,bi.ItemName AS service FROM dbo.Booking b JOIN dbo.Vendors v ON v.VendorId=b.VendorId LEFT JOIN dbo.BookingItems bi ON bi.BookingId=b.BookingId JOIN dbo.Services s ON s.ServiceId=bi.ServiceId AND s.VendorId=b.VendorId WHERE b.CustomerId=:user AND b.BookingStatus='Completed' ORDER BY b.CreatedAt DESC`,
    { user: user.id },
  );
}
export function validateImages(images) {
  for (const img of images) {
    const file = validateFile(img.base64, true);
    if (
      file.bytes.length > 2 * 1024 * 1024 ||
      file.mimeType !== img.mimeType ||
      !(
        file.extension === "jpg"
          ? /\.jpe?g$/i
          : file.extension === "webp"
            ? /\.webp$/i
            : /\.png$/i
      ).test(img.name)
    )
      fail("Images must match their PNG/JPEG content and be under 2 MB.");
  }
}
async function saveImages(id, b, tx, _uploaded, ctx) {
  const { upload, retentionDate } = await import("../media/media.service.js");
  const existing = await db.select(
    "SELECT i.ReviewImageId,i.MediaId FROM dbo.ReviewImages i LEFT JOIN dbo.Media m ON m.MediaId=i.MediaId WHERE i.ReviewId=:id AND (m.MediaId IS NULL OR m.DeletedAt IS NULL)",
    { id },
    tx,
  );
  if (
    b.keepImageIds.some(
      (key) => !existing.some((i) => sameId(i.ReviewImageId, key)),
    )
  )
    fail("Invalid review image.");
  if (b.keepImageIds.length + b.images.length > 5)
    fail("A review can have at most five images.");
  for (const image of existing)
    if (!b.keepImageIds.some((key) => sameId(key, image.ReviewImageId))) {
      if (image.MediaId)
        await db.update(
          { table: "Media", id: "MediaId" },
          image.MediaId,
          {
            DeletedAt: new Date(),
            IsPrimary: 0,
            CleanupStatus: "Pending",
            NextCleanupAt: retentionDate(),
            UpdatedAt: new Date(),
          },
          tx,
        );
    }
  for (const img of b.images) {
    const requestKey = randomUUID();
    try {
      await upload(
        {
          entityType: "Review",
          entityId: id,
          purpose: "Gallery",
          requestKey,
          fileName: img.name,
          mimeType: img.mimeType,
          base64: img.base64,
        },
        ctx,
        tx,
      );
    } finally {
      const [row] = await db.select(
        "SELECT * FROM dbo.Media WHERE RequestKey=:key AND UploadedBy=:user",
        { key: requestKey, user: ctx.auth.user.id },
        tx,
      );
      if (row) _uploaded.push(row);
    }
  }
}
const values = (b) => ({
  Rating: b.rating,
  ReviewTitle: b.title || null,
  ReviewText: b.text,
  ServiceQualityRating: b.serviceQualityRating ?? null,
  CommunicationRating: b.communicationRating ?? null,
  ValueForMoneyRating: b.valueForMoneyRating ?? null,
  ProfessionalismRating: b.professionalismRating ?? null,
});
export async function create(input, ctx) {
  const user = who(ctx, "Customer"),
    b = v.createInput.parse(input);
  validateImages(b.images);
  if (b.keepImageIds.length)
    fail("Existing images cannot be attached to a new review.");
  const uploaded = [];
  try {
    return await db.transaction(async (tx) => {
      const [booking] = await db.select(
        "SELECT * FROM dbo.Booking WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=:id",
        { id: b.bookingId },
        tx,
      );
      let item = null;
      if (b.bookingItemId)
        [item] = await db.select(
          "SELECT bi.*,s.VendorId FROM dbo.BookingItems bi JOIN dbo.Services s ON s.ServiceId=bi.ServiceId WHERE bi.BookingItemId=:id",
          { id: b.bookingItemId },
          tx,
        );
      if (b.bookingItemId && !item) fail("Booking item not found.", 404);
      assertEligibility(booking, user.id, item);
      const [old] = await db.select(
        "SELECT ReviewId FROM dbo.Reviews WHERE BookingId=:booking AND (BookingItemId=:item OR (BookingItemId IS NULL AND :item IS NULL))",
        { booking: b.bookingId, item: b.bookingItemId ?? null },
        tx,
      );
      if (old) fail("This booking target has already been reviewed.", 409);
      const r = await insert(
        "Reviews",
        "ReviewId",
        {
          BookingId: booking.BookingId,
          CustomerId: user.id,
          VendorId: item?.VendorId || booking.VendorId,
          BookingItemId: b.bookingItemId ?? null,
          ServiceId: item?.ServiceId ?? null,
          PackageId: item?.PackageId ?? null,
          ...values(b),
          IsVerified: 1,
          IsPublished: 0,
          ModerationStatus: "Pending",
        },
        tx,
      );
      await saveImages(r.id, b, tx, uploaded, ctx);
      await audit(
        ctx,
        "SUBMITTED",
        r.id,
        null,
        {
          ...values(b),
          bookingId: b.bookingId,
          bookingItemId: b.bookingItemId ?? null,
        },
        tx,
      );
      await notify(user.id, "Review submitted for moderation", r.id, tx);
      const [vendor] = await db.select(
        "SELECT UserId FROM dbo.Vendors WHERE VendorId=:id",
        { id: booking.VendorId },
        tx,
      );
      await notify(vendor.UserId, "New review awaiting moderation", r.id, tx);
      return {
        id: r.id,
        message: "Thank you. Your review is awaiting moderation.",
      };
    });
  } catch (error) {
    const { queueRolledBack } = await import("../media/media.service.js");
    await queueRolledBack(uploaded).catch(() =>
      console.error("Media rollback cleanup could not be queued."),
    );
    throw error;
  }
}
export async function edit(id, input, ctx, remove = false) {
  const user = who(ctx, "Customer"),
    b = remove ? null : v.contentInput.parse(input);
  if (b) validateImages(b.images);
  const uploaded = [];
  try {
    return await db.transaction(async (tx) => {
      const r = await lock(id, tx);
      if (!sameId(r.CustomerId, user.id)) fail("Review not found.", 404);
      if (r.DeletedAt) fail("Review already deleted.", 409);
      if (!remove && !editAllowed(r))
        fail("The review editing window is closed.", 409);
      const next = remove
        ? { DeletedAt: new Date(), IsPublished: 0 }
        : {
            ...values(b),
            ModerationStatus: "Pending",
            IsPublished: 0,
            ModeratedBy: null,
            ModeratedAt: null,
            ModerationReason: null,
          };
      await update(
        "Reviews",
        "ReviewId",
        id,
        { ...next, UpdatedAt: new Date() },
        tx,
      );
      if (b) await saveImages(id, b, tx, uploaded, ctx);
      if (remove)
        await db.select(
          "UPDATE dbo.Media SET DeletedAt=SYSUTCDATETIME(),IsPrimary=0,CleanupStatus='Pending',NextCleanupAt=:cleanupAt WHERE EntityType='Review' AND EntityId=:id AND DeletedAt IS NULL",
          {
            id,
            cleanupAt: (
              await import("../media/media.service.js")
            ).retentionDate(),
          },
          tx,
        );
      await audit(ctx, remove ? "DELETED" : "EDITED", id, r, next, tx);
      await reconcile(r.VendorId, tx);
      if (!remove) {
        const [vendor] = await db.select(
          "SELECT UserId FROM dbo.Vendors WHERE VendorId=:id",
          { id: r.VendorId },
          tx,
        );
        await notify(
          vendor.UserId,
          "Customer updated a review; moderation pending",
          id,
          tx,
        );
      }
      return {
        message: remove
          ? "Review deleted."
          : "Review updated and sent for moderation.",
      };
    });
  } catch (error) {
    const { queueRolledBack } = await import("../media/media.service.js");
    await queueRolledBack(uploaded).catch(() =>
      console.error("Media rollback cleanup could not be queued."),
    );
    throw error;
  }
}
function filter(input, role, user, target) {
  const b = v.listInput.parse(input),
    p = {
      ...b,
      offset: (b.page - 1) * b.pageSize,
      size: b.pageSize,
      search: `%${b.q.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`,
    };
  const clauses = [];
  if (role === "Public") clauses.push(publicPredicate());
  else if (role === "Customer") {
    clauses.push("r.CustomerId=:owner");
    p.owner = user.id;
  } else if (role === "Vendor") {
    clauses.push("r.VendorId=:owner", publicPredicate());
    p.owner = user.vendor.id;
  }
  if (b.status) clauses.push("r.ModerationStatus=:status");
  if (b.rating) clauses.push("r.Rating=:rating");
  if (b.vendorId) clauses.push("r.VendorId=:vendorId");
  if (b.serviceId) clauses.push("r.ServiceId=:serviceId");
  if (b.categoryId)
    clauses.push(
      "(EXISTS(SELECT 1 FROM dbo.Services fs WHERE fs.ServiceId=r.ServiceId AND fs.CategoryId=:categoryId) OR (r.ServiceId IS NULL AND EXISTS(SELECT 1 FROM dbo.VendorCategories vc WHERE vc.VendorId=r.VendorId AND vc.CategoryId=:categoryId)))",
    );
  if (b.from) clauses.push("r.CreatedAt>=:from");
  if (b.to) clauses.push("r.CreatedAt<DATEADD(day,1,CAST(:to AS date))");
  if (b.q)
    clauses.push(
      "(r.ReviewText LIKE :search OR r.ReviewTitle LIKE :search OR v.BusinessName LIKE :search OR CONCAT(u.FirstName,' ',u.LastName) LIKE :search OR s.ServiceName LIKE :search)",
    );
  if (b.reported === "true")
    clauses.push(
      "EXISTS(SELECT 1 FROM dbo.ReviewReports rr WHERE rr.ReviewId=r.ReviewId AND rr.ReportStatus='Pending')",
    );
  if (target) {
    const col = {
      vendor: "VendorId",
      service: "ServiceId",
      package: "PackageId",
    }[target.type];
    if (!col) fail("Invalid target.");
    z.guid().parse(target.id);
    clauses.push(`r.${col}=:target`);
    p.target = target.id;
    if (target.type === "vendor") clauses.push("r.BookingItemId IS NULL");
  }
  if (role !== "Admin") clauses.push("r.DeletedAt IS NULL");
  return { b, p, where: clauses.join(" AND ") || "1=1" };
}
const source =
  "FROM dbo.Reviews r JOIN dbo.Users u ON u.UserId=r.CustomerId JOIN dbo.Vendors v ON v.VendorId=r.VendorId LEFT JOIN dbo.Services s ON s.ServiceId=r.ServiceId LEFT JOIN dbo.ServicePackages p ON p.PackageId=r.PackageId";
async function enrich(rows, role) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const images = await db.select(
    "SELECT i.ReviewId AS reviewId,i.ReviewImageId AS id,i.ImageName AS name FROM dbo.ReviewImages i JOIN dbo.Media m ON m.MediaId=i.MediaId WHERE i.ReviewId IN(:ids) AND m.DeletedAt IS NULL AND m.UploadStatus='Ready' AND m.ModerationStatus='Approved' ORDER BY m.SortOrder,i.ReviewImageId",
    { ids },
  );
  const responses = await db.select(
    `SELECT ReviewId AS reviewId,ResponseId AS id,ResponseText AS text,CreatedAt AS createdAt,UpdatedAt AS updatedAt,ModerationStatus AS status FROM dbo.VendorReviewResponses WHERE ReviewId IN(:ids) AND DeletedAt IS NULL ${["Public", "Customer"].includes(role) ? "AND ModerationStatus='Approved'" : ""}`,
    { ids },
  );
  for (const r of rows) {
    r.canEdit = role === "Customer" && editAllowed(r);
    r.images = images
      .filter((i) => sameId(i.reviewId, r.id))
      .map((i) => ({ id: i.id, name: i.name }));
    const response = responses.find((response) =>
      sameId(response.reviewId, r.id),
    );
    r.response = response
      ? {
          id: response.id,
          text: response.text,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          status: response.status,
        }
      : null;
  }
  return rows;
}
export async function list(input, ctx, role = "Public", target) {
  const user = role === "Public" ? null : who(ctx, role),
    { b, p, where } = filter(input, role, user, target);
  const [count] = await db.select(
    `SELECT COUNT_BIG(*) AS total ${source} WHERE ${where}`,
    p,
  );
  const rows = await db.select(
    `SELECT r.ReviewId AS id,r.BookingId AS bookingId,r.BookingItemId AS bookingItemId,r.ServiceId AS serviceId,r.VendorId AS vendorId,r.Rating AS rating,r.ReviewTitle AS title,r.ReviewText AS text,r.CreatedAt AS createdAt,r.UpdatedAt AS updatedAt,r.ModerationStatus AS status,r.IsVerified AS verified,r.ModerationReason AS reason,r.ServiceQualityRating AS serviceQualityRating,r.CommunicationRating AS communicationRating,r.ValueForMoneyRating AS valueForMoneyRating,r.ProfessionalismRating AS professionalismRating,r.CreatedAt,r.DeletedAt,r.ModerationStatus,CONCAT(u.FirstName,' ',LEFT(u.LastName,1)) AS customer,v.BusinessName AS vendor,s.ServiceName AS service,p.PackageName AS package ${source} WHERE ${where} ORDER BY r.CreatedAt DESC,r.ReviewId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    p,
  );
  await enrich(rows, role);
  for (const row of rows) {
    if (role === "Admin") row.deleted = Boolean(row.DeletedAt);
    delete row.CreatedAt;
    delete row.DeletedAt;
    delete row.ModerationStatus;
    if (role === "Public") {
      delete row.reason;
      delete row.bookingId;
      delete row.bookingItemId;
      delete row.status;
      delete row.canEdit;
    }
  }
  return {
    rows,
    total: Number(count.total),
    page: b.page,
    pageSize: b.pageSize,
  };
}
export async function details(id, ctx, role = "Customer") {
  const user = who(ctx, role),
    r = await lock(id);
  if (
    (role === "Customer" && !sameId(r.CustomerId, user.id)) ||
    (role === "Vendor" && !sameId(r.VendorId, user.vendor.id))
  )
    fail("Review not found.", 404);
  const [row] = await enrich([{ ...r, id: r.ReviewId }], role);
  if (role === "Admin") {
    const [info] = await db.select(
      "SELECT CONCAT(u.FirstName,' ',u.LastName) AS CustomerName,u.Email AS CustomerEmail,v.BusinessName AS VendorName,b.BookingNumber,s.ServiceName FROM dbo.Reviews r JOIN dbo.Users u ON u.UserId=r.CustomerId JOIN dbo.Vendors v ON v.VendorId=r.VendorId JOIN dbo.Booking b ON b.BookingId=r.BookingId LEFT JOIN dbo.Services s ON s.ServiceId=r.ServiceId WHERE r.ReviewId=:id",
      { id },
    );
    Object.assign(row, info);
    row.history = await db.select(
      "SELECT * FROM dbo.ReviewModerationHistory WHERE ReviewId=:id ORDER BY CreatedAt DESC",
      { id },
    );
    row.audit = await db.select(
      "SELECT ActionType,OldValue,NewValue,UserId,CreatedAt FROM dbo.AuditLogs WHERE EntityType='Reviews' AND EntityId=:id ORDER BY CreatedAt DESC",
      { id },
    );
  }
  return row;
}
export async function summary(target, ctx, role = "Public") {
  if (role === "Vendor") {
    const user = who(ctx, role);
    target = { type: "vendor", id: user.vendor.id };
  }
  const { p, where } = filter({}, "Public", null, target);
  const [stats] = await db.select(
    `SELECT COALESCE(AVG(CAST(r.Rating AS decimal(10,2))),0) AS averageRating,COUNT_BIG(*) AS totalReviews,COUNT_BIG(*) AS verifiedReviews FROM dbo.Reviews r JOIN dbo.Vendors v ON v.VendorId=r.VendorId WHERE ${where}`,
    p,
  );
  const distribution = await db.select(
    `SELECT r.Rating AS rating,COUNT_BIG(*) AS count FROM dbo.Reviews r JOIN dbo.Vendors v ON v.VendorId=r.VendorId WHERE ${where} GROUP BY r.Rating`,
    p,
  );
  const trends = await db.select(
    `SELECT CONVERT(char(7),r.CreatedAt,126) AS month,COUNT_BIG(*) AS count,AVG(CAST(r.Rating AS decimal(10,2))) AS rating FROM dbo.Reviews r JOIN dbo.Vendors v ON v.VendorId=r.VendorId WHERE ${where} GROUP BY CONVERT(char(7),r.CreatedAt,126) ORDER BY month DESC`,
    p,
  );
  const [responses] = await db.select(
    `SELECT COUNT_BIG(*) AS count FROM dbo.Reviews r JOIN dbo.Vendors v ON v.VendorId=r.VendorId WHERE ${where} AND EXISTS(SELECT 1 FROM dbo.VendorReviewResponses vr WHERE vr.ReviewId=r.ReviewId AND vr.DeletedAt IS NULL AND vr.ModerationStatus='Approved')`,
    p,
  );
  const services =
    role === "Vendor"
      ? await db.select(
          `SELECT r.ServiceId AS id,s.ServiceName AS name,AVG(CAST(r.Rating AS decimal(10,2))) AS rating,COUNT_BIG(*) AS count FROM dbo.Reviews r JOIN dbo.Services s ON s.ServiceId=r.ServiceId WHERE r.VendorId=:id AND ${publicPredicate()} GROUP BY r.ServiceId,s.ServiceName`,
          { id: target.id },
        )
      : [];
  return {
    ...stats,
    distribution,
    trends,
    services,
    responseRate: Number(stats.totalReviews)
      ? (Number(responses.count) / Number(stats.totalReviews)) * 100
      : 0,
  };
}
export async function moderate(id, action, input, ctx) {
  const admin = who(ctx, "Admin"),
    b = v.moderationInput.parse(input),
    status = {
      approve: "Approved",
      reject: "Rejected",
      hide: "Hidden",
      restore: "Approved",
      flag: "Flagged",
    }[action];
  if (!status) fail("Invalid moderation action.");
  if (["Rejected", "Hidden", "Flagged"].includes(status) && !b.reason)
    fail("A moderation reason is required.");
  return db.transaction(async (tx) => {
    const r = await lock(id, tx);
    if (r.DeletedAt) fail("Deleted reviews cannot be published.", 409);
    if (r.ModerationStatus === status)
      return { message: "Review already has this status." };
    const [booking] = await db.select(
      "SELECT * FROM dbo.Booking WHERE BookingId=:id",
      { id: r.BookingId },
      tx,
    );
    if (status === "Approved") assertEligibility(booking, r.CustomerId);
    await update(
      "Reviews",
      "ReviewId",
      id,
      {
        ModerationStatus: status,
        IsPublished: status === "Approved" ? 1 : 0,
        ModeratedBy: admin.id,
        ModeratedAt: new Date(),
        ModerationReason: b.reason,
        UpdatedAt: new Date(),
      },
      tx,
    );
    await insert(
      "ReviewModerationHistory",
      "HistoryId",
      {
        ReviewId: id,
        PreviousStatus: r.ModerationStatus,
        NewStatus: status,
        ModeratedBy: admin.id,
        ModerationReason: b.reason,
        InternalNotes: b.notes,
      },
      tx,
    );
    await audit(
      ctx,
      "MODERATED",
      id,
      r,
      { status, reason: b.reason, notes: b.notes },
      tx,
    );
    await reconcile(r.VendorId, tx);
    await notify(
      r.CustomerId,
      `Your review was ${status.toLowerCase()}`,
      id,
      tx,
    );
    const [vendor] = await db.select(
      "SELECT UserId FROM dbo.Vendors WHERE VendorId=:id",
      { id: r.VendorId },
      tx,
    );
    await notify(
      vendor.UserId,
      `Customer review ${status.toLowerCase()}`,
      id,
      tx,
    );
    return { message: `Review ${status.toLowerCase()}.` };
  });
}
export async function respond(id, input, ctx, remove = false, method = "PUT") {
  const user = who(ctx, "Vendor"),
    b = remove ? null : v.responseInput.parse(input);
  return db.transaction(async (tx) => {
    const r = await lock(id, tx);
    if (!sameId(r.VendorId, user.vendor.id)) fail("Review not found.", 404);
    if (r.ModerationStatus !== "Approved" || r.DeletedAt)
      fail("Only published reviews can receive responses.", 409);
    const [old] = await db.select(
      "SELECT * FROM dbo.VendorReviewResponses WHERE ReviewId=:id",
      { id },
      tx,
    );
    if (old?.ModerationStatus === "Hidden")
      fail("An administrator has hidden this response.", 409);
    if (method === "POST" && old && !old.DeletedAt)
      fail("This review already has a response.", 409);
    if (remove && (!old || old.DeletedAt)) fail("Response not found.", 404);
    if (!remove && old && !old.DeletedAt && old.ResponseText === b.text)
      return { message: "Response saved." };
    if (
      old &&
      !old.DeletedAt &&
      !remove &&
      !editAllowed({ ...old, ModerationStatus: "Approved" })
    )
      fail("Response editing window is closed.", 409);
    const next = {
      ResponseText: b?.text || old?.ResponseText,
      UpdatedAt: new Date(),
      DeletedAt: remove ? new Date() : null,
    };
    if (old)
      await update(
        "VendorReviewResponses",
        "ResponseId",
        old.ResponseId,
        next,
        tx,
      );
    else
      await insert(
        "VendorReviewResponses",
        "ResponseId",
        { ReviewId: id, VendorId: r.VendorId, ...next },
        tx,
      );
    await audit(ctx, "RESPONSE_CHANGED", id, old, next, tx);
    if (!remove)
      await notify(
        r.CustomerId,
        "Your vendor responded to your review",
        id,
        tx,
      );
    return { message: remove ? "Response deleted." : "Response saved." };
  });
}
export async function report(id, input, ctx) {
  const user = requireAuth(ctx),
    b = v.reportInput.parse(input);
  if (
    !user.roles.some((r) => r.active && ["CUSTOMER", "VENDOR"].includes(r.code))
  )
    fail("Access denied.", 403);
  return db.transaction(async (tx) => {
    const r = await lock(id, tx);
    if (r.ModerationStatus !== "Approved" || r.DeletedAt)
      fail("Review not found.", 404);
    if (b.responseId) {
      const [response] = await db.select(
        "SELECT ResponseId FROM dbo.VendorReviewResponses WHERE ResponseId=:response AND ReviewId=:id AND DeletedAt IS NULL AND ModerationStatus='Approved'",
        { response: b.responseId, id },
        tx,
      );
      if (!response) fail("Response not found.", 404);
    }
    const [old] = await db.select(
      "SELECT ReportId FROM dbo.ReviewReports WHERE ReviewId=:id AND ReportedBy=:user AND ReportStatus='Pending' AND (ResponseId=:response OR (ResponseId IS NULL AND :response IS NULL))",
      { id, user: user.id, response: b.responseId ?? null },
      tx,
    );
    if (old) fail("You already have an active report for this content.", 409);
    await insert(
      "ReviewReports",
      "ReportId",
      {
        ReviewId: id,
        ResponseId: b.responseId ?? null,
        ReportedBy: user.id,
        ReportReason: b.reason,
        ReportDescription: b.description,
      },
      tx,
    );
    await audit(ctx, "REPORTED", id, null, b, tx);
    return { message: "Report sent to the moderation team." };
  });
}
export async function reports(input, ctx) {
  who(ctx, "Admin");
  const b = v.listInput.parse(input);
  const [count] = await db.select(
    "SELECT COUNT_BIG(*) AS total FROM dbo.ReviewReports",
  );
  const rows = await db.select(
    "SELECT rr.*,v.BusinessName AS vendor,r.ReviewText,r.Rating,u.Email AS reporter,vr.ResponseText FROM dbo.ReviewReports rr JOIN dbo.Reviews r ON r.ReviewId=rr.ReviewId JOIN dbo.Vendors v ON v.VendorId=r.VendorId JOIN dbo.Users u ON u.UserId=rr.ReportedBy LEFT JOIN dbo.VendorReviewResponses vr ON vr.ResponseId=rr.ResponseId ORDER BY rr.CreatedAt DESC,rr.ReportId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY",
    { offset: (b.page - 1) * b.pageSize, size: b.pageSize },
  );
  return {
    rows,
    total: Number(count.total),
    page: b.page,
    pageSize: b.pageSize,
  };
}
export async function metadata(ctx) {
  who(ctx, "Admin");
  const vendors = await db.select(
    "SELECT DISTINCT v.VendorId AS id,v.BusinessName AS name FROM dbo.Vendors v JOIN dbo.Reviews r ON r.VendorId=v.VendorId ORDER BY v.BusinessName",
  );
  const services = await db.select(
    "SELECT DISTINCT s.ServiceId AS id,s.ServiceName AS name,s.VendorId AS vendorId FROM dbo.Services s JOIN dbo.Reviews r ON r.ServiceId=s.ServiceId ORDER BY s.ServiceName",
  );
  const categories = await db.select(
    "SELECT c.CategoryId AS id,c.CategoryName AS name FROM dbo.Categories c WHERE EXISTS(SELECT 1 FROM dbo.Reviews r LEFT JOIN dbo.Services s ON s.ServiceId=r.ServiceId WHERE s.CategoryId=c.CategoryId OR (r.ServiceId IS NULL AND EXISTS(SELECT 1 FROM dbo.VendorCategories vc WHERE vc.VendorId=r.VendorId AND vc.CategoryId=c.CategoryId))) ORDER BY c.CategoryName",
  );
  return { vendors, services, categories };
}
export async function resolveReport(id, action, input, ctx) {
  const user = who(ctx, "Admin"),
    b = v.moderationInput.parse(input);
  z.guid().parse(id);
  return db.transaction(async (tx) => {
    const [report] = await db.select(
      "SELECT * FROM dbo.ReviewReports WITH(UPDLOCK,HOLDLOCK) WHERE ReportId=:id",
      { id },
      tx,
    );
    if (!report) fail("Report not found.", 404);
    if (report.ReportStatus !== "Pending") fail("Report already decided.", 409);
    // Accept records the decision. Hiding content is a separate explicit, audited action.
    const next = {
      ReportStatus: action === "resolve" ? "Accepted" : "Dismissed",
      ReviewedBy: user.id,
      ReviewedAt: new Date(),
      AdminNotes: b.reason,
    };
    await update("ReviewReports", "ReportId", id, next, tx);
    await audit(ctx, "REPORT_DECIDED", report.ReviewId, report, next, tx);
    await notify(
      report.ReportedBy,
      "Your review report has been reviewed",
      report.ReviewId,
      tx,
    );
    return {
      message:
        "Report decision recorded. Use moderation controls to hide content when appropriate.",
    };
  });
}
export async function moderateResponse(id, input, ctx) {
  who(ctx, "Admin");
  const b = v.moderationInput.parse(input);
  if (!b.reason) fail("A moderation reason is required.");
  return db.transaction(async (tx) => {
    const r = await lock(id, tx);
    const [old] = await db.select(
      "SELECT * FROM dbo.VendorReviewResponses WHERE ReviewId=:id AND DeletedAt IS NULL",
      { id },
      tx,
    );
    if (!old) fail("Response not found.", 404);
    await update(
      "VendorReviewResponses",
      "ResponseId",
      old.ResponseId,
      { ModerationStatus: "Hidden", UpdatedAt: new Date() },
      tx,
    );
    await audit(ctx, "RESPONSE_HIDDEN", id, old, b, tx);
    const [vendor] = await db.select(
      "SELECT UserId FROM dbo.Vendors WHERE VendorId=:id",
      { id: r.VendorId },
      tx,
    );
    await notify(
      vendor.UserId,
      "Your review response was hidden by moderation",
      id,
      tx,
    );
    return { message: "Response hidden." };
  });
}
export async function addNote(id, input, ctx) {
  const user = who(ctx, "Admin"),
    b = v.moderationInput.parse(input);
  if (!b.notes) fail("Enter an internal moderation note.");
  return db.transaction(async (tx) => {
    const r = await lock(id, tx);
    await insert(
      "ReviewModerationHistory",
      "HistoryId",
      {
        ReviewId: id,
        PreviousStatus: r.ModerationStatus,
        NewStatus: r.ModerationStatus,
        ModeratedBy: user.id,
        InternalNotes: b.notes,
      },
      tx,
    );
    await audit(ctx, "NOTE_ADDED", id, null, { notes: b.notes }, tx);
    return { message: "Internal note saved." };
  });
}
export async function image(id, ctx) {
  z.guid().parse(id);
  const [row] = await db.select(
    "SELECT MediaId FROM dbo.ReviewImages WHERE ReviewImageId=:id",
    { id },
  );
  if (!row?.MediaId) fail("Image not found.", 404);
  const { content } = await import("../media/media.service.js");
  return content(row.MediaId, ctx, "gallery");
}
export async function analytics(ctx) {
  who(ctx, "Admin");
  const counts = await db.select(
    "SELECT ModerationStatus AS status,COUNT_BIG(*) AS count FROM dbo.Reviews WHERE DeletedAt IS NULL GROUP BY ModerationStatus",
  );
  const [rating] = await db.select(
    `SELECT AVG(CAST(r.Rating AS decimal(10,2))) AS averageRating,COUNT_BIG(*) AS totalApproved FROM dbo.Reviews r WHERE ${publicPredicate()}`,
  );
  const [reported] = await db.select(
    "SELECT COUNT_BIG(*) AS pendingReports FROM dbo.ReviewReports WHERE ReportStatus='Pending'",
  );
  const vendors = await db.select(
    `SELECT v.VendorId AS id,v.BusinessName AS name,AVG(CAST(r.Rating AS decimal(10,2))) AS rating,COUNT_BIG(*) AS count FROM dbo.Reviews r JOIN dbo.Vendors v ON v.VendorId=r.VendorId WHERE r.BookingItemId IS NULL AND ${publicPredicate()} GROUP BY v.VendorId,v.BusinessName ORDER BY rating DESC`,
  );
  const trends = await db.select(
    `SELECT CONVERT(char(7),r.CreatedAt,126) AS month,AVG(CAST(r.Rating AS decimal(10,2))) AS rating,COUNT_BIG(*) AS count FROM dbo.Reviews r WHERE ${publicPredicate()} GROUP BY CONVERT(char(7),r.CreatedAt,126) ORDER BY month DESC`,
  );
  return { counts, ...rating, ...reported, vendors, trends };
}
