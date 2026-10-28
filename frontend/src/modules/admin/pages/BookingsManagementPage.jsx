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
function Filters({ params, apply, close }) {
  const [values, setValues] = useState(Object.fromEntries(params)),
    [query, setQuery] = useState("");
  const search = useDebounced(query),
    options = useAdminData(
      `/bookings/options?q=${encodeURIComponent(search)}${values.vendor ? `&vendor=${values.vendor}` : ""}${values.customer ? `&customer=${values.customer}` : ""}`,
    );
  const change = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  const select = (key, label, choices) => (
    <Field key={key} label={label}>
      <select
        value={values[key] || ""}
        onChange={(e) => change(key, e.target.value)}
      >
        <option value="">All</option>
        {choices.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  );
  const input = (key, label, type = "text", extra = {}) => (
    <Field
      key={key}
      label={label}
      type={type}
      value={values[key] || ""}
      onChange={(e) => change(key, e.target.value)}
      {...extra}
    />
  );
  return (
    <AdminDialog title="Filter bookings" close={close}>
      <form
        className="ad-form"
        onSubmit={(e) => {
          e.preventDefault();
          apply(values);
        }}
      >
        <div className="asm-form-grid">
          {select(
            "status",
            "Booking status",
            states.map((s) => [s, s.replace(/([a-z])([A-Z])/g, "$1 $2")]),
          )}
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
            ].map((s) => [s, s.replace(/([a-z])([A-Z])/g, "$1 $2")]),
          )}
          <Field
            label="Find customer or vendor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or business"
          />
          {select(
            "customer",
            "Customer",
            (options.data?.customers || []).map((r) => [r.id, r.name]),
          )}
          {select(
            "vendor",
            "Vendor",
            (options.data?.vendors || []).map((r) => [r.id, r.name]),
          )}
          {select(
            "category",
            "Category",
            (options.data?.categories || []).map((r) => [r.id, r.name]),
          )}
          {input("location", "Event location")}
          {input("eventFrom", "Event date from", "date")}
          {input("eventTo", "Event date to", "date", {
            min: values.eventFrom || undefined,
          })}
          {input("bookedFrom", "Booking created from", "date")}
          {input("bookedTo", "Booking created to", "date", {
            min: values.bookedFrom || undefined,
          })}
          {input("minAmount", "Minimum amount", "number", {
            min: 0,
            step: ".01",
          })}
          {input("maxAmount", "Maximum amount", "number", {
            min: values.minAmount || 0,
            step: ".01",
          })}
        </div>
        {options.error && <p role="alert">{options.error.message}</p>}
        <footer className="flex justify-between gap-2">
          <button
            type="button"
            className="ad-button"
            onClick={() => apply({ q: values.q || "" })}
          >
            Clear filters
          </button>
          <button className="ad-button ad-primary">Apply filters</button>
        </footer>
      </form>
    </AdminDialog>
  );
}
export default function BookingsManagementPage() {
  const [params, setParams] = useSearchParams(),
    [revision, setRevision] = useState(0),
    [filters, setFilters] = useState(false);
  const page = Number(params.get("page") || 1),
    state = useAdminData(`/bookings?${params}`, revision),
    stats = useAdminData("/bookings/statistics", revision);
  const update = (values) => {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries(values))
      if (value !== "" && value != null) p.set(key, value);
    setParams(p);
  };
  const data = state.data;
  const actions = (row) => (
    <div className="ab-row-actions">
      <Link className="ad-button" to={`/admin/bookings/${row.id}`}>
        <Eye size={14} />
        View
      </Link>
      {row.actions.includes("cancel") && (
        <Link
          className="ad-button asm-danger-text"
          to={`/admin/bookings/${row.id}?action=cancel`}
        >
          Cancel
        </Link>
      )}
      {row.actions.includes("refund") && (
        <Link
          className="ad-button"
          to={`/admin/bookings/${row.id}?action=refund&tab=Payment`}
        >
          Refund
        </Link>
      )}
    </div>
  );
  return (
    <div className="asm-page ab-page">
      <header className="asm-heading">
        <div>
          <span className="ad-eyebrow">BOOKING OPERATIONS</span>
          <h1>Bookings Management</h1>
          <p>
            Monitor customer bookings, vendor fulfilment, payments and refunds.
          </p>
        </div>
        <button className="ad-button" onClick={() => setRevision((v) => v + 1)}>
          Refresh bookings
        </button>
      </header>
      <div className="asm-stats ab-stats">
        {cards.map(([key, label, Icon]) => (
          <article key={key}>
            <div>
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong>
              {stats.data
                ? ["value", "commission", "payable"].includes(key)
                  ? money(stats.data[key])
                  : number(stats.data[key])
                : "…"}
            </strong>
          </article>
        ))}
      </div>
      {stats.error && (
        <p role="alert">
          Statistics unavailable.{" "}
          <button onClick={() => setRevision((v) => v + 1)}>Retry</button>
        </p>
      )}
      <nav className="asm-status-tabs" aria-label="Booking status">
        {["", ...states].map((status) => (
          <button
            key={status}
            aria-current={
              (params.get("status") || "") === status ? "page" : undefined
            }
            onClick={() =>
              update({ ...Object.fromEntries(params), status, page: 1 })
            }
          >
            {status
              ? status.replace(/([a-z])([A-Z])/g, "$1 $2")
              : "All Bookings"}
          </button>
        ))}
      </nav>
      <section className="asm-panel">
        <div className="asm-toolbar">
          <form
            className="asm-search"
            onSubmit={(e) => {
              e.preventDefault();
              update({
                ...Object.fromEntries(params),
                q: new FormData(e.currentTarget).get("q"),
                page: 1,
              });
            }}
          >
            <Search size={18} />
            <input
              key={params.get("q")}
              name="q"
              maxLength={200}
              defaultValue={params.get("q") || ""}
              aria-label="Search bookings"
              placeholder="Search booking, customer, vendor, event or service"
            />
            <button className="ad-button">Search</button>
          </form>
          <div className="flex flex-wrap gap-2">
            <button className="ad-button" onClick={() => setFilters(true)}>
              <SlidersHorizontal size={16} />
              Filters
            </button>
            <select
              aria-label="Sort bookings"
              value={params.get("sort") || "createdAt"}
              onChange={(e) =>
                update({
                  ...Object.fromEntries(params),
                  sort: e.target.value,
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
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
            <button
              className="ad-button"
              onClick={() =>
                update({
                  ...Object.fromEntries(params),
                  direction: params.get("direction") === "asc" ? "desc" : "asc",
                  page: 1,
                })
              }
            >
              {params.get("direction") === "asc"
                ? "Ascending ↑"
                : "Descending ↓"}
            </button>
            <select
              aria-label="Bookings per page"
              value={params.get("pageSize") || "20"}
              onChange={(e) =>
                update({
                  ...Object.fromEntries(params),
                  pageSize: e.target.value,
                  page: 1,
                })
              }
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </div>
        {state.loading && <Loading />}
        {state.error && (
          <ErrorState
            error={state.error}
            retry={() => setRevision((v) => v + 1)}
          />
        )}
        {data && !data.rows.length && <Empty />}
        {data?.rows.length > 0 && (
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
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          className="font-semibold"
                          to={`/admin/bookings/${row.id}`}
                        >
                          {row.number}
                        </Link>
                      </td>
                      <td>
                        <Link
                          className="asm-identity"
                          to={`/admin/customers/${row.customerId}`}
                        >
                          {row.customerImage && (
                            <img src={row.customerImage} alt="" />
                          )}
                          <span>
                            <strong>{row.customer}</strong>
                            <small className="asm-id" title={row.customerId}>
                              {row.customerId}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link
                          className="asm-identity"
                          to={`/admin/vendors/${row.vendorId}`}
                        >
                          {row.vendorLogo && (
                            <img src={row.vendorLogo} alt="" />
                          )}
                          <span>
                            <strong>{row.vendor}</strong>
                            <small className="asm-id" title={row.vendorId}>
                              {row.vendorId}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>{row.event}</td>
                      <td>
                        <Link
                          className="ab-item-link"
                          to={`/admin/bookings/${row.id}?tab=Items`}
                        >
                          {number(row.services)} Services
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">
                        {date(row.eventDate)}
                      </td>
                      <td className="whitespace-nowrap">
                        {date(row.createdAt)}
                      </td>
                      <td className="font-semibold whitespace-nowrap">
                        {money(row.amount)}
                      </td>
                      <td>
                        <BookingStatus value={row.paymentStatus} />
                      </td>
                      <td>
                        <BookingStatus value={row.status} />
                      </td>
                      <td className="whitespace-nowrap">
                        {date(row.createdAt)}
                      </td>
                      <td>{actions(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="asm-mobile">
              {data.rows.map((row) => (
                <article key={row.id}>
                  <div className="flex justify-between gap-3">
                    <Link
                      className="font-semibold"
                      to={`/admin/bookings/${row.id}`}
                    >
                      {row.number}
                    </Link>
                    <strong>{money(row.amount)}</strong>
                  </div>
                  <p>
                    {row.customer} · {row.vendor}
                  </p>
                  <p>
                    {row.event} · {date(row.eventDate)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <BookingStatus value={row.status} />
                    <BookingStatus value={row.paymentStatus} />
                    <Link to={`/admin/bookings/${row.id}?tab=Items`}>
                      {row.services} Services
                    </Link>
                  </div>
                  <small>Booked {date(row.createdAt)}</small>
                  {actions(row)}
                </article>
              ))}
            </div>
          </>
        )}
        {data && (
          <Pager
            data={data}
            page={page}
            change={(page) => update({ ...Object.fromEntries(params), page })}
          />
        )}
      </section>
      {filters && (
        <Filters
          params={params}
          close={() => setFilters(false)}
          apply={(values) => {
            update({ ...values, page: 1 });
            setFilters(false);
          }}
        />
      )}
    </div>
  );
}
