export function destination(user) {
  if (user?.role === "Admin") return "/admin/dashboard";
  if (user?.role === "Vendor") return "/vendor/dashboard";
  return "/customer/dashboard";
}
export function customerLoginDestination(user, requested) {
  return user?.role === "Customer" &&
    typeof requested === "string" &&
    /^\/customer\/(?:services|vendors|bookings|events|wishlist|discover|messages|quotations|payments)(?:[/?]|$)/.test(
      requested,
    ) &&
    !requested.includes("\\")
    ? requested
    : destination(user);
}

export function canAccessVendorWorkspace(user) {
  return (
    user?.role === "Vendor" &&
    user.vendor?.verificationStatus === "Approved" &&
    user.vendor.active === true
  );
}
