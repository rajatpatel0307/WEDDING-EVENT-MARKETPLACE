import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { useSelectedLocation, setSelectedLocation } from "../../modules/marketplace/location-selection";
export default function Navbar() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(null),
    [drawer, setDrawer] = useState(false),
    [search, setSearch] = useState(false),
    [scrolled, setScrolled] = useState(() => window.scrollY > 0);
  const city = useSelectedLocation(), navigate = useNavigate();
  const setCity = value => {
    setSelectedLocation(value);
    if (["/services", "/products", "/vendors", "/venues", "/packages", "/offers", "/search"].includes(location.pathname)) {
      const params = new URLSearchParams(location.search);
      params.set("city", value); params.delete("page");
      navigate(`${location.pathname}?${params}`);
    }
  };
  const location = useLocation();
  const home = location.pathname === "/";
  const headerRef = useRef(null);
  useLayoutEffect(() => {
    if (!home) return;
    const header = headerRef.current;
    const measure = () => {
      header.style.setProperty("--mn-header-height", `${header.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, [home]);
  useEffect(() => {
    setOpen(null);
    setDrawer(false);
    setSearch(false);
  }, [location]);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 0);
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
      <a className="mn-skip fixed left-[16px] top-[-100px] py-[12px] px-[20px] bg-[#fff] z-[100] focus:top-[10px]" href="#main-content">
        Skip to content
      </a>
      <header
        ref={headerRef}
        className={`mn-header motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none! sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter,box-shadow] duration-250 ease-in-out motion-reduce:transition-none ${home ? "mb-[calc(-1*var(--mn-header-height,0px))]" : ""} ${home && !scrolled ? "border-transparent bg-transparent backdrop-blur-0" : "border-[#eae3df] bg-[rgba(255,253,251,0.97)] backdrop-blur-[16px]"} ${scrolled ? "shadow-[0_4px_20px_#422a3110]" : "shadow-none"}`}
      >
        <div
          className={`mn-utility [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[7px] [&_a]:flex [&_a]:items-center [&_a]:gap-[7px] [&_em]:font-[Georgia,serif] max-[768px]:[&_>_span]:hidden max-[768px]:[&_>_div_>_a]:hidden max-[768px]:[&_>_div]:w-full max-[768px]:[&_>_div]:justify-between flex min-h-[35px] items-center justify-between px-[max(4%,calc((100vw_-_1440px)/2))] text-[11px] tracking-[0.2px] text-[#6d5457] transition-colors duration-250 ease-in-out motion-reduce:transition-none max-[767px]:min-h-[31px] max-[767px]:justify-end ${home && !scrolled ? "bg-transparent" : "bg-[#f2eae7]"}`}
        >
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
            <span className="mn-utility-divider h-[13px] w-[1px] bg-[#d8c7c5] my-0 mx-[12px] max-[768px]:hidden" />
            <Link to="/auth/signup?role=vendor">
              For wedding professionals <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
        <div className="mn-nav-row max-w-[1500px] m-auto flex items-center gap-[27px] py-[10px] px-[4%] min-h-[81px] min-[1180px]:max-[1401px]:gap-[23px] max-[1180px]:gap-[15px] max-[1180px]:py-[8px] max-[1180px]:px-[4%] max-[1180px]:min-h-[75px] max-[768px]:gap-[7px] max-[768px]:[&_.mn-logo_img]:w-[114px] max-[768px]:[&_.mn-logo_img]:h-[49px] max-[768px]:[&_.mn-icon-button]:w-[32px]">
          <div className="mn-mobile-menu hidden max-[1180px]:block">
            <IconButton
              label="Open navigation"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
            >
              <Menu size={22} />
            </IconButton>
          </div>
          <Logo transparent />
          <DesktopNavbar user={user} open={open} setOpen={setOpen} />
          <div className="mn-nav-actions flex items-center gap-[15px] text-[12px] max-[1180px]:ml-auto max-[768px]:gap-[3px]">
            <div className="mn-inline-search min-[1180px]:max-[1401px]:hidden max-[1180px]:hidden">
              <SearchBar city={city} compact />
            </div>
            <div className="mn-search-toggle hidden min-[1180px]:max-[1401px]:block max-[1180px]:block">
              <IconButton label="Open search" onClick={() => setSearch(true)}>
                <Search size={20} />
              </IconButton>
            </div>
            {(!user || user.role === "Customer") && (
              <Link
                to={wishlist}
                className="mn-wishlist relative mn-icon-button inline-flex items-center justify-center w-[36px] h-[36px] rounded-full bg-transparent border-0 text-inherit shrink-0 hover:bg-[#f3e9e7]"
                aria-label={`Wishlist${user?.wishlistCount ? `, ${user.wishlistCount} saved items` : ""}`}
              >
                <Heart size={21} />
                {user?.wishlistCount > 0 && (
                  <span className="mn-badge bg-[#8c414e] text-white py-0 px-[5px] rounded-[10px] text-[9px] min-w-[16px] text-center absolute right-[-2px] top-0">
                    {user.wishlistCount > 99 ? "99+" : user.wishlistCount}
                  </span>
                )}
              </Link>
            )}
            {loading ? (
              <span className="mn-auth-loading text-[10px] max-w-[75px] text-[#8a7478] max-[768px]:text-[8px] max-[768px]:max-w-[45px]" role="status">
                Loading account…
              </span>
            ) : user ? (
              <ProfileDropdown open={open} setOpen={setOpen} />
            ) : (
              <>
                <Link className="mn-login max-[768px]:hidden" to="/auth/login">
                  Login
                </Link>
                <Link
                  className="mn-mobile-profile [&.mn-mobile-profile]:hidden max-[768px]:[&.mn-mobile-profile]:inline-flex mn-icon-button inline-flex items-center justify-center w-[36px] h-[36px] rounded-full bg-transparent border-0 text-inherit shrink-0 hover:bg-[#f3e9e7]"
                  aria-label="Login"
                  to="/auth/login"
                >
                  <UserRound size={21} />
                </Link>
                <Link className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)] mn-get-started max-[768px]:hidden" to="/auth/signup">
                  Get started <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
        {user?.role === "Vendor" &&
          user.vendor?.verificationStatus !== "Approved" && (
            <div className="mn-status-banner text-center bg-[#f5e6d1] text-[11px] p-[5px] [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[7px]">
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
