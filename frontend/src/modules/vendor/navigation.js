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
  ShoppingBag,
  Clock3,
  CheckCircle2,
  XCircle,
  ReceiptText,
  Send,
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
      ["verification", "Verification Status", ShieldCheck],
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
    items: [
      ["bookings/requests", "Booking Requests", ShoppingBag],
      ["bookings/upcoming", "Upcoming Bookings", CalendarDays],
      ["bookings/active", "Active Bookings", Clock3],
      ["bookings/completed", "Completed Bookings", CheckCircle2],
      ["bookings/cancelled", "Cancelled Bookings", XCircle],
      ["bookings/cancellations", "Cancellation Requests", XCircle],
      ["bookings/reschedules", "Reschedule Requests", CalendarDays],
    ],
  },
  {
    label: "QUOTATIONS",
    items: [
      ["requests", "Quotation Requests", ReceiptText],
      ["quotations/new", "Create Quotation", PlusCircle],
      ["quotations/drafts", "Draft Quotations", ReceiptText],
      ["quotations/sent", "Sent Quotations", Send],
      ["quotations/accepted", "Accepted Quotations", CheckCircle2],
      ["quotations/rejected", "Rejected Quotations", XCircle],
    ],
  },
  { label: "CUSTOMERS", items: [["customers", "Customers", Users]] },
  { label: "ACCOUNT", items: [["settings", "Settings", ContactRound]] },
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
