
import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  Link,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  Plus,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import { useCommunicationCounts } from "../../../hooks/useCommunicationCounts";
import { vendorRequest } from "../services/workspace.api";

import VendorHeader from "./VendorHeader";
import VendorSidebar from "./VendorSidebar";

// ============================================
// VENDOR LAYOUT
// ============================================

export default function VendorLayout() {
  useCommunicationCounts(vendorRequest);
  const { reload } = useAuth();
  const location = useLocation();

  // Sidebar state
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);

  // ============================================
  // REFRESH VENDOR ACCESS
  // ============================================

  useEffect(() => {
    const refreshVendor = () => {
      reload().catch(() => {});
    };

    window.addEventListener(
      "vendor:access-changed",
      refreshVendor
    );

    return () => {
      window.removeEventListener(
        "vendor:access-changed",
        refreshVendor
      );
    };
  }, [reload]);

  // ============================================
  // CLOSE MOBILE SIDEBAR ON NAVIGATION
  // ============================================

  useEffect(() => {
    setMobile(false);
  }, [location.pathname, location.search]);

  // ============================================
  // MOBILE SCROLL LOCK + ESCAPE KEY
  // ============================================

  useEffect(() => {
    if (!mobile) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMobile(false);
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
  }, [mobile]);

  // ============================================
  // SIDEBAR HANDLERS
  // ============================================

  const toggleSidebar = () => {
    setCollapsed((previous) => !previous);
  };

  const openMobileSidebar = () => {
    setMobile(true);
  };

  const closeMobileSidebar = () => {
    setMobile(false);
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className="
        isolate min-h-screen
        bg-[#f6f8f4]
        font-sans text-[13px]
        leading-[1.6] text-[#2e4439]
      "
    >
      {/* ======================================
          MOBILE SIDEBAR BACKDROP
      ====================================== */}

      {mobile && (
        <button
          type="button"
          aria-label="Close vendor navigation"
          onClick={closeMobileSidebar}
          className="
            fixed inset-0 z-40
            cursor-default border-0
            bg-[#1a352b]/40
            backdrop-blur-[2px]
            lg:hidden
          "
        />
      )}

      {/* ======================================
          VENDOR SIDEBAR
      ====================================== */}

      <VendorSidebar
        collapsed={collapsed}
        mobile={mobile}
        onToggleCollapse={toggleSidebar}
        onCloseMobile={closeMobileSidebar}
      />

      {/* ======================================
          MAIN WORKSPACE
      ====================================== */}

      <div
        className={`
          flex min-h-screen min-w-0
          flex-col

          transition-[margin-left]
          duration-200 ease-in-out

          ${
            collapsed
              ? "lg:ml-[76px]"
              : "lg:ml-[280px]"
          }
        `}
      >
        {/* ======================================
            VENDOR HEADER
        ====================================== */}

        <VendorHeader
          mobile={mobile}
          onOpenMobile={openMobileSidebar}
        />

        {/* ======================================
            DYNAMIC PAGE CONTENT
        ====================================== */}

        <main
          id="main-content"
          className="
            mx-auto flex w-full
            max-w-[1700px] min-w-0
            flex-1 flex-col gap-[23px]

            px-4 py-6
            sm:px-6
            lg:px-8 lg:py-7

            [&>*]:min-w-0
            [&>*]:max-w-full
          "
        >
          <Suspense
            fallback={
              <div
                role="status"
                className="
                  flex min-h-[220px]
                  items-center justify-center
                  rounded-xl
                  border border-[#e4eade]
                  bg-white p-8
                "
              >
                <div
                  className="
                    flex flex-col items-center
                    justify-center gap-3
                    text-center
                  "
                >
                  <div
                    className="
                      h-8 w-8 animate-spin
                      rounded-full
                      border-[3px]
                      border-[#e0e7dd]
                      border-t-[#245c49]
                    "
                  />

                  <p
                    className="
                      text-[12px]
                      text-[#89978c]
                    "
                  >
                    Loading your workspace...
                  </p>
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>

        {/* ======================================
            WORKSPACE FOOTER
        ====================================== */}

        <footer
          className="
            flex flex-col items-center
            justify-between gap-3
            border-t border-[#e7ece2]
            bg-white px-5 py-4

            text-center text-[11px]
            text-[#89978c]

            sm:flex-row sm:text-left
            lg:px-8
          "
        >
          <span>
            MarryNest
            <span className="mx-2 text-[#b9a276]">
              ·
            </span>
            Celebrations begin with you.
          </span>

          <span
            className="
              flex items-center gap-2
              text-[#89978c]
            "
          >
            <ShieldCheck
              size={15}
              strokeWidth={1.7}
              className="text-[#245c49]"
            />

            Secure partner workspace
          </span>
        </footer>
      </div>

      {/* ======================================
          MOBILE ADD SERVICE BUTTON
      ====================================== */}

      {!mobile && (
        <Link
          to="/vendor/services/new"
          aria-label="Add new service"
          title="Add new service"
          className="
            fixed bottom-5 right-5 z-30
            flex h-[48px] w-[48px]
            items-center justify-center
            rounded-full bg-[#617c4c]
            text-white shadow-lg

            transition-all duration-200

            hover:-translate-y-1
            hover:bg-[#245c49]
            hover:text-white

            active:scale-95
            lg:hidden
          "
        >
          <Plus size={23} strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}
