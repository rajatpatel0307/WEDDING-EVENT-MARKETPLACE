
import VendorDecisionDialog from "./VendorDecisionDialog";
import { canDecide, vendorChangedEvent } from "../vendor-workflow";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, SlidersHorizontal, Download, ChevronLeft, ChevronRight,
  ArrowUpDown, Inbox, Eye, Check, X, Plus, Pencil,
  FileDown, LoaderCircle, CircleCheck, CircleX, Clock, CreditCard, RefreshCw, RotateCcw,
} from "lucide-react";
import { adminRequest, saveBlob, date, money, number } from "../api";
import { columnLabels } from "../navigation";
import { useAuth } from "../../../context/AuthContext";
import AdminDialog from "./AdminDialog";
import RecordPicker from "./RecordPicker";
import VendorFilters from "./VendorFilters";
import ResourceStatistics from "./ResourceStatistics";
import { categoryImages } from "../../../components/home/categoryImages";

const asArray = (value) => (Array.isArray(value) ? value : []);
const categoryImage = (row) => row?.image || categoryImages[row?.name] || categoryImages["Venue & Location"];
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

export function Badge({ children, highlighted = false }) {
  if (highlighted && ["Approved", "Active"].includes(children)) {
    return (
      <span className="inline-flex items-center rounded-[6px] border border-[#86c6a5] bg-[#dcfce7] px-[10px] py-[5px] text-[10px] font-semibold leading-tight text-[#166534]">
        {children}
      </span>
    );
  }
  return (
    <span className={`ad-badge rounded-[5px] inline-flex text-[8px] [padding:3px_7px] [background:#f1f4ed] text-[#85927b] [white-space:normal] [&.ad-badge-approved]:[background:#edf5e9] [&.ad-badge-approved]:text-[#65905d] [&.ad-badge-active]:[background:#edf5e9] [&.ad-badge-active]:text-[#65905d] [&.ad-badge-confirmed]:[background:#edf5e9] [&.ad-badge-confirmed]:text-[#65905d] [&.ad-badge-success]:[background:#edf5e9] [&.ad-badge-success]:text-[#65905d] [&.ad-badge-paid]:[background:#edf5e9] [&.ad-badge-paid]:text-[#65905d] [&.ad-badge-published]:[background:#edf5e9] [&.ad-badge-published]:text-[#65905d] [&.ad-badge-completed]:[background:#edf5e9] [&.ad-badge-completed]:text-[#65905d] [&.ad-badge-pending]:[background:#fbf5e7] [&.ad-badge-pending]:text-[#b09454] [&.ad-badge-underreview]:[background:#fbf5e7] [&.ad-badge-underreview]:text-[#b09454] [&.ad-badge-processing]:[background:#fbf5e7] [&.ad-badge-processing]:text-[#b09454] [&.ad-badge-invited]:[background:#fbf5e7] [&.ad-badge-invited]:text-[#b09454] [&.ad-badge-rejected]:[background:#fcf0eb] [&.ad-badge-rejected]:text-[#bc7c68] [&.ad-badge-cancelled]:[background:#fcf0eb] [&.ad-badge-cancelled]:text-[#bc7c68] [&.ad-badge-failed]:[background:#fcf0eb] [&.ad-badge-failed]:text-[#bc7c68] [&.ad-badge-blocked]:[background:#fcf0eb] [&.ad-badge-blocked]:text-[#bc7c68] [&.ad-badge-suspended]:[background:#fcf0eb] [&.ad-badge-suspended]:text-[#bc7c68] [&.ad-badge-disputed]:[background:#fcf0eb] [&.ad-badge-disputed]:text-[#bc7c68] ad-badge-${String(children || "").toLowerCase().replace(/\s/g, "")}`}>
      {children === "UnderReview" ? "Under Review" : children || "—"}
    </span>
  );
}

export function ErrorState({ error, retry }) {
  return (
    <div className="ad-error p-[24px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#ecd7c8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#ecd7c8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#ecd7c8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#ecd7c8] rounded-[10px] [background:#fffbf6] text-[#a5745a] flex items-center justify-between gap-[15px] text-[12px]" role="alert">
      <strong>{error?.message || "Something went wrong."}</strong>
      <div>
        {error?.status === 401
          ? <Link to="/auth/login">Sign in</Link>
          : <button type="button" className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={retry}>Try again</button>}
      </div>
    </div>
  );
}

