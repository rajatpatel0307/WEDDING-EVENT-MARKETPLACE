import { decideVendor } from "./vendor-verification.service.js";
import { z } from "zod";
import { sequelize } from "../../config/database.js";
import { getResource } from "./admin.resources.js";
import * as repo from "./admin.repository.js";
import { reviewInput, actionInput, recordInput } from "./admin.validation.js";
import { requireRole } from "../../middleware/auth.middleware.js";
const error = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
export const validId = (r, id) =>
  r.id.endsWith("Id") &&
  ["CategoryId", "SubCategoryId", "AuditLogId", "WishlistId"].includes(r.id)
    ? z.coerce.number().int().positive().parse(id)
    : z.guid().parse(id);
export async function reviewVendor(
  id,
  input,
  ctx,
  withTransaction = repo.transaction,
) {
  const body = reviewInput.parse(input);
  return decideVendor(
    id,
    body.status,
    {
      expectedStatus: body.expectedStatus,
      reason: body.reason,
      notes: body.note,
    },
    ctx,
    withTransaction,
  );
}
const transitions = {
  Pending: ["Confirmed", "Cancelled"],
  Accepted: ["Confirmed", "Cancelled"],
  PaymentPending: ["Cancelled"],
  Confirmed: ["Completed", "Cancelled", "Disputed"],
  InProgress: ["Completed", "Disputed"],
  Completed: ["Disputed"],
  Disputed: [],
  Cancelled: [],
};
export async function action(name, id, input, ctx) {
  requireRole(ctx, "ADMIN");
  const r = getResource(name);
  validId(r, id);
  const body = actionInput.parse(input);
  if (!r.actions?.includes(body.action)) error("This action is not supported.");
  if (["vendors", "applications"].includes(name))
    error("Use the vendor review endpoint.");
  return repo.transaction(async (tx) => {
    const old = await repo.lockRecord(r, id, tx);
    const previous =
      name === "customers"
        ? old.IsBlocked
          ? "Blocked"
          : old.IsActive
            ? "Active"
            : "Inactive"
        : r.statusValues
          ? Object.keys(r.statusValues).find(
              (k) => r.statusValues[k] === Number(old[r.statusColumn]),
            )
          : old[r.statusColumn];
    if (previous !== body.expectedStatus)
      error("This record changed. Refresh before continuing.", 409);
    const values = {};
    if (name === "customers") {
      const [admin] = await repo.select(
        "SELECT COUNT(*) AS total FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=:id AND r.RoleCode='ADMIN'",
        { id },
        tx,
      );
      if (admin.total || id === ctx.auth.user.id)
        error("Admin accounts cannot be blocked here.");
      values.IsBlocked = body.action === "Block" ? 1 : 0;
      if (values.IsBlocked)
        await sequelize.query(
          "UPDATE dbo.AuthSessions SET revokedAt=SYSUTCDATETIME() WHERE userId=:id",
          { replacements: { id }, transaction: tx },
        );
    } else {
      if (name === "bookings") {
        if (!transitions[previous]?.includes(body.action))
          error("This booking status transition is not allowed.");
        if (
          body.action === "Confirmed" &&
          old.PaymentStatus !== "Paid" &&
          Number(old.PaidAmount) < Number(old.AdvanceAmount)
        )
          error("Required advance payment has not been received.");
        await sequelize.query(
          "INSERT INTO dbo.BookingStatusHistory(BookingId,OldStatus,NewStatus,ChangedBy,Remarks) VALUES(:id,:old,:next,:admin,:note)",
          {
            replacements: {
              id,
              old: previous,
              next: body.action,
              admin: ctx.auth.user.id,
              note: body.note.slice(0, 1000),
            },
            transaction: tx,
          },
        );
      }
      values[r.statusColumn] = r.statusValues
        ? r.statusValues[body.action]
        : body.action;
      if (name === "documents")
        Object.assign(values, {
          VerifiedBy: ctx.auth.user.id,
          VerifiedAt: new Date(),
          RejectionReason: body.action === "Rejected" ? body.note : null,
        });
    }
    if (!["coupons", "offers"].includes(name)) values.UpdatedAt = new Date();
    await repo.update(r, id, values, tx);
    await repo.auditAdmin(
      ctx,
      "ADMIN_STATUS_CHANGED",
      r.table,
      id,
      { status: previous },
      { status: body.action, note: body.note },
      tx,
    );
    return { message: "Changes saved." };
  });
}
export async function save(name, id, input, ctx) {
  requireRole(ctx, "ADMIN");
  const r = getResource(name);
  if (!r.editable) error("Editing is not available for this resource.");
  if (id) validId(r, id);
  const body = recordInput.parse(input);
  if (["categories", "sub-categories"].includes(name) && !body.code)
    error("A category code is required.");
  if (name === "sub-categories" && !body.categoryId)
    error("Select a parent category.");
  if (
    ["offers", "coupons"].includes(name) &&
    (!body.startDate ||
      !body.endDate ||
      !body.discountType ||
      body.discountValue === undefined)
  )
    error("Complete the discount and validity dates.");
  return repo.transaction(async (tx) => {
    const old = id ? await repo.lockRecord(r, id, tx) : null;
    if (
      old?.UpdatedAt &&
      (!body.expectedUpdatedAt ||
        new Date(old.UpdatedAt).getTime() !==
          new Date(body.expectedUpdatedAt).getTime())
    )
      error("This record changed. Refresh before editing.", 409);
    const values = Object.fromEntries(
      Object.entries(r.editable)
        .filter(([key]) => body[key] !== undefined)
        .map(([key, column]) => [column, body[key]]),
    );
    if (old) {
      if (old.UpdatedAt) values.UpdatedAt = new Date();
      await repo.update(r, id, values, tx);
    } else {
      const [created] = await repo.insert(r, values, tx);
      id = created.id;
    }
    await repo.auditAdmin(
      ctx,
      old ? "ADMIN_RECORD_UPDATED" : "ADMIN_RECORD_CREATED",
      r.table,
      id,
      null,
      body,
      tx,
    );
    return { id, message: "Changes saved." };
  });
}
export async function settings() {
  const rows = await repo.select(
    "SELECT SettingKey AS [key],SettingValue AS value FROM dbo.PlatformSettings",
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
export async function saveSettings(input, ctx) {
  requireRole(ctx, "ADMIN");
  const body = z
    .object({
      platformName: z.string().trim().min(2).max(100),
      supportEmail: z.email().max(320),
      timezone: z.literal("Asia/Kolkata"),
      currency: z.literal("INR"),
    })
    .strict()
    .parse(input);
  await repo.transaction(async (tx) => {
    for (const [key, value] of Object.entries(body))
      await sequelize.query(
        "UPDATE dbo.PlatformSettings WITH(UPDLOCK,SERIALIZABLE) SET SettingValue=:value,UpdatedAt=SYSUTCDATETIME() WHERE SettingKey=:key; IF @@ROWCOUNT=0 INSERT INTO dbo.PlatformSettings(SettingKey,SettingValue) VALUES(:key,:value)",
        { replacements: { key, value }, transaction: tx },
      );
    await repo.auditAdmin(
      ctx,
      "ADMIN_SETTINGS_UPDATED",
      "PlatformSettings",
      "platform",
      null,
      body,
      tx,
    );
  });
  return { message: "Settings saved." };
}
