import { z } from "zod";
export const listQuery = z
  .object({
    q: z.string().trim().max(200).default(""),
    status: z.string().max(40).default(""),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().max(40).default("createdAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "Start date must precede end date.",
  });
export const reviewInput = z
  .object({
    status: z.enum(["Approved", "Rejected", "Suspended"]),
    reason: z.string().trim().max(1000).default(""),
    note: z.string().trim().max(2000).default(""),
    expectedStatus: z.string().max(30),
  })
  .refine((v) => v.status !== "Rejected" || v.reason.length > 0, {
    message: "A rejection reason is required.",
  });
export const actionInput = z.object({
  action: z.string().max(30),
  expectedStatus: z.string().max(40),
  note: z.string().trim().min(3).max(2000),
});
export const recordInput = z
  .object({
    name: z.string().trim().min(2).max(150),
    code: z.string().trim().min(2).max(50).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    description: z.string().trim().max(500).default(""),
    discountType: z.enum(["Percentage", "Fixed"]).optional(),
    discountValue: z.coerce.number().nonnegative().max(10000000).optional(),
    usageLimit: z.coerce.number().int().positive().nullable().optional(),
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    expectedUpdatedAt: z.string().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.discountType === "Percentage" && v.discountValue > 100)
      ctx.addIssue({
        code: "custom",
        message: "Percentage cannot exceed 100.",
      });
    if (v.startDate && v.endDate && v.endDate <= v.startDate)
      ctx.addIssue({
        code: "custom",
        message: "End date must follow start date.",
      });
  });
export function dateBounds(from, to) {
  return {
    from: from ? new Date(`${from}T00:00:00+05:30`) : null,
    to: to
      ? new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86400000)
      : null,
  };
}
