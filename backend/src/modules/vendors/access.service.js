import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as repo from "../admin/admin.repository.js";

export const statusSchema = z.enum([
  "Pending",
  "Approved",
  "Rejected",
  "Suspended",
]);
const accessType = z.enum(["service", "booking"]);
const prefixes = { service: "Service", booking: "Booking" };
const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};
const columns = `v.VendorId AS id,CONCAT(u.FirstName,' ',u.LastName) AS name,v.BusinessName AS businessName,
  COALESCE(v.ContactEmail,u.Email) AS email,COALESCE(v.ContactPhone,u.PhoneNumber) AS phone,v.CreatedAt AS registeredAt,
  v.VerificationStatus AS verificationStatus,v.IsActive AS active,
  v.ServiceAccessStatus AS serviceStatus,v.ServiceAccessReason AS serviceReason,v.ServiceAccessChangedBy AS serviceChangedBy,v.ServiceAccessChangedAt AS serviceChangedAt,
  v.BookingAccessStatus AS bookingStatus,v.BookingAccessReason AS bookingReason,v.BookingAccessChangedBy AS bookingChangedBy,v.BookingAccessChangedAt AS bookingChangedAt,
  (SELECT STRING_AGG(CONVERT(nvarchar(max),c.CategoryName),', ') FROM dbo.VendorCategories vc JOIN dbo.Categories c ON c.CategoryId=vc.CategoryId WHERE vc.VendorId=v.VendorId) AS category`;
