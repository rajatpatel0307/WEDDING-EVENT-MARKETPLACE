import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, LayoutGrid, List, Package,
  Search, ShoppingBag, SlidersHorizontal, Sparkles, Store, X,
} from "lucide-react";
import { useWishlist } from "../services/wishlist";
import { ErrorView } from "../components/WorkspaceUI";
import { DiscoveryCard } from "../../marketplace/BrowsePage";

const control = "min-h-12 w-full min-w-0 rounded-xl border border-[#e3e7e1]! bg-[#fafbf9]! px-4 py-3 text-sm text-[#344c3e]! transition placeholder:text-[#879187] hover:border-[#aab8a8]! focus:border-[#54775f]! focus:outline-none focus:ring-4 focus:ring-[#54775f]/10 motion-reduce:transition-none";
const field = "grid min-w-0 gap-2 text-xs font-medium text-[#647062]";
const primaryButton = "group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#294b3b]! bg-[#294b3b]! px-5 py-3 text-sm font-medium text-white! shadow-[0_4px_12px_#294b3b12] transition hover:border-[#1e382c]! hover:bg-[#1e382c]! hover:shadow-md motion-reduce:transition-none";
const cardGrid = "grid min-w-0 grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const listCardGrid = "grid min-w-0 grid-cols-1 items-start gap-4 sm:[&>.cm-card]:grid! sm:[&>.cm-card]:grid-cols-[208px_minmax(0,1fr)] sm:[&_.cm-photo]:h-full! sm:[&_.cm-photo]:min-h-[200px] sm:[&_.cm-photo]:aspect-auto";

const types = [
  ["Vendor", "Vendors", "People for your perfect day", Store],
  ["Service", "Services", "The details you love", ShoppingBag],
  ["Package", "Packages", "Beautifully brought together", Package],
  ["All", "Total saved", "A collection of possibilities", Heart],
];

