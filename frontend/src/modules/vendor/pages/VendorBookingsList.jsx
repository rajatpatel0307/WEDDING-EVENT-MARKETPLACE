import { useState } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { Eye, Search, SlidersHorizontal, X, CalendarDays } from "lucide-react";
import { Heading, Loading, ErrorView, Empty, useVendorData } from "../components/WorkspaceUI";
import { BookingStatus } from "../../admin/components/BookingUI";
import { date, money } from "../services/workspace.api";

const categories = [
  ["all", "All Bookings"],
  ["requests", "Booking Requests"], ["upcoming", "Upcoming Bookings"],
  ["active", "Active Bookings"], ["completed", "Completed Bookings"],
  ["cancelled", "Cancelled Bookings"], ["cancellations", "Cancellation Requests"],
  ["reschedules", "Reschedule Requests"],
];

export default function VendorBookingsList({ filter }) {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const title = categories.find(([key]) => key === filter)?.[1] || "Bookings";
  const page = Math.max(1, parseInt(params.get("page"), 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 20;
  const query = new URLSearchParams({ status: filter === "all" ? "" : filter, page, pageSize, q: params.get("q") || "", sort: params.get("sort") || "createdAt", direction: params.get("direction") || "desc" });
  for (const key of ["payment", "eventFrom", "eventTo"]) if (params.get(key)) query.set(key, params.get(key));
  const result = useVendorData(`/records/bookings?${query}`);
  const data = result.data;
  const rows = data?.rows || [];
  const total = Number(data?.total || 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = ["payment", "eventFrom", "eventTo"].some((key) => params.has(key));
  function update(values) {
    const next = new URLSearchParams(params);
    next.set("page", "1");
    for (const [key, value] of Object.entries(values)) value ? next.set(key, String(value)) : next.delete(key);
    setParams(next);
  }

  return <div className="min-w-0 text-[#34564f] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-2 [&_button]:border [&_button]:border-[#dce5de] [&_button]:bg-white [&_button]:rounded-lg [&_button]:px-[13px] [&_button]:py-2.5 [&_button]:min-h-10 [&_button]:text-xs [&_button]:text-[#5e776c] [&_button]:cursor-pointer [&_button:hover]:bg-[#f1f6f2] [&_button:disabled]:opacity-45 [&_button:disabled]:cursor-default [&_select]:border [&_select]:border-[#dce5de] [&_select]:bg-white [&_select]:rounded-lg [&_select]:px-[13px] [&_select]:py-2.5 [&_select]:min-h-10 [&_select]:text-xs [&_select]:text-[#5e776c] [&_select]:cursor-pointer [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#589386] [&_:focus-visible]:outline-offset-3">
    <Heading eyebrow="BOOKING MANAGEMENT" title={title} description="Manage your bookings and keep every event on track." />
    <nav className="flex gap-2 overflow-x-auto my-7 pb-[5px] max-md:my-5" aria-label="Booking categories">
      {categories.map(([key, label]) => <NavLink key={key} to={`/vendor/bookings/${key}`} className={({ isActive }) => `px-[17px] py-3.5 rounded-[10px] whitespace-nowrap text-[13px] font-medium max-md:px-[13px] max-md:py-[11px] max-md:text-xs ${isActive ? "text-[#176b60] bg-[#e5efeb] font-semibold" : "text-[#7c8e88]"}`}>{label}</NavLink>)}
    </nav>
    <section className="bg-white border border-[#dfe8e2] rounded-2xl p-[26px] max-md:p-4" aria-label={title}>
      <div className="flex flex-wrap items-center gap-3.5 mb-6">
        <form key={params.get("q") || ""} className="flex items-center gap-3 flex-1 min-w-[270px] text-[#8a9a92] max-md:basis-full max-md:min-w-0" role="search" onSubmit={(event) => { event.preventDefault(); update({ q: new FormData(event.currentTarget).get("q").trim() }); }}>
          <Search size={20} aria-hidden="true" />
          <input className="flex-1 min-w-0 border-0! bg-transparent! px-0! py-3! text-[13px] text-[#34564f] shadow-none! placeholder:text-[#97a59f]" name="q" aria-label="Search bookings" defaultValue={params.get("q") || ""} placeholder="Search booking ID, customer or service" maxLength={200} />
          <button type="submit">Search</button>
        </form>
        <div className="flex flex-wrap gap-2 max-md:w-full max-md:[&>*]:flex-1">
          <button type="button" className={hasFilters ? "bg-[#e5efeb]! text-[#176b60]!" : ""} aria-expanded={showFilters} aria-controls="booking-filters" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={17} /> Filters{hasFilters ? " •" : ""}</button>
          <select aria-label="Sort bookings by" value={query.get("sort")} onChange={(event) => update({ sort: event.target.value })}>
            <option value="createdAt">Created date</option><option value="eventDate">Event date</option><option value="amount">Amount</option><option value="number">Booking number</option>
          </select>
          <button type="button" aria-label="Toggle sort direction" onClick={() => update({ direction: query.get("direction") === "desc" ? "asc" : "desc" })}>{query.get("direction") === "desc" ? "Descending ↓" : "Ascending ↑"}</button>
          <select aria-label="Bookings per page" value={pageSize} onChange={(event) => update({ pageSize: event.target.value })}>{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} / page</option>)}</select>
        </div>
      </div>
      {showFilters && <form id="booking-filters" className="flex flex-wrap items-end gap-3.5 bg-[#f6f9f6] border border-[#e5ece6] rounded-[10px] p-4 mb-[22px] [&_label]:grid [&_label]:gap-[7px] [&_label]:text-[#70877c] [&_label]:text-xs max-md:[&_label]:w-full [&_input]:border [&_input]:border-[#dce5de] [&_input]:p-2.5 [&_input]:rounded-lg [&_input]:bg-white [&_input]:text-xs" onSubmit={(event) => {
        event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); update(values);
      }}>
        <label>Payment status<select name="payment" defaultValue={params.get("payment") || ""}><option value="">All payments</option>{["Pending", "PartiallyPaid", "Paid", "Failed", "RefundPending", "Refunded", "PartiallyRefunded"].map((value) => <option key={value} value={value}>{value.replace(/([a-z])([A-Z])/g, "$1 $2")}</option>)}</select></label>
        <label>Event date from<input name="eventFrom" type="date" defaultValue={params.get("eventFrom") || ""} onChange={(event) => { event.currentTarget.form.elements.eventTo.min = event.target.value; }} /></label>
        <label>Event date to<input name="eventTo" type="date" min={params.get("eventFrom") || undefined} defaultValue={params.get("eventTo") || ""} /></label>
        <button type="submit">Apply filters</button>
        <button type="button" onClick={() => { update({ payment: "", eventFrom: "", eventTo: "" }); setShowFilters(false); }}><X size={14} /> Clear</button>
      </form>}
      {result.loading ? <Loading /> : result.error ? <ErrorView error={result.error} retry={result.retry} /> : <>
        <div className="overflow-x-auto pb-2.5 [scrollbar-color:#9ba79f_#f5f7f5]" tabIndex={0} role="region" aria-label="Booking list, scroll horizontally for more columns">
          <table className="w-full min-w-[1320px] border-collapse text-left text-[13px] [&_th]:px-3.5 [&_th]:py-4 [&_th]:bg-[#f5f8f5] [&_th]:text-[#82958a] [&_th]:uppercase [&_th]:tracking-[.35px] [&_th]:text-[11px] [&_th]:font-semibold [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-[#e2eae4] [&_td]:px-3.5 [&_td]:py-5 [&_td]:border-b [&_td]:border-[#e9eeea] [&_td]:align-middle [&_tbody_tr]:bg-[#fafcfb] [&_tbody_tr:hover]:bg-[#f2f7f3] [&_strong]:font-semibold">
            <thead><tr>{["Booking ID", "Customer", "Event", "Services", "Event date", "Amount", "Payment status", "Booking status", "Created date", "Actions"].map((name) => <th key={name} scope="col">{name}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}>
              <td><Link className="block text-[#2f6559] font-semibold whitespace-nowrap" to={`/vendor/bookings/${row.id}`}>{row.number}</Link><small className="block mt-[5px] max-w-[125px] truncate font-mono text-[10px] text-[#8b9b91]" title={row.id}>{row.id}</small></td>
              <td><div className="flex items-center gap-2.5 min-w-[150px]"><span className="grid place-items-center size-10 shrink-0 rounded-[10px] bg-[#e9f0e8] text-[#6a8c73] text-xs font-semibold" aria-hidden="true">{(row.customer || "?").trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join("")}</span><span>{row.customer || "—"}</span></div></td>
              <td><strong>{row.event || "—"}</strong></td>
              <td className="min-w-40 max-w-60 leading-[1.7]">{row.services || "—"}</td>
              <td><span className="flex items-center gap-[7px] whitespace-nowrap [&_svg]:text-[#879c8e]"><CalendarDays size={14} aria-hidden="true" />{date(row.eventDate)}</span></td>
              <td className="whitespace-nowrap font-semibold">{money(row.amount)}</td>
              <td><BookingStatus value={row.paymentStatus} /></td>
              <td><BookingStatus value={row.status} /></td>
              <td>{date(row.createdAt)}</td>
              <td><Link className="inline-flex items-center justify-center gap-2 border border-[#dce5de] bg-white rounded-lg px-[13px] py-2.5 min-h-10 text-xs text-[#5e776c] hover:bg-[#f1f6f2]" to={`/vendor/bookings/${row.id}`} aria-label={`View booking ${row.number}`}><Eye size={15} /> View</Link></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!rows.length && <Empty title={`No ${title.toLowerCase()} found`} text={params.get("q") || hasFilters ? "Try another search or adjust your filters." : "Bookings in this category will appear here."} />}
        <footer className="flex items-center justify-between gap-4 mt-[22px] text-[#82918a] text-xs max-md:flex-wrap"><span>{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}` : "0–0 of 0"}</span><div className="flex items-center gap-3"><button disabled={page <= 1} onClick={() => update({ page: page - 1 })}>Previous</button><span>Page {page}</span><button disabled={page >= pages} onClick={() => update({ page: page + 1 })}>Next</button></div></footer>
      </>}
    </section>
  </div>;
}
