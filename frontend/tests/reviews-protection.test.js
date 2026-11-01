import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("review styles cannot affect Home Page elements after navigation", () => {
  const css = readFileSync(
    new URL("../src/modules/reviews/reviews.css", import.meta.url),
    "utf8",
  );
  for (const match of css.matchAll(/(?:^|(?<=[{}]))\s*([^{}]+)\{/g)) {
    const selector = match[1].trim();
    if (selector.startsWith("@media")) continue;
    for (const s of selector.split(","))
      assert.ok(
        s.trim().startsWith(".rr-module"),
        `Unscoped review selector: ${s}`,
      );
  }
});