export function Skeleton({ rows = 5 }) {
  return (
    <div className="ad-skeleton p-[20px] flex flex-col gap-[13px] [&_>_div]:h-[25px] [&_>_div]:[background:#edf2e9] [&_>_div]:rounded-[6px] [&_>_div:nth-child(2n)]:w-[80%] [&_>_div:nth-child(3n)]:w-[65%]" role="status" aria-label="Loading data">
      {Array.from({ length: rows }, (_, index) => <div key={index} className="animate-pulse" />)}
    </div>
  );
}

export function Empty({
  text = "No records found",
  description = "Try another search or adjust your filters.",
}) {
  return (
    <div className="ad-empty [padding:42px_20px] flex items-center justify-center flex-col gap-[8px] text-center text-[#a5b19b] min-h-[160px] [&_strong]:text-[12px] [&_strong]:font-[500] [&_strong]:text-[#7d8d72] [&_p]:text-[10px] [&_p]:max-w-[320px]">
      <Inbox size={29} />
      <strong>{text}</strong>
      <p>{description}</p>
    </div>
  );
}

function display(key, value, row = {}) {
  if (key === "image" && value) return <img src={value} alt={row.name || "Category"} className="size-12 rounded-lg object-cover" />;
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

function VendorAvatar({ row }) {
  const [failedSource, setFailedSource] = useState(null);
  const src = row?.profilePhotoUrl;
  return (
    <span className="ad-vendor-avatar inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-[#dae6df] bg-[#f3f5ef] text-[10px] text-[#98916e]">
      {src && src !== failedSource ? (
        <img
          src={src}
          alt={`${row?.name || "Vendor"} profile`}
          className="size-full object-cover"
          loading="lazy"
          onError={() => setFailedSource(src)}
        />
      ) : String(row?.name || "?").slice(0, 1)}
    </span>
  );
}

function VendorCategories({ value, vendorId }) {
  const categories = String(value || "").split(",").map((category) => category.trim()).filter(Boolean);
  if (!categories.length) return "—";
  return (
    <div className="ad-vendor-category-preview grid gap-[3px] min-w-0 max-w-full [&_>_span]:[overflow-x:hidden] [&_>_span]:[overflow-y:hidden] [&_>_span]:[text-overflow:ellipsis] [&_>_span]:whitespace-nowrap [&_>_a]:[justify-self:start] [&_>_a]:text-[var(--ad-teal)] [&_>_a]:font-[600]">
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
  initialStatus = "", initialQuery = "", beforeTable = null,
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
    if (resource === "categories") {
      const path = action === "create" ? "/admin/categories/new"
        : `/admin/categories/${row.id}${action === "edit" ? "/edit"
          : ["Active", "Inactive"].includes(action) ? `?action=${action}` : ""}`;
      navigate(path);
      return;
    }
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
        for (const key of ["sellEnabled", "bookEnabled"]) if(key in values) values[key] = values[key] === "true";
        if ("removeImage" in values) values.removeImage = values.removeImage === "true";
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

  const toolbarActions = (
    <>
      <div className="ad-columns relative">
        <button type="button" className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
          onClick={() => setColumnsOpen((value) => !value)} aria-expanded={columnsOpen}>
          <SlidersHorizontal size={15} /> Columns
        </button>
        {columnsOpen && (
          <div className="ad-column-menu absolute top-[calc(100%_+_6px)] right-[0] z-[10] [background:white] [box-shadow:0_5px_25px_#24452b1a] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eae0] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eae0] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eae0] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eae0] rounded-[7px] [padding:10px_12px] w-[190px] max-h-[300px] overflow-y-auto [&_label]:flex [&_label]:gap-[8px] [&_label]:items-center [&_label]:[padding:5px_0] [&_label]:text-[11px] [&_input]:w-[13px] [&_input]:h-[13px] [&_input]:[accent-color:var(--ad-teal)]">
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
      <button type="button" className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={exportData}
        disabled={exporting || loading || !data?.total}>
        {exporting ? <LoaderCircle className="animate-spin" size={15} /> : <Download size={15} />}
        Export
      </button>
      {editable.length > 0 && (
        <button type="button" className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
          onClick={() => open(null, "create")}>
          <Plus size={15} /> Create
        </button>
      )}
    </>
  );

  return (
    <>
      {["categories", "sub-categories", "vendors", "customers"].includes(resource) && !compact && (
        <ResourceStatistics resource={resource} summary={data?.summary} loading={loading} error={error} />
      )}
      {resource === "payments" && !compact && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Payment statistics" aria-busy={loading}>
          {[
            ["total", "All Payments", CreditCard, "bg-[#e7f0ed] text-[#176b60]"],
            ["pending", "Pending", Clock, "bg-[#faf3df] text-[#ac8a39]"],
            ["processing", "Processing", RefreshCw, "bg-[#eaf0fa] text-[#5c7fa8]"],
            ["success", "Success", CircleCheck, "bg-[#edf5e7] text-[#568447]"],
            ["failed", "Failed", CircleX, "bg-[#fae8e8] text-[#b65555]"],
            ["refunded", "Refunded", RotateCcw, "bg-[#f3eaf7] text-[#9568a6]"],
          ].map(([key, title, Icon, color]) => (
            <article key={key} className="flex items-center justify-between gap-4 rounded-xl border border-[#e0e8e2] bg-white p-5 shadow-[0_3px_8px_#263f2d02]">
              <div>
                <span className="text-xs font-medium text-[#819189]">{title}</span>
                <strong className="mt-2 block text-[28px] font-semibold leading-tight text-[#294b40]" aria-live="polite">{loading ? <span className="block h-8 w-14 animate-pulse rounded bg-[#edf2ed]" aria-label="Loading count" /> : error || !data?.summary ? "—" : number(data.summary[key])}</strong>
              </div>
              <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${color}`}><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span>
            </article>
          ))}
        </div>
      )}
      {beforeTable && <div className="mb-6">{beforeTable}</div>}
    <section className="ad-panel ad-data-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] [@media(width<=1200px)]:[&_.ad-table_th:last-child]:w-[95px] [@media(width<=767px)]:[&_.ad-panel-heading_.ad-text-link]:text-[9px]" aria-label={`${resource} records`}>
      {compact && (
        <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
          <div>
            <h2>Pending vendor approvals <span className="ad-count text-[10px] [background:#f9f4e8] text-[#a88b53] [border-top-width:1px] [border-top-style:solid] [border-top-color:#eee4ce] [border-right-width:1px] [border-right-style:solid] [border-right-color:#eee4ce] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#eee4ce] [border-left-width:1px] [border-left-style:solid] [border-left-color:#eee4ce] [padding:2px_6px] ml-[7px] rounded-[4px]">{data?.total ?? "—"}</span></h2>
            <p>A thoughtful review. A trusted marketplace.</p>
          </div>
          <Link className="ad-text-link flex items-center gap-[5px] text-[#5a8671] text-[10px] whitespace-nowrap" to="/admin/applications">
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

      {resource === "vendors" && !compact ? (
        <VendorFilters
          query={q} onQueryChange={setQ}
          location={locationFilter} onLocationChange={value => { setLocationFilter(value); setPage(1); }}
          status={status} statuses={statuses} onStatusChange={value => { setStatus(value); setPage(1); }}
          onCategoryChange={value => { setCategory(value); setPage(1); }}
          from={from} to={to}
          onFromChange={value => { setFrom(value); setPage(1); }}
          onToChange={value => { setTo(value); setPage(1); }}
        >
          {toolbarActions}
        </VendorFilters>
      ) : (
      <div className="ad-table-toolbar flex items-center justify-between gap-[12px] [@media(width<=767px)]:gap-[10px] [padding:15px_20px] [@media(width<=767px)]:[padding:12px_15px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f1f4ef] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#eef2ed] flex-wrap [@media(width<=767px)]:[&_>_.ad-search]:flex-1">
        <label className="ad-search flex items-center gap-[7px] min-w-[120px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe3] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe3] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe3] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe3] rounded-[7px] [background:#fff] text-[#99a699] [padding:0_9px] max-w-full [&_input]:[border-top-width:0] [&_input]:[border-top-style:none] [&_input]:[border-top-color:currentColor] [&_input]:[border-right-width:0] [&_input]:[border-right-style:none] [&_input]:[border-right-color:currentColor] [&_input]:[border-bottom-width:0] [&_input]:[border-bottom-style:none] [&_input]:[border-bottom-color:currentColor] [&_input]:[border-left-width:0] [&_input]:[border-left-style:none] [&_input]:[border-left-color:currentColor] [&_input]:[padding:8px_0] [&_input]:[outline:0] [&_input]:[background:none] [&_input]:text-[10px] [&_input]:w-[180px] [&_input]:max-w-full [&_input:focus]:[outline:0] [&_input:focus]:[border-top-width:0] [&_input:focus]:[border-top-style:none] [&_input:focus]:[border-top-color:currentColor] [&_input:focus]:[border-right-width:0] [&_input:focus]:[border-right-style:none] [&_input:focus]:[border-right-color:currentColor] [&_input:focus]:[border-bottom-width:0] [&_input:focus]:[border-bottom-style:none] [&_input:focus]:[border-bottom-color:currentColor] [&_input:focus]:[border-left-width:0] [&_input:focus]:[border-left-style:none] [&_input:focus]:[border-left-color:currentColor]">
          <Search size={17} />
          <input aria-label="Search records" placeholder="Search records…"
            value={q} onChange={(event) => setQ(event.target.value)} />
        </label>
        <div className="ad-table-filters flex items-center gap-[8px] [@media(width<=767px)]:gap-[6px] flex-wrap [&_select]:text-[10px] [&_select]:[padding:7px_9px] [@media(width<=767px)]:w-full [@media(width<=767px)]:[&_>_.ad-button]:[padding:7px_9px] [@media(width<=767px)]:[&_>_.ad-button]:text-[9px] [@media(width<=767px)]:[&_.ad-columns_>_.ad-button]:[padding:7px_9px] [@media(width<=767px)]:[&_.ad-columns_>_.ad-button]:text-[9px]">
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
              <label className="ad-date-filter flex items-center gap-[5px] text-[9px] text-[#95a18f] [&_input]:text-[9px] [&_input]:[padding:7px_5px] [&_input]:max-w-[115px] [@media(width<=767px)]:[&_input]:max-w-[108px]">
                <span>From</span>
                <input aria-label="Created from" type="date" value={from} max={to || undefined}
                  onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
              </label>
              <label className="ad-date-filter flex items-center gap-[5px] text-[9px] text-[#95a18f] [&_input]:text-[9px] [&_input]:[padding:7px_5px] [&_input]:max-w-[115px] [@media(width<=767px)]:[&_input]:max-w-[108px]">
                <span>To</span>
                <input aria-label="Created until" type="date" value={to} min={from || undefined}
                  onChange={(event) => { setTo(event.target.value); setPage(1); }} />
              </label>
              {toolbarActions}
            </>
          )}
        </div>
      </div>
      )}

      {loading ? (
        <Skeleton rows={compact ? 3 : 6} />
      ) : error ? (
        <ErrorState error={error} retry={refresh} />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="ad-table-wrap w-full min-w-0">
          <table className="ad-table w-full border-collapse [table-layout:fixed] text-[10px] [@media(width<=1200px)]:text-[9px] text-left [&_th]:[background:#fafbf8] [&_th]:text-[#94a08f] [&_th]:tracking-[0.3px] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#eaf0e6] [&_th]:[padding:12px_17px] [@media(width<=1200px)]:[&_th]:[padding:12px_10px] [&_th]:[overflow-wrap:anywhere] [&_th_button]:flex [&_th_button]:items-center [&_th_button]:gap-[4px] [&_th_button]:max-w-full [&_th_button]:text-left [&_th_button]:[border-top-width:0] [&_th_button]:[border-top-style:none] [&_th_button]:[border-top-color:currentColor] [&_th_button]:[border-right-width:0] [&_th_button]:[border-right-style:none] [&_th_button]:[border-right-color:currentColor] [&_th_button]:[border-bottom-width:0] [&_th_button]:[border-bottom-style:none] [&_th_button]:[border-bottom-color:currentColor] [&_th_button]:[border-left-width:0] [&_th_button]:[border-left-style:none] [&_th_button]:[border-left-color:currentColor] [&_th_button]:[background:none] [&_th_button]:text-[inherit] [&_th_button]:p-[0] [&_td]:[padding:15px_17px] [@media(width<=767px)]:[&_td]:p-[0] [@media(767px<width<=1200px)]:[&_td]:[padding:12px_10px] [&_td]:[border-bottom-width:1px] [@media(width<=767px)]:[&_td]:[border-bottom-width:0] [&_td]:[border-bottom-style:solid] [@media(width<=767px)]:[&_td]:[border-bottom-style:none] [&_td]:[border-bottom-color:#f0f3ec] [@media(width<=767px)]:[&_td]:[border-bottom-color:currentColor] [&_td]:text-[#758570] [&_td]:[overflow-wrap:anywhere] [&_td]:[vertical-align:middle] [&_tbody_tr:last-child_td]:[border-bottom-width:0] [&_tbody_tr:last-child_td]:[border-bottom-style:none] [&_tbody_tr:last-child_td]:[border-bottom-color:currentColor] [&_tbody_tr:hover]:[background:#fcfdf9] [@media(width<=767px)]:[&_thead]:hidden [@media(width<=767px)]:block [@media(width<=767px)]:[&_tbody]:block [@media(width<=767px)]:[&_tbody]:w-full [@media(width<=767px)]:[&_tr]:block [@media(width<=767px)]:[&_tr]:w-full [@media(width<=767px)]:[&_td]:block [@media(width<=767px)]:[&_td]:w-full [@media(width<=767px)]:[&_tbody_tr]:[padding:13px_16px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-width:1px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-style:solid] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-color:#e9eee4] [@media(width<=767px)]:[&_tbody_tr]:grid [@media(width<=767px)]:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:[&_tbody_tr]:gap-[11px_17px] [@media(width<=767px)]:[&_td]:[border-top-width:0] [@media(width<=767px)]:[&_td]:[border-top-style:none] [@media(width<=767px)]:[&_td]:[border-top-color:currentColor] [@media(width<=767px)]:[&_td]:[border-right-width:0] [@media(width<=767px)]:[&_td]:[border-right-style:none] [@media(width<=767px)]:[&_td]:[border-right-color:currentColor] [@media(width<=767px)]:[&_td]:[border-left-width:0] [@media(width<=767px)]:[&_td]:[border-left-style:none] [@media(width<=767px)]:[&_td]:[border-left-color:currentColor] [@media(width<=767px)]:[&_td]:text-[10px] [@media(width<=767px)]:[&_td]:min-w-0 [@media(width<=767px)]:[&_td:before]:[content:attr(data-label)] [@media(width<=767px)]:[&_td:before]:block [@media(width<=767px)]:[&_td:before]:text-[8px] [@media(width<=767px)]:[&_td:before]:text-[#a1ad96] [@media(width<=767px)]:[&_td:before]:mb-[4px] [@media(width<=767px)]:[&_td:first-child]:col-[1/-1] [@media(width<=767px)]:[&_td:last-child_.ad-row-actions]:ml-[-5px]">
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
                        <button type="button" className="ad-record-name flex items-center gap-[9px] [border-top-width:0] [border-top-style:none] [border-top-color:currentColor] [border-right-width:0] [border-right-style:none] [border-right-color:currentColor] [border-bottom-width:0] [border-bottom-style:none] [border-bottom-color:currentColor] [border-left-width:0] [border-left-style:none] [border-left-color:currentColor] [background:none] text-left text-[#4c6554] p-[0] text-[10px] [@media(width<=767px)]:text-[12px] [@media(767px<width<=1200px)]:text-[9px] leading-[1.6] font-[500] max-w-full [&_>_span:last-child]:[overflow-wrap:anywhere] [&_>_span:last-child]:min-w-0 [@media(width<=767px)]:[&_.ad-avatar]:inline-flex [@media(767px<width<=1200px)]:[&_.ad-avatar]:hidden"
                          onClick={() => open(row, "view")}>
                          {["vendors", "applications"].includes(resource) ? <VendorAvatar row={row} /> : <span className="ad-avatar ad-avatar-small w-[28px] h-[28px] inline-flex items-center justify-center [background:#f3f5ef] text-[#98916e] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dae6df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dae6df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dae6df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dae6df] rounded-[7px] text-[10px] shrink-0">
                            {resource === "categories" ? <img src={categoryImage(row)} alt={`${row.name} category`} className="size-full rounded-[6px] object-cover" /> : String(row?.name || "?").slice(0, 1)}
                          </span>}
                          <span>
                            {display(key, row?.[key], row)}
                            {compact && row?.email &&
                              <small className="ad-record-contact block text-[8px] font-[400] text-[#9aa890] mt-[3px] [overflow-wrap:anywhere]">{row.email}</small>}
                          </span>
                        </button>
                      ) : key === "owner" && compact ? (
                        <span>{row?.owner || "—"}
                          <small className="ad-record-contact block text-[8px] font-[400] text-[#9aa890] mt-[3px] [overflow-wrap:anywhere]">{row?.phone || "—"}</small>
                        </span>
                      ) : display(key, row?.[key], row)}
                    </td>
                  ))}
                  <td data-label="Actions">
                    <div className="ad-row-actions flex gap-[3px] flex-wrap">
                      <button type="button" className="ad-icon inline-flex justify-center items-center w-[29px] h-[29px] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] [background:none] text-[#84958a] rounded-[6px] shrink-0 [&:hover]:[background:#eef3ee] [&:hover]:text-[#176b60] [&.ad-approve]:[background:#edf6ee] [&.ad-approve]:text-[#5d9270] [&.ad-reject]:[background:#fcf1ee] [&.ad-reject]:text-[#bc7f70]" title="View details"
                        aria-label={`View ${row?.name || "record"}`} onClick={() => open(row, "view")}>
                        <Eye size={16} />
                      </button>
                      {compact && ["Pending", "UnderReview"].includes(row?.status) && (
                        <>
                          <button type="button" className="ad-icon ad-approve inline-flex justify-center items-center w-[29px] h-[29px] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] [background:#edf6ee] text-[#5d9270] rounded-[6px] shrink-0 [&:hover]:[background:#eef3ee] [&:hover]:text-[#176b60] [&.ad-reject]:[background:#fcf1ee] [&.ad-reject]:text-[#bc7f70]"
                            aria-label={`Approve ${row?.name}`}
                            onClick={() => open(row, "Approved")}><Check size={16} /></button>
                          <button type="button" className="ad-icon ad-reject inline-flex justify-center items-center w-[29px] h-[29px] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] [background:#fcf1ee] text-[#bc7f70] rounded-[6px] shrink-0 [&:hover]:[background:#eef3ee] [&:hover]:text-[#176b60] [&.ad-approve]:[background:#edf6ee] [&.ad-approve]:text-[#5d9270]"
                            aria-label={`Reject ${row?.name}`}
                            onClick={() => open(row, "Rejected")}><X size={16} /></button>
                        </>
                      )}
                      {!compact && editable.length > 0 && (
                        <button type="button" className="ad-icon inline-flex justify-center items-center w-[29px] h-[29px] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] [background:none] text-[#84958a] rounded-[6px] shrink-0 [&:hover]:[background:#eef3ee] [&:hover]:text-[#176b60] [&.ad-approve]:[background:#edf6ee] [&.ad-approve]:text-[#5d9270] [&.ad-reject]:[background:#fcf1ee] [&.ad-reject]:text-[#bc7f70]" title="Edit"
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
        <footer className="ad-table-footer [&_select]:text-[10px] [&_select]:[padding:7px_9px] [padding:13px_20px] [@media(width<=767px)]:[padding:13px_14px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf1e8] flex justify-between items-center [@media(width<=767px)]:items-start gap-[12px] [@media(width<=767px)]:gap-[10px] text-[9px] text-[#9aa38f] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[9px] [@media(width<=767px)]:[&_>_div]:gap-[6px] [&_.ad-button]:text-[9px] [&_.ad-button]:[padding:5px_9px] [@media(width<=767px)]:flex-wrap">
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
            <button type="button" className="ad-icon inline-flex justify-center items-center w-[29px] h-[29px] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] [background:none] text-[#84958a] rounded-[6px] shrink-0 [&:hover]:[background:#eef3ee] [&:hover]:text-[#176b60] [&.ad-approve]:[background:#edf6ee] [&.ad-approve]:text-[#5d9270] [&.ad-reject]:[background:#fcf1ee] [&.ad-reject]:text-[#bc7f70]" aria-label="Previous page"
              disabled={page === 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}>
              <ChevronLeft size={17} />
            </button>
            <span>{page} / {totalPages}</span>
            <button type="button" className="ad-icon inline-flex justify-center items-center w-[29px] h-[29px] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] [background:none] text-[#84958a] rounded-[6px] shrink-0 [&:hover]:[background:#eef3ee] [&:hover]:text-[#176b60] [&.ad-approve]:[background:#edf6ee] [&.ad-approve]:text-[#5d9270] [&.ad-reject]:[background:#fcf1ee] [&.ad-reject]:text-[#bc7f70]" aria-label="Next page"
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
            <p className="ad-inline-error [background:#fff1ed] text-[#af6158] p-[12px] rounded-[7px] text-[12px] [margin:12px_0]">
              This category is used by {dialog.row?.usageCount || 0} services.
              Existing history will be preserved. Review affected listings before deactivation.
            </p>
          )}
          {formError && <div className="ad-inline-error [background:#fff1ed] text-[#af6158] p-[12px] rounded-[7px] text-[12px] [margin:12px_0]" role="alert">{formError}</div>}
          {dialog.action === "view" ? (
            <>
              <dl className="ad-details grid grid-cols-[1fr_1fr] gap-[18px] [@media(width<=767px)]:gap-[15px] [margin:0_0_22px] [&_>_div]:min-w-0 [&_dt]:text-[10px] [&_dt]:text-[#98a38e] [&_dt]:mb-[5px] [&_dd]:text-[12px] [&_dd]:m-[0] [&_dd]:[overflow-wrap:anywhere]">
                {asArray(data?.columns).map((key) => (
                  <div key={key}>
                    <dt>{label(key)}</dt>
                    <dd>{display(key, dialog.row?.[key], dialog.row)}</dd>
                  </div>
                ))}
              </dl>
              {resource === "documents" && (
                <button type="button" className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" disabled={busy}
                  onClick={() => downloadDoc(dialog.row.id)}>
                  <FileDown size={16} /> Download document
                </button>
              )}
              {["vendors", "applications"].includes(resource) && (
                <Link className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                  to={`/admin/documents?q=${encodeURIComponent(dialog.row?.name || "")}`}
                  onClick={() => setDialog(null)}>Review vendor documents</Link>
              )}
              <div className="ad-dialog-actions flex gap-[8px] justify-end flex-wrap mt-[18px]">
                {actions.filter((action) =>
                  ["vendors", "applications"].includes(resource)
                    ? canDecide(dialog.row?.status, action)
                    : action !== dialog.row?.status
                ).map((action) => (
                  <button key={action} type="button"
                    className={`ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] ${["Rejected", "Block", "Cancelled"].includes(action) ? "ad-danger" : ""}`}
                    onClick={() => open(dialog.row, action)}>
                    {action === "Approved" ? "Approve" : action === "Rejected" ? "Reject" : action}
                  </button>
                ))}
              </div>
              {["payments", "refunds", "payouts"].includes(resource) && (
                <p className="ad-hint text-[10px]! mt-[15px] text-[#98a38e]!">
                  This ledger reflects recorded transactions. Money movement is handled by the
                  configured payment provider; no transfer is initiated here.
                </p>
              )}
            </>
          ) : (
            <form onSubmit={submit} className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]">
              {["create", "edit"].includes(dialog.action) ? (
                <>
                {editable.map((key) => (
                  <label key={key}>
                    {key === "sellEnabled" ? "Enable Sell (Buy Online)" : key === "bookEnabled" ? "Enable Book (Reservation)" : label(key)}
                    {["sellEnabled","bookEnabled"].includes(key) ? <select name={key} defaultValue={String(dialog.row?.[key] ?? (key==="bookEnabled"))}><option value="true">Yes</option><option value="false">No</option></select> : key === "categoryId" ? (
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
                ))}
                </>
              ) : (
                <>
                  <div className="ad-confirm-summary flex flex-col gap-[5px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4ebdc] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4ebdc] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4ebdc] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4ebdc] [background:#f8faf4] rounded-[8px] p-[15px] items-start [&_>_span:not(.ad-badge)]:text-[11px] [&_>_span:not(.ad-badge)]:text-[#91a081]">
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
              <div className="ad-dialog-actions flex gap-[8px] justify-end flex-wrap mt-[18px]">
                <button type="button" className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" disabled={busy}
                  onClick={() => setDialog(null)}>Cancel</button>
                <button type="submit" disabled={busy}
                  className={`ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] ${["Rejected", "Cancelled", "Block"].includes(dialog.action) ? "ad-danger" : "ad-primary"}`}>
                  {busy ? <><LoaderCircle size={16} className="animate-spin" /> Saving…</> : "Confirm and save"}
                </button>
              </div>
            </form>
          )}
        </AdminDialog>
      )}
    </section>
    </>
  );
}
