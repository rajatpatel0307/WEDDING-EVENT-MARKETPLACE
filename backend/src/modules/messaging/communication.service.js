import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sequelize } from "../../config/database.js";
import {
  requireAuth,
  requireRole,
  requireApprovedVendor,
} from "../../middleware/auth.middleware.js";
import { sign, verify } from "../../config/jwt.js";
import {
  uploadAsset,
  validateFile,
  downloadAsset,
} from "../media/cloudinary.service.js";
import {
  query,
  createNotification,
} from "../notifications/notification-center.service.js";
import { afterCommit, emitUser } from "./realtime-bus.js";
export const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
export function actor(ctx, role) {
  return role === "Vendor"
    ? requireApprovedVendor(ctx)
    : requireRole(ctx, "CUSTOMER");
}
export async function membership(id, ctx, tx, lock = false) {
  z.guid().parse(id);
  const user = requireAuth(ctx);
  const [c] = await query(
    `SELECT c.*,v.UserId AS VendorUserId FROM dbo.Conversations c ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""}
    JOIN dbo.Vendors v ON v.VendorId=c.VendorId WHERE c.ConversationId=:id AND c.IsActive=1 AND (c.CustomerId=:user OR v.UserId=:user)`,
    { id, user: user.id },
    tx,
  );
  if (!c) fail("Conversation not found.", 404);
  if (lower(c.CustomerId) === lower(user.id)) requireRole(ctx, "CUSTOMER");
  else requireApprovedVendor(ctx);
  return c;
}
const lower = (v) => String(v).toLowerCase();
export async function conversationDetails(id, ctx) {
  await membership(id, ctx);
  const user = requireAuth(ctx);
  const [row] = await query(
    `SELECT c.ConversationId AS id,c.VendorId AS vendorId,c.BookingId AS bookingId,c.EventId AS eventId,c.ServiceId AS serviceId,c.PackageId AS packageId,c.QuotationId AS quotationId,c.RequestId AS requestId,
    CASE WHEN c.CustomerId=:user THEN v.BusinessName ELSE CONCAT(u.FirstName,' ',u.LastName) END AS customer,
    CASE WHEN c.CustomerId=:user THEN v.LogoUrl ELSE u.ProfilePhotoUrl END AS image,
    CASE WHEN c.CustomerId=:user THEN v.UserId ELSE c.CustomerId END AS peerId,e.EventName AS event,b.BookingNumber AS booking,
    ISNULL(p.IsMuted,0) AS isMuted,ISNULL(p.IsArchived,0) AS isArchived
    FROM dbo.Conversations c JOIN dbo.Vendors v ON v.VendorId=c.VendorId JOIN dbo.Users u ON u.UserId=c.CustomerId
    LEFT JOIN dbo.Events e ON e.EventId=c.EventId LEFT JOIN dbo.Booking b ON b.BookingId=c.BookingId
    LEFT JOIN dbo.ConversationParticipants p ON p.ConversationId=c.ConversationId AND p.UserId=:user WHERE c.ConversationId=:id`,
    { id, user: user.id },
  );
  return row;
}
const peer = (c, user) =>
  lower(c.CustomerId) === lower(user) ? c.VendorUserId : c.CustomerId;
function broadcast(c, event, payload, tx) {
  afterCommit(tx, () => {
    for (const id of [c.CustomerId, c.VendorUserId])
      emitUser(id, event, { conversationId: c.ConversationId, ...payload });
  });
}
export const startInput = z
  .object({
    vendorId: z.guid().optional(),
    eventId: z.guid().optional(),
    serviceId: z.guid().optional(),
    packageId: z.guid().optional(),
    bookingId: z.guid().optional(),
    quotationId: z.guid().optional(),
    requestId: z.guid().optional(),
  })
  .strict();
