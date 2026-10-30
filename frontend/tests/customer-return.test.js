import test from "node:test";
import assert from "node:assert/strict";
import { customerLoginDestination } from "../src/routes/authNavigation.js";
test("customer login resumes a safe customer action while other roles keep their dashboards", () => {
  const requested =
    "/customer/services/734b9588-c47c-40eb-8c17-1797d65a2800?action=book";
  assert.equal(
    customerLoginDestination({ role: "Customer" }, requested),
    requested,
  );
  assert.equal(
    customerLoginDestination({ role: "Vendor" }, requested),
    "/vendor/dashboard",
  );
  assert.equal(
    customerLoginDestination({ role: "Admin" }, requested),
    "/admin/dashboard",
  );
  for (const unsafe of [
    "https://example.com",
    "//example.com",
    "/admin/dashboard",
    "/customer/\\example.com",
    "javascript:alert(1)",
    null,
  ])
    assert.equal(
      customerLoginDestination({ role: "Customer" }, unsafe),
      "/customer/dashboard",
    );
});
