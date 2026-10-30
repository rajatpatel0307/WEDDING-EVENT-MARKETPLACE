
import { useEffect, useState } from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";

import { adminNavigation } from "../navigation";

import { adminRequest } from "../api";

import { vendorChangedEvent } from "../vendor-workflow";

import compactLogo from "../../../assets/small logo.png";


// Check whether the navigation link is active
function isActivePage(path, location, section) {
  const [pathname, search = ""] = path.split("?");

  const isMatchingRoute = pathname.includes("/pending")
    ? location.pathname === `/admin/${pathname}`
    : pathname === section &&
      !location.pathname.endsWith("/pending");

  if (!isMatchingRoute) return false;

  const currentQuery = new URLSearchParams(
    location.search
  );

  if (search) {
    return Array.from(
      new URLSearchParams(search)
    ).every(
      ([key, value]) =>
        currentQuery.get(key) === value
    );
  }

  return !currentQuery.has("status");
}

export default function AdminSidebar({
  collapsed,
  mobile,
  onToggleCollapse,
  onCloseMobile,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [pendingCount, setPendingCount] = useState(null);
  const [serviceCount, setServiceCount] = useState(null);

  const segments = location.pathname.split("/");

  const section =
    segments[2] === "finance"
      ? segments[3]
      : segments[2] || "dashboard";

  // Load pending service approval count
  useEffect(() => {
    const abort = new AbortController();

    const refreshCount = () => {
      adminRequest("/services/pending-count", {
        signal: abort.signal,
      })
        .then((result) => {
          setServiceCount(result.pendingCount);
        })
        .catch(() => {});
    };

    refreshCount();

    window.addEventListener(
      "marrynest:service-decision",
      refreshCount
    );

    window.addEventListener(
      "focus",
      refreshCount
    );

    return () => {
      abort.abort();

      window.removeEventListener(
        "marrynest:service-decision",
        refreshCount
      );

      window.removeEventListener(
        "focus",
        refreshCount
      );
    };
  }, []);

  // Load pending vendor approval count
  useEffect(() => {
    const abort = new AbortController();

    const refreshCount = () => {
      adminRequest("/vendors/pending-count", {
        signal: abort.signal,
      })
        .then((result) => {
          setPendingCount(result.data.pendingCount);
        })
        .catch(() => {});
    };

    refreshCount();

    window.addEventListener(
      vendorChangedEvent,
      refreshCount
    );

    window.addEventListener(
      "focus",
      refreshCount
    );

    return () => {
      abort.abort();

      window.removeEventListener(
        vendorChangedEvent,
        refreshCount
      );

      window.removeEventListener(
        "focus",
        refreshCount
      );
    };
  }, []);

  // Logout administrator
  const handleLogout = async () => {
    await logout();
    onCloseMobile();
    navigate("/auth/login");
  };

  return (
    <aside
      id="admin-sidebar"
      className={`ad-sidebar ${
        mobile ? "ad-sidebar-open" : ""
      }`}
      aria-label="Admin navigation"
    >
      {/* Sidebar Header */}
      <div className="ad-sidebar-header">
        <Link
          to="/admin/dashboard"
          className="ad-compact-brand"
          aria-label="MarryNest admin dashboard"
          onClick={onCloseMobile}
        >
          <img
            src={compactLogo}
            alt="MarryNest"
            width="44"
            height="39"
          />
        </Link>

        <Link
          to="/admin/dashboard"
          className="ad-brand"
          aria-label="MarryNest admin dashboard"
          onClick={onCloseMobile}
        >
          <img
            src="/images/marrynest-logo-320.webp"
            alt="MarryNest"
            width="160"
            height="68"
          />
        </Link>

        {/* Desktop Sidebar Toggle */}
        <button
          type="button"
          className="ad-icon ad-sidebar-toggle"
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          aria-controls="admin-sidebar"
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
        </button>
      </div>

      {/* Mobile Sidebar Close */}
      <button
        type="button"
        className="ad-mobile-close ad-icon"
        aria-label="Close navigation"
        onClick={onCloseMobile}
      >
        <PanelLeftClose size={20} />
      </button>

      {/* Sidebar Navigation */}
      <nav>
        {adminNavigation.map((group) => (
          <div
            className="ad-nav-group"
            key={group.label}
          >
            {/* Static group heading, no dropdown */}
            <div className="ad-nav-label">
              {group.label}
            </div>

            {/* All links always visible */}
            {group.items.map(
              ([path, label, Icon]) => {
                const active = isActivePage(
                  path,
                  location,
                  section
                );

                const [, search = ""] =
                  path.split("?");

                return (
                  <Link
                    key={path}
                    aria-label={label}
                    aria-current={
                      active ? "page" : undefined
                    }
                    title={
                      collapsed ? label : undefined
                    }
                    className={`ad-nav-link ${
                      active ? "ad-nav-active" : ""
                    } ${
                      search ? "ad-nav-child" : ""
                    }`}
                    to={`/admin/${path}`}
                    onClick={onCloseMobile}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.7}
                    />

                    <span>{label}</span>

                    {/* Pending Vendor Badge */}
                    {path === "vendors/pending" &&
                      pendingCount !== null && (
                        <span className="va-pending-badge">
                          {pendingCount}
                        </span>
                      )}

                    {/* Pending Service Badge */}
                    {path === "services/pending" &&
                      serviceCount !== null && (
                        <span className="va-pending-badge">
                          {serviceCount}
                        </span>
                      )}

                    {path === "dashboard" && <i />}
                  </Link>
                );
              }
            )}
          </div>
        ))}

        {/* Logout */}
        <button
          type="button"
          className="ad-nav-link"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}
