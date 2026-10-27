import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, Menu, Search, ArrowUpRight, X, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Logo from "../common/Logo";
import IconButton from "../common/IconButton";
import DesktopNavbar from "./DesktopNavbar";
import MobileNavbar from "./MobileNavbar";
import LocationSelector from "./LocationSelector";
import SearchBar from "./SearchBar";
import ProfileDropdown from "./ProfileDropdown";
import Modal from "./Modal";
export default function Navbar() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(null),
    [drawer, setDrawer] = useState(false),
    [search, setSearch] = useState(false),
    [city, setCity] = useState("Lucknow"),
    [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(null);
    setDrawer(false);
    setSearch(false);
  }, [location]);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 12);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    const resize = () => {
      if (window.innerWidth >= 1180) setDrawer(false);
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const wishlist = user
    ? "/customer/wishlist"
    : "/auth/login?redirect=%2Fcustomer%2Fwishlist";
  return (
    <>
      <a className="mn-skip" href="#main-content">
        Skip to content
      </a>
      <header className={`mn-header ${scrolled ? "mn-scrolled" : ""}`}>
        <div className="mn-utility">
          <span>
            Thoughtfully planned. <em>Wholeheartedly celebrated.</em>
          </span>
          <div>
            <LocationSelector
              city={city}
              setCity={setCity}
              open={open}
              setOpen={setOpen}
            />
            <span className="mn-utility-divider" />
            <Link to="/auth/signup?role=vendor">
              For wedding professionals <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
        <div className="mn-nav-row">
          <div className="mn-mobile-menu">
            <IconButton
              label="Open navigation"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
            >
              <Menu size={22} />
            </IconButton>
          </div>
          <Logo />
          <DesktopNavbar user={user} open={open} setOpen={setOpen} />
          <div className="mn-nav-actions">
            <div className="mn-inline-search">
              <SearchBar city={city} compact />
            </div>
            <div className="mn-search-toggle">
              <IconButton label="Open search" onClick={() => setSearch(true)}>
                <Search size={20} />
              </IconButton>
            </div>
            {(!user || user.role === "Customer") && (
              <Link
                to={wishlist}
                className="mn-wishlist mn-icon-button"
                aria-label={`Wishlist${user?.wishlistCount ? `, ${user.wishlistCount} saved items` : ""}`}
              >
                <Heart size={21} />
                {user?.wishlistCount > 0 && (
                  <span className="mn-badge">
                    {user.wishlistCount > 99 ? "99+" : user.wishlistCount}
                  </span>
                )}
              </Link>
            )}
            {loading ? (
              <span className="mn-auth-loading" role="status">
                Loading account…
              </span>
            ) : user ? (
              <ProfileDropdown open={open} setOpen={setOpen} />
            ) : (
              <>
                <Link className="mn-login" to="/auth/login">
                  Login
                </Link>
                <Link
                  className="mn-mobile-profile mn-icon-button"
                  aria-label="Login"
                  to="/auth/login"
                >
                  <UserRound size={21} />
                </Link>
                <Link className="mn-button mn-get-started" to="/auth/signup">
                  Get started <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
        {user?.role === "Vendor" &&
          user.vendor?.verificationStatus !== "Approved" && (
            <div className="mn-status-banner">
              <Link
                to={`/vendor/${{ Rejected: "rejected", Suspended: "suspended" }[user.vendor?.verificationStatus] || "pending"}`}
              >
                {["Pending", "UnderReview"].includes(
                  user.vendor?.verificationStatus,
                )
                  ? "Verification Pending"
                  : `Verification ${user.vendor?.verificationStatus || "Pending"}`}{" "}
                — View application status <ArrowUpRight size={13} />
              </Link>
            </div>
          )}
      </header>
      {drawer && (
        <Modal drawer label="Navigation" close={() => setDrawer(false)}>
          <MobileNavbar
            user={user}
            city={city}
            setCity={setCity}
            close={() => setDrawer(false)}
          />
        </Modal>
      )}
      {search && (
        <Modal label="Search marketplace" close={() => setSearch(false)}>
          <div className="flex items-center justify-between mb-5">
            <h2>Find your perfect match.</h2>
            <IconButton label="Close search" onClick={() => setSearch(false)}>
              <X size={20} />
            </IconButton>
          </div>
          <SearchBar city={city} onSearch={() => setSearch(false)} />
          <p className="mt-4">
            Venues, vendors, services, locations and packages.
          </p>
        </Modal>
      )}
    </>
  );
}
