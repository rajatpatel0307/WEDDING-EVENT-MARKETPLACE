import {
  LayoutDashboard,
  UserRound,
  CalendarHeart,
  Search,
  ShoppingBag,
  FileText,
  Heart,
  MessagesSquare,
  Bell,
  Wallet,
  Star,
  MapPin,
  Settings,
  House,
  Store,
  Package,
  BadgePercent,
} from "lucide-react";

export const customerNavigation = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["profile", "My Profile", UserRound],
  ["bookings", "My Bookings", ShoppingBag],
  ["quotations", "My Quotations", FileText],
  ["wishlist", "Wishlist", Heart],
  ["messages", "Messages", MessagesSquare],
  ["notifications", "Notifications", Bell],
  ["payments", "Payments", Wallet],
  ["reviews", "Reviews", Star],
  ["addresses", "Addresses", MapPin],
  ["settings", "Settings", Settings],
  ["cart", "My Cart", ShoppingBag],
  ["orders", "My Orders", ShoppingBag],
  ["legal", "Legal & Privacy", FileText],
];

export const marketplaceLinks = [
  ["Home", "/", House],
  ["Services", "/services", Search],
  ["Vendors", "/vendors", Store],
  ["Venues", "/venues", MapPin],
  ["Packages", "/packages", Package],
  ["Offers", "/offers", BadgePercent],
  ["My Events", "/customer/events", CalendarHeart],
];

