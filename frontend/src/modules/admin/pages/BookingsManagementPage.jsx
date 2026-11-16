import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, SlidersHorizontal, CalendarCheck, Clock, CheckCircle2, CalendarDays,
  XCircle, IndianRupee, Percent, Wallet,
  Eye, RefreshCw, RotateCcw, ArrowUpDown, ChevronRight, ChevronLeft, X, Inbox,
} from "lucide-react";
import { useAdminData, useDebounced, money, date, number } from "../services-management.api";
import { Loading, ErrorState, Field } from "../components/BookingUI";
import AdminDialog from "../components/AdminDialog";

const button = "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#dce6e1] bg-white px-3.5 py-2 text-xs font-medium text-[#45645a] transition-colors hover:border-[#a7c3b7] hover:bg-[#f1f7f4] disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#176b60] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#11564d]";
const select = "min-h-10 max-w-full rounded-lg! border! border-[#dce6e1]! bg-white! px-3! py-2! text-xs! text-[#45645a]!";
const primaryMetrics = [
  ["total", "Total bookings", CalendarCheck, "bg-[#eaf3ef] text-[#176b60]", "Across all booking stages"],
  ["pending", "Pending approval", Clock, "bg-amber-50 text-amber-700", "Awaiting a booking decision", "Pending"],
  ["confirmed", "Confirmed", CheckCircle2, "bg-emerald-50 text-emerald-700", "Ready for fulfilment", "Confirmed"],
  ["upcoming", "Upcoming events", CalendarDays, "bg-blue-50 text-blue-700", "Scheduled today or later"],
];
const states = ["Pending", "Accepted", "PaymentPending", "Confirmed", "InProgress", "Completed", "Cancelled", "Rejected", "Disputed", "Refunded"];
const filterLabels = {
  q: "Search", status: "Status", payment: "Payment", customer: "Customer", vendor: "Vendor",
  category: "Category", location: "Location", changeRequest: "Change request", eventFrom: "Event from",
  eventTo: "Event to", bookedFrom: "Booked from", bookedTo: "Booked to", minAmount: "Min. amount", maxAmount: "Max. amount",
};
const readable = (value) => String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2");

function DashboardMetricCard({ label, value, icon: Icon, description, tone, featured = false, currency = false, onClick }) {
  const Card = onClick ? "button" : "article";
  return (
    <Card
      {...(onClick ? { type: "button", onClick, "aria-label": `Show ${label.toLowerCase()} bookings` } : {})}
      className={`min-w-0 overflow-hidden rounded-xl border px-[19px] py-[17px] text-left shadow-[0_3px_8px_#263f2d02] min-[1500px]:px-[23px] min-[1500px]:py-[21px] ${featured ? "border-[#176b60] bg-[#176b60] text-white" : "border-[#e5ebe6] bg-white text-[#263d37]"} ${onClick ? "transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_#243f3210] motion-reduce:transform-none motion-reduce:transition-none" : ""}`}
    >
      <div className={`flex items-center justify-between gap-2 text-[10px] ${featured ? "text-[#abd2c3]" : "text-[#859289]"}`}>
        <span>{label}</span>
        <span className={`grid size-[31px] shrink-0 place-items-center rounded-lg ${featured ? "bg-white/10 text-[#c5e2d3]" : tone || "bg-[#f0f5ef] text-[#5e8975]"}`}>
          <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
        </span>
      </div>
      <strong className={`mt-[7px] mb-3 block leading-[1.3] font-semibold tracking-[-0.8px] tabular-nums [overflow-wrap:anywhere] ${currency ? "text-[24px] sm:text-[26px] min-[1500px]:text-[30px]" : "text-[26px] sm:text-[28px] min-[1500px]:text-[32px]"}`}>{value}</strong>
      <span className={`block text-[10px] leading-relaxed ${featured ? "text-[#abd2c3]" : "text-[#92a096]"}`}>{description}</span>
    </Card>
  );
}

