import { z } from "zod";
const money = z.coerce
  .number()
  .finite()
  .nonnegative()
  .max(1e8)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001, {
    message: "Use at most two decimal places for money.",
  });
export const lineInput = z
  .object({
    serviceId: z.guid(),
    packageId: z.guid().nullable().optional(),
    serviceItemId: z.coerce.number().int().positive().nullable().optional(),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).default(""),
    unit: z.string().trim().max(50).default(""),
    kind: z
      .enum([
        "Service",
        "Package",
        "ServiceItem",
        "Custom",
        "Travel",
        "Setup",
        "Delivery",
        "Other",
      ])
      .default("Service"),
    quantity: z.coerce
      .number()
      .min(0.001)
      .max(100000)
      .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 0.00001, {
        message: "Use at most three decimal places for quantity.",
      }),
    price: money,
    discount: money.default(0),
    discountType: z.enum(["Fixed", "Percentage"]).default("Fixed"),
    discountValue: money.optional(),
    tax: money.default(0),
    taxRate: money.max(100).optional(),
  })
  .strict();
export const quoteInput = z
  .object({
    eventId: z.guid(),
    idempotencyKey: z.guid().optional(),
    requestId: z.guid().optional(),
    previousQuotationId: z.guid().optional(),
    reason: z.string().trim().max(1000).default(""),
    title: z.string().trim().max(200).default(""),
    validUntil: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
    message: z.string().trim().max(5000).default(""),
    terms: z.string().trim().max(10000).default(""),
    cancellation: z.string().trim().max(2000).default(""),
    advancePercent: money.max(100).default(0),
    status: z.enum(["Draft", "Sent"]),
    items: z.array(lineInput).min(1).max(100),
    expectedUpdatedAt: z.iso.datetime().optional(),
  })
  .strict();
export const decisionInput = z
  .object({
    action: z.enum(["Accept", "Reject", "Modify"]),
    message: z.string().trim().max(2000).default(""),
    convert: z.boolean().default(true),
  })
  .strict();
export const requestInput = z
  .object({
    eventId: z.guid(),
    serviceId: z.guid(),
    packageId: z.guid().optional(),
    message: z.string().trim().min(5).max(2000),
    services: z
      .array(
        z
          .object({ serviceId: z.guid(), packageId: z.guid().optional() })
          .strict(),
      )
      .max(20)
      .default([]),
    items: z
      .array(
        z
          .object({
            serviceId: z.guid(),
            id: z.coerce.number().int().positive(),
            quantity: z.coerce.number().int().min(1).max(100000),
          })
          .strict(),
      )
      .max(100)
      .default([]),
  })
  .strict();
export function calculateQuotation(items, advancePercent = 0) {
  const advanceRate = money.max(100).parse(advancePercent);
  const lines = items.map((raw) => {
    const i = lineInput.parse(raw),
      gross =
        BigInt(Math.round(i.quantity * 1000)) *
        BigInt(Math.round(i.price * 100));
    if (gross % 1000n)
      throw Object.assign(
        new Error(
          "Quantity and unit price produce fractions of a paise. Adjust the quantity or price.",
        ),
        { status: 400 },
      );
    const base = Number(gross / 1000n);
    if (base > 1e10)
      throw Object.assign(
        new Error("A quotation line exceeds the supported amount."),
        { status: 400 },
      );
    const value = i.discountValue ?? i.discount,
      discount =
        i.discountType === "Percentage"
          ? Math.round((base * Math.round(value * 100)) / 10000)
          : Math.round(value * 100);
    if ((i.discountType === "Percentage" && value > 100) || discount > base)
      throw Object.assign(new Error("Discount exceeds the line amount."), {
        status: 400,
      });
    const tax =
      i.taxRate === undefined
        ? Math.round(i.tax * 100)
        : Math.round(((base - discount) * Math.round(i.taxRate * 100)) / 10000);
    return {
      ...i,
      discount: discount / 100,
      tax: tax / 100,
      discountValue: value,
      subtotal: base / 100,
      total: (base - discount + tax) / 100,
    };
  });
  const sum = (key) =>
      lines.reduce((n, l) => n + Math.round(l[key] * 100), 0) / 100,
    subtotal = sum("subtotal"),
    discount = sum("discount"),
    tax = sum("tax"),
    total = Math.round((subtotal - discount + tax) * 100) / 100;
  if (
    !Number.isFinite(total) ||
    total <= 0 ||
    total > 1e8 ||
    subtotal > 1e8 ||
    tax > 1e8
  )
    throw Object.assign(
      new Error(
        "Quotation total must be positive and within the supported limit.",
      ),
      { status: 400 },
    );
  return {
    lines,
    subtotal,
    discount,
    tax,
    total,
    additionalCharges:
      lines
        .filter((l) =>
          ["Travel", "Setup", "Delivery", "Other"].includes(l.kind),
        )
        .reduce((n, l) => n + Math.round(l.total * 100), 0) / 100,
    advance:
      Math.round(
        (Math.round(total * 100) * Math.round(advanceRate * 100)) / 10000,
      ) / 100,
  };
}
