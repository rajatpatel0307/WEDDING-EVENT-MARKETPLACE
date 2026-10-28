import { Suspense, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  ChevronsLeft,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { vendorNavigation, vendorTitle } from "../navigation";
import compactLogo from "../../../assets/small logo.png";
import "../vendor.css";
export default function VendorLayout() {
  const { user, reload } = useAuth(),
    location = useLocation();
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState("");
  const current = location.pathname.replace(/^\/vendor\/?/, "") || "dashboard";
  const navigationKey =
    current === "services"
      ? current +
        (new URLSearchParams(location.search).get("approval")
          ? `?approval=${new URLSearchParams(location.search).get("approval")}`
          : "")
      : current;
  useEffect(() => {
    const changed = () => reload().catch(() => {});
    window.addEventListener("vendor:access-changed", changed);
    return () => window.removeEventListener("vendor:access-changed", changed);
  }, [reload]);
  const matches = query.trim()
    ? vendorNavigation
        .flatMap((g) => g.items)
        .filter(([, label]) =>
          label.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 6)
    : [];
  return (
    <div className={`vw-app ${collapsed ? "vw-collapsed" : ""}`}>
      {mobile && (
        <button
          className="vw-sidebar-backdrop"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={`vw-sidebar ${mobile ? "vw-sidebar-open" : ""}`}
        aria-label="Vendor navigation"
      >
        <div className="vw-brand">
          <Link
            to="/vendor/dashboard"
            className="vw-sidebar-logo"
            aria-label="MarryNest vendor dashboard"
          >
            <img
              className="vw-full-logo"
              src="/images/marrynest-logo-320.webp"
              alt="MarryNest"
              width="160"
              height="68"
            />
            <img
              className="vw-compact-logo"
              src={compactLogo}
              alt="MarryNest"
              width="44"
              height="39"
            />
          </Link>
          <button
            className="vw-icon vw-mobile-close"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <nav>
          {vendorNavigation.map((group) => (
            <div className="vw-nav-group" key={group.label}>
              <h2>{group.label}</h2>
              {group.items.map(([path, label, Icon]) => (
                <Link
                  key={path}
                  title={collapsed ? label : undefined}
                  to={`/vendor/${path}`}
                  className={navigationKey === path ? "active" : ""}
                  aria-current={navigationKey === path ? "page" : undefined}
                  onClick={() => setMobile(false)}
                >
                  <Icon size={17} strokeWidth={1.65} />
                  <span>{label}</span>
                  {path === "messages" && user.unreadMessageCount > 0 && (
                    <em>{user.unreadMessageCount}</em>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="vw-main">
        <header className="vw-topbar">
          <div className="vw-topbar-left">
            <button
              className="vw-icon vw-desktop-toggle"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={
                collapsed ? "Expand navigation" : "Collapse navigation"
              }
            >
              <ChevronsLeft size={19} />
            </button>
            <button
              className="vw-icon vw-mobile-toggle"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span>
              Partner workspace <span>/</span>{" "}
              <strong>{vendorTitle(current)}</strong>
            </span>
          </div>
          <div className="vw-topbar-right">
            <div className="vw-search">
              <Search size={16} />
              <input
                aria-label="Find a vendor page"
                placeholder="Find a page…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <div className="vw-search-results">
                  {matches.length ? (
                    matches.map(([path, label, Icon]) => (
                      <Link
                        key={path}
                        to={`/vendor/${path}`}
                        onClick={() => setQuery("")}
                      >
                        <Icon size={15} />
                        {label}
                      </Link>
                    ))
                  ) : (
                    <span>No matching pages</span>
                  )}
                </div>
              )}
            </div>
            <Link
              to="/vendor/notifications"
              className="vw-notification-icon"
              aria-label="Notifications"
            >
              <Bell size={19} />
              {user.unreadNotificationCount > 0 && <i />}
            </Link>
            <span className="vw-topbar-divider" />
            <Link to="/vendor/business/profile" className="vw-owner">
              <span>{user.firstName?.[0]}</span>
              <div>
                <strong>{user.firstName}</strong>
                <small>Business owner</small>
              </div>
              <ChevronDown size={12} />
            </Link>
          </div>
        </header>
        <main className="vw-content" id="main-content">
          <Suspense
            fallback={
              <div className="vw-loading" role="status">
                Loading your workspace...
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
        <footer className="vw-footer">
          <span>
            MarryNest <span>·</span> Celebrations begin with you.
          </span>
          <span>
            <ShieldCheck size={12} /> Secure partner workspace
          </span>
        </footer>
      </div>
      <Link
        className="vw-mobile-add"
        to="/vendor/services/new"
        aria-label="Add service"
      >
        <Plus size={23} />
      </Link>
    </div>
  );
}
