import { activeRegisteredLocation } from "../addresses/location-policy.js";

// Read current publication requirements without changing the package's own status.
// These fields mirror public package discovery, including the registered location.
export const packageVisibilityFields = `s.ApprovalStatus AS serviceStatus,
  s.IsActive AS serviceActive,c.IsActive AS categoryActive,
  v.IsActive AS vendorActive,v.VerificationStatus AS vendorStatus,
  u.IsActive AS accountActive,u.IsBlocked AS accountBlocked,u.IsEmailVerified AS emailVerified,
  CASE WHEN ${activeRegisteredLocation} THEN 1 ELSE 0 END AS locationActive,
  t.IsFeatured AS featured`;

export function packageVisibility(row) {
  const reasons = [];
  const service = `Parent service “${row.service}”`;
  if (!row.active) reasons.push("Package is inactive.");
  if (row.serviceStatus !== "Approved")
    reasons.push(`${service} is ${row.serviceStatus?.toLowerCase() || "not approved"}.`);
  else if (!row.serviceActive) reasons.push(`${service} is inactive.`);
  if (!row.categoryActive) reasons.push("Service category is inactive.");
  if (row.vendorStatus !== "Approved") reasons.push("Vendor is not approved.");
  else if (!row.vendorActive) reasons.push("Vendor is inactive.");
  if (!row.accountActive) reasons.push("Vendor account is inactive.");
  if (row.accountBlocked) reasons.push("Vendor account is blocked.");
  if (!row.emailVerified) reasons.push("Vendor email is not verified.");
  if (!row.locationActive) reasons.push("Vendor registered location is missing or inactive.");
  return {
    customerVisible: reasons.length === 0,
    visibilityReasons: reasons,
    homepageEligible: reasons.length === 0 && !!row.featured,
  };
}
