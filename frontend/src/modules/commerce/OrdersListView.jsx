import { Link } from "react-router-dom";
import {
  ArrowUpRight, CheckCheck, ChevronLeft, ChevronRight, Clock3, Eye,
  ListFilter, Package, PackageCheck, RefreshCw, RotateCcw, Search,
  ShoppingBag, Truck, X, XCircle,
} from "lucide-react";
import { OrderStatusBadge } from "./OrderTracking";
import { orderStages, orderStatusLabels } from "./order-status";

const statuses = [...orderStages, "Cancelled"];
const metrics = [
  ["total", "Total orders", ShoppingBag, "text-[#176b60]", "All purchases"],
  ["Pending", "Pending", Clock3, "text-[#b7852d]", "Awaiting processing"],
  ["Processing", "Processing", Package, "text-[#96733e]", "Being prepared"],
  ["Shipped", "Shipped", Truck, "text-[#5b81aa]", "Dispatched"],
  ["OutForDelivery", "Out for delivery", PackageCheck, "text-[#7b6ca4]", "On the final mile"],
  ["Delivered", "Delivered", CheckCheck, "text-[#48836b]", "Successfully fulfilled"],
  ["Cancelled", "Cancelled", XCircle, "text-[#ac7777]", "Closed orders"],
];
const control = "h-[39px]! w-full! min-w-0 rounded-lg! border! border-[#dfe7e2]! bg-white! px-3! py-2! text-[12px]! font-normal! text-[#456258]! outline-none! transition-colors focus:border-[#6c9f8c]! focus:ring-2! focus:ring-[#176b6010]!";
const action = "inline-flex h-[38px] shrink-0 items-center justify-center gap-2 rounded-lg border border-[#dde6e0] bg-white px-3 text-[11px] font-medium text-[#527165] transition-colors hover:border-[#acc8ba] hover:bg-[#f5f9f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-not-allowed disabled:opacity-40";
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
const count = value => Number(value || 0).toLocaleString("en-IN");
const date = value => value ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }) : "—";
const time = value => value ? new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) : "";

function Filter({ label, className = "", children }) {
  return <label className={`grid min-w-0 gap-2 text-[10px] font-medium tracking-[.2px] text-[#81928a] ${className}`}>{label}{children}</label>;
}

