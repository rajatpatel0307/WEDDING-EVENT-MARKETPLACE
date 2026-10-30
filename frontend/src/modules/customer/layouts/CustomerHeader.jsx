
import { useEffect, useRef, useState } from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Bell,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  MessagesSquare,
  X,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";

// ============================================
// MARKETPLACE NAVIGATION
// ============================================

const topNavigation = [
  ["Home", "/"],
  ["Services", "/customer/discover"],
  ["Vendors", "/customer/discover?type=vendors"],
  ["Venues", "/customer/discover?venue=1"],
  ["Packages", "/customer/discover?type=packages"],
  ["Offers", "/customer/discover?type=offers"],
  ["My Events", "/customer/events"],
];

const profileNavigation = [
  ["My Profile", "profile"],
  ["My Addresses", "addresses"],
  ["My Bookings", "bookings"],
  ["My Quotations", "quotations"],
  ["Payments", "payments"],
];

// ============================================
// HEADER ACTION LINK
// ============================================

function HeaderAction({
  to,
  label,
  icon: Icon,
  count = 0,
  className = "",
}) {
  return (
    <Link
      to={to}
      title={label}
      aria-label={
        count > 0 ? `${label}: ${count} items` : label
      }
      className={`
        relative flex h-10 w-10
        shrink-0 items-center
        justify-center rounded-lg
        text-[#87947e] no-underline

        transition-colors duration-200
        hover:bg-[#f1f5ec]
        hover:text-[#245c49]

        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-[#8aaf94]

        ${className}
      `}
    >
      <Icon size={19} strokeWidth={1.7} />

      {Number(count) > 0 && (
        <span
          className="
            absolute right-1 top-1
            h-2 w-2 rounded-full
            bg-[#b9a276]
            ring-2 ring-white
          "
        />
      )}
    </Link>
  );
}

// ============================================
// CUSTOMER HEADER
// ============================================

export default function CustomerHeader({
  mobileOpen = false,
  onToggleMobile,
}) {
  const { user, logout, notify } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const profileRef = useRef(null);

  // ============================================
  // CLOSE PROFILE ON ROUTE CHANGE
  // ============================================

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname, location.search]);

  // ============================================
  // ESCAPE KEY
  // ============================================

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
    };
  }, []);

  // ============================================
  // OUTSIDE CLICK
  // ============================================

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      closeOnOutsideClick
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeOnOutsideClick
      );
    };
  }, []);

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      setLogoutError("");

      await logout();

      setProfileOpen(false);

      navigate("/auth/login", {
        replace: true,
      });
    } catch (error) {
      const message =
        error?.message || "Unable to sign out.";

      setLogoutError(message);

      if (typeof notify === "function") {
        notify(message);
      }
    } finally {
      setLoggingOut(false);
    }
  };

  // ============================================
  // CUSTOMER INFORMATION
  // ============================================

  const customerName = user?.firstName || "Customer";

  const customerInitial = customerName
    .charAt(0)
    .toUpperCase();

  // ============================================
  // HEADER RENDER
  // ============================================

  return (
    <header
      className="
        sticky top-0 z-[60]
        flex h-[76px] w-full
        items-center justify-between gap-3

        border-b border-[#e6ebe1]
        bg-white px-3 shadow-sm

        sm:px-5 lg:px-6
      "
    >
      {/* ======================================
          COMPANY LOGO
      ====================================== */}

      <Link
        to="/customer/dashboard"
        aria-label="MarryNest Customer Dashboard"
        className="
          flex min-w-0 shrink-0
          items-center no-underline
        "
      >
        <img
          src="/images/marrynest-logo-320.webp"
          alt="MarryNest"
          width="160"
          height="68"
          className="
            h-auto w-28
            object-contain
            sm:w-36 lg:w-40
          "
        />
      </Link>

      {/* ======================================
          DESKTOP MARKETPLACE NAVIGATION
      ====================================== */}

      <nav
        aria-label="Marketplace navigation"
        className="
          hidden min-w-0 flex-1
          items-center justify-center
          gap-1 xl:flex
        "
      >
        {topNavigation.map(([name, path]) => {
          const active =
            `${location.pathname}${location.search}` ===
            path;

          return (
            <Link
              key={name}
              to={path}
              aria-current={
                active ? "page" : undefined
              }
              className={`
                whitespace-nowrap rounded-lg
                px-2.5 py-2
                text-[12px] font-medium
                no-underline
                transition-colors duration-200

                ${
                  active
                    ? "bg-[#eaf1e3] text-[#245c49]"
                    : "text-[#87947e] hover:bg-[#f1f5ec] hover:text-[#245c49]"
                }
              `}
            >
              {name}
            </Link>
          );
        })}
      </nav>

      {/* ======================================
          HEADER ACTIONS
      ====================================== */}

      <div
        className="
          ml-auto flex shrink-0
          items-center gap-0.5
          sm:gap-1.5
        "
      >
        {/* Wishlist */}
        <HeaderAction
          to="/customer/wishlist"
          label="Wishlist"
          icon={Heart}
          count={user?.wishlistCount}
          className="hidden sm:flex"
        />

        {/* Messages */}
        <HeaderAction
          to="/customer/messages"
          label="Messages"
          icon={MessagesSquare}
          count={user?.unreadMessageCount}
          className="hidden sm:flex"
        />

        {/* Notifications */}
        <HeaderAction
          to="/customer/notifications"
          label="Notifications"
          icon={Bell}
          count={user?.unreadNotificationCount}
        />

        {/* ======================================
            PROFILE MENU
        ====================================== */}

        <div
          ref={profileRef}
          className="relative"
        >
          <button
            type="button"
            aria-label="Customer profile menu"
            aria-haspopup="true"
            aria-expanded={profileOpen}
            onClick={() =>
              setProfileOpen((previous) => !previous)
            }
            className={`
              flex h-10 items-center gap-1.5
              rounded-lg border-0
              bg-transparent px-1.5
              transition-colors duration-200

              hover:bg-[#f1f5ec]

              ${
                profileOpen
                  ? "bg-[#f1f5ec]"
                  : ""
              }
            `}
          >
            {/* Customer Avatar */}
            <span
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                overflow-hidden rounded-full
                bg-[#245c49]
                text-[13px] font-semibold
                text-white
              "
            >
              {user?.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt=""
                  className="
                    h-full w-full
                    object-cover
                  "
                />
              ) : (
                customerInitial
              )}
            </span>

            <ChevronDown
              size={14}
              className={`
                hidden text-[#87947e]
                transition-transform duration-200
                sm:block

                ${profileOpen ? "rotate-180" : ""}
              `}
            />
          </button>

          {/* ======================================
              PROFILE DROPDOWN
          ====================================== */}

          {profileOpen && (
            <div
              className="
                absolute right-0 top-full
                z-[80] mt-3 w-[240px]
                overflow-hidden rounded-xl
                border border-[#e4eade]
                bg-white p-2 shadow-xl
              "
            >
              {/* User Information */}
              <div
                className="
                  border-b border-[#edf2e8]
                  px-3 py-3
                "
              >
                <strong
                  className="
                    block truncate text-[13px]
                    font-semibold text-[#2b4638]
                  "
                >
                  {customerName}
                </strong>

                <span
                  className="
                    mt-1 block truncate
                    text-[11px] text-[#89978c]
                  "
                >
                  {user?.email || "MarryNest Customer"}
                </span>
              </div>

              {/* Profile Navigation */}
              <div className="py-2">
                {profileNavigation.map(
                  ([name, path]) => (
                    <Link
                      key={path}
                      to={`/customer/${path}`}
                      onClick={() =>
                        setProfileOpen(false)
                      }
                      className="
                        flex min-h-[40px]
                        items-center rounded-lg
                        px-3 py-2
                        text-[12px] text-[#87947e]
                        no-underline

                        transition-colors
                        hover:bg-[#f1f5ec]
                        hover:text-[#245c49]
                      "
                    >
                      {name}
                    </Link>
                  )
                )}
              </div>

              {/* Logout */}
              <div
                className="
                  border-t border-[#edf2e8]
                  pt-2
                "
              >
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="
                    flex min-h-[40px] w-full
                    items-center gap-2
                    rounded-lg border-0
                    bg-transparent px-3 py-2
                    text-left text-[12px]
                    text-red-600

                    transition-colors
                    hover:bg-red-50

                    disabled:opacity-50
                  "
                >
                  <LogOut
                    size={16}
                    strokeWidth={1.7}
                  />

                  {loggingOut
                    ? "Signing out..."
                    : "Logout"}
                </button>

                {logoutError && (
                  <p
                    role="alert"
                    className="
                      px-3 py-2
                      text-[11px] text-red-600
                    "
                  >
                    {logoutError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ======================================
            MOBILE SIDEBAR BUTTON
        ====================================== */}

        <button
          type="button"
          onClick={onToggleMobile}
          aria-label={
            mobileOpen
              ? "Close dashboard navigation"
              : "Open dashboard navigation"
          }
          aria-controls="customer-sidebar"
          aria-expanded={mobileOpen}
          className="
            flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-lg border-0
            bg-transparent text-[#87947e]

            transition-colors
            hover:bg-[#f1f5ec]
            hover:text-[#245c49]

            lg:hidden
          "
        >
          {mobileOpen ? (
            <X size={21} />
          ) : (
            <Menu size={21} />
          )}
        </button>
      </div>
    </header>
  );
}
