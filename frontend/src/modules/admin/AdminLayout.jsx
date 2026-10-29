import { notificationLink } from "./notification-links";
import { adminRequest } from "./api";
import { vendorChangedEvent } from "./vendor-workflow";
import "./vendor-workflow.css";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  LogOut,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { adminNavigation, resourceTitle } from "./navigation";
import compactLogo from "../../assets/small logo.png";
import "./admin.css";
const calendarDate = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
export default function AdminLayout() {
  const { user, logout } = useAuth(),
    location = useLocation(),
    navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
      () => localStorage.getItem("mn-admin-collapsed") === "true",
    ),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [profile, setProfile] = useState(false);
  const [closedGroups, setClosedGroups] = useState([]),
    [records, setRecords] = useState([]),
    [searchError, setSearchError] = useState(""),
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [inbox, setInbox] = useState(null),
    [inboxError, setInboxError] = useState("");
  useEffect(() => {
    if (query.trim().length < 2) return;
    const abort = new AbortController();
    const timer = setTimeout(
      () =>
        adminRequest(`/search?q=${encodeURIComponent(query.trim())}`, {
          signal: abort.signal,
        })
          .then((result) => {
            setRecords(result.rows);
            setSearchError("");
          })
          .catch((error) => {
            if (!abort.signal.aborted) setSearchError(error.message);
          }),
      350,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query]);
  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/notifications/inbox?pageSize=5", { signal: abort.signal })
      .then((result) => {
        setInbox(result);
        setInboxError("");
      })
      .catch((error) => {
        if (!abort.signal.aborted) setInboxError(error.message);
      });
    return () => abort.abort();
  }, [notificationsOpen, location.pathname]);
  const [currentDate, setCurrentDate] = useState(calendarDate);
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(calendarDate()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [pendingCount, setPendingCount] = useState(null);
  const [serviceCount, setServiceCount] = useState(null);
  useEffect(() => {
    const abort = new AbortController();
    const refresh = () =>
      adminRequest("/services/pending-count", { signal: abort.signal })
        .then((r) => setServiceCount(r.pendingCount))
        .catch(() => {});
    refresh();
    window.addEventListener("marrynest:service-decision", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      abort.abort();
      window.removeEventListener("marrynest:service-decision", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    const refreshCount = () =>
      adminRequest("/vendors/pending-count", { signal: abort.signal })
        .then((result) => setPendingCount(result.data.pendingCount))
        .catch(() => {});
    refreshCount();
    window.addEventListener(vendorChangedEvent, refreshCount);
    window.addEventListener("focus", refreshCount);
    return () => {
      abort.abort();
      window.removeEventListener(vendorChangedEvent, refreshCount);
      window.removeEventListener("focus", refreshCount);
    };
  }, []);
  const segments = location.pathname.split("/");
  const section =
    segments[2] === "finance" ? segments[3] : segments[2] || "dashboard";
  function toggle() {
    setCollapsed((value) => {
      localStorage.setItem("mn-admin-collapsed", String(!value));
      return !value;
    });
  }
  const matches = query.trim()
    ? adminNavigation
        .flatMap((g) => g.items)
        .filter(
          (i) =>
            !i[0].includes("?") &&
            i[1].toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 6)
    : [];
  return (
    <div
      className={`ad-app ${collapsed ? "ad-collapsed" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setProfile(false);
          setNotificationsOpen(false);
          setQuery("");
          setMobile(false);
        }
      }}
    >
      {mobile && (
        <button
          className="ad-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="admin-sidebar"
        className={`ad-sidebar ${mobile ? "ad-sidebar-open" : ""}`}
        aria-label="Admin navigation"
      >
        <div className="ad-sidebar-header">
          <Link
            to="/admin/dashboard"
            className="ad-compact-brand"
            aria-label="MarryNest admin dashboard"
          >
            <img src={compactLogo} alt="MarryNest" width="44" height="39" />
          </Link>
          <Link
            to="/admin/dashboard"
            className="ad-brand"
            aria-label="MarryNest admin dashboard"
          >
            <img
              src="/images/marrynest-logo-320.webp"
              alt="MarryNest"
              width="160"
              height="68"
            />
          </Link>
          <button
            className="ad-icon ad-sidebar-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-controls="admin-sidebar"
            aria-expanded={!collapsed}
            onClick={toggle}
          >
            {collapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
        </div>
        <button
          className="ad-mobile-close ad-icon"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <PanelLeftClose size={20} />
        </button>
        <nav>
          {adminNavigation.map((group) => (
            <div className="ad-nav-group" key={group.label}>
              <button
                className="ad-nav-label ad-group-toggle"
                aria-expanded={!closedGroups.includes(group.label)}
                onClick={() =>
                  setClosedGroups((groups) =>
                    groups.includes(group.label)
                      ? groups.filter((label) => label !== group.label)
                      : [...groups, group.label],
                  )
                }
              >
                {group.label}
                <ChevronDown size={13} />
              </button>
              {(collapsed || !closedGroups.includes(group.label)) &&
                group.items.map(([path, label, Icon]) => {
                  const [pathname, search = ""] = path.split("?"),
                    active =
                      (pathname.includes("/pending")
                        ? location.pathname === `/admin/${pathname}`
                        : pathname === section &&
                          !location.pathname.endsWith("/pending")) &&
                      (search
                        ? Array.from(new URLSearchParams(search)).every(
                            ([key, value]) =>
                              new URLSearchParams(location.search).get(key) ===
                              value,
                          )
                        : !location.search ||
                          !location.search.includes("status="));
                  return (
                    <Link
                      key={path}
                      aria-label={label}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? label : undefined}
                      className={`ad-nav-link ${active ? "ad-nav-active" : ""} ${search ? "ad-nav-child" : ""}`}
                      to={`/admin/${path}`}
                      onClick={() => setMobile(false)}
                    >
                      <Icon size={18} strokeWidth={1.7} />
                      <span>{label}</span>
                      {path === "vendors/pending" && pendingCount !== null && (
                        <span className="va-pending-badge">{pendingCount}</span>
                      )}
                      {path === "services/pending" && serviceCount !== null && (
                        <span className="va-pending-badge">{serviceCount}</span>
                      )}
                      {path === "dashboard" && <i />}
                    </Link>
                  );
                })}
            </div>
          ))}
          <button
            className="ad-nav-link"
            onClick={async () => {
              await logout();
              navigate("/auth/login");
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>
      <div className="ad-main">
        <header className="ad-topbar">
          <div className="ad-topbar-left">
            <button
              className={`ad-icon ad-desktop-toggle ${collapsed ? "ad-show-sidebar-toggle" : ""}`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title="Open sidebar"
              aria-controls="admin-sidebar"
              aria-expanded={!collapsed}
              onClick={toggle}
            >
              {collapsed ? (
                <PanelLeftOpen size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}
            </button>
            <button
              className="ad-icon ad-mobile-toggle"
              aria-label="Open navigation"
              aria-controls="admin-sidebar"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <PanelLeftOpen size={21} />
            </button>
            <div className="ad-breadcrumb">
              Marketplace <span>/</span>{" "}
              <strong>{resourceTitle(section)}</strong>
            </div>
          </div>
          <div className="ad-topbar-right">
            <div className="ad-global-search">
              <Search size={16} />
              <input
                aria-label="Search marketplace records and pages"
                placeholder="Find a page…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setRecords([]);
                  setSearchError("");
                }}
              />
              {query && (
                <div className="ad-search-results">
                  {records.map((record) => (
                    <Link
                      key={`${record.kind}-${record.id}`}
                      to={
                        ["payments", "quotations"].includes(record.kind)
                          ? `/admin/finance/${record.kind}/${record.id}`
                          : `/admin/${record.kind}/${record.id}`
                      }
                      onClick={() => setQuery("")}
                    >
                      <Search size={15} />
                      <span>
                        {record.name}
                        <small>{record.kind}</small>
                      </span>
                    </Link>
                  ))}
                  {searchError && <p role="alert">{searchError}</p>}
                  {matches.length ? (
                    matches.map(([path, label, Icon]) => (
                      <Link
                        key={path}
                        to={`/admin/${path}`}
                        onClick={() => setQuery("")}
                      >
                        <Icon size={16} />
                        {label}
                        <ArrowUpRight size={13} />
                      </Link>
                    ))
                  ) : (
                    <p>No pages found</p>
                  )}
                </div>
              )}
            </div>
            <span className="ad-current-date">{currentDate}</span>
            <div className="ad-profile-menu">
              <button
                className="ad-icon"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell size={19} />
                {inbox?.unread > 0 && (
                  <span className="va-pending-badge">{inbox.unread}</span>
                )}
              </button>
              {notificationsOpen && (
                <div className="ad-profile-dropdown ad-notification-dropdown">
                  <strong>Your notifications</strong>
                  {inboxError && <p role="alert">{inboxError}</p>}
                  {!inbox?.rows.length && (
                    <p>
                      No notifications yet. Pending approvals and recent
                      operational events are on the dashboard.
                    </p>
                  )}
                  {inbox?.rows.map((item) => (
                    <div key={item.id}>
                      <Link
                        to={notificationLink(item)}
                        onClick={() => setNotificationsOpen(false)}
                      >
                        {item.title}
                      </Link>
                      <p>{item.message}</p>
                      <button
                        onClick={async () => {
                          try {
                            await adminRequest(
                              `/notifications/${item.id}/read`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({ read: !item.read }),
                              },
                            );
                            const result = await adminRequest(
                              "/notifications/inbox?pageSize=5",
                            );
                            setInbox(result);
                          } catch (error) {
                            setInboxError(error.message);
                          }
                        }}
                      >
                        {item.read ? "Mark unread" : "Mark read"}
                      </button>
                    </div>
                  ))}
                  <Link
                    to="/admin/notifications"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    Open notification inbox
                  </Link>
                </div>
              )}
            </div>
            <div className="ad-profile-menu">
              <button
                className="ad-profile-trigger"
                aria-expanded={profile}
                onClick={() => setProfile(!profile)}
              >
                <span className="ad-avatar">
                  {user?.firstName?.slice(0, 1)}
                </span>
                <span>
                  {user?.firstName}
                  <small>Administrator</small>
                </span>
                <ChevronDown size={12} />
              </button>
              {profile && (
                <div className="ad-profile-dropdown">
                  <Link to="/admin/profile" onClick={() => setProfile(false)}>
                    <ShieldCheck size={16} /> My profile
                  </Link>
                  <Link to="/admin/settings" onClick={() => setProfile(false)}>
                    <Settings size={16} /> Settings
                  </Link>
                  <button
                    onClick={async () => {
                      await logout();
                      navigate("/auth/login");
                    }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main-content" className="ad-content">
          <Outlet />
        </main>
        <footer className="ad-app-footer">
          <span>
            MarryNest <span>·</span> Marketplace administration
          </span>
          <span>
            <ShieldCheck size={13} /> Secure workspace
          </span>
        </footer>
      </div>
    </div>
  );
}