export async function read(id, tx) {
  z.guid().parse(id);
  const [row] = await repo.select(
    `SELECT ${columns} FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId WHERE v.VendorId=:id`,
    { id },
    tx,
  );
  if (!row) fail("Vendor not found.", 404);
  return row;
}
export async function vendorStatus(ctx) {
  const user = requireRole(ctx, "VENDOR");
  if (!user.vendor?.id) fail("Vendor profile required.", 403);
  return read(user.vendor.id);
}
export async function assertAccess(id, type, tx) {
  const prefix = prefixes[accessType.parse(type)];
  // Keep this lock until the protected write commits, serializing revocations.
  const [row] = await repo.select(
    `SELECT v.VerificationStatus,v.IsActive,v.${prefix}AccessStatus AS accessStatus,u.IsActive AS userActive,u.IsBlocked,u.IsEmailVerified FROM dbo.Vendors v ${tx ? "WITH(UPDLOCK,HOLDLOCK)" : ""} JOIN dbo.Users u ON u.UserId=v.UserId WHERE v.VendorId=:id`,
    { id: z.guid().parse(id) },
    tx,
  );
  if (
    !row ||
    row.VerificationStatus !== "Approved" ||
    !row.IsActive ||
    !row.userActive ||
    row.IsBlocked ||
    !row.IsEmailVerified
  )
    fail("An approved, active vendor is required.", 403);
  if (row.accessStatus !== "Approved")
    fail(
      `${prefix} access is ${row.accessStatus?.toLowerCase() || "pending"}. Administrator approval is required for ${type === "service" ? "creating or submitting services" : "new bookings"}.`,
      403,
    );
}
export async function list(input, ctx) {
  requireRole(ctx, "ADMIN");
  const q = z
    .object({
      q: z.string().trim().max(200).default(""),
      service: z.union([statusSchema, z.literal("")]).default(""),
      booking: z.union([statusSchema, z.literal("")]).default(""),
      category: z.coerce.number().int().positive().optional(),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .parse(input);
  const params = {
    ...q,
    search: `%${q.q.replace(/[\[\]%_]/g, (x) => `[${x}]`)}%`,
    offset: (q.page - 1) * q.pageSize,
    size: q.pageSize,
  };
  const where = ["1=1"];
  if (q.q)
    where.push(
      "(CONCAT(u.FirstName,' ',u.LastName) LIKE :search OR v.BusinessName LIKE :search OR u.Email LIKE :search OR v.ContactEmail LIKE :search OR v.ContactPhone LIKE :search OR u.PhoneNumber LIKE :search)",
    );
  if (q.service) where.push("v.ServiceAccessStatus=:service");
  if (q.booking) where.push("v.BookingAccessStatus=:booking");
  if (q.category)
    where.push(
      "EXISTS(SELECT 1 FROM dbo.VendorCategories vc WHERE vc.VendorId=v.VendorId AND vc.CategoryId=:category)",
    );
  const source = `FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId WHERE ${where.join(" AND ")}`;
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total ${source}`,
    params,
  );
  return {
    rows: await repo.select(
      `SELECT ${columns} ${source} ORDER BY v.CreatedAt DESC,v.VendorId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
      params,
    ),
    total: Number(count.total),
    page: q.page,
    pageSize: q.pageSize,
    categories: await repo.select(
      "SELECT CategoryId AS id,CategoryName AS name FROM dbo.Categories ORDER BY CategoryName",
    ),
  };
}
export async function detail(id, ctx) {
  requireRole(ctx, "ADMIN");
  return read(id);
}
export async function history(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  await read(id);
  const q = z
    .object({
      page: z.coerce.number().int().min(1).max(100000).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .parse(input);
  const params = { id, offset: (q.page - 1) * q.pageSize, size: q.pageSize };
  const source =
    "FROM dbo.AuditLogs WHERE EntityType='VendorAccess' AND EntityId=:id";
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total ${source}`,
    params,
  );
  return {
    rows: await repo.select(
      `SELECT AuditLogId AS id,UserId AS actionBy,ActionType AS action,JSON_VALUE(OldValue,'$.status') AS previousStatus,JSON_VALUE(NewValue,'$.status') AS newStatus,JSON_VALUE(NewValue,'$.accessType') AS accessType,JSON_VALUE(NewValue,'$.reason') AS reason,CreatedAt AS createdAt ${source} ORDER BY CreatedAt DESC,AuditLogId DESC OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
      params,
    ),
    total: Number(count.total),
    ...q,
  };
}
export async function decide(id, type, action, input, ctx) {
  const admin = requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const prefix = prefixes[accessType.parse(type)];
  const target = {
    approve: "Approved",
    reject: "Rejected",
    suspend: "Suspended",
  }[z.enum(["approve", "reject", "suspend"]).parse(action)];
  const body = z
    .object({
      expectedStatus: statusSchema,
      reason: z.string().trim().max(1000).default(""),
    })
    .strict()
    .parse(input);
  if (target !== "Approved" && !body.reason)
    fail("A reason is required when rejecting or suspending access.", 400);
  return repo.transaction(async (tx) => {
    const row = await repo.lockRecord(
      { table: "Vendors", id: "VendorId" },
      id,
      tx,
    );
    const previous = row[`${prefix}AccessStatus`];
    if (previous !== body.expectedStatus)
      fail("Access changed. Refresh before trying again.", 409);
    if (previous === target)
      fail("This access already has the requested status.", 409);
    if (!statusSchema.safeParse(previous).success)
      fail("Invalid current access status.", 409);
    const now = new Date();
    await repo.update(
      { table: "Vendors", id: "VendorId" },
      id,
      {
        [`${prefix}AccessStatus`]: target,
        [`${prefix}AccessChangedBy`]: admin.id,
        [`${prefix}AccessChangedAt`]: now,
        [`${prefix}AccessReason`]: body.reason || null,
      },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      `VENDOR_${type.toUpperCase()}_ACCESS_${target.toUpperCase()}`,
      "VendorAccess",
      id,
      { status: previous },
      {
        accessType: prefix,
        status: target,
        reason: body.reason || null,
        changedAt: now.toISOString(),
      },
      tx,
    );
    return {
      message: `${prefix} access ${target.toLowerCase()}.`,
      vendor: await read(id, tx),
    };
  });
}
