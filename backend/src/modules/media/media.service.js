import { requireApprovedVendor } from "../../middleware/auth.middleware.js";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import * as db from "./media.repository.js";
import * as validation from "./media.validation.js";
import {
  actor,
  isAdmin,
  same,
  fail,
  maxCount,
  folderFor,
  publicMedia,
  purposesFor,
} from "./media.policy.js";
import { prepareImage, storeImage, retrieveImage } from "./media.storage.js";
import {
  editAllowed,
  publicPredicate as publicReview,
  assertEligibility,
} from "../reviews/reviews.policy.js";
import { reconcile } from "../reviews/reviews.service.js";
import { createNotification } from "../notifications/notification-center.service.js";
const insert = async (values, tx) =>
  (await db.insert({ table: "Media", id: "MediaId" }, values, tx))[0];
const update = (id, values, tx) =>
  db.update({ table: "Media", id: "MediaId" }, id, values, tx);
const audit = (ctx, action, id, old, next, tx) =>
  db.auditAdmin(
    ctx,
    `MEDIA_${action}`,
    "Media",
    id,
    old ?? null,
    next ?? null,
    tx,
  );
export const mediaUrl = (id, variant = "gallery") =>
  `${(process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "")}/api/media/${id}/content?variant=${variant}`;
export async function target(type, id, ctx, tx, write = false) {
  z.guid().parse(id);
  const user = actor(ctx),
    admin = isAdmin(user);
  let row;
  const hint = tx ? "WITH(UPDLOCK,HOLDLOCK)" : "";
  if (type === "Review" && tx) {
    const [parent] = await db.select(
      "SELECT VendorId FROM dbo.Reviews WHERE ReviewId=:id",
      { id },
      tx,
    );
    if (parent)
      await db.select(
        "SELECT VendorId FROM dbo.Vendors WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:id",
        { id: parent.VendorId },
        tx,
      );
  }
  if (type === "Admin") {
    if (!admin) fail("Administrator access required.", 403);
    return { ownerId: id, vendorId: null, row: {}, type, id };
  }
  if (type === "Vendor")
    [row] = await db.select(
      `SELECT v.*,v.UserId AS OwnerId FROM dbo.Vendors v ${hint} WHERE v.VendorId=:id`,
      { id },
      tx,
    );
  else if (type === "Service")
    [row] = await db.select(
      `SELECT s.*,v.UserId AS OwnerId FROM dbo.Services s ${hint} JOIN dbo.Vendors v ON v.VendorId=s.VendorId WHERE s.ServiceId=:id`,
      { id },
      tx,
    );
  else if (type === "Package")
    [row] = await db.select(
      `SELECT p.*,s.VendorId,s.ApprovalStatus,v.UserId AS OwnerId FROM dbo.ServicePackages p ${hint} JOIN dbo.Services s ON s.ServiceId=p.ServiceId JOIN dbo.Vendors v ON v.VendorId=s.VendorId WHERE p.PackageId=:id`,
      { id },
      tx,
    );
  else if (type === "Review")
    [row] = await db.select(
      `SELECT r.*,r.CustomerId AS OwnerId FROM dbo.Reviews r ${hint} WHERE r.ReviewId=:id`,
      { id },
      tx,
    );
  else fail("Unknown media category.");
  if (!row || (!admin && !same(row.OwnerId, user.id)))
    fail("Entity not found in your account.", 404);
  if (
    !admin &&
    type !== "Review" &&
    !user.roles.some((r) => r.code === "VENDOR" && r.active)
  )
    fail("Vendor access required.", 403);
  if (write && !admin && ["Service", "Package"].includes(type))
    requireApprovedVendor(ctx);
  if (write && type === "Review" && !same(row.OwnerId, user.id))
    fail("Only the review author can upload or edit review images.", 403);
  if (
    write &&
    type === "Review" &&
    !user.roles.some((r) => r.code === "CUSTOMER" && r.active)
  )
    fail("Customer access required.", 403);
  if (
    write &&
    type === "Vendor" &&
    !admin &&
    (row.VerificationStatus !== "Approved" || !row.IsActive)
  )
    fail("Vendor approval required.", 403);
  if (write && type === "Review" && !editAllowed(row))
    fail("Review image editing is closed.", 409);
  if (write && type === "Review") {
    const [booking] = await db.select(
      "SELECT * FROM dbo.Booking WHERE BookingId=:id",
      { id: row.BookingId },
      tx,
    );
    assertEligibility(booking, user.id);
  }
  if (
    write &&
    ["Service", "Package"].includes(type) &&
    ["Pending", "UnderReview", "Suspended"].includes(row.ApprovalStatus)
  )
    fail("This service cannot be edited during review or suspension.", 409);
  return {
    ownerId: row.OwnerId,
    vendorId: row.VendorId || null,
    row,
    type,
    id,
  };
}
export async function lockMedia(id, ctx, tx, write = false) {
  z.guid().parse(id);
  const [initial] = await db.select(
    "SELECT * FROM dbo.Media WHERE MediaId=:id",
    { id },
    tx,
  );
  if (!initial) fail("Media not found.", 404);
  let entity;
  try {
    entity = await target(
      initial.EntityType,
      initial.EntityId,
      ctx,
      tx,
      write && initial.UploadStatus === "Ready",
    );
  } catch (error) {
    if (
      (error.status !== 404 &&
        !(error.status === 400 && initial.MediaCategory === "Admin")) ||
      !isAdmin(actor(ctx))
    )
      throw error;
    entity = {
      type: initial.EntityType,
      id: initial.EntityId,
      vendorId: initial.VendorId,
      row: {},
      missing: true,
    };
  }
  const [row] = await db.select(
    `SELECT * FROM dbo.Media ${tx ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE MediaId=:id`,
    { id },
    tx,
  );
  return { row, entity };
}
async function touch(entity, ctx, tx) {
  const user = actor(ctx);
  if (entity.type === "Review" && isAdmin(user)) return user;
  if (["Service", "Package"].includes(entity.type)) {
    const id = entity.type === "Service" ? entity.id : entity.row.ServiceId;
    await db.select(
      "UPDATE dbo.Services SET ApprovalStatus=CASE WHEN ApprovalStatus='Approved' THEN 'Draft' ELSE ApprovalStatus END,IsActive=CASE WHEN ApprovalStatus='Approved' THEN 0 ELSE IsActive END,UpdatedAt=SYSUTCDATETIME() WHERE ServiceId=:id",
      { id },
      tx,
    );
    await db.auditAdmin(
      ctx,
      "SERVICE_MEDIA_CHANGED",
      "Services",
      id,
      { status: entity.row.ApprovalStatus },
      {
        status:
          entity.row.ApprovalStatus === "Approved"
            ? "Draft"
            : entity.row.ApprovalStatus,
        mediaChanged: true,
      },
      tx,
    );
  }
  if (entity.type === "Review") {
    await db.select(
      "UPDATE dbo.Reviews SET ModerationStatus='Pending',IsPublished=0,UpdatedAt=SYSUTCDATETIME() WHERE ReviewId=:id",
      { id: entity.id },
      tx,
    );
    await reconcile(entity.vendorId, tx);
    await db.auditAdmin(
      ctx,
      "REVIEW_EDITED",
      "Reviews",
      entity.id,
      null,
      { imagesUpdated: true },
      tx,
    );
    const [vendor] = await db.select(
      "SELECT UserId FROM dbo.Vendors WHERE VendorId=:id",
      { id: entity.vendorId },
      tx,
    );
    if (vendor)
      await createNotification(
        {
          userId: vendor.UserId,
          title: "Customer updated review photos",
          message: "Updated review photos are awaiting moderation.",
          referenceType: "Review",
          referenceId: entity.id,
        },
        tx,
      );
  }
  if (entity.type === "Vendor")
    await db.select(
      "UPDATE dbo.Vendors SET UpdatedAt=SYSUTCDATETIME() WHERE VendorId=:id",
      { id: entity.id },
      tx,
    );
  return user;
}
async function syncVendor(row, tx) {
  if (row.EntityType !== "Vendor" || !["Logo", "Cover"].includes(row.Purpose))
    return;
  const column = row.Purpose === "Logo" ? "LogoUrl" : "CoverImageUrl";
  const [current] = await db.select(
    "SELECT TOP(1) MediaId FROM dbo.Media WHERE EntityType='Vendor' AND EntityId=:id AND Purpose=:purpose AND ModerationStatus='Approved' AND UploadStatus='Ready' AND DeletedAt IS NULL ORDER BY IsPrimary DESC,SortOrder,CreatedAt DESC",
    { id: row.EntityId, purpose: row.Purpose },
    tx,
  );
  await db.select(
    `UPDATE dbo.Vendors SET ${column}=:url,UpdatedAt=SYSUTCDATETIME() WHERE VendorId=:id`,
    {
      id: row.EntityId,
      url: current ? mediaUrl(current.MediaId, "card") : null,
    },
    tx,
  );
}
export async function upload(input, ctx, providedTx) {
  const user = actor(ctx),
    b = validation.uploadInput.parse(input);
  if (!purposesFor[b.entityType].includes(b.purpose))
    fail("Choose an image purpose supported by this category.");
  if (b.entityType === "Admin" && !same(b.entityId, user.id))
    fail("Platform uploads must belong to your account.", 403);
  await target(b.entityType, b.entityId, ctx, providedTx, false);
  const file = await prepareImage(
    b.base64,
    b.fileName,
    b.mimeType,
    b.entityType === "Review",
  );
  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        b.entityType,
        b.entityId.toLowerCase(),
        b.purpose,
        b.fileName,
        b.replaceId?.toLowerCase(),
        b.mimeType,
      ]),
    )
    .update(file.bytes)
    .digest("hex");
  const [previousRequest] = await db.select(
    "SELECT MediaId,RequestHash,UploadStatus FROM dbo.Media WHERE UploadedBy=:user AND RequestKey=:key",
    { user: user.id, key: b.requestKey },
    providedTx,
  );
  if (previousRequest) {
    if (previousRequest.RequestHash !== hash)
      fail("This upload key was already used for different content.", 409);
    if (previousRequest.UploadStatus === "Failed")
      fail("This upload failed. Retry with a new upload request.", 409);
    return {
      id: previousRequest.MediaId,
      uploadStatus: previousRequest.UploadStatus,
      message:
        previousRequest.UploadStatus === "Ready"
          ? "Image already uploaded."
          : "Upload is processing.",
    };
  }
  const transact = (fn) => (providedTx ? fn(providedTx) : db.transaction(fn));
  let media;
  await transact(async (tx) => {
    const entity = await target(b.entityType, b.entityId, ctx, tx, true);
    const [old] = await db.select(
      "SELECT * FROM dbo.Media WITH(UPDLOCK,HOLDLOCK) WHERE UploadedBy=:user AND RequestKey=:key",
      { user: user.id, key: b.requestKey },
      tx,
    );
    if (old) {
      if (old.RequestHash !== hash)
        fail("This upload key was already used for different content.", 409);
      media = old;
      return;
    }
    const [count] = await db.select(
      "SELECT COUNT(*) AS total FROM dbo.Media WHERE EntityType=:type AND EntityId=:id AND DeletedAt IS NULL AND UploadStatus<>'Failed'",
      { type: b.entityType, id: b.entityId },
      tx,
    );
    if (count.total >= maxCount(b.entityType) && !b.replaceId)
      fail("This entity has reached its image limit.", 409);
    if (b.replaceId) {
      const [replacement] = await db.select(
        "SELECT MediaId FROM dbo.Media WHERE MediaId=:replacement AND EntityType=:type AND EntityId=:id AND DeletedAt IS NULL",
        { replacement: b.replaceId, type: b.entityType, id: b.entityId },
        tx,
      );
      if (!replacement)
        fail("Replacement image is not part of this entity.", 404);
    }
    const id = randomUUID(),
      publicId = `${folderFor(b.entityType, b.purpose)}/${id}`;
    await insert(
      {
        MediaId: id,
        EntityType: b.entityType,
        EntityId: b.entityId,
        MediaType: "Image",
        MediaCategory: b.entityType,
        Purpose: b.purpose,
        MediaUrl: mediaUrl(id),
        PublicId: publicId,
        StorageKey: `cloudinary:image:authenticated:${publicId}`,
        OwnerId: entity.ownerId,
        UploadedBy: user.id,
        VendorId: entity.vendorId,
        FileName: b.fileName,
        MimeType: "image/webp",
        FileSize: file.bytes.length,
        Width: file.width,
        Height: file.height,
        ResourceType: "image",
        DeliveryType: "authenticated",
        ModerationStatus: b.entityType === "Review" ? "Approved" : "Pending",
        UploadStatus: "Uploading",
        RequestKey: b.requestKey,
        RequestHash: hash,
        SortOrder: count.total,
        IsPrimary: count.total === 0 ? 1 : 0,
      },
      tx,
    );
    [media] = await db.select(
      "SELECT * FROM dbo.Media WHERE MediaId=:id",
      { id },
      tx,
    );
  });
  if (media.UploadStatus === "Ready")
    return {
      id: media.MediaId,
      message: "Image already uploaded.",
      uploadStatus: "Ready",
    };
  // The durable row is claimed once. Failed requests require a fresh upload key;
  // a disconnected client can safely replay its original key without re-uploading.
  if (media.UploadStatus === "Failed")
    fail("This upload failed. Retry with a new upload request.", 409);
  // A single request claims the durable row; concurrent replays poll its status.
  const claimed = await db.select(
    "UPDATE dbo.Media SET ErrorMessage='UPLOAD_IN_PROGRESS' OUTPUT inserted.MediaId AS id WHERE MediaId=:id AND UploadStatus='Uploading' AND ErrorMessage IS NULL",
    { id: media.MediaId },
    providedTx,
  );
  if (!claimed.length)
    return {
      id: media.MediaId,
      uploadStatus: "Uploading",
      message: "Upload is processing.",
    };
  try {
    const asset = await storeImage(file, media.PublicId);
    await transact(async (tx) => {
      const entity = await target(b.entityType, b.entityId, ctx, tx, true);
      const [locked] = await db.select(
        "SELECT * FROM dbo.Media WITH(UPDLOCK,HOLDLOCK) WHERE MediaId=:id",
        { id: media.MediaId },
        tx,
      );
      if (locked.DeletedAt) fail("Upload was withdrawn.", 409);
      await update(
        media.MediaId,
        {
          UploadStatus: "Ready",
          ErrorMessage: null,
          SecureUrl: asset.url,
          VariantsJson: JSON.stringify(asset.eager),
          UpdatedAt: new Date(),
        },
        tx,
      );
      if (b.replaceId) {
        const [previous] = await db.select(
          "SELECT IsPrimary,SortOrder FROM dbo.Media WHERE MediaId=:id",
          { id: b.replaceId },
          tx,
        );
        await update(
          media.MediaId,
          { IsPrimary: previous.IsPrimary, SortOrder: previous.SortOrder },
          tx,
        );
        await update(
          b.replaceId,
          {
            DeletedAt: new Date(),
            IsPrimary: 0,
            CleanupStatus: "Pending",
            NextCleanupAt: retentionDate(),
            UpdatedAt: new Date(),
          },
          tx,
        );
        await audit(
          ctx,
          "REPLACED",
          b.replaceId,
          { primary: previous.IsPrimary, order: previous.SortOrder },
          { replacedBy: media.MediaId },
          tx,
        );
      }
      if (!(providedTx && b.entityType === "Review"))
        await touch(entity, ctx, tx);
      if (b.entityType === "Review") {
        await db.insert(
          { table: "ReviewImages", id: "ReviewImageId" },
          {
            ReviewImageId: media.MediaId,
            ReviewId: b.entityId,
            ImageUrl: mediaUrl(media.MediaId),
            StorageKey: null,
            ImageName: b.fileName,
            ImageSize: file.bytes.length,
            MimeType: "image/webp",
            SortOrder: media.SortOrder,
            MediaId: media.MediaId,
          },
          tx,
        );
      }
      await audit(
        ctx,
        "UPLOADED",
        media.MediaId,
        null,
        {
          entityType: b.entityType,
          entityId: b.entityId,
          fileName: b.fileName,
        },
        tx,
      );
    });
    return {
      id: media.MediaId,
      uploadStatus: "Ready",
      message:
        "Image uploaded. Publishing follows entity and image moderation.",
    };
  } catch (error) {
    await update(
      media.MediaId,
      {
        UploadStatus: "Failed",
        ErrorMessage: "Upload failed or could not be finalized.",
        CleanupStatus: "Pending",
        NextCleanupAt: retentionDate(),
        UpdatedAt: new Date(),
      },
      providedTx,
    );
    await audit(
      ctx,
      "UPLOAD_FAILED",
      media.MediaId,
      null,
      { error: "Upload failed or could not be finalized." },
      providedTx,
    ).catch(() => {});
    throw error;
  }
}
export const retentionDate = () =>
  new Date(
    Date.now() +
      Math.max(
        1,
        Math.min(3650, Number(process.env.MEDIA_RETENTION_DAYS) || 30),
      ) *
        86400000,
  );
