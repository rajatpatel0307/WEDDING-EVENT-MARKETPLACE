import { CalendarCheck, ShoppingBag, CalendarDays, Clock, CircleCheck, CircleX, CalendarClock, Ban } from "lucide-react";
import { useVendorData } from "./WorkspaceUI";

const cards = [
  ["total", "All Bookings", CalendarCheck, "bg-[#e7f0ed] text-[#176b60]"],
  ["requests", "Booking Requests", ShoppingBag, "bg-[#faf3df] text-[#ac8a39]"],
  ["upcoming", "Upcoming Bookings", CalendarDays, "bg-[#eaf0fa] text-[#5c7fa8]"],
  ["active", "Active Bookings", Clock, "bg-[#e7f0ed] text-[#176b60]"],
  ["completed", "Completed Bookings", CircleCheck, "bg-[#edf5e7] text-[#568447]"],
  ["cancelled", "Cancelled Bookings", CircleX, "bg-[#fae8e8] text-[#b65555]"],
  ["cancellations", "Cancellation Requests", Ban, "bg-[#fbefea] text-[#b87c66]"],
  ["reschedules", "Reschedule Requests", CalendarClock, "bg-[#f3eaf7] text-[#9568a6]"],
];
export default function VendorBookingCards() {
  const state = useVendorData("/bookings/statistics");
  return <div className="mt-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Vendor booking statistics" aria-busy={state.loading}>
      {cards.map(([key, label, Icon, color]) => <article key={key} className="flex items-center justify-between gap-3 rounded-xl border border-[#dfe8e2] bg-white p-5">
        <div className="min-w-0"><span className="text-xs font-medium text-[#819189]">{label}</span><strong className="mt-2 block text-[28px] font-semibold leading-tight text-[#294b40]" aria-live="polite">{state.loading ? <span className="block h-8 w-12 animate-pulse rounded bg-[#edf2ed]" aria-label="Loading count" /> : state.error || !state.data ? "—" : new Intl.NumberFormat("en-IN").format(state.data[key])}</strong></div>
        <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${color}`}><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span>
      </article>)}
    </div>
    {state.error && <div role="alert" className="mt-3 flex items-center gap-3 text-xs text-[#b65555]">Unable to load booking statistics.<button onClick={state.retry} type="button">Try again</button></div>}
  </div>;
}
