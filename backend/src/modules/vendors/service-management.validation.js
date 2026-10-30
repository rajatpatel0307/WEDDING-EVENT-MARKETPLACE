import { z } from "zod";
import { amount } from "./workspace.validation.js";
const text = (max = 2000) => z.string().trim().max(max).default("");
const number = z.number().finite().nonnegative().max(1000000);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const pricingUnits = [
  "Per Event",
  "Per Day",
  "Per Hour",
  "Per Plate",
  "Per Person",
  "Per KM",
  "Per Vehicle",
  "Per Item",
  "Custom",
];
export const pricingSchema = z
  .object({
    type: z
      .enum([
        "Fixed",
        "PerPerson",
        "PerHour",
        "PerDay",
        "PerItem",
        "CustomQuote",
      ])
      .nullable()
      .default(null),
    basePrice: amount.default(0),
    unitPrice: amount.default(0),
    minimumPrice: amount.nullable().default(null),
    maximumPrice: amount.nullable().default(null),
    customQuote: z.boolean().default(false),
    minimumQuantity: number.default(1),
    maximumQuantity: number.default(1),
    unit: z.enum(pricingUnits).default("Per Event"),
    discount: amount.max(100).default(0),
    specialPrice: amount.nullable().default(null),
    weekendPrice: amount.nullable().default(null),
    seasonalPrice: amount.nullable().default(null),
    seasonalFrom: z.iso.date().nullable().default(null),
    seasonalTo: z.iso.date().nullable().default(null),
    additionalCharges: amount.default(0),
    taxRate: amount.max(100).default(0),
  })
  .strict()
  .refine(
    (v) =>
      v.minimumPrice === null ||
      v.maximumPrice === null ||
      v.maximumPrice >= v.minimumPrice,
    {
      message: "Maximum price must be at least minimum price.",
    },
  )
  .refine((v) => v.maximumQuantity >= v.minimumQuantity, {
    message: "Maximum quantity must be at least minimum quantity.",
  })
  .refine(
    (v) =>
      (!v.seasonalFrom && !v.seasonalTo && v.seasonalPrice === null) ||
      (v.seasonalFrom &&
        v.seasonalTo &&
        v.seasonalTo >= v.seasonalFrom &&
        v.seasonalPrice !== null),
    { message: "Complete the seasonal date range and price." },
  );
export function pricingTypeFor(pricing) {
  return (
    pricing.type ||
    {
      "Per Hour": "PerHour",
      "Per Day": "PerDay",
      "Per Item": "PerItem",
      "Per Person": "PerPerson",
      "Per Plate": "PerPerson",
      Custom: "CustomQuote",
    }[pricing.unit] ||
    "Fixed"
  );
}
export const itemSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: text(500),
    quantity: number.default(1),
    unit: text(50),
    price: amount.default(0),
    included: z.boolean().default(true),
  })
  .strict();
export const locationSchema = z
  .object({
    address: text(300),
    city: text(100),
    state: text(100),
    country: text(100).default("India"),
    zip: text(20),
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),
    mode: z
      .enum(["Vendor location", "Customer location", "Both"])
      .default("Both"),
  })
  .strict();
export const availabilitySchema = z
  .object({
    days: z
      .array(z.number().int().min(0).max(6))
      .max(7)
      .default([1, 2, 3, 4, 5]),
    start: time.default("09:00"),
    end: time.default("20:00"),
    advanceDays: number.int().max(730).default(180),
    noticeHours: number.int().max(8760).default(24),
  })
  .strict()
  .refine((v) => v.end > v.start, {
    message: "Working hours must end after they start.",
  });
export const policiesSchema = z
  .object({
    bookingRefundPolicy: z
      .object({
        refundPercent: amount.max(100),
        cancellationFeePercent: amount.max(100),
        minimumNoticeHours: z.number().int().min(0).max(8760),
      })
      .strict()
      .nullable()
      .optional(),
    cancellation: text(),
    refund: text(),
    advanceRequired: z.boolean().default(false),
    advancePercentage: amount.max(100).default(0),
    rescheduling: text(),
    travelCharges: amount.default(0),
    additionalCharges: text(),
    setupTime: number.int().default(0),
    duration: number.int().default(0),
    terms: text(10000),
  })
  .strict();
