import { eventLocationInput } from "../addresses/location.validation.js";
import { z } from "zod";
export const bookingInput = z
  .object({
    eventId: z.guid(),
    billingAddressId: z.guid().optional(),
    locationMode: z.enum(["Vendor location", "Customer location"]).optional(),
    vendorLocationId: z.guid().optional(),
    serviceId: z.guid(),
    packageId: z.guid().optional(),
    quantity: z.coerce.number().int().min(1).max(100000).default(1),
    requirements: z.string().trim().max(2000).default(""),
    coupon: z
      .string()
      .trim()
      .max(50)
      .regex(/^[A-Za-z0-9_-]*$/)
      .default(""),
    reviewToken: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    items: z
      .array(
        z
          .object({
            id: z.coerce.number().int().positive(),
            quantity: z.coerce.number().int().min(1).max(100000),
          })
          .strict(),
      )
      .max(30)
      .default([]),
  })
  .strict()
  .refine((b) => new Set(b.items.map((i) => i.id)).size === b.items.length, {
    message: "Select each optional item once.",
  });
const clock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .nullable()
  .default(null);
export const requestInput = z
  .object({
    kind: z.enum(["Cancellation", "Reschedule"]),
    location: eventLocationInput.optional(),
    reason: z.string().trim().min(3).max(1000),
    date: z.iso.date().optional(),
    start: clock,
    end: clock,
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.kind === "Reschedule" && !b.date)
      ctx.addIssue({ code: "custom", message: "Select the new event date." });
    if (
      (b.start && !b.end) ||
      (!b.start && b.end) ||
      (b.start && b.end <= b.start)
    )
      ctx.addIssue({
        code: "custom",
        message: "Provide a valid start and end time on the same day.",
      });
    if (b.kind === "Cancellation" && (b.date || b.start || b.end || b.location))
      ctx.addIssue({
        code: "custom",
        message: "Cancellation cannot change event dates.",
      });
  });
export const decisionInput = z
  .object({
    action: z.enum(["Approve", "Reject"]),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
