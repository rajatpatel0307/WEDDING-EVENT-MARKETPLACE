import { z } from "zod";
export const categories = [
  "Venue & Location",
  "Catering & Food",
  "Tent & Infrastructure",
  "Decoration",
  "Lighting",
  "DJ & Entertainment",
  "Photography & Videography",
  "Makeup & Beauty",
  "Mehndi",
  "Wedding Clothing",
  "Jewellery & Accessories",
  "Transportation",
  "Religious & Ceremony Services",
  "Traditional Wedding Services",
  "Flowers & Florist",
  "Event Support",
  "Technology",
];
export const password = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/)
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password exceeds bcrypt byte limit",
  );
export const email = z.string().trim().toLowerCase().email().max(320);
export const phone = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Use country code and 8–15 digits");
export const account = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email,
    phone,
    password,
    confirmPassword: z.string(),
    terms: z.literal(true),
    privacy: z.literal(true),
  })
  .refine((v) => v.password === v.confirmPassword, "Passwords do not match");
export const location = z.object({
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});
export const business = z.object({
  businessName: z.string().trim().min(2).max(200),
  businessDescription: z.string().trim().min(10).max(5000),
  businessEmail: email,
  businessPhone: phone,
  categories: z.array(z.enum(categories)).min(1).max(17),
  location,
  documents: z
    .array(
      z.object({
        type: z.enum([
          "Business Registration",
          "GST",
          "PAN",
          "Identity Proof",
          "Address Proof",
          "Other Supporting Document",
        ]),
        uploadToken: z.string().max(2000),
      }),
    )
    .min(1)
    .max(6),
});
