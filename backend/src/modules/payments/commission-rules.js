import { z } from "zod";
import * as repo from "../admin/admin.repository.js";
import { requireRole } from "../../middleware/auth.middleware.js";
import { minor, fail } from "../admin/booking-finance.js";
export const ruleInput = z
  .object({
    name: z.string().trim().min(3).max(150),
    vendorId: z.guid().nullable().default(null),
    categoryId: z.number().int().positive().nullable().default(null),
    type: z.enum(["Percentage", "Fixed", "Combined"]),
    rate: z.number().min(0).max(100).multipleOf(0.0001),
    fixedAmount: z.number().min(0).max(1e8).multipleOf(0.01),
    base: z.enum(["BookingTotal", "NetSubtotal"]),
    priority: z.number().int().min(0).max(1000).default(0),
    effectiveFrom: z.iso.datetime(),
    effectiveTo: z.iso.datetime().nullable().default(null),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict()
  .refine(
    (b) =>
      !b.effectiveTo || Date.parse(b.effectiveFrom) < Date.parse(b.effectiveTo),
    {
      message: "Effective end must follow start.",
    },
  )
  .refine((b) => b.type !== "Percentage" || b.fixedAmount === 0, {
    message: "Percentage rules cannot include a fixed charge.",
  })
  .refine((b) => b.type !== "Fixed" || b.rate === 0, {
    message: "Fixed rules cannot include a percentage.",
  });
export async function ruleForServices(ids, tx) {
  if (!ids.length) return null;
  const [row] = await repo.select(
    `SELECT TOP(1) r.* FROM dbo.CommissionRules r WHERE r.IsActive=1 AND r.EffectiveFrom<=SYSUTCDATETIME() AND (r.EffectiveTo IS NULL OR r.EffectiveTo>SYSUTCDATETIME())
    AND (r.VendorId IS NULL OR EXISTS(SELECT 1 FROM dbo.Services s JOIN OPENJSON(:services) j ON s.ServiceId=CONVERT(uniqueidentifier,j.value) WHERE s.VendorId=r.VendorId))
    AND (r.CategoryId IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.Services s JOIN OPENJSON(:services) j ON s.ServiceId=CONVERT(uniqueidentifier,j.value) WHERE s.CategoryId<>r.CategoryId))
    ORDER BY CASE WHEN r.VendorId IS NOT NULL THEN 2 WHEN r.CategoryId IS NOT NULL THEN 1 ELSE 0 END DESC,r.Priority DESC,r.EffectiveFrom DESC,r.RuleId`,
    { services: JSON.stringify(ids) },
    tx,
  );
  return row
    ? {
        id: row.RuleId,
        name: row.Name,
        type: row.Type,
        rate: Number(row.Rate),
        fixedAmount: Number(row.FixedAmount),
        base: row.Base,
      }
    : null;
}
export function calculateCommission(booking, rule, legacyRate) {
  const base =
    rule?.base === "NetSubtotal"
      ? Math.max(0, minor(booking.SubTotal) - minor(booking.DiscountAmount))
      : minor(booking.TotalAmount);
  const rate = rule?.rate ?? legacyRate;
  if (rate === null || rate === undefined) return null;
  if (!Number.isFinite(rate) || rate < 0 || rate > 100)
    fail("Invalid commission snapshot.", 503);
  const percent =
    rule?.type === "Fixed"
      ? 0
      : Number(
          (BigInt(base) * BigInt(Math.round(rate * 10000)) + 500000n) /
            1000000n,
        );
  const fixed =
    rule && rule.type !== "Percentage" ? minor(rule.fixedAmount) : 0;
  // A rule cannot create a negative vendor payable. Preserve the applied cap in the amount.
  return Math.min(base, percent + fixed) / 100;
}
export async function list(ctx) {
  requireRole(ctx, "ADMIN");
  return repo.select(
    "SELECT TOP(200) r.*,v.BusinessName,c.CategoryName FROM dbo.CommissionRules r LEFT JOIN dbo.Vendors v ON v.VendorId=r.VendorId LEFT JOIN dbo.Categories c ON c.CategoryId=r.CategoryId ORDER BY r.CreatedAt DESC,r.RuleId",
  );
}
export async function create(input, ctx) {
  const user = requireRole(ctx, "ADMIN"),
    b = ruleInput.parse(input);
  return repo.transaction(async (tx) => {
    const [row] = await repo.insert(
      { table: "CommissionRules", id: "RuleId" },
      {
        Name: b.name,
        VendorId: b.vendorId,
        CategoryId: b.categoryId,
        Type: b.type,
        Rate: b.rate,
        FixedAmount: b.fixedAmount,
        Base: b.base,
        Priority: b.priority,
        EffectiveFrom: new Date(b.effectiveFrom),
        EffectiveTo: b.effectiveTo ? new Date(b.effectiveTo) : null,
        CreatedBy: user.id,
      },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "ADMIN_COMMISSION_RULE_CREATED",
      "CommissionRules",
      row.id,
      null,
      b,
      tx,
    );
    return {
      message: "Commission rule created for future policy snapshots.",
      id: row.id,
    };
  });
}
export async function disable(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const b = z
    .object({ reason: z.string().trim().min(3).max(1000) })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await repo.lockRecord(
      { table: "CommissionRules", id: "RuleId" },
      id,
      tx,
    );
    if (row.IsActive) {
      await repo.update(
        { table: "CommissionRules", id: "RuleId" },
        id,
        { IsActive: false },
        tx,
      );
      await repo.auditAdmin(
        ctx,
        "ADMIN_COMMISSION_RULE_DISABLED",
        "CommissionRules",
        id,
        { active: true },
        { active: false, ...b },
        tx,
      );
    }
    return { message: "Rule disabled for future snapshots." };
  });
}
