import { vendorChangedEvent } from "../vendor-workflow";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Store,
  ClipboardCheck,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  IndianRupee,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  ChevronRight,
  Activity,
  Star,
  Search,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { adminRequest, date, money, number } from "../api";
import AdminTable, {
  Skeleton,
  ErrorState,
  Empty,
} from "../components/AdminTable";
import {
  TrendChart,
  Distribution,
  CategoryBars,
} from "../components/Analytics";
const metrics = [
  ["customers", "Total customers", Users, "customers"],
  ["vendors", "Total vendors", Store, "vendors"],
  ["approvals", "Pending approvals", ClipboardCheck, "vendors/pending"],
  ["totalServices", "Total services", BriefcaseBusiness, "services"],
  ["approvedVendors", "Approved vendors", Store, "vendors?status=Approved"],
  [
    "pendingServices",
    "Pending service approvals",
    ClipboardCheck,
    "services/pending",
  ],
  [
    "pendingBookings",
    "Pending bookings",
    CalendarCheck,
    "bookings?status=Pending",
  ],
  ["pendingPayments", "Pending payments", IndianRupee, "payments"],
  ["pendingRefunds", "Pending refunds", Wallet, "refunds"],
  ["commission", "Platform commission", IndianRupee, "commission"],
  ["bookings", "Total bookings", CalendarCheck, "bookings"],
  ["today", "Today’s bookings", CalendarDays, "bookings"],
  ["revenue", "Total revenue", IndianRupee, "payments"],
  ["payouts", "Pending vendor payouts", Wallet, "payouts"],
];
const localDay = (d) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
function getRange(days) {
  return {
    from: localDay(Date.now() - (days - 1) * 86400000),
    to: localDay(Date.now()),
  };
}
function ChartPanel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`ad-panel ad-analytics-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] ${className}`}>
      <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="ad-chart-label text-[7px] tracking-[1px] text-[#a1aca4] whitespace-nowrap [@media(width<=1200px)]:hidden">IN PERIOD</span>
      </div>
      {children}
    </section>
  );
}
function CategoryAnalytics({ rows }) {
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState("revenue"),
    [direction, setDirection] = useState(-1),
    [page, setPage] = useState(1);
  const filtered = rows
    .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      typeof a[sort] === "string"
        ? direction * a[sort].localeCompare(b[sort])
        : direction * (Number(a[sort] || 0) - Number(b[sort] || 0)),
    );
  return (
    <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
      <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
        <div>
          <h2>Every celebration, by category</h2>
          <p>
            Vendor and service totals · bookings and paid line revenue in the
            selected period
          </p>
        </div>
        <label className="ad-search flex items-center gap-[7px] min-w-[120px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe3] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe3] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe3] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe3] rounded-[7px] [background:#fff] text-[#99a699] [padding:0_9px] max-w-full [&_input]:[border-top-width:0] [&_input]:[border-top-style:none] [&_input]:[border-top-color:currentColor] [&_input]:[border-right-width:0] [&_input]:[border-right-style:none] [&_input]:[border-right-color:currentColor] [&_input]:[border-bottom-width:0] [&_input]:[border-bottom-style:none] [&_input]:[border-bottom-color:currentColor] [&_input]:[border-left-width:0] [&_input]:[border-left-style:none] [&_input]:[border-left-color:currentColor] [&_input]:[padding:8px_0] [&_input]:[outline:0] [&_input]:[background:none] [&_input]:text-[10px] [&_input]:w-[180px] [&_input]:max-w-full [&_input:focus]:[outline:0] [&_input:focus]:[border-top-width:0] [&_input:focus]:[border-top-style:none] [&_input:focus]:[border-top-color:currentColor] [&_input:focus]:[border-right-width:0] [&_input:focus]:[border-right-style:none] [&_input:focus]:[border-right-color:currentColor] [&_input:focus]:[border-bottom-width:0] [&_input:focus]:[border-bottom-style:none] [&_input:focus]:[border-bottom-color:currentColor] [&_input:focus]:[border-left-width:0] [&_input:focus]:[border-left-style:none] [&_input:focus]:[border-left-color:currentColor]">
          <Search size={16} />
          <input
            aria-label="Search category analytics"
            placeholder="Find a category…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <div className="ad-table-wrap w-full min-w-0">
        <table className="ad-table w-full border-collapse [table-layout:fixed] text-[10px] [@media(width<=1200px)]:text-[9px] text-left [&_th]:[background:#fafbf8] [&_th]:text-[#94a08f] [&_th]:tracking-[0.3px] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#eaf0e6] [&_th]:[padding:12px_17px] [@media(width<=1200px)]:[&_th]:[padding:12px_10px] [&_th]:[overflow-wrap:anywhere] [&_th_button]:flex [&_th_button]:items-center [&_th_button]:gap-[4px] [&_th_button]:max-w-full [&_th_button]:text-left [&_th_button]:[border-top-width:0] [&_th_button]:[border-top-style:none] [&_th_button]:[border-top-color:currentColor] [&_th_button]:[border-right-width:0] [&_th_button]:[border-right-style:none] [&_th_button]:[border-right-color:currentColor] [&_th_button]:[border-bottom-width:0] [&_th_button]:[border-bottom-style:none] [&_th_button]:[border-bottom-color:currentColor] [&_th_button]:[border-left-width:0] [&_th_button]:[border-left-style:none] [&_th_button]:[border-left-color:currentColor] [&_th_button]:[background:none] [&_th_button]:text-[inherit] [&_th_button]:p-[0] [&_td]:[padding:15px_17px] [@media(width<=767px)]:[&_td]:p-[0] [@media(767px<width<=1200px)]:[&_td]:[padding:12px_10px] [&_td]:[border-bottom-width:1px] [@media(width<=767px)]:[&_td]:[border-bottom-width:0] [&_td]:[border-bottom-style:solid] [@media(width<=767px)]:[&_td]:[border-bottom-style:none] [&_td]:[border-bottom-color:#f0f3ec] [@media(width<=767px)]:[&_td]:[border-bottom-color:currentColor] [&_td]:text-[#758570] [&_td]:[overflow-wrap:anywhere] [&_td]:[vertical-align:middle] [&_tbody_tr:last-child_td]:[border-bottom-width:0] [&_tbody_tr:last-child_td]:[border-bottom-style:none] [&_tbody_tr:last-child_td]:[border-bottom-color:currentColor] [&_tbody_tr:hover]:[background:#fcfdf9] [@media(width<=767px)]:[&_thead]:hidden [@media(width<=767px)]:block [@media(width<=767px)]:[&_tbody]:block [@media(width<=767px)]:[&_tbody]:w-full [@media(width<=767px)]:[&_tr]:block [@media(width<=767px)]:[&_tr]:w-full [@media(width<=767px)]:[&_td]:block [@media(width<=767px)]:[&_td]:w-full [@media(width<=767px)]:[&_tbody_tr]:[padding:13px_16px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-width:1px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-style:solid] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-color:#e9eee4] [@media(width<=767px)]:[&_tbody_tr]:grid [@media(width<=767px)]:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:[&_tbody_tr]:gap-[11px_17px] [@media(width<=767px)]:[&_td]:[border-top-width:0] [@media(width<=767px)]:[&_td]:[border-top-style:none] [@media(width<=767px)]:[&_td]:[border-top-color:currentColor] [@media(width<=767px)]:[&_td]:[border-right-width:0] [@media(width<=767px)]:[&_td]:[border-right-style:none] [@media(width<=767px)]:[&_td]:[border-right-color:currentColor] [@media(width<=767px)]:[&_td]:[border-left-width:0] [@media(width<=767px)]:[&_td]:[border-left-style:none] [@media(width<=767px)]:[&_td]:[border-left-color:currentColor] [@media(width<=767px)]:[&_td]:text-[10px] [@media(width<=767px)]:[&_td]:min-w-0 [@media(width<=767px)]:[&_td:before]:[content:attr(data-label)] [@media(width<=767px)]:[&_td:before]:block [@media(width<=767px)]:[&_td:before]:text-[8px] [@media(width<=767px)]:[&_td:before]:text-[#a1ad96] [@media(width<=767px)]:[&_td:before]:mb-[4px] [@media(width<=767px)]:[&_td:first-child]:col-[1/-1] [@media(width<=767px)]:[&_td:last-child_.ad-row-actions]:ml-[-5px]">
          <thead>
            <tr>
              {[
                "name",
                "vendors",
                "services",
                "bookings",
                "revenue",
                "rating",
              ].map((k) => (
                <th key={k}>
                  <button
                    onClick={() => {
                      setSort(k);
                      setDirection(sort === k ? -direction : -1);
                    }}
                  >
                    {k === "name"
                      ? "Category"
                      : k === "rating"
                        ? "Avg. rating"
                        : k[0].toUpperCase() + k.slice(1)}{" "}
                    ↕
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice((page - 1) * 8, page * 8).map((r) => (
              <tr key={r.id}>
                <td data-label="Category">
                  <Link
                    className="ad-record-name flex items-center gap-[9px] [border-top-width:0] [border-top-style:none] [border-top-color:currentColor] [border-right-width:0] [border-right-style:none] [border-right-color:currentColor] [border-bottom-width:0] [border-bottom-style:none] [border-bottom-color:currentColor] [border-left-width:0] [border-left-style:none] [border-left-color:currentColor] [background:none] text-left text-[#4c6554] p-[0] text-[10px] [@media(width<=767px)]:text-[12px] [@media(767px<width<=1200px)]:text-[9px] leading-[1.6] font-[500] max-w-full [&_>_span:last-child]:[overflow-wrap:anywhere] [&_>_span:last-child]:min-w-0 [@media(width<=767px)]:[&_.ad-avatar]:inline-flex [@media(767px<width<=1200px)]:[&_.ad-avatar]:hidden"
                    to={`/admin/services?q=${encodeURIComponent(r.name)}`}
                  >
                    {r.name}
                  </Link>
                </td>
                <td data-label="Vendors">{number(r.vendors)}</td>
                <td data-label="Services">{number(r.services)}</td>
                <td data-label="Bookings">{number(r.bookings)}</td>
                <td data-label="Revenue">{money(r.revenue)}</td>
                <td data-label="Avg. rating">
                  <span className="ad-rating flex items-center gap-[4px] [&_svg]:text-[#bda269] [&_svg]:[fill:#bda26933]">
                    <Star size={12} />
                    {r.rating === null ? "—" : Number(r.rating).toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty text="No matching categories" />}
      </div>
      <div className="ad-table-footer [&_select]:text-[10px] [&_select]:[padding:7px_9px] [padding:13px_20px] [@media(width<=767px)]:[padding:13px_14px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf1e8] flex justify-between items-center [@media(width<=767px)]:items-start gap-[12px] [@media(width<=767px)]:gap-[10px] text-[9px] text-[#9aa38f] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[9px] [@media(width<=767px)]:[&_>_div]:gap-[6px] [&_.ad-button]:text-[9px] [&_.ad-button]:[padding:5px_9px] [@media(width<=767px)]:flex-wrap">
        <span>{filtered.length} categories</span>
        <div>
          <button
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            {page} / {Math.max(1, Math.ceil(filtered.length / 8))}
          </span>
          <button
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            disabled={page * 8 >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
export default function AdminDashboard() {
  const { user } = useAuth(),
    [range, setRange] = useState(() => getRange(30)),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(null),
    [version, setVersion] = useState(0);
  const [preset, setPreset] = useState("30"),
    [filterError, setFilterError] = useState("");
  useEffect(() => {
    const changed = () => setVersion((value) => value + 1);
    window.addEventListener(vendorChangedEvent, changed);
    return () => window.removeEventListener(vendorChangedEvent, changed);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    adminRequest(`/dashboard?${new URLSearchParams(range)}`, {
      signal: abort.signal,
    })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [range, version]);
  const months = [];
  const cursor = new Date(`${range.from.slice(0, 7)}-01T00:00:00Z`);
  while (
    cursor.toISOString().slice(0, 7) <= range.to.slice(0, 7) &&
    months.length < 13
  ) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return (
    <>
      <div className="ad-page-heading flex items-center [@media(width<=1000px)]:items-start justify-between gap-[20px] [@media(width<=767px)]:gap-[14px] [@media(width<=767px)]:flex-col [@media(width<=767px)]:[&_p]:text-[11px]">
        <div>
          <div className="ad-eyebrow text-[8px] [@media(width<=767px)]:text-[7px] tracking-[1.7px] text-[#7d9183] flex items-center gap-[6px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:[background:#bfa471] [&_>_span]:rounded-[50%]">
            <span /> YOUR MARKETPLACE, AT A GLANCE
          </div>
          <h1>A beautiful day to build something.</h1>
          <p>
            Welcome back, {user?.firstName}. Here’s what’s happening at
            MarryNest.
          </p>
        </div>
        <div className="ad-heading-actions flex gap-[8px] shrink-0 [&_select]:text-[10px] [@media(width<=1000px)]:flex-wrap [@media(width<=767px)]:justify-start [@media(767px<width<=1000px)]:justify-end">
          <select
            aria-label="Analytics period"
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              setFilterError("");
              if (e.target.value !== "custom")
                setRange(getRange(Number(e.target.value)));
            }}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
            <option value="custom">Custom dates</option>
          </select>
          {preset === "custom" && (
            <form
              className="ad-date-range flex flex-wrap gap-[8px] items-end [&_label]:flex [&_label]:flex-col [&_label]:gap-[4px] [&_label]:text-[11px] [&_input]:max-w-[150px] [&_input]:min-h-[36px] [&_input]:p-[6px] [&_input]:[border-top-width:1px] [&_input]:[border-top-style:solid] [&_input]:[border-top-color:#dde5e0] [&_input]:[border-right-width:1px] [&_input]:[border-right-style:solid] [&_input]:[border-right-color:#dde5e0] [&_input]:[border-bottom-width:1px] [&_input]:[border-bottom-style:solid] [&_input]:[border-bottom-color:#dde5e0] [&_input]:[border-left-width:1px] [&_input]:[border-left-style:solid] [&_input]:[border-left-color:#dde5e0] [&_input]:rounded-[6px]"
              key={`${range.from}-${range.to}`}
              onSubmit={(event) => {
                event.preventDefault();
                const values = Object.fromEntries(
                  new FormData(event.currentTarget),
                );
                if (
                  values.to < values.from ||
                  new Date(values.to) - new Date(values.from) > 366 * 86400000
                ) {
                  setFilterError(
                    "Choose an ordered date range of up to one year.",
                  );
                  return;
                }
                setFilterError("");
                setRange({ from: values.from, to: values.to });
              }}
            >
              <label>
                From
                <input
                  aria-label="Analytics from date"
                  name="from"
                  type="date"
                  defaultValue={range.from}
                  required
                />
              </label>
              <label>
                To
                <input
                  aria-label="Analytics to date"
                  name="to"
                  type="date"
                  defaultValue={range.to}
                  required
                />
              </label>
              <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" type="submit">
                Apply dates
              </button>
            </form>
          )}
          <button
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            disabled={loading}
            onClick={() => setVersion((v) => v + 1)}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>
      </div>
      {filterError && (
        <p className="ad-inline-error [background:#fff1ed] text-[#af6158] p-[12px] rounded-[7px] text-[12px] [margin:12px_0]" role="alert">
          {filterError}
        </p>
      )}
      <div className="ad-range-note flex items-center gap-[7px] [@media(width<=767px)]:gap-[5px] text-[10px] [@media(width<=767px)]:text-[9px] text-[#8a9990] mt-[-10px] [&_>_span]:ml-[12px] [@media(width<=767px)]:[&_>_span]:ml-[5px] [&_>_span]:pl-[12px] [@media(width<=767px)]:[&_>_span]:pl-[7px] [&_>_span]:[border-left-width:1px] [&_>_span]:[border-left-style:solid] [&_>_span]:[border-left-color:#dce5dd] [&_.ad-live]:ml-[auto] [@media(width<=767px)]:[&_.ad-live]:ml-[0] [&_.ad-live]:[border-top-width:0] [&_.ad-live]:[border-top-style:none] [&_.ad-live]:[border-top-color:currentColor] [&_.ad-live]:[border-right-width:0] [&_.ad-live]:[border-right-style:none] [&_.ad-live]:[border-right-color:currentColor] [&_.ad-live]:[border-bottom-width:0] [&_.ad-live]:[border-bottom-style:none] [&_.ad-live]:[border-bottom-color:currentColor] [&_.ad-live]:[border-left-width:0] [&_.ad-live]:[border-left-style:none] [&_.ad-live]:[border-left-color:currentColor] [&_.ad-live]:flex [&_.ad-live]:items-center [&_.ad-live]:gap-[6px] [@media(width<=1000px)]:flex-wrap [@media(width<=767px)]:[&_.ad-live]:pl-[0] [@media(width<=767px)]:[&_.ad-live]:[flex-basis:100%]">
        <CalendarDays size={13} />
        {date(range.from)} – {date(range.to)}
        <span>Asia/Kolkata · INR</span>
        {data && !error && (
          <span className="ad-live [&_i]:h-[5px] [&_i]:w-[5px] [&_i]:rounded-[50%] [&_i]:[background:#65a78a]">
            <i /> Updated{" "}
            {new Date(data.generatedAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
            })}
          </span>
        )}
      </div>
      {loading ? (
        <div className="ad-kpi-grid grid grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(width<=1000px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[16px] [@media(width<=767px)]:gap-[10px] [@media(767px<width<=1200px)]:gap-[12px] [@media(width>=1500px)]:gap-[20px]">
          {metrics.map(([key]) => (
            <div className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]" key={key}>
              <Skeleton rows={3} />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} retry={() => setVersion((v) => v + 1)} />
      ) : (
        data && (
          <>
            <div className="ad-kpi-grid grid grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(width<=1000px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[16px] [@media(width<=767px)]:gap-[10px] [@media(767px<width<=1200px)]:gap-[12px] [@media(width>=1500px)]:gap-[20px]">
              {metrics.map(([key, title, Icon, to], i) => {
                const metric = data.kpis[key],
                  change = metric.previousPeriod
                    ? ((metric.currentPeriod - metric.previousPeriod) /
                        metric.previousPeriod) *
                      100
                    : null;
                const Trend =
                  change === null || change === 0
                    ? Minus
                    : change > 0
                      ? ArrowUpRight
                      : ArrowDownRight;
                return (
                  <Link
                    to={`/admin/${to}`}
                    className={`ad-panel ad-kpi [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] [padding:17px_19px] [@media(width<=1200px)]:p-[15px] [@media(width>=1500px)]:[padding:21px_23px] [transition:box-shadow_0.2s,_transform_0.2s] [&:hover]:[transform:translateY(-2px)] [&:hover]:[box-shadow:0_8px_20px_#243f3210] [&_>_strong]:block [&_>_strong]:text-[28px] [@media(width<=767px)]:[&_>_strong]:text-[26px] [@media(767px<width<=1200px)]:[&_>_strong]:text-[25px] [@media(width>=1500px)]:[&_>_strong]:text-[32px] [&_>_strong]:font-[600] [&_>_strong]:tracking-[-0.8px] [&_>_strong]:leading-[1.3] [&_>_strong]:[margin:7px_0_12px] ${i === 6 ? "ad-kpi-featured [&.ad-kpi-featured]:[background:#176b60] [&.ad-kpi-featured]:text-[#fff] [&.ad-kpi-featured]:[border-top-color:#176b60] [&.ad-kpi-featured]:[border-right-color:#176b60] [&.ad-kpi-featured]:[border-bottom-color:#176b60] [&.ad-kpi-featured]:[border-left-color:#176b60] [&.ad-kpi-featured:hover]:text-[#fff]! [&.ad-kpi-featured_.ad-kpi-top]:text-[#abd2c3] [&.ad-kpi-featured_.ad-kpi-change]:text-[#abd2c3] [&.ad-kpi-featured_.ad-kpi-icon]:[background:#ffffff16] [&.ad-kpi-featured_.ad-kpi-icon]:text-[#c5e2d3] [&.ad-kpi-featured_.ad-positive]:text-[#b9dfbe] [&.ad-kpi-featured_.ad-negative]:text-[#ffcdc4]" : ""}`}
                    key={key}
                  >
                    <div className="ad-kpi-top flex items-center justify-between gap-[5px] text-[10px] [@media(width<=1200px)]:text-[9px] text-[#859289]">
                      <span>{title}</span>
                      <span
                        className={`ad-kpi-icon w-[31px] [@media(width<=767px)]:w-[28px] h-[31px] [@media(width<=767px)]:h-[28px] [background:#f0f5ef] grid place-items-center text-[#5e8975] rounded-[8px] [&.ad-gold]:text-[#ac8f59] [&.ad-gold]:[background:#f9f5ec] ${i === 2 ? "ad-gold" : ""}`}
                      >
                        <Icon size={18} />
                      </span>
                    </div>
                    <strong>
                      {[
                        "revenue",
                        "payouts",
                        "commission",
                        "pendingPayments",
                        "pendingRefunds",
                      ].includes(key)
                        ? money(metric.total, true)
                        : number(metric.total)}
                    </strong>
                    <div
                      className="ad-kpi-change flex gap-[7px] [@media(width<=1200px)]:gap-[4px] items-center [@media(width<=767px)]:items-start text-[9px] text-[#92a096] flex-wrap [&_>_span]:flex [&_>_span]:items-center [&_>_span]:gap-[3px] [&_>_span]:text-[9px] [&_small]:text-[9px] [@media(width<=1200px)]:[&_small]:text-[8px] [@media(width<=767px)]:flex-col"
                      title={`Current period: ${metric.currentPeriod}; previous period: ${metric.previousPeriod}. State-based metrics count records with their current status.`}
                    >
                      <span
                        className={change > 0 ? "ad-positive text-[#368668]" : change < 0 ? "ad-negative text-[#b16b61]" : ""}
                      >
                        <Trend size={13} />
                        {change === null
                          ? metric.currentPeriod
                            ? "New"
                            : "—"
                          : `${Math.abs(change).toFixed(1)}%`}
                      </span>
                      <small>
                        {key === "today"
                          ? "vs yesterday"
                          : "new in period vs prior"}
                      </small>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="ad-analytics-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] [@media(767px<width<=1000px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [@media(width<=1200px)]:gap-[14px] [@media(width<=767px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)]:col-[auto] [@media(767px<width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)]:col-[1/-1] [@media(width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)_.ad-distribution]:flex-row [@media(width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)_.ad-legend]:w-auto [@media(width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)_.ad-legend]:min-w-[160px]">
              <ChartPanel
                title="Booking revenue"
                subtitle="Gross successful INR collections by payment date"
                className="ad-span-2 col-[span_2] [@media(width<=767px)]:col-[auto] [@media(767px<width<=1000px)]:col-[1/-1] [&_.ad-chart_svg]:min-h-[190px]"
              >
                <div className="ad-chart-summary flex items-center justify-between [padding:0_24px_12px] gap-[12px] [&_strong]:text-[24px] [@media(width<=767px)]:[&_strong]:text-[22px] [&_strong]:tracking-[-0.7px] [&_strong]:font-[600] [&_span]:text-[9px] [&_span]:text-[#86988a] [&_span]:flex [&_span]:items-center [&_span]:gap-[5px] [&_i]:w-[6px] [&_i]:h-[6px] [&_i]:rounded-[50%] [&_i]:[background:var(--ad-teal)]">
                  <strong>
                    {money(
                      data.series.revenue.reduce(
                        (n, r) => n + Number(r.value),
                        0,
                      ),
                    )}
                  </strong>
                  <span>
                    <i /> Collected revenue
                  </span>
                </div>
                <TrendChart
                  data={data.series.revenue}
                  months={months}
                  currency
                  label="Monthly booking revenue"
                />
              </ChartPanel>
              <ChartPanel
                title="Booking status"
                subtitle="A snapshot of the booking journey"
              >
                <Distribution data={data.status} />
              </ChartPanel>
            </div>
            <AdminTable
              key="pending-approvals"
              resource="applications"
              compact
              version={version}
              onChange={() => setVersion((v) => v + 1)}
            />
            <div className="ad-analytics-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] [@media(767px<width<=1000px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [@media(width<=1200px)]:gap-[14px] [@media(width<=767px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)]:col-[auto] [@media(767px<width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)]:col-[1/-1] [@media(width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)_.ad-distribution]:flex-row [@media(width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)_.ad-legend]:w-auto [@media(width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)_.ad-legend]:min-w-[160px]">
              {[
                [
                  "bookings",
                  "Monthly bookings",
                  "Booking volume over time",
                  "#176b60",
                ],
                [
                  "vendors",
                  "Vendor registrations",
                  "Professionals joining your marketplace",
                  "#b49661",
                ],
                [
                  "customers",
                  "Customer registrations",
                  "New beginnings, new customers",
                  "#64958e",
                ],
              ].map(([key, title, subtitle, color]) => (
                <ChartPanel key={key} title={title} subtitle={subtitle}>
                  <TrendChart
                    data={data.series[key]}
                    months={months}
                    color={color}
                    label={title}
                  />
                </ChartPanel>
              ))}
            </div>
            <div className="ad-analytics-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] [@media(767px<width<=1000px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [@media(width<=1200px)]:gap-[14px] [@media(width<=767px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)]:col-[auto] [@media(767px<width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)]:col-[1/-1] [@media(width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)_.ad-distribution]:flex-row [@media(width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)_.ad-legend]:w-auto [@media(width<=1000px)]:[&_>_.ad-analytics-panel:last-child:nth-child(3)_.ad-legend]:min-w-[160px]">
              <ChartPanel
                title="Revenue by category"
                subtitle="Paid booking line totals, excluding cancellations"
              >
                <CategoryBars categories={data.categories} />
              </ChartPanel>
              <ChartPanel
                title="Platform commission"
                subtitle="Commission recorded against bookings"
              >
                <TrendChart
                  data={data.series.commission}
                  months={months}
                  currency
                  color="#b49661"
                  label="Platform commission"
                />
              </ChartPanel>
              <ChartPanel
                title="Vendor payout summary"
                subtitle="Payout amounts by current status"
              >
                <Distribution data={data.payouts} currency />
              </ChartPanel>
            </div>
            <div className="ad-chart-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=700px)]:grid-cols-[1fr] gap-[20px] [margin:20px_0]">
              <ChartPanel
                title="Payment status"
                subtitle="Recorded payment states"
              >
                <Distribution data={data.paymentStatus} />
              </ChartPanel>
              <ChartPanel
                title="Service categories"
                subtitle="Services created in this period"
              >
                <Distribution data={data.serviceCategories} />
              </ChartPanel>
            </div>
            <CategoryAnalytics rows={data.categories} />
            <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
              <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
                <div>
                  <h2>Across your marketplace</h2>
                  <p>The latest registrations, decisions, and celebrations.</p>
                </div>
                <Link className="ad-text-link flex items-center gap-[5px] text-[#5a8671] text-[10px] whitespace-nowrap" to="/admin/audit-logs">
                  Audit logs <ChevronRight size={15} />
                </Link>
              </div>
              {data.activity.length ? (
                <div className="ad-table-wrap w-full min-w-0">
                  <table className="ad-table w-full border-collapse [table-layout:fixed] text-[10px] [@media(width<=1200px)]:text-[9px] text-left [&_th]:[background:#fafbf8] [&_th]:text-[#94a08f] [&_th]:tracking-[0.3px] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#eaf0e6] [&_th]:[padding:12px_17px] [@media(width<=1200px)]:[&_th]:[padding:12px_10px] [&_th]:[overflow-wrap:anywhere] [&_th_button]:flex [&_th_button]:items-center [&_th_button]:gap-[4px] [&_th_button]:max-w-full [&_th_button]:text-left [&_th_button]:[border-top-width:0] [&_th_button]:[border-top-style:none] [&_th_button]:[border-top-color:currentColor] [&_th_button]:[border-right-width:0] [&_th_button]:[border-right-style:none] [&_th_button]:[border-right-color:currentColor] [&_th_button]:[border-bottom-width:0] [&_th_button]:[border-bottom-style:none] [&_th_button]:[border-bottom-color:currentColor] [&_th_button]:[border-left-width:0] [&_th_button]:[border-left-style:none] [&_th_button]:[border-left-color:currentColor] [&_th_button]:[background:none] [&_th_button]:text-[inherit] [&_th_button]:p-[0] [&_td]:[padding:15px_17px] [@media(width<=767px)]:[&_td]:p-[0] [@media(767px<width<=1200px)]:[&_td]:[padding:12px_10px] [&_td]:[border-bottom-width:1px] [@media(width<=767px)]:[&_td]:[border-bottom-width:0] [&_td]:[border-bottom-style:solid] [@media(width<=767px)]:[&_td]:[border-bottom-style:none] [&_td]:[border-bottom-color:#f0f3ec] [@media(width<=767px)]:[&_td]:[border-bottom-color:currentColor] [&_td]:text-[#758570] [&_td]:[overflow-wrap:anywhere] [&_td]:[vertical-align:middle] [&_tbody_tr:last-child_td]:[border-bottom-width:0] [&_tbody_tr:last-child_td]:[border-bottom-style:none] [&_tbody_tr:last-child_td]:[border-bottom-color:currentColor] [&_tbody_tr:hover]:[background:#fcfdf9] [@media(width<=767px)]:[&_thead]:hidden [@media(width<=767px)]:block [@media(width<=767px)]:[&_tbody]:block [@media(width<=767px)]:[&_tbody]:w-full [@media(width<=767px)]:[&_tr]:block [@media(width<=767px)]:[&_tr]:w-full [@media(width<=767px)]:[&_td]:block [@media(width<=767px)]:[&_td]:w-full [@media(width<=767px)]:[&_tbody_tr]:[padding:13px_16px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-width:1px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-style:solid] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-color:#e9eee4] [@media(width<=767px)]:[&_tbody_tr]:grid [@media(width<=767px)]:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:[&_tbody_tr]:gap-[11px_17px] [@media(width<=767px)]:[&_td]:[border-top-width:0] [@media(width<=767px)]:[&_td]:[border-top-style:none] [@media(width<=767px)]:[&_td]:[border-top-color:currentColor] [@media(width<=767px)]:[&_td]:[border-right-width:0] [@media(width<=767px)]:[&_td]:[border-right-style:none] [@media(width<=767px)]:[&_td]:[border-right-color:currentColor] [@media(width<=767px)]:[&_td]:[border-left-width:0] [@media(width<=767px)]:[&_td]:[border-left-style:none] [@media(width<=767px)]:[&_td]:[border-left-color:currentColor] [@media(width<=767px)]:[&_td]:text-[10px] [@media(width<=767px)]:[&_td]:min-w-0 [@media(width<=767px)]:[&_td:before]:[content:attr(data-label)] [@media(width<=767px)]:[&_td:before]:block [@media(width<=767px)]:[&_td:before]:text-[8px] [@media(width<=767px)]:[&_td:before]:text-[#a1ad96] [@media(width<=767px)]:[&_td:before]:mb-[4px] [@media(width<=767px)]:[&_td:first-child]:col-[1/-1] [@media(width<=767px)]:[&_td:last-child_.ad-row-actions]:ml-[-5px]">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Details</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.activity.map((row, i) => (
                        <tr key={`${row.action}-${row.id}-${i}`}>
                          <td data-label="Activity">
                            <span className="ad-activity-title flex items-center gap-[10px] capitalize [&_svg]:text-[#8ba48e]">
                              <Activity size={15} />
                              {row.action
                                .replace(/^ADMIN_/, "")
                                .replaceAll("_", " ")
                                .toLowerCase()}
                            </span>
                          </td>
                          <td data-label="Details">{row.subject}</td>
                          <td data-label="Date">
                            {date(row.createdAt)} ·{" "}
                            {new Date(row.createdAt).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Kolkata",
                              },
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  text="Your latest activity will appear here"
                  description="Registrations, bookings, payments and reviews are recorded automatically."
                />
              )}
            </section>
            <p className="ad-footnote text-[9px]! text-[#a2ad99]! leading-[1.8]">
              Totals show all-time records. Trend comparisons use equal-length
              periods and current record states. Revenue is gross successful INR
              collections before refunds; category revenue uses paid booking
              line totals.
            </p>
          </>
        )
      )}
    </>
  );
}
