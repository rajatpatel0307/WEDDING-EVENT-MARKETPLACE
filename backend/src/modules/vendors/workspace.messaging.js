import { z } from "zod";
import { sign, verify } from "../../config/jwt.js";
import { uploadAsset } from "../media/cloudinary.service.js";
import { downloadDocument } from "./documents.service.js";
import {
  scope,
  repo,
  owned,
  fail,
  audit,
  notifyCustomer,
} from "./workspace.common.js";

export async function conversations(ctx) {
  const { id, user } = scope(ctx);
  return repo.select(
    "SELECT c.ConversationId AS id,c.CustomerId AS customerId,CONCAT(u.FirstName,' ',u.LastName) AS customer,u.ProfilePhotoUrl AS image,e.EventName AS event,b.BookingNumber AS booking,c.LastMessageAt AS updatedAt,lastMessage.MessageText AS lastMessage,(SELECT COUNT(*) FROM dbo.Messages m WHERE m.ConversationId=c.ConversationId AND m.IsRead=0 AND m.SenderUserId<> :owner) AS unread FROM dbo.Conversations c JOIN dbo.Users u ON u.UserId=c.CustomerId LEFT JOIN dbo.Booking b ON b.BookingId=c.BookingId LEFT JOIN dbo.Events e ON e.EventId=COALESCE(c.EventId,b.EventId) OUTER APPLY(SELECT TOP(1) MessageText FROM dbo.Messages m WHERE m.ConversationId=c.ConversationId ORDER BY m.CreatedAt DESC,m.MessageId) lastMessage WHERE c.VendorId=:id AND c.IsActive=1 ORDER BY COALESCE(c.LastMessageAt,c.CreatedAt) DESC,c.ConversationId",
    { id, owner: user.id },
  );
}
export async function startConversation(input, ctx) {
  const { id } = scope(ctx),
    body = z.object({ bookingId: z.guid() }).strict().parse(input);
  return repo.transaction(async (tx) => {
    const booking = await owned("bookings", body.bookingId, id, tx);
    await repo.select(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource=:key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Conversation is being updated',1;",
      { key: `VendorChat:${id}:${booking.CustomerId}` },
      tx,
    );
    const [old] = await repo.select(
      "SELECT TOP(1) ConversationId AS id FROM dbo.Conversations WHERE VendorId=:id AND CustomerId=:customer AND BookingId=:booking AND IsActive=1 ORDER BY CreatedAt",
      { id, customer: booking.CustomerId, booking: booking.BookingId },
      tx,
    );
    if (old) return old;
    const [created] = await repo.insert(
      { table: "Conversations", id: "ConversationId" },
      {
        VendorId: id,
        CustomerId: booking.CustomerId,
        BookingId: booking.BookingId,
        IsActive: 1,
      },
      tx,
    );
    await audit(
      ctx,
      "CONVERSATION_CREATED",
      "Conversations",
      created.id,
      null,
      { booking: booking.BookingId },
      tx,
    );
    return created;
  });
}
export async function chat(recordId, input, ctx) {
  const { id, user } = scope(ctx);
  await owned("conversations", recordId, id, undefined, false);
  const query = z
    .object({
      before: z.iso.datetime().optional(),
      beforeId: z.guid().optional(),
    })
    .refine((v) => !!v.before === !!v.beforeId, {
      message: "Provide both pagination cursor values.",
    })
    .parse(input);
  const rows = await repo.select(
    "SELECT TOP(50) MessageId AS id,MessageText AS text,SenderUserId AS sender,MessageType AS type,AttachmentName AS attachmentName,AttachmentMime AS attachmentMime,CASE WHEN AttachmentUrl IS NULL THEN 0 ELSE 1 END AS hasAttachment,IsRead AS isRead,CreatedAt AS createdAt FROM dbo.Messages WHERE ConversationId=:conversation AND (:before IS NULL OR CreatedAt< :before OR (CreatedAt=:before AND MessageId< :beforeId)) ORDER BY CreatedAt DESC,MessageId DESC",
    {
      conversation: recordId,
      before: query.before ? new Date(query.before) : null,
      beforeId: query.beforeId || null,
    },
  );
  return {
    messages: rows.reverse().map((m) => ({
      ...m,
      mine: m.sender.toLowerCase() === user.id.toLowerCase(),
    })),
    hasMore: rows.length === 50,
  };
}
export async function attachmentUpload(recordId, input, ctx) {
  const { id, user } = scope(ctx);
  await owned("conversations", recordId, id, undefined, false);
  const body = z
    .object({
      name: z.string().trim().min(1).max(255),
      base64: z.string().max(7 * 1024 * 1024),
    })
    .strict()
    .parse(input);
  const asset = await uploadAsset(body.base64);
  return {
    name: body.name,
    token: sign(
      {
        purpose: "vendor-chat",
        vendorId: id,
        owner: user.id,
        conversation: recordId,
        key: asset.key,
        name: body.name,
      },
      "24h",
    ),
  };
}
export async function sendMessage(recordId, input, ctx) {
  const { id, user } = scope(ctx),
    body = z
      .object({
        text: z.string().trim().max(5000).default(""),
        attachmentToken: z.string().max(4000).optional(),
      })
      .strict()
      .parse(input);
  if (!body.text && !body.attachmentToken)
    fail("Write a message or attach a file.");
  let attachment;
  if (body.attachmentToken) {
    try {
      attachment = verify(body.attachmentToken);
      if (
        attachment.purpose !== "vendor-chat" ||
        attachment.vendorId !== id ||
        attachment.owner !== user.id ||
        attachment.conversation.toLowerCase() !== recordId.toLowerCase()
      )
        throw Error();
    } catch {
      fail(
        "Attachment expired or belongs to another conversation. Upload it again.",
      );
    }
  }
  return repo.transaction(async (tx) => {
    const conversation = await owned("conversations", recordId, id, tx);
    if (!conversation.IsActive) fail("This conversation is closed.", 409);
    const [message] = await repo.insert(
      { table: "Messages", id: "MessageId" },
      {
        ConversationId: conversation.ConversationId,
        SenderUserId: user.id,
        MessageType: attachment ? "File" : "Text",
        MessageText: body.text || null,
        AttachmentUrl: attachment?.key || null,
        AttachmentName: attachment?.name || null,
        AttachmentMime: attachment
          ? attachment.key.endsWith(".pdf")
            ? "application/pdf"
            : attachment.key.endsWith(".png")
              ? "image/png"
              : "image/jpeg"
          : null,
        IsRead: 0,
      },
      tx,
    );
    await repo.select(
      "UPDATE dbo.Conversations SET LastMessageAt=SYSUTCDATETIME() WHERE ConversationId=:conversation AND VendorId=:id",
      { conversation: recordId, id },
      tx,
    );
    await notifyCustomer(
      conversation.CustomerId,
      "New message from your vendor",
      body.text ? body.text.slice(0, 300) : "Your vendor shared a file.",
      "Conversation",
      conversation.ConversationId,
      tx,
    );
    await audit(
      ctx,
      "MESSAGE_SENT",
      "Messages",
      message.id,
      null,
      { conversation: recordId, hasAttachment: !!attachment },
      tx,
    );
    return { id: message.id, message: "Message sent." };
  });
}
export async function readChat(recordId, ctx) {
  const { id, user } = scope(ctx);
  await owned("conversations", recordId, id, undefined, false);
  await repo.select(
    "UPDATE dbo.Messages SET IsRead=1 WHERE ConversationId=:conversation AND SenderUserId<> :owner AND IsRead=0",
    { conversation: recordId, owner: user.id },
  );
  return { message: "Messages marked as read." };
}
export async function attachmentFile(recordId, messageId, ctx) {
  const { id } = scope(ctx);
  await owned("conversations", recordId, id, undefined, false);
  z.guid().parse(messageId);
  const [message] = await repo.select(
    "SELECT AttachmentUrl AS [key],AttachmentName AS name FROM dbo.Messages WHERE ConversationId=:conversation AND MessageId=:message",
    { conversation: recordId, message: messageId },
  );
  if (!message?.key) fail("Attachment not found.", 404);
  const file = await downloadDocument({ key: message.key });
  await audit(ctx, "ATTACHMENT_VIEWED", "Messages", messageId, null, {
    conversation: recordId,
  });
  return { ...file, name: message.name || file.name };
}
