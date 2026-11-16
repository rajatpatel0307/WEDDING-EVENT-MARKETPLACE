import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDownWideNarrow, ArrowUpWideNarrow, ArrowRight, CalendarDays,
  Check, ChevronLeft, ChevronRight, Eye, LoaderCircle, MessageSquare, RefreshCw, Search, SlidersHorizontal, X,
} from "lucide-react";
import { Loading, ErrorView, Empty, Modal, useVendorData } from "../components/WorkspaceUI";
import { BookingStatus } from "../../admin/components/BookingUI";
import { date, money, save } from "../services/workspace.api";
import VendorBookingCards from "../components/VendorBookingCards";
import useBookingCustomerChat from "../services/useBookingCustomerChat";

const categories = [
  ["all", "All Bookings"], ["requests", "Booking Requests"],
  ["upcoming", "Upcoming Bookings"], ["active", "Active Bookings"],
  ["completed", "Completed Bookings"], ["cancelled", "Cancelled Bookings"],
  ["cancellations", "Cancellation Requests"], ["reschedules", "Reschedule Requests"],
];
const filterKeys = ["payment", "eventFrom", "eventTo"];
const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dce5dd] bg-white px-3.5 py-2.5 text-xs font-medium text-[#536f5e] transition-colors hover:border-[#b7cbb9] hover:bg-[#f2f7ef] disabled:cursor-not-allowed disabled:opacity-45";
const primary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#31594a] bg-[#31594a] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#254839] disabled:cursor-not-allowed disabled:opacity-50";
const control = "min-h-10 min-w-0 rounded-xl border border-[#dce5dd] bg-white px-3 py-2.5 text-xs text-[#536f5e]";
const humanize = (value) => value.replace(/([a-z])([A-Z])/g, "$1 $2");
const initials = (name) => (name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");

function Customer({ row }) {
  return <div className="flex min-w-0 items-center gap-2.5">
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#edf2e8] text-[11px] font-semibold text-[#597747]" aria-hidden="true">{initials(row.customer)}</span>
    <div className="min-w-0"><p className="text-[13px] font-medium wrap-anywhere text-[#35543e]">{row.customer || "Customer not specified"}</p><p className="mt-1 text-[11px] wrap-anywhere text-[#687c65]">{row.event || "Event not specified"}</p></div>
  </div>;
}

function StatusPair({ row }) {
  return <dl className="grid gap-2 text-[10px] text-[#687c65]">
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1"><dt>Booking</dt><dd><BookingStatus value={row.status} /></dd></div>
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1"><dt>Payment</dt><dd><BookingStatus value={row.paymentStatus} /></dd></div>
  </dl>;
}

function EventDate({ row }) {
  return <div className="flex items-start gap-2 text-xs text-[#526f54]">
    <CalendarDays size={14} className="mt-0.5 text-[#758e71]" aria-hidden="true" />
    <span>{row.eventDate ? date(row.eventDate) : "Quantity reservation"}{row.bookingTime && <span className="mt-1 block text-[11px] text-[#6b8065]">{row.bookingTime}</span>}</span>
  </div>;
}

function BookingActions({ row, onDecision, disabled, onMessage, openingBookingId }) {
  const iconButton = "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-45";
  return <div className="flex items-center gap-2">
    <Link className={`${iconButton} border-[#dce6d4] bg-[#f8faf4] text-[#5b7a48] hover:border-[#9db88c] hover:bg-[#eaf2e2]`} to={`/vendor/bookings/${row.id}`} aria-label={`View booking ${row.number}`} title="View booking"><Eye size={18} aria-hidden="true" /></Link>
    <button type="button" className={`${iconButton} border-[#d1e3dc] bg-[#edf6f2] text-[#39745e] hover:border-[#9bc4b1] hover:bg-[#dfeee7]`} disabled={disabled || openingBookingId != null} onClick={() => onMessage(row.id)} aria-label={`Message ${row.customer || "customer"} about booking ${row.number}`} title="Message customer" aria-busy={openingBookingId === row.id}>
      {openingBookingId === row.id ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <MessageSquare size={18} aria-hidden="true" />}
    </button>
    {row.status === "Pending" && <>
      <button type="button" className={`${iconButton} border-[#cde0c7] bg-[#edf6e8] text-[#477536] hover:border-[#90b67e] hover:bg-[#e0efd6]`} disabled={disabled} onClick={() => onDecision(row, "Accept")} aria-label={`Approve booking ${row.number}`} title="Approve booking"><Check size={18} aria-hidden="true" /></button>
      <button type="button" className={`${iconButton} border-[#ebd4ce] bg-[#fff3ef] text-[#aa574b] hover:border-[#d5a197] hover:bg-[#fbe5df]`} disabled={disabled} onClick={() => onDecision(row, "Reject")} aria-label={`Reject booking ${row.number}`} title="Reject booking"><X size={18} aria-hidden="true" /></button>
    </>}
  </div>;
}

export default function VendorBookingsList() {
  const [params, setParams] = useSearchParams();
  const { openCustomerChat, openingBookingId, chatError } = useBookingCustomerChat();
  const filter = categories.some(([key]) => key === params.get("status")) ? params.get("status") : "all";
  const [showFilters, setShowFilters] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [decision, setDecision] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const decisionInFlight = useRef(false);
  const title = categories.find(([key]) => key === filter)?.[1] || "Bookings";
  const page = Math.max(1, parseInt(params.get("page"), 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 20;
  const search = params.get("q") || "";
  const query = new URLSearchParams({ status: filter === "all" ? "" : filter, page, pageSize, q: search, sort: params.get("sort") || "createdAt", direction: params.get("direction") || "desc" });
  for (const key of filterKeys) if (params.get(key)) query.set(key, params.get(key));
  const result = useVendorData(`/records/bookings?${query}`, refreshVersion);
  const rows = result.data?.rows || [];
  const total = Number(result.data?.total || 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const activeFilters = filterKeys.filter((key) => params.get(key));
  const hasFilters = activeFilters.length > 0;
  const hasStatusFilter = filter !== "all";
  const descending = query.get("direction") === "desc";
  const sortLabel = query.get("sort") === "amount"
    ? descending ? "Highest first" : "Lowest first"
    : ["createdAt", "eventDate"].includes(query.get("sort"))
      ? descending ? "Newest first" : "Oldest first"
      : descending ? "Descending" : "Ascending";

  function update(values) {
    const next = new URLSearchParams(params);
    next.set("page", "1");
    for (const [key, value] of Object.entries(values)) value ? next.set(key, String(value)) : next.delete(key);
    setParams(next);
  }
  function clearFilters() {
    update({ status: "", q: "", payment: "", eventFrom: "", eventTo: "" });
    setShowFilters(false);
  }

  function openDecision(row, action) {
    setDecision({ row, action });
    setDecisionNote("");
    setDecisionError("");
    setDecisionMessage("");
  }

  async function submitDecision(event) {
    event.preventDefault();
    if (!decision || decisionInFlight.current) return;
    const note = decisionNote.trim();
    if (decision.action === "Reject" && !note) {
      setDecisionError("Please give a reason for rejecting this booking.");
      return;
    }
    decisionInFlight.current = true;
    setDecisionBusy(true);
    setDecisionError("");
    try {
      await save(`/bookings/${decision.row.id}/decision`, "POST", { action: decision.action, note });
      setDecisionMessage(decision.action === "Accept" ? "Booking approved successfully." : "Booking rejected successfully.");
      setDecision(null);
      setRefreshVersion((value) => value + 1);
    } catch (error) {
      setDecisionError(error.message);
    } finally {
      decisionInFlight.current = false;
      setDecisionBusy(false);
    }
  }

  return <div className="min-w-0 space-y-6 font-sans text-sm leading-relaxed text-[#34564f] [&_svg]:shrink-0 [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_select]:cursor-pointer [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-3 [&_:focus-visible]:outline-[#3d785b] [&_.ab-pending]:text-[#826326] [&_.ab-accepted]:text-[#826326] [&_.ab-paymentpending]:text-[#826326] [&_.ab-partiallypaid]:text-[#826326] motion-reduce:[&_*]:transition-none">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-[#66805d]"><span className="size-1.5 rounded-full bg-[#88a577]" aria-hidden="true" />BOOKING MANAGEMENT</p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-[#2d5040] sm:text-[32px]">All Bookings</h1>
        <p className="mt-2 text-[13px] text-[#647a67]">Keep every request, event and customer in view.</p>
      </div>
      <button type="button" className={button} onClick={() => setRefreshVersion((value) => value + 1)} disabled={result.loading} aria-label="Refresh bookings and statistics"><RefreshCw size={15} className={result.loading ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />Refresh</button>
    </header>

    {decisionMessage && <p role="status" className="flex items-center gap-2 rounded-xl border border-[#cde0c7] bg-[#edf6e8] px-4 py-3 text-xs font-medium text-[#477536]"><Check size={16} aria-hidden="true" />{decisionMessage}</p>}
    {chatError && <p role="alert" className="rounded-xl border border-[#ebd4ce] bg-[#fff3ef] px-4 py-3 text-xs text-[#a34e43]">{chatError}</p>}

    <VendorBookingCards filter={filter} refreshVersion={refreshVersion} />

    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#dfe8e2] bg-white shadow-[0_2px_10px_#244d3403]" aria-label={title}>
      <div className="border-b border-[#e6ece3] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5"><h2 className="text-sm font-semibold text-[#36573f]">Booking records</h2><span role="status" className="rounded-full border border-[#e1e9db] bg-[#f4f7f0] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-[#617853]">{result.loading ? "Loading…" : result.error ? "Unavailable" : `${total.toLocaleString("en-IN")} ${total === 1 ? "booking" : "bookings"}`}</span></div>
          <span className="text-[11px] text-[#6e8264]">{categories.find(([key]) => key === filter)?.[1] || "All categories"}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <form key={search} className="flex min-w-0 basis-full items-center gap-2 rounded-xl border border-[#dce5dd] bg-[#fbfcf9] p-1.5 pl-3 focus-within:border-[#729769] focus-within:ring-2 focus-within:ring-[#7da178]/25 xl:min-w-[260px] xl:flex-1 xl:basis-0" role="search" onSubmit={(event) => { event.preventDefault(); update({ q: new FormData(event.currentTarget).get("q").trim() }); }}>
            <Search size={17} className="text-[#7b9174]" aria-hidden="true" />
            <input className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-xs text-[#35543e] outline-none placeholder:text-[#6c8066] focus-visible:outline-0!" type="search" name="q" aria-label="Search bookings" defaultValue={search} placeholder="Search ID, customer or service" maxLength={200} />
            <button type="submit" className={primary}>Search</button>
          </form>
          <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>select]:flex-1">
            <label className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-xl border border-[#dce5dd] bg-[#f6f9f2] px-3 text-xs text-[#536f5e]">
              <span className="font-semibold">Status</span>
              <select aria-label="Filter bookings by status" className="min-w-0 bg-transparent py-2.5 text-xs text-[#36583e]" value={filter} onChange={(event) => update({ status: event.target.value === "all" ? "" : event.target.value })}>
                {categories.map(([key, label]) => <option key={key} value={key}>{key === "all" ? "All statuses" : label}</option>)}
              </select>
            </label>
            <button type="button" className={hasFilters || showFilters ? primary : button} aria-expanded={showFilters} aria-controls="booking-filters" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15} aria-hidden="true" />Filters{hasFilters && <span className="grid size-4 place-items-center rounded-full bg-white/20 text-[10px]">{activeFilters.length}</span>}</button>
            <select className={control} aria-label="Sort bookings by" value={query.get("sort")} onChange={(event) => update({ sort: event.target.value })}>
              <option value="createdAt">Created date</option><option value="eventDate">Event date</option><option value="amount">Amount</option><option value="number">Booking number</option>
            </select>
            <button type="button" className={button} aria-label={`Sort ${descending ? "ascending" : "descending"}`} onClick={() => update({ direction: descending ? "asc" : "desc" })}>{descending ? <ArrowDownWideNarrow size={15} aria-hidden="true" /> : <ArrowUpWideNarrow size={15} aria-hidden="true" />}<span>{sortLabel}</span></button>
            <select className={control} aria-label="Bookings per page" value={pageSize} onChange={(event) => update({ pageSize: event.target.value })}>{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} / page</option>)}</select>
          </div>
        </div>

        {showFilters && <form key={activeFilters.map((key) => `${key}:${params.get(key)}`).join("|")} id="booking-filters" className="mt-4 grid gap-4 rounded-xl border border-[#dfe8d8] bg-[#f5f8f1] p-4 sm:grid-cols-2 2xl:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={(event) => {
          event.preventDefault();
          update(Object.fromEntries(new FormData(event.currentTarget)));
        }}>
          <label className="grid content-start gap-2 text-xs font-medium text-[#5a7250]">Payment status<select className={control} name="payment" defaultValue={params.get("payment") || ""}><option value="">All payments</option>{["Pending", "PartiallyPaid", "Paid", "Failed", "RefundPending", "Refunded", "PartiallyRefunded"].map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label className="grid content-start gap-2 text-xs font-medium text-[#5a7250]">Event date from<input className={control} name="eventFrom" type="date" defaultValue={params.get("eventFrom") || ""} onChange={(event) => { event.currentTarget.form.elements.eventTo.min = event.target.value; }} /></label>
          <label className="grid content-start gap-2 text-xs font-medium text-[#5a7250]">Event date to<input className={control} name="eventTo" type="date" min={params.get("eventFrom") || undefined} defaultValue={params.get("eventTo") || ""} /></label>
          <div className="flex items-end gap-2"><button type="submit" className={`${primary} flex-1`}>Apply filters</button><button type="button" className={button} onClick={() => { update({ payment: "", eventFrom: "", eventTo: "" }); setShowFilters(false); }}>Reset</button></div>
        </form>}

        {(search || hasFilters || hasStatusFilter) && <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Applied filters">
          <span className="mr-1 text-[11px] text-[#667c5c]">Showing results for</span>
          {hasStatusFilter && <button type="button" onClick={() => update({ status: "" })} className="inline-flex items-center gap-2 rounded-lg border border-[#dce6d4] bg-[#f2f6eb] px-2.5 py-1.5 text-[11px] text-[#526e41]" aria-label="Remove booking status filter">{title}<X size={12} aria-hidden="true" /></button>}
          {search && <button type="button" onClick={() => update({ q: "" })} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[#dce6d4] bg-[#f2f6eb] px-2.5 py-1.5 text-[11px] text-[#526e41]" aria-label={`Remove search: ${search}`}><span className="truncate">Search: {search}</span><X size={12} aria-hidden="true" /></button>}
          {activeFilters.map((key) => <button key={key} type="button" onClick={() => update({ [key]: "" })} className="inline-flex items-center gap-2 rounded-lg border border-[#dce6d4] bg-[#f2f6eb] px-2.5 py-1.5 text-[11px] text-[#526e41]" aria-label={`Remove ${key === "payment" ? "payment" : key === "eventFrom" ? "start date" : "end date"} filter`}>{key === "payment" ? `Payment: ${humanize(params.get(key))}` : `${key === "eventFrom" ? "From" : "To"}: ${date(params.get(key))}`}<X size={12} aria-hidden="true" /></button>)}
          <button type="button" onClick={clearFilters} className="ml-1 py-1.5 text-[11px] font-semibold text-[#456d37] underline underline-offset-4">Clear all</button>
        </div>}
      </div>

      {result.loading ? <Loading /> : result.error ? <ErrorView error={result.error} retry={result.retry} /> : <>
        {rows.length > 0 ? <>
          <div className="hidden overflow-x-auto [scrollbar-color:#a4b59c_#f5f7f2] xl:block" tabIndex={0} role="region" aria-label="Booking table">
            <table className="w-full min-w-[750px] border-collapse text-left text-xs [&_th]:border-b [&_th]:border-[#e3eadf] [&_th]:bg-[#f7f9f3] [&_th]:px-4 [&_th]:py-3.5 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:tracking-[0.06em] [&_th]:whitespace-nowrap [&_th]:text-[#5d7652] [&_th]:uppercase [&_td]:border-b [&_td]:border-[#edf0e9] [&_td]:px-4 [&_td]:py-5 [&_td]:align-middle [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-[#f8fbf4] [&_tbody_tr:last-child_td]:border-b-0">
              <thead><tr>{[
                ["Customer & event", []], ["Services", []],
                ["Event date", ["eventDate"]], ["Amount", ["amount"]], ["Status", []], ["Actions", []],
              ].map(([name, sortKeys]) => <th key={name} scope="col" aria-sort={sortKeys.includes(query.get("sort")) ? descending ? "descending" : "ascending" : undefined}>{name}</th>)}</tr></thead>
              <tbody>{rows.map((row) => <tr key={row.id}>
                <td className="min-w-[155px] max-w-[200px]"><Customer row={row} /></td>
                <td className="min-w-[130px] max-w-[200px]"><p className="text-xs leading-relaxed wrap-anywhere text-[#476540]">{row.services || "No services listed"}</p>{row.bookingQuantity != null && <p className="mt-1.5 text-[10px] text-[#6a7f60]">Booking quantity: <span className="font-medium">{row.bookingQuantity}</span></p>}</td>
                <td className="min-w-[110px]"><EventDate row={row} /></td>
                <td className="whitespace-nowrap"><span className="text-[13px] font-semibold tabular-nums text-[#345b38]">{money(row.amount)}</span></td>
                <td><BookingStatus value={row.status} /></td>
                <td><BookingActions row={row} onDecision={openDecision} disabled={decisionBusy} onMessage={openCustomerChat} openingBookingId={openingBookingId} /></td>
              </tr>)}</tbody>
            </table>
          </div>

          <div className="grid gap-4 bg-[#f7f9f4] p-4 md:grid-cols-2 xl:hidden" aria-label="Booking cards">
            {rows.map((row) => <article key={row.id} className="min-w-0 rounded-2xl border border-[#dfe7d8] bg-white p-4">
              <div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><Link className="text-[13px] font-semibold wrap-anywhere text-[#2f6748] hover:underline" to={`/vendor/bookings/${row.id}`}>{row.number}</Link><p className="mt-1 text-[10px] text-[#6e8264]">Created {date(row.createdAt)}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums text-[#3d6236]">{money(row.amount)}</span></div>
              <Customer row={row} />
              <div className="my-4 rounded-xl bg-[#f7f9f2] p-3"><p className="text-xs font-medium wrap-anywhere text-[#4c6c40]">{row.services || "No services listed"}</p>{row.bookingQuantity != null && <p className="mt-1 text-[11px] text-[#687e5c]">Booking quantity: {row.bookingQuantity}</p>}<div className="mt-3"><EventDate row={row} /></div></div>
              <StatusPair row={row} />
              <Link className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dce6d4] bg-[#f5f9ef] px-3 py-2 text-xs font-semibold text-[#4b7238] hover:bg-[#eaf2e1]" to={`/vendor/bookings/${row.id}`} aria-label={`View booking ${row.number}`}><Eye size={15} aria-hidden="true" />View booking<ArrowRight size={14} aria-hidden="true" /></Link>
              <button type="button" disabled={decisionBusy || openingBookingId != null} onClick={() => openCustomerChat(row.id)} aria-label={`Message ${row.customer || "customer"} about booking ${row.number}`} aria-busy={openingBookingId === row.id} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#d1e3dc] bg-[#edf6f2] px-3 py-2 text-xs font-semibold text-[#39745e] hover:bg-[#dfeee7] disabled:opacity-45">
                {openingBookingId === row.id ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <MessageSquare size={15} aria-hidden="true" />}{openingBookingId === row.id ? "Opening conversation…" : "Message customer"}
              </button>
              {row.status === "Pending" && <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled={decisionBusy} onClick={() => openDecision(row, "Accept")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#cde0c7] bg-[#edf6e8] px-3 py-2 text-xs font-semibold text-[#477536] hover:bg-[#e0efd6] disabled:opacity-45"><Check size={15} aria-hidden="true" />Approve</button>
                <button type="button" disabled={decisionBusy} onClick={() => openDecision(row, "Reject")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#ebd4ce] bg-[#fff3ef] px-3 py-2 text-xs font-semibold text-[#aa574b] hover:bg-[#fbe5df] disabled:opacity-45"><X size={15} aria-hidden="true" />Reject</button>
              </div>}
            </article>)}
          </div>
        </> : <div className="px-4 py-3">
          <Empty title={page > pages ? "No bookings on this page" : filter === "all" ? "No bookings found" : `No ${title.toLowerCase()} found`} text={search || hasFilters || hasStatusFilter ? "Try another search or adjust your filters." : "Bookings in this category will appear here."} />
          {(search || hasFilters || hasStatusFilter || page > pages) && <div className="mb-6 flex justify-center"><button className={button} type="button" onClick={page > pages ? () => update({ page: 1 }) : clearFilters}>{page > pages ? "Back to first page" : "Clear search and filters"}</button></div>}
        </div>}

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e6ece1] px-4 py-4 text-xs text-[#677e5c] sm:px-5">
          <p>Showing <span className="font-semibold tabular-nums text-[#446538]">{rows.length ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}` : "0"}</span> of <span className="font-semibold tabular-nums text-[#446538]">{total.toLocaleString("en-IN")}</span> bookings</p>
          <div className="flex items-center gap-2"><button type="button" className={button} disabled={page <= 1} onClick={() => update({ page: page - 1 })} aria-label="Previous page"><ChevronLeft size={15} aria-hidden="true" /><span className="hidden sm:inline">Previous</span></button><span className="px-2 text-[11px] tabular-nums">Page {page} of {pages}</span><button type="button" className={button} disabled={page >= pages} onClick={() => update({ page: page + 1 })} aria-label="Next page"><span className="hidden sm:inline">Next</span><ChevronRight size={15} aria-hidden="true" /></button></div>
        </footer>
      </>}
    </section>
    {decision && <Modal title={decision.action === "Accept" ? "Approve booking" : "Reject booking"} busy={decisionBusy} close={() => { if (!decisionBusy) setDecision(null); }}>
      <form onSubmit={submitDecision} className="space-y-5 p-5 text-sm text-[#496641] sm:p-6">
        <div className="rounded-xl border border-[#e1e8da] bg-[#f6f9f1] p-4">
          <p className="font-semibold wrap-anywhere text-[#35583b]">{decision.row.customer || "Customer not specified"}</p>
          <p className="mt-1 text-xs wrap-anywhere text-[#657b59]">{decision.row.services || decision.row.event || "Event booking"}</p>
          <p className="mt-2 text-xs text-[#657b59]">{decision.row.eventDate ? date(decision.row.eventDate) : "Quantity reservation"} · {money(decision.row.amount)}</p>
        </div>
        <p className="text-xs leading-relaxed text-[#647a5b]">{decision.action === "Accept" ? "Confirm that you can fulfil this booking before approving." : "Add a reason to help the customer understand your decision."}</p>
        <div>
          <label htmlFor="booking-list-decision-note" className="mb-2 block text-xs font-medium text-[#4d6b42]">{decision.action === "Reject" ? "Reason for rejection (required)" : "Note (optional)"}</label>
          <textarea id="booking-list-decision-note" name="note" className={`${control} block w-full resize-y`} rows={4} maxLength={1000} required={decision.action === "Reject"} disabled={decisionBusy} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} aria-describedby={decisionError ? "booking-list-decision-error" : undefined} placeholder={decision.action === "Reject" ? "Why are you unable to accept this booking?" : "Add a note about this booking…"} />
        </div>
        {decisionError && <p id="booking-list-decision-error" role="alert" className="rounded-lg border border-[#ebd4ce] bg-[#fff3ef] px-3 py-2.5 text-xs text-[#a34e43]">{decisionError}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className={button} disabled={decisionBusy} onClick={() => setDecision(null)}>Cancel</button>
          <button type="submit" disabled={decisionBusy} className={decision.action === "Accept" ? primary : "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#a75a4d] bg-[#a75a4d] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#91493e] disabled:opacity-50"}>
            {decisionBusy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : decision.action === "Accept" ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}{decisionBusy ? "Saving…" : decision.action === "Accept" ? "Approve booking" : "Reject booking"}
          </button>
        </div>
      </form>
    </Modal>}
  </div>;
}
