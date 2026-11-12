import test from "node:test";
import assert from "node:assert/strict";
import { canEnterAccount, canAccessVendorPage } from "../src/routes/authNavigation.js";
import { readyToSubmit, verificationStepErrors } from "../src/modules/vendor/services/onboarding.validation.js";

const requiredDocs = ["PAN", "Identity Proof", "Address Proof"].map(type => ({ type, status: "Pending" }));

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
    adminLocationId: "734b9588-c47c-40eb-8c17-1797d65a2800",
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
  const documents = requiredDocs;
  assert.ok(readyToSubmit(fields, documents));
  assert.equal(readyToSubmit({ ...fields, adminLocationId: "" }, documents), false);
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


test("unapproved vendors can only open profile and verification, including direct URLs", () => {
  const restricted = ["dashboard", "services", "services/add", "business/profile", "settings", "locations", "documents", "messages", "notifications", "media", "bookings/all", "earnings", "legal", "profile/other", "verification/other"];
  for (const verificationStatus of ["Pending", "UnderReview", "Rejected", "Suspended", undefined]) {
    const user = { role: "Vendor", vendor: { verificationStatus, active: false } };
    for (const page of ["profile", "verification", "verification/"]) assert.equal(canAccessVendorPage(user, `/vendor/${page}`), true);
    for (const page of restricted) assert.equal(canAccessVendorPage(user, `/vendor/${page}`), false);
  }
  for (const role of ["Admin", "Customer", "Employee"]) assert.equal(canAccessVendorPage({ role }, "/vendor/verification"), false);
  assert.equal(canAccessVendorPage(null, "/vendor/profile"), false);
  const vendor = { role: "Vendor", vendor: { verificationStatus: "Approved", active: false } };
  assert.equal(canAccessVendorPage(vendor, "/vendor/services"), false);
  vendor.vendor.active = true;
  for (const page of [...restricted, "verification", "profile"]) assert.equal(canAccessVendorPage(vendor, `/vendor/${page}`), true);
});


test("verification steps validate their required fields before moving forward", () => {
  const fields = {
    adminLocationId: "734b9588-c47c-40eb-8c17-1797d65a2800",
    businessName: "Studio", businessDescription: "Wedding photography",
    businessEmail: "studio@example.com", businessPhone: "+919876543210", categories: ["Photography"],
    location: { address: "Main Road", city: "Pune", state: "Maharashtra", country: "India", postalCode: "411001" },
  };
  for (let step = 0; step < 4; step++) assert.deepEqual(verificationStepErrors(step, fields, requiredDocs), []);
  assert.deepEqual(verificationStepErrors(2, { ...fields, adminLocationId: "" }), ["Select an active registered business / service location."]);
  assert.equal(verificationStepErrors(0, { ...fields, businessName: " ", businessDescription: "short", businessEmail: "bad-email", businessPhone: "123" }).length, 4);
  assert.deepEqual(verificationStepErrors(1, { ...fields, categories: [] }), ["Select at least one service category."]);
  for (const [key, label] of [["address", "Street address"], ["city", "City"], ["state", "State"], ["country", "Country"], ["postalCode", "Postal code"]]) {
    assert.deepEqual(verificationStepErrors(2, { ...fields, location: { ...fields.location, [key]: " " } }), [`${label} is required.`]);
  }
  assert.equal(verificationStepErrors(2, { ...fields, location: { ...fields.location, latitude: 91, longitude: -181 } }).length, 2);
  assert.deepEqual(verificationStepErrors(3, fields, []), ["Upload a valid PAN document.", "Upload a valid Identity Proof document.", "Upload a valid Address Proof document."]);
  assert.deepEqual(verificationStepErrors(3, fields, [...requiredDocs, { type: "GST", status: "Rejected" }]), ["Replace or remove rejected documents before submitting."]);
  // Optional business identifiers and coordinates are not needed to advance.
  assert.deepEqual(verificationStepErrors(0, { ...fields, gst: "", pan: "" }), []);
  assert.deepEqual(verificationStepErrors(2, { ...fields, location: { ...fields.location, latitude: null, longitude: null } }), []);
});


test("missing required document types cannot be replaced by duplicates or optional documents", () => {
  for (const type of ["PAN", "Identity Proof", "Address Proof"]) {
    const documents = [...requiredDocs.filter(doc => doc.type !== type), { type: "GST", status: "Approved" }];
    assert.deepEqual(verificationStepErrors(3, {}, documents), [`Upload a valid ${type} document.`]);
  }
  assert.equal(verificationStepErrors(3, {}, [requiredDocs[0], requiredDocs[0], requiredDocs[0]]).length, 2);
});
