import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as repo from "./admin.repository.js";

const resource = { table: "Services", id: "ServiceId" };
const fail = (message, status = 409) => {
  throw Object.assign(new Error(message), { status });
};
export const rejectionReasons = [
  "Incomplete information",
  "Invalid pricing",
  "Poor quality images",
  "Invalid service information",
  "Incorrect category",
  "Duplicate service",
  "Vendor verification issue",
  "Policy violation",
  "Inappropriate content",
  "Location information invalid",
  "Other",
];
export const decisionInput = z
  .object({
    reason: z.string().trim().max(1000).optional(),
    customReason: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(1000).default(""),
    expectedUpdatedAt: z.iso.datetime().optional(),
    expectedStatus: z.string().optional(),
  })
  .strict();
export function decisionReason(body, action) {
  if (action !== "reject") return null;
  const reason = body.reason === "Other" ? body.customReason : body.reason;
  if (!reason?.trim())
    fail(
      "A rejection reason is required. Specify a custom reason for Other.",
      422,
    );
  return reason.trim();
}
export function assertTransition(status, action) {
  const allowed = {
    "start-review": ["Pending"],
    approve: ["Pending", "UnderReview"],
    reject: ["Pending", "UnderReview"],
    suspend: ["Approved"],
    deactivate: ["Approved"],
    activate: ["Approved"],
  };
  if (!allowed[action]?.includes(status))
    fail(
      "This service changed or cannot perform this action. Refresh and review it again.",
    );
}
const source = `FROM dbo.Services s JOIN dbo.Vendors v ON v.VendorId=s.VendorId JOIN dbo.Categories c ON c.CategoryId=s.CategoryId`;
export async function pending(input, ctx) {
  requireRole(ctx, "ADMIN");
  const q = z
    .object({
      page: z.coerce.number().int().min(1).max(100000).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      q: z.string().trim().max(200).default(""),
    })
    .strict()
    .parse(input);
  const p = {
    search: `%${q.q.replace(/[\[\]%_]/g, (x) => `[${x}]`)}%`,
    offset: (q.page - 1) * q.pageSize,
    size: q.pageSize,
  };
  const where = `WHERE s.ApprovalStatus IN ('Pending','UnderReview') AND (s.ServiceName LIKE :search OR v.BusinessName LIKE :search)`;
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total ${source} ${where}`,
    p,
  );
  const rows = await repo.select(
    `SELECT s.ServiceId AS id,s.ServiceName AS name,v.BusinessName AS vendor,c.CategoryName AS category,s.BasePrice AS price,JSON_VALUE(s.DetailsJson,'$.location.city') AS location,s.SubmittedAt AS submittedAt,s.ApprovalStatus AS status,s.UpdatedAt AS updatedAt,v.VerificationStatus AS verificationStatus,(SELECT COUNT(*) FROM dbo.VendorDocuments d WHERE d.VendorId=v.VendorId) AS documents ${source} ${where} ORDER BY s.SubmittedAt,s.ServiceId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    p,
  );
  return {
    rows,
    total: Number(count.total),
    page: q.page,
    pageSize: q.pageSize,
  };
}
export async function approvalHistory(id, ctx, vendorId) {
  if (!vendorId) requireRole(ctx, "ADMIN");
  else {
    const user = requireRole(ctx, "VENDOR");
    if (user.vendor?.id?.toLowerCase() !== vendorId.toLowerCase())
      fail("Access denied.", 403);
  }
  z.guid().parse(id);
  const [service] = await repo.select(
    "SELECT VendorId FROM dbo.Services WHERE ServiceId=:id",
    { id },
  );
  if (
    !service ||
    (vendorId && service.VendorId.toLowerCase() !== vendorId.toLowerCase())
  )
    fail("Service not found.", 404);
  return repo.select(
    `SELECT a.AuditLogId AS id,a.ActionType AS action,a.UserId AS actorId,CONCAT(u.FirstName,' ',u.LastName) AS actor,a.OldValue AS previous,a.NewValue AS details,a.CreatedAt AS timestamp FROM dbo.AuditLogs a LEFT JOIN dbo.Users u ON u.UserId=a.UserId WHERE a.EntityType='Services' AND a.EntityId=:id ORDER BY a.CreatedAt,a.AuditLogId`,
    { id },
  );
}
export async function review(id, ctx) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const [row] = await repo.select(
    `SELECT s.*,v.BusinessName,v.UserId AS VendorUserId,v.VerificationStatus,v.IsActive AS VendorActive,c.CategoryName ${source} WHERE s.ServiceId=:id`,
    { id },
  );
  if (!row) fail("Service not found.", 404);
  const [
    items,
    packages,
    images,
    availability,
    documents,
    history,
    packageItems,
    vendor,
  ] = await Promise.all([
    repo.select(
      "SELECT * FROM dbo.ServiceItems WHERE ServiceId=:id ORDER BY SortOrder,ServiceItemId",
      { id },
    ),
    repo.select("SELECT * FROM dbo.ServicePackages WHERE ServiceId=:id", {
      id,
    }),
    repo.select(
      "SELECT MediaId AS id,MediaUrl AS url,IsPrimary AS [primary] FROM dbo.Media WHERE EntityType='Service' AND EntityId=:id AND MediaType='Image' ORDER BY IsPrimary DESC,SortOrder",
      { id },
    ),
    repo.select(
      "SELECT * FROM dbo.VendorAvailability WHERE VendorId=:vendor AND (ServiceId=:id OR ServiceId IS NULL) ORDER BY AvailableDate",
      { id, vendor: row.VendorId },
    ),
    repo.select(
      "SELECT VendorDocumentId AS id,DocumentType,VerificationStatus FROM dbo.VendorDocuments WHERE VendorId=:vendor",
      { vendor: row.VendorId },
    ),
    approvalHistory(id, ctx),
    repo.select(
      "SELECT pi.* FROM dbo.PackageItems pi JOIN dbo.ServicePackages p ON p.PackageId=pi.PackageId WHERE p.ServiceId=:id ORDER BY pi.SortOrder,pi.PackageItemId",
      { id },
    ),
    repo.select(
      "SELECT v.BusinessName,v.BusinessDescription,v.ContactEmail,v.ContactPhone,v.VerificationStatus,v.IsActive,CONCAT(u.FirstName,' ',u.LastName) AS OwnerName,u.Email AS OwnerEmail,u.PhoneNumber AS OwnerPhone FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId WHERE v.VendorId=:id",
      { id: row.VendorId },
    ),
  ]);
  return {
    ...row,
    document: JSON.parse(row.DetailsJson || "{}"),
    attributes: JSON.parse(row.AttributesJson || "{}"),
    items,
    packages: packages.map((p) => ({
      ...p,
      items: packageItems.filter(
        (i) => i.PackageId.toLowerCase() === p.PackageId.toLowerCase(),
      ),
    })),
    images,
    availability,
    documents,
    history,
    vendor: vendor[0],
  };
}
export async function decide(id, action, input, ctx) {
  const admin = requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const body = decisionInput.parse(input),
    reason = decisionReason(body, action);
  return repo.transaction(async (tx) => {
    const old = await repo.lockRecord(resource, id, tx);
    if (
      (body.expectedStatus && body.expectedStatus !== old.ApprovalStatus) ||
      (body.expectedUpdatedAt &&
        new Date(body.expectedUpdatedAt).getTime() !==
          new Date(old.UpdatedAt).getTime())
    )
      fail("Service changed. Refresh before deciding.");
    assertTransition(old.ApprovalStatus, action);
    const [vendor] = await repo.select(
      "SELECT v.UserId,v.VerificationStatus,v.IsActive,u.IsActive AS OwnerActive,u.IsBlocked AS OwnerBlocked,u.IsEmailVerified FROM dbo.Vendors v WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Users u ON u.UserId=v.UserId WHERE v.VendorId=:id",
      { id: old.VendorId },
      tx,
    );
    if (vendor.UserId.toLowerCase() === admin.id.toLowerCase())
      fail("You cannot review your own service.", 403);
    if (
      ["approve", "activate"].includes(action) &&
      (vendor.VerificationStatus !== "Approved" || !vendor.IsActive)
    )
      fail("The vendor must be approved and active.", 409);
    if (
      ["approve", "activate"].includes(action) &&
      (!vendor.OwnerActive || vendor.OwnerBlocked || !vendor.IsEmailVerified)
    )
      fail("The vendor owner must have an active, verified account.", 409);
    const status =
      {
        approve: "Approved",
        reject: "Rejected",
        suspend: "Suspended",
        "start-review": "UnderReview",
      }[action] || "Approved";
    const now = new Date();
    const values = {
      ApprovalStatus: status,
      IsActive: ["approve", "activate"].includes(action) ? 1 : 0,
      UpdatedAt: now,
    };
    if (action === "approve")
      Object.assign(values, {
        ApprovedAt: now,
        ApprovedBy: admin.id,
        RejectionReason: null,
        RejectedAt: null,
        RejectedBy: null,
        AdminNote: body.notes || null,
      });
    if (action === "reject")
      Object.assign(values, {
        RejectedAt: now,
        RejectedBy: admin.id,
        RejectionReason: reason,
        AdminNote: body.notes || null,
      });
    await repo.update(resource, id, values, tx);
    if (
      old.ApprovalStatus === "Pending" &&
      ["approve", "reject"].includes(action)
    )
      await repo.auditAdmin(
        ctx,
        "SERVICE_REVIEWED",
        "Services",
        id,
        { status: "Pending" },
        { status: "UnderReview", cycle: old.ApprovalCycle },
        tx,
      );
    await repo.auditAdmin(
      ctx,
      `SERVICE_${action.toUpperCase().replaceAll("-", "_")}`,
      "Services",
      id,
      { status: old.ApprovalStatus, active: !!old.IsActive },
      {
        status,
        active: !!values.IsActive,
        reason,
        notes: body.notes,
        cycle: old.ApprovalCycle,
      },
      tx,
    );
    if (action !== "start-review")
      await repo.select(
        "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) VALUES(:user,'ServiceApproval',:title,:message,'Service',:id)",
        {
          user: vendor.UserId,
          title: `Service ${status.toLowerCase()}`,
          message:
            `Your service ${old.ServiceName} has been ${action === "reject" ? "rejected" : action === "approve" ? "approved" : action === "activate" ? "activated" : action === "deactivate" ? "deactivated" : "suspended"}.${reason ? ` Reason: ${reason}.` : ""}${body.notes ? ` Admin Note: ${body.notes}` : ""}`.slice(
              0,
              2000,
            ),
          id,
        },
        tx,
      );
    return {
      message: {
        "start-review": "Service review started.",
        approve: "Service approved and activated.",
        reject: "Service rejected. The vendor has been notified.",
        suspend: "Service suspended.",
        activate: "Service activated.",
        deactivate: "Service deactivated.",
      }[action],
      status,
      active: !!values.IsActive,
    };
  });
}
