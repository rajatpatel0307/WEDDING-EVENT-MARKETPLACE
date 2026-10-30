
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import AdminHeader from "./AdminHeader.jsx";
import AdminSidebar from "./AdminSidebar.jsx";


import "../vendor-workflow.css";
import "../admin.css";


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
      className={`ad-app ${
        collapsed ? "ad-collapsed" : ""
      }`}
    >
      {/* Mobile sidebar backdrop */}
      {mobile && (
        <button
          type="button"
          className="ad-sidebar-backdrop"
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
      <div className="ad-main">
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
          className="ad-content"
        >
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="ad-app-footer">
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
