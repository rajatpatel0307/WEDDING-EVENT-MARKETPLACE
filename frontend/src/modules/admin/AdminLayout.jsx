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
  const [pendingCount, setPendingCount] = useState(null);
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
  const section = location.pathname.split("/")[2] || "dashboard";
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
    <div className={`ad-app ${collapsed ? "ad-collapsed" : ""}`}>
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
              <h2 className="ad-nav-label">{group.label}</h2>
              {group.items.map(([path, label, Icon]) => {
                const [pathname, search = ""] = path.split("?"),
                  active =
                    (pathname === "vendors/pending"
                      ? location.pathname === "/admin/vendors/pending"
                      : pathname === section &&
                        location.pathname !== "/admin/vendors/pending") &&
                    (search
                      ? location.search === `?${search}`
                      : !location.search ||
                        !location.search.includes("status="));
                return (
                  <Link
                    key={path}
                    aria-label={label}
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
                    {path === "dashboard" && <i />}
                  </Link>
                );
              })}
            </div>
          ))}
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
                aria-label="Find an admin page"
                placeholder="Find a page…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <div className="ad-search-results">
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
            <Link
              className="ad-icon"
              aria-label="View notifications"
              to="/admin/notifications"
            >
              <Bell size={19} />
            </Link>
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