export const serviceSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    categoryId: z.number().int().positive(),
    subcategoryId: z.number().int().positive().nullable().default(null),
    shortDescription: text(500),
    description: text(10000),
    serviceType: z
      .enum(["On site", "Rental", "Sale", "Digital", "Hybrid"])
      .default("On site"),
    attributes: z.record(z.string(), z.unknown()).default({}),
    pricing: pricingSchema,
    location: locationSchema,
    availability: availabilitySchema,
    policies: policiesSchema,
    items: z.array(itemSchema).max(100).default([]),
    seo: z
      .object({
        title: text(200),
        description: text(500),
        keywords: text(500),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(200)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      })
      .strict(),
    expectedUpdatedAt: z.iso.datetime().optional(),
  })
  .strict();
export function validateServiceSubmission(document, imageCount) {
  if (
    document.description.length < 20 ||
    !document.location.city ||
    !document.shortDescription ||
    !document.policies.cancellation
  )
    throw Object.assign(
      new Error(
        "Complete the description, short description, city and cancellation policy before submitting.",
      ),
      { status: 400 },
    );
  if (imageCount < 1)
    throw Object.assign(
      new Error("Add at least one service image before submitting."),
      { status: 400 },
    );
}
export const listSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(12),
    q: text(200),
    category: z.coerce.number().int().nonnegative().default(0),
    subcategory: z.coerce.number().int().nonnegative().default(0),
    approval: z
      .enum([
        "",
        "Draft",
        "Pending",
        "UnderReview",
        "Approved",
        "Rejected",
        "Suspended",
      ])
      .default(""),
    active: z.enum(["", "true", "false"]).default(""),
    minPrice: z.coerce.number().nonnegative().default(0),
    maxPrice: z.coerce.number().nonnegative().max(100000000).default(100000000),
    location: text(100),
    rating: z.coerce.number().min(0).max(5).default(0),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    sort: z
      .enum([
        "newest",
        "oldest",
        "priceAsc",
        "priceDesc",
        "bookings",
        "rating",
        "updated",
      ])
      .default("updated"),
  })
  .strict()
  .refine(
    (v) => v.maxPrice >= v.minPrice && (!v.from || !v.to || v.to >= v.from),
    { message: "Choose a valid filter range." },
  );
// Integer paise arithmetic is authoritative; clients cannot submit a computed total.
export function calculatePrice(
  input,
  quantity = input.minimumQuantity,
  date = null,
) {
  return calculatePriceBreakdown(input, quantity, date).total;
}
export function calculatePriceBreakdown(
  input,
  quantity = input.minimumQuantity,
  date = null,
) {
  const p = pricingSchema.parse(input);
  if (
    !Number.isFinite(quantity) ||
    quantity < p.minimumQuantity ||
    quantity > p.maximumQuantity
  )
    throw Object.assign(new Error("Quantity is outside the allowed range."), {
      status: 400,
    });
  let base = p.specialPrice ?? p.basePrice;
  if (date) {
    z.iso.date().parse(date);
    if (
      p.seasonalPrice !== null &&
      date >= p.seasonalFrom &&
      date <= p.seasonalTo
    )
      base = p.seasonalPrice;
    else if (
      [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay()) &&
      p.weekendPrice !== null
    )
      base = p.weekendPrice;
  }
  const subtotal =
    Math.round(base * 100) +
    Math.round(Math.round(p.unitPrice * 100) * quantity);
  const subtotalAfterDiscount =
    (subtotal -
      Math.round((subtotal * Math.round(p.discount * 100)) / 10000) +
      Math.round(p.additionalCharges * 100)) /
    100;
  const tax =
    Math.round(
      (Math.round(subtotalAfterDiscount * 100) * Math.round(p.taxRate * 100)) /
        10000,
    ) / 100;
  const finalPrice = Math.round((subtotalAfterDiscount + tax) * 100) / 100;
  if (finalPrice > 100000000)
    throw Object.assign(
      new Error("Calculated price exceeds the maximum supported amount."),
      { status: 400 },
    );
  return {
    subtotal: subtotal / 100,
    discount:
      Math.round((subtotal * Math.round(p.discount * 100)) / 10000) / 100,
    charges: p.additionalCharges,
    tax,
    total: finalPrice,
  };
}
export function actionsFor(row, approvedVendor = true) {
  const status = row.ApprovalStatus ?? row.status;
  return {
    edit: ["Draft", "Rejected", "Approved"].includes(status),
    submit: approvedVendor && ["Draft", "Rejected"].includes(status),
    activate: approvedVendor && status === "Approved",
    delete:
      ["Draft", "Rejected"].includes(status) &&
      !(row.bookings > 0) &&
      !row.hasHistory,
  };
}
