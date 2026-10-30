
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

import "../services-management.css";
import "../bookings-management.css";

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
        className="ad-form"
        onSubmit={(event) => {
          event.preventDefault();
          apply(values);
        }}
      >
        <div className="asm-form-grid">
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
            className="ad-button"
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
            className="ad-button ad-primary"
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
      <div className="ab-row-actions">
        <Link
          className="ad-button"
          to={`/admin/bookings/${row.id}`}
        >
          <Eye size={14} />
          View
        </Link>

        {allowedActions.includes("cancel") && (
          <Link
            className="ad-button asm-danger-text"
            to={`/admin/bookings/${row.id}?action=cancel`}
          >
            Cancel
          </Link>
        )}

        {allowedActions.includes("refund") && (
          <Link
            className="ad-button"
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
    <div className="asm-page ab-page">
      {/* ============================================= */}
      {/* PAGE HEADER */}
      {/* ============================================= */}

      <header className="asm-heading">
        <div>
          <span className="ad-eyebrow">
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
          className="ad-button"
          onClick={refreshBookings}
        >
          Refresh bookings
        </button>
      </header>

      {/* ============================================= */}
      {/* STATISTICS CARDS */}
      {/* ============================================= */}

      <div className="asm-stats ab-stats">
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

      <section className="asm-panel">
        {/* =========================================== */}
        {/* SEARCH AND TOOLBAR */}
        {/* =========================================== */}

        <div className="asm-toolbar">
          {/* Search */}

          <form
            className="asm-search"
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
              className="ad-button"
            >
              Search
            </button>
          </form>

          {/* Toolbar Actions */}

          <div className="flex flex-wrap gap-2">
            {/* Advanced Filters */}

            <button
              type="button"
              className="ad-button"
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
              className="ad-button"
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
              <div className="asm-table-wrap asm-desktop">
                <table className="asm-table ab-table">
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
                            className="asm-identity"
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
                                className="asm-id"
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
                            className="asm-identity"
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
                                className="asm-id"
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
                            className="ab-item-link"
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

              <div className="asm-mobile">
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
