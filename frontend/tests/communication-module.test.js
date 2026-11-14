import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeChatMessages } from "../src/services/chat-sync.js";
test("reconciliation never regresses receipts or restores deleted private content", () => {
  const old = {
    id: "fixture",
    text: null,
    createdAt: "2026-01-01T00:00:00Z",
    status: "Read",
    isRead: true,
    deletedAt: "2026-01-01T00:01:00Z",
    hasAttachment: false,
  };
  const [merged] = mergeChatMessages(
    [old],
    [
      {
        ...old,
        status: "Sent",
        isRead: false,
        deletedAt: null,
        text: "Outdated content",
        hasAttachment: true,
      },
    ],
  );
  assert.equal(merged.status, "Read");
  assert.equal(merged.isRead, true);
  assert.equal(merged.text, null);
  assert.equal(merged.hasAttachment, false);
});
test("communication components keep styles local without loading global CSS", () => {
  for (const name of ["ChatPage", "CommunicationOverview", "NotificationTable", "Notifications"]) {
    const source = readFileSync(
      new URL(`../src/modules/communication/${name}.jsx`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(source, /import\s+(?:[^;]*?\s+from\s+)?["'][^"']+\.css["']/,
      `${name} must keep its styles in Tailwind classes`);
    assert.doesNotMatch(source, /<style\b|createElement\(\s*["']style["']/,
      `${name} must not inject global styles`);
  }
});
