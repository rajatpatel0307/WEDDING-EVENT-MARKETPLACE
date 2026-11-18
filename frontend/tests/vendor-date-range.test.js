import test from "node:test";
import assert from "node:assert/strict";
import { vendorDateRange } from "../src/modules/admin/vendor-date-range.js";

test("vendor date presets include today in India even before the UTC date changes", () => {
  const now = new Date("2026-11-18T20:00:00.000Z");
  for (const [period, from] of [
    ["7", "2026-11-13"], ["15", "2026-11-05"], ["30", "2026-10-21"],
    ["45", "2026-10-06"], ["60", "2026-09-21"],
  ]) assert.deepEqual(vendorDateRange(period, now), { from, to: "2026-11-19" });
});

test("vendor date presets handle year boundaries and leap days", () => {
  assert.deepEqual(vendorDateRange("7", new Date("2026-01-01T08:00:00Z")), {
    from: "2025-12-26", to: "2026-01-01",
  });
  assert.deepEqual(vendorDateRange("7", new Date("2024-03-01T08:00:00Z")), {
    from: "2024-02-24", to: "2024-03-01",
  });
});

test("all dates clears the bounds and custom dates preserve the current selection", () => {
  assert.deepEqual(vendorDateRange(""), { from: "", to: "" });
  assert.equal(vendorDateRange("custom"), null);
  assert.throws(() => vendorDateRange("invalid"), RangeError);
});
