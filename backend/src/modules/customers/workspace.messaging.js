import { z } from "zod";
import { sign, verify } from "../../config/jwt.js";
import { uploadAsset } from "../media/cloudinary.service.js";
import { downloadDocument } from "../vendors/documents.service.js";
import {
  scope,
  repo,
  owned,
  fail,
  audit,
} from "./workspace.common.js";

export async function conversations(ctx) {
  const { id } = scope(ctx);
  return repo.select(
    "SELECT c.ConversationId AS id,c.VendorId AS vendorId,c.BookingId AS bookingId,COALESCE(c.EventId,b.EventId) AS eventId,v.BusinessName AS customer,v.LogoUrl AS image,e.EventName AS event,b.BookingNumber AS booking,c.LastMessageAt AS updatedAt,lastMessage.MessageText AS lastMessage,(SELECT COUNT(*) FROM dbo.Messages m WHERE m.ConversationId=c.ConversationId AND m.IsRead=0 AND m.SenderUserId<> :id) AS unread FROM dbo.Conversations c JOIN dbo.Vendors v ON v.VendorId=c.VendorId LEFT JOIN dbo.Booking b ON b.BookingId=c.BookingId LEFT JOIN dbo.Events e ON e.EventId=COALESCE(c.EventId,b.EventId) OUTER APPLY(SELECT TOP(1) MessageText FROM dbo.Messages m WHERE m.ConversationId=c.ConversationId ORDER BY m.CreatedAt DESC,m.MessageId) lastMessage WHERE c.CustomerId=:id AND c.IsActive=1 ORDER BY COALESCE(c.LastMessageAt,c.CreatedAt) DESC,c.ConversationId",
    { id },
  );
}
export async function startConversation(input, ctx) {
  const { id } = scope(ctx),
    b = z
      .object({
        vendorId: z.guid(),
        eventId: z.guid().optional(),
        bookingId: z.guid().optional(),
      })
      .strict()
      .parse(input);
  return repo.transaction(async (tx) => {
    const [vendor] = await repo.select(
      "SELECT v.VendorId FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId WHERE v.VendorId=:vendor AND v.IsActive=1 AND v.VerificationStatus='Approved' AND u.IsActive=1 AND u.IsBlocked=0",
      { vendor: b.vendorId },
      tx,
    );
    if (!vendor) fail("Vendor unavailable.", 409);
    if (b.eventId) await owned("events", b.eventId, id, tx);
    if (b.bookingId) {
      const booking = await owned("bookings", b.bookingId, id, tx);
      if (booking.VendorId.toLowerCase() !== b.vendorId.toLowerCase())
        fail("Booking does not belong to this vendor.");
    }
    await repo.select(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource=:key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Conversation is being updated',1;",
      { key: `MarketplaceChat:${b.vendorId.toLowerCase()}:${id.toLowerCase()}` },
      tx,
    );
    const [old] = await repo.select(
      "SELECT TOP(1) ConversationId AS id FROM dbo.Conversations WHERE CustomerId=:id AND VendorId=:vendor AND IsActive=1 AND (BookingId=:booking OR (BookingId IS NULL AND :booking IS NULL)) AND (EventId=:event OR (EventId IS NULL AND :event IS NULL)) ORDER BY CreatedAt",
      {
        id,
        vendor: b.vendorId,
        booking: b.bookingId || null,
        event: b.eventId || null,
      },
      tx,
    );
    if (old) return old;
    return (
      await repo.insert(
        { table: "Conversations", id: "ConversationId" },
        {
          CustomerId: id,
          VendorId: b.vendorId,
          BookingId: b.bookingId || null,
          EventId: b.eventId || null,
          IsActive: 1,
        },
        tx,
      )
    )[0];
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
        purpose: "customer-chat",
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
        attachment.purpose !== "customer-chat" ||
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
      "UPDATE dbo.Conversations SET LastMessageAt=SYSUTCDATETIME() WHERE ConversationId=:conversation AND CustomerId=:id",
      { conversation: recordId, id },
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
