import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  CalendarHeart,
  Search,
  ShoppingBag,
  FileText,
  Heart,
  MessagesSquare,
  Bell,
  Wallet,
  Star,
  MapPin,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCommunicationCounts } from "../../hooks/useCommunicationCounts";
import { customerRequest } from "./services/workspace.api";
import "./customer.css";
const navigation = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["profile", "My Profile", UserRound],
  ["events", "My Events", CalendarHeart],
  ["discover", "Find Services", Search],
  ["bookings", "My Bookings", ShoppingBag],
  ["quotations", "My Quotations", FileText],
  ["wishlist", "Wishlist", Heart],
  ["messages", "Messages", MessagesSquare],
  ["notifications", "Notifications", Bell],
  ["payments", "Payments", Wallet],
  ["reviews", "Reviews", Star],
  ["addresses", "Addresses", MapPin],
  ["settings", "Settings", Settings],
];
const top = [
  ["Home", "/"],
  ["Services", "/customer/discover"],
  ["Vendors", "/customer/discover?type=vendors"],
  ["Venues", "/customer/discover?venue=1"],
  ["Packages", "/customer/discover?type=packages"],
  ["Offers", "/customer/discover?type=offers"],
  ["My Events", "/customer/events"],
];
export default function CustomerLayout() {
  useCommunicationCounts(customerRequest);
  const { user, logout, notify } = useAuth(),
    [open, setOpen] = useState(false),
    [profile, setProfile] = useState(false),
    [collapsed, setCollapsed] = useState(
      () => localStorage.getItem("mn-customer-collapsed") === "true",
    ),
    location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    setOpen(false);
    setProfile(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  function toggleSidebar() {
    setCollapsed((value) => {
      localStorage.setItem("mn-customer-collapsed", String(!value));
      return !value;
    });
  }
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setProfile(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  const groups = [
    { label: "WORKSPACE", items: navigation.slice(0, 1) },
    { label: "PLAN YOUR CELEBRATION", items: navigation.slice(1, 7) },
    { label: "COMMUNICATION", items: navigation.slice(7, 9) },
    { label: "MY ACCOUNT", items: navigation.slice(9) },
  ];
  return (
    <div
      className={`cw-app customer-workspace ${collapsed ? "cw-sidebar-collapsed" : ""}`}
    >
      <header className="cw-customer-nav">
        <Link
          to="/customer/dashboard"
          className="cw-navbar-brand"
          aria-label="MarryNest customer dashboard"
        >
          <img
            src="/images/marrynest-logo-320.webp"
            alt="MarryNest"
            width="160"
            height="68"
          />
        </Link>
        <nav aria-label="Marketplace navigation">
          {top.map(([name, path]) => (
            <Link key={name} to={path}>
              {name}
            </Link>
          ))}
        </nav>
        <div className="cw-nav-actions">
          <Link to="/customer/wishlist" aria-label="Wishlist">
            <Heart size={19} />
          </Link>
          <Link to="/customer/messages" aria-label="Messages">
            <MessagesSquare size={19} />
          </Link>
          <Link to="/customer/notifications" aria-label="Notifications">
            <Bell size={19} />
          </Link>
          <div className="cw-profile-menu">
            <button
              onClick={() => setProfile(!profile)}
              aria-expanded={profile}
              aria-label="Open profile menu"
              className="cw-avatar-button"
            >
              {user.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="" />
              ) : (
                <span>{user.firstName?.[0]}</span>
              )}
              <ChevronDown size={13} />
            </button>
            {profile && (
              <div className="cw-profile-dropdown">
                {[
                  ["My Profile", "profile"],
                  ["My Addresses", "addresses"],
                  ["My Bookings", "bookings"],
                  ["My Quotations", "quotations"],
                  ["Payments", "payments"],
                ].map(([n, p]) => (
                  <Link
                    key={p}
                    to={`/customer/${p}`}
                    onClick={() => setProfile(false)}
                  >
                    {n}
                  </Link>
                ))}
                <button
                  onClick={async () => {
                    try {
                      await logout();
                      navigate("/auth/login");
                    } catch (e) {
                      notify(e.message);
                    }
                  }}
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
          <button
            className="cw-mobile-menu cw-icon"
            onClick={() => setOpen(!open)}
            aria-controls="customer-sidebar"
            aria-label="Toggle dashboard navigation"
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {open && (
        <button
          className="cw-sidebar-shade"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        id="customer-sidebar"
        className={`cw-customer-sidebar ${open ? "open" : ""}`}
        aria-label="Customer navigation"
      >
        <div className="cw-sidebar-header">
          <strong className="cw-sidebar-title">Your workspace</strong>
          <button
            className="cw-icon cw-sidebar-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-controls="customer-sidebar"
            aria-expanded={!collapsed}
            onClick={toggleSidebar}
          >
            {collapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
          <button
            className="cw-icon cw-sidebar-mobile-close"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <PanelLeftClose size={20} />
          </button>
        </div>
        <nav aria-label="Customer pages">
          {groups.map((group) => (
            <div className="cw-sidebar-group" key={group.label}>
              <h2>{group.label}</h2>
              {group.items.map(([path, label, Icon]) => {
                const count = {
                  wishlist: user.wishlistCount,
                  messages: user.unreadMessageCount,
                  notifications: user.unreadNotificationCount,
                }[path];
                return (
                  <NavLink
                    key={path}
                    to={`/customer/${path}`}
                    aria-label={path === "messages" && count > 0 ? `${label}: ${count} profiles with unread messages` : label}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) => (isActive ? "active" : "")}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} strokeWidth={1.7} />
                    <span>{label}</span>
                    {Number(count) > 0 && (
                      <small className="cw-sidebar-count">{count}</small>
                    )}
                    {path === "dashboard" && <i />}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <main id="main-content" className="cw-customer-main">
        <Outlet />
      </main>
    </div>
  );
}
