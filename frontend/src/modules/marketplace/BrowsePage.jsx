import OfferActions, { OfferPrices } from "../commerce/OfferActions";
import { useSelectedLocation, setSelectedLocation } from "./location-selection";
import { offerState } from "../commerce/offer-state";
import { optimizedMediaUrl } from "../media/api";
import { useWishlist } from "../customer/services/wishlist";
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
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Flower2,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMarketplace, money } from "./api";
import "./marketplace.css";
import "./browse-page.css";
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
    [failed, setFailed] = useState(false);
  const wishState = useWishlist(),
    saved = !!wishState.find(item.type || "Service", item.id);
  const offer = offerState(item);
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
      const result = await wishState.toggle(item.type || "Service", item.id);
      notify(result.message);
      await reload();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="cm-card cm-discovery-card">
      <div className="cm-card-visual">
        <Link to={path} className="cm-photo" aria-label={`View ${item.name}`}>
          {item.image && !failed ? (
            <img
              src={optimizedMediaUrl(item.image, "card")}
              alt={item.name}
              loading="lazy"
              onError={() => setFailed(true)}
            />
          ) : (
            <ImageIcon size={38} />
          )}
        </Link>
        <button
          className="cm-save-button"
          onClick={wish}
          disabled={busy}
          aria-pressed={saved}
          aria-label={`${saved ? "Remove" : "Save"} ${item.name}`}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="cm-card-body">
        <div className="cm-card-topline">
          <p className="cm-kicker">{item.category || item.type}</p>
          {(offer.canSell || offer.canBook) && (
            <span className="cm-offer-tag">
              {offer.canSell && offer.canBook
                ? "Buy or book"
                : offer.canSell
                  ? "For purchase"
                  : "For booking"}
            </span>
          )}
        </div>
        <h3>
          <Link to={path}>{item.name}</Link>
        </h3>
        <div className="cm-card-meta-row">
          <p className="cm-meta">
            <MapPin size={13} strokeWidth={1.5} />
            {item.city || "Location on request"}
            {item.type !== "Vendor" && item.vendor && (
              <span className="cm-vendor-inline">
                <span aria-hidden="true">·</span> by{" "}
                <strong>{item.vendor}</strong>
              </span>
            )}
          </p>
          {Number(item.reviews) > 0 ? (
            <span className="cm-rating">
              <Star size={12} fill="currentColor" />{" "}
              {Number(item.rating || 0).toFixed(1)}{" "}
              <small>
                ({item.reviews}{" "}
                {Number(item.reviews) === 1 ? "review" : "reviews"})
              </small>
            </span>
          ) : (
            <span className="cm-new-listing">
              <Star size={12} strokeWidth={1.5} /> No reviews yet
            </span>
          )}
        </div>
        {item.type === "Vendor" ? (
          <p className="cm-meta">
            <ShieldCheck size={14} />
            Approved business · {item.serviceCount ?? "Published"} services
          </p>
        ) : (
          <>
            <div className="cm-card-commerce">
              {!offer.type && (
                <p className="cm-card-price">
                  <small>
                    {item.price ? "Starting from" : "Made for your celebration"}
                  </small>
                  <strong>
                    {item.price ? money(item.price) : "Request a quotation"}
                  </strong>
                  {item.price ? <span> onwards</span> : null}
                </p>
              )}
              <OfferPrices item={item} />
              <OfferActions item={item} />
            </div>
          </>
        )}
        <div className="cm-card-footer">
          {toggleCompare && (
            <label className="cm-compare-label">
              <input
                type="checkbox"
                checked={compare}
                disabled={compareFull && !compare}
                onChange={() => toggleCompare(item)}
              />
              Compare
            </label>
          )}
          <Link className="cm-card-details" to={path}>
            View details <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
