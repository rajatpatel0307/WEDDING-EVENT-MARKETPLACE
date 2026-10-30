
import VendorDecisionDialog from "./VendorDecisionDialog";
import { canDecide, vendorChangedEvent } from "../vendor-workflow";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, SlidersHorizontal, Download, ChevronLeft, ChevronRight,
  ArrowUpDown, Inbox, Eye, Check, X, Plus, Pencil,
  FileDown, LoaderCircle,
} from "lucide-react";
import { adminRequest, saveBlob, date, money, number } from "../api";
import { columnLabels } from "../navigation";
import { useAuth } from "../../../context/AuthContext";
import AdminDialog from "./AdminDialog";
import RecordPicker from "./RecordPicker";

const asArray = (value) => (Array.isArray(value) ? value : []);
const label = (key) =>
  columnLabels[key] || String(key).replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

// These values match the status query strings used in admin navigation.
const bookingStatusTabs = [
  ["", "All Bookings"],
  ["Pending", "Pending"],
  ["Confirmed", "Confirmed"],
  ["InProgress", "In Progress"],
  ["Completed", "Completed"],
  ["Cancelled", "Cancelled"],
  ["Rejected", "Rejected"],
  ["Disputed", "Disputed"],
];

function normalizeTableData(response, resource) {
  const payload = Array.isArray(response?.rows)
    ? response
    : Array.isArray(response?.data?.rows)
      ? response.data
      : null;
  if (!payload) {
    throw new Error(
      `Invalid API response for "${resource}": expected rows or data.rows to be an array.`
    );
  }
  const source = payload === response ? payload : { ...response, ...payload };
  const rows = payload.rows;
  const firstRow = rows.find((row) => row && typeof row === "object" && !Array.isArray(row));
  const total = Number(source.total);
  return {
    ...source,
    rows,
    columns: asArray(source.columns).length
      ? source.columns
      : firstRow ? Object.keys(firstRow) : [],
    statuses: asArray(source.statuses),
    editable: asArray(source.editable),
    actions: asArray(source.actions),
    gatewayOptions: asArray(source.gatewayOptions),
    total: source.total != null && Number.isFinite(total) && total >= 0
      ? total : rows.length,
  };
}

function defaultColumns(columns, resource, compact) {
  return asArray(columns)
    .filter((key) => resource !== "vendors" ||
      !["id", "categories", "documents", "totalEarnings"].includes(key))
    .filter((key) => compact
      ? ["name", "owner", "categories", "city", "createdAt", "status", "documents"].includes(key)
      : (key === "emailVerified" && resource === "customers") ||
        !["description", "remarks", "emailVerified", "categoryId", "updatedAt"].includes(key))
    .slice(0, compact ? 7 : ["customers", "vendors"].includes(resource) ? 16 : 8);
}

export function Badge({ children }) {
  return (
    <span className={`ad-badge ad-badge-${String(children || "").toLowerCase().replace(/\s/g, "")}`}>
      {children === "UnderReview" ? "Under Review" : children || "—"}
    </span>
  );
}

export function ErrorState({ error, retry }) {
  return (
    <div className="ad-error" role="alert">
      <strong>{error?.message || "Something went wrong."}</strong>
      <div>
        {error?.status === 401
          ? <Link to="/auth/login">Sign in</Link>
          : <button type="button" className="ad-button" onClick={retry}>Try again</button>}
      </div>
    </div>
  );
}

export function Skeleton({ rows = 5 }) {
  return (
    <div className="ad-skeleton" role="status" aria-label="Loading data">
      {Array.from({ length: rows }, (_, index) => <div key={index} className="animate-pulse" />)}
    </div>
  );
}

export function Empty({
  text = "No records found",
  description = "Try another search or adjust your filters.",
}) {
  return (
    <div className="ad-empty">
      <Inbox size={29} />
      <strong>{text}</strong>
      <p>{description}</p>
    </div>
  );
}

