
import { useId, useState } from "react";
import { Link } from "react-router-dom";

import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Inbox,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";

import { QuotationOverview } from "../../quotations/QuotationPages";
import { useAuth } from "../../../context/AuthContext";
import { useVendorData } from "../components/WorkspaceUI";
import { date, money } from "../services/workspace.api";

// ==========================================
// DASHBOARD METRICS
// ==========================================

const metrics = [
  {
    key: "totalServices",
    label: "Total services",
    icon: BriefcaseBusiness,
    path: "services",
    description: "Your complete catalogue",
  },
  {
    key: "activeServices",
    label: "Active services",
    icon: CheckCircle2,
    path: "services",
    description: "Approved & accepting bookings",
  },
  {
    key: "pendingApproval",
    label: "Pending approval",
    icon: Clock3,
    path: "services",
    description: "Services with our review team",
  },
  {
    key: "upcomingBookings",
    label: "Upcoming bookings",
    icon: CalendarDays,
    path: "bookings/upcoming",
    description: "Celebrations on your calendar",
  },
  {
    key: "completedBookings",
    label: "Completed bookings",
    icon: BadgeCheck,
    path: "bookings/completed",
    description: "Memories you helped create",
  },
  {
    key: "pendingQuotations",
    label: "Pending quotations",
    icon: ReceiptText,
    path: "quotations/sent",
    description: "Draft, sent & viewed quotations",
  },
  {
    key: "totalRevenue",
    label: "Total revenue",
    icon: CircleDollarSign,
    path: "earnings",
    description: "Successful customer collections",
  },
  {
    key: "pendingPayout",
    label: "Pending payout",
    icon: Wallet,
    path: "payouts",
    description: "Pending & processing payouts",
  },
  {
    key: "averageRating",
    label: "Average rating",
    icon: Star,
    path: "reviews",
    description: "From published customer reviews",
  },
];

// ==========================================
// REUSABLE PANEL
// ==========================================

function DashboardPanel({
  title,
  description,
  action,
  children,
  className = "",
}) {
  return (
    <section
      className={`
        min-w-0 overflow-hidden rounded-[10px]
        border border-[#e4eade] bg-white
        ${className}
      `}
    >
      <div
        className="
          flex flex-wrap items-center justify-between
          gap-4 border-b border-[#edf2e8]
          px-5 py-5 sm:px-6
        "
      >
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.4px] text-[#2b4638]">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-[11px] leading-relaxed text-[#a0ad94]">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="flex shrink-0 items-center">
            {action}
          </div>
        )}
      </div>

      {children}
    </section>
  );
}

// ==========================================
// EMPTY STATE
// ==========================================

