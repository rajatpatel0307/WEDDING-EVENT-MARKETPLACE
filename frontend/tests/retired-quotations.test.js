import test from "node:test";
import assert from "node:assert/strict";
import { customerNavigation } from "../src/modules/customer/navigation.js";
import { vendorNavigation } from "../src/modules/vendor/navigation.js";
import { adminNavigation } from "../src/modules/admin/navigation.js";
import { navigationFor, profileFor } from "../src/components/layout/navigation.js";

test("every role menu excludes quotations and remaining vendor labels still match their destinations", () => {
  const user = { role: "Vendor", accountStatus: "Active", vendor: { active: true, verificationStatus: "Approved" } };
  for (const menu of [customerNavigation, vendorNavigation, adminNavigation, navigationFor(user), profileFor(user)]) {
    assert.doesNotMatch(JSON.stringify(menu), /quotation|quotes/i);
    assert.ok(menu.every(Boolean), "removed groups must not leave empty array slots");
    assert.equal(Object.keys(menu).length, menu.length);
  }
  assert.deepEqual(navigationFor(user).filter(([name]) => ["Messages", "Availability", "Reviews"].includes(name)), [
    ["Messages", "/vendor/messages"], ["Availability", "/vendor/availability"], ["Reviews", "/vendor/reviews"],
  ]);
});
