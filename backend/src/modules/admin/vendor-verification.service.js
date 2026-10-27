import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as repo from "./admin.repository.js";
import { dateBounds } from "./admin.validation.js";

const error = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const status = z.enum([
  "Pending",
  "UnderReview",
  "Approved",
  "Rejected",
  "Suspended",
]);
export const decisionInput = z
  .object({
    notes: z.string().trim().max(2000).default(""),
    reason: z.string().trim().max(1000).default(""),
    expectedStatus: status.optional(),
    expectedUpdatedAt: z.iso.datetime().optional(),
  })
  .strict();
const transitions = {
  Pending: ["UnderReview", "Approved", "Rejected"],
  UnderReview: ["Approved", "Rejected"],
  Approved: ["Suspended"],
  Suspended: ["Approved"],
  Rejected: ["Reapply"],
};
export function validateDecision(from, target, input) {
  const body = decisionInput.parse(input);
  if (body.expectedStatus && body.expectedStatus !== from)
    error("This application changed. Refresh and review it again.", 409);
  if (target === "Rejected" && (!body.reason || !body.notes))
    error("Provide a rejection reason and admin notes.");
  if (["Suspended", "Reapply"].includes(target) && !body.notes)
    error("Admin notes are required for this decision.");
  if (target === "Suspended" && !body.reason)
    error("A suspension reason is required.");

  if (!transitions[from]?.includes(target))
    error(
      from === "Rejected"
        ? "Reopen this rejected application as a new verification cycle before reviewing it."
        : `Cannot change a ${from} vendor to ${target}. Refresh and review the current status.`,
      409,
    );
  return body;
}
export async function decideVendor(
  id,
  target,
  input,
  ctx,
  withTransaction = repo.transaction,
) {
  const admin = requireRole(ctx, "ADMIN");
  z.uuid().parse(id);
  z.enum(["Approved", "Rejected", "Suspended", "UnderReview", "Reapply"]).parse(
    target,
  );
  // Validate size and unknown fields before obtaining database locks.
  const parsed = decisionInput.parse(input);
  return withTransaction(async (tx) => {
    const vendor = await repo.lockRecord(
      { table: "Vendors", id: "VendorId" },
      id,
      tx,
    );
    const body = validateDecision(vendor.VerificationStatus, target, parsed);
    if (
      body.expectedUpdatedAt &&
      new Date(vendor.UpdatedAt).getTime() !==
        new Date(body.expectedUpdatedAt).getTime()
    )
      error("Vendor details changed. Refresh before making a decision.", 409);
    const [owner] = await repo.select(
      "SELECT IsEmailVerified,IsActive,IsBlocked FROM dbo.Users WITH(UPDLOCK,HOLDLOCK) WHERE UserId=:id",
      { id: vendor.UserId },
      tx,
    );
    if (!owner) error("Vendor owner not found.", 404);
    if (
      target === "Approved" &&
      (!owner.IsEmailVerified || !owner.IsActive || owner.IsBlocked)
    )
      error(
        "Approval requires an active, unblocked owner with a verified email.",
      );
    let cycle = Number(vendor.VerificationCycle || 1),
      previous = vendor.VerificationStatus;
    async function record(next, reason, notes) {
      await repo.select(
        "INSERT INTO dbo.VendorVerificationHistory(VendorId,CycleNumber,FromStatus,ToStatus,Reason,Notes,AdminId) VALUES(:id,:cycle,:previous,:next,:reason,:notes,:admin)",
        {
          id,
          cycle,
          previous,
          next,
          reason: reason || null,
          notes: notes || null,
          admin: admin.id,
        },
        tx,
      );
      await repo.auditAdmin(
        ctx,
        `ADMIN_VENDOR_${next.toUpperCase()}`,
        "Vendors",
        id,
        {
          status: previous,
          active: !!vendor.IsActive,
          cycle:
            previous === vendor.VerificationStatus
              ? Number(vendor.VerificationCycle || 1)
              : cycle,
          reason: vendor.VerificationRemarks || null,
        },
        { status: next, cycle, reason, note: notes },
        tx,
      );
      previous = next;
    }
    if (previous === "Pending" && ["Approved", "Rejected"].includes(target))
      await record(
        "UnderReview",
        "",
        "Review started as part of the administrator decision.",
      );
    const next = target === "Reapply" ? "UnderReview" : target;
    if (target === "Reapply") cycle += 1;
    await record(next, body.reason, body.notes);
    const values = {
      VerificationStatus: next,
      VerificationRemarks: body.reason || null,
      VerificationCycle: cycle,
      UpdatedAt: new Date(),
    };
    if (target === "Approved")
      Object.assign(values, {
        IsActive: 1,
        VerifiedAt: new Date(),
        VerifiedBy: admin.id,
      });
    if (["Rejected", "Suspended", "Reapply"].includes(target))
      values.IsActive = 0;
    if (target === "Reapply")
      Object.assign(values, { VerifiedAt: null, VerifiedBy: null });
    await repo.update({ table: "Vendors", id: "VendorId" }, id, values, tx);
    if (["Rejected", "Suspended", "Reapply"].includes(target))
      await repo.select(
        "UPDATE dbo.AuthSessions SET revokedAt=SYSUTCDATETIME() WHERE userId=:id AND revokedAt IS NULL",
        { id: vendor.UserId },
        tx,
      );
    const vendorMessage = body.reason
      ? `${body.reason}${target === "Rejected" ? ` ${body.notes}` : ""}`
      : target === "Reapply"
        ? "Your application has been reopened for a new verification cycle."
        : "";
    await repo.notifyVendor(vendor.UserId, id, next, vendorMessage, tx);
    return {
      success: true,
      message:
        target === "Reapply"
          ? "New vendor verification cycle started"
          : target === "UnderReview"
            ? "Vendor is now under review"
            : `Vendor ${target.toLowerCase()} successfully`,
      data: {
        vendorId: id,
        status: next,
        isActive:
          target === "Approved"
            ? true
            : ["Rejected", "Suspended", "Reapply"].includes(target)
              ? false
              : !!vendor.IsActive,
        cycle,
        verifiedAt: Object.hasOwn(values, "VerifiedAt")
          ? values.VerifiedAt
          : (vendor.VerifiedAt ?? null),
      },
    };
  });
}

