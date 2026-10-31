import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, List, Heart } from "lucide-react";
import { useWishlist } from "../services/wishlist";
import { Heading, Loading, ErrorView, Empty } from "../components/WorkspaceUI";
import { ServiceCard } from "../components/ServiceCards";
export default function CustomerWishlist() {
  const wish = useWishlist(),
    [type, setType] = useState("All"),
    [q, setQ] = useState(""),
    [city, setCity] = useState(""),
    [category, setCategory] = useState(""),
    [vendor, setVendor] = useState(""),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [sort, setSort] = useState("newest"),
    [list, setList] = useState(false);
  const rows = useMemo(
    () =>
      wish.rows
        .filter(
          (r) =>
            (type === "All" || r.type === type) &&
            (!q ||
              `${r.name} ${r.vendor} ${r.description || ""}`
                .toLowerCase()
                .includes(q.toLowerCase())) &&
            (!city || r.city === city) &&
            (!category || r.category === category) &&
            (!vendor || r.vendor === vendor) &&
            (!min || (r.price != null && Number(r.price) >= Number(min))) &&
            (!max || (r.price != null && Number(r.price) <= Number(max))),
        )
        .sort((a, b) =>
          sort === "rating"
            ? Number(b.rating) - Number(a.rating)
            : sort === "priceAsc"
              ? Number(a.price ?? Infinity) - Number(b.price ?? Infinity)
              : sort === "priceDesc"
                ? Number(b.price ?? -Infinity) - Number(a.price ?? -Infinity)
                : new Date(b.savedAt) - new Date(a.savedAt),
        ),
    [wish.rows, type, q, city, category, vendor, min, max, sort],
  );
  return (
    <>
      <Heading
        title="My Wishlist"
        description="Your favorite vendors, services and packages, ready when you are."
      >
        <Link className="cw-button cw-primary" to="/services">
          Explore services
        </Link>
      </Heading>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
        {["Vendor", "Service", "Package", "All"].map((t) => (
          <div className="cw-panel" key={t}>
            <Heart size={18} />
            <strong>
              {t === "All"
                ? wish.rows.length
                : wish.rows.filter((r) => r.type === t).length}
            </strong>
            <p>{t === "All" ? "Total saved" : `${t}s`}</p>
          </div>
        ))}
      </div>
      <nav className="cw-inline-tabs" aria-label="Wishlist categories">
        {["All", "Vendor", "Service", "Package"].map((t) => (
          <button
            className="cw-button"
            aria-pressed={type === t}
            key={t}
            onClick={() => setType(t)}
          >
            {t === "All" ? t : `${t}s`}
          </button>
        ))}
      </nav>
      <div className="flex flex-wrap gap-3 my-4">
        <input
          className="border rounded-lg p-2"
          aria-label="Search wishlist"
          placeholder="Search saved items"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {[
          [city, setCity, "City", "city"],
          [category, setCategory, "Category", "category"],
          [vendor, setVendor, "Vendor", "vendor"],
        ].map(([value, set, label, key]) => (
          <select
            key={key}
            className="border rounded-lg p-2"
            aria-label={label}
            value={value}
            onChange={(e) => set(e.target.value)}
          >
            <option value="">All {label.toLowerCase()}s</option>
            {[...new Set(wish.rows.map((r) => r[key]).filter(Boolean))]
              .sort()
              .map((v) => (
                <option key={v}>{v}</option>
              ))}
          </select>
        ))}
        <input
          className="border rounded-lg p-2 w-28"
          type="number"
          min="0"
          aria-label="Minimum price"
          placeholder="Min price"
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
        <input
          className="border rounded-lg p-2 w-28"
          type="number"
          min="0"
          aria-label="Maximum price"
          placeholder="Max price"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
        <select
          className="border rounded-lg p-2"
          aria-label="Sort wishlist"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {[
            ["newest", "Newest saved"],
            ["rating", "Highest rating"],
            ["priceAsc", "Price: low to high"],
            ["priceDesc", "Price: high to low"],
          ].map(([v, l]) => (
            <option value={v} key={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          className="cw-button"
          onClick={() => setList(!list)}
          aria-label={list ? "Grid view" : "List view"}
        >
          {list ? <LayoutGrid size={18} /> : <List size={18} />}
        </button>
      </div>
      {wish.loading ? (
        <Loading />
      ) : wish.error ? (
        <ErrorView error={wish.error} retry={wish.refresh} />
      ) : !rows.length ? (
        <Empty
          title={
            wish.rows.length
              ? "No matching favorites"
              : "Your wishlist is empty"
          }
          text="Your wishlist is empty. Explore our vendors, services, and packages to save your favorites."
          action={
            <Link to="/services" className="cw-button">
              Explore Services
            </Link>
          }
        />
      ) : (
        <div className={list ? "grid grid-cols-1 gap-4" : "cw-discovery-grid"}>
          {rows.map((item) => (
            <ServiceCard key={item.id} item={item} saved />
          ))}
        </div>
      )}
    </>
  );
}
