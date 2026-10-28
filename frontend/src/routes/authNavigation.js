export function destination(user) {
  if (user?.role === "Admin") return "/admin/dashboard";
  if (user?.role === "Vendor") return "/vendor/dashboard";
  return "/customer/dashboard";
}

export function canAccessVendorWorkspace(user) {
  return (
    user?.role === "Vendor" &&
    user.vendor?.verificationStatus === "Approved" &&
    user.vendor.active === true
  );
}
