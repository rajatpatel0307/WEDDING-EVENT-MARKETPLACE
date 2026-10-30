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
test("new marketplace styles stay inside their page root after navigating back Home", () => {
  const css = readFileSync(
    new URL("src/modules/marketplace/marketplace.css", root),
    "utf8",
  );
  for (const match of css.matchAll(/(?:^|(?<=[{}]))\s*([^{}]+)\{/g)) {
    const selector = match[1].trim();
    if (selector.startsWith("@media")) continue;
    assert.ok(
      selector
        .split(",")
        .every((s) => s.trim().startsWith(".customer-marketplace")),
      `Unscoped selector: ${selector}`,
    );
  }
});

test("quotation styles stay scoped to quotation pages, including print and mobile rules", () => {
  const css = readFileSync(
    new URL("src/modules/quotations/quotations.css", root),
    "utf8",
  );
  for (const match of css.matchAll(/(?:^|(?<=[{}]))\s*([^{}]+)\{/g)) {
    const selector = match[1].trim();
    if (selector.startsWith("@media")) continue;
    assert.ok(
      selector
        .split(",")
        .every((s) => s.trim().startsWith(".quotation-workspace")),
      `Unscoped quotation selector: ${selector}`,
    );
  }
});
