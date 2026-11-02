import test from "node:test";
import assert from "node:assert/strict";
import { canEnterAccount } from "../src/routes/authNavigation.js";
import { readyToSubmit } from "../src/modules/vendor/services/onboarding.validation.js";

test("vendors verify email before dashboard access just like buyers and admins", () => {
  assert.equal(
    canEnterAccount({ role: "Vendor", accountStatus: "Unverified" }),
    false,
  );
  for (const role of ["Customer", "Admin"])
    assert.equal(canEnterAccount({ role, accountStatus: "Unverified" }), false);
  for (const role of ["Customer", "Vendor", "Admin"]) {
    assert.equal(canEnterAccount({ role, accountStatus: "Active" }), true);
    for (const accountStatus of ["Inactive", "Blocked"])
      assert.equal(canEnterAccount({ role, accountStatus }), false);
  }
  assert.equal(canEnterAccount(null), false);
});

test("verification submission requires all business fields, categories, location and valid documents", () => {
  const fields = {
    businessName: "Studio",
    businessDescription: "Wedding photography",
    businessEmail: "studio@example.com",
    businessPhone: "+919876543210",
    categories: ["Photography"],
    location: {
      address: "Main Road",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      postalCode: "411001",
    },
  };
  const documents = [{ status: "Pending" }];
  assert.ok(readyToSubmit(fields, documents));
  for (const name of [
    "businessName",
    "businessDescription",
    "businessEmail",
    "businessPhone",
  ])
    assert.equal(!!readyToSubmit({ ...fields, [name]: "" }, documents), false);
  assert.equal(
    !!readyToSubmit({ ...fields, categories: [] }, documents),
    false,
  );
  for (const name of Object.keys(fields.location))
    assert.equal(
      !!readyToSubmit(
        { ...fields, location: { ...fields.location, [name]: " " } },
        documents,
      ),
      false,
    );
  assert.equal(!!readyToSubmit(fields, []), false);
  assert.equal(!!readyToSubmit(fields, [{ status: "Rejected" }]), false);
  assert.equal(
    !!readyToSubmit(fields, [{ status: "Pending" }, { status: "Rejected" }]),
    false,
  );
});
