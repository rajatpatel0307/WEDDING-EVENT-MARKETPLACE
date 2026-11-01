import { z } from "zod";
import * as db from "../admin/admin.repository.js";
import { requireRole, requireAuth } from "../../middleware/auth.middleware.js";
import * as validation from "./cms.validation.js";
import { termsTitles, privacyTitles, template } from "./cms.templates.js";
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const cached = new Map();
const keyInput = z.enum(validation.pageKeys);
const admin = (ctx) => requireRole(ctx, "ADMIN");
const insert = async (table, id, values, tx) =>
  (await db.insert({ table, id }, values, tx))[0];
const audit = (ctx, action, id, old, next, tx) =>
  db.auditAdmin(
    ctx,
    `CMS_${action}`,
    "CMSPageVersions",
    id,
    old ?? null,
    next ?? null,
    tx,
  );
const safe = (row) => ({
  id: row.VersionId,
  pageKey: row.PageKey,
  version: row.VersionNumber,
  status: row.Status,
  revision: row.Revision,
  effectiveDate: row.EffectiveDate,
  requiresAcceptance: !!row.RequiresAcceptance,
  publishedAt: row.PublishedAt,
  updatedAt: row.UpdatedAt,
  createdAt: row.CreatedAt,
  publishedBy: row.PublishedBy,
  content: JSON.parse(row.ContentJson),
});
export async function current(key, tx) {
  keyInput.parse(key);
  const [row] = await db.select(
    "SELECT * FROM dbo.CMSPageVersions WHERE PageKey=:key AND Status='Published'",
    { key },
    tx,
  );
  return row;
}
export async function publicPage(key) {
  const row = await current(key);
  if (!row) fail("This document has not been published yet.", 404);
  let result = cached.get(row.VersionId);
  if (!result) {
    result = safe(row);
    if (cached.size > 100) cached.clear();
    cached.set(row.VersionId, result);
  }
  if (key === "about-us")
    return {
      ...result,
      categories: await db.select(
        "SELECT CategoryId AS id,CategoryName AS name,Description AS description,IconName AS icon,CategoryCode AS code FROM dbo.Categories WHERE IsActive=1 ORDER BY SortOrder,CategoryId",
      ),
    };
  return key === "contact"
    ? { ...result, mapsEnabled: process.env.CMS_MAPS_ENABLED === "true" }
    : result;
}
export async function pages(ctx) {
  admin(ctx);
  return db.select(
    "SELECT VersionId AS id,PageKey AS pageKey,VersionNumber AS version,Status AS status,Revision AS revision,EffectiveDate AS effectiveDate,PublishedAt AS publishedAt,UpdatedAt AS updatedAt FROM dbo.CMSPageVersions ORDER BY PageKey,VersionNumber DESC",
  );
}
export async function details(id, ctx) {
  admin(ctx);
  z.guid().parse(id);
  const [row] = await db.select(
    "SELECT * FROM dbo.CMSPageVersions WHERE VersionId=:id",
    { id },
  );
  if (!row) fail("Content version not found.", 404);
  return {
    ...safe(row),
    history: await db.select(
      "SELECT UserId,ActionType,CreatedAt,OldValue,NewValue FROM dbo.AuditLogs WHERE EntityType='CMSPageVersions' AND EntityId=:id ORDER BY CreatedAt DESC",
      { id },
    ),
  };
}
async function pageLock(key, tx) {
  await db.select(
    "DECLARE @result int; EXEC @result=sp_getapplock @Resource=:resource,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @result<0 THROW 51000,'Content is busy; retry shortly.',1;",
    { resource: `CMS:${key}` },
    tx,
  );
}
export async function draft(key, ctx, sourceId) {
  const user = admin(ctx);
  keyInput.parse(key);
  if (sourceId) z.guid().parse(sourceId);
  return db.transaction(async (tx) => {
    await pageLock(key, tx);
    const [existing] = await db.select(
      "SELECT * FROM dbo.CMSPageVersions WHERE PageKey=:key AND Status='Draft'",
      { key },
      tx,
    );
    if (existing) return safe(existing);
    const [source] = await db.select(
      `SELECT TOP(1) * FROM dbo.CMSPageVersions WHERE PageKey=:key ${sourceId ? "AND VersionId=:sourceId" : ""} ORDER BY VersionNumber DESC`,
      { key, sourceId },
      tx,
    );
    if (sourceId && !source) fail("Source version not found.", 404);
    const [number] = await db.select(
      "SELECT COALESCE(MAX(VersionNumber),0)+1 AS version FROM dbo.CMSPageVersions WHERE PageKey=:key",
      { key },
      tx,
    );
    const record = await insert(
      "CMSPageVersions",
      "VersionId",
      {
        PageKey: key,
        VersionNumber: number.version,
        ContentJson: source?.ContentJson || JSON.stringify(template(key)),
        Status: "Draft",
        CreatedBy: user.id,
        UpdatedBy: user.id,
        RequiresAcceptance: source?.RequiresAcceptance || 0,
      },
      tx,
    );
    await audit(
      ctx,
      "DRAFT_CREATED",
      record.id,
      null,
      { pageKey: key, sourceId: source?.VersionId || null },
      tx,
    );
    return {
      ...safe({
        ...source,
        VersionId: record.id,
        VersionNumber: number.version,
        PageKey: key,
        Status: "Draft",
        ContentJson: source?.ContentJson || JSON.stringify(template(key)),
        Revision: 1,
      }),
      effectiveDate: null,
    };
  });
}
async function locked(id, tx) {
  z.guid().parse(id);
  const [row] = await db.select(
    "SELECT * FROM dbo.CMSPageVersions WITH(UPDLOCK,HOLDLOCK) WHERE VersionId=:id",
    { id },
    tx,
  );
  if (!row) fail("Content version not found.", 404);
  return row;
}
async function validateMedia(content, tx) {
  const ids = [
    content.heroMediaId,
    ...content.categoryOverrides.map((c) => c.mediaId),
  ].filter(Boolean);
  for (const id of new Set(ids)) {
    const [row] = await db.select(
      "SELECT MediaId FROM dbo.Media WHERE MediaId=:id AND EntityType='Admin' AND ModerationStatus='Approved' AND UploadStatus='Ready' AND DeletedAt IS NULL",
      { id },
      tx,
    );
    if (!row) fail("Choose an approved platform image from the Media Library.");
  }
  if (
    content.contact.mapUrl &&
    !/^https:\/\/(www\.)?(google\.com\/maps|maps\.google\.com\/)/.test(
      content.contact.mapUrl,
    )
  )
    fail("Use a verified Google Maps link.");
}
export async function save(id, input, ctx) {
  const user = admin(ctx),
    b = validation.saveInput.parse(input);
  return db.transaction(async (tx) => {
    const row = await locked(id, tx);
    if (row.Status !== "Draft" || row.Revision !== b.expectedRevision)
      fail("This draft changed. Refresh before saving.", 409);
    await validateMedia(b.content, tx);
    await db.update(
      { table: "CMSPageVersions", id: "VersionId" },
      id,
      {
        ContentJson: JSON.stringify(b.content),
        RequiresAcceptance: b.requiresAcceptance ? 1 : 0,
        EffectiveDate: b.effectiveDate,
        Revision: row.Revision + 1,
        UpdatedBy: user.id,
        UpdatedAt: new Date(),
      },
      tx,
    );
    await audit(
      ctx,
      "DRAFT_SAVED",
      id,
      { revision: row.Revision },
      { revision: row.Revision + 1 },
      tx,
    );
    return { message: "Draft saved.", revision: row.Revision + 1 };
  });
}
export function assertPublishable(row, input) {
  const b = validation.publishInput.parse(input),
    content = validation.contentInput.parse(JSON.parse(row.ContentJson));
  if (row.Status !== "Draft" || row.Revision !== b.expectedRevision)
    fail("Refresh the draft before publishing.", 409);
  if (["terms", "privacy"].includes(row.PageKey)) {
    if (!b.legalReviewed)
      fail(
        "Confirm that a qualified legal professional reviewed and approved this wording.",
      );
    if (!row.EffectiveDate) fail("An effective date is required.");
    const date =
      typeof row.EffectiveDate === "string"
        ? row.EffectiveDate.slice(0, 10)
        : new Date(row.EffectiveDate).toISOString().slice(0, 10);
    if (
      date >
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
    )
      fail(
        "Scheduled publication is not enabled. Choose a current or past effective date.",
      );
    const required = row.PageKey === "terms" ? termsTitles : privacyTitles;
    if (
      required.some(
        (title) =>
          !content.sections.some(
            (s) =>
              s.id ===
                title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/-$/, "") && s.body.trim().length >= 20,
          ),
      )
    )
      fail(
        "Complete every legal outline section with reviewed wording before publication.",
      );
  }
  if (!content.introduction || !content.metaDescription)
    fail("An introduction and SEO description are required.");
  return content;
}
export async function publish(id, input, ctx) {
  z.guid().parse(id);
  const user = admin(ctx);
  return db.transaction(async (tx) => {
    const [initial] = await db.select(
      "SELECT PageKey FROM dbo.CMSPageVersions WHERE VersionId=:id",
      { id },
      tx,
    );
    if (!initial) fail("Content not found.", 404);
    await pageLock(initial.PageKey, tx);
    const row = await locked(id, tx),
      content = assertPublishable(row, input);
    await validateMedia(content, tx);
    await db.select(
      "UPDATE dbo.CMSPageVersions SET Status='Archived' WHERE PageKey=:key AND Status='Published'",
      { key: row.PageKey },
      tx,
    );
    await db.update(
      { table: "CMSPageVersions", id: "VersionId" },
      id,
      {
        Status: "Published",
        PublishedBy: user.id,
        PublishedAt: new Date(),
        UpdatedAt: new Date(),
        LegalReviewed: ["terms", "privacy"].includes(row.PageKey) ? 1 : 0,
      },
      tx,
    );
    await audit(
      ctx,
      "PUBLISHED",
      id,
      { status: "Draft" },
      {
        status: "Published",
        pageKey: row.PageKey,
        version: row.VersionNumber,
        legalReviewed: !!input.legalReviewed,
      },
      tx,
    );
    tx.afterCommit(() => cached.clear());
    return {
      message: "Version published. Previous published content is preserved.",
    };
  });
}
export async function archive(id, ctx) {
  admin(ctx);
  return db.transaction(async (tx) => {
    const row = await locked(id, tx);
    if (row.Status === "Published")
      fail("Publish a replacement before archiving the current version.", 409);
    if (row.Status === "Draft")
      await db.update(
        { table: "CMSPageVersions", id: "VersionId" },
        id,
        { Status: "Archived", UpdatedAt: new Date() },
        tx,
      );
    await audit(ctx, "ARCHIVED", id, null, { status: "Archived" }, tx);
    return { message: "Version archived." };
  });
}
export async function legalCurrent(tx) {
  return db.select(
    "SELECT VersionId AS id,PageKey AS type,VersionNumber AS version,RequiresAcceptance AS required,PublishedAt AS publishedAt FROM dbo.CMSPageVersions WHERE PageKey IN('terms','privacy') AND Status='Published'",
    {},
    tx,
  );
}
export async function recordAcceptances(userId, versions, tx) {
  for (const id of versions) {
    z.guid().parse(id);
    const [row] = await db.select(
      "SELECT * FROM dbo.CMSPageVersions WITH(HOLDLOCK) WHERE VersionId=:id AND PageKey IN('terms','privacy') AND Status='Published'",
      { id },
      tx,
    );
    if (!row)
      fail(
        "A legal document changed. Read the current version and accept it explicitly.",
        409,
      );
    await db.select(
      "IF NOT EXISTS(SELECT 1 FROM dbo.LegalDocumentAcceptances WITH(UPDLOCK,HOLDLOCK) WHERE UserId=:user AND VersionId=:id) INSERT dbo.LegalDocumentAcceptances(UserId,VersionId,DocumentType) VALUES(:user,:id,:type)",
      { user: userId, id, type: row.PageKey },
      tx,
    );
  }
}
export async function accept(input, ctx) {
  const user = requireAuth(ctx),
    b = z
      .object({
        explicit: z.literal(true),
        versionIds: z.array(z.guid()).min(1).max(2),
      })
      .strict()
      .parse(input);
  return db.transaction(async (tx) => {
    await recordAcceptances(user.id, b.versionIds, tx);
    return { message: "Your explicit acceptance was recorded." };
  });
}
export async function acceptanceStatus(ctx) {
  const user = requireAuth(ctx),
    current = await legalCurrent(),
    history = await db.select(
      "SELECT a.VersionId AS id,a.DocumentType AS type,a.AcceptedAt AS acceptedAt,v.VersionNumber AS version FROM dbo.LegalDocumentAcceptances a JOIN dbo.CMSPageVersions v ON v.VersionId=a.VersionId WHERE a.UserId=:user ORDER BY a.AcceptedAt DESC",
      { user: user.id },
    );
  return {
    current: current.map((v) => ({
      ...v,
      accepted: history.some(
        (h) => String(h.id).toLowerCase() === String(v.id).toLowerCase(),
      ),
      needsAcceptance:
        !!v.required &&
        !history.some(
          (h) => String(h.id).toLowerCase() === String(v.id).toLowerCase(),
        ),
    })),
    history,
  };
}
export async function signupAcceptances(userId, data, tx) {
  const current = await legalCurrent(tx),
    ids = [];
  for (const row of current) {
    const id =
      row.type === "terms" ? data.termsVersionId : data.privacyVersionId;
    if (row.required && !id)
      fail(
        "Review and explicitly accept the current published legal documents before registering.",
        409,
      );
    if (id) {
      if (String(id).toLowerCase() !== String(row.id).toLowerCase())
        fail(
          "A legal document changed. Refresh registration and review the current version.",
          409,
        );
      ids.push(id);
    }
  }
  await recordAcceptances(userId, ids, tx);
}