export default function OrdersListView({ role, data, loading, error, filters, search, onSearch, onFilter, onReset, onPage, onRefresh }) {
  const isAdmin = role === "Admin";
  const root = isAdmin ? "admin" : "vendor";
  const selectedVendor = data?.vendors?.find(vendor => vendor.id === filters.vendor);
  const active = [
    search.trim() && ["q", `Search: ${search.trim()}`],
    isAdmin && filters.vendor && ["vendor", selectedVendor?.name || "Selected vendor"],
    filters.status && ["status", orderStatusLabels[filters.status]],
    filters.paymentStatus && ["paymentStatus", `Payment: ${filters.paymentStatus}`],
    filters.from && ["from", `From ${filters.from}`],
    filters.to && ["to", `Until ${filters.to}`],
  ].filter(Boolean);
  const rows = data?.rows || [];
  const total = Number(data?.total || 0);
  const page = Number(data?.page || filters.page || 1);
  const size = Number(data?.pageSize || 20);
  const pages = Math.max(1, Math.ceil(total / size));

  return <div className="min-w-0 text-[#314e43]">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="m-0! mb-1.5! text-[9px]! font-medium! tracking-[1.5px]! text-[#8b9c92]!">{isAdmin ? "TRANSACTIONS / ORDERS" : "YOUR BUSINESS / ORDERS"}</p>
        <div className="flex items-center gap-3">
          <h1 className="m-0! text-[26px]! leading-tight! font-semibold! tracking-[-.7px]! text-[#294b3e]!">{isAdmin ? "Order management" : "Your orders"}</h1>
          {data?.summary && <span className="rounded-md border border-[#dce7df] bg-[#edf4ee] px-2 py-1 text-[10px] font-medium tabular-nums text-[#66826e]">{count(data.summary.total)} total</span>}
        </div>
        <p className="m-0! mt-2! text-[12px]! leading-relaxed! text-[#89988f]!">{isAdmin ? "A clear view of every purchase, from placement to delivery." : "Prepare, dispatch, and deliver. Every purchase from your business, in one place."}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 text-[10px] text-[#8a9b90]"><span className="size-1.5 rounded-full bg-[#79a38b]" aria-hidden="true" />Automatic updates</span>
        <button type="button" className={action} onClick={onRefresh} disabled={loading}><RefreshCw size={13} aria-hidden="true" className={loading ? "animate-spin motion-reduce:animate-none" : ""} />Refresh</button>
      </div>
    </header>

    <section className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,135px),1fr))] gap-2.5" aria-label="Order statistics">
      {metrics.map(([status, label, Icon, tone, caption]) => {
        const featured = status === "total";
        const selected = featured ? !filters.status : filters.status === status;
        return <button
          key={status} type="button" aria-pressed={selected}
          aria-label={featured ? "Show all orders" : `Show ${label.toLowerCase()} orders`}
          onClick={() => onFilter("status", featured || selected ? "" : status)}
          className={`group min-w-0 rounded-xl border px-3.5 py-3.5 text-left transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] ${featured ? "border-[#275e4d] bg-[#275e4d] text-white" : selected ? "border-[#72a38b] bg-[#f1f7f2] shadow-[0_0_0_2px_#176b6008]" : "border-[#e1e8e2] bg-white hover:border-[#b6cfbe] hover:shadow-[0_3px_12px_#244a3506]"}`}
        >
          <div className="flex items-center justify-between gap-1.5"><span className={`text-[10px] font-medium ${featured ? "text-[#d1e2d6]" : "text-[#7c8e82]"}`}>{label}</span><Icon size={15} strokeWidth={1.7} aria-hidden="true" className={featured ? "text-[#b6d2c1]" : tone} /></div>
          <strong className={`mt-2 block text-[27px] leading-none font-semibold tracking-[-.7px] tabular-nums ${featured ? "text-white" : "text-[#345a46]"}`}>{loading ? <span className={`inline-block h-6 w-8 animate-pulse rounded motion-reduce:animate-none ${featured ? "bg-white/15" : "bg-[#eaf0e9]"}`} aria-label="Loading count" /> : count(data?.summary?.[status.toLowerCase()])}</strong>
          <span className={`mt-2 block text-[9px] ${featured ? "text-[#aac9b6]" : "text-[#9aa79d]"}`}>{caption}</span>
        </button>;
      })}
    </section>

    <section className="mb-5 rounded-xl border border-[#e1e8e2] bg-white px-4 py-4" aria-label="Order filters">
      <div className="flex flex-wrap items-end gap-3">
        <Filter label="Search orders" className="basis-[230px] grow">
          <span className="relative block"><Search size={15} aria-hidden="true" className="pointer-events-none absolute top-3 left-3 text-[#99ada0]" /><input aria-label="Search orders by reference or customer" className={`${control} pl-9! pr-8!`} placeholder="Order ID or customer name…" value={search} maxLength={200} onChange={event => onSearch(event.target.value)} />{search && <button aria-label="Clear order search" type="button" className="absolute top-2.5 right-2.5 text-[#90a296] hover:text-[#35614e]" onClick={() => onSearch("")}><X size={15} /></button>}</span>
        </Filter>
        {isAdmin && <Filter label="Vendor" className="basis-[145px] grow">
          <select className={control} value={filters.vendor} onChange={event => onFilter("vendor", event.target.value)}><option value="">All vendors</option>{(data?.vendors || []).map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select>
        </Filter>}
        <Filter label="Order status" className="basis-[145px] grow">
          <select className={control} value={filters.status} onChange={event => onFilter("status", event.target.value)}><option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select>
        </Filter>
        <Filter label="Payment status" className="basis-[130px] grow">
          <select className={control} value={filters.paymentStatus} onChange={event => onFilter("paymentStatus", event.target.value)}><option value="">All payments</option>{["Pending", "Paid", "Failed"].map(status => <option key={status}>{status}</option>)}</select>
        </Filter>
        <Filter label="Ordered from" className="basis-[135px] grow">
          <input aria-label="Orders from" className={control} type="date" value={filters.from} max={filters.to || undefined} onChange={event => onFilter("from", event.target.value)} />
        </Filter>
        <Filter label="Ordered until" className="basis-[135px] grow">
          <input aria-label="Orders until" className={control} type="date" value={filters.to} min={filters.from || undefined} onChange={event => onFilter("to", event.target.value)} />
        </Filter>
        <button type="button" className={`${action} h-[39px]! w-[39px] px-0!`} onClick={onReset} aria-label="Clear all order filters" title="Clear all filters" disabled={!active.length}><RotateCcw size={14} aria-hidden="true" /></button>
      </div>
      {active.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#eef2ed] pt-3"><ListFilter size={12} className="mr-1 text-[#9aaa9e]" aria-hidden="true" />{active.map(([key, label]) => <button key={key} type="button" className="inline-flex max-w-full items-center gap-2 rounded-md border border-[#e0e9e1] bg-[#f6f9f4] px-2 py-1 text-[10px] text-[#6a8471] hover:border-[#b7cdbd]" aria-label={`Remove ${label} filter`} onClick={() => key === "q" ? onSearch("") : onFilter(key, "")}><span className="max-w-52 truncate">{label}</span><X size={11} className="shrink-0" aria-hidden="true" /></button>)}<button className="ml-1 text-[10px] text-[#728879] underline underline-offset-2" type="button" onClick={onReset}>Clear all</button></div>}
    </section>

    {error && <div role="alert" className="mb-4 rounded-lg border border-[#ebd5d2] bg-[#fff7f5] p-4 text-[12px] text-[#a16661]">{error.message}<button type="button" onClick={onRefresh} className="ml-3 underline">Try again</button></div>}

    <section className="overflow-hidden rounded-xl border border-[#e1e8e2] bg-white shadow-[0_3px_15px_#28463203]" aria-label="Orders">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9eee8] px-5 py-4">
        <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-[#f0f5ee] text-[#74917d]"><ShoppingBag size={16} strokeWidth={1.6} aria-hidden="true" /></span><div><h2 className="m-0! text-[13px]! font-semibold! text-[#405e4d]!">{active.length ? "Filtered orders" : "All orders"}</h2><p className="m-0! mt-0.5! text-[10px]! text-[#95a296]!">{loading ? "Finding your orders…" : `${count(total)} ${total === 1 ? "purchase" : "purchases"}${active.length ? " match your filters" : isAdmin ? " across your marketplace" : " from your business"}`}</p></div></div>
        <div className="flex flex-wrap items-center gap-3">{!isAdmin && <span className="rounded-md border border-[#e2eade] bg-[#f6f9f1] px-2 py-1 text-[9px] text-[#819474]">Your items & amounts only</span>}<span className="text-[10px] text-[#9aa79d]">Newest first</span></div>
      </div>
      <div className="overflow-x-auto [scrollbar-width:thin]" tabIndex={0} role="region" aria-label="Order records">
        <table aria-busy={loading} className={`w-full ${isAdmin ? "min-w-[1140px]" : "min-w-[1000px]"} border-collapse text-left text-[11px] [&_thead_th]:bg-[#f7f9f5] [&_thead_th]:px-4 [&_thead_th]:py-3 [&_thead_th]:text-[9px] [&_thead_th]:font-medium [&_thead_th]:tracking-[.5px] [&_thead_th]:whitespace-nowrap [&_thead_th]:text-[#8b9c8c] [&_thead_th]:uppercase [&_tbody_td]:border-t [&_tbody_td]:border-[#edf1e9] [&_tbody_td]:px-4 [&_tbody_td]:py-4 [&_tbody_td]:align-middle`}>
          <thead><tr>{["Order ID", "Customer", "Product / service", ...(isAdmin ? ["Vendor"] : []), "Order date", "Qty", isAdmin ? "Total" : "Your total", "Payment", "Order status", ""].map((label, index) => <th key={index} scope="col" className={["Total", "Your total"].includes(label) ? "text-right!" : undefined}>{label || <span className="sr-only">View details</span>}</th>)}</tr></thead>
          <tbody>{loading ? Array.from({ length: 4 }, (_, row) => <tr key={row} aria-hidden="true">{Array.from({ length: isAdmin ? 10 : 9 }, (_, cell) => <td key={cell}><div className={`h-3 animate-pulse rounded bg-[#eef3ec] motion-reduce:animate-none ${cell === 0 ? "w-24" : "w-14"}`} /></td>)}</tr>) : rows.map(order => <tr key={order.id} className="group transition-colors hover:bg-[#fafcf8]">
            <td><Link className="whitespace-nowrap font-medium tracking-[.1px] text-[#287565] underline-offset-4 hover:underline" to={`/${root}/orders/${order.id}`}>{order.number}</Link></td>
            <td><div className="flex items-center gap-2.5"><span className="grid size-7 shrink-0 place-items-center rounded-full border border-[#e4e9df] bg-[#f2f5ed] text-[10px] font-medium text-[#90a27f]" aria-hidden="true">{order.customer?.trim().charAt(0).toUpperCase() || "C"}</span><span className="max-w-36 truncate font-medium text-[#647e6c]" title={order.customer}>{order.customer || "Customer"}</span></div></td>
            <td><span className="block max-w-44 truncate text-[#71826f]" title={order.items}>{order.items}</span></td>
            {isAdmin && <td><span className="block max-w-32 truncate text-[#899983]" title={order.vendor}>{order.vendor}</span></td>}
            <td className="whitespace-nowrap"><span className="block text-[#7d8f80]">{date(order.createdAt)}</span><span className="mt-1 block text-[9px] text-[#a1ada0]">{time(order.createdAt)}</span></td>
            <td className="tabular-nums text-[#8a9a85]">{order.quantity}</td>
            <td className="text-right! whitespace-nowrap font-medium tabular-nums text-[#52734c]">{money(order.total)}</td>
            <td><OrderStatusBadge status={order.paymentStatus} /></td>
            <td><OrderStatusBadge status={order.status} /></td>
            <td><Link aria-label={`View ${order.number}`} title="View order details" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[#e4eae0] px-2.5 py-1.5 text-[10px] text-[#708b65] transition-colors hover:border-[#acc7ac] hover:bg-[#f1f6eb]" to={`/${root}/orders/${order.id}`}><Eye size={12} aria-hidden="true" />Details<ArrowUpRight size={11} aria-hidden="true" /></Link></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!loading && !rows.length && <div className="grid justify-items-center px-5 py-14 text-center"><span className="mb-4 grid size-14 place-items-center rounded-2xl border border-[#e5ebe0] bg-[#f7f9f3] text-[#a0b293]"><ShoppingBag size={25} strokeWidth={1.4} aria-hidden="true" /></span><h3 className="m-0! text-[16px]! font-medium! text-[#5c7658]!">{error ? "Orders could not be loaded" : "No orders found"}</h3><p className="m-0! mt-2! max-w-xs text-[12px]! leading-relaxed! text-[#96a38b]!">{error ? "Try refreshing to load the latest orders." : active.length ? "Try another search or clear your filters to see more purchases." : "Customer purchases will appear here as they arrive."}</p>{active.length > 0 && <button type="button" className={`${action} mt-5`} onClick={onReset}><RotateCcw size={12} />Clear filters</button>}</div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9eee4] px-5 py-3 text-[10px] text-[#8c9d86]">
        <span>{loading ? "Loading orders…" : total ? <>Showing <strong className="font-medium text-[#66805f]">{count((page - 1) * size + 1)}–{count(Math.min(page * size, total))}</strong> of {count(total)} orders</> : "0 orders"}</span>
        <div className="flex items-center gap-2"><span className="mr-2">Page {page} of {pages}</span><button type="button" aria-label="Previous orders" className={`${action} h-8! w-8 px-0!`} disabled={loading || page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /></button><button type="button" aria-label="Next orders" className={`${action} h-8! w-8 px-0!`} disabled={loading || page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={14} /></button></div>
      </footer>
    </section>
  </div>;
}
