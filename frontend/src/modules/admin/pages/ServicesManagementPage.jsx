import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Download,
  SlidersHorizontal,
  Search,
  BriefcaseBusiness,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldOff,
  FileText,
  CalendarCheck,
  IndianRupee,
} from "lucide-react";
import {
  adminRequest,
  useAdminData,
  useDebounced,
  money,
  date,
  number,
  saveBlob,
  versionOf,
} from "../services-management.api";
import {
  Loading,
  ErrorState,
  Empty,
  Pager,
  ServiceActions,
  Status,
  Field,
} from "../components/ServicesUI";
import ServiceDecisionDialog from "../components/ServiceDecisionDialog";
import AdminDialog from "../components/AdminDialog";
import { useAuth } from "../../../context/AuthContext";
import "../services-management.css";

const statCards = [
  ["total", "Total Services", BriefcaseBusiness],
  ["active", "Active Services", Activity],
  ["pending", "Pending Approval", Clock],
  ["approved", "Approved", CheckCircle2],
  ["rejected", "Rejected", XCircle],
  ["suspended", "Suspended", ShieldOff],
  ["draft", "Draft", FileText],
  ["bookings", "Total Bookings", CalendarCheck],
  ["revenue", "Total Service Revenue", IndianRupee],
];
function Filters({ params, apply, close }) {
  const [values, setValues] = useState(Object.fromEntries(params)),
    [vendorQuery, setVendorQuery] = useState("");
  const search = useDebounced(vendorQuery),
    metadata = useAdminData(
      `/services/metadata?q=${encodeURIComponent(search)}${values.vendor ? `&vendorId=${values.vendor}` : ""}`,
    );
  const change = (name, value) =>
    setValues((v) => ({
      ...v,
      [name]: value,
      ...(name === "category" ? { subcategory: "" } : {}),
    }));
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
  const select = (key, label, options) => (
    <Field key={key} label={label}>
      <select
        value={values[key] || ""}
        onChange={(e) => change(key, e.target.value)}
      >
        <option value="">All</option>
        {options.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <AdminDialog title="Filter services" close={close}>
      <form
        className="ad-form"
        onSubmit={(e) => {
          e.preventDefault();
          apply(values);
        }}
      >
        <div className="asm-form-grid">
          {select(
            "category",
            "Category",
            (metadata.data?.categories || []).map((x) => [x.id, x.name]),
          )}
          {select(
            "subcategory",
            "Subcategory",
            (metadata.data?.subcategories || [])
              .filter(
                (x) =>
                  !values.category || x.categoryId === Number(values.category),
              )
              .map((x) => [x.id, x.name]),
          )}
          <Field
            label="Find vendor"
            value={vendorQuery}
            onChange={(e) => setVendorQuery(e.target.value)}
            placeholder="Search business name"
          />
          {select(
            "vendor",
            "Vendor",
            (metadata.data?.vendors || []).map((x) => [x.id, x.name]),
          )}
          {select(
            "status",
            "Approval status",
            [
              "Draft",
              "Pending",
              "UnderReview",
              "Approved",
              "Rejected",
              "Suspended",
              "Inactive",
              "Active",
            ].map((x) => [x, x === "UnderReview" ? "Admin Review" : x]),
          )}
          {select("active", "Active status", [
            ["true", "Active"],
            ["false", "Inactive"],
          ])}
          {input("minPrice", "Minimum price", "number", {
            min: 0,
            step: ".01",
          })}
          {input("maxPrice", "Maximum price", "number", {
            min: values.minPrice || 0,
            step: ".01",
          })}
          {input("rating", "Minimum rating", "number", {
            min: 0,
            max: 5,
            step: ".1",
          })}
          {input("location", "Location")}
          {input("createdFrom", "Created from", "date")}
          {input("createdTo", "Created to", "date", {
            min: values.createdFrom || undefined,
          })}
          {input("updatedFrom", "Updated from", "date")}
          {input("updatedTo", "Updated to", "date", {
            min: values.updatedFrom || undefined,
          })}
        </div>
        {metadata.error && <p role="alert">{metadata.error.message}</p>}
        <footer className="flex justify-between gap-2">
          <button
            className="ad-button"
            type="button"
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
export default function ServicesManagementPage({ kind }) {
  const [params, setParams] = useSearchParams(),
    navigate = useNavigate(),
    { notify } = useAuth();
  const [revision, setRevision] = useState(0),
    [filters, setFilters] = useState(false),
    [dialog, setDialog] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [exporting, setExporting] = useState(false);
  const page = Number(params.get("page") || 1),
    query = params.toString();
  const state = useAdminData(
      `/${kind ? `service-${kind}` : "services"}?${query}`,
      revision,
    ),
    stats = useAdminData(kind ? null : "/services/statistics", revision);
  const update = (values) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(values))
      if (v !== "" && v != null) next.set(k, v);
    setParams(next);
  };
  const refresh = (message) => {
    setDialog(null);
    setRevision((v) => v + 1);
    if (message) notify(message);
    window.dispatchEvent(new Event("marrynest:service-decision"));
  };
  const action = (row, action) => {
    setError("");
    setDialog({ service: row, action });
  };
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest(
        `/services/${dialog.service.id}${dialog.action === "duplicate" ? "/duplicate" : ""}`,
        {
          method: dialog.action === "delete" ? "DELETE" : "POST",
          body: JSON.stringify(versionOf(dialog.service)),
        },
      );
      refresh(result.message);
      if (result.id) navigate(`/admin/services/${result.id}/edit`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function exportRows() {
    setExporting(true);
    setError("");
    try {
      const blob = await adminRequest(`/services/export?${query}`, {
        download: true,
      });
      saveBlob(blob, "services.csv");
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }
  const data = state.data,
    title =
      kind === "items"
        ? "Service Items"
        : kind === "packages"
          ? "Service Packages"
          : "Services Management";
  return (
    <div className="asm-page">
      <header className="asm-heading">
        <div>
          <span className="ad-eyebrow">CATALOG OPERATIONS</span>
          <h1>{title}</h1>
          <p>
            {kind
              ? `Inspect and manage ${kind} across every vendor service.`
              : "Manage, review and monitor all services listed by vendors."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!kind && (
            <>
              <button
                className="ad-button"
                disabled={exporting}
                onClick={exportRows}
              >
                <Download size={16} />
                {exporting ? "Exporting…" : "Export"}
              </button>
              <Link className="ad-button ad-primary" to="/admin/services/new">
                <Plus size={17} />
                Add Service
              </Link>
            </>
          )}
          {kind && (
            <Link className="ad-button ad-primary" to="/admin/services">
              Choose a service to manage
            </Link>
          )}
        </div>
      </header>
      {!kind && (
        <>
          <div className="asm-stats">
            {statCards.map(([key, label, Icon]) => (
              <article key={key}>
                <div>
                  <span>{label}</span>
                  <Icon size={17} />
                </div>
                <strong>
                  {stats.data
                    ? key === "revenue"
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
          <nav className="asm-status-tabs" aria-label="Service status">
            {[
              ["", "All Services"],
              ["Pending", "Pending Approval"],
              ["Approved", "Approved"],
              ["Rejected", "Rejected"],
              ["Suspended", "Suspended"],
              ["Draft", "Draft"],
              ["Active", "Active"],
              ["Inactive", "Inactive"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-current={
                  (params.get("status") || "") === value ? "page" : undefined
                }
                onClick={() =>
                  update({
                    ...Object.fromEntries(params),
                    status: value,
                    page: 1,
                  })
                }
              >
                {label}
              </button>
            ))}
          </nav>
        </>
      )}
      <section className="asm-panel">
        <div className="asm-toolbar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({
                ...Object.fromEntries(params),
                q: new FormData(e.currentTarget).get("q"),
                page: 1,
              });
            }}
            className="asm-search"
          >
            <Search size={18} />
            <input
              key={params.get("q")}
              name="q"
              defaultValue={params.get("q") || ""}
              maxLength={200}
              aria-label="Search services"
              placeholder={
                kind
                  ? `Search ${kind}, service or vendor`
                  : "Search service, ID, vendor, category or location"
              }
            />
            <button className="ad-button">Search</button>
          </form>
          <div className="flex flex-wrap gap-2">
            {!kind && (
              <>
                <button className="ad-button" onClick={() => setFilters(true)}>
                  <SlidersHorizontal size={16} />
                  Filters
                </button>
                <select
                  aria-label="Sort services"
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
                    "createdAt",
                    "updatedAt",
                    "name",
                    "vendor",
                    "category",
                    "price",
                    "bookings",
                    "rating",
                  ].map((x) => (
                    <option key={x} value={x}>
                      {{ createdAt: "Created date", updatedAt: "Updated date" }[
                        x
                      ] || x[0].toUpperCase() + x.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  className="ad-button"
                  aria-label="Toggle sort direction"
                  onClick={() =>
                    update({
                      ...Object.fromEntries(params),
                      direction:
                        params.get("direction") === "asc" ? "desc" : "asc",
                      page: 1,
                    })
                  }
                >
                  {params.get("direction") === "asc"
                    ? "Ascending ↑"
                    : "Descending ↓"}
                </button>
              </>
            )}
            <select
              aria-label="Rows per page"
              value={params.get("pageSize") || "20"}
              onChange={(e) =>
                update({
                  ...Object.fromEntries(params),
                  pageSize: e.target.value,
                  page: 1,
                })
              }
            >
              {[10, 20, 50, 100].map((x) => (
                <option key={x} value={x}>
                  {x} / page
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p role="alert" className="asm-alert">
            {error}
          </p>
        )}
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
            {kind ? (
              <div className="asm-table-wrap">
                <table className="asm-table">
                  <thead>
                    <tr>
                      {[
                        "Name",
                        "Service",
                        "Vendor",
                        "Price",
                        "Status",
                        "Actions",
                      ].map((x) => (
                        <th key={x}>{x}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.service}</td>
                        <td>{row.vendor}</td>
                        <td>{money(row.price)}</td>
                        <td>{row.active ? "Active" : "Inactive"}</td>
                        <td>
                          <Link
                            className="ad-button"
                            to={`/admin/services/${row.serviceId}?tab=${kind === "items" ? "Items" : "Packages"}`}
                          >
                            View & manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <div className="asm-table-wrap asm-desktop">
                  <table className="asm-table">
                    <thead>
                      <tr>
                        {[
                          "Service ID",
                          "Service",
                          "Vendor",
                          "Category",
                          "Subcategory",
                          "Price",
                          "Location",
                          "Approval Status",
                          "Active Status",
                          "Bookings",
                          "Rating",
                          "Created Date",
                          "Updated Date",
                          "Actions",
                        ].map((x) => (
                          <th key={x}>{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row) => (
                        <tr key={row.id}>
                          <td className="asm-id" title={row.id}>
                            {row.id}
                          </td>
                          <td>
                            <Link
                              className="asm-identity"
                              to={`/admin/services/${row.id}`}
                            >
                              {row.image ? (
                                <img src={row.image} alt="" />
                              ) : (
                                <span className="asm-image-placeholder">
                                  <BriefcaseBusiness size={22} />
                                </span>
                              )}
                              <span>
                                <strong>{row.name}</strong>
                                <small>
                                  {row.shortDescription ||
                                    "No short description"}
                                </small>
                              </span>
                            </Link>
                          </td>
                          <td>
                            <div className="asm-identity">
                              {row.vendorLogo && (
                                <img src={row.vendorLogo} alt="" />
                              )}
                              <span>
                                <Link to={`/admin/vendors/${row.vendorId}`}>
                                  {row.vendor}
                                </Link>
                                <small className="asm-id" title={row.vendorId}>
                                  {row.vendorId}
                                </small>
                              </span>
                            </div>
                          </td>
                          <td>{row.category}</td>
                          <td>{row.subcategory || "—"}</td>
                          <td className="font-semibold whitespace-nowrap">
                            {money(row.price)}
                          </td>
                          <td>{row.location || "—"}</td>
                          <td>
                            <Status status={row.status} />
                          </td>
                          <td>
                            <span
                              className={`asm-active ${row.active ? "on" : ""}`}
                            >
                              {row.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>{number(row.bookings)}</td>
                          <td>
                            {row.rating
                              ? `★ ${Number(row.rating).toFixed(1)}`
                              : "No ratings"}
                          </td>
                          <td className="whitespace-nowrap">
                            {date(row.createdAt)}
                          </td>
                          <td className="whitespace-nowrap">
                            {date(row.updatedAt)}
                          </td>
                          <td>
                            <ServiceActions row={row} action={action} />
                          </td>
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
                          className="asm-identity"
                          to={`/admin/services/${row.id}`}
                        >
                          {row.image && <img src={row.image} alt="" />}
                          <span>
                            <strong>{row.name}</strong>
                            <small>{row.vendor}</small>
                          </span>
                        </Link>
                        <ServiceActions row={row} action={action} />
                      </div>
                      <p>{row.shortDescription}</p>
                      <Status status={row.status} active={!!row.active} />
                      <div className="flex justify-between mt-3">
                        <span>
                          {row.category} · {row.location}
                        </span>
                        <strong>{money(row.price)}</strong>
                      </div>
                      <small>
                        {number(row.bookings)} bookings ·{" "}
                        {row.rating
                          ? `★ ${Number(row.rating).toFixed(1)}`
                          : "No ratings"}{" "}
                        · Updated {date(row.updatedAt)}
                      </small>
                    </article>
                  ))}
                </div>
              </>
            )}
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
      {dialog && !["duplicate", "delete"].includes(dialog.action) && (
        <ServiceDecisionDialog
          {...dialog}
          close={() => setDialog(null)}
          saved={refresh}
        />
      )}
      {dialog && ["duplicate", "delete"].includes(dialog.action) && (
        <AdminDialog
          title={`${dialog.action === "delete" ? "Delete" : "Duplicate"} service`}
          close={() => setDialog(null)}
          busy={busy}
        >
          <div className="ad-form">
            <p>
              {dialog.action === "delete"
                ? `Permanently delete “${dialog.service.name}”? Services with booking, quotation or offer history cannot be deleted.`
                : `Create an inactive draft copy of “${dialog.service.name}”, including its items, packages and images?`}
            </p>
            {error && <p role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                className="ad-button"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                className="ad-button ad-primary"
                disabled={busy}
                onClick={confirm}
              >
                {busy ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
