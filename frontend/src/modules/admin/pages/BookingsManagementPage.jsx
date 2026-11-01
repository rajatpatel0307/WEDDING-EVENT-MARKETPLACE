
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  Search,
  SlidersHorizontal,
  CalendarCheck,
  Clock,
  CheckCircle2,
  CalendarDays,
  Activity,
  BadgeCheck,
  XCircle,
  ShieldAlert,
  IndianRupee,
  Percent,
  Wallet,
  Eye,
} from "lucide-react";

import {
  useAdminData,
  useDebounced,
  money,
  date,
  number,
} from "../services-management.api";

import {
  Loading,
  ErrorState,
  Empty,
  Pager,
  Field,
  BookingStatus,
} from "../components/BookingUI";

import AdminDialog from "../components/AdminDialog";


// =====================================================
// STATISTICS CARDS
// =====================================================

const cards = [
  ["total", "Total Bookings", CalendarCheck],
  ["pending", "Pending", Clock],
  ["confirmed", "Confirmed", CheckCircle2],
  ["upcoming", "Upcoming", CalendarDays],
  ["inProgress", "In Progress", Activity],
  ["completed", "Completed", BadgeCheck],
  ["cancelled", "Cancelled", XCircle],
  ["disputed", "Disputed", ShieldAlert],
  ["value", "Total Booking Value", IndianRupee],
  ["commission", "Platform Commission", Percent],
  ["payable", "Vendor Payable", Wallet],
];

// =====================================================
// ALL SUPPORTED BOOKING STATES
// Used by advanced filters
// =====================================================

const states = [
  "Pending",
  "Accepted",
  "PaymentPending",
  "Confirmed",
  "InProgress",
  "Completed",
  "Cancelled",
  "Rejected",
  "Disputed",
  "Refunded",
];

// =====================================================
// MAIN STATUS TABS
// Shown above the bookings table
// =====================================================

const bookingStatusTabs = [
  { value: "", label: "All Bookings" },
  { value: "Pending", label: "Pending" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "InProgress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Rejected", label: "Rejected" },
  { value: "Disputed", label: "Disputed" },
];

// =====================================================
// ADVANCED FILTER DIALOG
// =====================================================

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
        className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]"
        onSubmit={(event) => {
          event.preventDefault();
          apply(values);
        }}
      >
        <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
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
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
            className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
          >
            Apply filters
          </button>
        </footer>
      </form>
    </AdminDialog>
  );
}

// =====================================================
// MAIN BOOKINGS MANAGEMENT PAGE
// =====================================================

