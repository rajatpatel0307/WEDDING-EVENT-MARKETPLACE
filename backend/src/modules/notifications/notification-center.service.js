import { createHash } from "node:crypto";
import { z } from "zod";
import { sequelize } from "../../config/database.js";
import { QueryTypes } from "sequelize";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { emitUser, afterCommit } from "../messaging/realtime-bus.js";
export const query = async (sql, replacements = {}, transaction) => {
  const rows = await sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
    transaction,
  });
  // MSSQL returns GUIDs in uppercase; use one canonical representation in URLs,
  // socket events and browser state, including newly generated IDs.
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        /(?:id$|^sender$)/i.test(key) &&
        typeof value === "string" &&
        /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value)
          ? value.toLowerCase()
          : value,
      ]),
    ),
  );
};
export const categoryFor = (type) =>
  /conversation/i.test(type || "")
    ? "chat"
    : /booking/i.test(type || "")
      ? "booking"
      : /quotation/i.test(type || "")
        ? "quotation"
        : "general";
export function notificationUrl(row, role) {
  const root = `/${role.toLowerCase()}`;
  const id = row.ReferenceId;
  if (!id) return `${root}/notifications`;
  if (row.ReferenceType === "Conversation" && role !== "Admin")
    return `${root}/messages?conversation=${id}`;
  if (row.ReferenceType === "Booking") return `${root}/bookings/${id}`;
  if (row.ReferenceType === "Quotation") return `${root}/quotations/${id}`;
  if (row.ReferenceType === "QuotationRequest")
    return `${root}/${role === "Admin" ? "quotation-requests" : "requests"}/${id}`;
  if (row.ReferenceType === "Service" && role === "Vendor")
    return `${root}/services/${id}`;
  if (row.ReferenceType === "Vendor" && role !== "Admin")
    return role === "Vendor" ? `${root}/profile` : `${root}/vendors/${id}`;
  if (row.ReferenceType === "Customer" && role === "Customer")
    return `${root}/profile`;
  if (role === "Admin") {
    const type = row.ReferenceType?.replace(/^Admin/, "");
    const paths = {
      Booking: "bookings",
      Vendor: "vendors",
      Vendors: "vendors",
      Customer: "customers",
      Service: "services",
      Services: "services",
      Payments: "finance/payments",
      Payment: "finance/payments",
      Refunds: "finance/refunds",
      VendorPayouts: "finance/payouts",
      Quotation: "quotations",
      Quotations: "quotations",
    };
    if (paths[type]) return `${root}/${paths[type]}/${id}`;
  }
  return `${root}/notifications`;
}
export async function createNotification(
  {
    userId,
    title,
    message,
    referenceType = null,
    referenceId = null,
    eventKey,
    essential = true,
  },
  tx,
) {
  if (!tx)
    return sequelize.transaction((t) =>
      createNotification(
        {
          userId,
          title,
          message,
          referenceType,
          referenceId,
          eventKey,
          essential,
        },
        t,
      ),
    );
  const category = categoryFor(referenceType);
  // Existing lifecycle operations guard transitions and milestone keys. The
  // transaction ID additionally coalesces repeated helper calls in one event.
  const key = createHash("sha256")
    .update(
      eventKey ||
        `${tx.id}:${userId}:${referenceType}:${referenceId}:${title}:${message}`,
    )
    .digest("hex");
  const [row] = await query(
    `
    IF NOT EXISTS(SELECT 1 FROM dbo.Notifications WITH(UPDLOCK,HOLDLOCK) WHERE UserId=:user AND EventKey=:key)
    AND (:essential =1 OR NOT EXISTS(SELECT 1 FROM dbo.NotificationPreferences WHERE UserId=:user AND
      ((:category ='chat' AND ChatEnabled=0) OR (:category ='booking' AND BookingEnabled=0) OR (:category ='quotation' AND QuotationEnabled=0))))
    BEGIN
      DECLARE @ids TABLE(id uniqueidentifier);
      INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId,Category,EventKey)
      OUTPUT inserted.NotificationId INTO @ids VALUES(:user,:category,:title,:message,:type,:id,:category,:key);
      SELECT id FROM @ids;
    END`,
    {
      user: userId,
      key,
      essential: essential ? 1 : 0,
      category,
      title: title.slice(0, 200),
      message: message.slice(0, 2000),
      type: referenceType,
      id: referenceId,
    },
    tx,
  );
  if (row)
    afterCommit(tx, () => {
      emitUser(userId, "new_notification", { id: row.id });
      emitUser(userId, "notification_count_updated", {});
    });
  return row;
}
export const preferencesInput = z
  .object({
    chatEnabled: z.boolean(),
    bookingEnabled: z.boolean(),
    quotationEnabled: z.boolean(),
  })
  .strict();