function FilterDrawer({ children, close, reset, canReset, total }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      id="cm-filter-drawer"
      ref={ref}
      className="customer-marketplace cm-filter-dialog cm-filter-drawer"
      aria-labelledby="cm-filter-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          close();
      }}
    >
      <div className="cm-toolbar cm-drawer-heading">
        <h2 id="cm-filter-title">Refine your search</h2>
        <button onClick={close} aria-label="Close filters">
          <X size={19} />
        </button>
      </div>
      <div className="cm-drawer-fields">{children}</div>
      <div className="cm-drawer-footer">
        <button onClick={reset} disabled={!canReset}>
          Reset filters
        </button>
        <button className="cm-primary" onClick={close}>
          {total == null
            ? "View results"
            : `View ${total} ${total === 1 ? "result" : "results"}`}
        </button>
      </div>
    </dialog>
  );
}
export default function BrowsePage({ embedded = false }) {
  const selectedLocation = useSelectedLocation();
  const [params, setParams] = useSearchParams(),
    location = useLocation(),
    catalog = useMarketplace("/catalog"),
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
    "postalCode",
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
  if (!params.has("city") && selectedLocation) query.set("city", selectedLocation);
  useEffect(() => {
    if (params.has("city")) setSelectedLocation(params.get("city") || "");
  }, [params]);
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
      if (key === "city") setSelectedLocation(value);
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
  const activeFilters = [...params].filter(
    ([key]) => !["page", "type", "sort"].includes(key),
  );
  const resetFilters = () => {
    setSelectedLocation("");
    setParams(embedded && params.get("type") ? { type: kind } : {});
  };
  const select = (key, label, options) => (
    <label>
      {label}
      <select
        value={
          key === "category" ? String(matched?.id || "") : key === "city" ? params.get(key) ?? selectedLocation : params.get(key) || ""
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
      <fieldset className="cm-filter-section">
        <legend>
          <Sparkles size={14} /> Your essentials
        </legend>
        {select("category", "Category", catalog.data?.categories || [])}
        {kind !== "vendors" &&
          select(
            "subcategory",
            "Subcategory",
            (catalog.data?.subcategories || []).filter(
              (s) => !matched || s.categoryId === matched.id,
            ),
          )}
      </fieldset>
      <fieldset className="cm-filter-section">
        <legend>
          <MapPin size={14} /> The perfect place
        </legend>
        {select("city", "Location", catalog.data?.cities || [])}
        <label>
          Postal code
          <input
            value={params.get("postalCode") || ""}
            placeholder="Enter postal code"
            autoComplete="postal-code"
            maxLength={20}
            onChange={(e) => filter("postalCode", e.target.value)}
          />
        </label>
      </fieldset>
      <details
        className="cm-filter-advanced"
        open={
          ["rating", "date", "guests", "min", "max", "serviceType"].some(
            (key) => params.has(key),
          ) || undefined
        }
      >
        <summary>
          <span>
            <SlidersHorizontal size={14} /> More preferences
          </span>
          <ChevronDown size={14} />
        </summary>
        <fieldset className="cm-filter-section">
          <legend className="cm-visually-hidden">
            Rating, budget and event preferences
          </legend>
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
                ["On site", "Rental", "Sale", "Digital", "Hybrid"].map(
                  (name) => ({
                    name,
                  }),
                ),
              )}
            </>
          )}
        </fieldset>
      </details>
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
      className={`customer-marketplace cm-browse ${embedded ? "cm-embedded" : ""}`}
      id={embedded ? undefined : "main-content"}
    >
      <nav className="cm-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link> <ChevronRight size={12} />{" "}
        <span aria-current="page">
          {kind === "vendors"
            ? "Wedding professionals"
            : kind === "packages"
              ? "Wedding packages"
              : kind === "offers"
                ? "Wedding offers"
                : "Wedding services"}
        </span>
      </nav>
      <div className="cm-discovery-controls">
        {catalog.data?.categories.length > 0 && (
          <div className="cm-category-bar" aria-label="Popular categories">
            <span>Explore</span>
            <button
              aria-pressed={!requested}
              onClick={() => {
                if (location.pathname === "/venues")
                  navigate(
                    `/services?${new URLSearchParams([...params].filter(([key]) => key !== "category" && key !== "subcategory" && key !== "page"))}`,
                  );
                else filter("category", "");
              }}
            >
              All categories
            </button>
            {catalog.data.categories.slice(0, 5).map((category) => (
              <button
                key={category.id}
                aria-pressed={matched?.id === category.id}
                onClick={() => filter("category", String(category.id))}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
        <div className="cm-toolbar cm-results-toolbar">
          {embedded && (
            <label>
              <span className="cm-control-label">Browse</span>
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
          <label className="cm-sort">
            <span className="cm-control-label">Sort by</span>
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
            aria-haspopup="dialog"
            onClick={() => setOpen(!open)}
          >
            <SlidersHorizontal size={17} />
            Filters{" "}
            {activeFilters.length > 0 && <span>{activeFilters.length}</span>}
          </button>
          <div
            className="cm-view-switch"
            role="group"
            aria-label="Results layout"
          >
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
        </div>
      </div>
      {activeFilters.length > 0 && (
        <div className="cm-chips">
          {activeFilters.map(([k, v]) => (
            <button
              key={k}
              aria-label={`Remove ${k} filter`}
              onClick={() => filter(k, "")}
            >
              {k === "category"
                ? matched?.name || v
                : k === "subcategory"
                  ? catalog.data?.subcategories.find((s) => String(s.id) === v)
                      ?.name || v
                  : k === "city"
                    ? `Location: ${catalog.data?.cities.find(l => String(l.id).toLowerCase() === v.toLowerCase() || l.city === v)?.name || "Unavailable location"}`
                    : `${{ q: "Search", min: "Min price", max: "Max price", postalCode: "Postal code", serviceType: "Service type", date: "Event date", guests: "Guests", rating: "Rating" }[k] || k}: ${v}`}{" "}
              <X size={12} />
            </button>
          ))}
          {activeFilters.length > 0 && (
            <button className="cm-reset" onClick={resetFilters}>
              Clear all
            </button>
          )}
        </div>
      )}
      <ReadState state={catalog} />
      <div className="cm-body">
        {open && (
          <FilterDrawer
            close={() => setOpen(false)}
            reset={resetFilters}
            canReset={activeFilters.length > 0}
            total={results.data?.total}
          >
            {filters}
          </FilterDrawer>
        )}
        <section
          aria-label="Search results"
          className="cm-results"
          aria-busy={results.loading || catalog.loading || false}
        >
          <div className="cm-results-heading">
            <div>
              <p className="cm-kicker">YOUR CELEBRATION STARTS HERE</p>
              <h1>
                {matched?.name ||
                  (kind === "vendors"
                    ? "Meet the professionals"
                    : kind === "packages"
                      ? "Beautifully brought together"
                      : "Discover the possibilities")}
              </h1>
            </div>
            <p aria-live="polite">
              {results.data ? (
                <>
                  <strong>{results.data.total}</strong>{" "}
                  {results.data.total === 1 ? "result" : "results"}
                </>
              ) : (
                "Finding your possibilities…"
              )}
            </p>
          </div>
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
              <div className="cm-state cm-empty-results">
                <Flower2 size={34} strokeWidth={1} />
                <h2>Let’s try a different combination.</h2>
                <p>
                  Try another city, broaden your price range, or remove a
                  filter.
                </p>
                <button className="cm-primary" onClick={resetFilters}>
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