function StatusBadge({ value }) {
  const tone = ["Confirmed", "Paid", "Completed", "Success"].includes(value)
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
    : ["Pending", "Accepted", "PaymentPending", "PartiallyPaid", "RefundPending", "Processing"].includes(value)
      ? "bg-amber-50 text-amber-800 ring-amber-600/10"
      : ["Cancelled", "Rejected", "Failed", "Disputed"].includes(value)
        ? "bg-rose-50 text-rose-700 ring-rose-600/10"
        : value === "InProgress" ? "bg-blue-50 text-blue-700 ring-blue-600/10"
          : ["Refunded", "PartiallyRefunded"].includes(value) ? "bg-violet-50 text-violet-700 ring-violet-600/10"
            : "bg-slate-50 text-slate-600 ring-slate-500/10";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${tone}`}>
    <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
    {value === "Accepted" ? "Vendor accepted" : readable(value) || "Not recorded"}
  </span>;
}

function Identity({ name, to, id }) {
  return <Link to={to} className="group block min-w-0">
    <span className="min-w-0">
      <span className="block max-w-44 truncate text-xs font-semibold text-[#304d42] group-hover:text-[#176b60]" title={name}>{name || "Not recorded"}</span>
      <span className="mt-0.5 block max-w-36 truncate font-mono text-[10px] text-slate-400" title={id}>{id}</span>
    </span>
  </Link>;
}

function Filters({ params, apply, close }) {
  const [values, setValues] = useState(
    Object.fromEntries(params)
  );

  const [query, setQuery] = useState("");

  const search = useDebounced(query);

  const options = useAdminData(
    `/bookings/options?q=${encodeURIComponent(search)}${
      values.vendor ? `&vendor=${values.vendor}` : ""
    }${
      values.customer ? `&customer=${values.customer}` : ""
    }`
  );

  const change = (name, value) => {
    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const select = (key, fieldLabel, choices) => (
    <Field key={key} label={fieldLabel}>
      <select
        value={values[key] || ""}
        onChange={(event) =>
          change(key, event.target.value)
        }
      >
        <option value="">All</option>

        {choices.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </Field>
  );

  const input = (
    key,
    fieldLabel,
    type = "text",
    extra = {}
  ) => (
    <Field
      key={key}
      label={fieldLabel}
      type={type}
      value={values[key] || ""}
      onChange={(event) =>
        change(key, event.target.value)
      }
      {...extra}
    />
  );

  return (
    <AdminDialog
      title="Filter bookings"
      close={close}
    >
      <form
        className="grid gap-5 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-xs [&_label]:text-[#45645a] [&_input]:min-h-10 [&_input]:w-full! [&_input]:text-xs! [&_select]:min-h-10 [&_select]:w-full! [&_select]:text-xs!"
        onSubmit={(event) => {
          event.preventDefault();
          apply(values);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {select("changeRequest", "Pending change request", [["Cancellation", "Cancellation"], ["Reschedule", "Reschedule"]])}
          {/* Booking Status */}

          {select(
            "status",
            "Booking status",
            states.map((status) => [
              status,
              status.replace(
                /([a-z])([A-Z])/g,
                "$1 $2"
              ),
            ])
          )}

          {/* Payment Status */}

          {select(
            "payment",
            "Payment status",
            [
              "Pending",
              "PartiallyPaid",
              "Paid",
              "Failed",
              "RefundPending",
              "Refunded",
              "PartiallyRefunded",
            ].map((status) => [
              status,
              status.replace(
                /([a-z])([A-Z])/g,
                "$1 $2"
              ),
            ])
          )}

          {/* Customer and Vendor Search */}

          <Field
            label="Find customer or vendor"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search name or business"
          />

          {/* Customer */}

          {select(
            "customer",
            "Customer",
            (
              Array.isArray(options.data?.customers)
                ? options.data.customers
                : []
            ).map((row) => [
              row.id,
              row.name,
            ])
          )}

          {/* Vendor */}

          {select(
            "vendor",
            "Vendor",
            (
              Array.isArray(options.data?.vendors)
                ? options.data.vendors
                : []
            ).map((row) => [
              row.id,
              row.name,
            ])
          )}

          {/* Category */}

          {select(
            "category",
            "Category",
            (
              Array.isArray(options.data?.categories)
                ? options.data.categories
                : []
            ).map((row) => [
              row.id,
              row.name,
            ])
          )}

          {/* Location */}

          {input(
            "location",
            "Event location"
          )}

          {/* Event Date */}

          {input(
            "eventFrom",
            "Event date from",
            "date"
          )}

          {input(
            "eventTo",
            "Event date to",
            "date",
            {
              min:
                values.eventFrom ||
                undefined,
            }
          )}

          {/* Booking Date */}

          {input(
            "bookedFrom",
            "Booking created from",
            "date"
          )}

          {input(
            "bookedTo",
            "Booking created to",
            "date",
            {
              min:
                values.bookedFrom ||
                undefined,
            }
          )}

          {/* Amount Range */}

          {input(
            "minAmount",
            "Minimum amount",
            "number",
            {
              min: 0,
              step: ".01",
            }
          )}

          {input(
            "maxAmount",
            "Maximum amount",
            "number",
            {
              min:
                values.minAmount || 0,
              step: ".01",
            }
          )}
        </div>

        {/* Filter Error */}

        {options.error && (
          <p role="alert">
            {options.error.message}
          </p>
        )}

        {/* Dialog Buttons */}

        <footer className="flex justify-between gap-2">
          <button
            type="button"
            className={button}
            onClick={() =>
              apply({
                q: values.q || "",
              })
            }
          >
            Clear filters
          </button>

          <button
            type="submit"
            className={primaryButton}
          >
            Apply filters
          </button>
        </footer>
      </form>
    </AdminDialog>
  );
}

export default function BookingsManagementPage() {
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const state = useAdminData(`/bookings?${params.toString()}`, revision);
  const stats = useAdminData("/bookings/statistics", revision);
  const data = state.data;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const activeStatus = params.get("status") || "";
  const activeFilters = [...params].filter(([key, value]) => filterLabels[key] && value);
  const filterCount = activeFilters.filter(([key]) => key !== "q" && key !== "status").length;
  const refreshing = Boolean(state.loading || stats.loading);
  const update = (values) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== "" && value !== null && value !== undefined) next.set(key, String(value));
    }
    setParams(next);
  };
  const change = (values) => update({ ...Object.fromEntries(params), ...values, page: 1 });
  const refresh = () => setRevision((value) => value + 1);
  const metric = (key, currency = false) => stats.data
    ? currency ? money(stats.data[key] ?? 0) : number(stats.data[key] ?? 0)
    : stats.error ? "—" : "…";
  const actions = (row) => {
    const allowed = Array.isArray(row.actions) ? row.actions : [];
    return <div className="flex flex-wrap items-center gap-2">
      <Link to={`/admin/bookings/${row.id}`} aria-label={`View booking ${row.number}`} title="View booking" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#cfe0d6] bg-[#f3f8f5] text-[#176b60] transition-colors hover:border-[#a7c3b7] hover:bg-[#e5f1ea]"><Eye size={16} aria-hidden="true" /></Link>
      {allowed.includes("cancel") && <Link aria-label={`Cancel booking ${row.number}`} title="Cancel booking" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50/60 text-rose-600 transition-colors hover:border-rose-200 hover:bg-rose-100 hover:text-rose-800!" to={`/admin/bookings/${row.id}?action=cancel`}><XCircle size={16} aria-hidden="true" /></Link>}
      {allowed.includes("refund") && <Link aria-label={`Refund booking ${row.number}`} title="Refund booking" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-100 bg-amber-50/60 text-amber-700 transition-colors hover:border-amber-200 hover:bg-amber-100 hover:text-amber-800!" to={`/admin/bookings/${row.id}?action=refund&tab=Payment`}><RotateCcw size={16} aria-hidden="true" /></Link>}
    </div>;
  };

  return <div className="grid w-full min-w-0 gap-5 text-[#253f3a] sm:gap-6 [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-3 [&_:focus-visible]:outline-[#176b60]">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] text-[#7b8d84]"><span>Administration</span><ChevronRight size={12} aria-hidden="true" /><span className="font-medium text-[#176b60]">Booking operations</span></div>
        <h1 className="m-0! text-[26px]! leading-tight! font-semibold! tracking-tight! sm:text-[30px]!">Bookings management</h1>
        <p className="mt-2 text-xs! leading-relaxed text-[#75867d]! sm:text-sm!">A clear view of every booking, from first request to final payment.</p>
      </div>
      <button type="button" className={`${button} self-start shadow-sm sm:self-auto`} onClick={refresh} disabled={refreshing}>
        <RefreshCw size={14} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />{refreshing ? "Refreshing…" : "Refresh bookings"}
      </button>
    </header>

    <section aria-label="Booking overview" className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 min-[1001px]:grid-cols-4 min-[1201px]:gap-4 min-[1500px]:gap-5">
      {primaryMetrics.map(([key, label, Icon, tone, description, status]) => (
        <DashboardMetricCard
          key={key}
          label={label}
          value={metric(key)}
          icon={Icon}
          description={description}
          featured={key === "pending"}
          tone={tone}
          onClick={status ? () => change({ status }) : undefined}
        />
      ))}
    </section>

    <section aria-label="Booking finances" className="grid min-w-0 grid-cols-1 gap-3 min-[1001px]:grid-cols-3 min-[1201px]:gap-4 min-[1500px]:gap-5">
      {[
        ["value", "Total booking value", IndianRupee, "Gross value across all bookings", "bg-[#f0f5ef] text-[#5e8975]"],
        ["commission", "Platform commission", Percent, "Earnings from booking commissions", "bg-[#f9f5ec] text-[#ac8f59]"],
        ["payable", "Vendor payable", Wallet, "Outstanding vendor settlements", "bg-[#f0f5ef] text-[#5e8975]"],
      ].map(([key, label, Icon, description, tone]) => (
        <DashboardMetricCard key={key} label={label} value={metric(key, true)} icon={Icon} description={description} tone={tone} currency />
      ))}
    </section>
    {stats.error && <div role="alert" className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">Statistics unavailable.<button type="button" className="font-semibold underline underline-offset-2" onClick={refresh}>Retry</button></div>}

    <section aria-label="Bookings list" className="min-w-0 overflow-hidden rounded-2xl border border-[#e0e9e3] bg-white shadow-sm shadow-[#284d3810]">
      <div className="flex flex-wrap items-center gap-2.5 bg-[#fcfdfc] p-4 sm:px-5">
        <form className="flex min-w-0 flex-[1_1_260px] items-center gap-2 rounded-lg border border-[#dce6e1] bg-white pr-1.5 pl-3 focus-within:border-[#82b29f] focus-within:ring-2 focus-within:ring-[#176b60]/10" onSubmit={(event) => { event.preventDefault(); change({ q: new FormData(event.currentTarget).get("q") }); }}>
          <Search size={16} className="shrink-0 text-[#8ba094]" aria-hidden="true" />
          <input key={params.get("q") || ""} type="search" name="q" maxLength={200} defaultValue={params.get("q") || ""} aria-label="Search bookings" placeholder="Search booking, customer, vendor…" className="min-w-0! flex-1 border-0! bg-transparent! px-0! py-2.5! text-xs! shadow-none! outline-none! placeholder:text-[#9aa89f]" />
          <button type="submit" className="rounded-md bg-[#edf4ef] px-2.5 py-1.5 text-[11px] font-medium text-[#176b60] transition-colors hover:bg-[#dfebe3]">Search</button>
        </form>
        <select aria-label="Filter bookings by status" className={select} value={activeStatus} onChange={(event) => change({ status: event.target.value })}>
          <option value="">All statuses</option>
          {states.map((status) => <option key={status} value={status}>{readable(status)}</option>)}
        </select>
        <button type="button" className={button} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={14} aria-hidden="true" />Filters{filterCount > 0 && <span className="rounded bg-[#176b60] px-1.5 py-0.5 text-[10px] text-white">{filterCount}</span>}</button>
        <select aria-label="Sort bookings" className={select} value={params.get("sort") || "createdAt"} onChange={(event) => change({ sort: event.target.value })}>{[["createdAt", "Created date"], ["number", "Booking number"], ["customer", "Customer"], ["vendor", "Vendor"], ["eventDate", "Event date"], ["bookingDate", "Scheduled date"], ["amount", "Amount"], ["status", "Status"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button type="button" className={button} onClick={() => change({ direction: params.get("direction") === "asc" ? "desc" : "asc" })} aria-label={`Sort ${params.get("direction") === "asc" ? "descending" : "ascending"}`}><ArrowUpDown size={14} aria-hidden="true" />{params.get("direction") === "asc" ? "Ascending" : "Descending"}</button>
      </div>
      {activeFilters.length > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-[#edf1ee] px-4 py-3 sm:px-5">
        <span className="mr-1 text-[11px] text-[#8a9a90]">Applied:</span>
        {activeFilters.map(([key, value]) => <button key={key} type="button" onClick={() => change({ [key]: "" })} aria-label={`Remove ${filterLabels[key].toLowerCase()} filter`} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#edf4ef] px-2 py-1 text-[10px] text-[#456e56]"><span className="max-w-48 truncate">{filterLabels[key]}: {readable(value)}</span><X size={11} className="shrink-0" aria-hidden="true" /></button>)}
        <button type="button" className="ml-auto px-1 py-1 text-[11px] text-[#176b60] underline decoration-[#adc5b8] underline-offset-4" onClick={() => update({ sort: params.get("sort"), direction: params.get("direction"), pageSize: params.get("pageSize") })}>Clear all</button>
      </div>}

      <div aria-busy={Boolean(state.loading)}>
        {state.loading && <div className="p-5"><Loading /></div>}
        {state.error && <ErrorState error={state.error} retry={refresh} />}
        {!state.loading && !state.error && data && rows.length === 0 && <div className="flex flex-col items-center px-5 py-14 text-center">
          <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-[#edf4ef] text-[#70957d]"><Inbox size={26} strokeWidth={1.5} aria-hidden="true" /></span>
          <h3 className="text-sm font-semibold">No bookings found</h3>
          <p className="mt-1.5 max-w-sm text-xs! leading-relaxed text-[#819189]!">{activeFilters.length ? "Try a different search or clear your filters to see more bookings." : "Your customer bookings will appear here as they come in."}</p>
          {activeFilters.length > 0 && <button type="button" className={`${button} mt-5`} onClick={() => update({})}>Clear filters</button>}
        </div>}
        {!state.loading && !state.error && rows.length > 0 && <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1050px] border-collapse text-left text-xs [&_th]:whitespace-nowrap [&_th]:border-y [&_th]:border-[#e8eeea] [&_th]:bg-[#f5f8f6] [&_th]:px-4 [&_th]:py-3 [&_th]:text-[10px] [&_th]:font-medium [&_th]:tracking-wider [&_th]:text-[#809187] [&_th]:uppercase [&_td]:px-4 [&_td]:py-4 [&_td]:align-middle">
              <caption className="sr-only">Customer bookings with vendor, event, amount, payment, status, and available actions</caption>
              <thead><tr>{["Booking", "Customer", "Vendor", "Event & schedule", "Amount", "Payment", "Status", "Actions"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#edf1ee]">{rows.map((row) => <tr key={row.id} className="transition-colors hover:bg-[#f8fbf9]">
                <td><Link className="whitespace-nowrap text-[11px] font-semibold text-[#176b60]" to={`/admin/bookings/${row.id}`}>{row.number}</Link><span className="mt-1.5 block whitespace-nowrap text-[10px] text-[#8c9b92]">Created {date(row.createdAt)}</span></td>
                <td><Identity name={row.customer} id={row.customerId} to={`/admin/customers/${row.customerId}`} /></td>
                <td><Identity name={row.vendor} id={row.vendorId} to={`/admin/vendors/${row.vendorId}`} /></td>
                <td><span className="block max-w-44 truncate font-medium" title={row.event}>{row.event || "Event not specified"}</span><span className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-[10px] text-[#86978c]"><CalendarDays size={11} aria-hidden="true" />{date(row.eventDate)}</span><Link className="mt-1 block text-[10px] text-[#49816a]" to={`/admin/bookings/${row.id}?tab=Items`}>{number(row.services ?? 0)} services</Link></td>
                <td className="whitespace-nowrap font-semibold tabular-nums">{money(row.amount ?? 0)}</td><td><StatusBadge value={row.paymentStatus} /></td><td><StatusBadge value={row.status} /></td><td>{actions(row)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="grid gap-3 border-t border-[#e8eeea] p-4 md:hidden">{rows.map((row) => <article key={row.id} className="min-w-0 rounded-xl border border-[#e0e9e3] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><Link className="break-all text-xs font-semibold text-[#176b60]" to={`/admin/bookings/${row.id}`}>{row.number}</Link><strong className="text-sm tabular-nums">{money(row.amount ?? 0)}</strong></div>
            <div className="mt-4 grid gap-3 min-[480px]:grid-cols-2"><Identity name={row.customer} id={row.customerId} to={`/admin/customers/${row.customerId}`} /><Identity name={row.vendor} id={row.vendorId} to={`/admin/vendors/${row.vendorId}`} /></div>
            <div className="my-4 rounded-lg bg-[#f6f9f6] p-3"><span className="block text-xs font-medium">{row.event || "Event not specified"}</span><div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#7b8f80]"><span className="flex items-center gap-1.5"><CalendarDays size={12} aria-hidden="true" />{date(row.eventDate)}</span><Link className="text-[#176b60]" to={`/admin/bookings/${row.id}?tab=Items`}>{number(row.services ?? 0)} services</Link></div></div>
            <dl className="flex flex-wrap gap-x-5 gap-y-3"><div><dt className="mb-1.5 text-[10px] text-[#8a9a90]">Booking status</dt><dd><StatusBadge value={row.status} /></dd></div><div><dt className="mb-1.5 text-[10px] text-[#8a9a90]">Payment</dt><dd><StatusBadge value={row.paymentStatus} /></dd></div></dl>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] pt-3"><span className="text-[10px] text-[#8c9b92]">Created {date(row.createdAt)}</span>{actions(row)}</div>
          </article>)}</div>
        </>}
      </div>
      {!state.loading && !state.error && data && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8eeea] bg-[#fcfdfc] px-4 py-3.5 text-[11px] text-[#829288] sm:px-5">
        <div className="flex flex-wrap items-center gap-3"><span>{data.total ? `${number((page - 1) * data.pageSize + 1)}–${number(Math.min(page * data.pageSize, data.total))} of ${number(data.total)} bookings` : "0 bookings"}</span><select aria-label="Bookings per page" className="min-h-8 rounded-md! border! border-[#e0e7e2]! bg-white! px-2! py-1! text-[11px]!" value={params.get("pageSize") || "20"} onChange={(event) => change({ pageSize: event.target.value })}>{[10, 20, 50, 100].map((value) => <option key={value} value={value}>{value} / page</option>)}</select></div>
        <div className="flex items-center gap-2"><button type="button" aria-label="Previous page" className="grid size-8 place-items-center rounded-lg border border-[#dce6e1] bg-white text-[#45645a] hover:bg-[#edf4ef] disabled:opacity-35" disabled={page <= 1} onClick={() => update({ ...Object.fromEntries(params), page: page - 1 })}><ChevronLeft size={15} /></button><span className="px-1">Page <strong className="font-medium text-[#45645a]">{page}</strong> of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><button type="button" aria-label="Next page" className="grid size-8 place-items-center rounded-lg border border-[#dce6e1] bg-white text-[#45645a] hover:bg-[#edf4ef] disabled:opacity-35" disabled={page * data.pageSize >= data.total} onClick={() => update({ ...Object.fromEntries(params), page: page + 1 })}><ChevronRight size={15} /></button></div>
      </footer>}
    </section>
    {filtersOpen && <Filters params={params} close={() => setFiltersOpen(false)} apply={(values) => { update({ ...values, page: 1 }); setFiltersOpen(false); }} />}
  </div>;
}
