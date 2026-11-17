import { Link } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight,
  CircleCheck, Clock3, Eye, FileText, MapPin, MessageSquare, RefreshCw,
  Search, SlidersHorizontal, Sparkles, Wallet, X,
} from "lucide-react";
import { ErrorView } from "../customer/components/WorkspaceUI";
import { date } from "../customer/services/workspace.api";
import { money, useQuotation } from "./quotation.api";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52]";
const button = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${focus}`;
const control = `mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 hover:border-slate-300 ${focus}`;

export function CustomerQuotationSummary() {
  const state = useQuotation("Customer", "/quotations/statistics");
  const stats = state.data;
  const main = [
    ["Received quotations", stats?.quotes?.total ?? 0, FileText, "bg-[#f4edf0] text-[#966075]"],
    ["Awaiting response", stats?.quotes?.pending ?? 0, Clock3, "bg-[#fbf3e5] text-[#a4803e]"],
    ["Accepted quotations", stats?.quotes?.accepted ?? 0, CircleCheck, "bg-[#edf4ee] text-[#476b55]"],
    ["Quotation value", money(stats?.quotes?.value), Wallet, "bg-[#f6f0e9] text-[#a18065]"],
  ];
  return <section aria-labelledby="customer-quotation-overview" aria-busy={state.loading}>
    <h2 id="customer-quotation-overview" className="mb-3 text-[10px] font-semibold uppercase tracking-[1.6px] text-[#97765f]">Quotation overview</h2>
    {state.error ? <ErrorView error={state.error} retry={state.retry} /> : <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">{main.map(([label, value, Icon, tone]) => <article key={label} className="min-w-0 rounded-2xl border border-[#e3e6e0] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-2"><p className="min-w-0 text-[11px] font-medium leading-relaxed text-slate-500 sm:text-xs">{label}</p><span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${tone}`}><Icon size={19} strokeWidth={1.6} aria-hidden="true" /></span></div>{state.loading ? <div className="mt-3 h-8 w-20 rounded-lg bg-slate-100 motion-safe:animate-pulse" /> : <p className="mt-3 break-words text-[23px] font-semibold leading-snug tracking-tight text-[#2e4439] tabular-nums sm:text-[28px]">{value}</p>}
      </article>)}</div>
      <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 rounded-2xl border border-[#e3e6e0] bg-white px-5 py-4 sm:grid-cols-3 xl:grid-cols-6">{[
        ["Requests", stats?.requests?.total], ["Pending requests", stats?.requests?.pending],
        ["Negotiations", stats?.negotiations], ["Rejected", stats?.quotes?.rejected],
        ["Expired", stats?.quotes?.expired], ["Converted bookings", stats?.converted],
      ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[11px] leading-relaxed text-slate-500">{label}</dt><dd className="mt-1 text-lg font-semibold text-[#49363e] tabular-nums">{state.loading ? <span className="block h-6 w-8 rounded bg-slate-100 motion-safe:animate-pulse" /> : value ?? 0}</dd></div>)}</dl>
    </>}
  </section>;
}

function QuotationStatus({ row }) {
  const value = row.bookingId ? "Converted" : row.negotiating ? "Negotiation requested" : row.status || "Unknown";
  const positive = ["Accepted", "Converted"].includes(value);
  const closed = ["Rejected", "Cancelled"].includes(value);
  const sent = ["Sent", "Viewed", "Responded"].includes(value);
  const neutral = ["Expired", "Closed", "Unknown"].includes(value);
  const Icon = positive ? Check : closed ? X : value === "Negotiation requested" ? MessageSquare : Clock3;
  const tone = positive ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : closed ? "border-rose-200 bg-rose-50 text-rose-800"
      : sent ? "border-sky-200 bg-sky-50 text-sky-800"
        : neutral ? "border-slate-200 bg-slate-100 text-slate-600"
          : "border-amber-200 bg-amber-50 text-amber-800";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}><Icon size={12} aria-hidden="true" />{value}</span>;
}