function display(key, value, row = {}) {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "status") return <Badge>{value}</Badge>;
  if (/At$|Date$|^validUntil$/.test(key)) return date(value);
  if (["amount", "paid", "gross", "commission", "bookingAmount", "totalSpending",
       "totalEarnings", "refundAdjustment", "taxDeduction", "fees"].includes(key)) {
    return row?.currency && row.currency !== "INR"
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: row.currency,
          maximumFractionDigits: 2 }).format(Number(value))
      : money(value);
  }
  if (key === "id") return <span title={String(value)}>{String(value).slice(0, 8)}…</span>;
  if (key === "emailVerified") return value ? "Verified" : "Unverified";
  if (typeof value === "number") return number(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function VendorCategories({ value, vendorId }) {
  const categories = String(value || "").split(",").map((category) => category.trim()).filter(Boolean);
  if (!categories.length) return "—";
  return (
    <div className="ad-vendor-category-preview">
      {categories.slice(0, 2).map((category, i) =>
        <span key={`${i}-${category}`} title={category}>{category}</span>)}
      {categories.length > 2 && (
        <Link to={`/admin/vendors/${vendorId}?tab=categories`}
          aria-label={`View all ${categories.length} categories`} title="View all categories">
          &hellip;
        </Link>
      )}
    </div>
  );
}

export default function AdminTable({
  resource, compact = false, onChange, version = 0,
  initialStatus = "", initialQuery = "",
}) {
  const { notify } = useAuth();
  const navigate = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();
  const isBookings = resource === "bookings" && !compact;
  const bookingStatusFromUrl = isBookings ? urlParams.get("status") || "" : "";

  const [q, setQ] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [sort, setSort] = useState("createdAt");
  const [direction, setDirection] = useState("desc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [gateway, setGateway] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const [visible, setVisible] = useState(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [exporting, setExporting] = useState(false);

  // For bookings the URL is the single source of truth (also works with sidebar links).
  const activeStatus = isBookings ? bookingStatusFromUrl : status;

  function changeBookingStatus(nextStatus) {
    setPage(1);
    setUrlParams((previous) => {
      const next = new URLSearchParams(previous);
      if (nextStatus) next.set("status", nextStatus);
      else next.delete("status");
      next.delete("page");
      return next;
    });
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setStatus(initialStatus);
    setQ(initialQuery);
    setSearch(initialQuery);
    setPage(1);
  }, [initialStatus, initialQuery]);

  // The sidebar may change ?status= without remounting this component.
  useEffect(() => {
    if (isBookings) setPage(1);
  }, [isBookings, bookingStatusFromUrl]);

  const params = new URLSearchParams({
    q: search, status: activeStatus, page: String(page),
    pageSize: String(compact ? 5 : size), sort, direction,
    ...(category ? { category } : {}),
    ...(locationFilter ? { location: locationFilter } : {}),
    ...(gateway ? { gateway } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    adminRequest(`/${resource}?${params}`, { signal: abort.signal })
      .then((response) => {
        if (abort.signal.aborted) return;
        const result = normalizeTableData(response, resource);
        setData(result);
        const totalPages = Math.max(1, Math.ceil(result.total / (compact ? 5 : size)));
        setPage((current) => Math.min(current, totalPages));
        const defaults = defaultColumns(result.columns, resource, compact);
        setVisible((previous) => {
          const valid = asArray(previous).filter((key) => result.columns.includes(key));
          return valid.length ? valid : defaults;
        });
      })
      .catch((err) => {
        if (!abort.signal.aborted && err?.name !== "AbortError") setError(err);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [resource, params, revision, version, compact, size]);

  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    window.addEventListener(vendorChangedEvent, changed);
    return () => window.removeEventListener(vendorChangedEvent, changed);
  }, []);

  function refresh() {
    setRevision((value) => value + 1);
    onChange?.();
  }

  function open(row, action) {
    if (["vendors", "applications"].includes(resource) &&
        ["Approved", "Rejected", "Suspended"].includes(action)) {
      setDecision({ id: row.id, action });
      return;
    }
    if (["vendors", "applications"].includes(resource) && action === "view") {
      navigate(`/admin/vendors/${row.id}`);
      return;
    }
    if (resource === "customers" && action === "view") {
      navigate(`/admin/customers/${row.id}`);
      return;
    }
    setFormError("");
    if (resource === "services") {
      navigate(`/admin/services/${row.id}/review`);
      return;
    }
    if (resource === "bookings") {
      navigate(`/admin/bookings/${row.id}`);
      return;
    }
    if (["quotations", "payments", "refunds", "payouts", "commission"].includes(resource) &&
        action === "view") {
      navigate(`/admin/finance/${resource}/${row.id}`);
      return;
    }
    setDialog({ row, action });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      let result;
      if (["create", "edit"].includes(dialog.action)) {
        const values = { ...fields };
        for (const key of ["discountValue", "categoryId", "usageLimit", "sortOrder"]) {
          if (key in values) values[key] = values[key] === "" ? null : Number(values[key]);
        }
        if (dialog.row?.updatedAt) values.expectedUpdatedAt = dialog.row.updatedAt;
        result = await adminRequest(`/${resource}${dialog.row ? `/${dialog.row.id}` : ""}`, {
          method: dialog.row ? "PATCH" : "POST", body: JSON.stringify(values),
        });
      } else if (["vendors", "applications"].includes(resource)) {
        result = await adminRequest(`/vendors/${dialog.row.id}/review`, {
          method: "POST",
          body: JSON.stringify({ status: dialog.action, expectedStatus: dialog.row.status,
            reason: fields.reason || "", note: fields.note || "" }),
        });
      } else {
        result = await adminRequest(`/${resource}/${dialog.row.id}/action`, {
          method: "PATCH",
          body: JSON.stringify({ action: dialog.action, expectedStatus: dialog.row.status,
            note: fields.note }),
        });
      }
      notify(result?.message || "Record saved.");
      setDialog(null);
      refresh();
    } catch (err) {
      setFormError(err?.message || "Failed to save the record.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadDoc(id) {
    setBusy(true);
    setFormError("");
    try {
      const blob = await adminRequest(`/documents/${id}/download`, { download: true });
      saveBlob(blob, "vendor-document");
    } catch (err) {
      setFormError(err?.message || "Document download failed.");
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      const blob = await adminRequest(`/${resource}/export?${params}`, { download: true });
      saveBlob(blob, `${resource}.csv`);
      notify("Export downloaded.");
    } catch (err) {
      notify(err?.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const listColumns = asArray(data?.columns).filter((key) =>
    resource !== "vendors" || !["id", "categories", "documents", "totalEarnings"].includes(key));
  const cols = asArray(visible).filter((key) => listColumns.includes(key));
  const rows = asArray(data?.rows);
  const statuses = asArray(data?.statuses);
  const editable = asArray(data?.editable);
  const actions = asArray(data?.actions);
  const gatewayOptions = asArray(data?.gatewayOptions);
  const pageSize = compact ? 5 : size;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="ad-panel ad-data-panel" aria-label={`${resource} records`}>
      {compact && (
        <div className="ad-panel-heading">
          <div>
            <h2>Pending vendor approvals <span className="ad-count">{data?.total ?? "—"}</span></h2>
            <p>A thoughtful review. A trusted marketplace.</p>
          </div>
          <Link className="ad-text-link" to="/admin/applications">
            View all <ChevronRight size={15} />
          </Link>
        </div>
      )}

      {/* Status filters only on the All Bookings table (not other admin resources). */}
      {isBookings && (
        <nav className="flex flex-wrap items-center gap-2 sm:gap-3 px-5 py-4 border-b border-stone-100"
          aria-label="Booking status filters">
          {bookingStatusTabs.map(([value, text]) => {
            const selected = activeStatus === value;
            return (
              <button key={value || "all"} type="button" aria-pressed={selected}
                onClick={() => changeBookingStatus(value)}
                className={`inline-flex min-h-[46px] items-center justify-center whitespace-nowrap
                  rounded-xl px-5 py-3 text-sm font-medium transition-colors duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700
                  focus-visible:ring-offset-2 ${selected
                    ? "bg-[#e3eee9] text-[#075448] font-semibold"
                    : "bg-transparent text-[#727d7b] hover:bg-[#edf2ef] hover:text-[#075448]"}`}>
                {text}
              </button>
            );
          })}
        </nav>
      )}

      <div className="ad-table-toolbar">
        <label className="ad-search">
          <Search size={17} />
          <input aria-label="Search records" placeholder="Search records…"
            value={q} onChange={(event) => setQ(event.target.value)} />
        </label>
        <div className="ad-table-filters">
          {["vendors", "sub-categories", "commission"].includes(resource) && !compact && (
            <RecordPicker resource="categories" name="filterCategory" required={false}
              onChange={(value) => { setCategory(value); setPage(1); }} />
          )}
          {resource === "vendors" && !compact && (
            <input aria-label="Filter vendor location" placeholder="City or state"
              value={locationFilter} onChange={(event) => {
                setLocationFilter(event.target.value); setPage(1);
              }} />
          )}
          {resource === "payments" && (
            <select aria-label="Filter payment gateway" value={gateway}
              onChange={(event) => { setGateway(event.target.value); setPage(1); }}>
              <option value="">All gateways</option>
              {gatewayOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          )}
          {/* Bookings use the tabs above; other resources retain the status dropdown. */}
          {!isBookings && statuses.length > 0 && (
            <select aria-label="Filter by status" value={status}
              onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          )}
          {!compact && (
            <>
              <label className="ad-date-filter">
                <span>From</span>
                <input aria-label="Created from" type="date" value={from} max={to || undefined}
                  onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
              </label>
              <label className="ad-date-filter">
                <span>To</span>
                <input aria-label="Created until" type="date" value={to} min={from || undefined}
                  onChange={(event) => { setTo(event.target.value); setPage(1); }} />
              </label>
              <div className="ad-columns">
                <button type="button" className="ad-button"
                  onClick={() => setColumnsOpen((value) => !value)} aria-expanded={columnsOpen}>
                  <SlidersHorizontal size={15} /> Columns
                </button>
                {columnsOpen && (
                  <div className="ad-column-menu">
                    {listColumns.map((key) => (
                      <label key={key}>
                        <input type="checkbox" checked={cols.includes(key)}
                          disabled={cols.length === 1 && cols.includes(key)}
                          onChange={() => setVisible(cols.includes(key)
                            ? cols.filter((column) => column !== key)
                            : [...cols, key])} />
                        {label(key)}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className="ad-button" onClick={exportData}
                disabled={exporting || loading || !data?.total}>
                {exporting ? <LoaderCircle className="animate-spin" size={15} /> : <Download size={15} />}
                Export
              </button>
              {editable.length > 0 && (
                <button type="button" className="ad-button ad-primary"
                  onClick={() => open(null, "create")}>
                  <Plus size={15} /> Create
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <Skeleton rows={compact ? 3 : 6} />
      ) : error ? (
        <ErrorState error={error} retry={refresh} />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                {cols.map((key) => (
                  <th key={key}>
                    <button type="button" onClick={() => {
                      setSort(key);
                      setDirection(sort === key && direction === "asc" ? "desc" : "asc");
                      setPage(1);
                    }}>
                      {label(key)} <ArrowUpDown size={11} />
                      {sort === key && <span className="sr-only">{direction}</span>}
                    </button>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row?.id ?? rowIndex}>
                  {cols.map((key) => (
                    <td key={key} data-label={label(key)}>
                      {key === "categories" && ["vendors", "applications"].includes(resource) ? (
                        <VendorCategories value={row?.[key]} vendorId={row?.id} />
                      ) : key === "name" ? (
                        <button type="button" className="ad-record-name"
                          onClick={() => open(row, "view")}>
                          <span className="ad-avatar ad-avatar-small">
                            {String(row?.name || "?").slice(0, 1)}
                          </span>
                          <span>
                            {display(key, row?.[key], row)}
                            {compact && row?.email &&
                              <small className="ad-record-contact">{row.email}</small>}
                          </span>
                        </button>
                      ) : key === "owner" && compact ? (
                        <span>{row?.owner || "—"}
                          <small className="ad-record-contact">{row?.phone || "—"}</small>
                        </span>
                      ) : display(key, row?.[key], row)}
                    </td>
                  ))}
                  <td data-label="Actions">
                    <div className="ad-row-actions">
                      <button type="button" className="ad-icon" title="View details"
                        aria-label={`View ${row?.name || "record"}`} onClick={() => open(row, "view")}>
                        <Eye size={16} />
                      </button>
                      {compact && ["Pending", "UnderReview"].includes(row?.status) && (
                        <>
                          <button type="button" className="ad-icon ad-approve"
                            aria-label={`Approve ${row?.name}`}
                            onClick={() => open(row, "Approved")}><Check size={16} /></button>
                          <button type="button" className="ad-icon ad-reject"
                            aria-label={`Reject ${row?.name}`}
                            onClick={() => open(row, "Rejected")}><X size={16} /></button>
                        </>
                      )}
                      {!compact && editable.length > 0 && (
                        <button type="button" className="ad-icon" title="Edit"
                          aria-label={`Edit ${row?.name || "record"}`} onClick={() => open(row, "edit")}>
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && !error && (
        <footer className="ad-table-footer">
          <span>{total > 0
            ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}` : "0"}
            {" "}of {number(total)} records
          </span>
          <div>
            {!compact && (
              <select aria-label="Rows per page" value={size}
                onChange={(event) => { setSize(Number(event.target.value)); setPage(1); }}>
                {[10, 20, 50, 100].map((value) =>
                  <option key={value} value={value}>{value} / page</option>)}
              </select>
            )}
            <button type="button" className="ad-icon" aria-label="Previous page"
              disabled={page === 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}>
              <ChevronLeft size={17} />
            </button>
            <span>{page} / {totalPages}</span>
            <button type="button" className="ad-icon" aria-label="Next page"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              <ChevronRight size={17} />
            </button>
          </div>
        </footer>
      )}

      {decision && (
        <VendorDecisionDialog vendorId={decision.id} action={decision.action}
          close={() => setDecision(null)} />
      )}

      {dialog && (
        <AdminDialog
          title={dialog.action === "view" ? "Record details"
            : dialog.action === "create" ? "Create record"
            : dialog.action === "edit" ? "Edit record"
            : `${dialog.action} ${["vendors", "applications"].includes(resource) ? "vendor" : "record"}`}
          busy={busy} close={() => setDialog(null)}>
          {dialog.action === "Inactive" && ["categories", "sub-categories"].includes(resource) && (
            <p className="ad-inline-error">
              This category is used by {dialog.row?.usageCount || 0} services.
              Existing history will be preserved. Review affected listings before deactivation.
            </p>
          )}
          {formError && <div className="ad-inline-error" role="alert">{formError}</div>}
          {dialog.action === "view" ? (
            <>
              <dl className="ad-details">
                {asArray(data?.columns).map((key) => (
                  <div key={key}>
                    <dt>{label(key)}</dt>
                    <dd>{display(key, dialog.row?.[key], dialog.row)}</dd>
                  </div>
                ))}
              </dl>
              {resource === "documents" && (
                <button type="button" className="ad-button" disabled={busy}
                  onClick={() => downloadDoc(dialog.row.id)}>
                  <FileDown size={16} /> Download document
                </button>
              )}
              {["vendors", "applications"].includes(resource) && (
                <Link className="ad-button"
                  to={`/admin/documents?q=${encodeURIComponent(dialog.row?.name || "")}`}
                  onClick={() => setDialog(null)}>Review vendor documents</Link>
              )}
              <div className="ad-dialog-actions">
                {actions.filter((action) =>
                  ["vendors", "applications"].includes(resource)
                    ? canDecide(dialog.row?.status, action)
                    : action !== dialog.row?.status
                ).map((action) => (
                  <button key={action} type="button"
                    className={`ad-button ${["Rejected", "Block", "Cancelled"].includes(action) ? "ad-danger" : ""}`}
                    onClick={() => open(dialog.row, action)}>
                    {action === "Approved" ? "Approve" : action === "Rejected" ? "Reject" : action}
                  </button>
                ))}
              </div>
              {["payments", "refunds", "payouts"].includes(resource) && (
                <p className="ad-hint">
                  This ledger reflects recorded transactions. Money movement is handled by the
                  configured payment provider; no transfer is initiated here.
                </p>
              )}
            </>
          ) : (
            <form onSubmit={submit} className="ad-form">
              {["create", "edit"].includes(dialog.action) ? (
                editable.map((key) => (
                  <label key={key}>
                    {label(key)}
                    {key === "categoryId" ? (
                      <RecordPicker resource="categories" name={key}
                        initialValue={dialog.row?.categoryId} initialLabel={dialog.row?.category} />
                    ) : key === "description" ? (
                      <textarea name={key} defaultValue={dialog.row?.[key] || ""} maxLength={500} />
                    ) : key === "discountType" ? (
                      <select name={key} defaultValue={dialog.row?.[key] || "Percentage"}>
                        <option>Percentage</option><option>Fixed</option>
                      </select>
                    ) : (
                      <input name={key}
                        type={/Date$/.test(key) ? "date"
                          : ["categoryId", "discountValue", "usageLimit", "sortOrder"].includes(key)
                            ? "number" : "text"}
                        step={key === "discountValue" ? "0.01" : undefined}
                        min={["discountValue", "sortOrder"].includes(key) ? 0 : 1}
                        required={! ["description", "usageLimit", "icon"].includes(key)}
                        maxLength={key === "code" ? 50 : 150}
                        defaultValue={/Date$/.test(key)
                          ? dialog.row?.[key]?.slice(0, 10) || ""
                          : dialog.row?.[key] ?? ""} />
                    )}
                  </label>
                ))
              ) : (
                <>
                  <div className="ad-confirm-summary">
                    <strong>{dialog.row?.name}</strong>
                    <span>{dialog.row?.owner || dialog.row?.email || dialog.row?.vendor}</span>
                    <Badge>{dialog.row?.status}</Badge>
                  </div>
                  <p>Confirm this change to <strong>{dialog.action}</strong>.
                    This action will be recorded in the audit log.</p>
                  {dialog.action === "Rejected" && ["vendors", "applications"].includes(resource) && (
                    <label>Rejection reason
                      <textarea name="reason" required maxLength={1000}
                        placeholder="Explain what the vendor needs to address…" />
                    </label>
                  )}
                  <label>
                    Admin note { ["vendors", "applications"].includes(resource) ? "(optional)" : "(required)" }
                    <textarea name="note" maxLength={2000} minLength={
                      ["vendors", "applications"].includes(resource) ? 0 : 3}
                      required={! ["vendors", "applications"].includes(resource)}
                      placeholder="Add context for your team…" />
                  </label>
                </>
              )}
              <div className="ad-dialog-actions">
                <button type="button" className="ad-button" disabled={busy}
                  onClick={() => setDialog(null)}>Cancel</button>
                <button type="submit" disabled={busy}
                  className={`ad-button ${["Rejected", "Cancelled", "Block"].includes(dialog.action)
                    ? "ad-danger" : "ad-primary"}`}>
                  {busy ? <><LoaderCircle size={16} className="animate-spin" /> Saving…</> : "Confirm and save"}
                </button>
              </div>
            </form>
          )}
        </AdminDialog>
      )}
    </section>
  );
}
