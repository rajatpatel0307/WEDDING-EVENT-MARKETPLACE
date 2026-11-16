
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FilePenLine,
  Clock3,
  ShieldCheck,
  XCircle,
  Star,
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  Download,
  ShieldBan,
} from "lucide-react";
import {
  Heading,
  ErrorView,
  Empty,
  useVendorData,
} from "../components/WorkspaceUI";
import {
  vendorRequest,
  download,
} from "../services/workspace.api";
import { AddButton, Notice } from "./shared";
import ServiceCollection, { approvalViews } from "./ServiceCollection";

const statsConfig = [
  ["totalServices", "Total Services", "Your complete service collection", BriefcaseBusiness, "text-[#6f8d60]"],
  ["activeServices", "Active Services", "Approved and accepting bookings", CheckCircle2, "text-[#6f967c]"],
  ["draftServices", "Draft Services", "Listings ready for you to finish", FilePenLine, "text-[#8a97a4]"],
  ["pendingApproval", "Pending Approval", "Awaiting approval or under review", Clock3, "text-[#bea15f]"],
  ["approvedServices", "Approved Services", "Reviewed and approved by the team", ShieldCheck, "text-[#6f967c]"],
  ["rejectedServices", "Rejected Services", "Check feedback before resubmitting", XCircle, "text-[#bb8479]"],
  ["suspendedServices", "Suspended Services", "Currently unavailable to customers", ShieldBan, "text-[#a18aaf]"],
  ["averageRating", "Average Rating", "From published customer reviews", Star, "text-[#bea15f]"],
];

const approvalOptions = [
  ["", "All statuses"],
  ["Draft", "Drafts"],
  ["Pending", "Pending Approval"],
  ["UnderReview", "Admin Review"],
  ["Approved", "Approved"],
  ["Rejected", "Rejected"],
  ["Suspended", "Suspended"],
];

const sortOptions = [
  ["updated", "Recently updated"],
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["priceAsc", "Price: low to high"],
  ["priceDesc", "Price: high to low"],
  ["bookings", "Most bookings"],
  ["rating", "Highest rating"],
];