function DetailLink({ row, requests, iconOnly = false }) {
  return <Link to={`/customer/${requests ? "requests" : "quotations"}/${row.id}`} aria-label={`View ${row.number || (requests ? "request" : "quotation")}`} title="View details" className={`${button} min-h-10 shrink-0 border-[#e3ccd4] bg-white text-[#925369] hover:border-[#873f52] hover:bg-[#873f52] hover:text-white ${iconOnly ? "size-10 p-0" : ""}`}><Eye size={15} aria-hidden="true" />{!iconOnly && "View details"}</Link>;
}

export default function CustomerQuotationView({ requests, status, params, state, onChange, onReset }) {
  const rows = state.data?.rows || [];
  const total = Number(state.data?.total || 0);
  const page = Number(state.data?.page || params.get("page") || 1);
  const size = Number(state.data?.pageSize || 20);
  const pages = Math.max(1, Math.ceil(total / size));
  const filtered = [params.get("q"), status, params.get("from"), params.get("to")].some(Boolean);
  const statuses = requests ? ["Pending", "Responded", "Closed"] : ["Sent", "Viewed", "Negotiation", "Accepted", "Rejected", "Expired", "Cancelled", "Converted"];
  return <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-6 text-sm text-slate-700 [&_svg]:shrink-0">
    <header className="flex flex-wrap items-center justify-between gap-5">
      <div><p className="text-[9px] font-medium tracking-[1.7px] text-[#97765f] sm:text-[10px]">YOUR CELEBRATION, BEAUTIFULLY PLANNED</p><h1 className="mt-2 font-serif text-[38px] font-normal leading-tight tracking-tight text-[#49363e] sm:text-[44px]">{requests ? "Quotation requests" : "Your quotations"}<span className="text-[#b58c69]">.</span></h1><p className="mt-2 text-sm text-slate-500">Compare proposals and keep track of each request.</p></div>
      <Link to="/customer/discover" className={`${button} border-[#873f52] bg-[#873f52] text-white shadow-sm hover:bg-[#723247]`}><Sparkles size={15} aria-hidden="true" />Find services<ArrowUpRight size={15} aria-hidden="true" /></Link>
    </header>

    <nav aria-label="Quotation sections" className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-[#e8e1de] bg-[#f0eeeb] p-1">
      {[["/customer/requests", "Requests", MessageSquare, requests], ["/customer/quotations", "Quotations", FileText, !requests]].map(([path, label, Icon, active]) => <Link key={path} to={path} aria-current={active ? "page" : undefined} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${active ? "bg-white text-[#873f52] shadow-sm" : "text-slate-500 hover:bg-white/60 hover:text-[#873f52]"} ${focus}`}><Icon size={15} aria-hidden="true" />{label}</Link>)}
    </nav>

    <CustomerQuotationSummary />

    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e3e6e0] bg-white shadow-sm" aria-labelledby="customer-quotation-list-title" aria-busy={state.loading}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#f7f2ee] text-[#9b7a62]"><FileText size={20} strokeWidth={1.6} aria-hidden="true" /></span><h2 id="customer-quotation-list-title" className="text-base font-semibold tracking-tight text-[#37463d]">{requests ? "My requests" : "Received quotations"}</h2></div><div className="flex items-center gap-3">{!state.loading && !state.error && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] text-slate-600">{total} {requests ? total === 1 ? "request" : "requests" : total === 1 ? "quotation" : "quotations"}</span>}<button type="button" onClick={state.retry} disabled={state.loading} aria-label="Refresh quotation list" title="Refresh list" className={`${button} size-10 min-h-10 border-slate-200 p-0 text-slate-500 hover:bg-slate-50`}><RefreshCw size={15} className={state.loading ? "motion-safe:animate-spin" : ""} aria-hidden="true" /></button></div></div>

      <form role="search" aria-label="Search and filter quotations" className="space-y-4 border-b border-slate-100 bg-[#fdfdfb] px-5 py-5 sm:px-6" onSubmit={(event) => { event.preventDefault(); onChange("q", String(new FormData(event.currentTarget).get("q") || "").trim()); }}>
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(220px,1fr)_180px_150px_auto]">
          <label className="block min-w-0 text-[11px] font-medium text-slate-500">Search<span className="relative mt-2 block"><Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" key={params.get("q") || ""} name="q" defaultValue={params.get("q") || ""} maxLength={150} placeholder={requests ? "Reference, vendor or service" : "Reference or vendor"} className={`${control.replace("mt-2 ", "")} pl-10`} /></span></label>
          <label className="block text-[11px] font-medium text-slate-500">Status<select aria-label="Quotation status" value={status} onChange={(event) => onChange("status", event.target.value)} className={control}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="block text-[11px] font-medium text-slate-500">Order<select value={params.get("direction") || "newest"} onChange={(event) => onChange("direction", event.target.value)} className={control}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
          <button type="submit" className={`${button} border-[#873f52] bg-[#873f52] text-white hover:bg-[#723247]`}><Search size={15} aria-hidden="true" />Search</button>
        </div>
        <div className="flex flex-wrap items-end gap-3"><span className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium text-slate-500"><SlidersHorizontal size={14} aria-hidden="true" />Event date</span><label className="block min-w-0 flex-1 text-[11px] font-medium text-slate-500 sm:max-w-44">From<input type="date" value={params.get("from") || ""} max={params.get("to") || undefined} onChange={(event) => onChange("from", event.target.value)} className={control} /></label><label className="block min-w-0 flex-1 text-[11px] font-medium text-slate-500 sm:max-w-44">To<input type="date" value={params.get("to") || ""} min={params.get("from") || undefined} onChange={(event) => onChange("to", event.target.value)} className={control} /></label><button type="button" onClick={onReset} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#873f52] hover:bg-[#faf3f5] ${focus}`}><X size={14} aria-hidden="true" />Reset filters</button></div>
      </form>

      {state.loading ? <div className="space-y-4 p-6" role="status"><span className="sr-only">Loading {requests ? "requests" : "quotations"}</span>{[0, 1, 2].map((key) => <div key={key} className="h-16 rounded-xl bg-slate-100 motion-safe:animate-pulse" />)}</div>
        : state.error ? <ErrorView error={state.error} retry={state.retry} />
          : !rows.length ? <div className="flex flex-col items-center px-5 py-14 text-center"><span className="mb-5 grid size-16 place-items-center rounded-2xl bg-[#f7f2ee] text-[#a3836a]"><FileText size={29} strokeWidth={1.4} aria-hidden="true" /></span><h3 className="font-serif text-[27px] text-[#49363e]">{page > 1 ? "No results on this page" : filtered ? `No matching ${requests ? "requests" : "quotations"}` : requests ? "No requests yet" : "Your next proposal starts here"}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{page > 1 ? "Return to the first page to see your results." : filtered ? "Try another search or adjust your filters." : requests ? "Enquire about a service to send a request to a vendor." : "Quotations from your vendors will appear here."}</p>{page > 1 || filtered ? <button type="button" className={`${button} mt-6 border-[#e3d5d8] text-[#873f52] hover:bg-[#faf3f5]`} onClick={page > 1 ? () => onChange("page", "1") : onReset}>{page > 1 ? "Back to first page" : "Clear filters"}<ArrowRight size={15} aria-hidden="true" /></button> : <Link to="/customer/discover" className={`${button} mt-6 border-[#e3d5d8] text-[#873f52] hover:bg-[#faf3f5]`}>Discover services<ArrowRight size={15} aria-hidden="true" /></Link>}</div>
            : <>
              <div className="hidden overflow-x-auto md:block" role="region" aria-label="Quotation results, scroll for more columns" tabIndex={0}><table className="w-full min-w-[1100px] border-collapse text-left text-xs"><caption className="sr-only">{requests ? "Quotation requests" : "Received quotations"} and their vendor, event, budget and status</caption><thead className="border-b border-slate-100 bg-[#fafbf9] text-[10px] font-semibold uppercase tracking-wider text-slate-500"><tr>{["Reference", "Vendor", "Event", "Event date / place", "Guests / budget", requests ? "Service" : "Amount", "Status", "Action"].map((label) => <th key={label} scope="col" className={`px-5 py-4 whitespace-nowrap ${label === "Amount" ? "text-right" : label === "Action" ? "text-center" : ""}`}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="transition-colors hover:bg-[#fcfaf8] motion-reduce:transition-none">
                <td className="max-w-[230px] px-5 py-5"><Link to={`/customer/${requests ? "requests" : "quotations"}/${row.id}`} className={`rounded-sm font-semibold break-all text-[#873f52] hover:underline ${focus}`}>{row.number}</Link>{row.revision && <p className="mt-1.5 text-[10px] text-slate-400">Version {row.revision}</p>}</td>
                <td className="max-w-[220px] px-5 py-5 font-medium break-words text-slate-600">{row.vendor || "—"}</td><td className="max-w-[230px] px-5 py-5 break-words">{row.event || "—"}</td>
                <td className="px-5 py-5"><p className="whitespace-nowrap">{date(row.date)}</p>{row.city && <p className="mt-1.5 text-[11px] text-slate-500">{row.city}</p>}</td>
                <td className="px-5 py-5"><p>{row.guests ?? "—"} guests</p><p className="mt-1.5 whitespace-nowrap text-[11px] text-slate-500">{row.budget != null ? money(row.budget) : "—"}</p></td>
                <td className={`max-w-[240px] px-5 py-5 ${requests ? "break-words" : "text-right text-sm font-semibold whitespace-nowrap text-[#2e4439] tabular-nums"}`}>{requests ? row.service || "—" : money(row.amount)}</td><td className="px-5 py-5"><QuotationStatus row={row} /></td><td className="px-5 py-5 text-center"><DetailLink row={row} requests={requests} iconOnly /></td>
              </tr>)}</tbody></table></div>
              <div className="divide-y divide-slate-100 md:hidden">{rows.map((row) => <article key={row.id} className="space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold break-all text-[#873f52]">{row.number}</p><QuotationStatus row={row} /></div><div><p className="font-medium text-[#37463d]">{row.vendor || "Vendor"}</p><p className="mt-1 text-xs text-slate-500">{row.event || "Event"}{row.revision ? ` · Version ${row.revision}` : ""}</p></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" />{date(row.date)}</span>{row.city && <span className="inline-flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" />{row.city}</span>}</div><dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Guests</dt><dd className="mt-1">{row.guests ?? "—"}</dd></div><div><dt className="text-slate-500">Budget</dt><dd className="mt-1">{row.budget != null ? money(row.budget) : "—"}</dd></div></dl><div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-3"><p className={requests ? "max-w-full break-words text-xs" : "text-lg font-semibold text-[#2e4439] tabular-nums"}>{requests ? row.service || "—" : money(row.amount)}</p><DetailLink row={row} requests={requests} /></div></article>)}</div>
            </>}

      {!state.loading && !state.error && rows.length > 0 && <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-[#fdfdfb] px-5 py-4 text-xs text-slate-500 sm:px-6"><p role="status">Showing {(page - 1) * size + 1}–{Math.min((page - 1) * size + rows.length, total)} of {total}</p>{pages > 1 && <nav aria-label="Quotation pages" className="flex items-center gap-3"><button type="button" aria-label="Previous quotation page" className={`${button} min-h-9 border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50`} disabled={page <= 1} onClick={() => onChange("page", String(page - 1))}><ChevronLeft size={15} aria-hidden="true" /></button><span>Page {page} of {pages}</span><button type="button" aria-label="Next quotation page" className={`${button} min-h-9 border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50`} disabled={page >= pages} onClick={() => onChange("page", String(page + 1))}><ChevronRight size={15} aria-hidden="true" /></button></nav>}</footer>}
    </section>
  </div>;
}
