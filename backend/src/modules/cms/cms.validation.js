import { z } from "zod";
export const pageKeys = ["about-us", "contact", "terms", "privacy"];
export const text = (n) =>
  z
    .string()
    .trim()
    .max(n)
    .refine(
      (v) => !/[<>\u0000-\u0008\u000b\u000c]/.test(v),
      "Use plain text without HTML.",
    );
const section = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,100}$/),
    title: text(200).min(1),
    body: text(10000),
  })
  .strict();
const route = z
  .string()
  .max(300)
  .refine(
    (s) =>
      /^\/(services|vendors|packages|contact|about|auth\/signup|privacy-policy|terms-and-conditions)(?:\?|\/|$)/.test(
        s,
      ) && !/[\\\r\n]/.test(s),
    "Choose a marketplace link.",
  );
const https = z
  .string()
  .max(1000)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use a valid HTTPS URL.");
export const contentInput = z
  .object({
    title: text(200).min(2),
    introduction: text(2000),
    metaTitle: text(200).min(2),
    metaDescription: text(320),
    heroMediaId: z.guid().nullable(),
    imageAlt: text(300),
    sections: z.array(section).max(60),
    benefits: z.array(section).max(20),
    steps: z.array(text(300)).max(12),
    customerBenefits: z.array(text(500)).max(20),
    vendorBenefits: z.array(text(500)).max(20),
    ctas: z
      .array(z.object({ label: text(100).min(1), href: route }).strict())
      .max(5),
    categoryOverrides: z
      .array(
        z
          .object({
            categoryId: z.number().int().positive(),
            description: text(1000),
            mediaId: z.guid().nullable(),
          })
          .strict(),
      )
      .max(100),
    faqs: z.array(section).max(30),
    contact: z
      .object({
        companyName: text(200).min(2),
        supportEmail: z.union([z.literal(""), z.email().max(320)]),
        phone: z.string().regex(/^$|^\+?[1-9]\d{7,14}$/),
        address: text(1000),
        workingHours: text(500),
        socialLinks: z
          .array(
            z
              .object({
                label: text(100).min(1),
                url: https.refine((v) => !!v, "Supply a social link URL."),
              })
              .strict(),
          )
          .max(10),
        addressVerified: z.boolean(),
        mapUrl: https,
        formEnabled: z.boolean(),
        phoneRequired: z.boolean(),
        acknowledgementEnabled: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .refine(
    (b) => new Set(b.sections.map((s) => s.id)).size === b.sections.length,
    "Section IDs must be unique.",
  )
  .refine(
    (b) =>
      !b.contact.mapUrl ||
      (b.contact.addressVerified && b.contact.address.length > 5),
    "A verified business address is required for a map link.",
  );
export const saveInput = z
  .object({
    expectedRevision: z.number().int().positive(),
    content: contentInput,
    requiresAcceptance: z.boolean().default(false),
    effectiveDate: z.iso.date().nullable().default(null),
  })
  .strict();
export const publishInput = z
  .object({
    expectedRevision: z.number().int().positive(),
    legalReviewed: z.boolean().default(false),
  })
  .strict();
export const pageInput = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    q: text(200).default(""),
    status: text(30).default(""),
    category: text(30).default(""),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine(
    (b) => !b.from || !b.to || b.from <= b.to,
    "End date must follow start date.",
  );
