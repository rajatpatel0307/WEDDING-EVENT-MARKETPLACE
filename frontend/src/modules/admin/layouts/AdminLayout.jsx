
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import AdminHeader from "./AdminHeader.jsx";
import AdminSidebar from "./AdminSidebar.jsx";




const getSavedSidebarState = () => {
  try {
    return (
      window.localStorage.getItem("mn-admin-collapsed") ===
      "true"
    );
  } catch {
    return false;
  }
};

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(
    getSavedSidebarState
  );

  const [mobile, setMobile] = useState(false);

  // Toggle desktop sidebar
  const toggleSidebar = () => {
    setCollapsed((previous) => {
      const next = !previous;

      try {
        window.localStorage.setItem(
          "mn-admin-collapsed",
          String(next)
        );
      } catch {
        // Sidebar remains functional without storage.
      }

      return next;
    });
  };

  // Close mobile sidebar using Escape
  useEffect(() => {
    if (!mobile) return;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setMobile(false);
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () =>
      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
  }, [mobile]);

  return (
    <div
      className={`ad-app [--ad-teal:#176b60] [--ad-gold:#b49661] [--ad-ink:#263d37] [--ad-muted:#82918b] min-h-[100vh] [background:#f6f8f7] text-[var(--ad-ink)] [font-family:Inter,_'Segoe_UI',_sans-serif] text-[13px] leading-[1.55] isolate [&_:where(h1)]:[font-family:Inter,_'Segoe_UI',_sans-serif] [&_:where(h1)]:tracking-[-0.5px] [&_:where(h1)]:font-[600] [&_:where(h1)]:text-[#253d36] [&_:where(h2)]:[font-family:Inter,_'Segoe_UI',_sans-serif] [&_:where(h2)]:tracking-[-0.5px] [&_:where(h2)]:font-[600] [&_:where(h2)]:text-[#253d36] [&_:where(h1)]:text-[28px] [@media(width<=767px)]:[&_:where(h1)]:text-[24px] [@media(767px<width<=1000px)]:[&_:where(h1)]:text-[23px] [&_:where(h1)]:leading-[1.25] [&_:where(h1)]:[margin:9px_0] [&_:where(h2)]:text-[15px] [&_:where(h2)]:leading-[1.5] [&_:where(h2)]:m-[0] [&_:where(p)]:text-[#819089] [&_:where(p)]:text-[12px] [&_a:hover]:text-[var(--ad-teal)] [&_button]:font-[500] [&_:where(input)]:[font:inherit] [&_:where(input)]:text-[#354a43] [&_:where(input)]:[background:white] [&_:where(input)]:[border-top-width:1px] [&_:where(input)]:[border-top-style:solid] [&_:where(input)]:[border-top-color:#e0e8e3] [&_:where(input)]:[border-right-width:1px] [&_:where(input)]:[border-right-style:solid] [&_:where(input)]:[border-right-color:#e0e8e3] [&_:where(input)]:[border-bottom-width:1px] [&_:where(input)]:[border-bottom-style:solid] [&_:where(input)]:[border-bottom-color:#e0e8e3] [&_:where(input)]:[border-left-width:1px] [&_:where(input)]:[border-left-style:solid] [&_:where(input)]:[border-left-color:#e0e8e3] [&_:where(input)]:rounded-[7px] [&_:where(input)]:[padding:9px_11px] [&_:where(input)]:min-w-0 [&_:where(input)]:[box-shadow:none] [&_:where(input)]:m-[0] [&_:where(input)]:w-auto [&_:where(select)]:[font:inherit] [&_:where(select)]:text-[#354a43] [&_:where(select)]:[background:white] [&_:where(select)]:[border-top-width:1px] [&_:where(select)]:[border-top-style:solid] [&_:where(select)]:[border-top-color:#e0e8e3] [&_:where(select)]:[border-right-width:1px] [&_:where(select)]:[border-right-style:solid] [&_:where(select)]:[border-right-color:#e0e8e3] [&_:where(select)]:[border-bottom-width:1px] [&_:where(select)]:[border-bottom-style:solid] [&_:where(select)]:[border-bottom-color:#e0e8e3] [&_:where(select)]:[border-left-width:1px] [&_:where(select)]:[border-left-style:solid] [&_:where(select)]:[border-left-color:#e0e8e3] [&_:where(select)]:rounded-[7px] [&_:where(select)]:[padding:9px_11px] [&_:where(select)]:min-w-0 [&_:where(select)]:[box-shadow:none] [&_:where(select)]:m-[0] [&_:where(select)]:w-auto [&_:where(textarea)]:[font:inherit] [&_:where(textarea)]:text-[#354a43] [&_:where(textarea)]:[background:white] [&_:where(textarea)]:[border-top-width:1px] [&_:where(textarea)]:[border-top-style:solid] [&_:where(textarea)]:[border-top-color:#e0e8e3] [&_:where(textarea)]:[border-right-width:1px] [&_:where(textarea)]:[border-right-style:solid] [&_:where(textarea)]:[border-right-color:#e0e8e3] [&_:where(textarea)]:[border-bottom-width:1px] [&_:where(textarea)]:[border-bottom-style:solid] [&_:where(textarea)]:[border-bottom-color:#e0e8e3] [&_:where(textarea)]:[border-left-width:1px] [&_:where(textarea)]:[border-left-style:solid] [&_:where(textarea)]:[border-left-color:#e0e8e3] [&_:where(textarea)]:rounded-[7px] [&_:where(textarea)]:[padding:9px_11px] [&_:where(textarea)]:min-w-0 [&_:where(textarea)]:[box-shadow:none] [&_:where(textarea)]:m-[0] [&_:where(textarea)]:w-auto [&_:where(input):focus]:[outline:2px_solid_#a7c5bd] [&_:where(input):focus]:[outline-offset:1px] [&_:where(input):focus]:[border-top-color:#a7c5bd] [&_:where(input):focus]:[border-right-color:#a7c5bd] [&_:where(input):focus]:[border-bottom-color:#a7c5bd] [&_:where(input):focus]:[border-left-color:#a7c5bd] [&_:where(select):focus]:[outline:2px_solid_#a7c5bd] [&_:where(select):focus]:[outline-offset:1px] [&_:where(select):focus]:[border-top-color:#a7c5bd] [&_:where(select):focus]:[border-right-color:#a7c5bd] [&_:where(select):focus]:[border-bottom-color:#a7c5bd] [&_:where(select):focus]:[border-left-color:#a7c5bd] [&_:focus-visible]:[outline:2px_solid_#70a99b] [&_:focus-visible]:[outline-offset:3px] motion-reduce:[&_*]:[transition:none]! motion-reduce:[&_*]:[animation:none]! [&_.ad-nav-label]:block [&_.ad-nav-label]:[padding:13px_12px_8px] [&_.ad-nav-label]:m-[0] [&_.ad-nav-label]:text-[#7b8d81] [&_.ad-nav-label]:text-[9px] [&_.ad-nav-label]:font-[600] [&_.ad-nav-label]:leading-[1.5] [&_.ad-nav-label]:tracking-[1.3px] [&_.cd-name-row_:where(h1)]:text-[28px] [@media(width<=600px)]:[&_.cd-name-row_:where(h1)]:text-[22px] [&_.cd-name-row_:where(h1)]:m-[0] [&_.cd-name-row_:where(h1)]:[overflow-wrap:anywhere] [&_.cd-section-heading_:where(h2)]:text-[17px] [&_.cd-section-heading_:where(p)]:[margin:4px_0_0] [&_.cd-timeline_:where(p)]:text-[10px] [&_.cd-timeline_:where(p)]:[margin:3px_0] [&_.cd-timeline_:where(p)]:[overflow-wrap:anywhere] [&_.cd-address_:where(p)]:leading-[1.9] [&_.cd-address_:where(p)]:text-[#627668] [@media(width<=600px)]:[&_.cd-name-row_:where(h1)]:w-full [&_.vd-identity_:where(h1)]:text-[26px] [@media(width<=600px)]:[&_.vd-identity_:where(h1)]:text-[21px] [&_.vd-identity_:where(h1)]:[margin:5px_0_9px] [&_.vd-identity_:where(h1)]:[overflow-wrap:anywhere] [&_.vd-earnings_>_:where(p)]:text-[10px] [&_.vd-earnings_>_:where(p)]:leading-[1.7] [&_.vd-earnings_>_:where(p)]:[margin:0_0_20px] ${collapsed ? "ad-collapsed [&.ad-collapsed_.ad-sidebar]:w-[64px] [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar]:w-[244px] [&.ad-collapsed_.ad-main]:ml-[64px] [@media(width<=767px)]:[&.ad-collapsed_.ad-main]:ml-[0] [&.ad-collapsed_.ad-brand]:[padding:20px_18px] [@media(width<=767px)]:[&.ad-collapsed_.ad-brand]:[padding:21px_23px] [&.ad-collapsed_.ad-brand_>_div]:hidden [@media(width<=767px)]:[&.ad-collapsed_.ad-brand_>_div]:[display:revert] [&.ad-collapsed_.ad-workspace-switch]:hidden [@media(width<=767px)]:[&.ad-collapsed_.ad-workspace-switch]:flex [&.ad-collapsed_.ad-nav-label]:hidden [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-label]:block [&.ad-collapsed_.ad-nav-link_span]:hidden [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-link_span]:[display:revert] [&.ad-collapsed_.ad-nav-link_i]:hidden [&.ad-collapsed_.ad-site-link_span]:hidden [@media(width<=767px)]:[&.ad-collapsed_.ad-site-link_span]:[display:revert] [&.ad-collapsed_.ad-sidebar-profile_>_div]:hidden [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar-profile_>_div]:[display:revert] [&.ad-collapsed_.ad-sidebar-profile_>_.ad-online-dot]:hidden [&.ad-collapsed_.ad-nav-group]:mb-[12px] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:mb-[15px] [&.ad-collapsed_.ad-nav-group]:[border-bottom-width:1px] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-bottom-width:0] [&.ad-collapsed_.ad-nav-group]:[border-bottom-style:solid] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-bottom-style:none] [&.ad-collapsed_.ad-nav-group]:[border-bottom-color:#edf1e8] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-bottom-color:currentColor] [&.ad-collapsed_.ad-nav-group]:pb-[8px] [&.ad-collapsed_.ad-nav-link]:justify-center [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-link]:justify-start [&.ad-collapsed_.ad-nav-link]:p-[10px] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-link]:[padding:9px_12px] [&.ad-collapsed_.ad-nav-child]:p-[8px] [&.ad-collapsed_.ad-nav-child_svg]:w-[14px] [&.ad-collapsed_.ad-sidebar-bottom]:[padding:15px_21px] [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar-bottom]:[padding:12px_18px_17px] [&.ad-collapsed_.ad-sidebar]:[transform:translateX(0)] [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar]:[transform:translateX(-100%)] [&.ad-collapsed_.ad-sidebar]:visible [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar]:invisible [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-top-width:0] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-top-style:none] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-top-color:currentColor] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-right-width:0] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-right-style:none] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-right-color:currentColor] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-left-width:0] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-left-style:none] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:[border-left-color:currentColor] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-group]:p-[0] [@media(width<=767px)]:[&.ad-collapsed_.ad-nav-child]:pl-[31px] [&.ad-collapsed_.ad-compact-brand]:flex [@media(width<=767px)]:[&.ad-collapsed_.ad-compact-brand]:hidden [&.ad-collapsed_.ad-compact-brand]:shrink-0 [&.ad-collapsed_.ad-sidebar-header]:h-[108px] [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar-header]:h-[86px] [&.ad-collapsed_.ad-sidebar-header]:[padding:12px_0] [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar-header]:[padding:14px_57px_14px_16px] [&.ad-collapsed_.ad-sidebar-header]:justify-center [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar-header]:justify-start [&.ad-collapsed_.ad-sidebar-header]:flex-col [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar-header]:flex-row [&.ad-collapsed_.ad-sidebar-header]:gap-[9px] [&.ad-collapsed_.ad-sidebar-header_.ad-brand]:hidden [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar-header_.ad-brand]:block [&.ad-collapsed_.ad-sidebar_nav]:pl-[8px] [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar_nav]:pl-[13px] [&.ad-collapsed_.ad-sidebar_nav]:pr-[8px] [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar_nav]:pr-[13px] [&.ad-collapsed_.ad-nav-active:before]:left-[-8px] [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar.ad-sidebar-open]:[transform:translateX(0)] [@media(width<=767px)]:[&.ad-collapsed_.ad-sidebar.ad-sidebar-open]:visible" : ""}`}
    >
      {/* Mobile sidebar backdrop */}
      {mobile && (
        <button
          type="button"
          className="ad-sidebar-backdrop hidden [@media(width<=767px)]:block [@media(width<=767px)]:fixed [@media(width<=767px)]:[inset:0] [@media(width<=767px)]:[border-top-width:0] [@media(width<=767px)]:[border-top-style:none] [@media(width<=767px)]:[border-top-color:currentColor] [@media(width<=767px)]:[border-right-width:0] [@media(width<=767px)]:[border-right-style:none] [@media(width<=767px)]:[border-right-color:currentColor] [@media(width<=767px)]:[border-bottom-width:0] [@media(width<=767px)]:[border-bottom-style:none] [@media(width<=767px)]:[border-bottom-color:currentColor] [@media(width<=767px)]:[border-left-width:0] [@media(width<=767px)]:[border-left-style:none] [@media(width<=767px)]:[border-left-color:currentColor] [@media(width<=767px)]:[background:#173d3366] [@media(width<=767px)]:z-[29] [@media(width<=767px)]:w-full [@media(width<=767px)]:h-full"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}

      {/* Admin Sidebar */}
      <AdminSidebar
        collapsed={collapsed}
        mobile={mobile}
        onToggleCollapse={toggleSidebar}
        onCloseMobile={() => setMobile(false)}
      />

      {/* Main Application */}
      <div className="ad-main ml-[244px] [@media(width<=767px)]:ml-[0] [@media(767px<width<=1200px)]:ml-[218px] min-w-0 [transition:margin_0.2s]">
        {/* Admin Header */}
        <AdminHeader
          collapsed={collapsed}
          mobile={mobile}
          onToggleCollapse={toggleSidebar}
          onOpenMobile={() => setMobile(true)}
        />

        {/* Dynamic Admin Pages */}
        <main
          id="main-content"
          className="ad-content [padding:30px_32px] [@media(width<=767px)]:[padding:23px_16px] [@media(767px<width<=1200px)]:[padding:25px_22px] [@media(width>=1500px)]:[padding:35px_42px] max-w-[1700px] [margin:0_auto] flex flex-col gap-[24px] [@media(width<=767px)]:gap-[20px] [@media(width>=1500px)]:gap-[26px]"
        >
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="ad-app-footer [padding:10px_32px_25px] [@media(width<=767px)]:[padding:0_16px_20px] max-w-[1700px] m-[auto] flex justify-between gap-[15px] text-[#a2ad99] text-[9px] [@media(width<=767px)]:text-[8px] [&_>_span:last-child]:flex [&_>_span:last-child]:gap-[6px] [&_>_span:last-child]:items-center [&_>_span_>_span]:[margin:0_7px] [@media(width<=767px)]:flex-wrap">
          <span>
            MarryNest <span>·</span>
            Marketplace administration
          </span>

          <span>
            <ShieldCheck size={13} />
            Secure workspace
          </span>
        </footer>
      </div>
    </div>
  );
}
