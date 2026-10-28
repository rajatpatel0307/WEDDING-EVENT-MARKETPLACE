import test from "node:test";
import assert from "node:assert/strict";
import { editorDocument } from "../src/modules/admin/service-editor.document.js";
test("admin edit payload preserves nested pricing rules but excludes approval and ownership overrides", () => {
  const result = editorDocument({
    VendorId: "vendor",
    ServiceName: "Garden",
    CategoryId: 1,
    SubCategoryId: null,
    Description: "Description",
    BasePrice: 120,
    ServiceSlug: "garden",
    UpdatedAt: "2026-10-28T10:00:00.000Z",
    attributes: { indoor: true },
    document: {
      status: "Approved",
      ApprovedBy: "injected",
      pricing: { basePrice: 100, taxRate: 18, weekendPrice: 120 },
      policies: { cancellation: "30 days" },
    },
  });
  assert.equal(result.pricing.taxRate, 18);
  assert.equal(result.pricing.weekendPrice, 120);
  assert.equal(result.status, undefined);
  assert.equal(result.ApprovedBy, undefined);
  assert.equal(result.vendorId, "vendor");
  assert.equal(result.expectedUpdatedAt, "2026-10-28T10:00:00.000Z");
  assert.equal(result.policies.cancellation, "30 days");
});
test("legacy service editing preserves the existing base price", () => {
  const result = editorDocument({
    VendorId: "vendor",
    ServiceName: "Garden",
    CategoryId: 1,
    BasePrice: 25000,
    ServiceSlug: "garden",
    UpdatedAt: "2026-10-28T10:00:00.000Z",
  });
  assert.equal(result.pricing.basePrice, 25000);
  assert.equal(result.pricing.taxRate, 0);
});
