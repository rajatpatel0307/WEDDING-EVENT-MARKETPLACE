import { NotificationBell } from '../../communication/Notifications';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import { vendorNavigation } from "../navigation";

// ============================================
// CURRENT DATE
// ============================================

const getCurrentDate = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

// ============================================
// SHARED SEARCH INPUT
// ============================================

function VendorSearchInput({
  query,
  onChange,
  onClear,
  onFocus,
  autoFocus = false,
  placeholder = "Search anything...",
}) {
  return (
    <div
      className="
        flex h-11 w-full min-w-0 items-center gap-3
        rounded-xl border border-slate-200
        bg-slate-50 px-3
        transition-all duration-200
        hover:border-slate-300
        focus-within:border-[#956d67]
        focus-within:bg-white
        focus-within:ring-2
        focus-within:ring-[#956d67]/10
      "
    >
      <Search
        size={18}
        strokeWidth={1.8}
        className="pointer-events-none shrink-0 text-slate-400"
      />

      <input
        type="text"
        inputMode="search"
        autoComplete="off"
        autoFocus={autoFocus}
        role="searchbox"
        aria-label="Search vendor pages"
        placeholder={placeholder}
        value={query}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        className="
          !m-0 !block !h-full !min-h-0
          !w-full !min-w-0 !flex-1
          !appearance-none !rounded-none
          !border-0 !bg-transparent !p-0
          !text-sm !font-normal !text-slate-700
          !shadow-none !outline-none !ring-0
          placeholder:!text-slate-400
          focus:!border-0
          focus:!bg-transparent
          focus:!shadow-none
          focus:!outline-none
          focus:!ring-0
          focus-visible:!outline-none
        "
      />

      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="
            flex h-7 w-7 shrink-0 items-center
            justify-center rounded-md
            border-0 bg-transparent p-0
            text-slate-400 shadow-none
            transition-colors
            hover:bg-slate-200
            hover:text-slate-700
          "
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

// ============================================
// SEARCH RESULTS
// ============================================

function VendorSearchResults({
  query,
  matches,
  onClose,
  mobile = false,
}) {
  if (!query.trim()) return null;

  return (
    <div
      className={
        mobile
          ? "mt-3 max-h-[55vh] overflow-y-auto rounded-xl border border-slate-100 bg-white p-2"
          : "absolute left-0 right-0 top-full z-[60] mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
      }
    >
      {matches.length > 0 ? (
        matches.map(([path, label, Icon]) => (
          <Link
            key={path}
            to={`/vendor/${path}`}
            onClick={onClose}
            className="
              flex items-center gap-3 rounded-lg
              px-3 py-3 text-sm text-slate-700
              transition-colors
              hover:bg-slate-50
              hover:text-[#273e35]
            "
          >
            <Icon
              size={17}
              strokeWidth={1.8}
              className="shrink-0 text-slate-400"
            />

            <span className="min-w-0 flex-1 truncate">
              {label}
            </span>

            <ArrowUpRight
              size={14}
              className="shrink-0 text-slate-400"
            />
          </Link>
        ))
      ) : (
        <div className="px-4 py-7 text-center">
          <Search
            size={23}
            className="mx-auto mb-2 text-slate-300"
          />

          <p className="text-sm font-medium text-slate-600">
            No matching pages
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Try a different search term.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// VENDOR HEADER
// ============================================

export default function VendorHeader({
  mobile,
  onOpenMobile,
}) {
  const { user, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  // ============================================
  // SEARCH STATES
  // ============================================

  const [query, setQuery] = useState("");

  const [desktopSearchOpen, setDesktopSearchOpen] =
    useState(false);

  const [mobileSearchOpen, setMobileSearchOpen] =
    useState(false);

  // ============================================
  // PROFILE STATE
  // ============================================

  const [profileOpen, setProfileOpen] = useState(false);

  const [logoutError, setLogoutError] = useState("");

  // ============================================
  // DATE STATE
  // ============================================

  const [currentDate, setCurrentDate] = useState(
    getCurrentDate
  );

  // ============================================
  // REFS
  // ============================================

  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const profileRef = useRef(null);

  // ============================================
  // SEARCH MATCHES
  // ============================================

  const matches = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    if (!searchText) return [];

    return vendorNavigation
      .flatMap((group) => group.items)
      .filter(([, label]) =>
        label.toLowerCase().includes(searchText)
      )
      .slice(0, 6);
  }, [query]);

  // ============================================
  // CURRENT DATE EFFECT
  // ============================================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(getCurrentDate());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // ============================================
  // ESCAPE KEY HANDLING
  // ============================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      setProfileOpen(false);
      setDesktopSearchOpen(false);
      setMobileSearchOpen(false);
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  // ============================================
  // OUTSIDE CLICK HANDLING
  // ============================================

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }

      if (
        desktopSearchRef.current &&
        !desktopSearchRef.current.contains(event.target)
      ) {
        setDesktopSearchOpen(false);
      }

      if (
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(event.target)
      ) {
        setMobileSearchOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );
    };
  }, []);

  // ============================================
  // CLOSE MENUS ON ROUTE CHANGE
  // ============================================

  useEffect(() => {
    setProfileOpen(false);
    setDesktopSearchOpen(false);
    setMobileSearchOpen(false);
    setQuery("");
  }, [location.pathname, location.search]);

  // ============================================
  // SEARCH HANDLERS
  // ============================================

  const clearSearch = () => {
    setQuery("");
  };

  const closeSearch = () => {
    setQuery("");
    setDesktopSearchOpen(false);
    setMobileSearchOpen(false);
  };

  const toggleMobileSearch = () => {
    if (mobileSearchOpen) {
      closeSearch();
      return;
    }

    setMobileSearchOpen(true);
    setDesktopSearchOpen(false);
    setProfileOpen(false);
  };

  // ============================================
  // PROFILE HANDLERS
  // ============================================

  const toggleProfile = () => {
    setProfileOpen((previous) => !previous);
    setDesktopSearchOpen(false);
    setMobileSearchOpen(false);
  };

  const handleLogout = async () => {
    try {
      setLogoutError("");
      await logout();
      setProfileOpen(false);
      navigate("/auth/login", { replace: true });
    } catch (error) {
      setLogoutError(
        error?.message || "Unable to sign out. Please try again."
      );
    }
  };

  // ============================================
  // VENDOR INFORMATION
  // ============================================

  const vendorName = user?.firstName || "Vendor";

  const vendorInitial = vendorName
    .charAt(0)
    .toUpperCase();

  const unreadNotifications =
    user?.unreadNotificationCount ?? 0;

  // ============================================
  // RENDER
  // ============================================

  return (
    <header
      className="
        sticky top-0 z-30
        flex min-h-[76px] w-full
        items-center justify-between gap-2
        overflow-visible
        border-b border-slate-200
        bg-white px-3 shadow-sm
        sm:px-5 lg:px-6 xl:px-8
      "
    >
      {/* ====================================
          HEADER LEFT
      ==================================== */}

      <div
        className="
          flex min-w-0 shrink-0
          items-center gap-2 sm:gap-3
        "
      >
        {/* Mobile Sidebar Button */}
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open vendor navigation"
          aria-controls="vendor-sidebar"
          aria-expanded={mobile}
          className="
            flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-xl text-slate-600
            transition-colors
            hover:bg-slate-100
            focus-visible:outline-2
            focus-visible:outline-[#956d67]
            lg:hidden
          "
        >
          <Menu size={22} />
        </button>

        {/* Company Brand */}
        <Link
          to="/vendor/dashboard"
          aria-label="MarryNest Vendor Dashboard"
          className="
            group flex min-w-0 items-center
            gap-2 no-underline
          "
        >
          <span
            className="
              truncate text-[19px]
              font-bold tracking-[-0.7px]
              text-[#273e35]
              transition-colors
              group-hover:text-[#956d67]
              sm:text-[22px]
            "
          >
            MarryNest
          </span>
        </Link>
      </div>

      {/* ====================================
          HEADER RIGHT
      ==================================== */}

      <div
        className="
          flex min-w-0 items-center
          justify-end gap-1.5
          sm:gap-2 lg:gap-3
        "
      >
        {/* ====================================
            TABLET + DESKTOP SEARCH
        ==================================== */}

        <div
          ref={desktopSearchRef}
          className="
            relative hidden min-w-0
            md:block md:w-40
            lg:w-56 xl:w-72 2xl:w-80
          "
        >
          <VendorSearchInput
            query={query}
            onChange={setQuery}
            onClear={clearSearch}
            onFocus={() => setDesktopSearchOpen(true)}
          />

          {desktopSearchOpen && query.trim() && (
            <VendorSearchResults
              query={query}
              matches={matches}
              onClose={closeSearch}
            />
          )}
        </div>

        {/* ====================================
            MOBILE SEARCH
        ==================================== */}

        <div
          ref={mobileSearchRef}
          className="relative md:hidden"
        >
          {/* Mobile Search Button */}
          <button
            type="button"
            aria-label={
              mobileSearchOpen
                ? "Close search"
                : "Open search"
            }
            aria-expanded={mobileSearchOpen}
            onClick={toggleMobileSearch}
            className={`
              flex h-10 w-10 items-center
              justify-center rounded-xl
              transition-colors
              focus-visible:outline-2
              focus-visible:outline-[#956d67]
              ${
                mobileSearchOpen
                  ? "bg-[#956d67]/10 text-[#956d67]"
                  : "text-slate-600 hover:bg-slate-100"
              }
            `}
          >
            {mobileSearchOpen ? (
              <X size={20} />
            ) : (
              <Search size={20} />
            )}
          </button>

          {/* Mobile Search Panel */}
          {mobileSearchOpen && (
            <div
              className="
                fixed inset-x-3 top-[76px]
                z-[80] rounded-b-2xl
                border border-slate-200
                bg-white p-3 shadow-xl
                md:hidden
              "
            >
              <VendorSearchInput
                query={query}
                onChange={setQuery}
                onClear={clearSearch}
                autoFocus
                placeholder="Search vendor pages..."
              />

              <VendorSearchResults
                query={query}
                matches={matches}
                onClose={closeSearch}
                mobile
              />
            </div>
          )}
        </div>

        {/* ====================================
            CURRENT DATE
        ==================================== */}

        <span
          className="
            hidden shrink-0 whitespace-nowrap
            text-xs font-medium text-slate-500
            2xl:block
          "
        >
          {currentDate}
        </span>

        {/* ====================================
            NOTIFICATIONS
        ==================================== */}

        <NotificationBell role="Vendor" />

        {/* ====================================
            PROFILE DROPDOWN
        ==================================== */}

        <div
          ref={profileRef}
          className="relative shrink-0"
        >
          {/* Profile Trigger */}
          <button
            type="button"
            aria-label="Business owner profile menu"
            aria-haspopup="true"
            aria-expanded={profileOpen}
            onClick={toggleProfile}
            className={`
              flex items-center gap-2
              rounded-xl p-1.5
              transition-colors
              sm:gap-3 sm:px-2
              focus-visible:outline-2
              focus-visible:outline-[#956d67]
              ${
                profileOpen
                  ? "bg-slate-100"
                  : "hover:bg-slate-50"
              }
            `}
          >
            {/* Avatar */}
            <span
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-full bg-[#273e35]
                text-sm font-bold text-white
              "
            >
              {vendorInitial}
            </span>

            {/* Vendor Name */}
            <span
              className="
                hidden min-w-0 text-left
                lg:block
              "
            >
              <span
                className="
                  block max-w-28 truncate
                  text-sm font-semibold
                  text-slate-800
                "
              >
                {vendorName}
              </span>

              <span
                className="
                  block text-[11px]
                  text-slate-400
                "
              >
                Business Owner
              </span>
            </span>

            {/* Dropdown Arrow */}
            <ChevronDown
              size={15}
              className={`
                hidden shrink-0 text-slate-400
                transition-transform duration-200
                sm:block
                ${profileOpen ? "rotate-180" : ""}
              `}
            />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div
              className="
                absolute right-0 top-full
                z-[80] mt-3 w-60
                overflow-hidden rounded-xl
                border border-slate-200
                bg-white p-2 shadow-xl
              "
            >
              {/* Vendor Information */}
              <div
                className="
                  border-b border-slate-100
                  px-3 py-3
                "
              >
                <p
                  className="
                    truncate text-sm
                    font-semibold text-slate-900
                  "
                >
                  {vendorName}
                </p>

                <p
                  className="
                    mt-1 truncate text-xs
                    text-slate-500
                  "
                >
                  {user?.email || "Business Owner"}
                </p>
              </div>

              {/* Business Profile */}
              <Link
                to="/vendor/business/profile"
                onClick={() => setProfileOpen(false)}
                className="
                  mt-2 flex items-center gap-3
                  rounded-lg px-3 py-2.5
                  text-sm text-slate-700
                  transition-colors
                  hover:bg-slate-50
                  hover:text-emerald-700
                "
              >
                <ShieldCheck size={17} />
                <span>Business Profile</span>
              </Link>

              {/* Settings */}
              <Link
                to="/vendor/settings"
                onClick={() => setProfileOpen(false)}
                className="
                  flex items-center gap-3
                  rounded-lg px-3 py-2.5
                  text-sm text-slate-700
                  transition-colors
                  hover:bg-slate-50
                  hover:text-emerald-700
                "
              >
                <Settings size={17} />
                <span>Settings</span>
              </Link>

              {/* Logout */}
              <div
                className="
                  mt-2 border-t
                  border-slate-100 pt-2
                "
              >
                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex w-full items-center
                    gap-3 rounded-lg
                    px-3 py-2.5 text-left
                    text-sm font-medium
                    text-red-600
                    transition-colors
                    hover:bg-red-50
                  "
                >
                  <LogOut size={17} />
                  <span>Sign Out</span>
                </button>

                {logoutError && (
                  <p
                    role="alert"
                    className="px-3 py-2 text-xs text-red-600"
                  >
                    {logoutError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
