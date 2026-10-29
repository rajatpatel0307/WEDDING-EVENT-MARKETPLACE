export function notificationLink(item) {
  const type = item.referenceType?.replace(/^Admin/, "");
  const paths = {
    Booking: "bookings",
    Vendor: "vendors",
    Vendors: "vendors",
    Customer: "customers",
    Service: "services",
    Services: "services",
    Payments: "finance/payments",
    Payment: "finance/payments",
    Refunds: "finance/refunds",
    VendorPayouts: "finance/payouts",
    Quotations: "finance/quotations",
  };
  return paths[type] &&
    /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(item.referenceId || "")
    ? `/admin/${paths[type]}/${item.referenceId}`
    : "/admin/dashboard";
}
