export const publicNavigation = [
  ["Home", "/"],
  ["Services", "/services"],
  ["Venues", "/venues"],
  ["Vendors", "/vendors"],
  ["Packages", "/packages"],
  ["Offers", "/offers"],
];
export function navigationFor(user) {
  if (!user || user.accountStatus !== "Active") return publicNavigation;
  if (user.role === "Admin")
    return [
      "Dashboard",
      "Users",
      "Vendors",
      "Bookings",
      "Services",
      "Payments",
      "Reports",
    ].map((name) => [name, `/admin/${name.toLowerCase()}`]);
  if (user.role === "Vendor")
    return user.vendor?.verificationStatus === "Approved"
      ? [
          "Dashboard",
          "My Services",
          "Bookings",
          "Quotes",
          "Messages",
          "Availability",
          "Reviews",
        ].map((name, i) => [
          name,
          `/vendor/${["dashboard", "services", "bookings", "quotations", "messages", "availability", "reviews"][i]}`,
        ])
      : publicNavigation;
  return [...publicNavigation, ["Bookings", "/customer/bookings"]];
}
export function profileFor(user) {
  const role = user?.role?.toLowerCase();
  if (role === "vendor" && user.vendor?.verificationStatus !== "Approved")
    return [
      [
        "Application status",
        `/vendor/${{ Rejected: "rejected", Suspended: "suspended" }[user.vendor?.verificationStatus] || "pending"}`,
      ],
      ["My profile", "/vendor/profile"],
      ["Settings", "/auth/change-password"],
    ];
  const items =
    role === "admin"
      ? [
          ["Admin Dashboard", "dashboard"],
          ["Profile", "profile"],
          ["Notifications", "notifications"],
        ]
      : role === "vendor"
        ? [
            ["Vendor Dashboard", "dashboard"],
            ["My Business", "profile"],
            ["My Services", "services"],
            ["Bookings", "bookings"],
            ["Quotations", "quotations"],
            ["Messages", "messages"],
            ["Notifications", "notifications"],
          ]
        : [
            ["My Dashboard", "dashboard"],
            ["My Profile", "profile"],
            ["My Bookings", "bookings"],
            ["Wishlist", "wishlist"],
            ["Messages", "messages"],
            ["Notifications", "notifications"],
          ];
  return [
    ...items.map(([name, path]) => [name, `/${role}/${path}`]),
    ["Settings", "/auth/change-password"],
  ];
}
export const cities = [
  "Lucknow",
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Jaipur",
  "Udaipur",
  "Goa",
  "Hyderabad",
];
