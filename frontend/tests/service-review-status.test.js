import test from "node:test";
import assert from "node:assert/strict";
import { reviewState, serviceDecision, statusLabel, statusTone } from "../src/modules/admin/service-review.status.js";

const base = { VerificationStatus: "Approved", VendorActive: true, ApprovalStatus: "UnderReview", vendor: { OwnerActive: true, OwnerBlocked: false, OwnerEmailVerified: true } };

test("review statuses distinguish service approval, vendor verification and in-progress review", () => {
  assert.equal(statusLabel("Pending"), "Pending approval");
  assert.equal(statusLabel("Pending", "vendor"), "Pending verification");
  assert.equal(statusLabel("UnderReview"), "Under review");
  assert.equal(statusTone("UnderReview"), "blue");
  assert.equal(statusTone("Approved"), "green");
  assert.equal(statusTone("Rejected"), "red");
  assert.equal(statusTone("Suspended"), "red");
  assert.equal(statusTone("Draft"), "gray");
});

test("vendor rejection never changes the independent service decision", () => {
  const result = reviewState({ ...base, VerificationStatus: "Rejected", VendorActive: false, VendorRejectionReason: "Business certificate expired", ApprovalStatus: "Approved" });
  assert.equal(result.vendorStatus, "Rejected");
  assert.equal(result.serviceStatus, "Approved");
  assert.equal(result.vendorReason, "Business certificate expired");
  assert.equal(result.canApprove, false);
  assert.match(result.blockers[0], /vendor verification is rejected/i);
});

test("approval eligibility follows vendor activation and owner account requirements", () => {
  assert.equal(reviewState(base).canApprove, true);
  assert.equal(reviewState({ ...base, VendorActive: false }).canApprove, false);
  assert.equal(reviewState({ ...base, VerificationStatus: "UnderReview" }).canApprove, false);
  for (const vendor of [{ OwnerActive: false }, { OwnerBlocked: true }, { OwnerEmailVerified: false }]) {
    assert.equal(reviewState({ ...base, vendor }).canApprove, false);
  }
});

test("documents report rejection first and count pending, under-review and unknown states separately", () => {
  const result = reviewState({ ...base, documents: ["Approved", "Verified", "Pending", "UnderReview", "Rejected", null].map((VerificationStatus) => ({ VerificationStatus })) });
  assert.equal(result.documentStatus, "Rejected");
  assert.deepEqual(result.documentCounts, { approved: 2, pending: 1, underReview: 1, rejected: 1, unknown: 1 });
  assert.equal(reviewState({ ...base, documents: [{ VerificationStatus: "UnderReview" }] }).documentStatus, "UnderReview");
  assert.equal(reviewState({ ...base, documents: [{ VerificationStatus: "Pending" }] }).documentStatus, "Pending");
});

test("missing or unknown documents are never represented as approved", () => {
  assert.equal(reviewState(base).documentStatus, "Missing");
  assert.equal(reviewState({ ...base, documents: [{}] }).documentStatus, "Unknown");
  assert.equal(reviewState({ ...base, documents: [{ VerificationStatus: "Approved" }] }).documentStatus, "Approved");
});

test("package enablement remains independent from the parent service review", () => {
  for (const ApprovalStatus of ["Pending", "UnderReview", "Approved", "Rejected"]) {
    const result = reviewState({ ...base, ApprovalStatus, packages: [{ IsActive: true }, { IsActive: 0 }, { IsActive: 1 }] });
    assert.equal(result.packageCount, 3);
    assert.equal(result.enabledPackages, 2);
    assert.equal(result.serviceStatus, ApprovalStatus);
  }
});

test("current service decisions display their own reasons and do not reuse stale rejection notes", () => {
  const data = { ApprovalStatus: "Rejected", RejectionReason: "Invalid price", AdminNote: "Please correct the amount", RejectedAt: "2026-11-12T10:00:00Z" };
  assert.equal(serviceDecision(data).reason, "Invalid price");
  assert.equal(serviceDecision(data).note, "Please correct the amount");
  assert.equal(serviceDecision({ ...data, ApprovalStatus: "Approved" }), null);
  const suspended = serviceDecision({ ...data, ApprovalStatus: "Suspended", history: [{ action: "SERVICE_SUSPEND", details: JSON.stringify({ notes: "Paused after inspection" }), timestamp: "2026-11-13T10:00:00Z" }] });
  assert.equal(suspended.note, "Paused after inspection");
  assert.equal(suspended.reason, undefined);
  assert.doesNotThrow(() => serviceDecision({ ApprovalStatus: "Suspended", history: [{ action: "SERVICE_SUSPEND", details: "legacy payload" }] }));
});
