
import { useEffect, useState } from "react";
import {
  Outlet,
  useLocation,
} from "react-router-dom";

import CustomerHeader from "./CustomerHeader";
import CustomerSidebar from "./CustomerSidebar";
import { useCommunicationCounts } from "../../../hooks/useCommunicationCounts";
import { customerRequest } from "../services/workspace.api";

// ============================================
// SIDEBAR STORAGE
// ============================================

const getSavedSidebarState = () => {
  try {
    return (
      window.localStorage.getItem(
        "mn-customer-collapsed"
      ) === "true"
    );
  } catch {
    return false;
  }
};

// ============================================
// CUSTOMER LAYOUT
// ============================================

export default function CustomerLayout() {
  useCommunicationCounts(customerRequest);
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(
    getSavedSidebarState
  );

  const [mobileOpen, setMobileOpen] = useState(false);

  // ============================================
  // SIDEBAR COLLAPSE
  // ============================================

  const toggleSidebar = () => {
    setCollapsed((previous) => {
      const next = !previous;

      try {
        window.localStorage.setItem(
          "mn-customer-collapsed",
          String(next)
        );
      } catch {
        // Sidebar still works without storage.
      }

      return next;
    });
  };

  // ============================================
  // CLOSE MOBILE SIDEBAR ON NAVIGATION
  // ============================================

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // ============================================
  // ESCAPE KEY + SCROLL LOCK
  // ============================================

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [mobileOpen]);

  // ============================================
  // RENDER LAYOUT
  // ============================================

  return (
    <div
      className="
        min-h-screen bg-[#f6f8f7]
        font-sans text-[13px]
        leading-relaxed text-[#2e4439]
      "
    >
      {/* ======================================
          MOBILE BACKDROP
      ====================================== */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close customer navigation"
          onClick={() => setMobileOpen(false)}
          className="
            fixed inset-0 z-[65]
            cursor-default border-0
            bg-[#1a352b]/40
            backdrop-blur-[2px]
            md:hidden
          "
        />
      )}

      {/* ======================================
          CUSTOMER SIDEBAR
      ====================================== */}

      <CustomerSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={toggleSidebar}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* ======================================
          MAIN WORKSPACE
      ====================================== */}

      <div
        className={`
          min-h-screen
          min-w-0
          transition-[margin-left]
          duration-200 ease-in-out

          ${
            collapsed
              ? "md:ml-[76px]"
              : "md:ml-[218px] xl:ml-[244px]"
          }
        `}
      >
        <CustomerHeader
          mobileOpen={mobileOpen}
          onToggleMobile={() =>
            setMobileOpen((previous) => !previous)
          }
        />

        <main
          id="main-content"
          className="
            mx-auto w-full max-w-[1700px]
            min-w-0 px-4 py-6
            sm:px-6
            lg:px-8 lg:py-7
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
