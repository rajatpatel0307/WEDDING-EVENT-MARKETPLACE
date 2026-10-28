import { useEffect, useState } from "react";
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
const stats = [
  ["totalServices", "Total Services"],
  ["activeServices", "Active Services"],
  ["draftServices", "Draft Services"],
  ["pendingApproval", "Pending Approval"],
  ["approvedServices", "Approved Services"],
  ["rejectedServices", "Rejected Services"],
  ["totalBookings", "Total Bookings"],
  ["averageRating", "Average Rating"],
];
export default function ServiceList() {
  const [params, setParams] = useSearchParams(),
    [query, setQuery] = useState(params.get("q") || ""),
    [filters, setFilters] = useState(false),
    [version, setVersion] = useState(0),
    [notice, setNotice] = useState("");
  const path = `/services?${params}`,
    state = useVendorData(path, version),
    metadata = useVendorData("/services/metadata");
  const change = (key, value) => {
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (value) n.set(key, value);
      else n.delete(key);
      if (key !== "page") n.set("page", "1");
      if (key === "category") n.delete("subcategory");
      return n;
    });
  };
  useEffect(() => {
    setQuery(params.get("q") || "");
  }, [params]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== (params.get("q") || "")) change("q", query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);
  const { data, loading, error, retry } = state,
    page = Number(params.get("page") || 1),
    pageSize = Number(params.get("pageSize") || 12);
  const category = Number(params.get("category") || 0);
  const select = (key, label, options) => (
    <label className="sm-filter">
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
    <div className="sm-page">
      <Heading
        title="My Services"
        description="Create and manage all your wedding and event services."
        eyebrow="SERVICE STUDIO"
      >
        <AddButton />
      </Heading>
      <Notice message={notice} />
      {data && !data.canSubmit && (
        <div className="sm-warning">
          You can prepare drafts now. Your business must be approved and active
          before you submit a service.
        </div>
      )}
      <div className="sm-stats">
        {stats.map(([key, label], i) => {
          const Icon = statIcons[i];
          return (
            <div className="sm-stat" key={key}>
              <span className={`sm-stat-icon tone-${i % 4}`}>
                <Icon size={19} />
              </span>
              <div>
                <span>{label}</span>
                <strong>
                  {loading
                    ? "—"
                    : key === "averageRating"
                      ? Number(data?.stats?.[key] || 0).toFixed(1)
                      : Number(data?.stats?.[key] || 0).toLocaleString("en-IN")}
                </strong>
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
          <ArrowUpRight size={22} />
        </div>
        <div className="sm-tabs" aria-label="Filter by approval">
          {[
            ["", "All Services"],
            ["Draft", "Drafts"],
            ["Pending", "Pending Approval"],
            ["Approved", "Approved"],
            ["Rejected", "Rejected"],
            ["Suspended", "Suspended"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={
                (params.get("approval") || "") === value ? "selected" : ""
              }
              onClick={() => change("approval", value)}
            >
              {label}
            </button>
          ))}
        </div>
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
            className="vw-button"
            aria-expanded={filters}
            onClick={() => setFilters((v) => !v)}
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
          <select
            aria-label="Sort services"
            value={params.get("sort") || "updated"}
            onChange={(e) => change("sort", e.target.value)}
          >
            {[
              ["updated", "Recently updated"],
              ["newest", "Newest first"],
              ["oldest", "Oldest first"],
              ["priceAsc", "Price: low to high"],
              ["priceDesc", "Price: high to low"],
              ["bookings", "Most bookings"],
              ["rating", "Highest rating"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {filters && (
          <div className="sm-filter-grid">
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
              className="vw-button"
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
                    <tr key={s.id}>
                      <td>
                        <Link
                          className="sm-service-cell"
                          to={`/vendor/services/${s.id}`}
                        >
                          <img
                            src={s.image || "/images/wedding-details-1024.webp"}
                            alt=""
                            loading="lazy"
                          />
                          <div>
                            <strong>{s.name}</strong>
                            <small title={s.id}>
                              #{s.id.slice(0, 8).toUpperCase()}
                            </small>
                          </div>
                        </Link>
                      </td>
                      <td>
                        {s.category}
                        <small>{s.subcategory || "—"}</small>
                      </td>
                      <td className="sm-price">
                        {money(s.price)}
                        <small>Starting price</small>
                      </td>
                      <td>{s.location || "Not set"}</td>
                      <td>
                        <Status
                          status={
                            s.status === "Approved" ? "Approved" : s.status
                          }
                          active={s.active}
                        />
                      </td>
                      <td>
                        <span
                          className={`sm-dot sm-dot-${s.status.toLowerCase()}`}
                        />
                        {s.status === "Pending" ? "Pending Approval" : s.status}
                      </td>
                      <td>{s.bookings}</td>
                      <td>
                        <span className="sm-rating">
                          <Star size={13} />
                          {s.rating ? Number(s.rating).toFixed(1) : "New"}
                        </span>
                      </td>
                      <td>{date(s.updatedAt)}</td>
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
            <div className="sm-mobile-cards">
              {data.rows.map((s) => (
                <article key={s.id}>
                  <div className="sm-mobile-service">
                    <img
                      loading="lazy"
                      src={s.image || "/images/wedding-details-1024.webp"}
                      alt=""
                    />
                    <div>
                      <Link to={`/vendor/services/${s.id}`}>
                        <h3>{s.name}</h3>
                      </Link>
                      <p>
                        {s.category} · {s.subcategory}
                      </p>
                      <Status status={s.status} active={s.active} />
                    </div>
                  </div>
                  <div className="sm-mobile-meta">
                    <strong>{money(s.price)}</strong>
                    <span>{s.location || "Location not set"}</span>
                    <span>
                      {s.bookings} bookings · ★ {s.rating || "New"}
                    </span>
                    <span>Updated {date(s.updatedAt)}</span>
                  </div>
                  <ServiceActions
                    service={s}
                    full
                    onChange={(r) => {
                      setNotice(r.message);
                      setVersion((v) => v + 1);
                    }}
                  />
                </article>
              ))}
            </div>
          </>
        ) : (
          <Empty
            title={
              params.size
                ? "No matching services"
                : "Your next great service starts here"
            }
            text={
              params.size
                ? "Try a different search or clear your filters."
                : "Create your first listing, add your best work, and send it for approval."
            }
            action={<AddButton />}
          />
        )}
        <div className="sm-pagination">
          <span>
            {data?.total
              ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total} services`
              : "0 services"}
          </span>
          <label>
            Per page{" "}
            <select
              value={pageSize}
              onChange={(e) => change("pageSize", e.target.value)}
            >
              {[12, 24, 48, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            className="vw-button"
            disabled={loading || page <= 1}
            onClick={() => change("page", String(page - 1))}
          >
            Previous
          </button>
          <button
            className="vw-button"
            disabled={loading || !data || page * pageSize >= data.total}
            onClick={() => change("page", String(page + 1))}
          >
            Next
          </button>
        </div>
      </section>
      <p className="sm-footnote">
        <ShieldCheck size={14} /> Your listings go live only after approval by
        the MarryNest team.
      </p>
    </div>
  );
}
