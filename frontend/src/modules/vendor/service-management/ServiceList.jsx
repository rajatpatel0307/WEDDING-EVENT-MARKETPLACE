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
} from "lucide-react";
import {
  Heading,
  ErrorView,
  Empty,
  useVendorData,
} from "../components/WorkspaceUI";
import { money, date } from "../services/workspace.api";
import { AddButton, Status, ServiceActions, Notice } from "./shared";

const statIcons = [
  BriefcaseBusiness,
  CheckCircle2,
  FilePenLine,
  Clock3,
  ShieldCheck,
  XCircle,
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
  ["totalBookings", "Total Bookings"],
  ["averageRating", "Average Rating"],
];

const approvalTabs = [
  ["", "All Services"],
  ["Draft", "Drafts"],
  ["Pending", "Pending Approval"],
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

  const path = useMemo(() => `/services?${params.toString()}`, [params]);
  const state = useVendorData(path, version);
  const metadata = useVendorData("/services/metadata");

  const change = useCallback((key, value) => {
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (value) n.set(key, value);
      else n.delete(key);
      if (key !== "page") n.set("page", "1");
      if (key === "category") n.delete("subcategory");
      return n;
    });
  }, [setParams]);

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
    <label className="sm-filter" key={key}>
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
    <div className="sm-page animate-fade-in">
      <Heading
        title="My Services"
        description="Create and manage all your wedding and event services with elite precision."
        eyebrow="SERVICE STUDIO"
      >
        <AddButton />
      </Heading>

      <Notice message={notice} />

      {data && !data.canSubmit && (
        <div className="sm-warning flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500 shrink-0" />
          <span>
            You can prepare drafts now. Your business must be approved and active
            before you can submit a service for public listing.
          </span>
        </div>
      )}

      {/* Enhanced Stats Row with Subtle Glow & Hover Lift */}
      <div className="sm-stats">
        {statsConfig.map(([key, label], i) => {
          const Icon = statIcons[i];
          const rawValue = data?.stats?.[key];
          const formattedValue = loading
            ? "—"
            : key === "averageRating"
              ? Number(rawValue || 0).toFixed(1)
              : Number(rawValue || 0).toLocaleString("en-IN");

          return (
            <div className="sm-stat transition-all duration-200 hover:-translate-y-0.5" key={key}>
              <span className={`sm-stat-icon tone-${i % 4}`}>
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

      <section className="vw-panel sm-list">
        <div className="sm-list-top">
          <div>
            <h2>
              Your service collection <span>{data?.total || 0}</span>
            </h2>
            <p>Thoughtfully created. Effortlessly managed.</p>
          </div>
          <ArrowUpRight size={22} className="text-muted-foreground opacity-70" />
        </div>

        {/* Improved Tab Styling */}
        <div className="sm-tabs" aria-label="Filter by approval">
          {approvalTabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={(params.get("approval") || "") === value ? "selected" : ""}
              onClick={() => change("approval", value)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Toolbar with Smoother Inputs */}
        <div className="sm-toolbar">
          <label className="sm-search">
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
            className="vw-button flex items-center gap-1.5"
            aria-expanded={filters}
            onClick={() => setFilters((v) => !v)}
          >
            <SlidersHorizontal size={16} />
            Filters
            {params.size > 0 && <span className="w-2 h-2 rounded-full bg-primary inline-block ml-1" />}
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
          <div className="sm-filter-grid animate-slide-down">
            {select(
              "category",
              "Category",
              (metadata.data?.categories || []).map((c) => [c.id, c.name])
            )}
            {select(
              "subcategory",
              "Subcategory",
              (metadata.data?.subcategories || [])
                .filter((s) => !category || s.categoryId === category)
                .map((s) => [s.id, s.name])
            )}
            {select("active", "Active status", [
              ["true", "Active"],
              ["false", "Inactive"],
            ])}
            {select("approval", "Approval status", [
              ["Draft", "Draft"],
              ["Pending", "Pending Approval"],
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
              <label className="sm-filter" key={key}>
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
              className="vw-button text-destructive hover:opacity-80"
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
            className="sm-skeleton"
            role="status"
            aria-label="Loading services"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} />
            ))}
          </div>
        ) : data?.rows?.length ? (
          <>
            <div className="sm-table-scroll">
              <table className="sm-table">
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
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td>
                        <Link
                          className="sm-service-cell group"
                          to={`/vendor/services/${s.id}`}
                        >
                          <img
                            src={s.image || "/images/wedding-details-1024.webp"}
                            alt=""
                            loading="lazy"
                            className="object-cover rounded-md group-hover:scale-105 transition-transform"
                          />
                          <div>
                            <strong className="group-hover:text-primary transition-colors">{s.name}</strong>
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
                      <td className="sm-price font-semibold">
                        {money(s.price)}
                        <small>Starting price</small>
                      </td>
                      <td>{s.location || <span className="text-muted-foreground/60 italic">Not set</span>}</td>
                      <td>
                        <Status
                          status={
                            s.status === "Approved" ? "Approved" : s.status
                          }
                          active={s.active}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className={`sm-dot sm-dot-${s.status.toLowerCase()}`}
                          />
                          <span className="text-sm font-medium">
                            {s.status === "Pending" ? "Pending Approval" : s.status}
                          </span>
                        </div>
                      </td>
                      <td className="font-medium">{s.bookings}</td>
                      <td>
                        <span className="sm-rating px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                          <Star size={13} className="fill-current" />
                          {s.rating ? Number(s.rating).toFixed(1) : "New"}
                        </span>
                      </td>
                      <td className="text-muted-foreground">{date(s.updatedAt)}</td>
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
            <div className="sm-mobile-cards">
              {data.rows.map((s) => (
                <article key={s.id} className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <div className="sm-mobile-service flex items-start gap-3">
                    <img
                      loading="lazy"
                      src={s.image || "/images/wedding-details-1024.webp"}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <Link to={`/vendor/services/${s.id}`}>
                        <h3 className="font-semibold truncate hover:text-primary">{s.name}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {s.category} {s.subcategory ? `· ${s.subcategory}` : ""}
                      </p>
                      <div className="mt-1">
                        <Status status={s.status} active={s.active} />
                      </div>
                    </div>
                  </div>
                  <div className="sm-mobile-meta mt-3 pt-3 border-t flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <strong className="text-base font-bold">{money(s.price)}</strong>
                      <span className="text-xs text-muted-foreground">{s.location || "Location not set"}</span>
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

        <div className="sm-pagination">
          <span>
            {data?.total
              ? `${(page - 1) * pageSize + 1}–${Math.min(
                page * pageSize,
                data.total
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
            className="vw-button"
            disabled={loading || page <= 1}
            onClick={() => change("page", String(page - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="vw-button"
            disabled={loading || !data || page * pageSize >= data.total}
            onClick={() => change("page", String(page + 1))}
          >
            Next
          </button>
        </div>
      </section>

      <p className="sm-footnote flex items-center gap-1.5 text-muted-foreground text-xs mt-4">
        <ShieldCheck size={14} className="text-primary" /> Your listings go live only after approval by
        the MarryNest team.
      </p>
    </div>
  );
}