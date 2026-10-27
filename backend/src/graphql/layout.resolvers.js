import { QueryTypes } from "sequelize";
import { z } from "zod";
import { sequelize } from "../config/database.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { limit } from "../modules/auth/security.service.js";

// A single, request-scoped query supplies all three counters. IDs come from the session.
export async function navbarCounts(user, ctx) {
  const authenticated = requireAuth(ctx);
  if (String(authenticated.id) !== String(user.id))
    throw new Error("Access denied.");
  if (!ctx.navbarCounts)
    ctx.navbarCounts = sequelize
      .query(
        `
    SELECT
      (SELECT COUNT(*) FROM dbo.Wishlists WHERE CustomerId = :userId) AS wishlistCount,
      (SELECT COUNT(*) FROM dbo.Notifications WHERE UserId = :userId AND IsRead = 0) AS unreadNotificationCount,
      (SELECT COUNT(*) FROM dbo.Messages m
        JOIN dbo.Conversations c ON c.ConversationId = m.ConversationId
        JOIN dbo.Vendors v ON v.VendorId = c.VendorId
        WHERE m.IsRead = 0 AND m.SenderUserId <> :userId
          AND (c.CustomerId = :userId OR v.UserId = :userId)) AS unreadMessageCount`,
        { replacements: { userId: authenticated.id }, type: QueryTypes.SELECT },
      )
      .then((rows) => rows[0]);
  return ctx.navbarCounts;
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
