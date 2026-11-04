export function destination(user) {
  if (user?.role === "Admin") return "/admin/dashboard";
  if (user?.role === "Vendor") return "/vendor/dashboard";
  return "/";
}
export function customerLoginDestination(user) {
  return destination(user);
}

export function canAccessVendorWorkspace(user) {
  return (
    user?.role === "Vendor" &&
    user.vendor?.verificationStatus === "Approved" &&
    user.vendor.active === true
  );
}

export function canEnterAccount(user) {
  return !!user && user.accountStatus === "Active";
}

export function canAccessVendorPage(user, pathname) {
  return (
    user?.role === "Vendor" &&
    (canAccessVendorWorkspace(user) ||
      ["/vendor/profile", "/vendor/verification"].includes(
        pathname.replace(/\/$/, ""),
      ))
  );
}
