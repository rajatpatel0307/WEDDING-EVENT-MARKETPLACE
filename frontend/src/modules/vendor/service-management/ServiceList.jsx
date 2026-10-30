import { vendorClasses } from "../styles";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FilePenLine,
  Clock3,
  ShieldCheck,
  XCircle,
  CalendarCheck,
  Star,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
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
  money,
  date,
  vendorRequest,
  download,
} from "../services/workspace.api";
import { AddButton, Status, ServiceActions, Notice } from "./shared";

const statIcons = [
  BriefcaseBusiness,
  CheckCircle2,
  FilePenLine,
  Clock3,
  ShieldCheck,
  XCircle,
  ShieldBan,
  CalendarCheck,
  Star,
];

const statsConfig = [
  ["totalServices", "Total Services"],
  ["activeServices", "Active Services"],
  ["draftServices", "Draft Services"],
  ["pendingApproval", "Pending Approval"],
  ["approvedServices", "Approved Services"],
  ["rejectedServices", "Rejected Services"],
  ["suspendedServices", "Suspended Services"],
  ["totalBookings", "Total Bookings"],
  ["averageRating", "Average Rating"],
];

const approvalTabs = [
  ["", "All Services"],
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
      [--sm-accent:#2d604b] [--sm-border:#e2e8df] max-w-[1700px] m-[auto]
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
            You can prepare drafts now. Your business must be approved and
            active before you can submit a service for public listing.
          </span>
        </div>
      )}

      {/* Enhanced Stats Row with Subtle Glow & Hover Lift */}
      <div className="
        grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-[14px] [margin:24px_0]
        service-wide:grid-cols-[repeat(9,_minmax(0,_1fr))]
        service-mobile:grid-cols-[repeat(2,_minmax(0,_1fr))] service-mobile:gap-[10px]
      ">
        {statsConfig.map(([key, label], i) => {
          const Icon = statIcons[i];
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
            <div
              className="
                [background:#fff] [border-top:1px_solid_var(--sm-border)] [border-right:1px_solid_var(--sm-border)]
                [border-bottom:1px_solid_var(--sm-border)] [border-left:1px_solid_var(--sm-border)] rounded-[12px]
                p-[20px] flex items-center gap-[15px] [&_div]:flex [&_div]:flex-col [&_div]:gap-[5px]
                [&_div_>_span]:text-[11px] [&_div_>_span]:text-[#7c8b7e] [&_strong]:text-[25px]
                [&_strong]:leading-[1.3] [&_strong]:font-semibold [&_strong]:tabular-nums
                service-wide:[padding:18px_13px] service-wide:gap-[10px] service-wide:[&_strong]:text-[23px]
                service-mobile:p-[14px] service-mobile:gap-[10px] service-mobile:[&_strong]:text-[22px]
                service-mobile:[&_div_>_span]:text-[10px] transition-all duration-200 hover:-translate-y-0.5
              "
              key={key}
            >
              <span className={vendorClasses(`sm-stat-icon tone-${i % 4}`)}>
                <Icon size={19} />
              </span>
              <div>
                <span>{label}</span>
                <strong>{formattedValue}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <section className="
        vw-panel [background:#fff] [border-top:1px_solid_#e4eade] [border-right:1px_solid_#e4eade]
        [border-bottom:1px_solid_#e4eade] [border-left:1px_solid_#e4eade] rounded-[10px] min-w-[0]
        overflow-hidden overflow-hidden
      ">
        <div className="
          flex justify-between items-center [padding:24px_25px_12px] [&_h2]:text-[17px]
          [&_h2_span]:[font:11px_Inter,_Arial] [&_h2_span]:ml-[8px] [&_h2_span]:[background:#edf3e9]
          [&_h2_span]:[border-top:1px_solid_#dde7d9] [&_h2_span]:[border-right:1px_solid_#dde7d9]
          [&_h2_span]:[border-bottom:1px_solid_#dde7d9] [&_h2_span]:[border-left:1px_solid_#dde7d9]
          [&_h2_span]:[padding:3px_8px] [&_h2_span]:rounded-[20px] [&_p]:[margin:5px_0]
          [&_>_svg]:text-[#b4c2b0] service-mobile:[padding:20px_15px_5px]
        ">
          <div>
            <h2>
              Your service collection <span>{data?.total || 0}</span>
            </h2>
            <p>Thoughtfully created. Effortlessly managed.</p>
          </div>
          <ArrowUpRight
            size={22}
            className="text-muted-foreground opacity-70"
          />
        </div>

        {/* Improved Tab Styling */}
        <div className="
          flex gap-[25px] [padding:0_25px] overflow-auto [border-bottom:1px_solid_var(--sm-border)]
          whitespace-nowrap [&_button]:[border-top:0] [&_button]:[border-right:0]
          [&_button]:[border-bottom:2px_solid_transparent] [&_button]:[border-left:0]
          [&_button]:[background:none] [&_button]:text-[12px] [&_button]:[padding:16px_0]
          [&_button]:text-[#8b978a] [&_button]:font-medium [&_button.selected]:text-[#2d604b]
          [&_button.selected]:[border-bottom-color:#2d604b] service-mobile:gap-[20px]
          service-mobile:[padding:0_15px]
        " aria-label="Filter by approval">
          {approvalTabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                (params.get("approval") || "") === value ? "selected" : ""
              }
              onClick={() => change("approval", value)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Toolbar with Smoother Inputs */}
        <div className="
          [padding:20px_25px] flex gap-[12px] items-center [&_select]:[background:white]
          [&_select]:min-h-[39px] [&_select]:[padding:8px_12px]
          [&_select]:[border-top:1px_solid_var(--sm-border)]
          [&_select]:[border-right:1px_solid_var(--sm-border)]
          [&_select]:[border-bottom:1px_solid_var(--sm-border)]
          [&_select]:[border-left:1px_solid_var(--sm-border)] [&_select]:rounded-[7px]
          [&_select]:text-[#667b69] [&_>_select]:max-w-[200px] service-mobile:p-[15px] service-mobile:flex-wrap
          service-mobile:[&_>_select]:[flex:1] service-mobile:[&_>_select]:max-w-[none]
        ">
          <label className="
            relative flex items-center gap-[10px] [flex:1] max-w-[550px] text-[#99a793] [&_svg]:absolute
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
            {params.size > 0 && (
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
            {select("approval", "Approval status", [
              ["Draft", "Draft"],
              ["Pending", "Pending Approval"],
              ["UnderReview", "Admin Review"],
              ["Approved", "Approved"],
              ["Rejected", "Rejected"],
              ["Suspended", "Suspended"],
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
              onClick={() => {
                setParams({});
                setQuery("");
              }}
            >
              Reset filters
            </button>
          </div>
        )}

        {error ? (
          <ErrorView error={error} retry={retry} />
        ) : loading ? (
          <div
            className="
              [padding:10px_25px] [&_>_div]:h-[55px]
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
          <>
            <div className="overflow-auto service-mobile:hidden">
              <table className="
                w-[100%] border-collapse whitespace-nowrap text-[11px] [&_th]:text-left [&_th]:[background:#f8faf5]
                [&_th]:text-[#8a9987] [&_th]:[padding:13px_16px] [&_th]:[border-top:1px_solid_#edf0e9]
                [&_th]:[border-bottom:1px_solid_#edf0e9] [&_th]:text-[10px] [&_th]:font-medium
                [&_th]:tracking-[0.2px] [&_td]:[padding:18px_16px] [&_td]:[border-bottom:1px_solid_#edf0e9]
                [&_td]:text-[#5f7563] [&_th:first-child]:pl-[25px] [&_td:first-child]:pl-[25px]
                [&_tr:hover]:[background:#fcfdf9] [&_small]:block [&_small]:text-[10px] [&_small]:text-[#a1ab9a]
                [&_small]:mt-[4px]
              ">
                <thead>
                  <tr>
                    {[
                      "Service",
                      "Category",
                      "Price",
                      "Location",
                      "Status",
                      "Approval",
                      "Bookings",
                      "Rating",
                      "Updated",
                      "Actions",
                    ].map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td>
                        <Link
                          className="
                            flex items-center gap-[12px] [&_img]:w-[55px] [&_img]:h-[49px] [&_img]:rounded-[8px]
                            [&_img]:object-cover [&_img]:[background:#edf0e9] [&_strong]:text-[12px] [&_strong]:font-semibold
                            [&_strong]:text-[#3e5d46] [&_strong]:block [&_strong]:max-w-[205px] [&_strong]:overflow-hidden
                            [&_strong]:text-ellipsis group
                          "
                          to={`/vendor/services/${s.id}`}
                        >
                          <img
                            src={s.image || "/images/wedding-details-1024.webp"}
                            alt=""
                            loading="lazy"
                            className="object-cover rounded-md group-hover:scale-105 transition-transform"
                          />
                          <div>
                            <strong className="group-hover:text-primary transition-colors">
                              {s.name}
                            </strong>
                            <small title={s.id}>
                              #{s.id.slice(0, 8).toUpperCase()}
                            </small>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <span className="font-medium">{s.category}</span>
                        <small>{s.subcategory || "—"}</small>
                      </td>
                      <td className="font-semibold tabular-nums [&_small]:font-normal font-semibold">
                        {money(s.price)}
                        <small>Starting price</small>
                      </td>
                      <td>
                        {s.location || (
                          <span className="text-muted-foreground/60 italic">
                            Not set
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={vendorClasses(`vw-badge vw-badge-${s.active ? "active" : "inactive"}`)}
                        >
                          {s.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className={vendorClasses(`sm-dot sm-dot-${s.status.toLowerCase()}`)}
                          />
                          <span className="text-sm font-medium">
                            {s.status === "Pending"
                              ? "Pending Approval"
                              : s.status}
                          </span>
                        </div>
                      </td>
                      <td className="font-medium">{s.bookings}</td>
                      <td>
                        <span className="
                          inline-flex items-center gap-[4px] text-[#8f845f] [&_svg]:[fill:#c6b07b] [&_svg]:[stroke:#c6b07b]
                          px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium inline-flex
                          items-center gap-1
                        ">
                          <Star size={13} className="fill-current" />
                          {s.rating ? Number(s.rating).toFixed(1) : "New"}
                        </span>
                      </td>
                      <td className="text-muted-foreground">
                        {date(s.updatedAt)}
                      </td>
                      <td>
                        <ServiceActions
                          service={s}
                          onChange={(r) => {
                            setNotice(r.message);
                            setVersion((v) => v + 1);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Enhanced Mobile Cards */}
            <div className="
              hidden service-mobile:grid service-mobile:gap-[15px] service-mobile:p-[15px]
              service-mobile:[&_article]:p-[15px]
              service-mobile:[&_article]:[border-top:1px_solid_var(--sm-border)]
              service-mobile:[&_article]:[border-right:1px_solid_var(--sm-border)]
              service-mobile:[&_article]:[border-bottom:1px_solid_var(--sm-border)]
              service-mobile:[&_article]:[border-left:1px_solid_var(--sm-border)]
              service-mobile:[&_article]:rounded-[10px] service-mobile:[&_article]:[background:#fff]
            ">
              {data.rows.map((s) => (
                <article
                  key={s.id}
                  className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="
                    service-mobile:flex service-mobile:gap-[12px] service-mobile:[&_img]:w-[70px]
                    service-mobile:[&_img]:h-[70px] service-mobile:[&_img]:object-cover
                    service-mobile:[&_img]:rounded-[8px] service-mobile:[&_h3]:text-[14px]
                    service-mobile:[&_p]:[margin:3px_0_7px] service-mobile:[&_p]:text-[10px] flex items-start gap-3
                  ">
                    <img
                      loading="lazy"
                      src={s.image || "/images/wedding-details-1024.webp"}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <Link to={`/vendor/services/${s.id}`}>
                        <h3 className="font-semibold truncate hover:text-primary">
                          {s.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {s.category} {s.subcategory ? `· ${s.subcategory}` : ""}
                      </p>
                      <div className="mt-1">
                        <Status status={s.status} active={s.active} />
                      </div>
                    </div>
                  </div>
                  <div className="
                    service-mobile:grid service-mobile:grid-cols-[1fr_1fr] service-mobile:gap-[8px]
                    service-mobile:text-[10px] service-mobile:[margin:15px_0] service-mobile:text-[#89977d]
                    service-mobile:[&_strong]:text-[15px] service-mobile:[&_strong]:text-[#4c704e] mt-3 pt-3 border-t
                    flex flex-col gap-1.5 text-sm
                  ">
                    <div className="flex items-center justify-between">
                      <strong className="text-base font-bold">
                        {money(s.price)}
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        {s.location || "Location not set"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{s.bookings} bookings</span>
                      <span className="flex items-center gap-1 font-medium text-amber-600">
                        <Star size={12} className="fill-current" />
                        {s.rating ? Number(s.rating).toFixed(1) : "New"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-end">
                    <ServiceActions
                      service={s}
                      full
                      onChange={(r) => {
                        setNotice(r.message);
                        setVersion((v) => v + 1);
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <Empty
            title={
              params.size
                ? "No matching services found"
                : "Your next great service starts here"
            }
            text={
              params.size
                ? "Try adjusting your search criteria or clearing your active filters."
                : "Create your first listing, add your best work, and send it for approval."
            }
            action={<AddButton />}
          />
        )}

        <div className="
          [padding:19px_25px] flex gap-[10px] items-center text-[11px] text-[#8b9985] [&_>_span]:[flex:1]
          [&_label]:flex [&_label]:items-center [&_label]:gap-[7px] [&_select]:p-[5px]
          [&_.vw-button]:text-[11px] [&_.vw-button]:[padding:6px_12px] service-mobile:p-[15px]
          service-mobile:flex-wrap service-mobile:[&_>_span]:[flex-basis:100%]
          service-mobile:[&_label]:mr-[auto]
        ">
          <span>
            {data?.total
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
