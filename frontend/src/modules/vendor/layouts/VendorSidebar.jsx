
import { useMemo } from "react";

import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import { vendorNavigation } from "../navigation";

import fullLogo from "../../../assets/MarryNest Wedding Logo.png";
import compactLogo from "../../../assets/small logo.png";

// ============================================
// VENDOR SIDEBAR
// ============================================

export default function VendorSidebar({
  collapsed = false,
  mobile = false,
  onToggleCollapse,
  onCloseMobile,
}) {
  const { user } = useAuth();
  const location = useLocation();

  // ============================================
  // ACTIVE NAVIGATION
  // ============================================

  const current =
    location.pathname.replace(/^\/vendor\/?/, "") ||
    "dashboard";

  const activePath = useMemo(() => {
    const paths = vendorNavigation.flatMap((group) =>
      group.items.map(([path]) => path)
    );

    const params = new URLSearchParams(location.search);

    // Check routes containing query parameters
    const queryMatch = paths.find((path) => {
      if (!path.includes("?")) return false;

      const [pathname, search] = path.split("?");

      if (pathname !== current) return false;

      return Array.from(
        new URLSearchParams(search)
      ).every(
        ([key, value]) => params.get(key) === value
      );
    });

    if (queryMatch) return queryMatch;

    // Check exact route
    if (paths.includes(current)) return current;

    // Match nested routes
    return paths
      .filter(
        (path) =>
          !path.includes("?") &&
          current.startsWith(`${path}/`)
      )
      .sort((a, b) => b.length - a.length)[0];
  }, [current, location.search]);

  // ============================================
  // UNREAD MESSAGES
  // ============================================

  const unreadMessages =
    user?.unreadMessageCount ?? 0;

  // ============================================
  // SIDEBAR UI
  // ============================================

  return (
    <aside
      id="vendor-sidebar"
      aria-label="Vendor navigation"
      className={`
        fixed inset-y-0 left-0 z-50
        flex w-[280px] max-w-[88vw]
        flex-col border-r border-[#e6ebe1]
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
          mobile
            ? "translate-x-0"
            : "-translate-x-full"
        }
      `}
    >
      {/* ==========================================
          SIDEBAR HEADER
      ========================================== */}

      <div
        className={`
          flex h-[89px] shrink-0
          items-center justify-between
          gap-2 border-b border-[#e6ebe1]
          px-4

          ${
            collapsed
              ? "lg:flex-col lg:justify-center lg:gap-1 lg:px-2"
              : ""
          }
        `}
      >
        {/* ======================================
            COMPANY LOGO
        ====================================== */}

        <Link
          to="/vendor/dashboard"
          onClick={onCloseMobile}
          aria-label="MarryNest Vendor Dashboard"
          className="
            flex min-w-0 shrink
            items-center justify-start
            no-underline
          "
        >
          {/* Full Company Logo */}
          <img
            src={fullLogo}
            alt="MarryNest"
            width="185"
            height="65"
            className={`
              block h-[65px] w-auto
              max-w-[185px]
              object-contain

              ${collapsed ? "lg:hidden" : ""}
            `}
          />

          {/* Collapsed Sidebar Logo */}
          <img
            src={compactLogo}
            alt=""
            width="40"
            height="39"
            className={`
              hidden h-[39px] w-10
              object-contain

              ${collapsed ? "lg:block" : ""}
            `}
          />
        </Link>

        {/* ======================================
            DESKTOP COLLAPSE BUTTON
        ====================================== */}

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={
            collapsed
              ? "Expand vendor sidebar"
              : "Collapse vendor sidebar"
          }
          aria-controls="vendor-sidebar"
          aria-expanded={!collapsed}
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          className="
            hidden h-8 w-8 shrink-0
            items-center justify-center
            rounded-md border-0
            bg-transparent p-0
            text-[#87947e]

            transition-colors duration-200

            hover:bg-[#f1f5ec]
            hover:text-[#4b7049]

            focus-visible:outline-2
            focus-visible:outline-offset-2
            focus-visible:outline-[#8aaf94]

            lg:flex
          "
        >
          {collapsed ? (
            <PanelLeftOpen
              size={19}
              strokeWidth={1.7}
            />
          ) : (
            <PanelLeftClose
              size={19}
              strokeWidth={1.7}
            />
          )}
        </button>

        {/* ======================================
            MOBILE CLOSE BUTTON
        ====================================== */}

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close vendor navigation"
          className="
            flex h-9 w-9 shrink-0
            items-center justify-center
            rounded-md border-0
            bg-transparent p-0
            text-[#87947e]

            transition-colors
            hover:bg-[#f1f5ec]
            hover:text-[#4b7049]

            lg:hidden
          "
        >
          <X size={20} />
        </button>
      </div>

      {/* ==========================================
          SCROLLABLE SIDEBAR NAVIGATION
      ========================================== */}

      <nav
        aria-label="Vendor menu"
        className={`
          min-h-0 flex-1
          overflow-y-auto overflow-x-hidden
          px-[15px] pb-[22px] pt-5

          [scrollbar-width:thin]
          [scrollbar-color:#ced8c7_transparent]

          ${collapsed ? "lg:px-[10px]" : ""}
        `}
      >
        {/* ======================================
            NAVIGATION GROUPS
        ====================================== */}

        {vendorNavigation.map(
          (group, groupIndex) => (
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
              {/* Static Group Heading */}
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

              {/* ======================================
                  NAVIGATION LINKS
              ====================================== */}

              <div className="flex flex-col gap-[2px]">
                {group.items.map(
                  ([path, label, Icon]) => {
                    const active = activePath === path;

                    const showUnread =
                      path === "messages" &&
                      unreadMessages > 0;

                    return (
                      <Link
                        key={path}
                        to={`/vendor/${path}`}
                        onClick={onCloseMobile}
                        title={
                          collapsed
                            ? label
                            : undefined
                        }
                        aria-label={label}
                        aria-current={
                          active
                            ? "page"
                            : undefined
                        }
                        className={`
                          group relative flex
                          min-h-[43px] w-full
                          items-center gap-[10px]
                          rounded-md px-3 py-[9px]

                          text-[12px] leading-[1.5]
                          no-underline

                          transition-colors duration-200

                          ${
                            active
                              ? "bg-[#eaf1e3] font-semibold text-[#486d3c]"
                              : "font-normal text-[#87947e] hover:bg-[#f1f5ec] hover:text-[#4b7049]"
                          }

                          ${
                            collapsed
                              ? "lg:justify-center lg:gap-0 lg:px-[10px]"
                              : ""
                          }

                          focus-visible:outline-2
                          focus-visible:outline-offset-1
                          focus-visible:outline-[#8aaf94]
                        `}
                      >
                        {/* ==================================
                            ACTIVE LEFT INDICATOR
                        ================================== */}

                        {active && (
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

                        {/* ==================================
                            NAVIGATION ICON
                        ================================== */}

                        <Icon
                          size={19}
                          strokeWidth={1.7}
                          className={`
                            shrink-0
                            transition-colors duration-200

                            ${
                              active
                                ? "text-[#486d3c]"
                                : "text-[#87947e] group-hover:text-[#4b7049]"
                            }
                          `}
                        />

                        {/* ==================================
                            NAVIGATION LABEL
                        ================================== */}

                        <span
                          className={`
                            min-w-0 flex-1 truncate

                            ${collapsed ? "lg:hidden" : ""}
                          `}
                        >
                          {label}
                        </span>

                        {/* ==================================
                            UNREAD MESSAGE BADGE
                        ================================== */}

                        {showUnread && (
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
                              {unreadMessages > 99
                                ? "99+"
                                : unreadMessages}
                            </span>

                            {/* Collapsed Badge Dot */}
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
                      </Link>
                    );
                  }
                )}
              </div>
            </div>
          )
        )}
      </nav>
    </aside>
  );
}
