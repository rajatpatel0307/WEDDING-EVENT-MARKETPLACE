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
test("communication styles remain scoped after navigating to the Home Page", () => {
  const css = readFileSync(
    new URL("../src/modules/communication/communication.css", import.meta.url),
    "utf8",
  );
  for (const match of css.matchAll(/(?:^|(?<=[{}]))\s*([^{}]+)\{/g)) {
    const selector = match[1].trim();
    if (selector.startsWith("@media")) continue;
    assert.ok(
      selector.split(",").every((s) => s.trim().startsWith(".comm-")),
      `Unscoped communication selector: ${selector}`,
    );
  }
});