export default function BookingsManagementPage() {
  const [params, setParams] = useSearchParams();

  const [revision, setRevision] = useState(0);

  const [filters, setFilters] = useState(false);

  // ---------------------------------------------------
  // URL AND API DATA
  // ---------------------------------------------------

  const requestedPage = Number(
    params.get("page") || 1
  );

  const page =
    Number.isInteger(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const state = useAdminData(
    `/bookings?${params.toString()}`,
    revision
  );

  const stats = useAdminData(
    "/bookings/statistics",
    revision
  );

  const data = state.data;

  // Safe array handling
  const rows = Array.isArray(data?.rows)
    ? data.rows
    : [];

  // Active status from URL
  const activeStatus =
    params.get("status") || "";

  // ---------------------------------------------------
  // UPDATE URL FILTERS
  // ---------------------------------------------------

  const update = (values) => {
    const nextParams = new URLSearchParams();

    for (const [key, value] of Object.entries(values)) {
      if (
        value !== "" &&
        value !== null &&
        value !== undefined
      ) {
        nextParams.set(key, String(value));
      }
    }

    setParams(nextParams);
  };

  // ---------------------------------------------------
  // UPDATE STATUS
  // ---------------------------------------------------

  const changeStatus = (status) => {
    update({
      ...Object.fromEntries(params),
      status,
      page: 1,
    });
  };

  // ---------------------------------------------------
  // REFRESH BOOKINGS
  // ---------------------------------------------------

  const refreshBookings = () => {
    setRevision((previous) => previous + 1);
  };

  // ---------------------------------------------------
  // BOOKING ACTIONS
  // ---------------------------------------------------

  const actions = (row) => {
    const allowedActions = Array.isArray(row.actions)
      ? row.actions
      : [];

    return (
      <div className="ab-row-actions flex gap-[6px] flex-wrap min-w-[110px] [@media(width<=767px)]:mt-[14px]">
        <Link
          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
          to={`/admin/bookings/${row.id}`}
        >
          <Eye size={14} />
          View
        </Link>

        {allowedActions.includes("cancel") && (
          <Link
            className="ad-button asm-danger-text inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] [&.asm-danger-text]:text-[#b14b52]!"
            to={`/admin/bookings/${row.id}?action=cancel`}
          >
            Cancel
          </Link>
        )}

        {allowedActions.includes("refund") && (
          <Link
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            to={`/admin/bookings/${row.id}?action=refund&tab=Payment`}
          >
            Refund
          </Link>
        )}
      </div>
    );
  };

  // ===================================================
  // PAGE UI
  // ===================================================

  return (
    <div className="asm-page ab-page grid gap-[24px] text-[#253f3a] [&_select]:[padding:9px_12px] [&_select]:text-[12px] [&_select]:[border-top-width:1px] [&_select]:[border-top-style:solid] [&_select]:[border-top-color:#dce5df] [&_select]:[border-right-width:1px] [&_select]:[border-right-style:solid] [&_select]:[border-right-color:#dce5df] [&_select]:[border-bottom-width:1px] [&_select]:[border-bottom-style:solid] [&_select]:[border-bottom-color:#dce5df] [&_select]:[border-left-width:1px] [&_select]:[border-left-style:solid] [&_select]:[border-left-color:#dce5df] [&_select]:rounded-[7px] [&_select]:[background:#fff]">
      {/* ============================================= */}
      {/* PAGE HEADER */}
      {/* ============================================= */}

      <header className="asm-heading flex items-center [@media(width<=1200px)]:items-start justify-between gap-[24px] [@media(width<=767px)]:gap-[18px] [&_h1]:text-[30px] [@media(width<=767px)]:[&_h1]:text-[26px] [&_h1]:leading-[1.2] [&_h1]:[margin:8px_0_10px] [&_h1]:font-[650] [&_h1]:tracking-[-0.7px] [&_p]:text-[14px] [&_p]:text-[#7b8a83] [@media(width<=767px)]:flex-col">
        <div>
          <span className="ad-eyebrow text-[8px] [@media(width<=767px)]:text-[7px] tracking-[1.7px] text-[#7d9183] flex items-center gap-[6px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:[background:#bfa471] [&_>_span]:rounded-[50%]">
            BOOKING OPERATIONS
          </span>

          <h1>Bookings Management</h1>

          <p>
            Monitor customer bookings, vendor fulfilment,
            payments and refunds.
          </p>
        </div>

        <button
          type="button"
          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
          onClick={refreshBookings}
        >
          Refresh bookings
        </button>
      </header>

      {/* ============================================= */}
      {/* STATISTICS CARDS */}
      {/* ============================================= */}

      <div className="asm-stats ab-stats grid grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(767px<width<=1200px)]:grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[12px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e1e9e4] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e1e9e4] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e1e9e4] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e1e9e4] [&_article]:rounded-[12px] [&_article]:[background:#fff] [&_article]:p-[18px] [@media(width<=767px)]:[&_article]:p-[13px] [&_article]:min-w-0 [&_article_>_div]:flex [&_article_>_div]:justify-between [&_article_>_div]:items-center [&_article_>_div]:gap-[10px] [&_span]:text-[12px] [&_span]:text-[#71827a] [&_strong]:block [&_strong]:text-[25px] [@media(width<=767px)]:[&_strong]:text-[21px] [&_strong]:font-[650] [&_strong]:mt-[9px] [&_strong]:tracking-[-0.6px] [&_strong]:[overflow-wrap:anywhere] [&_svg]:text-[#73978b]">
        {cards.map(([key, cardLabel, Icon]) => (
          <article key={key}>
            <div>
              <span>{cardLabel}</span>

              <Icon size={17} />
            </div>

            <strong>
              {stats.data
                ? ["value", "commission", "payable"].includes(
                    key
                  )
                  ? money(stats.data[key] ?? 0)
                  : number(stats.data[key] ?? 0)
                : "…"}
            </strong>
          </article>
        ))}
      </div>

      {/* Statistics Error */}

      {stats.error && (
        <p role="alert">
          Statistics unavailable.{" "}

          <button
            type="button"
            onClick={refreshBookings}
          >
            Retry
          </button>
        </p>
      )}

      {/* ============================================= */}
      {/* NEW BOOKING STATUS TABS */}
      {/* ============================================= */}

      <nav
        className="my-6 flex w-full flex-wrap items-center gap-2 sm:gap-3"
        aria-label="Filter bookings by status"
      >
        {bookingStatusTabs.map((tab) => {
          const isActive =
            activeStatus === tab.value;

          return (
            <button
              key={tab.value || "all"}
              type="button"
              aria-pressed={isActive}
              onClick={() =>
                changeStatus(tab.value)
              }
              className={`
                inline-flex
                min-h-12
                items-center
                justify-center
                whitespace-nowrap
                rounded-xl
                px-5
                py-3
                text-sm
                font-medium
                transition-all
                duration-200
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-emerald-700
                focus-visible:ring-offset-2
                ${
                  isActive
                    ? "bg-[#e3eee9] text-[#075448] font-semibold"
                    : "bg-transparent text-[#727d7b] hover:bg-[#edf2ef] hover:text-[#075448]"
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ============================================= */}
      {/* BOOKINGS TABLE PANEL */}
      {/* ============================================= */}

      <section className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
        {/* =========================================== */}
        {/* SEARCH AND TOOLBAR */}
        {/* =========================================== */}

        <div className="asm-toolbar flex justify-between gap-[14px] items-center [@media(width<=767px)]:items-stretch flex-wrap mb-[22px]">
          {/* Search */}

          <form
            className="asm-search flex items-center gap-[10px] flex-1 min-w-[260px] [@media(width<=767px)]:min-w-0 [&_>_svg]:text-[#89978f] [&_input]:min-w-[100px] [&_input]:flex-1 [&_input]:[border-top-width:0] [&_input]:[border-top-style:none] [&_input]:[border-top-color:currentColor] [&_input]:[border-right-width:0] [&_input]:[border-right-style:none] [&_input]:[border-right-color:currentColor] [&_input]:[border-bottom-width:0] [&_input]:[border-bottom-style:none] [&_input]:[border-bottom-color:currentColor] [&_input]:[border-left-width:0] [&_input]:[border-left-style:none] [&_input]:[border-left-color:currentColor] [&_input]:[background:transparent] [&_input]:text-[13px] [@media(width<=767px)]:[&_input]:text-[12px] [&_input]:[padding:10px_0] [@media(width<=767px)]:[flex-basis:100%]"
            onSubmit={(event) => {
              event.preventDefault();

              update({
                ...Object.fromEntries(params),
                q: new FormData(
                  event.currentTarget
                ).get("q"),
                page: 1,
              });
            }}
          >
            <Search size={18} />

            <input
              key={params.get("q") || ""}
              name="q"
              maxLength={200}
              defaultValue={
                params.get("q") || ""
              }
              aria-label="Search bookings"
              placeholder="Search booking, customer, vendor, event or service"
            />

            <button
              type="submit"
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            >
              Search
            </button>
          </form>

          {/* Toolbar Actions */}

          <div className="flex flex-wrap gap-2">
            {/* Advanced Filters */}

            <button
              type="button"
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
              onClick={() =>
                setFilters(true)
              }
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>

            {/* Sort */}

            <select
              aria-label="Sort bookings"
              value={
                params.get("sort") ||
                "createdAt"
              }
              onChange={(event) =>
                update({
                  ...Object.fromEntries(params),
                  sort: event.target.value,
                  page: 1,
                })
              }
            >
              {[
                ["createdAt", "Created date"],
                ["number", "Booking number"],
                ["customer", "Customer"],
                ["vendor", "Vendor"],
                ["eventDate", "Event date"],
                ["bookingDate", "Scheduled date"],
                ["amount", "Amount"],
                ["status", "Status"],
              ].map(([key, name]) => (
                <option
                  key={key}
                  value={key}
                >
                  {name}
                </option>
              ))}
            </select>

            {/* Sort Direction */}

            <button
              type="button"
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
              onClick={() =>
                update({
                  ...Object.fromEntries(params),
                  direction:
                    params.get("direction") === "asc"
                      ? "desc"
                      : "asc",
                  page: 1,
                })
              }
            >
              {params.get("direction") === "asc"
                ? "Ascending ↑"
                : "Descending ↓"}
            </button>

            {/* Rows per Page */}

            <select
              aria-label="Bookings per page"
              value={
                params.get("pageSize") ||
                "20"
              }
              onChange={(event) =>
                update({
                  ...Object.fromEntries(params),
                  pageSize: event.target.value,
                  page: 1,
                })
              }
            >
              {[10, 20, 50, 100].map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value} / page
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* =========================================== */}
        {/* LOADING */}
        {/* =========================================== */}

        {state.loading && <Loading />}

        {/* =========================================== */}
        {/* ERROR */}
        {/* =========================================== */}

        {state.error && (
          <ErrorState
            error={state.error}
            retry={refreshBookings}
          />
        )}

        {/* =========================================== */}
        {/* EMPTY STATE */}
        {/* =========================================== */}

        {!state.loading &&
          !state.error &&
          data &&
          rows.length === 0 && (
            <Empty />
          )}

        {/* =========================================== */}
        {/* DESKTOP TABLE */}
        {/* =========================================== */}

        {!state.loading &&
          !state.error &&
          rows.length > 0 && (
            <>
              <div className="asm-table-wrap asm-desktop [overflow-x:auto] overflow-y-auto pb-[8px] [@media(width<=767px)]:hidden [@media(768px<=width<=1200px)]:[&_th:nth-child(1)]:hidden [@media(768px<=width<=1200px)]:[&_td:nth-child(1)]:hidden [@media(768px<=width<=1200px)]:[&_th:nth-child(5)]:hidden [@media(768px<=width<=1200px)]:[&_td:nth-child(5)]:hidden [@media(768px<=width<=1200px)]:[&_th:nth-child(13)]:hidden [@media(768px<=width<=1200px)]:[&_td:nth-child(13)]:hidden">
                <table className="asm-table ab-table w-full border-collapse text-left text-[12px] [&_th]:font-[600] [&_th]:text-[10px] [&_th]:tracking-[0.6px] [&_th]:uppercase [&_th]:whitespace-nowrap [&_th]:[padding:13px_14px] [&_th]:[background:#f6f9f6] [&_th]:text-[#7b8b80] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#e5ebe6] [&_td]:[border-bottom-width:1px] [&_td]:[border-bottom-style:solid] [&_td]:[border-bottom-color:#edf1ed] [&_td]:[padding:16px_14px] [&_td]:[vertical-align:middle] [&_tbody_tr:hover]:[background:#fbfcfa] [@media(width<=1200px)]:[&_.asm-id]:max-w-[75px] [@media(width<=1200px)]:[&_th:nth-child(5)]:[display:table-cell] [@media(width<=1200px)]:[&_td:nth-child(5)]:[display:table-cell] [@media(width<=1200px)]:[&_th:nth-child(13)]:[display:table-cell] [@media(width<=1200px)]:[&_td:nth-child(13)]:[display:table-cell]">
                  <thead>
                    <tr>
                      {[
                        "Booking Number",
                        "Customer",
                        "Vendor",
                        "Event",
                        "Services",
                        "Event Date",
                        "Booking Date",
                        "Amount",
                        "Payment Status",
                        "Booking Status",
                        "Created Date",
                        "Actions",
                      ].map((column) => (
                        <th key={column}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        {/* Booking Number */}

                        <td>
                          <Link
                            className="font-semibold"
                            to={`/admin/bookings/${row.id}`}
                          >
                            {row.number}
                          </Link>
                        </td>

                        {/* Customer */}

                        <td>
                          <Link
                            className="asm-identity flex gap-[11px] items-center min-w-[180px] [&_img]:w-[48px] [&_img]:h-[48px] [&_img]:object-cover [&_img]:shrink-0 [&_img]:rounded-[9px] [&_img]:[background:#edf3ed] [&_img]:grid [&_img]:place-items-center [&_img]:text-[#77988b] [&_strong]:block [&_strong]:font-[600] [&_strong]:text-[13px] [&_small]:block [&_small]:text-[11px] [&_small]:text-[#88938c] [&_small]:mt-[4px] [&_small]:max-w-[190px] [&_small]:[overflow-x:hidden] [&_small]:[overflow-y:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:whitespace-nowrap"
                            to={`/admin/customers/${row.customerId}`}
                          >
                            {row.customerImage && (
                              <img
                                src={row.customerImage}
                                alt=""
                              />
                            )}

                            <span>
                              <strong>
                                {row.customer}
                              </strong>

                              <small
                                className="asm-id text-[10px] [font-family:ui-monospace,_monospace] max-w-[110px] [overflow-x:hidden] [overflow-y:hidden] [text-overflow:ellipsis] whitespace-nowrap text-[#84938a]"
                                title={row.customerId}
                              >
                                {row.customerId}
                              </small>
                            </span>
                          </Link>
                        </td>

                        {/* Vendor */}

                        <td>
                          <Link
                            className="asm-identity flex gap-[11px] items-center min-w-[180px] [&_img]:w-[48px] [&_img]:h-[48px] [&_img]:object-cover [&_img]:shrink-0 [&_img]:rounded-[9px] [&_img]:[background:#edf3ed] [&_img]:grid [&_img]:place-items-center [&_img]:text-[#77988b] [&_strong]:block [&_strong]:font-[600] [&_strong]:text-[13px] [&_small]:block [&_small]:text-[11px] [&_small]:text-[#88938c] [&_small]:mt-[4px] [&_small]:max-w-[190px] [&_small]:[overflow-x:hidden] [&_small]:[overflow-y:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:whitespace-nowrap"
                            to={`/admin/vendors/${row.vendorId}`}
                          >
                            {row.vendorLogo && (
                              <img
                                src={row.vendorLogo}
                                alt=""
                              />
                            )}

                            <span>
                              <strong>
                                {row.vendor}
                              </strong>

                              <small
                                className="asm-id text-[10px] [font-family:ui-monospace,_monospace] max-w-[110px] [overflow-x:hidden] [overflow-y:hidden] [text-overflow:ellipsis] whitespace-nowrap text-[#84938a]"
                                title={row.vendorId}
                              >
                                {row.vendorId}
                              </small>
                            </span>
                          </Link>
                        </td>

                        {/* Event */}

                        <td>{row.event}</td>

                        {/* Services */}

                        <td>
                          <Link
                            className="ab-item-link text-[#347d68] whitespace-nowrap"
                            to={`/admin/bookings/${row.id}?tab=Items`}
                          >
                            {number(row.services ?? 0)} Services
                          </Link>
                        </td>

                        {/* Event Date */}

                        <td className="whitespace-nowrap">
                          {date(row.eventDate)}
                        </td>

                        {/* Booking Date */}

                        <td className="whitespace-nowrap">
                          {date(row.createdAt)}
                        </td>

                        {/* Amount */}

                        <td className="font-semibold whitespace-nowrap">
                          {money(row.amount ?? 0)}
                        </td>

                        {/* Payment Status */}

                        <td>
                          <BookingStatus
                            value={row.paymentStatus}
                          />
                        </td>

                        {/* Booking Status */}

                        <td>
                          <BookingStatus
                            value={row.status}
                          />
                        </td>

                        {/* Created Date */}

                        <td className="whitespace-nowrap">
                          {date(row.createdAt)}
                        </td>

                        {/* Actions */}

                        <td>
                          {actions(row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ===================================== */}
              {/* MOBILE BOOKING CARDS */}
              {/* ===================================== */}

              <div className="asm-mobile hidden [@media(width<=767px)]:grid [@media(width<=767px)]:gap-[12px] [@media(width<=767px)]:[&_article]:p-[16px] [@media(width<=767px)]:[&_article]:[border-top-width:1px] [@media(width<=767px)]:[&_article]:[border-top-style:solid] [@media(width<=767px)]:[&_article]:[border-top-color:#e4ece6] [@media(width<=767px)]:[&_article]:[border-right-width:1px] [@media(width<=767px)]:[&_article]:[border-right-style:solid] [@media(width<=767px)]:[&_article]:[border-right-color:#e4ece6] [@media(width<=767px)]:[&_article]:[border-bottom-width:1px] [@media(width<=767px)]:[&_article]:[border-bottom-style:solid] [@media(width<=767px)]:[&_article]:[border-bottom-color:#e4ece6] [@media(width<=767px)]:[&_article]:[border-left-width:1px] [@media(width<=767px)]:[&_article]:[border-left-style:solid] [@media(width<=767px)]:[&_article]:[border-left-color:#e4ece6] [@media(width<=767px)]:[&_article]:rounded-[10px] [@media(width<=767px)]:[&_article]:text-[12px] [@media(width<=767px)]:[&_article]:relative [@media(width<=767px)]:[&_article_>_p]:text-[#8b9a90] [@media(width<=767px)]:[&_article_>_p]:[margin:12px_0] [@media(width<=767px)]:[&_article_>_small]:block [@media(width<=767px)]:[&_article_>_small]:mt-[14px] [@media(width<=767px)]:[&_article_>_small]:text-[#8b9a90] [@media(width<=767px)]:[&_.asm-menu[open]_>_div]:top-[100%] [@media(width<=767px)]:[&_.asm-menu[open]_>_div]:bottom-[auto] [@media(width<=767px)]:[&_.asm-identity]:min-w-0 [@media(width<=767px)]:[&_.asm-identity_small]:max-w-[160px]">
                {rows.map((row) => (
                  <article key={row.id}>
                    <div className="flex justify-between gap-3">
                      <Link
                        className="font-semibold"
                        to={`/admin/bookings/${row.id}`}
                      >
                        {row.number}
                      </Link>

                      <strong>
                        {money(row.amount ?? 0)}
                      </strong>
                    </div>

                    <p>
                      {row.customer} ·{" "}
                      {row.vendor}
                    </p>

                    <p>
                      {row.event} ·{" "}
                      {date(row.eventDate)}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <BookingStatus
                        value={row.status}
                      />

                      <BookingStatus
                        value={row.paymentStatus}
                      />

                      <Link
                        to={`/admin/bookings/${row.id}?tab=Items`}
                      >
                        {number(row.services ?? 0)} Services
                      </Link>
                    </div>

                    <small>
                      Booked{" "}
                      {date(row.createdAt)}
                    </small>

                    {actions(row)}
                  </article>
                ))}
              </div>
            </>
          )}

        {/* =========================================== */}
        {/* PAGINATION */}
        {/* =========================================== */}

        {!state.loading &&
          !state.error &&
          data && (
            <Pager
              data={data}
              page={page}
              change={(nextPage) =>
                update({
                  ...Object.fromEntries(params),
                  page: nextPage,
                })
              }
            />
          )}
      </section>

      {/* ============================================= */}
      {/* ADVANCED FILTER DIALOG */}
      {/* ============================================= */}

      {filters && (
        <Filters
          params={params}
          close={() =>
            setFilters(false)
          }
          apply={(values) => {
            update({
              ...values,
              page: 1,
            });

            setFilters(false);
          }}
        />
      )}
    </div>
  );
}
