import { canAccessVendorWorkspace } from "../../routes/authNavigation";
import {
  LayoutDashboard,
  Store,
  MapPin,
  Files,
  ShieldCheck,
  BriefcaseBusiness,
  PlusCircle,
  Package,
  ListChecks,
  CalendarDays,
  ReceiptText,
  Users,
  IndianRupee,
  Wallet,
  CreditCard,
  Star,
  BadgePercent,
  TicketPercent,
  MessagesSquare,
  Bell,
  ChartNoAxesCombined,
  ContactRound,
} from "lucide-react";
export const vendorNavigation = [
  { label: "WORKSPACE", items: [["dashboard", "Dashboard", LayoutDashboard]] },
  {
    label: "BUSINESS",
    items: [
      ["business/profile", "Business Profile", Store],
      ["business/details", "Vendor Details", ContactRound],
      ["locations", "Locations", MapPin],
      ["documents", "Documents", Files],
      ["media", "Media Library", Files],
      ["verification", "Verification", ShieldCheck],
    ],
  },
  {
    label: "SERVICES",
    items: [
      ["services", "All Services", BriefcaseBusiness],
      ["services/add", "Add Service", PlusCircle],
      ["packages", "Service Packages", Package],
      ["items", "Service Items", ListChecks],
    ],
  },
  {
    label: "AVAILABILITY",
    items: [["calendar", "Calendar", CalendarDays]],
  },
  {
    label: "BOOKINGS",
    items: [["bookings/all", "All Bookings", ListChecks]],
  },
  {
    label: "QUOTATIONS",
    items: [["quotations/all", "All Quotations", ReceiptText]],
  },
  { label: "CUSTOMERS", items: [["customers", "Customers", Users]] },
  {
    label: "ACCOUNT",
    items: [
      ["profile", "Profile", ContactRound],
      ["settings", "Settings", ContactRound],
      ["legal", "Legal & Privacy", Files],
    ],
  },
  {
    label: "PAYMENTS",
    items: [
      ["earnings", "Earnings", IndianRupee],
      ["payouts", "Payouts", Wallet],
      ["transactions", "Transactions", CreditCard],
    ],
  },
  {
    label: "GROW YOUR BUSINESS",
    items: [
      ["reviews", "Reviews", Star],
      ["offers", "Offers", BadgePercent],
      ["coupons", "Coupons", TicketPercent],
      ["messages", "Messages", MessagesSquare],
      ["notifications", "Notifications", Bell],
      ["analytics", "Analytics", ChartNoAxesCombined],
    ],
  },
];
export function vendorTitle(path) {
  return (
    vendorNavigation
      .flatMap((g) => g.items)
      .find(([key]) => key === path)?.[1] || "Vendor workspace"
  );
}

export function vendorNavigationFor(user) {
  if (canAccessVendorWorkspace(user)) return vendorNavigation;
  return vendorNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter(([path]) =>
        ["profile", "verification"].includes(path),
      ),
    }))
    .filter((group) => group.items.length);
}
