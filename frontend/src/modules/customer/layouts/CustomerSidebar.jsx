
import {
  NavLink,
  Link,
} from "react-router-dom";

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
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";

// ============================================
// CUSTOMER NAVIGATION
// ============================================

const navigation = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["profile", "My Profile", UserRound],
  ["events", "My Events", CalendarHeart],
  ["discover", "Find Services", Search],
  ["bookings", "My Bookings", ShoppingBag],
  ["quotations", "My Quotations", FileText],
  ["wishlist", "Wishlist", Heart],
  ["messages", "Messages", MessagesSquare],
  ["notifications", "Notifications", Bell],
  ["payments", "Payments", Wallet],
  ["reviews", "Reviews", Star],
  ["addresses", "Addresses", MapPin],
  ["settings", "Settings", Settings],
];

// ============================================
// NAVIGATION GROUPS
// ============================================

const groups = [
  {
    label: "WORKSPACE",
    items: navigation.slice(0, 1),
  },
  {
    label: "PLAN YOUR CELEBRATION",
    items: navigation.slice(1, 7),
  },
  {
    label: "COMMUNICATION",
    items: navigation.slice(7, 9),
  },
  {
    label: "MY ACCOUNT",
    items: navigation.slice(9),
  },
];

// ============================================
// MARKETPLACE QUICK LINKS
// Visible when top navigation is hidden
// ============================================

const marketplaceLinks = [
  ["Home", "/", House],
  ["Services", "/customer/discover", Search],
  ["Vendors", "/customer/discover?type=vendors", Store],
  ["Venues", "/customer/discover?venue=1", MapPin],
  ["Packages", "/customer/discover?type=packages", Package],
  ["Offers", "/customer/discover?type=offers", BadgePercent],
  ["My Events", "/customer/events", CalendarHeart],
];

// ============================================
// CUSTOMER SIDEBAR
// ============================================