function WishlistSelect({ label, value, onChange, children, className = "" }) {
  return (
    <label className={`${field} ${className}`}>
      <span>{label}</span>
      <span className="relative block min-w-0">
        <select className={`${control} appearance-none pr-10`} value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute top-4 right-4 text-[#75856e]" aria-hidden="true" />
      </span>
    </label>
  );
}

export default function CustomerWishlist() {
  const wish = useWishlist();
  const [type, setType] = useState("All");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("newest");
  const [list, setList] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const counts = useMemo(() => ({
    All: wish.rows.length,
    Vendor: wish.rows.filter((item) => item.type === "Vendor").length,
    Service: wish.rows.filter((item) => item.type === "Service").length,
    Package: wish.rows.filter((item) => item.type === "Package").length,
  }), [wish.rows]);

  const rows = useMemo(() => wish.rows.filter((item) =>
    (type === "All" || item.type === type) &&
    (!q.trim() || `${item.name} ${item.vendor} ${item.description || ""}`.toLowerCase().includes(q.trim().toLowerCase())) &&
    (!city || item.city === city) &&
    (!category || item.category === category) &&
    (!vendor || item.vendor === vendor) &&
    (!min || (item.price != null && Number(item.price) >= Number(min))) &&
    (!max || (item.price != null && Number(item.price) <= Number(max))),
  ).sort((a, b) => sort === "rating" ? Number(b.rating) - Number(a.rating)
    : sort === "priceAsc" ? Number(a.price ?? Infinity) - Number(b.price ?? Infinity)
      : sort === "priceDesc" ? Number(b.price ?? -Infinity) - Number(a.price ?? -Infinity)
        : new Date(b.savedAt) - new Date(a.savedAt)),
  [wish.rows, type, q, city, category, vendor, min, max, sort]);

  const activeFilters = [
    ["Type", type === "All" ? "" : `${type}s`, () => setType("All")],
    ["Search", q.trim(), () => setQ("")],
    ["City", city, () => setCity("")],
    ["Category", category, () => setCategory("")],
    ["Vendor", vendor, () => setVendor("")],
    ["Min price", min !== "" ? `₹${min}` : "", () => setMin("")],
    ["Max price", max !== "" ? `₹${max}` : "", () => setMax("")],
  ].filter((filter) => filter[1]);
  const priceError = min !== "" && max !== "" && Number(min) > Number(max);

  function clearFilters() {
    setType("All"); setQ(""); setCity(""); setCategory("");
    setVendor(""); setMin(""); setMax("");
  }

  return (
    <div className="min-w-0 space-y-6 text-[#465343] sm:space-y-7 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#54775f] [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#54775f]">
      <header className="relative isolate overflow-hidden rounded-3xl border border-[#e6dfd2] bg-[#f5f0e6] shadow-[0_8px_32px_#53452d05]">
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-[44%] md:block" aria-hidden="true">
          <img src="/images/wedding-details-1024.webp" alt="" width="1024" height="576" fetchPriority="high" className="size-full object-cover object-center" />
          <div className="absolute inset-0 bg-linear-to-r from-[#f5f0e6] via-transparent to-[#3a3026]/15" />
        </div>
        <div className="px-6 py-6 sm:px-8 md:max-w-[65%] lg:px-9">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#ded5c3] bg-white/50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#7f6943]"><Heart size={12} strokeWidth={1.7} aria-hidden="true" />Your own little collection</p>
          <h1 className="mt-3 font-serif text-[42px] leading-[1.05] tracking-[-1.8px] text-[#2e4738] sm:text-5xl">My wishlist<span className="text-[#b69a70]">.</span></h1>
          <p className="mt-1.5 font-serif text-xl italic leading-snug text-[#8c7655] sm:text-[22px]">Every detail, a little closer to forever.</p>
          <p className="mt-2 text-[13px] leading-5 text-[#6d7264]">Your favorite people, places and finishing touches.</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link to="/services" className={primaryButton}>Explore services<ArrowUpRight size={17} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" /></Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#7c715d]"><span className="flex size-5 items-center justify-center rounded-full bg-[#e8e2d2]"><Check size={12} aria-hidden="true" /></span>Chosen with love</span>
          </div>
        </div>
        <p className="absolute right-5 bottom-5 hidden items-center gap-2 rounded-full border border-white/30 bg-[#382c24]/30 px-3 py-2 text-[9px] font-medium uppercase tracking-[0.16em] text-white backdrop-blur-sm lg:flex"><Sparkles size={12} aria-hidden="true" />The art of celebrating you</p>
      </header>

      <section aria-label="Your saved collection at a glance" aria-busy={wish.loading} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {types.map(([key, label, description, Icon]) => (
          <button type="button" key={key} title={description} onClick={() => setType(key)} aria-pressed={type === key} aria-controls="wishlist-results" className={`group relative flex min-h-22 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left transition motion-reduce:transition-none ${type === key ? "border-[#294b3b]! bg-[#294b3b]! text-white! shadow-[0_5px_16px_#294b3b15]" : "border-[#e2e7e0]! bg-white! text-[#344d3c]! hover:border-[#afbea8]! hover:bg-[#fafbf8]!"}`}>
            <span className="min-w-0">
              <span className={`mb-1 block text-xs font-medium ${type === key ? "text-[#e3e9dd]" : "text-[#687461]"}`}>{label}</span>
              {wish.loading ? <span className="block h-7 w-10 animate-pulse rounded-md bg-[#a8b5a0]/25 motion-reduce:animate-none" /> : <strong className="block font-serif text-[28px] leading-none font-normal tracking-[-0.8px] tabular-nums">{wish.error ? "—" : String(counts[key]).padStart(2, "0")}</strong>}
            </span>
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition sm:size-11 ${type === key ? "bg-white/10 text-[#e3cf9f]" : "bg-[#f4f2ea] text-[#a18a5f] group-hover:bg-[#ebe8dc]"}`}><Icon size={20} strokeWidth={1.5} aria-hidden="true" /></span>
          </button>
        ))}
      </section>

      <section aria-label="Filter your wishlist" className="min-w-0 rounded-2xl border border-[#e2e7e0] bg-white shadow-[0_4px_24px_#344d3c04]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0e9] p-4 sm:px-5">
          <div role="group" aria-label="Wishlist categories" className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#f3f5f0] p-1 [scrollbar-width:thin]">
            {["All", "Vendor", "Service", "Package"].map((key) => <button type="button" key={key} onClick={() => setType(key)} aria-pressed={type === key} aria-controls="wishlist-results" className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition motion-reduce:transition-none sm:text-sm ${type === key ? "border-[#e3e8dc]! bg-white! text-[#294b3b]! shadow-xs" : "border-transparent! bg-transparent! text-[#687461]! hover:bg-white/70! hover:text-[#294b3b]!"}`}>
              {key === "All" ? "All favorites" : `${key}s`}<span className={`flex min-w-5 items-center justify-center rounded-md px-1 py-0.5 text-[10px] tabular-nums ${type === key ? "bg-[#eaf0e4] text-[#49623c]" : "bg-[#e7ebe2] text-[#6c7762]"}`}>{wish.loading || wish.error ? "—" : counts[key]}</span>
            </button>)}
          </div>
          <button type="button" onClick={() => setShowMoreFilters((value) => !value)} aria-expanded={showMoreFilters} aria-controls="wishlist-more-filters" className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-xs font-medium transition ${showMoreFilters ? "border-[#a4b29b]! bg-[#edf2e7]! text-[#375438]!" : "border-[#e2e7dd]! bg-white! text-[#58694e]! hover:bg-[#f5f7f0]!"}`}><SlidersHorizontal size={15} aria-hidden="true" />More filters{[vendor, min, max].filter((value) => value !== "").length > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-[#e1e9d7] text-[10px] text-[#49623c]">{[vendor, min, max].filter((value) => value !== "").length}</span>}<ChevronDown size={14} className={`transition-transform motion-reduce:transition-none ${showMoreFilters ? "rotate-180" : ""}`} aria-hidden="true" /></button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid min-w-0 grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
            <label className={`${field} sm:col-span-2 xl:col-span-1`}>
              <span>Find a saved favorite</span>
              <span className="relative block min-w-0"><Search size={17} className="pointer-events-none absolute top-4 left-4 text-[#7d8b73]" aria-hidden="true" /><input type="search" className={`${control} pl-11`} aria-label="Search wishlist" placeholder="Search your favorites…" value={q} onChange={(event) => setQ(event.target.value)} /></span>
            </label>
            {[[city, setCity, "City", "city", "All cities"], [category, setCategory, "Category", "category", "All categories"]].map(([value, set, label, key, all]) => (
              <WishlistSelect key={key} label={label} value={value} onChange={set}>
                <option value="">{all}</option>{[...new Set(wish.rows.map((item) => item[key]).filter(Boolean))].sort().map((option) => <option key={option} value={option}>{option}</option>)}
              </WishlistSelect>
            ))}
          </div>

          <div id="wishlist-more-filters" hidden={!showMoreFilters}>
          <div className="flex flex-wrap items-end gap-4 border-t border-[#edf0e9] pt-4">
            <WishlistSelect label="Vendor" value={vendor} onChange={setVendor} className="flex-[1_1_200px]">
              <option value="">All vendors</option>{[...new Set(wish.rows.map((item) => item.vendor).filter(Boolean))].sort().map((option) => <option key={option} value={option}>{option}</option>)}
            </WishlistSelect>
            <fieldset className="m-0 min-w-0 flex-[2_1_280px] border-0 p-0">
              <legend className="mb-2 text-xs font-medium text-[#647062]">Price range <span className="font-normal text-[#727d69]">(INR)</span></legend>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <input type="number" min="0" step="any" className={control} aria-label="Minimum price" aria-invalid={priceError} aria-describedby={priceError ? "wishlist-price-error" : undefined} placeholder="Min price ₹" value={min} onChange={(event) => setMin(event.target.value)} />
                <span className="text-xs text-[#8c967e]" aria-hidden="true">—</span>
                <input type="number" min="0" step="any" className={control} aria-label="Maximum price" aria-invalid={priceError} aria-describedby={priceError ? "wishlist-price-error" : undefined} placeholder="Max price ₹" value={max} onChange={(event) => setMax(event.target.value)} />
              </div>
            </fieldset>
          </div>
          </div>
          {priceError && <p id="wishlist-price-error" role="alert" className="rounded-lg bg-[#fcf2ee] px-3 py-2 text-xs text-[#934f39]">Maximum price must be at least the minimum price.</p>}
          {activeFilters.length > 0 && <div aria-label="Active wishlist filters" className="flex flex-wrap items-center gap-2 border-t border-[#edf0e9] pt-4">{activeFilters.map(([label, value, reset]) => <button type="button" key={label} onClick={reset} aria-label={`Remove ${label.toLowerCase()} filter: ${value}`} className="inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-lg border border-[#dce4d4]! bg-[#f2f5ed]! px-3 py-2 text-xs text-[#536944]! hover:border-[#a2b58f]!"><span className="min-w-0 truncate">{label}: {value}</span><X size={13} className="shrink-0" aria-hidden="true" /></button>)}<button type="button" onClick={clearFilters} className="min-h-11 cursor-pointer rounded-lg px-2 text-xs font-medium text-[#536944]! underline underline-offset-4 hover:bg-[#f2f5ed]">Clear all</button></div>}
        </div>
      </section>

      <section id="wishlist-results" aria-labelledby="wishlist-results-title" aria-busy={wish.loading} className="customer-marketplace cm-browse min-w-0 space-y-5 [&_.cm-card_h3]:font-serif [&_.cm-card_h3]:font-normal [&_.cm-card_h3]:break-words [&_.cm-card-meta-row]:min-w-0 [&_.cm-meta]:min-w-0 [&_.cm-meta]:break-words [&_.cm-card-footer]:mt-auto! [&_.cm-card-footer]:pt-3! [&_.cm-card-commerce]:pb-2">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="wishlist-results-title" className="font-serif text-[28px] leading-tight tracking-[-0.5px] text-[#3e5140]">{type === "All" ? "Your saved favorites" : `Your saved ${type.toLowerCase()}s`}</h2>
            <p role="status" aria-live="polite" aria-atomic="true" className="mt-1.5 text-xs text-[#6c7863]">{wish.loading ? "Loading your collection…" : wish.error ? "Your collection couldn’t be loaded." : `Showing ${rows.length} of ${wish.rows.length} saved ${wish.rows.length === 1 ? "item" : "items"}`}</p>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-3">
            <label className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-xs text-[#6c7863]">Sort by</span><select className={`${control} w-auto! max-w-full bg-white!`} aria-label="Sort wishlist" value={sort} onChange={(event) => setSort(event.target.value)}>{[["newest", "Newest saved"], ["rating", "Highest rating"], ["priceAsc", "Price: low to high"], ["priceDesc", "Price: high to low"]].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <div role="group" aria-label="Wishlist view" className="inline-flex shrink-0 gap-1 rounded-xl border border-[#e7dfd1] bg-white p-1">
              {[[false, "Grid view", LayoutGrid], [true, "List view", List]].map(([value, label, Icon]) => <button type="button" key={label} title={label} aria-label={label} aria-pressed={list === value} onClick={() => setList(value)} className={`flex size-11 cursor-pointer items-center justify-center rounded-lg transition motion-reduce:transition-none ${list === value ? "bg-[#294b3b]! text-white! shadow-xs" : "bg-white! text-[#76816c]! hover:bg-[#f2f5ed]!"}`}><Icon size={18} aria-hidden="true" /></button>)}
            </div>
          </div>
        </header>

        {wish.loading ? (
          <div role="status" aria-label="Loading saved items" className={list ? listCardGrid : cardGrid}>{[0, 1, 2, 3].map((key) => <div key={key} className="overflow-hidden rounded-[14px] border border-[#e9e0db] bg-white"><div className="h-[145px] animate-pulse bg-[#eee7db] motion-reduce:animate-none" /><div className="space-y-3 p-3.5"><div className="h-5 w-3/4 animate-pulse rounded-md bg-[#f0ebe1] motion-reduce:animate-none" /><div className="h-3 w-1/2 rounded bg-[#f5f1e9]" /><div className="h-11 rounded-lg bg-[#faf7f1]" /></div></div>)}</div>
        ) : wish.error ? <ErrorView error={wish.error} retry={wish.refresh} /> : !rows.length ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfd2ba] bg-white px-6 py-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-[#f3ece0] text-[#b49a70]">{wish.rows.length ? <Search size={26} strokeWidth={1.5} aria-hidden="true" /> : <Heart size={27} strokeWidth={1.5} aria-hidden="true" />}</span>
            <h3 className="mt-5 font-serif text-[27px] text-[#40523f]">{wish.rows.length ? "No matching favorites" : "A little inspiration starts here"}</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#687163]">{wish.rows.length ? "Try a different search or clear your filters to see more of your saved collection." : "Find a venue you love, a vendor who gets you, or the perfect finishing touch. Tap the heart to keep it here."}</p>
            {wish.rows.length ? <button type="button" onClick={clearFilters} className={`${primaryButton} mt-5 cursor-pointer`}>Clear filters<ArrowRight size={15} aria-hidden="true" /></button> : <Link to="/services" className={`${primaryButton} mt-5`}>Explore services<ArrowUpRight size={15} aria-hidden="true" /></Link>}
          </div>
        ) : (
          <div className={list ? listCardGrid : cardGrid}>
            {rows.map((item) => <DiscoveryCard key={item.id} item={item} saved />)}
          </div>
        )}
      </section>

      <footer className="flex flex-col items-center gap-2.5 border-t border-[#e6dfd2] pt-7 pb-2 text-center">
        <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.25em] text-[#8a734d]"><Sparkles size={13} strokeWidth={1.3} aria-hidden="true" />MarryNest</span>
        <p className="font-serif text-[17px] italic text-[#77816d]">A few favorites today. An unforgettable celebration tomorrow.</p>
      </footer>
    </div>
  );
}
