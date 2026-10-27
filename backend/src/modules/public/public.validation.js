import { z } from "zod";
export const contactCategories = [
  "GENERAL",
  "BOOKING",
  "VENDOR",
  "PAYMENT",
  "CANCELLATION",
  "TECHNICAL",
  "PARTNERSHIP",
  "OTHER",
];
export const contactInput = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(100),
  lastName: z.string().trim().min(1, "Enter your last name.").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(320),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(
      /^$|^\+?[1-9]\d{7,14}$/,
      "Use 8–15 digits, with an optional + country code.",
    )
    .optional()
    .default(""),
  subject: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters for the subject.")
    .max(200),
  category: z.enum(contactCategories),
  message: z
    .string()
    .trim()
    .min(20, "Write at least 20 characters.")
    .max(5000, "Keep your message within 5,000 characters."),
  consent: z.literal(true, {
    error: "Please consent to processing this inquiry.",
  }),
});
export const listingInput = z.object({
  category: z.string().trim().max(150).nullish(),
  city: z.string().trim().max(100).nullish(),
  q: z.string().trim().max(200).nullish(),
  id: z.string().uuid().nullish(),
  limit: z.number().int().min(1).max(24).nullish(),
});
