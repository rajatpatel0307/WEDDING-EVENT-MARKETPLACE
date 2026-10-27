import { Suspense, lazy } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import Popover from "./Popover";
import { navigationFor } from "./navigation";
const ServicesMegaMenu = lazy(() => import("./ServicesMegaMenu"));
export default function DesktopNavbar({ user, open, setOpen }) {
  const { pathname } = useLocation();
  return (
    <nav className="mn-desktop-nav" aria-label="Main navigation">
      {navigationFor(user).map(([name, path]) =>
        name === "Services" && path === "/services" ? (
          <Popover
            key={name}
            name="services"
            open={open}
            setOpen={setOpen}
            className="mn-services"
            buttonClass={pathname === path ? "active" : ""}
            label={
              <>
                Services <ChevronDown size={12} />
              </>
            }
          >
            <Suspense fallback={<p className="p-6">Loading services…</p>}>
              <ServicesMegaMenu close={() => setOpen(null)} />
            </Suspense>
          </Popover>
        ) : (
          <NavLink key={name} to={path} end={path === "/"}>
            {name}
            {name === "Offers" && <span className="mn-offer-dot" />}
          </NavLink>
        ),
      )}
      <Popover
        name="more"
        open={open}
        setOpen={setOpen}
        label={
          <>
            More <ChevronDown size={12} />
          </>
        }
      >
        <Link to="/about">About us</Link>
        <Link to="/contact">
          Contact us <ArrowUpRight size={14} />
        </Link>
      </Popover>
    </nav>
  );
}
