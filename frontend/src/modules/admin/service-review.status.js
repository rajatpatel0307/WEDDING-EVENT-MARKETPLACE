export function statusLabel(status, entity = "service") {
  if (status === "Pending") return entity === "service" ? "Pending approval" : "Pending verification";
  return { UnderReview: "Under review", Verified: "Verified", Missing: "Not provided", Unknown: "Not available", Enabled: "Enabled", Disabled: "Disabled" }[status] || status || "Not available";
}

export function statusTone(status) {
  if (["Approved", "Verified", "Enabled"].includes(status)) return "green";
  if (["Rejected", "Suspended"].includes(status)) return "red";
  if (status === "UnderReview") return "blue";
  if (["Pending", "Missing"].includes(status)) return "amber";
  return "gray";
}

export function reviewState(data) {
  const vendorStatus = data.VerificationStatus || data.vendor?.VerificationStatus || "Unknown";
  const serviceStatus = data.ApprovalStatus || "Unknown";
  const blockers = [];
  if (vendorStatus !== "Approved") blockers.push(`Vendor verification is ${statusLabel(vendorStatus, "vendor").toLowerCase()}. The vendor must be approved before service approval or activation.`);
  else if (!data.VendorActive) blockers.push("The vendor is inactive. Activate the vendor before approving or activating this service.");
  const owner = data.vendor || {};
  if (owner.OwnerActive != null && !owner.OwnerActive) blockers.push("The vendor owner account is inactive.");
  if (owner.OwnerBlocked) blockers.push("The vendor owner account is blocked.");
  if (owner.OwnerEmailVerified != null && !owner.OwnerEmailVerified) blockers.push("The vendor owner must verify their email address.");
  const documents = data.documents || [];
  const documentCounts = { approved: 0, rejected: 0, pending: 0, underReview: 0, unknown: 0 };
  for (const doc of documents) {
    if (["Approved", "Verified"].includes(doc.VerificationStatus)) documentCounts.approved++;
    else if (doc.VerificationStatus === "Rejected") documentCounts.rejected++;
    else if (doc.VerificationStatus === "Pending") documentCounts.pending++;
    else if (doc.VerificationStatus === "UnderReview") documentCounts.underReview++;
    else documentCounts.unknown++;
  }
  const documentStatus = !documents.length ? "Missing" : documentCounts.rejected ? "Rejected" : documentCounts.underReview ? "UnderReview" : documentCounts.pending ? "Pending" : documentCounts.unknown ? "Unknown" : "Approved";
  const packages = data.packages || [];
  return {
    vendorStatus, serviceStatus, blockers, documentStatus, documentCounts,
    vendorReason: data.VendorRejectionReason || owner.VerificationRemarks || null,
    packageCount: packages.length,
    enabledPackages: packages.filter((item) => !!item.IsActive).length,
    canApprove: blockers.length === 0,
  };
}

export function serviceDecision(data) {
  if (data.ApprovalStatus === "Rejected") return { title: "Service rejected", reason: data.RejectionReason, note: data.AdminNote, timestamp: data.RejectedAt };
  if (data.ApprovalStatus === "Suspended") {
    const event = [...(data.history || [])].reverse().find((row) => row.action === "SERVICE_SUSPEND");
    let details = {};
    try { details = JSON.parse(event?.details || "{}"); } catch { /* Historical audit data may be incomplete. */ }
    return { title: "Service suspended", reason: details.reason, note: details.notes || details.note, timestamp: event?.timestamp };
  }
  return null;
}
