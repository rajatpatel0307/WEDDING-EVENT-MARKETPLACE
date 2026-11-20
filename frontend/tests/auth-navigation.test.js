import test from "node:test";
import assert from "node:assert/strict";
import { destination, emailVerificationDestination, canAccessVendorWorkspace, canEnterAccount, canAccessVendorPage } from "../src/routes/authNavigation.js";

test("email verification sends authenticated users to their role-specific page", () => {
  assert.equal(emailVerificationDestination({ role: "Customer" }), "/");
  assert.equal(emailVerificationDestination({ role: "Admin" }), "/admin/dashboard");
  for (const verificationStatus of ["Pending", "UnderReview", "Approved", "Rejected", "Suspended"]) {
    const vendor = { role: "Vendor", accountStatus: "Active", vendor: { verificationStatus, active: false } };
    const path = emailVerificationDestination(vendor);
    assert.equal(path, "/vendor/verification");
    assert.equal(canEnterAccount(vendor), true);
    assert.equal(canAccessVendorPage(vendor, path), true);
    assert.equal(canAccessVendorWorkspace(vendor), false);
  }
});

test("vendor login always lands on the vendor dashboard", () => {
  for (const verificationStatus of ["Pending", "UnderReview", "Approved", "Rejected", "Suspended"]) {
    for (const active of [true, false]) {
      assert.equal(destination({ role: "Vendor", vendor: { verificationStatus, active } }), "/vendor/dashboard");
    }
  }
  assert.equal(destination({ role: "Vendor" }), "/vendor/dashboard");
});

test("dashboard tools still require an approved active vendor", () => {
  assert.equal(canAccessVendorWorkspace({ role: "Vendor", vendor: { verificationStatus: "Approved", active: true } }), true);
  for (const verificationStatus of ["Pending", "UnderReview", "Rejected", "Suspended"]) {
    assert.equal(canAccessVendorWorkspace({ role: "Vendor", vendor: { verificationStatus, active: true } }), false);
  }
  assert.equal(canAccessVendorWorkspace({ role: "Vendor", vendor: { verificationStatus: "Approved", active: false } }), false);
  assert.equal(canAccessVendorWorkspace({ role: "Vendor" }), false);
  assert.equal(canAccessVendorWorkspace(null), false);
  assert.equal(canAccessVendorWorkspace({ role: "Customer", vendor: { verificationStatus: "Approved", active: true } }), false);
});

test("customer and administrator login destinations stay role-specific", () => {
  assert.equal(destination({ role: "Customer" }), "/");
  assert.equal(destination({ role: "Admin" }), "/admin/dashboard");
});
