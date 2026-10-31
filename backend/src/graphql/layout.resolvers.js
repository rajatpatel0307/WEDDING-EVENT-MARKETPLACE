import { z } from "zod";
import { sequelize } from "../config/database.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { limit } from "../modules/auth/security.service.js";
import { communicationCounts } from "../modules/notifications/communications.service.js";

// A single, request-scoped query supplies all three counters. IDs come from the session.
export async function navbarCounts(user, ctx) {
  const authenticated = requireAuth(ctx);
  if (String(authenticated.id) !== String(user.id))
    throw new Error("Access denied.");
  return communicationCounts(ctx);
}
export const layoutUserResolvers = Object.fromEntries(
  ["wishlistCount", "unreadNotificationCount", "unreadMessageCount"].map(
    (field) => [
      field,
      async (user, _, ctx) => (await navbarCounts(user, ctx))[field],
    ],
  ),
);
export async function subscribeNewsletter(_, { email }, ctx) {
  const normalized = z
    .string()
    .trim()
    .max(320)
    .email()
    .parse(email)
    .toLowerCase();
  await limit(`newsletter:${ctx.req.ip}`, 10, 3600);
  await sequelize.query(
    `MERGE dbo.NewsletterSubscriptions WITH (HOLDLOCK) AS target
    USING (SELECT :email AS Email) AS source ON target.Email = source.Email
    WHEN NOT MATCHED THEN INSERT (Email) VALUES (source.Email);`,
    { replacements: { email: normalized } },
  );
  return { success: true, message: "Subscribed successfully" };
}
