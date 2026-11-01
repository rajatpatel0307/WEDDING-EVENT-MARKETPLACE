import { z } from "zod";
import { text, pageInput } from "./cms.validation.js";
export const inquiryTypes = [
  "GENERAL",
  "CUSTOMER",
  "VENDOR",
  "BOOKING",
  "QUOTATION",
  "PAYMENT",
  "TECHNICAL",
  "PARTNERSHIP",
  "CANCELLATION",
  "OTHER",
];
export const statuses = [
  "New",
  "InProgress",
  "WaitingForCustomer",
  "Resolved",
  "Closed",
  "Spam",
];
export const privacyTypes = [
  "Access",
  "Correction",
  "AccountDeletion",
  "DataDeletion",
  "WithdrawConsent",
  "Question",
];
export const inquiryInput = z
  .object({
    fullName: text(200).min(2),
    email: z.email().trim().toLowerCase().max(320),
    phone: z
      .string()
      .regex(/^$|^\+?[1-9]\d{7,14}$/)
      .default(""),
    subject: text(200).min(3),
    category: z.enum(inquiryTypes),
    message: text(5000).min(20),
    consent: z.literal(true),
    requestKey: z.guid(),
    website: z.string().max(200).default(""),
  })
  .strict();
export const statusInput = z
  .object({ status: z.enum(statuses), reason: text(2000).default("") })
  .strict();
export const replyInput = z
  .object({ body: text(10000).min(5), requestKey: z.guid() })
  .strict();
export const privacyInput = z
  .object({
    requestType: z.enum(privacyTypes),
    description: text(5000).min(20),
    requestKey: z.guid(),
    explicit: z.literal(true),
  })
  .strict();
export const listInput = pageInput;
