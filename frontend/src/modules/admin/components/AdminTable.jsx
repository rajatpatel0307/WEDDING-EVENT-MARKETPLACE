import VendorDecisionDialog from "./VendorDecisionDialog";
import { canDecide, vendorChangedEvent } from "../vendor-workflow";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Inbox,
  Eye,
  Check,
  X,
  Plus,
  Pencil,
  FileDown,
  LoaderCircle,
} from "lucide-react";
import { adminRequest, saveBlob, date, money, number } from "../api";
import { columnLabels } from "../navigation";
import { useAuth } from "../../../context/AuthContext";
import AdminDialog from "./AdminDialog";
import RecordPicker from "./RecordPicker";
const label = (k) =>
  columnLabels[k] ||
  k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
export function Badge({ children }) {
  return (
    <span
      className={`ad-badge ad-badge-${String(children).toLowerCase().replace(/\s/g, "")}`}
    >
      {children === "UnderReview" ? "Under Review" : children || "—"}
    </span>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div className="ad-error" role="alert">
      <strong>{error.message}</strong>
      <div>
        {error.status === 401 ? (
          <Link to="/auth/login">Sign in</Link>
        ) : (
          <button className="ad-button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function Skeleton({ rows = 5 }) {
  return (
    <div className="ad-skeleton" role="status" aria-label="Loading data">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="animate-pulse" />
      ))}
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
  if (["amount", "paid", "gross", "commission", "bookingAmount"].includes(key))
    return row.currency && row.currency !== "INR"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: row.currency,
          maximumFractionDigits: 2,
        }).format(Number(value))
      : money(value);
  if (key === "emailVerified") return value ? "Verified" : "Unverified";
  if (typeof value === "number") return number(value);
  return String(value);
}
export default function AdminTable({
  resource,
  compact = false,
  onChange,
  version = 0,
  initialStatus = "",
  initialQuery = "",
}) {
  const { notify } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState(initialQuery),
    [search, setSearch] = useState(initialQuery),
    [status, setStatus] = useState(initialStatus),
    [page, setPage] = useState(1),
    [size, setSize] = useState(20),
    [sort, setSort] = useState("createdAt"),
    [direction, setDirection] = useState("desc"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(null),
    [revision, setRevision] = useState(0),
    [visible, setVisible] = useState(null),
    [columnsOpen, setColumnsOpen] = useState(false),
    [dialog, setDialog] = useState(null),
    [decision, setDecision] = useState(null),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [exporting, setExporting] = useState(false);
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
  const params = new URLSearchParams({
    q: search,
    status,
    page: String(page),
    pageSize: String(compact ? 5 : size),
    sort,
    direction,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    adminRequest(`/${resource}?${params}`, { signal: abort.signal })
      .then((result) => {
        setData(result);
        setPage((p) =>
          Math.min(
            p,
            Math.max(1, Math.ceil(result.total / (compact ? 5 : size))),
          ),
        );
        setVisible(
          (previous) =>
            previous ||
            result.columns
              .filter((k) =>
                compact
                  ? [
                      "name",
                      "owner",
                      "categories",
                      "city",
                      "createdAt",
                      "status",
                      "documents",
                    ].includes(k)
                  : ![
                      "description",
                      "remarks",
                      "emailVerified",
                      "categoryId",
                      "updatedAt",
                    ].includes(k),
              )
              .slice(0, compact ? 7 : 6),
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [resource, params, revision, version]);
  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    window.addEventListener(vendorChangedEvent, changed);
    return () => window.removeEventListener(vendorChangedEvent, changed);
  }, []);
  function refresh() {
    setRevision((v) => v + 1);
    onChange?.();
  }
  function open(row, action) {
    if (
      ["vendors", "applications"].includes(resource) &&
      ["Approved", "Rejected", "Suspended"].includes(action)
    ) {
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
    setDialog({ row, action });
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    try {
      let result;
      if (["create", "edit"].includes(dialog.action)) {
        const values = { ...fields };
        for (const key of ["discountValue", "categoryId", "usageLimit"])
          if (key in values)
            values[key] = values[key] === "" ? null : Number(values[key]);
        if (dialog.row?.updatedAt)
          values.expectedUpdatedAt = dialog.row.updatedAt;
        result = await adminRequest(
          `/${resource}${dialog.row ? `/${dialog.row.id}` : ""}`,
          {
            method: dialog.row ? "PATCH" : "POST",
            body: JSON.stringify(values),
          },
        );
      } else if (["vendors", "applications"].includes(resource))
        result = await adminRequest(`/vendors/${dialog.row.id}/review`, {
          method: "POST",
          body: JSON.stringify({
            status: dialog.action,
            expectedStatus: dialog.row.status,
            reason: fields.reason || "",
            note: fields.note || "",
          }),
        });
      else
        result = await adminRequest(`/${resource}/${dialog.row.id}/action`, {
          method: "PATCH",
          body: JSON.stringify({
            action: dialog.action,
            expectedStatus: dialog.row.status,
            note: fields.note,
          }),
        });
      notify(result.message);
      setDialog(null);
      refresh();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function downloadDoc(id) {
    setBusy(true);
    setFormError("");
    try {
      saveBlob(
        await adminRequest(`/documents/${id}/download`, { download: true }),
        "vendor-document",
      );
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    setExporting(true);
    try {
      saveBlob(
        await adminRequest(`/${resource}/export?${params}`, { download: true }),
        `${resource}.csv`,
      );
      notify("Export downloaded.");
    } catch (e) {
      notify(e.message);
    } finally {
      setExporting(false);
    }
  }
  const cols = (visible || []).filter((k) => data?.columns.includes(k));
  return (
    <section
      className="ad-panel ad-data-panel"
      aria-label={`${resource} records`}
    >
      {compact ? (
        <div className="ad-panel-heading">
          <div>
            <h2>
              Pending vendor approvals{" "}
              <span className="ad-count">{data?.total ?? "—"}</span>
            </h2>
            <p>A thoughtful review. A trusted marketplace.</p>
          </div>
          <Link className="ad-text-link" to="/admin/applications">
            View all <ChevronRight size={15} />
          </Link>
        </div>
      ) : null}
      <div className="ad-table-toolbar">
        <label className="ad-search">
          <Search size={17} />
          <input
            aria-label="Search records"
            placeholder="Search records…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="ad-table-filters">
          {!!data?.statuses.length && (
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {data.statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          {!compact && (
            <>
              <label className="ad-date-filter">
                <span>From</span>
                <input
                  aria-label="Created from"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className="ad-date-filter">
                <span>To</span>
                <input
                  aria-label="Created until"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <div className="ad-columns">
                <button
                  className="ad-button"
                  onClick={() => setColumnsOpen(!columnsOpen)}
                  aria-expanded={columnsOpen}
                >
                  <SlidersHorizontal size={15} /> Columns
                </button>
                {columnsOpen && (
                  <div className="ad-column-menu">
                    {data?.columns.map((k) => (
                      <label key={k}>
                        <input
                          type="checkbox"
                          checked={cols.includes(k)}
                          disabled={cols.length === 1 && cols.includes(k)}
                          onChange={() =>
                            setVisible(
                              cols.includes(k)
                                ? cols.filter((c) => c !== k)
                                : [...cols, k],
                            )
                          }
                        />
                        {label(k)}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="ad-button"
                onClick={exportData}
                disabled={exporting || loading || !data?.total}
              >
                {exporting ? (
                  <LoaderCircle className="animate-spin" size={15} />
                ) : (
                  <Download size={15} />
                )}{" "}
                Export
              </button>
              {!!data?.editable.length && (
                <button
                  className="ad-button ad-primary"
                  onClick={() => open(null, "create")}
                >
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
      ) : !data?.rows.length ? (
        <Empty />
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                {cols.map((k) => (
                  <th key={k}>
                    <button
                      onClick={() => {
                        setSort(k);
                        setDirection(
                          sort === k && direction === "asc" ? "desc" : "asc",
                        );
                        setPage(1);
                      }}
                    >
                      {label(k)}
                      <ArrowUpDown size={11} />
                      {sort === k && (
                        <span className="sr-only">{direction}</span>
                      )}
                    </button>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  {cols.map((k) => (
                    <td key={k} data-label={label(k)}>
                      {k === "name" ? (
                        <button
                          className="ad-record-name"
                          onClick={() => open(row, "view")}
                        >
                          <span className="ad-avatar ad-avatar-small">
                            {String(row.name || "?").slice(0, 1)}
                          </span>
                          <span>
                            {display(k, row[k], row)}
                            {compact && row.email && (
                              <small className="ad-record-contact">
                                {row.email}
                              </small>
                            )}
                          </span>
                        </button>
                      ) : k === "owner" && compact ? (
                        <span>
                          {row.owner}
                          <small className="ad-record-contact">
                            {row.phone || "—"}
                          </small>
                        </span>
                      ) : (
                        display(k, row[k], row)
                      )}
                    </td>
                  ))}
                  <td data-label="Actions">
                    <div className="ad-row-actions">
                      <button
                        className="ad-icon"
                        title="View details"
                        aria-label={`View ${row.name || "record"}`}
                        onClick={() => open(row, "view")}
                      >
                        <Eye size={16} />
                      </button>
                      {compact &&
                        ["Pending", "UnderReview"].includes(row.status) && (
                          <>
                            <button
                              className="ad-icon ad-approve"
                              aria-label={`Approve ${row.name}`}
                              onClick={() => open(row, "Approved")}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="ad-icon ad-reject"
                              aria-label={`Reject ${row.name}`}
                              onClick={() => open(row, "Rejected")}
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      {!compact && !!data.editable.length && (
                        <button
                          className="ad-icon"
                          title="Edit"
                          aria-label={`Edit ${row.name}`}
                          onClick={() => open(row, "edit")}
                        >
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
          <span>
            {data.total
              ? `${(page - 1) * (compact ? 5 : size) + 1}–${Math.min(page * (compact ? 5 : size), data.total)}`
              : "0"}{" "}
            of {number(data.total)} records
          </span>
          <div>
            {!compact && (
              <select
                aria-label="Rows per page"
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            )}
            <button
              className="ad-icon"
              aria-label="Previous page"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              {page} /{" "}
              {Math.max(1, Math.ceil(data.total / (compact ? 5 : size)))}
            </span>
            <button
              className="ad-icon"
              aria-label="Next page"
              disabled={page * (compact ? 5 : size) >= data.total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </footer>
      )}
      {decision && (
        <VendorDecisionDialog
          vendorId={decision.id}
          action={decision.action}
          close={() => setDecision(null)}
        />
      )}
      {dialog && (
        <AdminDialog
          title={
            dialog.action === "view"
              ? "Record details"
              : dialog.action === "create"
                ? "Create record"
                : dialog.action === "edit"
                  ? "Edit record"
                  : `${dialog.action} ${["vendors", "applications"].includes(resource) ? "vendor" : "record"}`
          }
          busy={busy}
          close={() => setDialog(null)}
        >
          {formError && (
            <div className="ad-inline-error" role="alert">
              {formError}
            </div>
          )}
          {dialog.action === "view" ? (
            <>
              <dl className="ad-details">
                {data.columns.map((k) => (
                  <div key={k}>
                    <dt>{label(k)}</dt>
                    <dd>{display(k, dialog.row[k], dialog.row)}</dd>
                  </div>
                ))}
              </dl>
              {resource === "documents" && (
                <button
                  className="ad-button"
                  disabled={busy}
                  onClick={() => downloadDoc(dialog.row.id)}
                >
                  <FileDown size={16} /> Download document
                </button>
              )}
              {["vendors", "applications"].includes(resource) && (
                <Link
                  className="ad-button"
                  to={`/admin/documents?q=${encodeURIComponent(dialog.row.name)}`}
                  onClick={() => setDialog(null)}
                >
                  Review vendor documents
                </Link>
              )}
              <div className="ad-dialog-actions">
                {data.actions
                  .filter((a) =>
                    ["vendors", "applications"].includes(resource)
                      ? canDecide(dialog.row.status, a)
                      : a !== dialog.row.status,
                  )
                  .map((a) => (
                    <button
                      className={`ad-button ${a === "Rejected" || a === "Block" || a === "Cancelled" ? "ad-danger" : ""}`}
                      key={a}
                      onClick={() => open(dialog.row, a)}
                    >
                      {a === "Approved"
                        ? "Approve"
                        : a === "Rejected"
                          ? "Reject"
                          : a}
                    </button>
                  ))}
              </div>
              {["payments", "refunds", "payouts"].includes(resource) && (
                <p className="ad-hint">
                  This ledger reflects recorded transactions. Money movement is
                  handled by the configured payment provider; no transfer is
                  initiated here.
                </p>
              )}
            </>
          ) : (
            <form onSubmit={submit} className="ad-form">
              {["create", "edit"].includes(dialog.action) ? (
                data.editable.map((k) => (
                  <label key={k}>
                    {label(k)}
                    {k === "categoryId" ? (
                      <RecordPicker
                        resource="categories"
                        name={k}
                        initialValue={dialog.row?.categoryId}
                        initialLabel={dialog.row?.category}
                      />
                    ) : k === "description" ? (
                      <textarea
                        name={k}
                        defaultValue={dialog.row?.[k] || ""}
                        maxLength={500}
                      />
                    ) : k === "discountType" ? (
                      <select
                        name={k}
                        defaultValue={dialog.row?.[k] || "Percentage"}
                      >
                        <option>Percentage</option>
                        <option>Fixed</option>
                      </select>
                    ) : (
                      <input
                        name={k}
                        type={
                          /Date$/.test(k)
                            ? "date"
                            : [
                                  "categoryId",
                                  "discountValue",
                                  "usageLimit",
                                ].includes(k)
                              ? "number"
                              : "text"
                        }
                        step={k === "discountValue" ? "0.01" : undefined}
                        min={k === "discountValue" ? 0 : 1}
                        required={k !== "description" && k !== "usageLimit"}
                        maxLength={k === "code" ? 50 : 150}
                        defaultValue={
                          /Date$/.test(k)
                            ? dialog.row?.[k]?.slice(0, 10) || ""
                            : (dialog.row?.[k] ?? "")
                        }
                      />
                    )}
                  </label>
                ))
              ) : (
                <>
                  <div className="ad-confirm-summary">
                    <strong>{dialog.row.name}</strong>
                    <span>
                      {dialog.row.owner ||
                        dialog.row.email ||
                        dialog.row.vendor}
                    </span>
                    <Badge>{dialog.row.status}</Badge>
                  </div>
                  <p>
                    Confirm this change to <strong>{dialog.action}</strong>.
                    This action will be recorded in the audit log.
                  </p>
                  {dialog.action === "Rejected" &&
                    ["vendors", "applications"].includes(resource) && (
                      <label>
                        Rejection reason{" "}
                        <textarea
                          name="reason"
                          required
                          maxLength={1000}
                          placeholder="Explain what the vendor needs to address…"
                        />
                      </label>
                    )}
                  <label>
                    Admin note{" "}
                    {["vendors", "applications"].includes(resource)
                      ? "(optional)"
                      : "(required)"}
                    <textarea
                      name="note"
                      required={!["vendors", "applications"].includes(resource)}
                      minLength={
                        ["vendors", "applications"].includes(resource) ? 0 : 3
                      }
                      maxLength={2000}
                      placeholder="Add context for your team…"
                    />
                  </label>
                </>
              )}
              <div className="ad-dialog-actions">
                <button
                  className="ad-button"
                  type="button"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                <button
                  className={`ad-button ${["Rejected", "Cancelled", "Block"].includes(dialog.action) ? "ad-danger" : "ad-primary"}`}
                  disabled={busy}
                  type="submit"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />{" "}
                      Saving…
                    </>
                  ) : (
                    "Confirm and save"
                  )}
                </button>
              </div>
            </form>
          )}
        </AdminDialog>
      )}
    </section>
  );
}
