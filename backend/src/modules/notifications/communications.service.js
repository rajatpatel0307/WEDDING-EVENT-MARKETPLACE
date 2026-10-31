import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

// Count unread people, not messages or threads. A person can have several
// conversations for different events and still contributes just one badge.
export async function communicationCounts(ctx) {
  const user = requireAuth(ctx);
  if (!ctx.navbarCounts)
    ctx.navbarCounts = sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.Wishlists WHERE CustomerId=:userId) AS wishlistCount,
        (SELECT COUNT(*) FROM dbo.Notifications
          WHERE UserId=:userId AND IsRead=0
            AND (ReferenceType IS NULL OR ReferenceType<>'Conversation')) AS unreadNotificationCount,
        (SELECT COUNT(DISTINCT m.SenderUserId) FROM dbo.Messages m
          JOIN dbo.Conversations c ON c.ConversationId=m.ConversationId
          JOIN dbo.Vendors v ON v.VendorId=c.VendorId
          WHERE c.IsActive=1 AND m.IsRead=0 AND m.SenderUserId<>:userId
            AND (c.CustomerId=:userId OR v.UserId=:userId)) AS unreadMessageCount`, {
      replacements: { userId: user.id },
      type: QueryTypes.SELECT,
    }).then(rows => rows[0]);
  return ctx.navbarCounts;
}
