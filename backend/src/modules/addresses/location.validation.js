import { z } from "zod";
const text = (max) => z.string().trim().max(max).default("");
export const coordinate = (limit) =>
  z
    .preprocess(
      (v) => (v === "" || v == null ? null : v),
      z.coerce.number().finite().min(-limit).max(limit).nullable(),
    )
    .default(null);
export const locationFields = {
  line1: z.string().trim().min(3).max(300),
  line2: text(300),
  landmark: text(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  district: text(100),
  country: z.string().trim().min(2).max(100).default("India"),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{1,18}[A-Za-z0-9]$/),
  latitude: coordinate(90),
  longitude: coordinate(180),
};
export const validLocation = (b) =>
  (b.latitude == null) === (b.longitude == null) &&
  (b.country.toLowerCase() !== "india" || /^[1-9]\d{5}$/.test(b.postalCode));
export const eventLocationInput = z
  .object({
    ...locationFields,
    name: text(200),
    venue: text(200),
    type: z
      .enum([
        "Home",
        "Marriage Hall",
        "Banquet Hall",
        "Hotel",
        "Farmhouse",
        "Outdoor Location",
        "Temple",
        "Resort",
        "Convention Center",
        "Other",
      ])
      .default("Other"),
    contactName: text(200),
    contactPhone: z
      .string()
      .trim()
      .regex(/^(?:[+\d][\d ()-]{6,24})?$/)
      .default(""),
    instructions: text(2000),
  })
  .strict()
  .refine(validLocation, {
    message:
      "Enter a valid postal code and both coordinates, or leave both coordinates blank.",
  });