export async function preferences(ctx, input) {
  const user = requireAuth(ctx);
  if (input !== undefined) {
    const b = preferencesInput.parse(input);
    await sequelize.transaction(async (tx) => {
      await query(
        `IF EXISTS(SELECT 1 FROM dbo.NotificationPreferences WITH(UPDLOCK,HOLDLOCK) WHERE UserId=:user)
        UPDATE dbo.NotificationPreferences SET ChatEnabled=:chat,BookingEnabled=:booking,QuotationEnabled=:quotation,UpdatedAt=SYSUTCDATETIME() WHERE UserId=:user;
        ELSE INSERT dbo.NotificationPreferences(UserId,ChatEnabled,BookingEnabled,QuotationEnabled) VALUES(:user,:chat,:booking,:quotation);`,
        {
          user: user.id,
          chat: b.chatEnabled ? 1 : 0,
          booking: b.bookingEnabled ? 1 : 0,
          quotation: b.quotationEnabled ? 1 : 0,
        },
        tx,
      );
    });
  }
  const [p] = await query(
    "SELECT ChatEnabled AS chatEnabled,BookingEnabled AS bookingEnabled,QuotationEnabled AS quotationEnabled FROM dbo.NotificationPreferences WHERE UserId=:user",
    { user: user.id },
  );
  return (
    p || { chatEnabled: true, bookingEnabled: true, quotationEnabled: true }
  );
}
const paging = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  category: z
    .enum(["all", "chat", "booking", "quotation", "general"])
    .default("all"),
  unread: z.enum(["0", "1"]).default("0"),
});
export async function inbox(input, ctx, role) {
  const user = requireAuth(ctx),
    b = paging.parse(input);
  const rows = await query(
    `SELECT NotificationId AS id,Title AS title,Message AS message,ReferenceType,ReferenceId,IsRead AS isRead,CreatedAt AS createdAt,
    CASE WHEN ReferenceType='Conversation' THEN 'chat' WHEN ReferenceType LIKE '%Booking%' THEN 'booking' WHEN ReferenceType LIKE '%Quotation%' THEN 'quotation' ELSE Category END AS category
    FROM dbo.Notifications WHERE UserId=:user AND DismissedAt IS NULL AND (:unread =0 OR IsRead=0)
    AND (:category ='all' OR :category = CASE WHEN ReferenceType='Conversation' THEN 'chat' WHEN ReferenceType LIKE '%Booking%' THEN 'booking' WHEN ReferenceType LIKE '%Quotation%' THEN 'quotation' ELSE Category END)
    ORDER BY CreatedAt DESC,NotificationId DESC OFFSET :offset ROWS FETCH NEXT 21 ROWS ONLY`,
    {
      user: user.id,
      unread: b.unread === "1" ? 1 : 0,
      category: b.category,
      offset: (b.page - 1) * 20,
    },
  );
  return {
    rows: rows
      .slice(0, 20)
      .map((r) => ({ ...r, actionUrl: notificationUrl(r, role) })),
    hasMore: rows.length > 20,
  };
}
export async function unreadCount(ctx) {
  const user = requireAuth(ctx);
  const [row] = await query(
    "SELECT COUNT(*) AS count FROM dbo.Notifications WHERE UserId=:user AND IsRead=0 AND DismissedAt IS NULL",
    { user: user.id },
  );
  return row;
}
export async function updateNotification(id, action, ctx) {
  const user = requireAuth(ctx);
  if (id) z.guid().parse(id);
  const rows = await query(
    `UPDATE dbo.Notifications SET ${action === "dismiss" ? "DismissedAt=SYSUTCDATETIME()" : "IsRead=1,ReadAt=COALESCE(ReadAt,SYSUTCDATETIME())"} OUTPUT inserted.NotificationId AS id WHERE UserId=:user AND (:id IS NULL OR NotificationId=:id)`,
    { user: user.id, id: id || null },
  );
  if (id && !rows.length)
    throw Object.assign(new Error("Notification not found."), { status: 404 });
  emitUser(user.id, "notification_read", { id: id || null });
  emitUser(user.id, "notification_count_updated", {});
  return { success: true };
}
