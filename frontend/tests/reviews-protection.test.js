import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("review components keep styles local in inline Tailwind classes", () => {
  const source = readFileSync(
    new URL("../src/modules/reviews/Reviews.jsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /import\s+(?:[^;]*?\s+from\s+)?["'][^"']+\.css["']/,
    "Review components must keep their styles in Tailwind classes");
  assert.doesNotMatch(source, /<style\b|createElement\(\s*["']style["']/,
    "Review components must not inject global styles");
});
