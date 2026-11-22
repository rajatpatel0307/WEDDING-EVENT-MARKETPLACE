import test from "node:test";
import assert from "node:assert/strict";
import { findExistingLocation } from "../src/modules/admin/location-matching.js";
import {
  filterLocations,
  isLocationAvailable,
  isCustomerVisible,
} from "../src/modules/admin/location-directory.js";

const directory = [
  {
    id: "lucknow",
    city: "Lucknow",
    state: "Uttar Pradesh",
    country: "India",
    active: true,
  },
  {
    id: "jaipur",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    active: false,
  },
  {
    id: "pune",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    active: true,
  },
];

test("directory search combines city, state and country with availability filters", () => {
  assert.deepEqual(filterLocations(directory, "  LUCKNOW  "), [directory[0]]);
  assert.deepEqual(filterLocations(directory, "pradesh", "active"), [
    directory[0],
  ]);
  assert.deepEqual(filterLocations(directory, "india", "inactive"), [
    directory[1],
  ]);
  assert.deepEqual(filterLocations(directory, "Rajasthan", "active"), []);
  assert.deepEqual(filterLocations(directory, "", "all"), directory);
  assert.deepEqual(filterLocations([], "india"), []);
  assert.equal(directory.length, 3);
});

test("assignment rejects empty, deleted and deactivated selections after a catalog refresh", () => {
  assert.equal(isLocationAvailable(directory, "lucknow"), true);
  for (const id of ["", null, undefined, "jaipur", "missing"])
    assert.equal(isLocationAvailable(directory, id), false);
  assert.equal(
    isLocationAvailable(
      directory.filter((row) => row.id !== "lucknow"),
      "lucknow",
    ),
    false,
  );
  assert.equal(
    isLocationAvailable(
      directory.map((row) => ({ ...row, active: false })),
      "lucknow",
    ),
    false,
  );
  assert.equal(isLocationAvailable([], "lucknow"), false);
  assert.equal(
    isLocationAvailable([{ ...directory[0], managed: false }], "lucknow"),
    false,
  );
});

test("customer visibility uses the homepage result independently from registration status", () => {
  assert.equal(
    isCustomerVisible({
      active: false,
      customerVisible: true,
      approvedVendors: 1,
    }),
    true,
  );
  assert.equal(
    isCustomerVisible({
      active: true,
      customerVisible: false,
      approvedVendors: 3,
    }),
    false,
  );
  assert.equal(
    isCustomerVisible({
      active: true,
      managed: false,
      customerVisible: true,
      approvedVendors: 1,
    }),
    true,
  );
});

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
