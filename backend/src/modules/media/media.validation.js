import { z } from "zod";
export const types = ["Vendor", "Service", "Package", "Review", "Admin"];
export const purposes = [
  "Logo",
  "Cover",
  "Gallery",
  "Portfolio",
  "Office",
  "Team",
  "Banner",
  "Category",
  "Promotion",
  "General",
];
const text = (n) =>
  z
    .string()
    .trim()
    .max(n)
    .refine((v) => !/[<>\u0000-\u001f]/.test(v), "Use plain text.");
export const targetInput = z.object({
  entityType: z.enum(types),
  entityId: z.guid(),
  purpose: z.enum(purposes).default("Gallery"),
});
export const uploadInput = targetInput
  .extend({
    requestKey: z.guid(),
    fileName: text(255).min(1),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    base64: z
      .string()
      .min(1)
      .max(15 * 1024 * 1024),
    replaceId: z.guid().optional(),
  })
  .strict();
export const pageInput = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
  q: text(200).default(""),
  category: z.enum(types).optional(),
  vendorId: z.guid().optional(),
  entityId: z.guid().optional(),
  status: z.enum(["Pending", "Approved", "Rejected", "Hidden"]).optional(),
  uploadStatus: z.enum(["Uploading", "Ready", "Failed"]).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  deleted: z.enum(["true", "false"]).default("false"),
  orphaned: z.enum(["true", "false"]).optional(),
});
export const noteInput = z.object({ reason: text(2000).default("") }).strict();
export const renameInput = z.object({ fileName: text(255).min(1) }).strict();
export const reorderInput = z
  .object({
    entityType: z.enum(types),
    entityId: z.guid(),
    ids: z.array(z.guid()).min(1).max(100),
  })
  .strict()
  .refine(
    (b) => new Set(b.ids.map((x) => x.toLowerCase())).size === b.ids.length,
    "Include each image exactly once.",
  );
