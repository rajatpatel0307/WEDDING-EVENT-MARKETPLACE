import test from "node:test";
import assert from "node:assert/strict";
import {
  vendorNavigationFor,
  vendorTitle,
} from "../src/modules/vendor/navigation.js";

const vendor = {
  role: "Vendor",
  vendor: { active: true, verificationStatus: "Approved" },
};

test("approved vendors have one Business Profile entry and a distinct personal Account Profile", () => {
  const items = vendorNavigationFor(vendor).flatMap((group) => group.items);
  assert.equal(items.filter(([path]) => path === "business/profile").length, 1);
  assert.equal(
    items.some(([path]) => ["business/details", "settings"].includes(path)),
    false,
  );
  assert.equal(
    items.find(([path]) => path === "business/profile")[1],
    "Business Profile",
  );
  assert.equal(
    items.find(([path]) => path === "profile")[1],
    "Account Profile",
  );
  assert.equal(new Set(items.map(([path]) => path)).size, items.length);
  assert.equal(vendorTitle("business/profile"), "Business Profile");
});

test("consolidating business pages preserves the restricted navigation for unapproved vendors", () => {
  for (const verificationStatus of [
    "Pending",
    "Rejected",
    "UnderReview",
    "Suspended",
  ]) {
    const user = { ...vendor, vendor: { active: false, verificationStatus } };
    const paths = vendorNavigationFor(user).flatMap((group) =>
      group.items.map(([path]) => path),
    );
    assert.deepEqual(paths.sort(), ["profile", "verification"]);
  }
});
