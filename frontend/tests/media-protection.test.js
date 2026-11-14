import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("media components keep styles local in inline Tailwind classes", () => {
  const source = readFileSync(
    new URL("../src/modules/media/MediaLibrary.jsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /import\s+(?:[^;]*?\s+from\s+)?["'][^"']+\.css["']/,
    "Media components must keep their styles in Tailwind classes");
  assert.doesNotMatch(source, /<style\b|createElement\(\s*["']style["']/,
    "Media components must not inject global styles");
});