export const queueQuery = z
  .object({
    q: z.string().trim().max(200).default(""),
    category: z.coerce.number().int().positive().optional(),
    city: z.string().trim().max(100).default(""),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    documentStatus: z
      .enum(["", "Missing", "Pending", "Approved", "Rejected"])
      .default(""),
    status: z
      .enum(["", "Pending", "UnderReview", "Approved", "Rejected", "Suspended"])
      .default(""),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "Start date must precede end date.",
  });
export async function pendingCount(ctx) {
  requireRole(ctx, "ADMIN");
  const [row] = await repo.select(
    "SELECT COUNT(*) AS total FROM dbo.Vendors WHERE VerificationStatus IN ('Pending','UnderReview')",
  );
  return { success: true, data: { pendingCount: Number(row.total) } };
}
export async function pendingVendors(input, ctx) {
  requireRole(ctx, "ADMIN");
  const query = queueQuery.parse(input),
    bounds = dateBounds(query.from, query.to);
  const params = {
    ...bounds,
    q: `%${query.q.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`,
    category: query.category || null,
    city: query.city,
    status: query.status,
    offset: (query.page - 1) * query.pageSize,
    size: query.pageSize,
  };
  const documentStatus =
    "CASE WHEN NOT EXISTS(SELECT 1 FROM dbo.VendorDocuments d WHERE d.VendorId=v.VendorId) THEN 'Missing' WHEN EXISTS(SELECT 1 FROM dbo.VendorDocuments d WHERE d.VendorId=v.VendorId AND d.VerificationStatus='Rejected') THEN 'Rejected' WHEN EXISTS(SELECT 1 FROM dbo.VendorDocuments d WHERE d.VendorId=v.VendorId AND d.VerificationStatus='Pending') THEN 'Pending' ELSE 'Approved' END";
  const where = [
    query.status
      ? "v.VerificationStatus=:status"
      : "v.VerificationStatus IN ('Pending','UnderReview')",
    query.q
      ? "(v.BusinessName LIKE :q OR CONCAT(u.FirstName,' ',u.LastName) LIKE :q OR u.Email LIKE :q OR v.ContactEmail LIKE :q)"
      : "1=1",
    query.category
      ? "EXISTS(SELECT 1 FROM dbo.VendorCategories c WHERE c.VendorId=v.VendorId AND c.CategoryId=:category)"
      : "1=1",
    query.city
      ? "EXISTS(SELECT 1 FROM dbo.VendorLocations l WHERE l.VendorId=v.VendorId AND l.City=:city)"
      : "1=1",
    bounds.from ? "v.CreatedAt>=:from" : "1=1",
    bounds.to ? "v.CreatedAt<:to" : "1=1",
    query.documentStatus ? `${documentStatus}=:documentStatus` : "1=1",
  ].join(" AND ");
  params.documentStatus = query.documentStatus;
  const source = `FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId WHERE ${where}`;
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total ${source}`,
    params,
  );
  const rows = await repo.select(
    `SELECT v.VendorId AS id,v.BusinessName AS name,CONCAT(u.FirstName,' ',u.LastName) AS owner,COALESCE(v.ContactEmail,u.Email) AS email,v.VerificationStatus AS status,v.CreatedAt AS createdAt,v.UpdatedAt AS updatedAt,${documentStatus} AS documentStatus,(SELECT COUNT(*) FROM dbo.VendorDocuments d WHERE d.VendorId=v.VendorId) AS documents,(SELECT STRING_AGG(c.CategoryName,', ') FROM dbo.VendorCategories vc JOIN dbo.Categories c ON c.CategoryId=vc.CategoryId WHERE vc.VendorId=v.VendorId) AS categories,(SELECT STRING_AGG(l.City,', ') FROM dbo.VendorLocations l WHERE l.VendorId=v.VendorId) AS city ${source} ORDER BY v.CreatedAt DESC,v.VendorId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    params,
  );
  const categories = await repo.select(
    "SELECT CategoryId AS id,CategoryName AS name FROM dbo.Categories WHERE IsActive=1 ORDER BY CategoryName",
  );
  const cities = await repo.select(
    "SELECT DISTINCT City AS name FROM dbo.VendorLocations ORDER BY City",
  );
  return {
    success: true,
    rows,
    total: Number(count.total),
    page: query.page,
    pageSize: query.pageSize,
    categories,
    cities,
    ...(await pendingCount(ctx)).data,
  };
}
