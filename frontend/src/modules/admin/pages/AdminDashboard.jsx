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
  ["services", "Active services", BriefcaseBusiness, "services"],
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
    <section className={`ad-panel ad-analytics-panel ${className}`}>
      <div className="ad-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="ad-chart-label">IN PERIOD</span>
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
    <section className="ad-panel">
      <div className="ad-panel-heading">
        <div>
          <h2>Every celebration, by category</h2>
          <p>
            Vendor and service totals · bookings and paid line revenue in the
            selected period
          </p>
        </div>
        <label className="ad-search">
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
      <div className="ad-table-wrap">
        <table className="ad-table">
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
                    className="ad-record-name"
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
                  <span className="ad-rating">
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
      <div className="ad-table-footer">
        <span>{filtered.length} categories</span>
        <div>
          <button
            className="ad-button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            {page} / {Math.max(1, Math.ceil(filtered.length / 8))}
          </span>
          <button
            className="ad-button"
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
      <div className="ad-page-heading">
        <div>
          <div className="ad-eyebrow">
            <span /> YOUR MARKETPLACE, AT A GLANCE
          </div>
          <h1>A beautiful day to build something.</h1>
          <p>
            Welcome back, {user?.firstName}. Here’s what’s happening at
            MarryNest.
          </p>
        </div>
        <div className="ad-heading-actions">
          <select
            aria-label="Analytics period"
            defaultValue="30"
            onChange={(e) => setRange(getRange(Number(e.target.value)))}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
          </select>
          <button
            className="ad-button"
            disabled={loading}
            onClick={() => setVersion((v) => v + 1)}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>
      </div>
      <div className="ad-range-note">
        <CalendarDays size={13} />
        {date(range.from)} – {date(range.to)}
        <span>Asia/Kolkata · INR</span>
        {data && !error && (
          <span className="ad-live">
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
        <div className="ad-kpi-grid">
          {metrics.map(([key]) => (
            <div className="ad-panel" key={key}>
              <Skeleton rows={3} />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} retry={() => setVersion((v) => v + 1)} />
      ) : (
        data && (
          <>
            <div className="ad-kpi-grid">
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
                    className={`ad-panel ad-kpi ${i === 6 ? "ad-kpi-featured" : ""}`}
                    key={key}
                  >
                    <div className="ad-kpi-top">
                      <span>{title}</span>
                      <span
                        className={`ad-kpi-icon ${i === 2 ? "ad-gold" : ""}`}
                      >
                        <Icon size={18} />
                      </span>
                    </div>
                    <strong>
                      {["revenue", "payouts"].includes(key)
                        ? money(metric.total, true)
                        : number(metric.total)}
                    </strong>
                    <div
                      className="ad-kpi-change"
                      title={`Current period: ${metric.currentPeriod}; previous period: ${metric.previousPeriod}. State-based metrics count records with their current status.`}
                    >
                      <span
                        className={
                          change > 0
                            ? "ad-positive"
                            : change < 0
                              ? "ad-negative"
                              : ""
                        }
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
            <div className="ad-analytics-grid">
              <ChartPanel
                title="Booking revenue"
                subtitle="Gross successful INR collections by payment date"
                className="ad-span-2"
              >
                <div className="ad-chart-summary">
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
            <div className="ad-analytics-grid">
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
            <div className="ad-analytics-grid">
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
            <CategoryAnalytics rows={data.categories} />
            <section className="ad-panel">
              <div className="ad-panel-heading">
                <div>
                  <h2>Across your marketplace</h2>
                  <p>The latest registrations, decisions, and celebrations.</p>
                </div>
                <Link className="ad-text-link" to="/admin/audit-logs">
                  Audit logs <ChevronRight size={15} />
                </Link>
              </div>
              {data.activity.length ? (
                <div className="ad-table-wrap">
                  <table className="ad-table">
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
                            <span className="ad-activity-title">
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
            <p className="ad-footnote">
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
