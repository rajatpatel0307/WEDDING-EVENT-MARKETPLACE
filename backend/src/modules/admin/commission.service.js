import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as repo from "./admin.repository.js";
export async function configuration(ctx) {
  requireRole(ctx, "ADMIN");
  const [row] = await repo.select(
    "SELECT SettingValue,UpdatedAt FROM dbo.PlatformSettings WHERE SettingKey='bookingCommissionPercent'",
  );
  const history = await repo.select(
    "SELECT TOP(50) ActionType AS action,CreatedAt AS createdAt,JSON_VALUE(NewValue,'$.rate') AS rate,JSON_VALUE(NewValue,'$.note') AS note FROM dbo.AuditLogs WHERE EntityType='PlatformSettings' AND EntityId='bookingCommissionPercent' ORDER BY CreatedAt DESC,AuditLogId DESC",
  );
  return {
    rate: row
      ? Number(row.SettingValue)
      : process.env.BOOKING_COMMISSION_PERCENT == null
        ? null
        : Number(process.env.BOOKING_COMMISSION_PERCENT),
    updatedAt: row?.UpdatedAt || null,
    history,
  };
}
export async function configure(input, ctx) {
  requireRole(ctx, "ADMIN");
  const b = z
    .object({
      rate: z.number().finite().min(0).max(100).multipleOf(0.0001),
      note: z.string().trim().min(3).max(2000),
      expectedUpdatedAt: z.iso.datetime().nullable(),
    })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const [old] = await repo.select(
      "SELECT SettingValue,UpdatedAt FROM dbo.PlatformSettings WITH(UPDLOCK,HOLDLOCK) WHERE SettingKey='bookingCommissionPercent'",
      {},
      tx,
    );
    if (
      (old?.UpdatedAt ? new Date(old.UpdatedAt).toISOString() : null) !==
      b.expectedUpdatedAt
    )
      throw Object.assign(
        new Error("Commission configuration changed. Refresh before saving."),
        { status: 409 },
      );
    await repo.select(
      "UPDATE dbo.PlatformSettings SET SettingValue=:rate,UpdatedAt=SYSUTCDATETIME() WHERE SettingKey='bookingCommissionPercent'; IF @@ROWCOUNT=0 INSERT INTO dbo.PlatformSettings(SettingKey,SettingValue) VALUES('bookingCommissionPercent',:rate)",
      { rate: String(b.rate) },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "ADMIN_COMMISSION_CONFIGURED",
      "PlatformSettings",
      "bookingCommissionPercent",
      old ? { rate: Number(old.SettingValue) } : null,
      b,
      tx,
    );
    return {
      message:
        "Default commission updated for future booking snapshots. Historical transactions are unchanged.",
    };
  });
}
