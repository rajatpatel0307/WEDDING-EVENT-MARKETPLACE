import { z } from "zod";
import { statuses, reasons } from "./reviews.policy.js";
const text = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/[<>\u0000-\u0008]/.test(v),
      "Use plain text without HTML.",
    );
const rating = z.coerce.number().int().min(1).max(5);
export const imageInput = z
  .object({
    name: text(200).regex(/\.(png|jpe?g|webp)$/i),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    base64: z.string().max(3 * 1024 * 1024),
  })
  .strict();
export const contentInput = z
  .object({
    rating,
    title: text(200).default(""),
    text: text(5000).min(5),
    serviceQualityRating: rating.nullable().optional(),
    communicationRating: rating.nullable().optional(),
    valueForMoneyRating: rating.nullable().optional(),
    professionalismRating: rating.nullable().optional(),
    images: z.array(imageInput).max(5).default([]),
    keepImageIds: z.array(z.guid()).max(5).default([]),
  })
  .strict();
export const createInput = contentInput.extend({
  bookingId: z.guid(),
  bookingItemId: z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .nullable()
    .optional(),
});
export const listInput = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: text(200).default(""),
  rating: z.coerce.number().int().min(0).max(5).default(0),
  status: z.enum(statuses).optional(),
  vendorId: z.guid().optional(),
  serviceId: z.guid().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  reported: z.enum(["true", "false"]).optional(),
});
export const responseInput = z.object({ text: text(3000).min(5) }).strict();
export const moderationInput = z
  .object({ reason: text(2000).default(""), notes: text(2000).default("") })
  .strict();
export const reportInput = z
  .object({
    reason: z.enum(reasons),
    description: text(2000).default(""),
    responseId: z.guid().optional(),
  })
  .strict();
