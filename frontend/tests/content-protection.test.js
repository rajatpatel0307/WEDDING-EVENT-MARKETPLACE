import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("informational and admin CMS styles remain scoped after navigating Home", () => {
  const css = readFileSync(
    new URL("../src/modules/content/content.css", import.meta.url),
    "utf8",
  );
  for (const match of css.matchAll(/(?:^|(?<=[{}]))\s*([^{}]+)\{/g)) {
    const selector = match[1].trim();
    if (selector.startsWith("@") || ["from", "to"].includes(selector)) continue;
    for (const part of selector.split(","))
      assert.ok(
        /^\.(info-site|cms-workspace)(?:\s|$|[.:])/.test(part.trim()),
        `Unscoped CMS selector: ${part}`,
      );
  }
});
