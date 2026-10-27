export const vendorChangedEvent = "marrynest:vendor-verification-changed";
export function vendorChanged(data) {
  window.dispatchEvent(new CustomEvent(vendorChangedEvent, { detail: data }));
}
export const rejectionReasons = [
  "Invalid business documents",
  "Incomplete documents",
  "Invalid contact information",
  "Business information mismatch",
  "Duplicate vendor",
  "Unsupported service",
  "Verification failed",
  "Other",
];
export const decisionActions = {
  Approved: "approve",
  Rejected: "reject",
  Suspended: "suspend",
  UnderReview: "start-review",
  Reapply: "reapply",
};
export function canDecide(status, action) {
  return (
    {
      Pending: ["UnderReview", "Approved", "Rejected"],
      UnderReview: ["Approved", "Rejected"],
      Approved: ["Suspended"],
      Suspended: ["Approved"],
      Rejected: ["Reapply"],
    }[status]?.includes(action) || false
  );
}
