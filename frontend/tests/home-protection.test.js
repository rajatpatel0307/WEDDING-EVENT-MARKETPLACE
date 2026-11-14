import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url),
  manifest = JSON.parse(
    readFileSync(
      new URL("fixtures/home-protected.json", import.meta.url),
      "utf8",
    ),
  );
test("finalized Home Page, navigation, footer, global styles, shared components and assets stay unchanged", () => {
  for (const [path, expected] of Object.entries(manifest)) {
    const buffer = readFileSync(new URL(path, root));
    const content = /\.(jsx?|css|json)$/.test(path)
      ? Buffer.from(buffer.toString("utf8").replaceAll("\r\n", "\n"))
      : buffer;
    assert.equal(
      createHash("sha256").update(content).digest("hex"),
      expected,
      `${path} changed`,
    );
  }
});
test("marketplace pages keep styles local in inline Tailwind classes", () => {
  for (const name of ["BrowsePage", "DetailPage"]) {
    const source = readFileSync(
      new URL(`src/modules/marketplace/${name}.jsx`, root),
      "utf8",
    );
    assert.doesNotMatch(source, /import\s+(?:[^;]*?\s+from\s+)?["'][^"']+\.css["']/,
      `${name} must keep its styles in Tailwind classes`);
    assert.doesNotMatch(source, /<style\b|createElement\(\s*["']style["']/,
      `${name} must not inject global styles`);
  }
});

test("quotation pages and builder keep styles local in inline Tailwind classes", () => {
  for (const name of ["QuotationPages", "QuotationBuilder"]) {
    const source = readFileSync(
      new URL(`src/modules/quotations/${name}.jsx`, root),
      "utf8",
    );
    assert.doesNotMatch(source, /import\s+(?:[^;]*?\s+from\s+)?["'][^"']+\.css["']/,
      `${name} must keep its styles in Tailwind classes`);
    assert.doesNotMatch(source, /<style\b|createElement\(\s*["']style["']/,
      `${name} must not inject global styles`);
  }
});