export async function startConversation(input, ctx, role) {
  const user = actor(ctx, role),
    b = startInput.parse(input);
  return sequelize.transaction(async (tx) => {
    let customer = user.id,
      vendor = role === "Vendor" ? user.vendor.id : b.vendorId;
    let event = b.eventId || null;
    for (const [field, table, pk] of [
      ["bookingId", "Booking", "BookingId"],
      ["quotationId", "Quotations", "QuotationId"],
      ["requestId", "QuotationRequests", "RequestId"],
    ]) {
      if (!b[field]) continue;
      const [r] = await query(
        `SELECT CustomerId,VendorId,EventId${field === "quotationId" ? ",Status,SentAt" : ""} FROM dbo.${table} WHERE ${pk}=:id AND ${role === "Vendor" ? "VendorId" : "CustomerId"}=:owner`,
        { id: b[field], owner: role === "Vendor" ? user.vendor.id : user.id },
        tx,
      );
      if (!r) fail("Related record not found.", 404);
      if (
        field === "quotationId" &&
        role === "Customer" &&
        (r.Status === "Draft" || !r.SentAt)
      )
        fail("Quotation unavailable.", 404);
      if (
        (vendor && lower(vendor) !== lower(r.VendorId)) ||
        (role === "Vendor" &&
          customer !== user.id &&
          lower(customer) !== lower(r.CustomerId))
      )
        fail("Conversation context does not match.");
      if (event && r.EventId && lower(event) !== lower(r.EventId))
        fail("Event does not match.");
      customer = r.CustomerId;
      vendor = r.VendorId;
      event = event || r.EventId;
    }
    if (
      !vendor ||
      (role === "Vendor" && !b.bookingId && !b.quotationId && !b.requestId)
    )
      fail("Select an authorized vendor or related record.");
    const [v] = await query(
      `SELECT v.UserId FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId WHERE v.VendorId=:vendor AND v.IsActive=1 AND v.VerificationStatus='Approved' AND u.IsActive=1 AND u.IsBlocked=0`,
      { vendor },
      tx,
    );
    if (!v || lower(v.UserId) === lower(customer))
      fail("Vendor unavailable.", 409);
    if (event) {
      const [e] = await query(
        "SELECT EventId FROM dbo.Events WHERE EventId=:event AND CustomerId=:customer",
        { event, customer },
        tx,
      );
      if (!e) fail("Event not found.", 404);
    }
    if (b.serviceId || b.packageId) {
      const [s] = await query(
        `SELECT s.ServiceId FROM dbo.Services s ${b.packageId ? "JOIN dbo.ServicePackages p ON p.ServiceId=s.ServiceId AND p.PackageId=:package AND p.IsActive=1" : ""} WHERE s.VendorId=:vendor AND (:service IS NULL OR s.ServiceId=:service) AND s.IsActive=1 AND s.ApprovalStatus='Approved'`,
        { vendor, service: b.serviceId || null, package: b.packageId || null },
        tx,
      );
      if (!s) fail("Service or package not found.", 404);
      b.serviceId = s.ServiceId;
    }
    await query(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource=:key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Conversation busy',1;",
      { key: `MarketplaceChat:${lower(vendor)}:${lower(customer)}` },
      tx,
    );
    const p = {
      customer,
      vendor,
      event,
      booking: b.bookingId || null,
      service: b.serviceId || null,
      package: b.packageId || null,
      quotation: b.quotationId || null,
      request: b.requestId || null,
    };
    const [old] = await query(
      `SELECT ConversationId AS id FROM dbo.Conversations WHERE CustomerId=:customer AND VendorId=:vendor AND IsActive=1
      AND ISNULL(CONVERT(varchar(36),EventId),'')=ISNULL(CONVERT(varchar(36),:event),'')
      AND ISNULL(CONVERT(varchar(36),BookingId),'')=ISNULL(CONVERT(varchar(36),:booking),'')
      AND ISNULL(CONVERT(varchar(36),ServiceId),'')=ISNULL(CONVERT(varchar(36),:service),'')
      AND ISNULL(CONVERT(varchar(36),PackageId),'')=ISNULL(CONVERT(varchar(36),:package),'')
      AND ISNULL(CONVERT(varchar(36),QuotationId),'')=ISNULL(CONVERT(varchar(36),:quotation),'')
      AND ISNULL(CONVERT(varchar(36),RequestId),'')=ISNULL(CONVERT(varchar(36),:request),'')`,
      p,
      tx,
    );
    if (old) return old;
    const id = randomUUID();
    await query(
      "INSERT dbo.Conversations(ConversationId,CustomerId,VendorId,EventId,BookingId,ServiceId,PackageId,QuotationId,RequestId) VALUES(:id,:customer,:vendor,:event,:booking,:service,:package,:quotation,:request)",
      { ...p, id },
      tx,
    );
    const c = {
      ConversationId: id,
      CustomerId: customer,
      VendorUserId: v.UserId,
    };
    await createNotification(
      {
        userId: peer(c, user.id),
        title: "New conversation",
        message: "A new private conversation is ready.",
        referenceType: "Conversation",
        referenceId: id,
        eventKey: `conversation:${id}`,
        essential: false,
      },
      tx,
    );
    broadcast(c, "conversation_created", { id }, tx);
    return { id };
  });
}
const listInput = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  q: z.string().max(100).default(""),
  archived: z.enum(["0", "1"]).default("0"),
  unread: z.enum(["0", "1"]).default("0"),
});
export async function conversations(input, ctx) {
  const user = requireAuth(ctx),
    b = listInput.parse(input);
  const rows = await query(
    `SELECT c.ConversationId AS id,c.VendorId AS vendorId,c.BookingId AS bookingId,c.EventId AS eventId,c.ServiceId AS serviceId,c.PackageId AS packageId,c.QuotationId AS quotationId,c.RequestId AS requestId,
    CASE WHEN c.CustomerId=:user THEN v.BusinessName ELSE CONCAT(u.FirstName,' ',u.LastName) END AS customer,
    CASE WHEN c.CustomerId=:user THEN v.LogoUrl ELSE u.ProfilePhotoUrl END AS image,
    CASE WHEN c.CustomerId=:user THEN v.UserId ELSE c.CustomerId END AS peerId,
    e.EventName AS event,b.BookingNumber AS booking,COALESCE(c.LastMessageAt,c.CreatedAt) AS updatedAt,
    lastMessage.MessageText AS lastMessage,ISNULL(p.IsMuted,0) AS isMuted,ISNULL(p.IsArchived,0) AS isArchived,
    counts.unread FROM dbo.Conversations c JOIN dbo.Vendors v ON v.VendorId=c.VendorId JOIN dbo.Users u ON u.UserId=c.CustomerId
    LEFT JOIN dbo.Events e ON e.EventId=c.EventId LEFT JOIN dbo.Booking b ON b.BookingId=c.BookingId
    LEFT JOIN dbo.ConversationParticipants p ON p.ConversationId=c.ConversationId AND p.UserId=:user
    OUTER APPLY(SELECT TOP(1) CASE WHEN DeletedAt IS NOT NULL THEN 'Message deleted' ELSE COALESCE(MessageText,'Attachment') END AS MessageText FROM dbo.Messages m WHERE m.ConversationId=c.ConversationId ORDER BY CreatedAt DESC,MessageId DESC) lastMessage
    OUTER APPLY(SELECT COUNT(*) AS unread FROM dbo.Messages m WHERE m.ConversationId=c.ConversationId AND SenderUserId<> :user AND IsRead=0 AND DeletedAt IS NULL) counts
    WHERE c.IsActive=1 AND (c.CustomerId=:user OR v.UserId=:user) AND ISNULL(p.IsArchived,0)=:archived AND (:unread =0 OR counts.unread>0)
    AND (v.BusinessName LIKE :search OR CONCAT(u.FirstName,' ',u.LastName) LIKE :search)
    ORDER BY COALESCE(c.LastMessageAt,c.CreatedAt) DESC,c.ConversationId DESC OFFSET :offset ROWS FETCH NEXT 31 ROWS ONLY`,
    {
      user: user.id,
      archived: b.archived === "1" ? 1 : 0,
      unread: b.unread === "1" ? 1 : 0,
      search: `%${b.q.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`,
      offset: (b.page - 1) * 30,
    },
  );
  return { rows: rows.slice(0, 30), hasMore: rows.length > 30 };
}
export const cursorInput = z
  .object({
    before: z.iso.datetime().optional(),
    beforeId: z.guid().optional(),
  })
  .refine((b) => !!b.before === !!b.beforeId, {
    message: "Provide both cursor values.",
  });
