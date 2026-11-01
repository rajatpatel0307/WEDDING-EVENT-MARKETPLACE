
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
      className={`ad-sidebar w-[244px] [@media(767px<width<=1200px)]:w-[218px] fixed [inset:0_auto_0_0] [background:#fff] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eae6] z-[30] flex flex-col [transition:width_.2s_ease,_transform_.2s_ease,_visibility_.2s] [&_nav]:[padding:0_13px_20px] [&_nav]:overflow-y-auto [&_nav]:flex-1 [&_nav]:[scrollbar-width:thin] [&_nav]:[scrollbar-color:#dfe7e1_transparent] [@media(width<=767px)]:[transform:translateX(-100%)] [@media(width<=767px)]:invisible [@media(width<=767px)]:[&.ad-sidebar-open]:[transform:translateX(0)] [@media(width<=767px)]:[&.ad-sidebar-open]:visible ${mobile ? "ad-sidebar-open" : ""}`}
      aria-label="Admin navigation"
    >
      {/* Sidebar Header */}
      <div className="ad-sidebar-header h-[86px] shrink-0 flex items-center gap-[12px] [padding:14px_16px] [&_.ad-brand]:p-[0]! [&_.ad-brand]:h-auto [&_.ad-brand]:flex-1 [&_.ad-brand]:min-w-0 [&_.ad-brand]:block [&_.ad-brand_img]:block [&_.ad-brand_img]:w-full [&_.ad-brand_img]:max-w-[160px] [&_.ad-brand_img]:h-auto [&_.ad-brand_img]:object-contain [@media(width<=767px)]:pr-[57px]">
        <Link
          to="/admin/dashboard"
          className="ad-compact-brand hidden [&_img]:block [&_img]:w-[44px] [&_img]:h-[39px] [&_img]:object-contain [&_img]:rounded-[7px]"
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
          className="ad-brand h-[86px] flex items-center gap-[10px] [padding:21px_23px] shrink-0 [&_>_span]:h-[38px] [&_>_span]:w-[38px] [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:text-[var(--ad-teal)] [&_>_span]:[background:#eaf2ee] [&_>_span]:rounded-[12px] [&_>_span]:shrink-0 [&_strong]:[font-family:Georgia,_serif] [&_strong]:text-[24px] [@media(width<=1200px)]:[&_strong]:text-[22px] [&_strong]:font-[500] [&_strong]:tracking-[-0.6px] [&_strong]:flex [&_strong]:items-center [&_strong]:gap-[9px] [&_strong_span]:[font:9px_Inter,_sans-serif] [&_strong_span]:tracking-[1.2px] [&_strong_span]:text-[#ab9062] [&_strong_span]:[background:#f7f3eb] [&_strong_span]:rounded-[3px] [&_strong_span]:[padding:3px_5px] [&_small]:text-[8px] [@media(width<=1200px)]:[&_small]:text-[7px] [&_small]:text-[#87958f] [&_small]:whitespace-nowrap [@media(width<=1200px)]:pl-[17px]"
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
          className="ad-icon ad-sidebar-toggle inline-flex [@media(width<=767px)]:hidden justify-center items-center w-[29px] h-[29px] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] [background:none] text-[#84958a] rounded-[6px] shrink-0 [&:hover]:[background:#eef3ee] [&:hover]:text-[#176b60] [&.ad-approve]:[background:#edf6ee] [&.ad-approve]:text-[#5d9270] [&.ad-reject]:[background:#fcf1ee] [&.ad-reject]:text-[#bc7f70]"
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
        className="ad-mobile-close ad-icon hidden [@media(width<=767px)]:inline-flex [@media(width<=767px)]:absolute [@media(width<=767px)]:right-[16px] [@media(width<=767px)]:top-[28px] justify-center items-center w-[29px] h-[29px] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] [background:none] text-[#84958a] rounded-[6px] shrink-0 [&:hover]:[background:#eef3ee] [&:hover]:text-[#176b60] [&.ad-approve]:[background:#edf6ee] [&.ad-approve]:text-[#5d9270] [&.ad-reject]:[background:#fcf1ee] [&.ad-reject]:text-[#bc7f70]"
        aria-label="Close navigation"
        onClick={onCloseMobile}
      >
        <PanelLeftClose size={20} />
      </button>

      {/* Sidebar Navigation */}
      <nav>
        {adminNavigation.map((group) => (
          <div
            className="ad-nav-group mb-[15px]"
            key={group.label}
          >
            {/* Static group heading, no dropdown */}
            <div className="ad-nav-label [padding:9px_11px_7px] flex items-center justify-between tracking-[1.4px] text-[8px] text-[#9ba69f] w-full [background:none] [border-top-width:0] [border-top-style:none] [border-top-color:currentColor] [border-right-width:0] [border-right-style:none] [border-right-color:currentColor] [border-bottom-width:0] [border-bottom-style:none] [border-bottom-color:currentColor] [border-left-width:0] [border-left-style:none] [border-left-color:currentColor]">
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
                    className={`ad-nav-link flex items-center gap-[11px] [padding:9px_12px] rounded-[7px] [margin:2px_0] text-[#738078] text-[11px] relative whitespace-nowrap [&:hover]:[background:#f4f7f4] [&_i]:h-[5px] [&_i]:w-[5px] [&_i]:ml-[auto] [&_i]:[background:#176b60] [&_i]:rounded-[50%] ${active ? "ad-nav-active [&.ad-nav-active]:[background:#e9f2ec]! [&.ad-nav-active]:text-[#176b60]! [&.ad-nav-active]:font-[600] [&.ad-nav-active:before]:[content:''] [&.ad-nav-active:before]:w-[3px] [&.ad-nav-active:before]:h-[18px] [&.ad-nav-active:before]:[background:#176b60] [&.ad-nav-active:before]:rounded-[3px] [&.ad-nav-active:before]:absolute [&.ad-nav-active:before]:left-[-13px]" : ""}  ${search ? "ad-nav-child [&.ad-nav-child]:pl-[31px] [&.ad-nav-child]:text-[10px] [&.ad-nav-child_svg]:w-[13px]" : ""}`}
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
                        <span className="va-pending-badge inline-flex items-center justify-center [background:#e8f0e1] text-[#567d47] text-[9px] rounded-[5px] [padding:1px_5px] ml-[auto]">
                          {pendingCount}
                        </span>
                      )}

                    {/* Pending Service Badge */}
                    {path === "services/pending" &&
                      serviceCount !== null && (
                        <span className="va-pending-badge inline-flex items-center justify-center [background:#e8f0e1] text-[#567d47] text-[9px] rounded-[5px] [padding:1px_5px] ml-[auto]">
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
          className="ad-nav-link flex items-center gap-[11px] [padding:9px_12px] rounded-[7px] [margin:2px_0] text-[#738078] text-[11px] relative whitespace-nowrap [&:hover]:[background:#f4f7f4] [&_i]:h-[5px] [&_i]:w-[5px] [&_i]:ml-[auto] [&_i]:[background:#176b60] [&_i]:rounded-[50%]"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}
