import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("media rules including dialogs and mobile styles remain isolated from Home", () => {
  const css = readFileSync(
    new URL("../src/modules/media/media.css", import.meta.url),
    "utf8",
  );
  for (const match of css.matchAll(/(?:^|(?<=[{}]))\s*([^{}]+)\{/g)) {
    const selector = match[1].trim();
    if (selector.startsWith("@media")) continue;
    for (const part of selector.split(","))
      assert.ok(
        part.trim().startsWith(".mm-module"),
        `Unscoped media selector: ${part}`,
      );
  }
});