export default function CustomerSidebar({
  collapsed = false,
  mobileOpen = false,
  onToggleCollapse,
  onCloseMobile,
}) {
  const { user } = useAuth();

  // ============================================
  // COUNTERS
  // ============================================

  const counts = {
    wishlist: user?.wishlistCount ?? 0,
    messages: user?.unreadMessageCount ?? 0,
    notifications: user?.unreadNotificationCount ?? 0,
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <aside
      id="customer-sidebar"
      aria-label="Customer navigation"
      className={`
        fixed bottom-0 left-0
        top-[76px] z-50

        flex w-[280px]
        max-w-[88vw] flex-col

        border-r border-[#e6ebe1]
        bg-[#fffefa]
        shadow-xl

        transition-[width,transform]
        duration-200 ease-in-out

        lg:max-w-none
        lg:translate-x-0
        lg:shadow-none

        ${
          collapsed
            ? "lg:w-[76px]"
            : "lg:w-[280px]"
        }

        ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }
      `}
    >
      {/* ======================================
          SIDEBAR HEADER
      ====================================== */}

      <div
        className={`
          flex h-[65px] shrink-0
          items-center justify-between
          gap-2 border-b border-[#e6ebe1]
          px-5

          ${
            collapsed
              ? "lg:justify-center lg:px-2"
              : ""
          }
        `}
      >
        {/* Sidebar Title */}
        <strong
          className={`
            truncate text-[13px]
            font-semibold text-[#365b43]

            ${collapsed ? "lg:hidden" : ""}
          `}
        >
          Your workspace
        </strong>

        {/* Desktop Collapse Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          aria-controls="customer-sidebar"
          aria-expanded={!collapsed}
          className="
            hidden h-8 w-8 shrink-0
            items-center justify-center
            rounded-md border-0
            bg-transparent p-0
            text-[#87947e]

            transition-colors
            hover:bg-[#f1f5ec]
            hover:text-[#4b7049]

            lg:flex
          "
        >
          {collapsed ? (
            <PanelLeftOpen
              size={20}
              strokeWidth={1.7}
            />
          ) : (
            <PanelLeftClose
              size={20}
              strokeWidth={1.7}
            />
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="
            flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-md border-0
            bg-transparent p-0
            text-[#87947e]

            hover:bg-[#f1f5ec]
            lg:hidden
          "
        >
          <X size={20} />
        </button>
      </div>

      {/* ======================================
          NAVIGATION GROUPS
      ====================================== */}

      <nav
        aria-label="Customer pages"
        className={`
          min-h-0 flex-1
          overflow-y-auto overflow-x-hidden

          px-[15px] pb-6 pt-5

          [scrollbar-width:thin]
          [scrollbar-color:#ced8c7_transparent]

          ${collapsed ? "lg:px-[10px]" : ""}
        `}
      >
        {groups.map((group, groupIndex) => (
          <div
            key={group.label}
            className={`
              mb-[22px]

              ${
                collapsed && groupIndex > 0
                  ? "lg:border-t lg:border-[#edf2e5] lg:pt-[13px]"
                  : ""
              }
            `}
          >
            {/* Static Section Heading */}
            <h2
              className={`
                mb-2 px-3
                text-[10px] font-medium
                uppercase tracking-[1.4px]
                text-[#a4af9b]

                ${collapsed ? "lg:hidden" : ""}
              `}
            >
              {group.label}
            </h2>

            <div className="flex flex-col gap-[2px]">
              {group.items.map(
                ([path, label, Icon]) => {
                  const count = Number(counts[path] ?? 0);
                  const showCount = count > 0;

                  return (
                    <NavLink
                      key={path}
                      to={`/customer/${path}`}
                      aria-label={
                        showCount
                          ? `${label}, ${count} items`
                          : label
                      }
                      title={
                        collapsed ? label : undefined
                      }
                      onClick={onCloseMobile}
                      className={({ isActive }) => `
                        group relative flex
                        min-h-[43px] w-full
                        items-center gap-[10px]

                        rounded-md px-3 py-[9px]
                        text-[12px] leading-[1.5]
                        no-underline

                        transition-colors duration-200

                        ${
                          isActive
                            ? "bg-[#eaf1e3] font-semibold text-[#486d3c]"
                            : "font-normal text-[#87947e] hover:bg-[#f1f5ec] hover:text-[#4b7049]"
                        }

                        ${
                          collapsed
                            ? "lg:justify-center lg:gap-0 lg:px-[10px]"
                            : ""
                        }

                        focus-visible:outline-2
                        focus-visible:outline-[#8aaf94]
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          {/* Active Indicator */}
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="
                                absolute -left-[15px]
                                top-1/2 h-5 w-[3px]
                                -translate-y-1/2
                                rounded-r-[3px]
                                bg-[#63894d]
                              "
                            />
                          )}

                          {/* Icon */}
                          <Icon
                            size={19}
                            strokeWidth={1.7}
                            className={`
                              shrink-0

                              ${
                                isActive
                                  ? "text-[#486d3c]"
                                  : "text-[#87947e] group-hover:text-[#4b7049]"
                              }
                            `}
                          />

                          {/* Label */}
                          <span
                            className={`
                              min-w-0 flex-1 truncate

                              ${collapsed ? "lg:hidden" : ""}
                            `}
                          >
                            {label}
                          </span>

                          {/* Counter */}
                          {showCount && (
                            <>
                              <span
                                className={`
                                  ml-auto flex min-w-[21px]
                                  items-center justify-center
                                  rounded bg-[#dce9d0]
                                  px-[5px] py-[2px]

                                  text-[9px] font-semibold
                                  text-[#486d3c]

                                  ${collapsed ? "lg:hidden" : ""}
                                `}
                              >
                                {count > 99 ? "99+" : count}
                              </span>

                              {collapsed && (
                                <span
                                  aria-hidden="true"
                                  className="
                                    absolute right-1 top-1
                                    hidden h-2 w-2
                                    rounded-full bg-[#63894d]
                                    lg:block
                                  "
                                />
                              )}
                            </>
                          )}

                          {/* Dashboard Dot */}
                          {path === "dashboard" && isActive && (
                            <span
                              className={`
                                h-1.5 w-1.5
                                rounded-full bg-[#63894d]

                                ${collapsed ? "lg:hidden" : ""}
                              `}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                }
              )}
            </div>
          </div>
        ))}

        {/* ======================================
            MARKETPLACE SHORTCUTS
            Shown when header links are hidden
        ====================================== */}

        <div
          className={`
            mb-5 border-t border-[#edf2e5]
            pt-5 xl:hidden
          `}
        >
          <h2
            className={`
              mb-2 px-3
              text-[10px] font-medium
              uppercase tracking-[1.4px]
              text-[#a4af9b]

              ${collapsed ? "lg:hidden" : ""}
            `}
          >
            EXPLORE MARKETPLACE
          </h2>

          <div className="flex flex-col gap-[2px]">
            {marketplaceLinks.map(
              ([label, path, Icon]) => (
                <Link
                  key={label}
                  to={path}
                  title={
                    collapsed ? label : undefined
                  }
                  aria-label={label}
                  onClick={onCloseMobile}
                  className={`
                    group flex min-h-[43px]
                    items-center gap-[10px]
                    rounded-md px-3 py-[9px]

                    text-[12px] text-[#87947e]
                    no-underline
                    transition-colors

                    hover:bg-[#f1f5ec]
                    hover:text-[#4b7049]

                    ${
                      collapsed
                        ? "lg:justify-center lg:gap-0 lg:px-[10px]"
                        : ""
                    }
                  `}
                >
                  <Icon
                    size={19}
                    strokeWidth={1.7}
                    className="shrink-0"
                  />

                  <span
                    className={`
                      truncate

                      ${collapsed ? "lg:hidden" : ""}
                    `}
                  >
                    {label}
                  </span>
                </Link>
              )
            )}
          </div>
        </div>
      </nav>
    </aside>
  );
}
