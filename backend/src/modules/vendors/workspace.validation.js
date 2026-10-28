import { z } from "zod";
import { serviceTemplates } from "./service-templates.js";
export const amount = z
  .number()
  .finite()
  .nonnegative()
  .max(100000000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001, {
    message: "Use at most two decimal places for amounts.",
  });
const optionalNumber = z
  .number()
  .finite()
  .nonnegative()
  .max(1000000)
  .nullable()
  .optional();
const optionalInteger = z
  .number()
  .int()
  .nonnegative()
  .max(1000000)
  .nullable()
  .optional();
const version = z.iso.datetime().optional();
export const serviceInput = z
  .object({
    name: z.string().trim().min(2).max(200),
    categoryId: z.number().int().positive(),
    description: z.string().trim().min(10).max(10000),
    price: amount.nullable(),
    pricingType: z.enum([
      "Fixed",
      "PerPerson",
      "PerHour",
      "PerDay",
      "PerItem",
      "CustomQuote",
    ]),
    minimumPrice: amount.nullable().optional(),
    maximumPrice: amount.nullable().optional(),
    minimumGuests: optionalInteger,
    maximumGuests: optionalInteger,
    duration: optionalInteger,
    attributes: z.record(z.string(), z.unknown()),
    imageToken: z.string().max(4000).optional(),
    expectedUpdatedAt: version,
  })
  .strict()
  .refine((v) => v.pricingType === "CustomQuote" || v.price !== null, {
    message: "Provide a base price or choose custom quotation pricing.",
  })
  .refine(
    (v) =>
      v.minimumPrice == null ||
      v.maximumPrice == null ||
      v.minimumPrice <= v.maximumPrice,
    { message: "Minimum price must not exceed maximum price." },
  )
  .refine(
    (v) =>
      v.minimumGuests == null ||
      v.maximumGuests == null ||
      v.minimumGuests <= v.maximumGuests,
    { message: "Minimum guests must not exceed maximum guests." },
  );
export function validateAttributes(category, input) {
  const template = Object.hasOwn(serviceTemplates, category)
    ? serviceTemplates[category]
    : null;
  if (!template)
    throw Object.assign(
      new Error("Choose one of the 17 supported service categories."),
      { status: 400 },
    );
  const shape = Object.fromEntries(
    template.map((f) => [
      f.key,
      (f.type === "number"
        ? z.number().finite().nonnegative().max(1000000)
        : f.type === "boolean"
          ? z.boolean()
          : f.type === "select"
            ? z.enum(f.options)
            : z
                .string()
                .trim()
                .max(f.type === "textarea" ? 3000 : 300)
      ).optional(),
    ]),
  );
  const data = z.object(shape).strict().parse(input);
  if (
    data.minimumGuests != null &&
    data.maximumGuests != null &&
    data.minimumGuests > data.maximumGuests
  )
    throw Object.assign(
      new Error("Minimum guests must not exceed maximum guests."),
      { status: 400 },
    );
  return data;
}
export const itemInput = z
  .object({
    serviceId: z.guid(),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).default(""),
    quantity: optionalNumber,
    unit: z.string().trim().max(50).default(""),
    price: amount.nullable().optional(),
    included: z.boolean().default(true),
  })
  .strict();
const packageItem = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).default(""),
    quantity: optionalNumber,
    unit: z.string().trim().max(50).default(""),
  })
  .strict();
export const packageInput = z
  .object({
    serviceId: z.guid(),
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().max(5000).default(""),
    price: amount,
    discount: amount.refine((v) => v <= 100, {
      message: "Discount cannot exceed 100 percent.",
    }),
    minimumGuests: optionalInteger,
    maximumGuests: optionalInteger,
    duration: optionalInteger,
    featured: z.boolean(),
    active: z.boolean(),
    items: z.array(packageItem).max(100),
    expectedUpdatedAt: version,
  })
  .strict()
  .refine(
    (v) =>
      v.minimumGuests == null ||
      v.maximumGuests == null ||
      v.minimumGuests <= v.maximumGuests,
    { message: "Minimum guests must not exceed maximum guests." },
  );
export const locationInput = z
  .object({
    address: z.string().trim().min(2).max(300),
    line2: z.string().trim().max(300).default(""),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    country: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().max(20).default(""),
    primary: z.boolean(),
    active: z.boolean(),
    expectedUpdatedAt: version,
  })
  .strict();
export const promotionInput = z
  .object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().max(500).default(""),
    serviceId: z.guid().nullable().optional(),
    discountType: z.enum(["Percentage", "Fixed"]),
    discountValue: amount,
    minimumAmount: amount.nullable().optional(),
    maximumDiscount: amount.nullable().optional(),
    usageLimit: z.number().int().positive().max(1000000).nullable().optional(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    active: z.boolean(),
  })
  .strict()
  .refine((v) => v.endDate > v.startDate, {
    message: "End date must be after start date.",
  })
  .refine((v) => v.discountType !== "Percentage" || v.discountValue <= 100, {
    message: "Percentage discount cannot exceed 100.",
  });
export const availabilityInput = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    serviceId: z.guid().nullable(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    status: z.enum(["Available", "Blocked"]),
    notes: z.string().trim().max(500).default(""),
  })
  .strict()
  .refine(
    (v) => v.to >= v.from && new Date(v.to) - new Date(v.from) <= 90 * 86400000,
    { message: "Choose a range of up to 91 days." },
  )
  .refine(
    (v) =>
      (!v.startTime && !v.endTime) ||
      (v.startTime && v.endTime && v.endTime > v.startTime),
    { message: "Set both times, with the end after the start." },
  );
export const quoteInput = z
  .object({
    eventId: z.guid(),
    validUntil: z.iso.date(),
    message: z.string().trim().max(5000).default(""),
    status: z.enum(["Draft", "Sent"]),
    items: z
      .array(
        z
          .object({
            serviceId: z.guid(),
            packageId: z.guid().nullable().optional(),
            name: z.string().trim().min(1).max(200),
            quantity: z
              .number()
              .finite()
              .min(0.001)
              .max(100000)
              .refine(
                (v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 0.00001,
                { message: "Use at most three decimal places for quantities." },
              ),
            price: amount,
            discount: amount,
            tax: amount,
          })
          .strict()
          .refine((v) => v.discount <= v.quantity * v.price, {
            message: "Line discount cannot exceed the line amount.",
          }),
      )
      .min(1)
      .max(100),
    expectedUpdatedAt: version,
  })
  .strict();
