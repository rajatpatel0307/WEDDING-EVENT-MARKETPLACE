import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight, CalendarCheck, ShoppingBag, CalendarDays, Clock,
  CircleCheck, CircleX, CalendarClock, Ban,
} from "lucide-react";
import { useVendorData } from "./WorkspaceUI";

const cards = [
  ["total", "all", "All bookings", CalendarCheck, "bg-[#e7f0ed] text-[#176b60]"],
  ["requests", "requests", "Booking requests", ShoppingBag, "bg-[#faf3df] text-[#947125]"],
  ["upcoming", "upcoming", "Upcoming bookings", CalendarDays, "bg-[#eaf0fa] text-[#526f99]"],
  ["active", "active", "Active bookings", Clock, "bg-[#e7f0ed] text-[#176b60]"],
  ["completed", "completed", "Completed bookings", CircleCheck, "bg-[#edf5e7] text-[#52783d]"],
  ["cancelled", "cancelled", "Cancelled bookings", CircleX, "bg-[#fae8e8] text-[#a54c4c]"],
  ["cancellations", "cancellations", "Cancellation requests", Ban, "bg-[#fbefea] text-[#a76951]"],
  ["reschedules", "reschedules", "Reschedule requests", CalendarClock, "bg-[#f3eaf7] text-[#865a96]"],
];

export default function VendorBookingCards({ filter = "all", refreshVersion = 0 }) {
  const [params] = useSearchParams();
  const state = useVendorData("/bookings/statistics", refreshVersion);
  return <section aria-label="Vendor booking statistics" aria-busy={state.loading}>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
      {cards.map(([key, category, label, Icon, color]) => {
        const selected = filter === category;
        const count = state.data?.[key];
        const next = new URLSearchParams(params);
        category === "all" ? next.delete("status") : next.set("status", category);
        next.set("page", "1");
        return <Link key={key} to={`/vendor/bookings/all?${next}`} aria-current={selected ? "page" : undefined}
          className={`group relative flex min-w-0 flex-col justify-between gap-3 overflow-hidden rounded-2xl border p-4 transition-colors ${selected ? "border-[#31594a] bg-[#31594a] shadow-sm" : "border-[#dfe8e2] bg-white hover:border-[#9ebba8] hover:bg-[#fbfdf9]"}`}>
          <div className="flex items-start justify-between gap-2">
            <span className={`max-w-[145px] text-xs leading-relaxed font-medium ${selected ? "text-[#dce9df]" : "text-[#62796b]"}`}>{label}</span>
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${selected ? "bg-white/10 text-[#e4eddd]" : color}`}><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <strong className={`text-[29px] leading-none font-semibold tracking-tight tabular-nums ${selected ? "text-white" : "text-[#2f5142]"}`}>
              {state.loading ? <span className={`block h-7 w-12 animate-pulse rounded ${selected ? "bg-white/15" : "bg-[#edf2ed]"}`} aria-label="Loading count" /> : state.error || count == null ? "—" : new Intl.NumberFormat("en-IN").format(count)}
            </strong>
            <ArrowUpRight size={16} aria-hidden="true" className={selected ? "text-[#c7d9cc]" : "text-[#94a99a] transition-colors group-hover:text-[#426d52]"} />
          </div>
        </Link>;
      })}
    </div>
    {state.error && <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[#ecd9ce] bg-[#fff8f2] px-4 py-3 text-xs text-[#9b624c]">Unable to load booking statistics.<button onClick={state.retry} type="button" className="font-semibold underline underline-offset-4">Try again</button></div>}
  </section>;
}
