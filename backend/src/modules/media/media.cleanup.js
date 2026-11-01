import { retentionDate } from "./media.service.js";
import * as db from "./media.repository.js";
import { destroyImage } from "./media.storage.js";
import { z } from "zod";
export async function references(row, tx, includeShared = true) {
  const p = {
    id: row.MediaId,
    entity: row.EntityId,
    publicId: row.PublicId || "",
    key: row.StorageKey || "",
    needle: `%${row.MediaId}%`,
  };
  const shared = includeShared
    ? await db.select(
        "SELECT * FROM dbo.Media WHERE MediaId <> :id AND CleanupStatus<>'Deleted' AND ((PublicId=:publicId AND :publicId <>'') OR (StorageKey=:key AND :key <>''))",
        p,
        tx,
      )
    : [];
  for (const other of shared) {
    if (
      !other.DeletedAt ||
      other.UploadStatus === "Uploading" ||
      (other.NextCleanupAt && new Date(other.NextCleanupAt) > new Date())
    )
      return "Another media record still uses this asset or is within retention.";
    if (await references(other, tx, false))
      return "Another retained media record has historical or active references.";
  }
  const [packageRef] = await db.select(
    "SELECT COUNT(*) AS count FROM dbo.ServicePackages p CROSS APPLY OPENJSON(CASE WHEN ISJSON(p.DetailsJson)=1 THEN p.DetailsJson ELSE '{}' END,'$.images') j WHERE TRY_CONVERT(uniqueidentifier,j.value)=:id",
    p,
    tx,
  );
  if (packageRef.count) return "A package still references this image.";
  const [snapshots] = await db.select(
    "SELECT (SELECT COUNT(*) FROM dbo.Booking WHERE PriceSnapshotJson LIKE :needle OR EventSnapshotJson LIKE :needle)+(SELECT COUNT(*) FROM dbo.QuotationItems WHERE SnapshotJson LIKE :needle)+(SELECT COUNT(*) FROM dbo.Vendors WHERE LogoUrl LIKE :needle OR CoverImageUrl LIKE :needle) AS count",
    p,
    tx,
  );
  if (snapshots.count)
    return "A profile or historical snapshot still references this image.";
  const [linked] = await db.select(
    "SELECT (SELECT COUNT(*) FROM dbo.VendorDocuments WHERE DocumentUrl=:key AND :key <> '')+(SELECT COUNT(*) FROM dbo.Users WHERE ProfilePhotoUrl LIKE :needle)+(SELECT COUNT(*) FROM dbo.Services WHERE DetailsJson LIKE :needle)+(SELECT COUNT(*) FROM dbo.ServicePackages WHERE DetailsJson LIKE :needle)+(SELECT COUNT(*) FROM dbo.Quotations WHERE EventSnapshotJson LIKE :needle OR TermsJson LIKE :needle)+(SELECT COUNT(*) FROM dbo.Booking WHERE PolicySnapshotJson LIKE :needle) AS count",
    p,
    tx,
  );
  if (linked.count)
    return "An existing document, profile, service or snapshot references this image.";
  const [cmsTable] = await db.select("SELECT OBJECT_ID('dbo.CMSPageVersions') AS id",{},tx);
  if(cmsTable.id){const [ref]=await db.select("SELECT COUNT(*) AS count FROM dbo.CMSPageVersions WHERE ContentJson LIKE :needle",p,tx);if(ref.count)return "A content version still references this image.";}
  const type = row.EntityType;
  const queries = {
    Vendor:
      "SELECT COUNT(*) AS count FROM dbo.Vendors v WHERE v.VendorId=:entity AND (v.IsActive=1 OR EXISTS(SELECT 1 FROM dbo.Booking b WHERE b.VendorId=v.VendorId) OR EXISTS(SELECT 1 FROM dbo.Quotations q WHERE q.VendorId=v.VendorId))",
    Service:
      "SELECT COUNT(*) AS count FROM dbo.Services s WHERE s.ServiceId=:entity AND (s.IsActive=1 OR EXISTS(SELECT 1 FROM dbo.BookingItems b WHERE b.ServiceId=s.ServiceId) OR EXISTS(SELECT 1 FROM dbo.QuotationItems q WHERE q.ServiceId=s.ServiceId))",
    Package:
      "SELECT COUNT(*) AS count FROM dbo.ServicePackages p WHERE p.PackageId=:entity AND (p.IsActive=1 OR EXISTS(SELECT 1 FROM dbo.BookingItems b WHERE b.PackageId=p.PackageId) OR EXISTS(SELECT 1 FROM dbo.QuotationItems q WHERE q.PackageId=p.PackageId))",
    Review:
      "SELECT COUNT(*) AS count FROM dbo.Reviews WHERE ReviewId=:entity AND DeletedAt IS NULL",
  };
  if (queries[type]) {
    const [result] = await db.select(queries[type], p, tx);
    if (result.count)
      return "The owning entity is active or has booking/quotation history.";
  }
  return null;
}
export async function processCleanup({ apply = false, limit = 25, ids } = {}) {
  const result = {
    examined: 0,
    deleted: 0,
    blocked: 0,
    failed: 0,
    candidates: [],
  };
  // Timed-out requests retain their preassigned storage ID for later safe cleanup.
  if (apply)
    await db.select(
      "UPDATE dbo.Media SET UploadStatus='Failed',ErrorMessage='Upload timed out.',CleanupStatus='Pending',NextCleanupAt=:cleanupAt WHERE UploadStatus='Uploading' AND CreatedAt<DATEADD(minute,-20,SYSUTCDATETIME())",
      { cleanupAt: retentionDate() },
    );
  if (apply)
    await db.transaction(async (tx) => {
      const orphaned = await db.select(
        "UPDATE TOP(100) m SET DeletedAt=SYSUTCDATETIME(),IsPrimary=0,CleanupStatus='Pending',NextCleanupAt=:cleanupAt,ErrorMessage='Owning entity is missing; asset retained for reference checks.' OUTPUT inserted.MediaId AS id FROM dbo.Media m WHERE m.DeletedAt IS NULL AND m.UploadStatus='Ready' AND m.CleanupStatus='None' AND m.CreatedAt<DATEADD(minute,-20,SYSUTCDATETIME()) AND ((m.EntityType='Service' AND NOT EXISTS(SELECT 1 FROM dbo.Services s WHERE s.ServiceId=m.EntityId)) OR (m.EntityType='Package' AND NOT EXISTS(SELECT 1 FROM dbo.ServicePackages p WHERE p.PackageId=m.EntityId)) OR (m.EntityType='Review' AND (NOT EXISTS(SELECT 1 FROM dbo.Reviews r WHERE r.ReviewId=m.EntityId) OR NOT EXISTS(SELECT 1 FROM dbo.ReviewImages ri WHERE ri.MediaId=m.MediaId))))",
        { cleanupAt: retentionDate() },
        tx,
      );
      for (const item of orphaned)
        await db.select(
          "INSERT dbo.AuditLogs(UserId,ActionType,EntityType,EntityId,OldValue,NewValue) VALUES(NULL,'MEDIA_ORPHAN_RETAINED','Media',:id,NULL,'{\"queuedForCleanup\":true}')",
          { id: item.id },
          tx,
        );
    });
  if (ids) z.array(z.guid()).min(1).max(100).parse(ids);
  const rows = await db.select(
    `SELECT TOP(:limit) * FROM dbo.Media WHERE (DeletedAt IS NOT NULL OR UploadStatus='Failed') AND CleanupStatus IN('Pending','Failed','Blocked','Processing') AND (NextCleanupAt IS NULL OR NextCleanupAt<=SYSUTCDATETIME()) AND (CleanupLeaseUntil IS NULL OR CleanupLeaseUntil<SYSUTCDATETIME()) ${ids ? "AND MediaId IN(:ids)" : ""} ORDER BY CreatedAt`,
    { limit: Math.max(1, Math.min(100, limit)), ids },
  );
  for (const row of rows) {
    result.examined++;
    const reason = await references(row);
    if (!apply) {
      result.candidates.push({
        id: row.MediaId,
        reason: reason || "Eligible after storage ownership verification.",
      });
      continue;
    }
    const claimed = await db.select(
      "UPDATE dbo.Media SET CleanupStatus='Processing',CleanupLeaseUntil=DATEADD(minute,2,SYSUTCDATETIME()),CleanupAttempts=CleanupAttempts+1 OUTPUT inserted.MediaId AS id WHERE MediaId=:id AND (DeletedAt IS NOT NULL OR UploadStatus='Failed') AND CleanupStatus<>'Deleted' AND (CleanupLeaseUntil IS NULL OR CleanupLeaseUntil<SYSUTCDATETIME())",
      { id: row.MediaId },
    );
    if (!claimed.length) continue;
    try {
      const latestReason = await references(row);
      if (latestReason) {
        await db.update({ table: "Media", id: "MediaId" }, row.MediaId, {
          CleanupStatus: "Blocked",
          ErrorMessage: latestReason,
          CleanupLeaseUntil: null,
          NextCleanupAt: new Date(Date.now() + 86400000),
        });
        result.blocked++;
        continue;
      }
      await destroyImage(row);
      await db.transaction(async (tx) => {
        await db.update(
          { table: "Media", id: "MediaId" },
          row.MediaId,
          {
            CleanupStatus: "Deleted",
            CleanupLeaseUntil: null,
            ErrorMessage: null,
            UpdatedAt: new Date(),
          },
          tx,
        );
        await db.select(
          "INSERT dbo.AuditLogs(UserId,ActionType,EntityType,EntityId,OldValue,NewValue) VALUES(NULL,'MEDIA_STORAGE_DELETED','Media',:id,NULL,:next)",
          { id: row.MediaId, next: JSON.stringify({ publicId: row.PublicId }) },
          tx,
        );
      });
      result.deleted++;
    } catch {
      await db.update({ table: "Media", id: "MediaId" }, row.MediaId, {
        CleanupStatus: "Failed",
        CleanupLeaseUntil: null,
        ErrorMessage: "Storage deletion failed; will retry.",
        NextCleanupAt: new Date(
          Date.now() +
            Math.min(
              86400000,
              60000 * 2 ** Math.min(row.CleanupAttempts || 0, 10),
            ),
        ),
      });
      result.failed++;
    }
  }
  return result;
}