function DashboardEmpty({ title, text }) {
  return (
    <div
      className="
        flex min-h-[190px] flex-col items-center
        justify-center gap-3 px-6 py-9 text-center
      "
    >
      <span
        className="
          flex h-[53px] w-[53px]
          items-center justify-center
          rounded-[14px] bg-[#f3f6ed]
          text-[#b5c2a4]
        "
      >
        <Inbox size={25} strokeWidth={1.6} />
      </span>

      <h3 className="text-[13px] font-medium text-[#91a27e]">
        {title}
      </h3>

      <p className="max-w-[350px] text-[11px] leading-6 text-[#aab89d]">
        {text}
      </p>
    </div>
  );
}

// ==========================================
// LOADING STATE
// ==========================================

function DashboardLoading() {
  return (
    <div
      role="status"
      className="
        flex min-h-[350px] flex-col
        items-center justify-center gap-4
        rounded-xl border border-[#e4eadf]
        bg-white
      "
    >
      <span
        className="
          h-9 w-9 animate-spin rounded-full
          border-[3px] border-[#e4eadf]
          border-t-[#245c49]
        "
      />

      <p className="text-[12px] text-[#89978c]">
        Loading your dashboard...
      </p>
    </div>
  );
}

// ==========================================
// ERROR STATE
// ==========================================

function DashboardError({ error, retry }) {
  return (
    <div
      role="alert"
      className="
        flex flex-col items-center gap-4
        rounded-xl border border-[#efdcd0]
        bg-[#fff9f5] px-6 py-10 text-center
      "
    >
      <AlertCircle size={32} className="text-[#b78270]" />

      <div>
        <h3 className="text-sm font-semibold text-[#9d6451]">
          Unable to load dashboard
        </h3>

        <p className="mt-2 text-[12px] text-[#b78270]">
          {typeof error === "string"
            ? error
            : error?.message || "Something went wrong."}
        </p>
      </div>

      <button
        type="button"
        onClick={retry}
        className="
          inline-flex items-center gap-2
          rounded-lg border border-[#e6cfbf]
          bg-white px-4 py-2.5
          text-[12px] font-medium text-[#9d6451]
          transition-colors hover:bg-[#fff1e7]
        "
      >
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  );
}

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ status }) {
  const value = String(status ?? "Unknown");
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");

  const successful = [
    "approved",
    "active",
    "confirmed",
    "completed",
    "paid",
    "success",
    "accepted",
    "available",
    "published",
  ];

  const pending = [
    "pending",
    "processing",
    "draft",
    "paymentpending",
    "underreview",
  ];

  const rejected = [
    "rejected",
    "cancelled",
    "failed",
    "suspended",
    "blocked",
  ];

  const inProgress = [
    "sent",
    "viewed",
    "inprogress",
  ];

  let colors = "bg-[#f0f4e9] text-[#96a486]";

  if (successful.includes(normalized)) {
    colors = "bg-[#edf5e4] text-[#7a9b5b]";
  } else if (pending.includes(normalized)) {
    colors = "bg-[#fbf6e8] text-[#b2a06a]";
  } else if (rejected.includes(normalized)) {
    colors = "bg-[#fcf1e9] text-[#c08d78]";
  } else if (inProgress.includes(normalized)) {
    colors = "bg-[#ebf4ef] text-[#79a399]";
  }

  return (
    <span
      className={`
        inline-flex items-center rounded-md
        px-2 py-1 text-[10px] font-medium
        leading-relaxed ${colors}
      `}
    >
      {value}
    </span>
  );
}

// ==========================================
// REVENUE CHART
// ==========================================

function RevenueChart({ rows = [], metric }) {
  const id = useId().replaceAll(":", "");
  const [hover, setHover] = useState(null);

  const width = 720;
  const height = 240;

  const left = 62;
  const right = 20;
  const top = 20;
  const bottom = 40;

  const values = rows.map((row) =>
    Math.max(0, Number(row[metric]) || 0)
  );

  const max = Math.max(1, ...values);

  const point = (row, index) => {
    const value = Math.max(0, Number(row[metric]) || 0);

    return [
      left +
        (index * (width - left - right)) /
          Math.max(1, rows.length - 1),

      top +
        (1 - value / max) *
          (height - top - bottom),
    ];
  };

  const points = rows.map(point);

  const path = points
    .map(
      ([x, y], index) =>
        `${index ? "L" : "M"}${x},${y}`
    )
    .join(" ");

  const formatValue = (value) =>
    metric === "revenue"
      ? money(value, true)
      : Math.round(value).toLocaleString("en-IN");

  const formatLabel = (key) => {
    const value = String(key);

    const parsed =
      value.length === 7
        ? new Date(`${value}-01T12:00:00Z`)
        : new Date(`${value}T12:00:00Z`);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString(
      "en-IN",
      value.length === 7
        ? { month: "short", year: "2-digit", timeZone: "UTC" }
        : { day: "numeric", month: "short", timeZone: "UTC" }
    );
  };

  const hasActivity = values.some((value) => value > 0);

  return (
    <div className="relative min-w-0 px-3 pb-4 sm:px-5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        className="block h-auto w-full"
        aria-label={`${
          metric === "revenue"
            ? "Revenue in INR"
            : "Booking count"
        } over the selected period`}
      >
        <defs>
          <linearGradient
            id={id}
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#2c7864"
              stopOpacity="0.17"
            />
            <stop
              offset="100%"
              stopColor="#2c7864"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y =
            top +
            (1 - ratio) * (height - top - bottom);

          return (
            <g key={ratio}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="#eaf0eb"
                strokeDasharray="4 5"
              />

              <text
                x={left - 12}
                y={y + 4}
                textAnchor="end"
                fill="#97a19a"
                fontSize="10"
              >
                {formatValue(max * ratio)}
              </text>
            </g>
          );
        })}

        {/* Area + Line */}
        {points.length > 0 && (
          <>
            <path
              d={`${path} L${
                points[points.length - 1][0]
              },${height - bottom} L${left},${
                height - bottom
              } Z`}
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

        {/* Data Points */}
        {rows.map((row, index) => {
          const [x, y] = points[index];

          const showLabel =
            rows.length <= 13 ||
            index % Math.ceil(rows.length / 8) === 0;

          return (
            <g key={`${row.key}-${index}`}>
              <rect
                x={x - 10}
                y={top}
                width="20"
                height={height - bottom - top}
                fill="transparent"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              />

              <circle
                cx={x}
                cy={y}
                r={hover === index ? 5 : 3}
                fill="#ffffff"
                stroke="#2a7560"
                strokeWidth="2"
                tabIndex={0}
                aria-label={`${formatLabel(
                  row.key
                )}: ${formatValue(row[metric])}`}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
              />

              {showLabel && (
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  fill="#97a19a"
                  fontSize="10"
                >
                  {formatLabel(row.key)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Chart Tooltip */}
      {hover !== null && rows[hover] && (
        <div
          className="
            pointer-events-none absolute right-6 top-2
            rounded-lg border border-[#dde7d4]
            bg-white px-3 py-2 shadow-lg
          "
        >
          <p className="text-[10px] text-[#9eac8f]">
            {formatLabel(rows[hover].key)}
          </p>

          <strong className="block text-sm font-semibold text-[#5f8051]">
            {formatValue(rows[hover][metric])}
          </strong>
        </div>
      )}

      {/* Empty Chart */}
      {!hasActivity && (
        <div
          className="
            pointer-events-none absolute inset-x-4
            top-[45%] text-center
            text-[11px] text-[#a6b49a]
          "
        >
          No {metric === "revenue" ? "revenue" : "bookings"}{" "}
          recorded in this period.
        </div>
      )}
    </div>
  );
}

// ==========================================
// REVENUE BREAKDOWN
// ==========================================

function Breakdown({
  rows = [],
  title,
  description,
}) {
  const max = Math.max(
    1,
    ...rows.map((row) => Number(row.amount) || 0)
  );

  const colors = [
    "#2d7661",
    "#b5a273",
    "#79a995",
    "#b4cab9",
  ];

  return (
    <DashboardPanel
      title={title}
      description={description}
    >
      {!rows.length ? (
        <DashboardEmpty
          title="No revenue to display"
          text="Revenue appears here after successful payments against booking items."
        />
      ) : (
        <div className="flex flex-col gap-[18px] px-5 py-6 sm:px-6">
          {rows.slice(0, 8).map((row, index) => {
            const color = colors[index % colors.length];

            const percentage = Math.min(
              100,
              Math.max(
                0,
                ((Number(row.amount) || 0) / max) * 100
              )
            );

            return (
              <div key={row.id ?? index}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="flex min-w-0 items-center gap-2 text-[11px] text-[#8d9e7d]">
                    <span
                      className="h-[6px] w-[6px] shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />

                    <span className="truncate">
                      {row.name}
                    </span>
                  </span>

                  <strong className="shrink-0 text-[11px] font-medium text-[#6a8357]">
                    {money(row.amount)}
                  </strong>
                </div>

                {/* Data-driven progress bar */}
                <svg
                  viewBox="0 0 100 6"
                  preserveAspectRatio="none"
                  className="block h-[6px] w-full"
                  role="img"
                  aria-label={`${row.name}: ${percentage.toFixed(
                    1
                  )}% of largest category`}
                >
                  <rect
                    width="100"
                    height="6"
                    rx="3"
                    fill="#f0f4ea"
                  />

                  <rect
                    width={percentage}
                    height="6"
                    rx="3"
                    fill={color}
                  />
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </DashboardPanel>
  );
}

// ==========================================
// KPI VALUE FORMATTER
// ==========================================

function formatMetric(key, value) {
  if (["totalRevenue", "pendingPayout"].includes(key)) {
    return money(value ?? 0, true);
  }

  if (key === "averageRating") {
    return value == null
      ? "—"
      : `${Number(value).toFixed(1)} / 5`;
  }

  return Number(value || 0).toLocaleString("en-IN");
}

// ==========================================
// VENDOR DASHBOARD PAGE
// ==========================================

export default function VendorDashboard({
  analyticsOnly = false,
}) {
  const { user } = useAuth();

  const [period, setPeriod] = useState("monthly");
  const [metric, setMetric] = useState("revenue");

  // Preserve existing API and endpoint
  const {
    data,
    error,
    loading,
    retry,
  } = useVendorData(`/dashboard?period=${period}`);

  if (error) {
    return (
      <DashboardError
        error={error}
        retry={retry}
      />
    );
  }

  if (!data) {
    return <DashboardLoading />;
  }

  const stats = data.stats ?? {};
  const series = data.series ?? [];
  const upcoming = data.upcoming ?? [];
  const requests = data.requests ?? [];

  const vendorName = user?.firstName || "Partner";

  const businessName =
    user?.vendor?.businessName || "";

  const totalChartValue =
    metric === "revenue"
      ? money(
          series.reduce(
            (sum, row) =>
              sum + (Number(row.revenue) || 0),
            0
          )
        )
      : series
          .reduce(
            (sum, row) =>
              sum + (Number(row.bookings) || 0),
            0
          )
          .toLocaleString("en-IN");

  return (
    <div className="flex w-full min-w-0 flex-col gap-[23px]">

      {/* ======================================
          PAGE HEADING
      ====================================== */}

      <div
        className="
          flex flex-col justify-between gap-4
          sm:flex-row sm:items-center
        "
      >
        <div className="min-w-0">
          <span
            className="
              text-[10px] font-semibold
              uppercase tracking-[1.6px]
              text-[#9aa890]
            "
          >
            VENDOR WORKSPACE
          </span>

          <h1
            className="
              mt-2 text-[24px] font-semibold
              leading-tight tracking-[-0.6px]
              text-[#2b4638]
              sm:text-[28px]
            "
          >
            {analyticsOnly
              ? "Business analytics"
              : `Welcome back, ${vendorName}.`}
          </h1>

          <p className="mt-2 text-[12px] leading-6 text-[#8b978b]">
            {analyticsOnly
              ? "Understand your revenue, bookings and the services customers love."
              : "A little clarity for your day. A beautiful celebration ahead."}
          </p>
        </div>

        <div
          className="
            flex shrink-0 flex-wrap
            items-center gap-3
          "
        >
          <span
            className="
              inline-flex items-center gap-2
              text-[11px] text-[#99a38f]
            "
          >
            <CalendarDays size={15} />
            {date(new Date())}
          </span>

          <Link
            to="/vendor/services/new"
            className="
              inline-flex min-h-[40px]
              items-center justify-center gap-2
              rounded-lg border border-[#386348]
              bg-[#386348] px-4 py-2.5
              text-[12px] font-medium text-white
              no-underline
              transition-colors duration-200
              hover:bg-[#2b523a]
              hover:text-white
            "
          >
            <Plus size={16} />
            Add service
          </Link>
        </div>
      </div>

      {/* ======================================
          WELCOME BANNER
      ====================================== */}

      {!analyticsOnly && (
        <section
          className="
            relative flex min-h-[215px]
            justify-between overflow-hidden
            rounded-xl border border-[#dfe8d5]
            bg-[#e9f0e1] px-5 py-7
            sm:px-8 sm:py-8
          "
        >
          <div className="relative z-10 max-w-[470px]">

            <span
              className="
                inline-flex items-center gap-2
                text-[9px] font-medium
                tracking-[1.6px] text-[#7b9168]
              "
            >
              <Sparkles size={15} />
              EVERY DETAIL MAKES A DIFFERENCE
            </span>

            <h2
              className="
                mt-4 font-serif
                text-[27px] font-normal
                leading-[1.2] tracking-[-1px]
                text-[#4c6b43]
                sm:text-[34px]
              "
            >
              Your expertise.
              <span className="block italic text-[#8e9f7f]">
                Their unforgettable day.
              </span>
            </h2>

            <p
              className="
                mt-4 max-w-[330px]
                text-[11px] leading-[1.9]
                text-[#92a283]
              "
            >
              Keep your services current, respond to
              enquiries, and make room for the next
              celebration.
            </p>

            <Link
              to="/vendor/business/profile"
              className="
                mt-4 inline-flex items-center gap-2
                border-b border-[#a7b993] pb-1
                text-[11px] font-medium
                text-[#6a8454] no-underline
                transition-colors
                hover:text-[#245c49]
              "
            >
              Refine your business profile
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Decorative Arch */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none absolute
              bottom-[-5px] right-[9%]
              hidden h-[235px] w-[260px]
              items-end justify-center
              lg:flex
            "
          >
            <div
              className="
                flex h-[209px] w-[148px]
                flex-col items-center
                rounded-t-[85px]
                border border-[#bbcca8]
                bg-gradient-to-br
                from-[#dfe9d4] to-[#cdddbb]
                pt-[35px]
                shadow-[0_0_0_12px_#e0e9d5,0_0_0_13px_#c7d6b5,0_0_0_26px_#e5eddc]
              "
            >
              <span
                className="
                  pr-2 font-serif text-[51px]
                  tracking-[-11px] text-[#9eb18a]
                "
              >
                mn
              </span>

              <span className="my-3 h-px w-[35px] bg-[#adbf98]" />

              <small
                className="
                  text-center text-[7px]
                  leading-5 tracking-[2.8px]
                  text-[#a0b28c]
                "
              >
                BEAUTIFULLY
                <span className="block">CONNECTED</span>
              </small>
            </div>

            <span
              className="
                absolute right-0 top-0
                font-serif text-[48px]
                text-[#b4c59e]
              "
            >
              ✧
            </span>
          </div>

          {/* Business Name */}
          {businessName && (
            <div
              className="
                absolute right-5 top-5
                hidden items-center gap-2
                text-[#8ea578]
                xl:flex
              "
            >
              <ShieldCheck
                size={18}
                className="shrink-0"
              />

              <div className="max-w-[170px]">
                <span
                  className="
                    block text-[8px]
                    tracking-[1.4px]
                  "
                >
                  PARTNER BUSINESS
                </span>

                <strong
                  className="
                    mt-1 block truncate
                    text-[10px] font-semibold
                  "
                >
                  {businessName}
                </strong>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ======================================
          KPI CARDS
      ====================================== */}

      <div
        className="
          grid grid-cols-1 gap-[13px]
          sm:grid-cols-2
          lg:grid-cols-3
          2xl:grid-cols-5
        "
      >
        {metrics.map(
          ({
            key,
            label,
            icon: Icon,
            path,
            description,
          }) => {
            const highlighted = key === "totalRevenue";

            return (
              <Link
                key={key}
                to={`/vendor/${path}`}
                className={`
                  group flex min-w-0 flex-col
                  rounded-[10px] border
                  px-5 py-[18px]
                  no-underline
                  transition-all duration-200

                  hover:-translate-y-0.5
                  hover:border-[#adc29b]

                  ${
                    highlighted
                      ? "border-[#dde7d3] bg-[#edf3e7]"
                      : "border-[#e4eadf] bg-white"
                  }
                `}
              >
                <div
                  className="
                    flex items-center
                    justify-between gap-3
                  "
                >
                  <span
                    className="
                      text-[11px] font-medium
                      text-[#91a084]
                    "
                  >
                    {label}
                  </span>

                  <Icon
                    size={19}
                    strokeWidth={1.7}
                    className={
                      key === "averageRating" ||
                      key === "pendingPayout" ||
                      key === "pendingApproval"
                        ? "shrink-0 text-[#c1ac7d]"
                        : "shrink-0 text-[#a0b18e]"
                    }
                  />
                </div>

                <strong
                  className="
                    my-3 block break-words
                    text-[26px] font-semibold
                    leading-tight tracking-[-0.8px]
                    text-[#476440]
                  "
                >
                  {formatMetric(key, stats[key])}
                </strong>

                <div
                  className="
                    mt-auto flex items-center
                    justify-between gap-2
                    text-[10px] text-[#adb79f]
                  "
                >
                  <span className="min-w-0">
                    {description}
                  </span>

                  <ArrowUpRight
                    size={15}
                    className="
                      shrink-0 transition-transform
                      group-hover:-translate-y-0.5
                      group-hover:translate-x-0.5
                    "
                  />
                </div>
              </Link>
            );
          }
        )}
      </div>

      {/* ======================================
          QUOTATION OVERVIEW
      ====================================== */}

      {!analyticsOnly && (
        <QuotationOverview role="Vendor" />
      )}

      {/* ======================================
          ANALYTICS + UPCOMING CELEBRATIONS
      ====================================== */}

      <div
        className="
          grid min-w-0 grid-cols-1
          items-stretch gap-5
          xl:grid-cols-[minmax(0,1fr)_286px]
        "
      >
        {/* ==================================
            REVENUE OVERVIEW
        ================================== */}

        <DashboardPanel
          title="Revenue overview"
          description={`Successful collections · ${date(
            data.from
          )} – ${date(data.to)} · INR`}
          action={
            <div
              role="group"
              aria-label="Revenue grouping"
              className="
                flex items-center gap-1
                rounded-lg border border-[#e6ebdf]
                bg-[#fafbf7] p-1
              "
            >
              {["daily", "weekly", "monthly"].map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={loading}
                    aria-pressed={period === value}
                    onClick={() => setPeriod(value)}
                    className={`
                      rounded-md px-2.5 py-1.5
                      text-[10px] font-medium
                      transition-colors
                      disabled:opacity-50

                      ${
                        period === value
                          ? "bg-white text-[#65834f] shadow-sm"
                          : "text-[#a0ab93] hover:bg-white/70"
                      }
                    `}
                  >
                    {value[0].toUpperCase() + value.slice(1)}
                  </button>
                )
              )}
            </div>
          }
        >
          <div
            className="
              flex flex-wrap items-center
              justify-between gap-4
              px-5 pb-3 pt-5 sm:px-6
            "
          >
            <div>
              <strong
                className="
                  block text-[26px] font-semibold
                  tracking-[-0.6px] text-[#4e6a45]
                "
              >
                {totalChartValue}
              </strong>

              <span className="mt-1 block text-[10px] text-[#a5b098]">
                {metric === "revenue"
                  ? "collected in this period"
                  : "bookings created in this period"}
              </span>
            </div>

            <div
              role="group"
              aria-label="Chart metric"
              className="flex items-center gap-4"
            >
              {["revenue", "bookings"].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={metric === value}
                  onClick={() => setMetric(value)}
                  className={`
                    border-b pb-1
                    text-[11px] font-medium
                    transition-colors

                    ${
                      metric === value
                        ? "border-[#91ab7b] text-[#5f8050]"
                        : "border-transparent text-[#a6b198] hover:text-[#5f8050]"
                    }
                  `}
                >
                  {value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <RevenueChart
            rows={series}
            metric={metric}
          />
        </DashboardPanel>

        {/* ==================================
            UPCOMING CELEBRATIONS
        ================================== */}

        <section
          className="
            flex min-w-0 flex-col
            overflow-hidden rounded-[10px]
            border border-[#e0e9d5]
            bg-[#f0f4e9]
          "
        >
          <div className="relative px-5 pb-3 pt-5">
            <span
              className="
                text-[10px] font-medium
                uppercase tracking-[1.6px]
                text-[#9aa890]
              "
            >
              WHAT'S NEXT
            </span>

            <CalendarDays
              size={19}
              className="absolute right-5 top-6 text-[#a4b48e]"
            />

            <h2
              className="
                mt-2 font-serif text-[22px]
                font-normal text-[#748b5d]
              "
            >
              Upcoming celebrations
            </h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex-1">
              <DashboardEmpty
                title="Your calendar is open"
                text="Accepted and confirmed upcoming bookings will appear here."
              />
            </div>
          ) : (
            <div className="flex-1 px-5 pb-4">
              {upcoming.map((row) => {
                const eventDate = new Date(row.eventDate);

                return (
                  <Link
                    key={row.id}
                    to="/vendor/bookings/upcoming"
                    className="
                      flex items-start gap-3
                      border-b border-[#e0e9d5]
                      py-4 no-underline
                      last:border-b-0
                      hover:text-[#245c49]
                    "
                  >
                    {/* Date Tile */}
                    <div
                      className="
                        flex w-11 shrink-0
                        flex-col items-center
                        justify-center rounded-lg
                        border border-[#e1e8d5]
                        bg-[#fbfcf8] px-1 py-2
                        text-[10px] text-[#9cae88]
                      "
                    >
                      <strong
                        className="
                          text-[18px] font-medium
                          leading-tight text-[#839b69]
                        "
                      >
                        {eventDate.getUTCDate()}
                      </strong>

                      {eventDate.toLocaleDateString(
                        "en-IN",
                        {
                          month: "short",
                          timeZone: "UTC",
                        }
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="min-w-0 flex-1">
                      <strong
                        className="
                          block truncate text-[11px]
                          font-medium text-[#718b5d]
                        "
                      >
                        {row.event}
                      </strong>

                      <span
                        className="
                          my-1 block truncate
                          text-[10px] text-[#a3b08f]
                        "
                      >
                        {row.customer}
                      </span>

                      <StatusBadge status={row.status} />
                    </div>

                    <ArrowUpRight
                      size={15}
                      className="shrink-0 text-[#a9b999]"
                    />
                  </Link>
                );
              })}
            </div>
          )}

          {/* Calendar Link */}
          <Link
            to="/vendor/calendar"
            className="
              flex items-center justify-between
              gap-2 border-t border-[#dce7cf]
              px-5 py-4 text-[11px]
              font-medium text-[#819b66]
              no-underline transition-colors
              hover:bg-[#e8efdf]
              hover:text-[#245c49]
            "
          >
            View availability calendar
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>

      {/* ======================================
          NEW BOOKING REQUESTS
      ====================================== */}

      {!analyticsOnly && (
        <DashboardPanel
          title="New booking requests"
          description={`${Number(
            stats.bookingRequests || 0
          )} requests waiting for your attention`}
          action={
            <Link
              to="/vendor/bookings/requests"
              className="
                inline-flex items-center gap-2
                text-[11px] font-medium
                text-[#799464] no-underline
                hover:text-[#245c49]
              "
            >
              View all
              <ArrowUpRight size={15} />
            </Link>
          }
        >
          {requests.length === 0 ? (
            <DashboardEmpty
              title="You're all caught up"
              text="New booking requests will appear here when customers choose your services."
            />
          ) : (
            <div className="w-full min-w-0 overflow-x-auto">
              <table
                className="
                  w-full min-w-[820px]
                  border-collapse text-left
                  text-[11px] leading-relaxed
                "
              >
                <thead className="bg-[#fafcf7]">
                  <tr>
                    {[
                      "Booking",
                      "Customer & event",
                      "Event date",
                      "Services",
                      "Amount",
                      "Status",
                      "",
                    ].map((heading, index) => (
                      <th
                        key={index}
                        scope="col"
                        className="
                          whitespace-nowrap
                          border-b border-t
                          border-[#eaf0e1]
                          px-5 py-3
                          text-[10px] font-medium
                          tracking-[0.3px]
                          text-[#9cac8c]
                        "
                      >
                        {heading || "Action"}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {requests.map((row) => (
                    <tr
                      key={row.id}
                      className="
                        transition-colors
                        hover:bg-[#fdfefb]
                      "
                    >
                      <td className="border-b border-[#f0f3eb] px-5 py-4">
                        <strong className="text-[11px] font-medium text-[#6b855b]">
                          {row.number}
                        </strong>
                      </td>

                      <td className="border-b border-[#f0f3eb] px-5 py-4">
                        <strong className="block text-[11px] font-medium text-[#6b855b]">
                          {row.customer}
                        </strong>

                        <small className="mt-1 block text-[10px] text-[#a6b296]">
                          {row.event}
                        </small>
                      </td>

                      <td className="whitespace-nowrap border-b border-[#f0f3eb] px-5 py-4 text-[#879b76]">
                        {date(row.eventDate)}
                      </td>

                      <td className="max-w-[260px] border-b border-[#f0f3eb] px-5 py-4 text-[#879b76]">
                        <span className="line-clamp-2">
                          {row.services ||
                            "Services not specified"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap border-b border-[#f0f3eb] px-5 py-4 text-[#879b76]">
                        {money(row.amount)}
                      </td>

                      <td className="border-b border-[#f0f3eb] px-5 py-4">
                        <StatusBadge status={row.status} />
                      </td>

                      <td className="border-b border-[#f0f3eb] px-5 py-4">
                        <Link
                          to="/vendor/bookings/requests"
                          className="
                            inline-flex items-center gap-2
                            whitespace-nowrap rounded-lg
                            border border-[#dfe7d8]
                            bg-white px-3 py-2
                            text-[10px] font-medium
                            text-[#738567] no-underline
                            transition-colors
                            hover:bg-[#f0f5e9]
                            hover:text-[#406b42]
                          "
                        >
                          Review
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardPanel>
      )}

      {/* ======================================
          REVENUE BREAKDOWN
      ====================================== */}

      <div
        className="
          grid min-w-0 grid-cols-1
          gap-5 xl:grid-cols-2
        "
      >
        <Breakdown
          rows={data.byService ?? []}
          title="Revenue by service"
          description="Your services' contribution to customer collections"
        />

        <Breakdown
          rows={data.byCategory ?? []}
          title="Revenue by category"
          description="Where your business is making the biggest impression"
        />
      </div>

      {/* ======================================
          REPORT NOTE
      ====================================== */}

      <p
        className="
          text-center text-[10px]
          leading-relaxed text-[#aab59c]
        "
      >
        Collections are successful INR payments.
        Service and category revenue is allocated
        by booking item value. Payouts reflect
        the recorded payout ledger.
      </p>
    </div>
  );
}
