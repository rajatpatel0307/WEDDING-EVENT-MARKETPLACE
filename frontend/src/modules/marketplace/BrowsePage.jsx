import { useEffect, useState, useRef, useCallback } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Heart,
  MapPin,
  Star,
  Image as ImageIcon,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { save } from "../customer/services/workspace.api";
import { useMarketplace, money } from "./api";
import "./marketplace.css";
export function ReadState({ state }) {
  return state.loading ? (
    <div role="status" className="cm-state">
      Loading…
    </div>
  ) : state.error ? (
    <div role="alert" className="cm-state">
      <p>{state.error.message}</p>
      <button onClick={state.retry}>Try again</button>
    </div>
  ) : null;
}
export function DiscoveryCard({ item, compare, toggleCompare, compareFull }) {
  const { user, notify, reload } = useAuth(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [failed, setFailed] = useState(false);
  const path =
    item.type === "Vendor"
      ? `/vendors/${item.vendorId || item.id}`
      : `/services/${item.serviceId || item.id}${item.type === "Package" ? `?package=${item.id}` : ""}`;
  const wish = async () => {
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent(path)}`);
      return;
    }
    setBusy(true);
    try {
      await save("/wishlist", "POST", {
        type: item.type || "Service",
        id: item.id,
      });
      setSaved(true);
      notify("Saved to your wishlist.");
      await reload();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="cm-card">
      <Link to={path} className="cm-photo" aria-label={`View ${item.name}`}>
        {item.image && !failed ? (
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <ImageIcon size={38} />
        )}
      </Link>
      <div className="cm-card-body">
        <p className="cm-kicker">{item.category || item.type}</p>
        <h3>
          <Link to={path}>{item.name}</Link>
        </h3>
        <p className="cm-meta">
          <MapPin size={14} />
          {item.city || "Location on request"}
        </p>
        <p className="cm-meta">
          <Star size={14} />
          {Number(item.rating || 0).toFixed(1)} · {item.reviews || 0} reviews
        </p>
        {item.type === "Vendor" ? (
          <p className="cm-meta">
            <ShieldCheck size={14} />
            Approved business · {item.serviceCount ?? "Published"} services
          </p>
        ) : (
          <>
            <p>{item.vendor}</p>
            <p>
              <strong>
                {item.price ? money(item.price) : "Request a quotation"}
              </strong>
              {item.price ? " onwards" : ""}
            </p>
          </>
        )}
        <div className="cm-actions">
          <Link className="cm-button cm-primary" to={path}>
            View details
          </Link>
          <button
            onClick={wish}
            disabled={busy || saved}
            aria-label={`Save ${item.name}`}
          >
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
        {toggleCompare && (
          <label className="cm-compare-label">
            <input
              type="checkbox"
              checked={compare}
              disabled={compareFull && !compare}
              onChange={() => toggleCompare(item)}
            />
            Compare service
          </label>
        )}
      </div>
    </article>
  );
}
function FilterDrawer({ children, close }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      id="cm-filter-drawer"
      ref={ref}
      className="customer-marketplace cm-filter-dialog"
      aria-label="Search filters"
      onCancel={close}
    >
      <div className="cm-toolbar">
        <h2>Refine your search</h2>
        <button onClick={close}>Close</button>
      </div>
      <div className="cm-drawer-fields">{children}</div>
      <button className="cm-primary" onClick={close}>
        View results
      </button>
    </dialog>
  );
}
export default function BrowsePage({ embedded = false }) {
  const [params, setParams] = useSearchParams(),
    location = useLocation(),
    catalog = useMarketplace("/catalog"),
    [search, setSearch] = useState(params.get("q") || ""),
    [open, setOpen] = useState(false),
    [view, setView] = useState("grid"),
    [compare, setCompare] = useState([]);
  const kind = embedded
    ? params.get("type") || "services"
    : { vendors: "vendors", packages: "packages", offers: "offers" }[
        location.pathname.split("/")[1]
      ] || "services";
  const query = new URLSearchParams();
  for (const k of [
    "q",
    "city",
    "min",
    "max",
    "rating",
    "subcategory",
    "date",
    "guests",
    "sort",
    "serviceType",
    "page",
  ])
    if (params.get(k)) query.set(k, params.get(k));
  query.set("type", kind);
  query.set("pageSize", "12");
  const requested =
      params.get("category") ||
      (location.pathname === "/venues" ? "Venue & Location" : null),
    matched = catalog.data?.categories.find(
      (c) =>
        String(c.id) === requested ||
        c.name.toLowerCase() === requested?.toLowerCase(),
    );
  if (matched) query.set("category", matched.id);
  else if (requested && catalog.data)
    query.set("q", [params.get("q"), requested].filter(Boolean).join(" "));
  const results = useMarketplace(catalog.data ? `/discover?${query}` : null);
  const filter = useCallback(
    (key, value) => {
      setParams((prev) => {
        const n = new URLSearchParams(prev);
        if (value) n.set(key, value);
        else n.delete(key);
        if (key === "category") n.delete("subcategory");
        if (key === "type")
          for (const field of [
            "min",
            "max",
            "guests",
            "date",
            "serviceType",
            "subcategory",
            "sort",
          ])
            n.delete(field);
        n.delete("page");
        return n;
      });
    },
    [setParams],
  );
  const queryText = params.get("q") || "";
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== queryText) filter("q", search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, queryText, filter]);
  useEffect(() => {
    setSearch(queryText);
  }, [queryText]);
  const select = (key, label, options) => (
    <label>
      {label}
      <select
        value={
          key === "category" ? String(matched?.id || "") : params.get(key) || ""
        }
        onChange={(e) => filter(key, e.target.value)}
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((o) => (
          <option key={o.id ?? o.name} value={o.id ?? o.name}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
  const input = (key, label, type = "number") => (
    <label>
      {label}
      <input
        type={type}
        key={`${key}-${params.get(key) || ""}`}
        defaultValue={params.get(key) || ""}
        min={type === "number" ? (key === "guests" ? 1 : 0) : undefined}
        onBlur={(e) => filter(key, e.target.value)}
      />
    </label>
  );
  const filters = (
    <>
      {select("category", "Category", catalog.data?.categories || [])}
      {kind !== "vendors" &&
        select(
          "subcategory",
          "Subcategory",
          (catalog.data?.subcategories || []).filter(
            (s) => !matched || s.categoryId === matched.id,
          ),
        )}
      {select("city", "Location", catalog.data?.cities || [])}
      {select("rating", "Rating", [
        { id: 4, name: "4 stars and above" },
        { id: 3, name: "3 stars and above" },
      ])}
      {kind !== "vendors" && (
        <>
          {input("date", "Event date", "date")}
          {input("guests", "Guest count")}
          {input("min", "Minimum price")}
          {input("max", "Maximum price")}
          {select(
            "serviceType",
            "Service type",
            ["On site", "Rental", "Sale", "Digital", "Hybrid"].map((name) => ({
              name,
            })),
          )}
        </>
      )}
    </>
  );
  const toggleCompare = (item) =>
    setCompare((current) =>
      current.some((i) => i.id === item.id)
        ? current.filter((i) => i.id !== item.id)
        : current.length < 3
          ? [...current, item]
          : current,
    );
  return (
    <main
      className={`customer-marketplace ${embedded ? "cm-embedded" : ""}`}
      id={embedded ? undefined : "main-content"}
    >
      <nav aria-label="Breadcrumb">
        <Link to="/">Home</Link> / {kind === "vendors" ? "Vendors" : "Services"}
      </nav>
      <p className="cm-kicker">THOUGHTFULLY CHOSEN FOR YOUR CELEBRATION</p>
      <h1>
        {kind === "vendors"
          ? "Meet your wedding dream team."
          : "Find the details that feel like you."}
      </h1>
      <p>
        Discover approved professionals, explore their work, and bring your
        celebration together.
      </p>
      <div className="cm-toolbar">
        <label className="cm-search">
          Search
          <input
            type="search"
            placeholder={
              kind === "vendors" ? "Business name" : "Service or vendor name"
            }
            maxLength={150}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {embedded && (
          <label>
            Browse
            <select
              value={kind}
              onChange={(e) => filter("type", e.target.value)}
            >
              <option value="services">Services</option>
              <option value="vendors">Vendors</option>
              <option value="packages">Packages</option>
              <option value="offers">Vendors with offers</option>
            </select>
          </label>
        )}
        <label>
          Sort by
          <select
            value={params.get("sort") || "relevance"}
            onChange={(e) => filter("sort", e.target.value)}
          >
            {[
              ["relevance", "Recommended"],
              ["rating", "Highest rated"],
              ...(kind === "vendors"
                ? []
                : [
                    ["priceAsc", "Price: low to high"],
                    ["priceDesc", "Price: high to low"],
                  ]),
              ["newest", "Newest"],
            ].map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          className="cm-filter-toggle"
          aria-expanded={open}
          aria-controls="cm-filter-drawer"
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal size={17} />
          Filters
        </button>
        <button
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          onClick={() => setView("grid")}
        >
          <LayoutGrid size={17} />
        </button>
        <button
          aria-label="List view"
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          <List size={17} />
        </button>
      </div>
      <div className="cm-chips">
        {[...params]
          .filter(([k]) => !["page", "type", "sort"].includes(k))
          .map(([k, v]) => (
            <button
              key={k}
              aria-label={`Remove ${k} filter`}
              onClick={() => filter(k, "")}
            >
              {k}: {k === "category" ? matched?.name || v : v} ×
            </button>
          ))}
        {params.size > 0 && (
          <button
            onClick={() => {
              setSearch("");
              setParams({});
            }}
          >
            Clear all
          </button>
        )}
      </div>
      <ReadState state={catalog} />
      <div className="cm-body">
        <aside aria-label="Search filters" className="cm-filters">
          {filters}
        </aside>
        {open && (
          <FilterDrawer close={() => setOpen(false)}>{filters}</FilterDrawer>
        )}
        <section aria-label="Search results">
          <p aria-live="polite">
            {results.data
              ? `${results.data.total} results`
              : "Finding your possibilities…"}
          </p>
          {results.loading ? (
            <div
              className="cm-grid"
              role="status"
              aria-label="Loading listings"
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="cm-skeleton" />
              ))}
            </div>
          ) : results.error ? (
            <ReadState state={results} />
          ) : results.data?.rows.length ? (
            <>
              <div className={`cm-grid ${view === "list" ? "cm-list" : ""}`}>
                {results.data.rows.map((item) => (
                  <DiscoveryCard
                    key={item.id}
                    item={item}
                    compare={compare.some((c) => c.id === item.id)}
                    compareFull={compare.length >= 3}
                    toggleCompare={
                      kind === "services" ? toggleCompare : undefined
                    }
                  />
                ))}
              </div>
              <div className="cm-pagination">
                <button
                  disabled={results.data.page <= 1}
                  onClick={() =>
                    setParams((p) => {
                      const n = new URLSearchParams(p);
                      n.set("page", results.data.page - 1);
                      return n;
                    })
                  }
                >
                  Previous
                </button>
                <span>
                  Page {results.data.page} of{" "}
                  {Math.max(
                    1,
                    Math.ceil(results.data.total / results.data.pageSize),
                  )}
                </span>
                <button
                  disabled={
                    results.data.page * results.data.pageSize >=
                    results.data.total
                  }
                  onClick={() =>
                    setParams((p) => {
                      const n = new URLSearchParams(p);
                      n.set("page", results.data.page + 1);
                      return n;
                    })
                  }
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            results.data && (
              <div className="cm-state">
                <h2>Let’s try a different combination.</h2>
                <p>
                  Try another city, broaden your price range, or remove a
                  filter.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setParams({});
                  }}
                >
                  Reset filters
                </button>
              </div>
            )
          )}
        </section>
      </div>
      {compare.length > 0 && (
        <section className="cm-panel">
          <h2>Compare your shortlist ({compare.length}/3)</h2>
          <div className="cm-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  {compare.map((i) => (
                    <th key={i.id}>
                      <Link to={`/services/${i.id}`}>{i.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Vendor", (i) => i.vendor],
                  ["Starting price", (i) => money(i.price)],
                  ["Location", (i) => i.city],
                  ["Rating", (i) => Number(i.rating || 0).toFixed(1)],
                  ["Guest limit", (i) => i.maxGuests || "Flexible"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    {compare.map((i) => (
                      <td key={i.id}>{value(i)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setCompare([])}>Clear comparison</button>
        </section>
      )}
    </main>
  );
}
