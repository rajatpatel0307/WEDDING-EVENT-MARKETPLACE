import test from "node:test";
import assert from "node:assert/strict";
import { findExistingLocation } from "../src/modules/admin/location-matching.js";

test("Add location finds existing Lucknow for normalized state, country and casing", () => {
  const existing = {
    id: "existing-location",
    city: "Lucknow",
    state: "Uttar Pradesh",
    country: "India",
    active: false,
  };
  const before = { ...existing };
  for (const state of ["UP", "U.P.", "U P", "Uttar Pradesh"])
    assert.equal(
      findExistingLocation([existing], {
        city: "  lucknow ",
        state,
        country: "IN",
        active: true,
      }),
      existing,
    );
  assert.deepEqual(
    existing,
    before,
    "Opening an existing location must not reactivate it",
  );
});

test("the same city in a different state or country is still a separate location", () => {
  const existing = {
    city: "Lucknow",
    state: "Uttar Pradesh",
    country: "India",
  };
  for (const input of [
    { ...existing, state: "Other State" },
    { ...existing, country: "Other Country" },
    { ...existing, city: "Another city" },
  ])
    assert.equal(findExistingLocation([existing], input), undefined);
  assert.equal(findExistingLocation([], existing), undefined);
});