export default function ServiceList() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [filters, setFilters] = useState(false);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const exportServices = async () => {
    setExporting(true);
    setExportError("");
    try {
      const blob = await vendorRequest(`/services/export?${params}`, {
        download: true,
      });
      download(blob, "vendor-services.csv");
      setNotice("Services exported using your current filters.");
    } catch (error) {
      setExportError(error.message);
    } finally {
      setExporting(false);
    }
  };

  const path = useMemo(() => `/services?${params.toString()}`, [params]);
  const state = useVendorData(path, version);
  const metadata = useVendorData("/services/metadata");

  const change = useCallback(
    (key, value) => {
      setParams((p) => {
        const n = new URLSearchParams(p);
        if (value) n.set(key, value);
        else n.delete(key);
        if (key !== "page") n.set("page", "1");
        if (key === "category") n.delete("subcategory");
        return n;
      });
    },
    [setParams],
  );

  useEffect(() => {
    const currentQ = params.get("q") || "";
    if (query !== currentQ) {
      setQuery(currentQ);
    }
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = params.get("q") || "";
      if (query !== currentQ) {
        change("q", query);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, params, change]);

  const { data, loading, error, retry } = state;
  const page = Number(params.get("page") || 1);
  const pageSize = Number(params.get("pageSize") || 12);
  const category = Number(params.get("category") || 0);
  const approval = params.get("approval") || "";
  const view = approvalViews[approval] || approvalViews[""];
  const filterKeys = ["q", "category", "subcategory", "active", "approval", "minPrice", "maxPrice", "location", "rating", "from", "to"];
  const activeFilters = filterKeys.filter((key) => params.get(key));
  const hasFilters = activeFilters.length > 0;
  const hasRefinements = activeFilters.some((key) => key !== "approval");
  const clearFilters = () => {
    setQuery("");
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      filterKeys.forEach((key) => next.delete(key));
      next.set("page", "1");
      return next;
    });
  };
  const changed = (result) => {
    setNotice(result.message);
    setVersion((v) => v + 1);
  };

  const select = (key, label, options) => (
    <label className="
      [&_select]:[background:white] [&_select]:min-h-[39px] [&_select]:[padding:8px_12px]
      [&_select]:[border-top:1px_solid_var(--sm-border)]
      [&_select]:[border-right:1px_solid_var(--sm-border)]
      [&_select]:[border-bottom:1px_solid_var(--sm-border)]
      [&_select]:[border-left:1px_solid_var(--sm-border)] [&_select]:rounded-[7px]
      [&_select]:text-[#667b69] [&_input]:[background:white] [&_input]:min-h-[39px]
      [&_input]:[padding:8px_12px] [&_input]:[border-top:1px_solid_var(--sm-border)]
      [&_input]:[border-right:1px_solid_var(--sm-border)]
      [&_input]:[border-bottom:1px_solid_var(--sm-border)]
      [&_input]:[border-left:1px_solid_var(--sm-border)] [&_input]:rounded-[7px] [&_input]:text-[#667b69]
      flex flex-col gap-[6px] text-[11px] text-[#6b806d]
    " key={key}>
      <span>{label}</span>
      <select
        value={params.get(key) || ""}
        onChange={(e) => change(key, e.target.value)}
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map(([v, n]) => (
          <option key={v} value={v}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="
      [--sm-accent:#2d604b] [--sm-border:#e2e8df] w-full min-w-0 max-w-none m-0
      [&_button:disabled]:opacity-[0.45] [&_button:disabled]:cursor-not-allowed
      [&_:focus-visible]:[outline:2px_solid_#397455] [&_:focus-visible]:[outline-offset:3px]
      animate-fade-in
    ">
      <Heading
        title="My Services"
        description="Manage your wedding and event services."
        eyebrow="SERVICE STUDIO"
      >
        <button
          className="
            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
          "
          disabled={exporting}
          onClick={exportServices}
        >
          <Download size={16} />
          {exporting ? "Exporting…" : "Export Services"}
        </button>
        <AddButton />
      </Heading>

      <Notice message={notice} />
      {exportError && (
        <p className="rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fff0ed] text-[#ab4b3c]" role="alert">
          {exportError}
        </p>
      )}

      {data && !data.canSubmit && (
        <div className="
          rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fbf5e7]
          [border-top:1px_solid_#ede1c6] [border-right:1px_solid_#ede1c6] [border-bottom:1px_solid_#ede1c6]
          [border-left:1px_solid_#ede1c6] text-[#93773e] flex items-center gap-2
        ">
          <Sparkles size={16} className="text-amber-500 shrink-0" />
          <span>
            Service access is {data.access?.serviceStatus || "Pending"}. Administrator approval is required to create or submit services. Existing services remain available for management.
          </span>
        </div>
      )}

      <section aria-label="Service overview" className="my-6 grid grid-cols-2 gap-[13px] [font-family:Inter,_'Segoe_UI',_Arial,_sans-serif] tracking-normal lg:grid-cols-4 service-mobile:gap-2.5">
        {statsConfig.map(([key, label, description, Icon, iconTone]) => {
          const rawValue = data?.stats?.[key];
          const formattedValue =
            loading || error
              ? "—"
              : key === "averageRating"
                ? rawValue == null
                  ? "—"
                  : Number(rawValue).toFixed(1)
                : Number(rawValue || 0).toLocaleString("en-IN");

          return (
            <article
              aria-label={label}
              className={`flex min-w-0 flex-col rounded-[10px] border px-5 py-[18px] shadow-[0_2px_6px_#29402c03] transition-[border-color,box-shadow] duration-200 hover:border-[#adc29b] hover:shadow-[0_4px_14px_#29402c08] service-mobile:px-3.5 service-mobile:py-4 ${key === "totalServices" ? "border-[#dde7d3] bg-[#edf3e7]" : "border-[#e4eadf] bg-white"}`}
              key={key}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="[font-family:inherit] text-[13px] font-semibold leading-5 tracking-normal text-[#526b47]">{label}</h2>
                <Icon size={19} strokeWidth={1.7} aria-hidden="true" className={`shrink-0 ${iconTone}`} />
              </div>
              <div className="my-2 flex min-h-9 items-baseline gap-1.5">
                <strong className="break-words text-[30px] font-semibold leading-tight tracking-normal text-[#476440] tabular-nums service-mobile:text-[26px]">{formattedValue}</strong>
                {key === "averageRating" && !loading && !error && rawValue != null && <span className="text-[11px] text-[#98a48d]">/ 5</span>}
              </div>
              <p className="mt-auto text-[11px] font-normal leading-relaxed tracking-normal text-[#75856c]">{description}</p>
            </article>
          );
        })}
      </section>

      <section className="
        vw-panel [background:#fff] [border-top:1px_solid_#e4eade] [border-right:1px_solid_#e4eade]
        [border-bottom:1px_solid_#e4eade] [border-left:1px_solid_#e4eade] rounded-[10px] min-w-[0]
        overflow-hidden shadow-[0_3px_20px_#29402c04]
      ">
        {/* Toolbar with Smoother Inputs */}
        <div className="
          [padding:20px_25px] flex flex-wrap gap-[12px] items-center [&_select]:[background:white]
          [&_select]:min-h-[39px] [&_select]:[padding:8px_12px]
          [&_select]:[border-top:1px_solid_var(--sm-border)]
          [&_select]:[border-right:1px_solid_var(--sm-border)]
          [&_select]:[border-bottom:1px_solid_var(--sm-border)]
          [&_select]:[border-left:1px_solid_var(--sm-border)] [&_select]:rounded-[7px]
          [&_select]:text-[#667b69] [&_>_select]:max-w-[200px] service-mobile:p-[15px] service-mobile:flex-wrap
          service-mobile:[&_>_select]:[flex:1] service-mobile:[&_>_select]:max-w-[none]
        ">
          <label className="
            relative flex min-w-[180px] items-center gap-[10px] [flex:1] max-w-[550px] text-[#99a793] [&_svg]:absolute
            [&_svg]:left-[12px] [&_input]:w-[100%] [&_input]:[padding:11px_12px_11px_38px]
            [&_input]:rounded-[7px]! [&_input]:[background:#fafbf8] service-mobile:[flex-basis:100%]
            service-mobile:max-w-[none]
          ">
            <Search size={17} />
            <input
              aria-label="Search services"
              placeholder="Search name, service ID, category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="w-[200px] shrink-0 service-mobile:w-auto service-mobile:flex-1 [&_select]:w-full">
            <span className="sr-only">Status</span>
            <select
              aria-label="Filter by status"
              value={approval}
              onChange={(e) => change("approval", e.target.value)}
            >
              {approvalOptions.map(([value, label]) => {
                const count = value
                  ? data?.approvalCounts ? data.approvalCounts[value] || 0 : undefined
                  : data?.stats?.totalServices;
                return <option key={value} value={value}>{label}{!loading && !error && count != null ? ` (${Number(count).toLocaleString("en-IN")})` : ""}</option>;
              })}
            </select>
          </label>
          <button
            type="button"
            className="
              vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
              [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
              rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
              font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
              [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
              [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
              [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
              [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
              flex items-center gap-1.5
            "
            aria-expanded={filters}
            onClick={() => setFilters((v) => !v)}
          >
            <SlidersHorizontal size={16} />
            Filters
            {hasFilters && (
              <span className="w-2 h-2 rounded-full bg-primary inline-block ml-1" />
            )}
          </button>
          <select
            aria-label="Sort services"
            value={params.get("sort") || "updated"}
            onChange={(e) => change("sort", e.target.value)}
          >
            {sortOptions.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* Collapsible Filter Panel with Smooth Presentation */}
        {filters && (
          <div className="
            grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-[15px] [padding:0_25px_25px]
            service-tablet:grid-cols-[repeat(3,_minmax(0,_1fr))] service-mobile:[padding:0_15px_20px]
            service-mobile:grid-cols-[repeat(2,_minmax(0,_1fr))] animate-slide-down
          ">
            {select(
              "category",
              "Category",
              (metadata.data?.categories || []).map((c) => [c.id, c.name]),
            )}
            {select(
              "subcategory",
              "Subcategory",
              (metadata.data?.subcategories || [])
                .filter((s) => !category || s.categoryId === category)
                .map((s) => [s.id, s.name]),
            )}
            {select("active", "Active status", [
              ["true", "Active"],
              ["false", "Inactive"],
            ])}
            {[
              ["minPrice", "Minimum price", "number"],
              ["maxPrice", "Maximum price", "number"],
              ["location", "Location", "text"],
              ["rating", "Minimum rating", "number"],
              ["from", "Created from", "date"],
              ["to", "Created until", "date"],
            ].map(([key, label, type]) => (
              <label className="
                [&_select]:[background:white] [&_select]:min-h-[39px] [&_select]:[padding:8px_12px]
                [&_select]:[border-top:1px_solid_var(--sm-border)]
                [&_select]:[border-right:1px_solid_var(--sm-border)]
                [&_select]:[border-bottom:1px_solid_var(--sm-border)]
                [&_select]:[border-left:1px_solid_var(--sm-border)] [&_select]:rounded-[7px]
                [&_select]:text-[#667b69] [&_input]:[background:white] [&_input]:min-h-[39px]
                [&_input]:[padding:8px_12px] [&_input]:[border-top:1px_solid_var(--sm-border)]
                [&_input]:[border-right:1px_solid_var(--sm-border)]
                [&_input]:[border-bottom:1px_solid_var(--sm-border)]
                [&_input]:[border-left:1px_solid_var(--sm-border)] [&_input]:rounded-[7px] [&_input]:text-[#667b69]
                flex flex-col gap-[6px] text-[11px] text-[#6b806d]
              " key={key}>
                <span>{label}</span>
                <input
                  type={type}
                  min="0"
                  max={key === "rating" ? 5 : undefined}
                  step={key === "rating" ? "0.1" : undefined}
                  value={params.get(key) || ""}
                  onChange={(e) => change(key, e.target.value)}
                />
              </label>
            ))}
            <button
              type="button"
              className="
                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                text-destructive hover:opacity-80
              "
              onClick={clearFilters}
            >
              Reset filters
            </button>
          </div>
        )}

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#edf0e9] bg-[#fbfcf9] px-6 py-3 text-[11px]">
            <span className="mr-1 text-[#8a9982]">Filtered by</span>
            {activeFilters.map((key) => {
              const value = params.get(key);
              const label = key === "approval" ? approvalOptions.find(([v]) => v === value)?.[1] || value
                : key === "active" ? value === "true" ? "Active listings" : "Inactive listings"
                : key === "category" ? metadata.data?.categories?.find((c) => String(c.id) === value)?.name || "Category"
                : key === "subcategory" ? metadata.data?.subcategories?.find((c) => String(c.id) === value)?.name || "Subcategory"
                : `${{q: "Search", minPrice: "Min price", maxPrice: "Max price", location: "Location", rating: "Min rating", from: "From", to: "Until"}[key]}: ${value}`;
              return <button key={key} type="button" aria-label={`Remove ${label} filter`} onClick={() => change(key, "")} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#dae5d5] bg-white px-2.5 py-1 text-[#56734b]"><span className="max-w-[200px] truncate">{label}</span><X size={12} className="shrink-0" /></button>;
            })}
            <button type="button" onClick={clearFilters} className="ml-auto text-[#426c3a] underline underline-offset-2">Clear filters</button>
          </div>
        )}

        {error ? (
          <ErrorView error={error} retry={retry} />
        ) : loading ? (
          <div
            className="
              animate-pulse [padding:10px_25px] [&_>_div]:h-[72px] [&_>_div]:my-3 [&_>_div]:rounded-lg [&_>_div]:bg-[#f1f5ee]
              [&_>_div]:[background:linear-gradient(90deg,_#f3f5ee,_#e9eee3,_#f3f5ee)_0%_0%_/_200%]
              [&_>_div]:animate-vendor-shimmer [&_>_div]:[margin:12px_0] [&_>_div]:rounded-[7px]
              motion-reduce:[&_>_div]:[animation:none]
            "
            role="status"
            aria-label="Loading services"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} />
            ))}
          </div>
        ) : data?.rows?.length ? (
          <ServiceCollection rows={data.rows} onChange={changed} />
        ) : (
          <Empty
            title={page > 1 ? "No services on this page" : hasRefinements ? "No matching services found" : view.empty}
            text={page > 1 ? "Return to the first page to see your current results." : hasRefinements ? "Try a different search or clear your filters to see more services." : view.help}
            action={page > 1 ? <button className="rounded-lg border border-[#dfe7d8] px-4 py-2 text-xs text-[#386348]" onClick={() => change("page", "1")}>Back to first page</button> : hasFilters ? <button className="rounded-lg border border-[#dfe7d8] px-4 py-2 text-xs text-[#386348]" onClick={clearFilters}>View all services</button> : <AddButton />}
          />
        )}

        <div className="
          [padding:19px_25px] flex gap-[10px] items-center text-[11px] text-[#8b9985] [&_>_span]:[flex:1]
          [&_label]:flex [&_label]:items-center [&_label]:gap-[7px] [&_select]:p-[5px]
          [&_.vw-button]:text-[11px] [&_.vw-button]:[padding:6px_12px] service-mobile:p-[15px]
          service-mobile:flex-wrap service-mobile:[&_>_span]:[flex-basis:100%]
          service-mobile:[&_label]:mr-[auto]
        ">
          <span aria-live="polite">
            {loading ? "Loading services…" : error ? "Unable to load services" : data?.total && data?.rows?.length
              ? `${(page - 1) * pageSize + 1}–${Math.min(
                  page * pageSize,
                  data.total,
                )} of ${data.total} services`
              : "0 services"}
          </span>
          <label>
            Per page{" "}
            <select
              value={pageSize}
              onChange={(e) => change("pageSize", e.target.value)}
            >
              {[12, 24, 48, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="
              vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
              [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
              rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
              font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
              [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
              [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
              [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
              [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
            "
            disabled={loading || page <= 1}
            onClick={() => change("page", String(page - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="
              vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
              [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
              rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
              font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
              [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
              [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
              [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
              [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
            "
            disabled={loading || !data || page * pageSize >= data.total}
            onClick={() => change("page", String(page + 1))}
          >
            Next
          </button>
        </div>
      </section>

      <p className="flex justify-center items-center gap-[7px] m-[24px]! text-[10px]! flex items-center gap-1.5 text-muted-foreground text-xs mt-4">
        <ShieldCheck size={14} className="text-primary" /> Your listings go live
        only after approval by the MarryNest team.
      </p>
    </div>
  );
}
