import { useId, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  Badge,
  Empty,
  ErrorView,
  Heading,
  Loading,
  Panel,
  useVendorData,
} from "../components/WorkspaceUI";
import { date, money } from "../services/workspace.api";
const metrics = [
  [
    "totalServices",
    "Total services",
    BriefcaseBusiness,
    "services",
    "Your complete catalogue",
  ],
  [
    "activeServices",
    "Active services",
    CheckCircle2,
    "services",
    "Approved & accepting bookings",
  ],
  [
    "pendingApproval",
    "Pending approval",
    Clock3,
    "services",
    "Services with our review team",
  ],
  [
    "upcomingBookings",
    "Upcoming bookings",
    CalendarDays,
    "bookings/upcoming",
    "Celebrations on your calendar",
  ],
  [
    "completedBookings",
    "Completed bookings",
    BadgeCheck,
    "bookings/completed",
    "Memories you helped create",
  ],
  [
    "pendingQuotations",
    "Pending quotations",
    ReceiptText,
    "quotations/sent",
    "Draft, sent & viewed quotations",
  ],
  [
    "totalRevenue",
    "Total revenue",
    CircleDollarSign,
    "earnings",
    "Successful customer collections",
  ],
  [
    "pendingPayout",
    "Pending payout",
    Wallet,
    "payouts",
    "Pending & processing payouts",
  ],
  [
    "averageRating",
    "Average rating",
    Star,
    "reviews",
    "From published customer reviews",
  ],
];
function RevenueChart({ rows, metric }) {
  const id = useId().replaceAll(":", ""),
    [hover, setHover] = useState(null);
  const width = 720,
    height = 240,
    left = 62,
    right = 20,
    top = 20,
    bottom = 40,
    max = Math.max(1, ...rows.map((r) => Number(r[metric])));
  const point = (row, i) => [
    left + (i * (width - left - right)) / Math.max(1, rows.length - 1),
    top + (1 - Number(row[metric]) / max) * (height - top - bottom),
  ];
  const points = rows.map(point),
    path = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const value = (v) =>
    metric === "revenue"
      ? money(v, true)
      : Math.round(v).toLocaleString("en-IN");
  const label = (key) =>
    key.length === 7
      ? new Date(`${key}-01T12:00:00Z`).toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        })
      : new Date(`${key}T12:00:00Z`).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        });
  return (
    <div className="vw-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${metric === "revenue" ? "Revenue in INR" : "Booking count"} over the selected period`}
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2c7864" stopOpacity=".17" />
            <stop offset="100%" stopColor="#2c7864" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={left}
              x2={width - right}
              y1={top + (1 - ratio) * (height - top - bottom)}
              y2={top + (1 - ratio) * (height - top - bottom)}
              stroke="#eaf0eb"
              strokeDasharray="4 5"
            />
            <text
              x={left - 12}
              y={top + (1 - ratio) * (height - top - bottom) + 4}
              textAnchor="end"
              fill="#97a19a"
              fontSize="10"
            >
              {value(max * ratio)}
            </text>
          </g>
        ))}
        {!!points.length && (
          <>
            <path
              d={`${path} L${points.at(-1)[0]},${height - bottom} L${left},${height - bottom} Z`}
              fill={`url(#${id})`}
            />
            <path
              d={path}
              fill="none"
              stroke="#2a7560"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {rows.map((row, i) => {
          const [x, y] = points[i];
          return (
            <g key={row.key}>
              <circle
                cx={x}
                cy={y}
                r={hover === i ? 5 : 3}
                fill="#fff"
                stroke="#2a7560"
                strokeWidth="2"
                tabIndex={0}
                aria-label={`${label(row.key)}: ${value(row[metric])}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
              <rect
                x={x - 10}
                y={top}
                width="20"
                height={height - bottom - top}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {(rows.length <= 13 || i % Math.ceil(rows.length / 8) === 0) && (
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  fill="#97a19a"
                  fontSize="10"
                >
                  {label(row.key)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && rows[hover] && (
        <div className="vw-chart-tooltip">
          {label(rows[hover].key)}
          <strong>{value(rows[hover][metric])}</strong>
        </div>
      )}
      {!rows.some((r) => Number(r[metric]) > 0) && (
        <span className="vw-chart-empty">
          No {metric === "revenue" ? "revenue" : "bookings"} recorded in this
          period
        </span>
      )}
    </div>
  );
}
function Breakdown({ rows, title, description }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.amount)));
  return (
    <Panel title={title} description={description}>
      {!rows.length ? (
        <Empty
          title="No revenue to display"
          text="Revenue appears here after successful payments against booking items."
        />
      ) : (
        <div className="vw-breakdown">
          {rows.slice(0, 8).map((row, i) => (
            <div key={row.id}>
              <div>
                <span>
                  <i
                    style={{
                      background: ["#2d7661", "#b5a273", "#79a995", "#b4cab9"][
                        i % 4
                      ],
                    }}
                  />
                  {row.name}
                </span>
                <strong>{money(row.amount)}</strong>
              </div>
              <div className="vw-breakdown-track">
                <span
                  style={{
                    width: `${(Number(row.amount) / max) * 100}%`,
                    background: ["#2d7661", "#b5a273", "#79a995", "#b4cab9"][
                      i % 4
                    ],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
export default function VendorDashboard({ analyticsOnly = false }) {
  const { user } = useAuth(),
    [period, setPeriod] = useState("monthly"),
    [metric, setMetric] = useState("revenue");
  const { data, error, loading, retry } = useVendorData(
    `/dashboard?period=${period}`,
  );
  if (error) return <ErrorView error={error} retry={retry} />;
  if (!data) return <Loading />;
  return (
    <>
      <Heading
        title={
          analyticsOnly
            ? "Business analytics"
            : `Welcome back, ${user.firstName}.`
        }
        description={
          analyticsOnly
            ? "Understand your revenue, bookings and the services customers love."
            : "A little clarity for your day. A beautiful celebration ahead."
        }
      >
        <span className="vw-today">
          <CalendarDays size={14} />
          {date(new Date())}
        </span>
        <Link className="vw-button vw-primary" to="/vendor/services/new">
          <Plus size={15} /> Add service
        </Link>
      </Heading>
      {!analyticsOnly && (
        <section className="vw-welcome-banner">
          <div>
            <span>
              <Sparkles size={14} /> EVERY DETAIL MAKES A DIFFERENCE
            </span>
            <h2>
              Your expertise.
              <br />
              <em>Their unforgettable day.</em>
            </h2>
            <p>
              Keep your services current, respond to enquiries, and make room
              for the next celebration.
            </p>
            <Link to="/vendor/business/profile">
              Refine your business profile <ArrowRight size={14} />
            </Link>
          </div>
          <div className="vw-banner-illustration" aria-hidden="true">
            <div className="vw-arch">
              <span>mn</span>
              <i />
              <small>
                BEAUTIFULLY
                <br />
                CONNECTED
              </small>
            </div>
            <span className="vw-banner-star">✧</span>
          </div>
          <div className="vw-banner-status">
            <ShieldCheck size={17} />
            <span>
              VERIFIED PARTNER<strong>{user.vendor.businessName}</strong>
            </span>
          </div>
        </section>
      )}
      <div className="vw-kpi-grid">
        {metrics.map(([key, label, Icon, path, description]) => (
          <Link
            className={`vw-kpi vw-kpi-${key}`}
            to={`/vendor/${path}`}
            key={key}
          >
            <div>
              <span>{label}</span>
              <Icon size={17} strokeWidth={1.65} />
            </div>
            <strong>
              {["totalRevenue", "pendingPayout"].includes(key)
                ? money(data.stats[key], true)
                : key === "averageRating"
                  ? data.stats[key] == null
                    ? "—"
                    : `${Number(data.stats[key]).toFixed(1)} / 5`
                  : Number(data.stats[key] || 0).toLocaleString("en-IN")}
            </strong>
            <small>
              {description}
              <ArrowUpRight size={12} />
            </small>
          </Link>
        ))}
      </div>
      <div className="vw-analytics-top">
        <Panel
          title="Revenue overview"
          description={`Successful collections · ${date(data.from)} – ${date(data.to)} · INR`}
          action={
            <div className="vw-segment" aria-label="Revenue grouping">
              {["daily", "weekly", "monthly"].map((value) => (
                <button
                  key={value}
                  className={period === value ? "selected" : ""}
                  disabled={loading}
                  onClick={() => setPeriod(value)}
                >
                  {value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
          }
        >
          <div className="vw-chart-summary">
            <div>
              <strong>
                {metric === "revenue"
                  ? money(
                      data.series.reduce((sum, row) => sum + row.revenue, 0),
                    )
                  : data.series
                      .reduce((sum, row) => sum + row.bookings, 0)
                      .toLocaleString("en-IN")}
              </strong>
              <span>
                {metric === "revenue"
                  ? "collected in this period"
                  : "bookings created in this period"}
              </span>
            </div>
            <div className="vw-chart-metric">
              <button
                className={metric === "revenue" ? "selected" : ""}
                onClick={() => setMetric("revenue")}
              >
                Revenue
              </button>
              <button
                className={metric === "bookings" ? "selected" : ""}
                onClick={() => setMetric("bookings")}
              >
                Bookings
              </button>
            </div>
          </div>
          <RevenueChart rows={data.series} metric={metric} />
        </Panel>
        <section className="vw-next-panel">
          <div className="vw-next-heading">
            <span className="vw-eyebrow">WHAT'S NEXT</span>
            <CalendarDays size={19} />
            <h2>Upcoming celebrations</h2>
          </div>
          {!data.upcoming.length ? (
            <Empty
              title="Your calendar is open"
              text="Accepted and confirmed upcoming bookings will appear here."
            />
          ) : (
            <div className="vw-upcoming-list">
              {data.upcoming.map((row) => (
                <Link key={row.id} to="/vendor/bookings/upcoming">
                  <span className="vw-date-tile">
                    <strong>{new Date(row.eventDate).getUTCDate()}</strong>
                    {new Date(row.eventDate).toLocaleDateString("en-IN", {
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </span>
                  <div>
                    <strong>{row.event}</strong>
                    <span>{row.customer}</span>
                    <Badge>{row.status}</Badge>
                  </div>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
          )}
          <Link className="vw-panel-link" to="/vendor/calendar">
            View availability calendar <ArrowRight size={14} />
          </Link>
        </section>
      </div>
      {!analyticsOnly && (
        <Panel
          title="New booking requests"
          description={`${Number(data.stats.bookingRequests || 0)} requests waiting for your attention`}
          action={
            <Link className="vw-text-link" to="/vendor/bookings/requests">
              View all <ArrowUpRight size={14} />
            </Link>
          }
        >
          {!data.requests.length ? (
            <Empty
              title="You're all caught up"
              text="New booking requests will appear here when customers choose your services."
            />
          ) : (
            <div className="vw-table-wrap">
              <table className="vw-table">
                <thead>
                  <tr>
                    {[
                      "Booking",
                      "Customer & event",
                      "Event date",
                      "Services",
                      "Amount",
                      "Status",
                      "",
                    ].map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.requests.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.number}</strong>
                      </td>
                      <td>
                        <strong>{row.customer}</strong>
                        <small>{row.event}</small>
                      </td>
                      <td>{date(row.eventDate)}</td>
                      <td>{row.services || "Services not specified"}</td>
                      <td>{money(row.amount)}</td>
                      <td>
                        <Badge>{row.status}</Badge>
                      </td>
                      <td>
                        <Link
                          className="vw-button"
                          to="/vendor/bookings/requests"
                        >
                          Review <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Breakdown
          rows={data.byService}
          title="Revenue by service"
          description="Your services' contribution to customer collections"
        />
        <Breakdown
          rows={data.byCategory}
          title="Revenue by category"
          description="Where your business is making the biggest impression"
        />
      </div>
      <p className="vw-report-note">
        Collections are successful INR payments. Service and category revenue is
        allocated by booking item value. Payouts reflect the recorded payout
        ledger.
      </p>
    </>
  );
}