export async function chat(id, input, ctx) {
  await membership(id, ctx);
  const b = cursorInput.parse(input),
    user = requireAuth(ctx);
  const rows = await query(
    `SELECT TOP(51) MessageId AS id,SenderUserId AS sender,ClientMessageId AS clientMessageId,MessageType AS type,
    CASE WHEN DeletedAt IS NULL THEN MessageText ELSE NULL END AS text,
    CASE WHEN DeletedAt IS NULL AND AttachmentUrl IS NOT NULL THEN 1 ELSE 0 END AS hasAttachment,
    CASE WHEN DeletedAt IS NULL THEN AttachmentName ELSE NULL END AS attachmentName,AttachmentMime AS attachmentMime,DeletedAt AS deletedAt,
    IsRead AS isRead,CreatedAt AS createdAt,CASE WHEN IsRead=1 THEN 'Read' WHEN DeliveredAt IS NOT NULL THEN 'Delivered' ELSE 'Sent' END AS status
    FROM dbo.Messages WHERE ConversationId=:id AND (:before IS NULL OR CreatedAt<CONVERT(datetime2,:before) OR (CreatedAt=CONVERT(datetime2,:before) AND MessageId< :beforeId)) ORDER BY CreatedAt DESC,MessageId DESC`,
    { id, before: b.before || null, beforeId: b.beforeId || null },
  );
  const oldest = rows.slice(0, 50).at(-1);
  return {
    messages: rows
      .slice(0, 50)
      .reverse()
      .map((m) => ({ ...m, mine: lower(m.sender) === lower(user.id) })),
    hasMore: rows.length > 50,
    nextCursor: oldest
      ? {
          before: new Date(oldest.createdAt).toISOString(),
          beforeId: oldest.id,
        }
      : null,
  };
}
export const messageInput = z
  .object({
    text: z.string().trim().max(5000).default(""),
    attachmentToken: z.string().max(4000).optional(),
    clientMessageId: z.guid(),
  })
  .strict()
  .refine((b) => b.text || b.attachmentToken, {
    message: "Write a message or attach a file.",
  });
