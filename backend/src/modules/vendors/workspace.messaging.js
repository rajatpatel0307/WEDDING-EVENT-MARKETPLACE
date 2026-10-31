// Compatibility adapters: one communication implementation for both workspaces.
import { randomUUID } from "node:crypto";
import * as s from "../messaging/communication.service.js";
import { limit } from "../auth/security.service.js";
const guard = (ctx) => s.actor(ctx, "Vendor");
export async function conversations(ctx) {
  guard(ctx);
  return (await s.conversations({}, ctx)).rows;
}
export const startConversation = (input, ctx) =>
  s.startConversation(input, ctx, "Vendor");
export async function chat(id, input, ctx) {
  guard(ctx);
  return s.chat(id, input, ctx);
}
export async function sendMessage(id, input, ctx) {
  const u = guard(ctx),
    body = { ...input, clientMessageId: input.clientMessageId || randomUUID() };
  s.validateMessage(id, body, ctx);
  await limit("chat-send:" + u.id, 60, 60);
  return s.sendMessage(id, body, ctx);
}
export async function readChat(id, ctx) {
  guard(ctx);
  return s.receipt(id, ctx, true);
}
export async function attachmentUpload(id, input, ctx) {
  const u = guard(ctx);
  await limit("chat-upload:" + u.id, 10, 60);
  return s.attachmentUpload(id, input, ctx);
}
export async function attachmentFile(id, mid, ctx) {
  guard(ctx);
  const f = await s.attachmentFile(id, mid, ctx);
  return { ...f, base64: f.bytes.toString("base64") };
}
