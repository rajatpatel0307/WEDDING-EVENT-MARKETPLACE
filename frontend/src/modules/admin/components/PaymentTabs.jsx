import { NavLink } from "react-router-dom";
import { paymentNavigation } from "../navigation";

export default function PaymentTabs() {
  return <nav className="grid grid-cols-7 gap-1" aria-label="Payment pages">
    {paymentNavigation.map(([path, label]) => <NavLink key={path} end to={`/admin/${path}`}
      className={({ isActive }) => `flex min-w-0 items-center justify-center rounded-xl px-2 py-4 text-center text-[13px] font-medium leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-[#176b60] max-lg:text-[11px] max-md:px-1 max-md:text-[10px] ${isActive ? "bg-[#e3eee9] text-[#075448] font-semibold" : "text-[#7c8e88] hover:bg-[#f0f5f2] hover:text-[#176b60]"}`}>
      {label}
    </NavLink>)}
  </nav>;
}
