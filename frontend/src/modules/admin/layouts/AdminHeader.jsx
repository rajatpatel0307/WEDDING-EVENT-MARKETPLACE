import { useCommunicationSocket } from '../../communication/useCommunicationSocket';

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
import { adminRequest } from "../api";
import { adminNavigation } from "../navigation";
import { notificationLink } from "../notification-links";

// ==========================================
// DATE HELPER
// ==========================================

const getCurrentDate = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

// ==========================================
// SHARED SEARCH INPUT
// Mobile / Tablet / Desktop
// ==========================================

function AdminSearchInput({
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
        autoFocus={autoFocus}
        type="text"
        inputMode="search"
        autoComplete="off"
        role="searchbox"
        aria-label="Search admin pages and records"
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
            focus-visible:outline-2
            focus-visible:outline-offset-2
            focus-visible:outline-[#956d67]
          "
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

// ==========================================
// SHARED SEARCH RESULTS
// ==========================================

function SearchResults({
  query,
  records,
  matches,
  loading,
  error,
  onClose,
  mobile = false,
}) {
  if (!query.trim()) return null;

  const containerClass = mobile
    ? "mt-3 max-h-[55vh] overflow-y-auto rounded-xl border border-slate-100 bg-white"
    : "absolute left-0 right-0 top-full z-[60] mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl";

  return (
    <div className={containerClass}>
      {query.trim().length < 2 ? (
        <p className="px-3 py-3 text-xs text-slate-500">
          Type at least 2 characters to search records.
        </p>
      ) : null}

      {loading && (
        <div
          role="status"
          className="px-3 py-4 text-sm text-slate-500"
        >
          Searching...
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="m-2 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {records.map((record) => (
        <Link
          key={`${record.kind}-${record.id}`}
          to={
            ["payments", "quotations"].includes(record.kind)
              ? `/admin/finance/${record.kind}/${record.id}`
              : `/admin/${record.kind}/${record.id}`
          }
          onClick={onClose}
          className="
            flex items-center gap-3 rounded-lg
            px-3 py-3 text-sm text-slate-700
            transition-colors hover:bg-slate-50
          "
        >
          <Search
            size={16}
            className="shrink-0 text-slate-400"
          />

          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">
              {record.name}
            </span>

            <span className="block text-xs capitalize text-slate-400">
              {record.kind}
            </span>
          </span>

          <ArrowUpRight
            size={14}
            className="shrink-0 text-slate-400"
          />
        </Link>
      ))}

      {matches.map(([path, label, Icon]) => (
        <Link
          key={path}
          to={`/admin/${path}`}
          onClick={onClose}
          className="
            flex items-center gap-3 rounded-lg
            px-3 py-3 text-sm text-slate-700
            transition-colors hover:bg-slate-50
          "
        >
          <Icon
            size={17}
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
      ))}

      {!loading &&
        !error &&
        query.trim().length >= 2 &&
        records.length === 0 &&
        matches.length === 0 && (
          <div className="px-4 py-7 text-center">
            <Search
              size={22}
              className="mx-auto mb-2 text-slate-300"
            />

            <p className="text-sm font-medium text-slate-600">
              No results found
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Try searching another keyword.
            </p>
          </div>
        )}
    </div>
  );
}

// ==========================================
// ADMIN HEADER
// ==========================================

export default function AdminHeader({
  mobile,
  onOpenMobile,
}) {
  const { user, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  // ------------------------------------------
  // SEARCH STATES
  // ------------------------------------------

  const [query, setQuery] = useState("");
  const [records, setRecords] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [desktopSearchOpen, setDesktopSearchOpen] =
    useState(false);

  const [mobileSearchOpen, setMobileSearchOpen] =
    useState(false);

  // ------------------------------------------
  // PROFILE STATES
  // ------------------------------------------

  const [profileOpen, setProfileOpen] = useState(false);

  // ------------------------------------------
  // NOTIFICATION STATES
  // ------------------------------------------

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [inbox, setInbox] = useState(null);
  const [inboxError, setInboxError] = useState("");
  const [inboxLoading, setInboxLoading] = useState(false);

  // ------------------------------------------
  // DATE STATE
  // ------------------------------------------

  const [currentDate, setCurrentDate] = useState(
    getCurrentDate
  );

  // ------------------------------------------
  // REFS
  // ------------------------------------------

  const communicationSocket=useCommunicationSocket();
  const [communicationRevision,setCommunicationRevision]=useState(0);
  useEffect(()=>{
    const refresh=()=>setCommunicationRevision(v=>v+1);
    const events=['new_notification','notification_read','notification_count_updated','connect'];
    events.forEach(e=>communicationSocket?.on(e,refresh));
    return()=>events.forEach(e=>communicationSocket?.off(e,refresh));
  },[communicationSocket]);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  // ==========================================
  // SEARCH API
  // ==========================================

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setRecords([]);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    const abort = new AbortController();

    setSearchLoading(true);
    setRecords([]);
    setSearchError("");

    const timer = setTimeout(() => {
      adminRequest(
        `/search?q=${encodeURIComponent(trimmed)}`,
        {
          signal: abort.signal,
        }
      )
        .then((result) => {
          if (abort.signal.aborted) return;

          setRecords(result.rows ?? []);
          setSearchError("");
        })
        .catch((error) => {
          if (abort.signal.aborted) return;

          setRecords([]);
          setSearchError(
            error?.message || "Unable to search records."
          );
        })
        .finally(() => {
          if (!abort.signal.aborted) {
            setSearchLoading(false);
          }
        });
    }, 350);

    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query]);

  // ==========================================
  // NAVIGATION SEARCH RESULTS
  // ==========================================

  const matches = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    if (searchText.length < 2) return [];

    return adminNavigation
      .flatMap((group) => group.items)
      .filter(
        ([path, label]) =>
          !path.includes("?") &&
          label.toLowerCase().includes(searchText)
      )
      .slice(0, 6);
  }, [query]);

  // ==========================================
  // FETCH NOTIFICATIONS
  // ==========================================

  useEffect(() => {
    const abort = new AbortController();

    setInboxLoading(true);

    adminRequest(
      "/notifications/inbox?pageSize=5",
      {
        signal: abort.signal,
      }
    )
      .then((result) => {
        if (abort.signal.aborted) return;

        setInbox(result);
        setInboxError("");
      })
      .catch((error) => {
        if (abort.signal.aborted) return;

        setInboxError(
          error?.message || "Unable to load notifications."
        );
      })
      .finally(() => {
        if (!abort.signal.aborted) {
          setInboxLoading(false);
        }
      });

    return () => abort.abort();
  }, [notificationsOpen, location.pathname, communicationRevision]);

  // ==========================================
  // CURRENT DATE
  // ==========================================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(getCurrentDate());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // ==========================================
  // CLOSE MENUS ON ESCAPE
  // ==========================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      setProfileOpen(false);
      setNotificationsOpen(false);
      setMobileSearchOpen(false);
      setDesktopSearchOpen(false);
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  // ==========================================
  // CLOSE MENUS ON OUTSIDE CLICK
  // ==========================================

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
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

  // ==========================================
  // CLOSE MENUS AFTER NAVIGATION
  // ==========================================

  useEffect(() => {
    setProfileOpen(false);
    setNotificationsOpen(false);
    setMobileSearchOpen(false);
    setDesktopSearchOpen(false);
    setQuery("");
  }, [location.pathname]);

  // ==========================================
  // SEARCH HANDLERS
  // ==========================================

  const clearSearch = () => {
    setQuery("");
    setRecords([]);
    setSearchError("");
  };

  const closeSearch = () => {
    clearSearch();
    setDesktopSearchOpen(false);
    setMobileSearchOpen(false);
  };

  const toggleMobileSearch = () => {
    if (mobileSearchOpen) {
      closeSearch();
      return;
    }

    setMobileSearchOpen(true);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setDesktopSearchOpen(false);
  };

  // ==========================================
  // PROFILE HANDLERS
  // ==========================================

  const toggleProfile = () => {
    setProfileOpen((previous) => !previous);

    setNotificationsOpen(false);
    setMobileSearchOpen(false);
    setDesktopSearchOpen(false);
  };

  const handleLogout = async () => {
    await logout();

    setProfileOpen(false);
    setNotificationsOpen(false);

    navigate("/auth/login");
  };

  // ==========================================
  // NOTIFICATION HANDLERS
  // ==========================================

  const toggleNotifications = () => {
    setNotificationsOpen((previous) => !previous);

    setProfileOpen(false);
    setMobileSearchOpen(false);
    setDesktopSearchOpen(false);
  };

  const handleMarkRead = async (item) => {
    try {
      await adminRequest(
        `/notifications/${item.id}/read`,
        {
          method: "PATCH",
          body: JSON.stringify({
            read: !item.read,
          }),
        }
      );

      const result = await adminRequest(
        "/notifications/inbox?pageSize=5"
      );

      setInbox(result);
      setInboxError("");
    } catch (error) {
      setInboxError(
        error?.message || "Unable to update notification."
      );
    }
  };

  // ==========================================
  // ADMIN INFORMATION
  // ==========================================

  const adminName = user?.firstName || "Admin";

  const adminInitial = adminName
    .charAt(0)
    .toUpperCase();

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <header
      className="
        sticky top-0 z-40 flex min-h-[76px] w-full
        items-center justify-between gap-2
        overflow-visible border-b border-slate-200
        bg-white px-3 shadow-sm
        sm:px-5 lg:px-6 xl:px-8
      "
    >
      {/* =====================================
          LEFT SECTION
      ===================================== */}

      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        {/* Mobile Sidebar Button */}
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation"
          aria-controls="admin-sidebar"
          aria-expanded={mobile}
          className="
            flex h-10 w-10 shrink-0 items-center
            justify-center rounded-xl
            text-slate-600 transition-colors
            hover:bg-slate-100
            focus-visible:outline-2
            focus-visible:outline-[#956d67]
            lg:hidden
          "
        >
          <Menu size={22} />
        </button>

        {/* Company Name */}
        <Link
          to="/admin/dashboard"
          aria-label="MarryNest Admin Dashboard"
          className="
            group flex min-w-0 items-center
            gap-2 no-underline
          "
        >
          <span
            className="
              truncate text-[19px] font-bold
              tracking-[-0.7px] text-[#273e35]
              transition-colors
              group-hover:text-[#956d67]
              sm:text-[22px]
            "
          >
            MarryNest
          </span>
        </Link>
      </div>

      {/* =====================================
          RIGHT SECTION
      ===================================== */}

      <div
        className="
          flex min-w-0 items-center
          justify-end gap-1.5
          sm:gap-2 lg:gap-3
        "
      >
        {/* =====================================
            TABLET + DESKTOP SEARCH
        ===================================== */}

        <div
          ref={desktopSearchRef}
          className="
            relative hidden min-w-0
            md:block md:w-40
            lg:w-56 xl:w-72 2xl:w-80
          "
        >
          <AdminSearchInput
            query={query}
            onChange={setQuery}
            onClear={clearSearch}
            onFocus={() => setDesktopSearchOpen(true)}
          />

          {desktopSearchOpen && (
            <SearchResults
              query={query}
              records={records}
              matches={matches}
              loading={searchLoading}
              error={searchError}
              onClose={closeSearch}
            />
          )}
        </div>

        {/* =====================================
            MOBILE SEARCH
        ===================================== */}

        <div
          ref={mobileSearchRef}
          className="relative md:hidden"
        >
          {/* Mobile Search Icon */}
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
                fixed inset-x-3 top-[76px] z-[80]
                rounded-b-2xl border border-slate-200
                bg-white p-3 shadow-xl md:hidden
              "
            >
              {/* Mobile Input */}
              <AdminSearchInput
                query={query}
                onChange={setQuery}
                onClear={clearSearch}
                autoFocus
                placeholder="Search pages and records..."
              />

              {/* Mobile Search Results */}
              <SearchResults
                mobile
                query={query}
                records={records}
                matches={matches}
                loading={searchLoading}
                error={searchError}
                onClose={closeSearch}
              />
            </div>
          )}
        </div>

        {/* =====================================
            CURRENT DATE
        ===================================== */}

        <span
          className="
            hidden shrink-0 whitespace-nowrap
            text-xs font-medium text-slate-500
            2xl:block
          "
        >
          {currentDate}
        </span>

        {/* =====================================
            NOTIFICATIONS
        ===================================== */}

        <div
          ref={notificationRef}
          className="relative shrink-0"
        >
          {/* Notification Trigger */}
          <button
            type="button"
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={notificationsOpen}
            onClick={toggleNotifications}
            className={`
              relative flex h-10 w-10 items-center
              justify-center rounded-xl
              transition-colors
              focus-visible:outline-2
              focus-visible:outline-[#956d67]
              ${
                notificationsOpen
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }
            `}
          >
            <Bell size={20} />

            {/* Notification Count */}
            {inbox?.unread > 0 && (
              <span
                className="
                  absolute -right-1 -top-1
                  flex h-[19px] min-w-[19px]
                  items-center justify-center
                  rounded-full bg-red-500
                  px-1 text-[10px] font-bold
                  text-white
                "
              >
                {inbox.unread > 99
                  ? "99+"
                  : inbox.unread}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notificationsOpen && (
            <div
              className="
                fixed inset-x-3 top-[76px] z-[80]
                max-h-[75vh] overflow-hidden
                rounded-xl border border-slate-200
                bg-white shadow-xl
                sm:absolute sm:inset-x-auto
                sm:right-0 sm:top-full sm:mt-3
                sm:w-[370px]
              "
            >
              {/* Notification Header */}
              <div
                className="
                  flex items-center justify-between
                  border-b border-slate-100
                  px-4 py-4
                "
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Notifications
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Recent marketplace updates
                  </p>
                </div>

                {inbox?.unread > 0 && (
                  <span
                    className="
                      rounded-full bg-emerald-50
                      px-2.5 py-1 text-xs
                      font-semibold text-emerald-700
                    "
                  >
                    {inbox.unread} new
                  </span>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-[55vh] overflow-y-auto">
                {inboxLoading && (
                  <p
                    role="status"
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    Loading notifications...
                  </p>
                )}

                {inboxError && (
                  <p
                    role="alert"
                    className="m-3 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-600"
                  >
                    {inboxError}
                  </p>
                )}

                {!inboxLoading &&
                  !inboxError &&
                  !inbox?.rows?.length && (
                    <div className="flex flex-col items-center px-6 py-10 text-center">
                      <div
                        className="
                          mb-3 flex h-12 w-12
                          items-center justify-center
                          rounded-full bg-slate-100
                        "
                      >
                        <Bell
                          size={22}
                          className="text-slate-400"
                        />
                      </div>

                      <p className="text-sm font-medium text-slate-700">
                        No notifications yet
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Your latest updates will appear here.
                      </p>
                    </div>
                  )}

                {/* Notification Records */}
                {!inboxLoading &&
                  inbox?.rows?.map((item) => (
                    <div
                      key={item.id}
                      className={`
                        border-b border-slate-100
                        px-4 py-3 transition-colors
                        hover:bg-slate-50
                        ${
                          !item.read
                            ? "bg-emerald-50/40"
                            : "bg-white"
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {!item.read && (
                          <span
                            className="
                              mt-1.5 h-2 w-2 shrink-0
                              rounded-full bg-emerald-500
                            "
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <Link
                            to={notificationLink(item)}
                            onClick={() =>
                              setNotificationsOpen(false)
                            }
                            className="
                              block text-sm font-semibold
                              text-slate-800
                              hover:text-emerald-700
                            "
                          >
                            {item.title}
                          </Link>

                          <p
                            className="
                              mt-1 break-words
                              text-xs leading-5
                              text-slate-500
                            "
                          >
                            {item.message}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              handleMarkRead(item)
                            }
                            className="
                              mt-2 text-xs font-medium
                              text-emerald-700
                              hover:underline
                            "
                          >
                            {item.read
                              ? "Mark unread"
                              : "Mark read"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Notification Footer */}
              <Link
                to="/admin/notifications"
                onClick={() =>
                  setNotificationsOpen(false)
                }
                className="
                  flex items-center justify-center
                  gap-2 border-t border-slate-100
                  px-4 py-3 text-sm font-semibold
                  text-emerald-700
                  transition-colors hover:bg-emerald-50
                "
              >
                View all notifications
                <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </div>

        {/* =====================================
            ADMIN PROFILE
        ===================================== */}

        <div
          ref={profileRef}
          className="relative shrink-0"
        >
          {/* Profile Button */}
          <button
            type="button"
            aria-label="Administrator profile menu"
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
              {adminInitial}
            </span>

            {/* Admin Name */}
            <span className="hidden min-w-0 text-left lg:block">
              <span
                className="
                  block max-w-28 truncate
                  text-sm font-semibold
                  text-slate-800
                "
              >
                {adminName}
              </span>

              <span className="block text-[11px] text-slate-400">
                Administrator
              </span>
            </span>

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
                absolute right-0 top-full z-[80]
                mt-3 w-60 overflow-hidden
                rounded-xl border border-slate-200
                bg-white p-2 shadow-xl
              "
            >
              {/* User Details */}
              <div className="border-b border-slate-100 px-3 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {adminName}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {user?.email || "Administrator"}
                </p>
              </div>

              {/* My Profile */}
              <Link
                to="/admin/profile"
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
                <span>My Profile</span>
              </Link>

              {/* Settings */}
              <Link
                to="/admin/settings"
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
              <div className="mt-2 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex w-full items-center gap-3
                    rounded-lg px-3 py-2.5
                    text-left text-sm font-medium
                    text-red-600 transition-colors
                    hover:bg-red-50
                  "
                >
                  <LogOut size={17} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