export async function queueRolledBack(rows) {
  for (const row of rows) {
    const [existing] = await db.select(
      "SELECT MediaId FROM dbo.Media WHERE MediaId=:id",
      { id: row.MediaId },
    );
    if (existing) continue;
    await insert({
      MediaId: row.MediaId,
      EntityType: row.EntityType,
      EntityId: row.EntityId,
      MediaType: "Image",
      MediaUrl: row.MediaUrl,
      PublicId: row.PublicId,
      StorageKey: row.StorageKey,
      ResourceType: row.ResourceType,
      DeliveryType: row.DeliveryType,
      MediaCategory: row.MediaCategory,
      OwnerId: row.OwnerId,
      UploadedBy: row.UploadedBy,
      VendorId: row.VendorId,
      FileName: row.FileName,
      MimeType: row.MimeType,
      FileSize: row.FileSize,
      UploadStatus: "Failed",
      ModerationStatus: "Hidden",
      DeletedAt: new Date(),
      ErrorMessage: "Owning transaction rolled back.",
      CleanupStatus: "Pending",
      NextCleanupAt: retentionDate(),
    });
  }
}
export async function mutate(id, action, input, ctx, providedTx) {
  const user = actor(ctx),
    admin = isAdmin(user),
    b =
      action === "rename"
        ? validation.renameInput.parse(input)
        : validation.noteInput.parse(input || {});
  if (["approve", "reject", "hide", "restore"].includes(action) && !admin)
    fail("Administrator access required.", 403);
  if (["reject", "hide"].includes(action) && !b.reason)
    fail("A moderation reason is required.");
  const transact = (fn) => (providedTx ? fn(providedTx) : db.transaction(fn));
  return transact(async (tx) => {
    const { row, entity } = await lockMedia(id, ctx, tx, !admin);
    if (row.DeletedAt) fail("Deleted media cannot be changed.", 409);
    if (entity.missing && ["approve", "restore", "primary"].includes(action))
      fail("The associated entity no longer exists.", 409);
    if (row.UploadStatus !== "Ready" && action !== "delete")
      fail("Only completed uploads can be changed.", 409);
    if (!admin && row.ModerationStatus === "Hidden" && action !== "delete")
      fail("Moderator-hidden media cannot be republished.", 409);
    let values = { UpdatedAt: new Date() };
    if (action === "delete")
      values = {
        ...values,
        DeletedAt: new Date(),
        IsPrimary: 0,
        CleanupStatus: "Pending",
        NextCleanupAt: retentionDate(),
      };
    else if (action === "primary") {
      const group =
        row.EntityType === "Vendor"
          ? ["Logo", "Cover"].includes(row.Purpose)
            ? "AND Purpose=:purpose"
            : "AND Purpose NOT IN('Logo','Cover')"
          : row.EntityType === "Admin"
            ? "AND Purpose=:purpose"
            : "";
      await db.select(
        `UPDATE dbo.Media SET IsPrimary=0 WHERE EntityType=:type AND EntityId=:entity ${group}`,
        { type: row.EntityType, entity: row.EntityId, purpose: row.Purpose },
        tx,
      );
      values.IsPrimary = 1;
    } else if (action === "rename") {
      values.FileName = b.fileName;
    } else {
      const status = {
        approve: "Approved",
        restore: "Approved",
        reject: "Rejected",
        hide: "Hidden",
      }[action];
      if (!status) fail("Unsupported media action.");
      values = {
        ...values,
        ModerationStatus: status,
        ModeratedBy: user.id,
        ModeratedAt: new Date(),
        ModerationReason: b.reason,
      };
    }
    await update(id, values, tx);
    if (
      row.UploadStatus === "Ready" &&
      (!admin || ["primary", "rename", "delete"].includes(action))
    )
      await touch(entity, ctx, tx);
    if (
      row.EntityType === "Vendor" &&
      ["Logo", "Cover"].includes(row.Purpose) &&
      ["approve", "restore"].includes(action)
    ) {
      await db.select(
        "UPDATE dbo.Media SET IsPrimary=CASE WHEN MediaId=:id THEN 1 ELSE 0 END WHERE EntityType='Vendor' AND EntityId=:entity AND Purpose=:purpose",
        { id, entity: row.EntityId, purpose: row.Purpose },
        tx,
      );
    }
    if (entity.type === "Vendor") await syncVendor(row, tx);
    await audit(
      ctx,
      action.toUpperCase(),
      id,
      { status: row.ModerationStatus, primary: row.IsPrimary },
      { ...values, reason: b.reason },
      tx,
    );
    return {
      message: `Media ${action === "delete" ? "withdrawn and retained for safe cleanup" : "updated"}.`,
    };
  });
}
export async function reorder(input, ctx) {
  const b = validation.reorderInput.parse(input);
  return db.transaction(async (tx) => {
    const entity = await target(b.entityType, b.entityId, ctx, tx, true);
    const rows = await db.select(
      "SELECT MediaId FROM dbo.Media WHERE EntityType=:type AND EntityId=:id AND DeletedAt IS NULL AND UploadStatus='Ready'",
      { type: b.entityType, id: b.entityId },
      tx,
    );
    if (
      rows.length !== b.ids.length ||
      b.ids.some((id) => !rows.some((row) => same(id, row.MediaId)))
    )
      fail("Include every current image exactly once.");
    for (const [sort, id] of b.ids.entries())
      await update(id, { SortOrder: sort, UpdatedAt: new Date() }, tx);
    await touch(entity, ctx, tx);
    await audit(ctx, "REORDERED", b.entityId, null, { ids: b.ids }, tx);
    return { message: "Gallery order saved." };
  });
}
async function publicEntity(row) {
  if (row.EntityType === "Admin") return true;
  const base =
    "v.IsActive=1 AND v.VerificationStatus='Approved' AND u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1";
  let sql;
  if (row.EntityType === "Review")
    sql = `SELECT r.ReviewId FROM dbo.Reviews r WHERE r.ReviewId=:id AND ${publicReview()}`;
  else if (row.EntityType === "Vendor")
    sql = `SELECT v.VendorId FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId WHERE v.VendorId=:id AND ${base}`;
  else if (row.EntityType === "Service")
    sql = `SELECT s.ServiceId FROM dbo.Services s JOIN dbo.Vendors v ON v.VendorId=s.VendorId JOIN dbo.Users u ON u.UserId=v.UserId JOIN dbo.Categories c ON c.CategoryId=s.CategoryId WHERE s.ServiceId=:id AND s.IsActive=1 AND s.ApprovalStatus='Approved' AND c.IsActive=1 AND ${base}`;
  else if (row.EntityType === "Package")
    sql = `SELECT p.PackageId FROM dbo.ServicePackages p JOIN dbo.Services s ON s.ServiceId=p.ServiceId JOIN dbo.Vendors v ON v.VendorId=s.VendorId JOIN dbo.Users u ON u.UserId=v.UserId JOIN dbo.Categories c ON c.CategoryId=s.CategoryId WHERE p.PackageId=:id AND p.IsActive=1 AND s.IsActive=1 AND s.ApprovalStatus='Approved' AND c.IsActive=1 AND ${base}`;
  return sql
    ? Boolean((await db.select(sql, { id: row.EntityId })).length)
    : false;
}
export async function isPublic(row) {
  return (
    row.ModerationStatus === "Approved" &&
    row.UploadStatus === "Ready" &&
    !row.DeletedAt &&
    (await publicEntity(row))
  );
}
export async function content(id, ctx, variant = "gallery") {
  z.guid().parse(id);
  const [row] = await db.select("SELECT * FROM dbo.Media WHERE MediaId=:id", {
    id,
  });
  if (!row) fail("Image not found.", 404);
  if (row.MediaType !== "Image")
    fail(
      "Use the original document or file workflow for this legacy asset.",
      415,
    );
  if (!(await isPublic(row))) {
    const user = actor(ctx);
    if (!isAdmin(user) && !same(row.OwnerId, user.id))
      fail("Image not found.", 404);
    if (row.UploadStatus !== "Ready" || (row.DeletedAt && !isAdmin(user)))
      fail("Image unavailable.", 404);
  }
  if (!row.StorageKey && /^https:\/\/res\.cloudinary\.com\//.test(row.MediaUrl))
    return { redirect: row.MediaUrl };
  return retrieveImage(row, variant);
}
const safe = (row) => ({
  id: row.MediaId,
  entityType: row.EntityType,
  entityId: row.EntityId,
  category: row.MediaCategory,
  purpose: row.Purpose,
  fileName: row.FileName,
  size: Number(row.FileSize || 0),
  width: row.Width,
  height: row.Height,
  status: row.ModerationStatus,
  uploadStatus: row.UploadStatus,
  primary: !!row.IsPrimary,
  order: row.SortOrder,
  createdAt: row.CreatedAt,
  updatedAt: row.UpdatedAt,
  deletedAt: row.DeletedAt,
  url: mediaUrl(row.MediaId),
  thumbnail: row.StorageKey ? mediaUrl(row.MediaId, "thumb") : row.MediaUrl,
  error:
    row.UploadStatus === "Failed"
      ? "Upload failed. Retry the original file."
      : null,
  cleanupStatus: row.CleanupStatus,
});
export async function details(id, ctx) {
  const { row } = await lockMedia(id, ctx);
  const result = safe(row);
  if (isAdmin(actor(ctx))) {
    result.uploader = await db.select(
      "SELECT UserId AS id,CONCAT(FirstName,' ',LastName) AS name,Email AS email FROM dbo.Users WHERE UserId=:id",
      { id: row.UploadedBy },
    );
    result.history = await db.select(
      "SELECT UserId,ActionType,OldValue,NewValue,CreatedAt FROM dbo.AuditLogs WHERE EntityType='Media' AND EntityId=:id ORDER BY CreatedAt DESC",
      { id },
    );
    result.reason = row.ModerationReason;
  }
  return result;
}
export async function list(input, ctx, publicTarget) {
  const b = validation.pageInput.parse(input),
    user = publicTarget ? null : actor(ctx),
    clauses = ["1=1"],
    p = { offset: (b.page - 1) * b.pageSize, size: b.pageSize };
  if (
    publicTarget &&
    !(await publicEntity({
      EntityType: publicTarget.type,
      EntityId: publicTarget.id,
    }))
  )
    return { rows: [], total: 0, page: b.page, pageSize: b.pageSize };
  if (publicTarget) {
    z.guid().parse(publicTarget.id);
    clauses.push(
      publicTarget.type === "Package"
        ? "((m.EntityType='Package' AND m.EntityId=:target) OR (m.EntityType='Service' AND EXISTS(SELECT 1 FROM dbo.ServicePackages p CROSS APPLY OPENJSON(CASE WHEN ISJSON(p.DetailsJson)=1 THEN p.DetailsJson ELSE '{}' END,'$.images') j WHERE p.PackageId=:target AND p.ServiceId=m.EntityId AND TRY_CONVERT(uniqueidentifier,j.value)=m.MediaId)))"
        : "m.EntityType=:type AND m.EntityId=:target",
      publicMedia(),
    );
    if (publicTarget.type === "Vendor")
      clauses.push("m.Purpose NOT IN('Logo','Cover')");
    p.type = publicTarget.type;
    p.target = publicTarget.id;
  } else if (!isAdmin(user)) {
    clauses.push("m.OwnerId=:owner");
    p.owner = user.id;
  }
  clauses.push(
    b.deleted === "true" && !publicTarget
      ? "m.DeletedAt IS NOT NULL"
      : "m.DeletedAt IS NULL",
  );
  for (const [key, column] of Object.entries({
    category: "MediaCategory",
    vendorId: "VendorId",
    entityId: "EntityId",
    status: "ModerationStatus",
    uploadStatus: "UploadStatus",
  }))
    if (b[key]) {
      clauses.push(`m.${column}=:${key}`);
      p[key] = b[key];
    }
  if (b.q) {
    clauses.push(
      "(m.FileName LIKE :q OR CONVERT(varchar(36),m.EntityId) LIKE :q OR v.BusinessName LIKE :q OR s.ServiceName LIKE :q OR sp.PackageName LIKE :q)",
    );
    p.q = `%${b.q.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`;
  }
  if (b.from) {
    clauses.push("m.CreatedAt>=:from");
    p.from = b.from;
  }
  if (b.to) {
    clauses.push("m.CreatedAt<DATEADD(day,1,CAST(:to AS date))");
    p.to = b.to;
  }
  const missing =
    "((m.EntityType='Vendor' AND v.VendorId IS NULL) OR (m.EntityType='Service' AND s.ServiceId IS NULL) OR (m.EntityType='Package' AND sp.PackageId IS NULL) OR (m.EntityType='Review' AND r.ReviewId IS NULL))";
  if (b.orphaned === "true") clauses.push(missing);
  const from = `FROM dbo.Media m LEFT JOIN dbo.Vendors v ON v.VendorId=m.VendorId LEFT JOIN dbo.Services s ON m.EntityType='Service' AND s.ServiceId=m.EntityId LEFT JOIN dbo.ServicePackages sp ON m.EntityType='Package' AND sp.PackageId=m.EntityId LEFT JOIN dbo.Reviews r ON m.EntityType='Review' AND r.ReviewId=m.EntityId WHERE ${clauses.join(" AND ")}`;
  const [count] = await db.select(`SELECT COUNT_BIG(*) AS total ${from}`, p);
  const rows = await db.select(
    `SELECT m.*,v.BusinessName AS vendor,s.ServiceName AS service,sp.PackageName AS package,CASE WHEN ${missing} THEN 1 ELSE 0 END AS orphaned ${from} ORDER BY m.CreatedAt DESC,m.MediaId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    p,
  );
  const visible = rows.map((row) => ({
    ...safe(row),
    vendor: row.vendor,
    service: row.service,
    package: row.package,
    orphaned: !!row.orphaned,
  }));
  return {
    rows: visible,
    total: Number(count.total),
    page: b.page,
    pageSize: b.pageSize,
  };
}
export async function metadata(ctx) {
  const user = actor(ctx),
    admin = isAdmin(user),
    p = { owner: user.id };
  const vendors = await db.select(
    `SELECT VendorId AS id,BusinessName AS name FROM dbo.Vendors ${admin ? "" : "WHERE UserId=:owner"} ORDER BY BusinessName`,
    p,
  );
  const services = await db.select(
    `SELECT s.ServiceId AS id,s.ServiceName AS name,s.VendorId AS vendorId FROM dbo.Services s JOIN dbo.Vendors v ON v.VendorId=s.VendorId ${admin ? "" : "WHERE v.UserId=:owner"} ORDER BY s.ServiceName`,
    p,
  );
  const packages = await db.select(
    `SELECT p.PackageId AS id,p.PackageName AS name,s.VendorId AS vendorId,s.ServiceId AS serviceId FROM dbo.ServicePackages p JOIN dbo.Services s ON s.ServiceId=p.ServiceId JOIN dbo.Vendors v ON v.VendorId=s.VendorId ${admin ? "" : "WHERE v.UserId=:owner"} ORDER BY p.PackageName`,
    p,
  );
  const reviews = await db.select(
    `SELECT ReviewId AS id,COALESCE(ReviewTitle,'Customer review') AS name FROM dbo.Reviews ${admin ? "" : "WHERE CustomerId=:owner"} ORDER BY CreatedAt DESC`,
    p,
  );
  return {
    vendors,
    services,
    packages,
    reviews,
    adminId: user.id,
    maxPerEntity: maxCount("Service"),
    maxMb: Math.max(1, Math.min(10, Number(process.env.MEDIA_MAX_MB) || 5)),
  };
}
export async function statistics(ctx) {
  if (!isAdmin(actor(ctx))) fail("Administrator access required.", 403);
  const rows = await db.select(
    "SELECT MediaCategory AS category,COUNT_BIG(*) AS count,COALESCE(SUM(FileSize),0) AS bytes FROM dbo.Media WHERE DeletedAt IS NULL AND UploadStatus='Ready' GROUP BY MediaCategory",
  );
  const statuses = await db.select(
    "SELECT ModerationStatus AS status,COUNT_BIG(*) AS count FROM dbo.Media WHERE DeletedAt IS NULL AND UploadStatus='Ready' GROUP BY ModerationStatus",
  );
  const [counts] = await db.select(
    "SELECT SUM(CASE WHEN UploadStatus='Failed' THEN 1 ELSE 0 END) AS failedUploads,SUM(CASE WHEN CleanupStatus IN('Pending','Failed','Blocked','Processing') THEN 1 ELSE 0 END) AS cleanupQueue,COUNT_BIG(*) AS retainedRecords FROM dbo.Media",
  );
  const [storage] = await db.select(
    "WITH assets AS(SELECT FileSize,ROW_NUMBER() OVER(PARTITION BY COALESCE(StorageKey,CONCAT('legacy:',MediaId)) ORDER BY CreatedAt) AS rn FROM dbo.Media WHERE UploadStatus='Ready' AND CleanupStatus<>'Deleted') SELECT COALESCE(SUM(CASE WHEN rn=1 THEN FileSize ELSE 0 END),0) AS trackedStorageBytes,SUM(CASE WHEN rn=1 AND FileSize IS NULL THEN 1 ELSE 0 END) AS unknownSizeFiles FROM assets",
  );
  return {
    categories: validation.types.map(
      (category) =>
        rows.find((r) => r.category === category) || {
          category,
          count: 0,
          bytes: 0,
        },
    ),
    statuses: ["Pending", "Approved", "Rejected", "Hidden"].map(
      (status) =>
        statuses.find((r) => r.status === status) || { status, count: 0 },
    ),
    ...counts,
    ...storage,
  };
}
