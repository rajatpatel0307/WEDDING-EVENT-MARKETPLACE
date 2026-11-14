import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("informational and admin CMS components keep styles local without global CSS", () => {
  for (const name of ["InfoPages", "AdminContent"]) {
    const source = readFileSync(
      new URL(`../src/modules/content/${name}.jsx`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(source, /import\s+(?:[^;]*?\s+from\s+)?["'][^"']+\.css["']/,
      `${name} must keep its styles in Tailwind classes`);
    assert.doesNotMatch(source, /<style\b|createElement\(\s*["']style["']/,
      `${name} must not inject global styles`);
  }
});
