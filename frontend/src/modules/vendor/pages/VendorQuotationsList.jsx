import { useState } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { Eye, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { Heading, Loading, ErrorView, Empty } from "../components/WorkspaceUI";
import { BookingStatus } from "../../admin/components/BookingUI";
import { useQuotation } from "../../quotations/quotation.api";
import { date, money } from "../services/workspace.api";

const categories = [
  ["all", "All Quotations", ""], ["requests", "Quotation Requests", ""],
  ["drafts", "Draft Quotations", "Draft"], ["sent", "Sent Quotations", "Sent"],
  ["accepted", "Accepted Quotations", "Accepted"], ["rejected", "Rejected Quotations", "Rejected"],
  ["negotiations", "Negotiations", "Negotiation"], ["expired", "Expired Quotations", "Expired"],
  ["converted", "Converted Bookings", "Converted"],
];
const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#dce5de] bg-white px-[13px] py-2.5 min-h-10 text-xs text-[#5e776c] hover:bg-[#f1f6f2] disabled:opacity-45 disabled:cursor-default";

export default function VendorQuotationsList({ category = "all" }) {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [, title, categoryStatus] = categories.find(([key]) => key === category) || categories[0];
  const requests = category === "requests";
  const page = Math.max(1, parseInt(params.get("page"), 10) || 1);
  const pageSize = [10, 20, 50].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 20;
  const query = new URLSearchParams({ page, pageSize, q: params.get("q") || "", direction: params.get("direction") || "newest", status: categoryStatus || params.get("status") || "" });
  for (const key of ["from", "to"]) if (params.get(key)) query.set(key, params.get(key));
  const state = useQuotation("Vendor", `/${requests ? "quotation-requests" : "quotations"}?${query}`);
  const rows = state.data?.rows || [];
  const total = Number(state.data?.total || 0);
  const hasFilters = ["status", "from", "to"].some((key) => params.get(key));
  function update(values) {
    const next = new URLSearchParams(params);
    next.set("page", "1");
    for (const [key, value] of Object.entries(values)) value ? next.set(key, String(value)) : next.delete(key);
    setParams(next);
  }
  const detailPath = (row) => `/vendor/${requests ? "requests" : "quotations"}/${row.id}`;

  return <div className="min-w-0 text-[#34564f] [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#589386] [&_:focus-visible]:outline-offset-3">
    <Heading eyebrow="QUOTATION MANAGEMENT" title={title} description="Manage your quotations, customer requests and negotiations.">
      <Link to="/vendor/quotations/new" className={`${button} bg-[#176b60]! text-white! border-[#176b60]! hover:bg-[#11594f]!`}><Plus size={16} /> Create Quotation</Link>
    </Heading>
    <nav className="my-7 grid grid-cols-9 gap-1 max-md:my-5" aria-label="Quotation categories">
      {categories.map(([key, label]) => <NavLink key={key} to={key === "requests" ? "/vendor/requests" : `/vendor/quotations/${key}`} className={({ isActive }) => `flex min-w-0 items-center justify-center rounded-[10px] px-2 py-3.5 text-center text-[13px] leading-snug font-medium [overflow-wrap:anywhere] max-lg:px-1 max-lg:text-[11px] max-md:text-[10px] ${isActive ? "bg-[#e5efeb] text-[#176b60] font-semibold" : "text-[#7c8e88]"}`}>{label}</NavLink>)}
    </nav>
    <section className="rounded-2xl border border-[#dfe8e2] bg-white p-[26px] max-md:p-4" aria-label={title}>
      <div className="mb-6 flex flex-wrap items-center gap-3.5">
        <form key={params.get("q") || ""} role="search" className="flex flex-1 items-center gap-3 min-w-[270px] text-[#8a9a92] max-md:min-w-0 max-md:basis-full" onSubmit={(event) => { event.preventDefault(); update({ q: new FormData(event.currentTarget).get("q").trim() }); }}>
          <Search size={20} aria-hidden="true" /><input className="min-w-0 flex-1 border-0! bg-transparent! px-0! py-3! text-[13px] shadow-none! placeholder:text-[#97a59f]" name="q" aria-label="Search quotations" defaultValue={params.get("q") || ""} maxLength={150} placeholder={requests ? "Search request ID, customer or service" : "Search quotation ID or customer"} /><button className={button} type="submit">Search</button>
        </form>
        <div className="flex flex-wrap gap-2 max-md:w-full max-md:[&>*]:flex-1">
          <button className={`${button} ${hasFilters ? "bg-[#e5efeb]!" : ""}`} aria-expanded={showFilters} aria-controls="quotation-filters" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={17} /> Filters{hasFilters ? " •" : ""}</button>
          <button className={button} aria-label="Toggle quotation sort direction" onClick={() => update({ direction: query.get("direction") === "newest" ? "oldest" : "newest" })}>Created date {query.get("direction") === "newest" ? "↓" : "↑"}</button>
          <select className={button} aria-label="Quotations per page" value={pageSize} onChange={(event) => update({ pageSize: event.target.value })}>{[10, 20, 50].map((size) => <option key={size} value={size}>{size} / page</option>)}</select>
        </div>
      </div>
      {showFilters && <form id="quotation-filters" className="mb-[22px] flex flex-wrap items-end gap-3.5 rounded-[10px] border border-[#e5ece6] bg-[#f6f9f6] p-4 [&_label]:grid [&_label]:gap-[7px] [&_label]:text-xs [&_label]:text-[#70877c] max-md:[&_label]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#dce5de] [&_input]:bg-white [&_input]:p-2.5 [&_input]:text-xs" onSubmit={(event) => { event.preventDefault(); update(Object.fromEntries(new FormData(event.currentTarget))); }}>
        {!categoryStatus && <label>Status<select name="status" className={button} defaultValue={params.get("status") || ""}><option value="">All statuses</option>{(requests ? ["Pending", "Responded", "Closed"] : ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired", "Cancelled", "Negotiation", "Converted"]).map((value) => <option key={value}>{value}</option>)}</select></label>}
        <label>Event date from<input name="from" type="date" defaultValue={params.get("from") || ""} onChange={(event) => { event.currentTarget.form.elements.to.min = event.target.value; }} /></label>
        <label>Event date to<input name="to" type="date" defaultValue={params.get("to") || ""} min={params.get("from") || undefined} /></label>
        <button className={button} type="submit">Apply filters</button><button className={button} type="button" onClick={() => { update({ status: "", from: "", to: "" }); setShowFilters(false); }}><X size={14} /> Clear</button>
      </form>}
      {state.loading ? <Loading /> : state.error ? <ErrorView error={state.error} retry={state.retry} /> : <>
        <div className="overflow-x-auto pb-2.5 [scrollbar-color:#9ba79f_#f5f7f5]" tabIndex={0} role="region" aria-label="Quotation list, scroll horizontally for more columns">
          <table className="w-full min-w-[1250px] border-collapse text-left text-[13px] [&_th]:bg-[#f5f8f5] [&_th]:px-3.5 [&_th]:py-4 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[.35px] [&_th]:text-[#82958a] [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-[#e2eae4] [&_td]:px-3.5 [&_td]:py-5 [&_td]:border-b [&_td]:border-[#e9eeea] [&_td]:align-middle [&_tbody_tr]:bg-[#fafcfb] [&_tbody_tr:hover]:bg-[#f2f7f3]">
            <thead><tr>{[requests ? "Request ID" : "Quotation ID", "Customer", "Event", "Event date", "Location", "Guests", requests ? "Service" : "Amount", "Status", requests ? "Created date" : "Valid until", "Actions"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}>
              <td><Link className="font-semibold whitespace-nowrap text-[#2f6559]" to={detailPath(row)}>{row.number}</Link><small className="mt-[5px] block text-[11px] text-[#8b9b91]">{requests ? date(row.createdAt) : `Version ${row.revision || 1}`}</small></td>
              <td><div className="flex min-w-[150px] items-center gap-2.5"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#e9f0e8] text-xs font-semibold text-[#6a8c73]">{(row.customer || "?").trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join("")}</span>{row.customer || "—"}</div></td>
              <td className="font-semibold">{row.event || "—"}</td><td className="whitespace-nowrap">{date(row.date)}</td><td>{row.city || "—"}</td><td>{row.guests ?? "—"}</td>
              <td className="font-semibold">{requests ? row.service || "—" : money(row.amount)}</td><td><BookingStatus value={row.bookingId ? "Converted" : row.negotiating ? "Negotiation" : row.status} /></td><td className="whitespace-nowrap">{date(requests ? row.createdAt : row.validUntil)}</td>
              <td><Link to={detailPath(row)} className={button} aria-label={`View ${row.number}`}><Eye size={15} /> View</Link></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!rows.length && <Empty title={`No ${title.toLowerCase()} found`} text={hasFilters || params.get("q") ? "Try another search or adjust your filters." : "Your records will appear here when available."} />}
        <footer className="mt-[22px] flex flex-wrap items-center justify-between gap-4 text-xs text-[#82918a]"><span>{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}` : "0–0 of 0"}</span><div className="flex items-center gap-3"><button className={button} disabled={page <= 1} onClick={() => update({ page: page - 1 })}>Previous</button><span>Page {page}</span><button className={button} disabled={page * pageSize >= total} onClick={() => update({ page: page + 1 })}>Next</button></div></footer>
      </>}
    </section>
  </div>;
}