export function validateMessage(id, input, ctx) {
  const user = requireAuth(ctx),
    b = messageInput.parse(input);
  let a;
  if (b.attachmentToken) {
    try {
      a = verify(b.attachmentToken);
    } catch {
      fail("Attachment expired. Upload again.");
    }
    if (
      !["communication-chat", "customer-chat", "vendor-chat"].includes(
        a.purpose,
      ) ||
      lower(a.owner) !== lower(user.id) ||
      lower(a.conversation) !== lower(id)
    )
      fail("Attachment does not belong to this conversation.", 403);
  }
  return { user, b, a };
}
export async function sendMessage(id, input, ctx) {
  const { user, b, a } = validateMessage(id, input, ctx);
  return sequelize.transaction(async (tx) => {
    const c = await membership(id, ctx, tx, true);
    const [old] = await query(
      "SELECT MessageId AS id,ConversationId,MessageText,AttachmentUrl FROM dbo.Messages WITH(UPDLOCK,HOLDLOCK) WHERE SenderUserId=:user AND ClientMessageId=:key",
      { user: user.id, key: b.clientMessageId },
      tx,
    );
    if (old) {
      if (
        lower(old.ConversationId) !== lower(id) ||
        (old.MessageText || "") !== b.text ||
        (old.AttachmentUrl || null) !== (a?.key || null)
      )
        fail("Retry key was already used for another message.", 409);
      return { id: old.id };
    }
    const mid = randomUUID();
    await query(
      `INSERT dbo.Messages(MessageId,ConversationId,SenderUserId,MessageText,MessageType,AttachmentUrl,AttachmentName,AttachmentMime,AttachmentSize,ClientMessageId)
      VALUES(:mid,:id,:user,:text,:type,:key,:name,:mime,:size,:client)`,
      {
        mid,
        id,
        user: user.id,
        text: b.text || null,
        type: a ? "File" : "Text",
        key: a?.key || null,
        name: a?.name || null,
        mime: a?.mime || null,
        size: a?.size || null,
        client: b.clientMessageId,
      },
      tx,
    );
    await query(
      "UPDATE dbo.Conversations SET LastMessageAt=SYSUTCDATETIME() WHERE ConversationId=:id",
      { id },
      tx,
    );
    const recipient = peer(c, user.id);
    const [muted] = await query(
      "SELECT IsMuted FROM dbo.ConversationParticipants WHERE ConversationId=:id AND UserId=:user",
      { id, user: recipient },
      tx,
    );
    if (!muted?.IsMuted)
      await createNotification(
        {
          userId: recipient,
          title: a ? "New message attachment" : "New message",
          message: "You have a new private message.",
          referenceType: "Conversation",
          referenceId: id,
          eventKey: `message:${mid}`,
          essential: false,
        },
        tx,
      );
    broadcast(c, "receive_message", { id: mid }, tx);
    broadcast(
      c,
      "message_sent",
      { id: mid, clientMessageId: b.clientMessageId },
      tx,
    );
    broadcast(c, "conversation_updated", {}, tx);
    return { id: mid };
  });
}
export async function receipt(id, ctx, read = false) {
  return sequelize.transaction(async (tx) => {
    const c = await membership(id, ctx, tx, true),
      user = requireAuth(ctx);
    const rows = await query(
      `UPDATE dbo.Messages SET DeliveredAt=COALESCE(DeliveredAt,SYSUTCDATETIME())${read ? ",IsRead=1,ReadAt=COALESCE(ReadAt,SYSUTCDATETIME())" : ""} OUTPUT inserted.MessageId AS id
      WHERE ConversationId=:id AND SenderUserId<> :user AND DeletedAt IS NULL AND ${read ? "IsRead=0" : "DeliveredAt IS NULL"}`,
      { id, user: user.id },
      tx,
    );
    const notificationsRead = read
      ? await query(
          "UPDATE dbo.Notifications SET IsRead=1,ReadAt=COALESCE(ReadAt,SYSUTCDATETIME()) OUTPUT inserted.NotificationId AS id WHERE UserId=:user AND ReferenceType='Conversation' AND ReferenceId=:id AND IsRead=0",
          { id, user: user.id },
          tx,
        )
      : [];
    if (read)
      await query(
        `IF NOT EXISTS(SELECT 1 FROM dbo.ConversationParticipants WITH(UPDLOCK,HOLDLOCK) WHERE ConversationId=:id AND UserId=:user)
      INSERT dbo.ConversationParticipants(ConversationId,UserId) VALUES(:id,:user);
      UPDATE dbo.ConversationParticipants SET LastReadAt=SYSUTCDATETIME() WHERE ConversationId=:id AND UserId=:user`,
        { id, user: user.id },
        tx,
      );
    if (rows.length)
      broadcast(
        c,
        read ? "message_read" : "message_delivered",
        { ids: rows.map((r) => r.id) },
        tx,
      );
    if (read && notificationsRead.length)
      afterCommit(tx, () =>
        emitUser(user.id, "notification_count_updated", {}),
      );
    return { success: true };
  });
}
export async function participantState(id, input, ctx) {
  const b = z
      .object({
        isArchived: z.boolean().optional(),
        isMuted: z.boolean().optional(),
      })
      .strict()
      .parse(input),
    user = requireAuth(ctx);
  return sequelize.transaction(async (tx) => {
    await membership(id, ctx, tx, true);
    await query(
      `IF NOT EXISTS(SELECT 1 FROM dbo.ConversationParticipants WITH(UPDLOCK,HOLDLOCK) WHERE ConversationId=:id AND UserId=:user)
      INSERT dbo.ConversationParticipants(ConversationId,UserId) VALUES(:id,:user);
      UPDATE dbo.ConversationParticipants SET IsArchived=COALESCE(:archived,IsArchived),IsMuted=COALESCE(:muted,IsMuted) WHERE ConversationId=:id AND UserId=:user`,
      {
        id,
        user: user.id,
        archived: b.isArchived === undefined ? null : b.isArchived ? 1 : 0,
        muted: b.isMuted === undefined ? null : b.isMuted ? 1 : 0,
      },
      tx,
    );
    afterCommit(tx, () =>
      emitUser(user.id, "conversation_updated", { conversationId: id }),
    );
    return { success: true };
  });
}
export async function deleteMessage(mid, ctx) {
  z.guid().parse(mid);
  const user = requireAuth(ctx);
  return sequelize.transaction(async (tx) => {
    const [m] = await query(
      "SELECT ConversationId FROM dbo.Messages WHERE MessageId=:mid AND SenderUserId=:user",
      { mid, user: user.id },
      tx,
    );
    if (!m) fail("Message not found.", 404);
    const c = await membership(m.ConversationId, ctx, tx, true);
    const rows = await query(
      "UPDATE dbo.Messages SET DeletedAt=SYSUTCDATETIME() OUTPUT inserted.MessageId AS id WHERE MessageId=:mid AND DeletedAt IS NULL AND CreatedAt>=DATEADD(minute,-15,SYSUTCDATETIME())",
      { mid },
      tx,
    );
    if (!rows.length)
      fail("Messages may be deleted by their sender within 15 minutes.", 409);
    broadcast(c, "message_deleted", { id: mid }, tx);
    return { success: true };
  });
}
export async function attachmentUpload(id, input, ctx) {
  await membership(id, ctx);
  const user = requireAuth(ctx),
    b = z
      .object({
        name: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .regex(/^[^\x00-\x1f\\/]+$/),
        base64: z.string().max(7 * 1024 * 1024),
      })
      .strict()
      .parse(input);
  const file = validateFile(b.base64),
    asset = await uploadAsset(b.base64);
  return {
    name: b.name,
    token: sign(
      {
        purpose: "communication-chat",
        owner: user.id,
        conversation: id,
        key: asset.key,
        name: b.name,
        mime: file.mimeType,
        size: file.bytes.length,
      },
      "24h",
    ),
  };
}
export async function attachmentFile(id, mid, ctx) {
  await membership(id, ctx);
  z.guid().parse(mid);
  const [m] = await query(
    "SELECT AttachmentUrl,AttachmentName FROM dbo.Messages WHERE MessageId=:mid AND ConversationId=:id AND DeletedAt IS NULL",
    { mid, id },
  );
  if (!m?.AttachmentUrl) fail("Attachment not found.", 404);
  const f = await downloadAsset(m.AttachmentUrl);
  return {
    bytes: Buffer.from(f.base64, "base64"),
    mimeType: f.mimeType,
    name: m.AttachmentName,
  };
}
