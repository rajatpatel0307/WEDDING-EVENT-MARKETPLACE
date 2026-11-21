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
import PackageVisibility from "../components/PackageVisibility";
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
const serviceStatuses = [
  ["Pending", "Pending Approval"],
  ["UnderReview", "Admin Review"],
  ["Approved", "Approved"],
  ["Rejected", "Rejected"],
  ["Suspended", "Suspended"],
  ["Draft", "Draft"],
  ["Active", "Active"],
  ["Inactive", "Inactive"],
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
          {select("status", "Service status", serviceStatuses)}
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
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6e1] bg-white px-3.5 py-2 text-xs font-medium text-[#426057] transition-colors hover:border-[#abc5ba] hover:bg-[#f1f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50"
            type="button"
            onClick={() => apply({ q: values.q || "" })}
          >
            Clear filters
          </button>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#176b60] bg-[#176b60] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#11594f] hover:text-white! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50">Apply filters</button>
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
    <div className="asm-page grid w-full min-w-0 gap-5 text-[#253f3a] sm:gap-6 [&_select]:min-h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-[#dce6e1] [&_select]:bg-white [&_select]:px-3 [&_select]:py-2 [&_select]:text-xs">
      <header className="flex flex-col justify-between gap-4 border-b border-[#e0e8e3] pb-5 sm:flex-row sm:items-center">
        <div>
          <span className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-[#658279]"><span className="size-1.5 rounded-full bg-[#176b60]" />CATALOG OPERATIONS</span>
          <h1 className="my-2! text-2xl! font-semibold! tracking-tight sm:text-[28px]!">{title}</h1>
          <p className="text-[13px]! leading-relaxed text-[#6b7f76]!">
            {kind
              ? `Inspect and manage ${kind} across every vendor service.`
              : "Manage, review and monitor all services listed by vendors."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!kind && (
            <>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6e1] bg-white px-3.5 py-2 text-xs font-medium text-[#426057] transition-colors hover:border-[#abc5ba] hover:bg-[#f1f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50"
                disabled={exporting}
                onClick={exportRows}
              >
                <Download size={16} />
                {exporting ? "Exporting…" : "Export"}
              </button>
              <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#176b60] bg-[#176b60] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#11594f] hover:text-white! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50" to="/admin/services/new">
                <Plus size={17} />
                Add Service
              </Link>
            </>
          )}
          {kind && (
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#176b60] bg-[#176b60] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#11594f] hover:text-white! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50" to="/admin/services">
              Choose a service to manage
            </Link>
          )}
        </div>
      </header>
      {!kind && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5" aria-label="Service statistics" aria-busy={stats.loading || undefined}>
            {statCards.map(([key, label, Icon]) => {
              const featured = key === "revenue";
              return (
                <article
                  key={key}
                  className={`min-w-0 rounded-xl border p-4 transition-shadow hover:shadow-md ${featured ? "col-span-2 flex flex-col justify-between border-[#176b60] bg-[#176b60] text-white sm:col-span-4 xl:col-span-1 xl:col-start-5 xl:row-span-2 xl:row-start-1 xl:p-5" : "border-[#e0e8e3] bg-white shadow-sm"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`pt-1 text-xs font-medium leading-5 ${featured ? "text-teal-50" : "text-[#63796e]"}`}>{label}</span>
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${featured ? "bg-white/15 text-white" : key === "pending" ? "bg-amber-50 text-amber-600" : key === "rejected" || key === "suspended" ? "bg-rose-50 text-rose-500" : "bg-[#eef6f2] text-[#438572]"}`}>
                      <Icon size={17} aria-hidden="true" />
                    </span>
                  </div>
                  <strong className={`mt-3 block font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere] ${featured ? "text-3xl xl:mt-8" : "text-[28px] leading-none text-[#253f3a]"}`}>
                    {stats.data
                      ? key === "revenue"
                        ? money(stats.data[key])
                        : number(stats.data[key])
                      : "—"}
                  </strong>
                  {featured && <span className="mt-3 text-xs leading-5 text-teal-100">Revenue across all services</span>}
                </article>
              );
            })}
          </div>
          {stats.error && (
            <p role="alert">
              Statistics unavailable.{" "}
              <button onClick={() => setRevision((v) => v + 1)}>Retry</button>
            </p>
          )}
        </>
      )}
      <section className="min-w-0 rounded-xl border border-[#e0e8e2] bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-4 flex items-center gap-2 border-b border-[#edf1ed] pb-3">
          <h2 className="text-sm! font-semibold!">{kind ? title : "Service directory"}</h2>
          {data && <span className="rounded-md bg-[#edf4f0] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#4c7160]">{number(data.total)}</span>}
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({
                ...Object.fromEntries(params),
                q: new FormData(e.currentTarget).get("q"),
                page: 1,
              });
            }}
            className="flex min-w-0 basis-full items-center gap-2 xl:basis-auto xl:flex-1"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#cbdcd2] bg-[#f8faf8] px-3 transition-colors focus-within:border-[#176b60] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#176b60]/10">
              <Search size={18} className="shrink-0 text-[#6b947c]" aria-hidden="true" />
              <input
                className="min-w-0 flex-1 border-0! bg-transparent! px-0! py-[10px]! text-[13px] text-[#345746] outline-none! shadow-none! ring-0! placeholder:text-[#8fa397] [@media(width<=767px)]:text-[12px]"
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
            </div>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6e1] bg-white px-3.5 py-2 text-xs font-medium text-[#426057] transition-colors hover:border-[#abc5ba] hover:bg-[#f1f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50">Search</button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            {!kind && (
              <>
                <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6e1] bg-white px-3.5 py-2 text-xs font-medium text-[#426057] transition-colors hover:border-[#abc5ba] hover:bg-[#f1f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50" onClick={() => setFilters(true)}>
                  <SlidersHorizontal size={16} />
                  Filters
                </button>
                <select
                  aria-label="Filter by service status"
                  value={params.get("status") || ""}
                  onChange={(e) =>
                    update({
                      ...Object.fromEntries(params),
                      status: e.target.value,
                      page: 1,
                    })
                  }
                >
                  <option value="">All statuses</option>
                  {serviceStatuses.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6e1] bg-white px-3.5 py-2 text-xs font-medium text-[#426057] transition-colors hover:border-[#abc5ba] hover:bg-[#f1f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50"
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
                        kind === "packages" ? "Package status" : "Status",
                        ...(kind === "packages" ? ["Customer visibility"] : []),
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
                        {kind === "packages" && <td className="min-w-[240px]"><PackageVisibility value={row} /></td>}
                        <td>
                          <Link
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6e1] bg-white px-3.5 py-2 text-xs font-medium text-[#426057] transition-colors hover:border-[#abc5ba] hover:bg-[#f1f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50"
                            to={`/admin/services/${row.serviceId}?tab=${kind === "items" ? "Items" : "Packages"}`}
                          >
                            View & manage
                          </Link>
                          {kind === "packages" && <Link
                            className="mt-2 block text-[11px] text-[#176b60] underline underline-offset-4"
                            to={`/admin/services/${row.serviceId}`}
                          >View parent service</Link>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <div className="asm-table-wrap asm-desktop w-full min-w-0 [@media(width<=1100px)]:hidden">
                  <table className="asm-table w-full table-fixed border-collapse text-center text-[11px] [&_th]:font-semibold [&_th]:text-[10px] [&_th]:tracking-[0.3px] [&_th]:uppercase [&_th]:text-center [&_th]:[padding:10px_6px] [&_th]:[background:#f6f9f6] [&_th]:text-[#7b8b80] [&_th]:border-b [&_th]:border-[#e5ebe6] [&_th]:[overflow-wrap:normal] [&_td]:border-b [&_td]:border-[#edf1ed] [&_td]:px-2 [&_td]:py-4 [&_td]:align-middle [&_td]:[overflow-wrap:anywhere] [&_tbody_tr:hover]:bg-[#fbfcfa]">
                    <colgroup>
                      {["w-[21%]", "w-[10%]", "w-[10%]", "w-[9%]", "w-[9%]", "w-[11%]", "w-[8%]", "w-[6%]", "w-[16%]"].map((width, i) => <col key={i} className={width} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          "Service",
                          "Vendor",
                          "Category",
                          "Price",
                          "Location",
                          "Approval Status",
                          "Active Status",
                          "Bookings",
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
                              className="asm-identity flex min-w-0 items-center justify-start gap-[8px] text-left [&_img]:size-[40px] [&_img]:shrink-0 [&_img]:rounded-[7px] [&_img]:object-cover [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-semibold [&_strong]:leading-[1.5] [&_small]:mt-[3px] [&_small]:block [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_small]:text-[10px] [&_small]:text-[#88938c]"
                              to={`/admin/services/${row.id}`}
                            >
                              {row.image ? (
                                <img src={row.image} alt="" />
                              ) : (
                                <span className="asm-image-placeholder w-[40px] h-[40px] object-cover shrink-0 rounded-[9px] [background:#edf3ed] grid place-items-center text-[#77988b]">
                                  <BriefcaseBusiness size={22} />
                                </span>
                              )}
                              <span className="min-w-0">
                                <strong>{row.name}</strong>
                                <small>
                                  {row.shortDescription ||
                                    "No short description"}
                                </small>
                              </span>
                            </Link>
                          </td>
                          <td>
                            <Link className="text-[#526f60] no-underline hover:text-[#176b60] hover:underline [overflow-wrap:anywhere]" to={`/admin/vendors/${row.vendorId}`}>
                              {row.vendor}
                            </Link>
                          </td>
                          <td>{row.category}</td>
                          <td className="font-semibold tabular-nums">
                            {money(row.price)}
                          </td>
                          <td>{row.location || "—"}</td>
                          <td className="[&>div]:justify-center">
                            <Status status={row.status} />
                          </td>
                          <td>
                            <span
                              className={`asm-active text-[11px] text-[#8a938e] [&:before]:[content:''] [&:before]:inline-block [&:before]:w-[6px] [&:before]:h-[6px] [&:before]:rounded-[50%] [&:before]:[background:#a6ada8] [&:before]:mr-[7px] [&.on]:text-[#2a7a58] [&.on:before]:[background:#4f976a] ${row.active ? "on" : ""}`}
                            >
                              {row.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>{number(row.bookings)}</td>
                          <td className="[&>div]:justify-center">
                            <ServiceActions row={row} action={action} iconsOnly />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="asm-mobile hidden [@media(width<=1100px)]:grid [@media(width<=1100px)]:gap-[12px] [@media(width<=1100px)]:[&_article]:p-[16px] [@media(width<=1100px)]:[&_article]:[border-top-width:1px] [@media(width<=1100px)]:[&_article]:[border-top-style:solid] [@media(width<=1100px)]:[&_article]:[border-top-color:#e4ece6] [@media(width<=1100px)]:[&_article]:[border-right-width:1px] [@media(width<=1100px)]:[&_article]:[border-right-style:solid] [@media(width<=1100px)]:[&_article]:[border-right-color:#e4ece6] [@media(width<=1100px)]:[&_article]:[border-bottom-width:1px] [@media(width<=1100px)]:[&_article]:[border-bottom-style:solid] [@media(width<=1100px)]:[&_article]:[border-bottom-color:#e4ece6] [@media(width<=1100px)]:[&_article]:[border-left-width:1px] [@media(width<=1100px)]:[&_article]:[border-left-style:solid] [@media(width<=1100px)]:[&_article]:[border-left-color:#e4ece6] [@media(width<=1100px)]:[&_article]:rounded-[10px] [@media(width<=1100px)]:[&_article]:text-[12px] [@media(width<=1100px)]:[&_article]:relative [@media(width<=1100px)]:[&_article_>_p]:text-[#8b9a90] [@media(width<=1100px)]:[&_article_>_p]:[margin:12px_0] [@media(width<=1100px)]:[&_article_>_small]:block [@media(width<=1100px)]:[&_article_>_small]:mt-[14px] [@media(width<=1100px)]:[&_article_>_small]:text-[#8b9a90] [@media(width<=1100px)]:[&_.asm-identity]:min-w-0 [@media(width<=1100px)]:[&_.asm-identity_small]:max-w-[160px]">
                  {data.rows.map((row) => (
                    <article key={row.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
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
                        <ServiceActions row={row} action={action} iconsOnly />
                      </div>
                      <p>{row.shortDescription}</p>
                      <Status status={row.status} active={!!row.active} />
                      <div className="flex justify-between mt-3">
                        <span>
                          {row.category} · {row.location}
                        </span>
                        <strong>{money(row.price)}</strong>
                      </div>
                      <small>{number(row.bookings)} bookings</small>
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
                ? `Permanently delete “${dialog.service.name}”? Services with booking or offer history cannot be deleted.`
                : `Create an inactive draft copy of “${dialog.service.name}”, including its items, packages and images?`}
            </p>
            {error && <p role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6e1] bg-white px-3.5 py-2 text-xs font-medium text-[#426057] transition-colors hover:border-[#abc5ba] hover:bg-[#f1f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#176b60] bg-[#176b60] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#11594f] hover:text-white! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] disabled:cursor-wait disabled:opacity-50"
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
