import { Suspense, lazy } from "react";
import { useQuery } from "@apollo/client/react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Popover from "./Popover";
import { navigationFor } from "./navigation";
import { OFFERS } from "../../services/public";
const ServicesMegaMenu = lazy(() => import("./ServicesMegaMenu"));
export default function DesktopNavbar({ user, open, setOpen, city = "" }) {
  const { pathname } = useLocation();
  const navigation = navigationFor(user);
  const { data, error } = useQuery(OFFERS, {
    variables: { city: city || null },
    skip: !navigation.some(([name]) => name === "Offers"),
    fetchPolicy: "cache-and-network",
    pollInterval: 60000,
  });
  const hasActiveOffers = !error && (data?.activeOffers?.length || 0) > 0;
  return (
    <nav className="mn-desktop-nav flex items-center gap-[21px] flex-1 whitespace-nowrap text-[12px] [&_>_a]:relative [&_>_a]:py-[20px] [&_>_a]:px-0 [&_>_a]:flex [&_>_a]:items-center [&_>_a]:gap-[5px] [&_>_.mn-popover_>_button]:relative [&_>_.mn-popover_>_button]:py-[20px] [&_>_.mn-popover_>_button]:px-0 [&_>_.mn-popover_>_button]:flex [&_>_.mn-popover_>_button]:items-center [&_>_.mn-popover_>_button]:gap-[5px] [&_a.active]:text-[#8c414e] [&_button.active]:text-[#8c414e] [&_>_a.active:after]:content-[''] [&_>_a.active:after]:absolute [&_>_a.active:after]:bottom-[9px] [&_>_a.active:after]:left-0 [&_>_a.active:after]:right-0 [&_>_a.active:after]:h-[2px] [&_>_a.active:after]:bg-[#8c414e] [&_>_a.active:after]:rounded-[2px] [&_button.active:after]:content-[''] [&_button.active:after]:absolute [&_button.active:after]:bottom-[9px] [&_button.active:after]:left-0 [&_button.active:after]:right-0 [&_button.active:after]:h-[2px] [&_button.active:after]:bg-[#8c414e] [&_button.active:after]:rounded-[2px] min-[1180px]:max-[1401px]:gap-[18px] max-[1180px]:hidden" aria-label="Main navigation">
      {navigation.map(([name, path]) =>
        name === "Services" && path === "/services" ? (
          <Popover
            key={name}
            name="services"
            open={open}
            setOpen={setOpen}
            className="mn-services [&.mn-services]:static [&.mn-services_>_.mn-panel]:left-[4%] [&.mn-services_>_.mn-panel]:right-[4%] [&.mn-services_>_.mn-panel]:top-full [&.mn-services_>_.mn-panel]:p-0"
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
            {name === "Offers" && hasActiveOffers && <span role="img" aria-label="Active offers available" title="Active offers available" className="mn-offer-dot w-[5px] h-[5px] rounded-full bg-[#b87f54] ml-[2px]" />}
          </NavLink>
        ),
      )}
      <NavLink to="/about">About us</NavLink>
      <NavLink to="/contact">Contact us</NavLink>
    </nav>
  );
}
