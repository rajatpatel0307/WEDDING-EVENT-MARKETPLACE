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
        className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]"
        onSubmit={(e) => {
          e.preventDefault();
          apply(values);
        }}
      >
        <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
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
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            type="button"
            onClick={() => apply({ q: values.q || "" })}
          >
            Clear filters
          </button>
          <button className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]">Apply filters</button>
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
    <div className="asm-page grid gap-[24px] text-[#253f3a] [&_select]:[padding:9px_12px] [&_select]:text-[12px] [&_select]:[border-top-width:1px] [&_select]:[border-top-style:solid] [&_select]:[border-top-color:#dce5df] [&_select]:[border-right-width:1px] [&_select]:[border-right-style:solid] [&_select]:[border-right-color:#dce5df] [&_select]:[border-bottom-width:1px] [&_select]:[border-bottom-style:solid] [&_select]:[border-bottom-color:#dce5df] [&_select]:[border-left-width:1px] [&_select]:[border-left-style:solid] [&_select]:[border-left-color:#dce5df] [&_select]:rounded-[7px] [&_select]:[background:#fff]">
      <header className="asm-heading flex items-center [@media(width<=1200px)]:items-start justify-between gap-[24px] [@media(width<=767px)]:gap-[18px] [&_h1]:text-[30px] [@media(width<=767px)]:[&_h1]:text-[26px] [&_h1]:leading-[1.2] [&_h1]:[margin:8px_0_10px] [&_h1]:font-[650] [&_h1]:tracking-[-0.7px] [&_p]:text-[14px] [&_p]:text-[#7b8a83] [@media(width<=767px)]:flex-col">
        <div>
          <span className="ad-eyebrow text-[8px] [@media(width<=767px)]:text-[7px] tracking-[1.7px] text-[#7d9183] flex items-center gap-[6px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:[background:#bfa471] [&_>_span]:rounded-[50%]">CATALOG OPERATIONS</span>
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
                className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                disabled={exporting}
                onClick={exportRows}
              >
                <Download size={16} />
                {exporting ? "Exporting…" : "Export"}
              </button>
              <Link className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" to="/admin/services/new">
                <Plus size={17} />
                Add Service
              </Link>
            </>
          )}
          {kind && (
            <Link className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" to="/admin/services">
              Choose a service to manage
            </Link>
          )}
        </div>
      </header>
      {!kind && (
        <>
          <div className="asm-stats grid grid-cols-[repeat(5,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(767px<width<=1200px)]:grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[12px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e1e9e4] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e1e9e4] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e1e9e4] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e1e9e4] [&_article]:rounded-[12px] [&_article]:[background:#fff] [&_article]:p-[18px] [@media(width<=767px)]:[&_article]:p-[13px] [&_article]:min-w-0 [&_article_>_div]:flex [&_article_>_div]:justify-between [&_article_>_div]:items-center [&_article_>_div]:gap-[10px] [&_span]:text-[12px] [&_span]:text-[#71827a] [&_strong]:block [&_strong]:text-[25px] [@media(width<=767px)]:[&_strong]:text-[21px] [&_strong]:font-[650] [&_strong]:mt-[9px] [&_strong]:tracking-[-0.6px] [&_strong]:[overflow-wrap:anywhere] [&_svg]:text-[#73978b]">
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
          <nav className="asm-status-tabs flex gap-[7px] [overflow-x:auto] pb-[3px] [&_button]:text-[13px] [&_button]:[padding:10px_16px] [&_button]:rounded-[8px] [&_button]:whitespace-nowrap [&_button]:text-[#74817c] [&_button[aria-current]]:[background:#e5efea] [&_button[aria-current]]:text-[#185b4d] [&_button[aria-current]]:font-[650]" aria-label="Service status">
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
      <section className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
        <div className="asm-toolbar flex justify-between gap-[14px] items-center [@media(width<=767px)]:items-stretch flex-wrap mb-[22px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({
                ...Object.fromEntries(params),
                q: new FormData(e.currentTarget).get("q"),
                page: 1,
              });
            }}
            className="asm-search flex items-center gap-[10px] flex-1 min-w-[260px] [@media(width<=767px)]:min-w-0 [&_>_svg]:text-[#89978f] [&_input]:min-w-[100px] [&_input]:flex-1 [&_input]:[border-top-width:0] [&_input]:[border-top-style:none] [&_input]:[border-top-color:currentColor] [&_input]:[border-right-width:0] [&_input]:[border-right-style:none] [&_input]:[border-right-color:currentColor] [&_input]:[border-bottom-width:0] [&_input]:[border-bottom-style:none] [&_input]:[border-bottom-color:currentColor] [&_input]:[border-left-width:0] [&_input]:[border-left-style:none] [&_input]:[border-left-color:currentColor] [&_input]:[background:transparent] [&_input]:text-[13px] [@media(width<=767px)]:[&_input]:text-[12px] [&_input]:[padding:10px_0] [@media(width<=767px)]:[flex-basis:100%]"
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
            <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]">Search</button>
          </form>
          <div className="flex flex-wrap gap-2">
            {!kind && (
              <>
                <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={() => setFilters(true)}>
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
                  className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
          <p role="alert" className="asm-alert [padding:15px_18px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edd3d5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#edd3d5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edd3d5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#edd3d5] [background:#fff5f4] rounded-[9px] text-[#a8555b] text-[13px]">
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
              <div className="asm-table-wrap [overflow-x:auto] overflow-y-auto pb-[8px]">
                <table className="asm-table w-full border-collapse text-left text-[12px] [&_th]:font-[600] [&_th]:text-[10px] [&_th]:tracking-[0.6px] [&_th]:uppercase [&_th]:whitespace-nowrap [&_th]:[padding:13px_14px] [&_th]:[background:#f6f9f6] [&_th]:text-[#7b8b80] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#e5ebe6] [&_td]:[border-bottom-width:1px] [&_td]:[border-bottom-style:solid] [&_td]:[border-bottom-color:#edf1ed] [&_td]:[padding:16px_14px] [&_td]:[vertical-align:middle] [&_tbody_tr:hover]:[background:#fbfcfa] [@media(width<=1200px)]:[&_.asm-id]:max-w-[75px]">
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
                            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
                <div className="asm-table-wrap asm-desktop [overflow-x:auto] overflow-y-auto pb-[8px] [@media(width<=767px)]:hidden [@media(768px<=width<=1200px)]:[&_th:nth-child(1)]:hidden [@media(768px<=width<=1200px)]:[&_td:nth-child(1)]:hidden [@media(768px<=width<=1200px)]:[&_th:nth-child(5)]:hidden [@media(768px<=width<=1200px)]:[&_td:nth-child(5)]:hidden [@media(768px<=width<=1200px)]:[&_th:nth-child(13)]:hidden [@media(768px<=width<=1200px)]:[&_td:nth-child(13)]:hidden">
                  <table className="asm-table w-full border-collapse text-left text-[12px] [&_th]:font-[600] [&_th]:text-[10px] [&_th]:tracking-[0.6px] [&_th]:uppercase [&_th]:whitespace-nowrap [&_th]:[padding:13px_14px] [&_th]:[background:#f6f9f6] [&_th]:text-[#7b8b80] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#e5ebe6] [&_td]:[border-bottom-width:1px] [&_td]:[border-bottom-style:solid] [&_td]:[border-bottom-color:#edf1ed] [&_td]:[padding:16px_14px] [&_td]:[vertical-align:middle] [&_tbody_tr:hover]:[background:#fbfcfa] [@media(width<=1200px)]:[&_.asm-id]:max-w-[75px]">
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
                          <td className="asm-id text-[10px] [font-family:ui-monospace,_monospace] max-w-[110px] [overflow-x:hidden] [overflow-y:hidden] [text-overflow:ellipsis] whitespace-nowrap text-[#84938a]" title={row.id}>
                            {row.id}
                          </td>
                          <td>
                            <Link
                              className="asm-identity flex gap-[11px] items-center min-w-[180px] [&_img]:w-[48px] [&_img]:h-[48px] [&_img]:object-cover [&_img]:shrink-0 [&_img]:rounded-[9px] [&_img]:[background:#edf3ed] [&_img]:grid [&_img]:place-items-center [&_img]:text-[#77988b] [&_strong]:block [&_strong]:font-[600] [&_strong]:text-[13px] [&_small]:block [&_small]:text-[11px] [&_small]:text-[#88938c] [&_small]:mt-[4px] [&_small]:max-w-[190px] [&_small]:[overflow-x:hidden] [&_small]:[overflow-y:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:whitespace-nowrap"
                              to={`/admin/services/${row.id}`}
                            >
                              {row.image ? (
                                <img src={row.image} alt="" />
                              ) : (
                                <span className="asm-image-placeholder w-[48px] h-[48px] object-cover shrink-0 rounded-[9px] [background:#edf3ed] grid place-items-center text-[#77988b]">
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
                            <div className="asm-identity flex gap-[11px] items-center min-w-[180px] [&_img]:w-[48px] [&_img]:h-[48px] [&_img]:object-cover [&_img]:shrink-0 [&_img]:rounded-[9px] [&_img]:[background:#edf3ed] [&_img]:grid [&_img]:place-items-center [&_img]:text-[#77988b] [&_strong]:block [&_strong]:font-[600] [&_strong]:text-[13px] [&_small]:block [&_small]:text-[11px] [&_small]:text-[#88938c] [&_small]:mt-[4px] [&_small]:max-w-[190px] [&_small]:[overflow-x:hidden] [&_small]:[overflow-y:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:whitespace-nowrap">
                              {row.vendorLogo && (
                                <img src={row.vendorLogo} alt="" />
                              )}
                              <span>
                                <Link to={`/admin/vendors/${row.vendorId}`}>
                                  {row.vendor}
                                </Link>
                                <small className="asm-id text-[10px] [font-family:ui-monospace,_monospace] max-w-[110px] [overflow-x:hidden] [overflow-y:hidden] [text-overflow:ellipsis] whitespace-nowrap text-[#84938a]" title={row.vendorId}>
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
                              className={`asm-active whitespace-nowrap text-[11px] text-[#8a938e] [&:before]:[content:''] [&:before]:inline-block [&:before]:w-[6px] [&:before]:h-[6px] [&:before]:rounded-[50%] [&:before]:[background:#a6ada8] [&:before]:mr-[7px] [&.on]:text-[#2a7a58] [&.on:before]:[background:#4f976a] ${row.active ? "on" : ""}`}
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
                <div className="asm-mobile hidden [@media(width<=767px)]:grid [@media(width<=767px)]:gap-[12px] [@media(width<=767px)]:[&_article]:p-[16px] [@media(width<=767px)]:[&_article]:[border-top-width:1px] [@media(width<=767px)]:[&_article]:[border-top-style:solid] [@media(width<=767px)]:[&_article]:[border-top-color:#e4ece6] [@media(width<=767px)]:[&_article]:[border-right-width:1px] [@media(width<=767px)]:[&_article]:[border-right-style:solid] [@media(width<=767px)]:[&_article]:[border-right-color:#e4ece6] [@media(width<=767px)]:[&_article]:[border-bottom-width:1px] [@media(width<=767px)]:[&_article]:[border-bottom-style:solid] [@media(width<=767px)]:[&_article]:[border-bottom-color:#e4ece6] [@media(width<=767px)]:[&_article]:[border-left-width:1px] [@media(width<=767px)]:[&_article]:[border-left-style:solid] [@media(width<=767px)]:[&_article]:[border-left-color:#e4ece6] [@media(width<=767px)]:[&_article]:rounded-[10px] [@media(width<=767px)]:[&_article]:text-[12px] [@media(width<=767px)]:[&_article]:relative [@media(width<=767px)]:[&_article_>_p]:text-[#8b9a90] [@media(width<=767px)]:[&_article_>_p]:[margin:12px_0] [@media(width<=767px)]:[&_article_>_small]:block [@media(width<=767px)]:[&_article_>_small]:mt-[14px] [@media(width<=767px)]:[&_article_>_small]:text-[#8b9a90] [@media(width<=767px)]:[&_.asm-menu[open]_>_div]:top-[100%] [@media(width<=767px)]:[&_.asm-menu[open]_>_div]:bottom-[auto] [@media(width<=767px)]:[&_.asm-identity]:min-w-0 [@media(width<=767px)]:[&_.asm-identity_small]:max-w-[160px]">
                  {data.rows.map((row) => (
                    <article key={row.id}>
                      <div className="flex justify-between gap-3">
                        <Link
                          className="asm-identity flex gap-[11px] items-center min-w-[180px] [&_img]:w-[48px] [&_img]:h-[48px] [&_img]:object-cover [&_img]:shrink-0 [&_img]:rounded-[9px] [&_img]:[background:#edf3ed] [&_img]:grid [&_img]:place-items-center [&_img]:text-[#77988b] [&_strong]:block [&_strong]:font-[600] [&_strong]:text-[13px] [&_small]:block [&_small]:text-[11px] [&_small]:text-[#88938c] [&_small]:mt-[4px] [&_small]:max-w-[190px] [&_small]:[overflow-x:hidden] [&_small]:[overflow-y:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:whitespace-nowrap"
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
          <div className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]">
            <p>
              {dialog.action === "delete"
                ? `Permanently delete “${dialog.service.name}”? Services with booking, quotation or offer history cannot be deleted.`
                : `Create an inactive draft copy of “${dialog.service.name}”, including its items, packages and images?`}
            </p>
            {error && <p role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
