import { Link } from "react-router-dom";
import {
  CreditCard, Clock, RefreshCw, CircleCheck, CircleX, RotateCcw,
  Search, SlidersHorizontal, Download, LoaderCircle, ArrowUpDown,
  Eye, ChevronLeft, ChevronRight, X, Inbox, AlertCircle,
} from "lucide-react";
import { date, money, number } from "../api";

const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6e1] bg-white px-3 py-2 text-xs font-medium text-[#45645a] transition-colors hover:border-[#afccba] hover:bg-[#f1f7f4] disabled:cursor-not-allowed disabled:opacity-40";
const control = "min-h-10 max-w-full rounded-lg! border! border-[#dce6e1]! bg-white! px-3! py-2! text-xs! text-[#45645a]!";
const labels = { name: "Payment", transactionId: "Transaction ID", gateway: "Gateway", customer: "Customer", vendor: "Vendor", booking: "Booking", amount: "Amount", currency: "Currency", method: "Method", status: "Status", createdAt: "Created" };
const metrics = [
  ["total", "All payments", "", CreditCard, "bg-[#edf4ef] text-[#176b60]", "Across all payment stages"],
  ["pending", "Pending", "Pending", Clock, "bg-amber-50 text-amber-700", "Awaiting confirmation"],
  ["processing", "Processing", "Processing", RefreshCw, "bg-blue-50 text-blue-700", "Processing with the gateway"],
  ["success", "Successful", "Success", CircleCheck, "bg-emerald-50 text-emerald-700", "Successful payment records"],
  ["failed", "Failed", "Failed", CircleX, "bg-rose-50 text-rose-600", "Unsuccessful payment attempts"],
  ["refunded", "Refunded", "Refunded", RotateCcw, "bg-violet-50 text-violet-600", "Refunded payment records"],
];

function PaymentStatus({ value }) {
  const tone = value === "Success" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
    : value === "Failed" ? "bg-rose-50 text-rose-700 ring-rose-600/10"
      : value === "Refunded" ? "bg-violet-50 text-violet-700 ring-violet-600/10"
        : ["Pending", "Processing"].includes(value) ? "bg-amber-50 text-amber-800 ring-amber-600/10"
          : "bg-slate-50 text-slate-600 ring-slate-500/10";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset ${tone}`}><span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />{value || "Not recorded"}</span>;
}

function Cell({ field, row }) {
  const value = row[field];
  if (field === "name") return <Link to={`/admin/finance/payments/${row.id}`} className="block max-w-52 truncate font-mono text-[11px] font-semibold text-[#176b60]" title={value}>{value || "View payment"}</Link>;
  if (field === "status") return <PaymentStatus value={value} />;
  if (value === null || value === undefined || value === "") return <span className="text-[#a0afa5]">—</span>;
  if (field === "amount") return <strong className="font-semibold whitespace-nowrap text-[#2d503c] tabular-nums">{row.currency && row.currency !== "INR" ? new Intl.NumberFormat("en-IN", { style: "currency", currency: row.currency }).format(Number(value)) : money(value)}</strong>;
  if (field === "createdAt") return <span className="whitespace-nowrap text-[#829589]">{date(value)}</span>;
  if (["transactionId", "booking"].includes(field)) return <span className="block max-w-48 truncate font-mono text-[10px] text-[#74917d]" title={String(value)}>{value}</span>;
  return <span className={`block max-w-44 truncate text-xs text-[#526e5c] ${field === "method" ? "capitalize" : ""}`} title={String(value)}>{String(value)}</span>;
}

export default function PaymentRecords({
  data, rows, columns, visible, statuses, gatewayOptions, loading, error, beforeTable,
  query, status, gateway, from, to, sort, direction, page, pageSize, total, totalPages,
  columnsOpen, exporting, onQueryChange, onStatusChange, onGatewayChange,
  onFromChange, onToChange, onSort, onPageChange, onPageSizeChange,
  onColumnsOpenChange, onColumnsChange, onExport, onRetry, onClearFilters,
}) {
  const filters = [
    ...(query ? [["Search", query, () => onQueryChange("")]] : []),
    ...(status ? [["Status", status, () => onStatusChange("")]] : []),
    ...(gateway ? [["Gateway", gateway, () => onGatewayChange("")]] : []),
    ...(from ? [["From", date(from), () => onFromChange("")]] : []),
    ...(to ? [["To", date(to), () => onToChange("")]] : []),
  ];
  const view = (row) => <Link to={`/admin/finance/payments/${row.id}`} title="View payment details" aria-label={`View payment ${row.name || row.id}`} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#cfe0d6] bg-[#f3f8f5] text-[#176b60] transition-colors hover:border-[#a7c3b7] hover:bg-[#e5f1ea]"><Eye size={16} aria-hidden="true" /></Link>;

  return <div className="grid w-full min-w-0 gap-5 text-[#2b4638] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-3 [&_:focus-visible]:outline-[#176b60]">
    <section aria-label="Payment statistics" aria-busy={loading} className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 min-[800px]:grid-cols-3 min-[1450px]:grid-cols-6">
      {metrics.map(([key, title, value, Icon, tone, description]) => {
        const selected = status === value;
        return <button key={key} type="button" aria-pressed={selected} aria-label={`Show ${title.toLowerCase()}`} onClick={() => onStatusChange(value)} className={`min-w-0 rounded-xl border p-4 text-left shadow-[0_3px_8px_#263f2d02] transition-[border-color,box-shadow] hover:shadow-[0_6px_16px_#243f3210] ${selected ? "border-[#176b60] bg-[#176b60] text-white" : "border-[#e0e9e3] bg-white hover:border-[#adcbb8]"}`}>
          <div className="flex min-h-8 items-center justify-between gap-2"><span className={`text-[11px] ${selected ? "text-[#abd2c3]" : "text-[#819587]"}`}>{title}</span><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${selected ? "bg-white/10 text-[#c5e2d3]" : tone}`}><Icon size={17} strokeWidth={1.7} aria-hidden="true" /></span></div>
          <strong className={`mt-2 block text-[28px] leading-tight font-semibold tracking-tight tabular-nums ${selected ? "text-white" : "text-[#294b40]"}`}>
            {loading ? <span className={`block h-9 w-12 animate-pulse rounded motion-reduce:animate-none ${selected ? "bg-white/15" : "bg-[#edf2ed]"}`} aria-label="Loading count" /> : error || data?.summary?.[key] == null ? "—" : number(data.summary[key])}
          </strong>
          <span className={`mt-2 block text-[9px] leading-relaxed ${selected ? "text-[#abd2c3]" : "text-[#92a397]"}`}>{description}</span>
        </button>;
      })}
    </section>

    {beforeTable}

    <section aria-label="Payment records" className="min-w-0 rounded-2xl border border-[#e0e9e3] bg-white shadow-sm shadow-[#254c3810]">
      <div className="flex flex-wrap items-center gap-2.5 rounded-t-2xl bg-[#fcfdfc] p-4 sm:px-5">
        <label className="flex min-w-0 flex-[1_1_240px] items-center gap-2 rounded-lg border border-[#dce6e1] bg-white px-3 focus-within:border-[#82b29f] focus-within:ring-2 focus-within:ring-[#176b60]/10">
          <Search size={16} className="shrink-0 text-[#8ba094]" aria-hidden="true" />
          <input aria-label="Search payments" type="search" maxLength={200} placeholder="Search payment, transaction or customer…" value={query} onChange={(event) => onQueryChange(event.target.value)} className="min-w-0! flex-1 border-0! bg-transparent! px-0! py-2.5! text-xs! shadow-none! outline-none! placeholder:text-[#9aa89f]" />
        </label>
        <select aria-label="Filter payment gateway" className={control} value={gateway} onChange={(event) => onGatewayChange(event.target.value)}><option value="">All gateways</option>{gatewayOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filter payment status" className={control} value={status} onChange={(event) => onStatusChange(event.target.value)}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-[#819587]">From<input aria-label="Created from" type="date" value={from} max={to || undefined} className={`${control} w-[136px]! min-w-0! px-2! text-[11px]!`} onChange={(event) => onFromChange(event.target.value)} /></label>
          <label className="flex items-center gap-1.5 text-[10px] text-[#819587]">To<input aria-label="Created until" type="date" value={to} min={from || undefined} className={`${control} w-[136px]! min-w-0! px-2! text-[11px]!`} onChange={(event) => onToChange(event.target.value)} /></label>
        </div>
        <div className="relative" onKeyDown={(event) => { if (event.key === "Escape") onColumnsOpenChange(false); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onColumnsOpenChange(false); }}>
          <button type="button" className={button} aria-expanded={columnsOpen} aria-controls="payment-columns" onClick={() => onColumnsOpenChange(!columnsOpen)}><SlidersHorizontal size={14} aria-hidden="true" />Columns</button>
          {columnsOpen && <div id="payment-columns" className="absolute right-0 z-30 mt-2 grid max-h-72 w-52 gap-1 overflow-y-auto rounded-xl border border-[#dfe8e1] bg-white p-2 shadow-lg shadow-[#254c3820]">{columns.map((key) => <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs text-[#607b69] hover:bg-[#f2f7f4]"><input type="checkbox" className="size-3.5! w-auto! accent-[#176b60]" checked={visible.includes(key)} disabled={visible.length === 1 && visible.includes(key)} onChange={() => onColumnsChange(visible.includes(key) ? visible.filter((field) => field !== key) : [...visible, key])} />{labels[key] || key}</label>)}</div>}
        </div>
        <button type="button" className={button} disabled={exporting || loading || !total} onClick={onExport}>{exporting ? <LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}{exporting ? "Exporting…" : "Export"}</button>
      </div>

      {filters.length > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-[#edf2ee] px-4 py-3 sm:px-5"><span className="text-[10px] text-[#8a9e90]">Applied:</span>{filters.map(([title,value,remove]) => <button type="button" key={title} aria-label={`Remove ${title.toLowerCase()} filter`} onClick={remove} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#edf4ef] px-2 py-1 text-[10px] text-[#52755d]"><span className="max-w-44 truncate">{title}: {value}</span><X size={11} aria-hidden="true" /></button>)}<button type="button" onClick={onClearFilters} className="ml-auto py-1 text-[11px] text-[#176b60] underline decoration-[#b4cbbd] underline-offset-4">Clear all</button></div>}

      <div aria-busy={loading}>
        {loading ? <div role="status" aria-label="Loading payments" className="space-y-3 border-t border-[#e8eeea] p-5">{[0,1,2,3].map((value) => <div key={value} className="h-14 animate-pulse rounded-lg bg-[#f0f5f1] motion-reduce:animate-none" />)}</div>
          : error ? <div role="alert" className="flex flex-col items-center gap-3 px-5 py-10 text-center"><AlertCircle size={26} className="text-rose-400" aria-hidden="true" /><strong className="text-sm font-semibold">Unable to load payments</strong><p className="text-xs! text-[#819587]!">{error.message}</p>{error.status === 401 ? <Link className={button} to="/auth/login">Sign in</Link> : <button type="button" className={button} onClick={onRetry}><RefreshCw size={14} aria-hidden="true" />Try again</button>}</div>
            : !rows.length ? <div className="flex flex-col items-center gap-3 border-t border-[#e8eeea] px-5 py-12 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-[#edf4ef] text-[#7e9e89]"><Inbox size={24} strokeWidth={1.5} aria-hidden="true" /></span><strong className="text-sm font-semibold">No payments found</strong><p className="max-w-sm text-xs! leading-relaxed text-[#819587]!">{filters.length ? "Try a different search or clear your filters." : "Your payment records will appear here as they come in."}</p>{filters.length > 0 && <button type="button" className={button} onClick={onClearFilters}>Clear filters</button>}</div>
              : <>
                <div className="hidden min-w-0 overflow-x-auto lg:block">
                  <table className="w-full min-w-[1080px] border-collapse text-left text-xs [&_th]:border-y [&_th]:border-[#e8eeea] [&_th]:bg-[#f5f8f6] [&_th]:px-4 [&_th]:py-3 [&_th]:text-[10px] [&_th]:font-medium [&_th]:tracking-wide [&_th]:whitespace-nowrap [&_th]:text-[#819587] [&_th]:uppercase [&_td]:px-4 [&_td]:py-4 [&_td]:align-middle">
                    <caption className="sr-only">Payments with transaction details, booking, amount and status</caption>
                    <thead><tr>{visible.map((key) => <th key={key} scope="col" aria-sort={sort === key ? direction === "asc" ? "ascending" : "descending" : undefined}><button type="button" className="flex items-center gap-1.5 text-left hover:text-[#176b60]" onClick={() => onSort(key)}>{labels[key] || key}<ArrowUpDown size={11} className={sort === key ? "text-[#176b60]" : "text-[#a4b5a9]"} aria-hidden="true" /></button></th>)}<th scope="col">Actions</th></tr></thead>
                    <tbody className="divide-y divide-[#edf2ee]">{rows.map((row) => <tr key={row.id} className="transition-colors hover:bg-[#f8fbf9]">{visible.map((key) => <td key={key}><Cell field={key} row={row} /></td>)}<td>{view(row)}</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="grid gap-3 border-t border-[#e8eeea] p-4 lg:hidden">{rows.map((row) => <article key={row.id} className="min-w-0 rounded-xl border border-[#e0e9e3] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><Cell field="name" row={row} />{view(row)}</div><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#edf2ee] pt-3">{visible.filter((key) => key !== "name").map((key) => <div key={key} className="min-w-0"><dt className="mb-1 text-[10px] text-[#84998b]">{labels[key] || key}</dt><dd><Cell field={key} row={row} /></dd></div>)}</dl></article>)}</div>
              </>}
      </div>

      {data && !error && !loading && <footer className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-[#e8eeea] bg-[#fcfdfc] px-4 py-3.5 text-[11px] text-[#829589] sm:px-5"><span>{total ? `${number((page - 1) * pageSize + 1)}–${number(Math.min(page * pageSize, total))} of ${number(total)} payments` : "0 payments"}</span><div className="flex flex-wrap items-center gap-2"><select aria-label="Rows per page" className={`${control} min-h-8! py-1! text-[11px]!`} value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{[10,20,50,100].map((value) => <option key={value} value={value}>{value} / page</option>)}</select><button type="button" aria-label="Previous page" className="grid size-8 place-items-center rounded-lg border border-[#dce6e1] bg-white text-[#45645a] hover:bg-[#edf4ef] disabled:opacity-35" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={15} aria-hidden="true" /></button><span className="px-1">Page <strong className="font-medium text-[#45645a]">{page}</strong> of {totalPages}</span><button type="button" aria-label="Next page" className="grid size-8 place-items-center rounded-lg border border-[#dce6e1] bg-white text-[#45645a] hover:bg-[#edf4ef] disabled:opacity-35" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight size={15} aria-hidden="true" /></button></div></footer>}
    </section>
  </div>;
}
