import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Heart, LayoutGrid, List, Package,
  Search, ShoppingBag, SlidersHorizontal, Sparkles, Store, X,
} from "lucide-react";
import { useWishlist } from "../services/wishlist";
import { ErrorView } from "../components/WorkspaceUI";
import { ServiceCard } from "../components/ServiceCards";

const control = "min-h-11 w-full min-w-0 rounded-lg border border-[#e6e0d5]! bg-[#fcfbf8]! px-3.5 py-2.5 text-xs text-[#4f5c51]! transition placeholder:text-[#a39e91] hover:border-[#c7b58f]! focus:border-[#af9464]! focus:outline-none focus:ring-4 focus:ring-[#af9464]/10 motion-reduce:transition-none";
const field = "grid min-w-0 gap-2 text-[10px] font-medium tracking-[0.02em] text-[#8b8679]";
const primaryButton = "group inline-flex min-h-11 items-center justify-center gap-3 rounded-lg border border-[#294b3b]! bg-[#294b3b]! px-5 py-3 text-[11px] font-medium tracking-wide text-white! shadow-[0_4px_12px_#294b3b12] transition hover:border-[#1e382c]! hover:bg-[#1e382c]! hover:shadow-md motion-reduce:transition-none";
const cardStyles = [
  "group min-w-0 [&>.cw-service-card]:flex [&>.cw-service-card]:h-full [&>.cw-service-card]:flex-col [&>.cw-service-card]:rounded-2xl [&>.cw-service-card]:border-[#e9e3d9]! [&>.cw-service-card]:bg-white! [&>.cw-service-card]:shadow-[0_4px_20px_#53452d05]",
  "[&>.cw-service-card:hover]:border-[#d6c5a6]! [&>.cw-service-card:hover]:shadow-[0_12px_32px_#53452d0e]! [&_.cw-service-photo>img:first-child]:duration-700 [&_.cw-service-body]:min-w-0 [&_.cw-service-body]:flex-1 [&_.cw-service-body]:p-5! xl:[&_.cw-service-body]:p-6! [&_.cw-service-title]:font-serif [&_.cw-service-title]:text-[25px]!",
  "[&_.cw-service-title]:leading-tight [&_.cw-service-title]:break-words [&_.cw-service-title]:tracking-[-0.4px] [&_.cw-service-title]:text-[#354b3c]! [&_.cw-service-body>p]:line-clamp-2 [&_.cw-service-body>p]:text-[11px]! [&_.cw-service-body>p]:leading-relaxed [&_.cw-service-body>p]:break-words [&_.cw-service-body>p]:text-[#918b7f]",
  "[&_.cw-service-location]:mt-3 [&_.cw-service-location]:text-[11px]! [&_.cw-service-location]:text-[#8c8c7b] [&_.cw-service-location>svg]:text-[#b79c6e] [&_.cw-service-rating]:mb-3 [&_.cw-service-rating>span]:text-[#b59a68] [&_.cw-service-rating>small]:text-[10px]! [&_.cw-service-category]:max-w-[75%] [&_.cw-service-category]:rounded-md",
  "[&_.cw-service-category]:bg-white/95! [&_.cw-service-category]:px-2.5 [&_.cw-service-category]:py-1.5 [&_.cw-service-category]:text-[9px]! [&_.cw-service-category]:tracking-wide [&_.cw-service-category]:text-[#8a7960]! [&_.cw-heart]:size-10! [&_.cw-heart]:cursor-pointer [&_.cw-heart]:bg-white/95!",
  "[&_.cw-heart]:text-[#a06c7d]! [&_.cw-heart]:shadow-[0_3px_12px_#2b211b12]! [&_.cw-heart]:backdrop-blur-sm [&_.cw-heart]:disabled:cursor-wait [&_.cw-service-body>footer]:mt-5 [&_.cw-service-body>footer]:border-[#eee8dd] [&_.cw-service-body>footer]:pt-4 [&_.cw-service-body>footer>strong]:font-serif [&_.cw-service-body>footer>strong]:text-[19px]!",
  "[&_.cw-service-body>footer>strong]:text-[#3d5843]! [&_.cw-service-body>footer>a]:text-[11px]! [&_.cw-service-body>footer>a]:text-[#a0875c]! [&_.cw-detail-actions]:mt-4 [&_.cw-detail-actions]:gap-2 [&_.cw-detail-actions>a]:min-h-10 [&_.cw-detail-actions>a]:rounded-lg [&_.cw-detail-actions>a]:border-[#e4ddcf]! [&_.cw-detail-actions>a]:bg-[#faf8f3]!",
  "[&_.cw-detail-actions>a]:text-[11px]! [&_.cw-detail-actions>a]:text-[#6b745e]! [&_.cw-detail-actions>a:first-child]:border-[#35523e]! [&_.cw-detail-actions>a:first-child]:bg-[#35523e]! [&_.cw-detail-actions>a:first-child]:text-white! [&_.commerce-offer-actions_.cm-primary]:border-[#35523e]! [&_.commerce-offer-actions_.cm-primary]:bg-[#35523e]! [&_.commerce-offer-actions_.cm-primary]:text-white!",
].join(" ");

const types = [
  ["Vendor", "Vendors", "People for your perfect day", Store],
  ["Service", "Services", "The details you love", ShoppingBag],
  ["Package", "Packages", "Beautifully brought together", Package],
  ["All", "Total saved", "A collection of possibilities", Heart],
];

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
    <div className="min-w-0 space-y-6 text-[#465343] sm:space-y-7 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#b79b6c] [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#b79b6c]">
      <header className="relative isolate overflow-hidden rounded-[24px] border border-[#e6dfd2] bg-[#f5f0e6]">
        <div className="absolute inset-y-0 right-0 -z-20 hidden w-[46%] sm:block" aria-hidden="true">
          <img src="/images/wedding-details-1024.webp" alt="" fetchPriority="high" className="size-full object-cover object-center" />
          <div className="absolute inset-0 bg-linear-to-r from-[#f5f0e6] via-[#f5f0e6]/10 to-[#65523c]/10" />
        </div>
        <div className="relative px-6 py-7 sm:max-w-[72%] sm:px-8 sm:py-8 xl:px-10">
          <p className="flex items-center gap-2.5 text-[9px] font-medium uppercase tracking-[0.25em] text-[#a18a60]"><span className="h-px w-7 bg-[#c0aa82]" aria-hidden="true" />Your own little collection</p>
          <h1 className="mt-3 font-serif text-[42px] leading-none tracking-[-1.6px] text-[#2e4738] sm:text-[50px] xl:text-[56px]">My wishlist<span className="text-[#b69a70]">.</span></h1>
          <p className="mt-2.5 font-serif text-[20px] italic text-[#a18c69] sm:text-[23px]">Every detail, a little closer to forever.</p>
          <p className="mt-3 max-w-[360px] text-xs leading-6 text-[#817f70]">Your favorite people, places and finishing touches.</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link to="/services" className={primaryButton}>Explore services<ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" /></Link>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-[#a08c73]"><Heart size={12} strokeWidth={1.5} aria-hidden="true" />Chosen with love</span>
          </div>
        </div>
        <p className="absolute right-5 bottom-4 hidden items-center gap-2 text-[8px] font-medium uppercase tracking-[0.22em] text-[#fffdf7] drop-shadow-md xl:flex"><span className="h-px w-5 bg-white/70" />The art of celebrating you</p>
      </header>

      <section aria-label="Your saved collection at a glance" aria-busy={wish.loading} className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#e7e1d6] bg-white shadow-[0_3px_16px_#53452d03] md:grid-cols-4!">
        {types.map(([key, label, description, Icon], index) => (
          <button type="button" key={key} title={description} onClick={() => setType(key)} aria-pressed={type === key} aria-controls="wishlist-results" className={`group relative flex min-h-24 min-w-0 cursor-pointer items-center gap-3 border-[#eae4d9]! px-4 py-4 text-left transition hover:bg-[#faf7ef]! motion-reduce:transition-none sm:px-5 ${index < 2 ? "border-b md:border-b-0" : ""} ${index === 1 ? "md:border-r" : index === 3 ? "" : "border-r"} ${type === key ? "bg-[#f8f4eb]!" : "bg-white!"}`}>
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${type === key ? "bg-[#ece3d0] text-[#a58b59]" : "bg-[#f7f4ed] text-[#b5a07a]"}`}><Icon size={18} strokeWidth={1.4} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              {wish.loading ? <span className="block h-7 w-10 animate-pulse rounded-md bg-[#ede7da] motion-reduce:animate-none" /> : <strong className="block font-serif text-[30px] leading-none font-normal tracking-[-0.8px] text-[#3b5140]! tabular-nums">{String(counts[key]).padStart(2, "0")}</strong>}
              <span className="mt-2 block text-[10px] font-medium tracking-wide text-[#90836c]!">{label}</span>
            </span>
            {type === key && <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-[#b49a6c]" aria-hidden="true" />}
          </button>
        ))}
      </section>

      <section aria-label="Filter your wishlist" className="min-w-0 rounded-2xl border border-[#e8e2d8] bg-white shadow-[0_3px_16px_#53452d03]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee8dd] px-4 py-2.5 sm:px-5">
          <div role="group" aria-label="Wishlist categories" className="flex max-w-full gap-2 overflow-x-auto p-1 [scrollbar-width:thin] sm:gap-4">
            {["All", "Vendor", "Service", "Package"].map((key) => <button type="button" key={key} onClick={() => setType(key)} aria-pressed={type === key} aria-controls="wishlist-results" className={`relative inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-0 bg-transparent! px-1 py-2 text-[11px] font-medium transition motion-reduce:transition-none ${type === key ? "text-[#38513e]! after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-[#b49a6c] after:content-['']" : "text-[#989080]! hover:text-[#38513e]!"}`}>
              {key === "All" ? "All favorites" : `${key}s`}<span className={`rounded-full px-1.5 py-0.5 text-[9px] tabular-nums ${type === key ? "bg-[#eee6d5]! text-[#9b8050]!" : "bg-[#f6f3ed]! text-[#a49c8e]!"}`}>{wish.loading ? "—" : counts[key]}</span>
            </button>)}
          </div>
          <button type="button" onClick={() => setShowMoreFilters((value) => !value)} aria-expanded={showMoreFilters} aria-controls="wishlist-more-filters" className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[10px] font-medium tracking-wide transition ${showMoreFilters ? "border-[#cbb78f]! bg-[#f8f4ea]! text-[#977c4e]!" : "border-[#e8e1d5]! bg-white! text-[#928269]! hover:bg-[#faf7ef]!"}`}><SlidersHorizontal size={13} aria-hidden="true" />Refine collection{[vendor, min, max].filter((value) => value !== "").length > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-[#eee5d3] text-[9px] text-[#987c4d]">{[vendor, min, max].filter((value) => value !== "").length}</span>}</button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className={`${field} flex-[2_1_240px]`}>
              <span>Find a saved favorite</span>
              <span className="relative block min-w-0"><Search size={15} className="pointer-events-none absolute top-3.5 left-3.5 text-[#b4a17d]" aria-hidden="true" /><input type="search" className={`${control} pl-10`} aria-label="Search wishlist" placeholder="Search saved items…" value={q} onChange={(event) => setQ(event.target.value)} /></span>
            </label>
            {[[city, setCity, "City", "city", "All cities"], [category, setCategory, "Category", "category", "All categories"]].map(([value, set, label, key, all]) => (
              <label key={key} className={`${field} flex-[1_1_150px]`}>
                <span>{label}</span>
                <select className={control} aria-label={label} value={value} onChange={(event) => set(event.target.value)}><option value="">{all}</option>{[...new Set(wish.rows.map((item) => item[key]).filter(Boolean))].sort().map((option) => <option key={option} value={option}>{option}</option>)}</select>
              </label>
            ))}
          </div>

          <div id="wishlist-more-filters" hidden={!showMoreFilters}>
          <div className="flex flex-wrap items-end gap-4 border-t border-[#eee8dd] pt-4">
            <label className={`${field} flex-[1_1_200px]`}>
              <span>Vendor</span>
              <select className={control} aria-label="Vendor" value={vendor} onChange={(event) => setVendor(event.target.value)}><option value="">All vendors</option>{[...new Set(wish.rows.map((item) => item.vendor).filter(Boolean))].sort().map((option) => <option key={option} value={option}>{option}</option>)}</select>
            </label>
            <fieldset className="m-0 min-w-0 flex-[2_1_280px] border-0 p-0">
              <legend className="mb-2 text-[10px] font-medium text-[#998c76]">Price range <span className="font-normal text-[#aaa18e]">(INR)</span></legend>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <input type="number" min="0" step="any" className={control} aria-label="Minimum price" aria-invalid={priceError} aria-describedby={priceError ? "wishlist-price-error" : undefined} placeholder="Min price ₹" value={min} onChange={(event) => setMin(event.target.value)} />
                <span className="text-xs text-[#bdb19a]" aria-hidden="true">—</span>
                <input type="number" min="0" step="any" className={control} aria-label="Maximum price" aria-invalid={priceError} aria-describedby={priceError ? "wishlist-price-error" : undefined} placeholder="Max price ₹" value={max} onChange={(event) => setMax(event.target.value)} />
              </div>
            </fieldset>
          </div>
          </div>
          {priceError && <p id="wishlist-price-error" role="alert" className="rounded-lg bg-[#fcf2ee] px-3 py-2 text-[11px] text-[#a96e58]">Maximum price must be at least the minimum price.</p>}
          {activeFilters.length > 0 && <div aria-label="Active wishlist filters" className="flex flex-wrap items-center gap-2">{activeFilters.map(([label, value, reset]) => <button type="button" key={label} onClick={reset} aria-label={`Remove ${label.toLowerCase()} filter: ${value}`} className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-lg border border-[#e6ddcd]! bg-[#f8f5ee]! px-2.5 py-1.5 text-[10px] text-[#8b7858]! hover:border-[#c7b28c]!"><span className="min-w-0 truncate">{label}: {value}</span><X size={11} className="shrink-0" aria-hidden="true" /></button>)}<button type="button" onClick={clearFilters} className="min-h-8 cursor-pointer rounded-lg px-2 text-[11px] font-medium text-[#8c7854]! underline underline-offset-4 hover:bg-[#f6f1e6]">Clear all</button></div>}
        </div>
      </section>

      <section id="wishlist-results" aria-labelledby="wishlist-results-title" aria-busy={wish.loading} className="min-w-0 space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1.5 text-[8px] font-medium uppercase tracking-[0.22em] text-[#b29a70]">The beginning of something beautiful</p>
            <h2 id="wishlist-results-title" className="font-serif text-[28px] leading-tight tracking-[-0.5px] text-[#3e5140]">{type === "All" ? "Your saved favorites" : `Your saved ${type.toLowerCase()}s`}</h2>
            <p role="status" aria-live="polite" aria-atomic="true" className="mt-1 text-[11px] text-[#9b917f]">{wish.loading ? "Loading your collection…" : wish.error ? "Your collection couldn’t be loaded." : `Showing ${rows.length} of ${wish.rows.length} saved ${wish.rows.length === 1 ? "item" : "items"}`}</p>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-3">
            <label className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-[10px] text-[#a59a86]">Sort by</span><select className={`${control} w-auto! max-w-full bg-white!`} aria-label="Sort wishlist" value={sort} onChange={(event) => setSort(event.target.value)}>{[["newest", "Newest saved"], ["rating", "Highest rating"], ["priceAsc", "Price: low to high"], ["priceDesc", "Price: high to low"]].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <div role="group" aria-label="Wishlist view" className="inline-flex shrink-0 gap-1 rounded-xl border border-[#e7dfd1] bg-white p-1">
              {[[false, "Grid view", LayoutGrid], [true, "List view", List]].map(([value, label, Icon]) => <button type="button" key={label} title={label} aria-label={label} aria-pressed={list === value} onClick={() => setList(value)} className={`flex size-9 cursor-pointer items-center justify-center rounded-lg transition motion-reduce:transition-none ${list === value ? "bg-[#eee7d8]! text-[#91754b]!" : "bg-white! text-[#aaa08d]! hover:bg-[#f8f5ed]!"}`}><Icon size={16} aria-hidden="true" /></button>)}
            </div>
          </div>
        </header>

        {wish.loading ? (
          <div role="status" aria-label="Loading saved items" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="overflow-hidden rounded-2xl border border-[#e9e3d9] bg-white"><div className="h-56 animate-pulse bg-[#eee7db] motion-reduce:animate-none xl:h-[250px]" /><div className="space-y-3 p-6"><div className="h-5 w-3/4 animate-pulse rounded-md bg-[#f0ebe1] motion-reduce:animate-none" /><div className="h-3 w-1/2 rounded bg-[#f5f1e9]" /><div className="h-11 rounded-lg bg-[#faf7f1]" /></div></div>)}</div>
        ) : wish.error ? <ErrorView error={wish.error} retry={wish.refresh} /> : !rows.length ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfd2ba] bg-white px-6 py-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-[#f3ece0] text-[#b49a70]">{wish.rows.length ? <Search size={26} strokeWidth={1.5} aria-hidden="true" /> : <Heart size={27} strokeWidth={1.5} aria-hidden="true" />}</span>
            <h3 className="mt-5 font-serif text-[27px] text-[#40523f]">{wish.rows.length ? "No matching favorites" : "A little inspiration starts here"}</h3>
            <p className="mt-2 max-w-sm text-xs leading-6 text-[#948b7a]">{wish.rows.length ? "Try a different search or clear your filters to see more of your saved collection." : "Find a venue you love, a vendor who gets you, or the perfect finishing touch. Tap the heart to keep it here."}</p>
            {wish.rows.length ? <button type="button" onClick={clearFilters} className={`${primaryButton} mt-5 cursor-pointer`}>Clear filters<ArrowRight size={15} aria-hidden="true" /></button> : <Link to="/services" className={`${primaryButton} mt-5`}>Explore services<ArrowUpRight size={15} aria-hidden="true" /></Link>}
          </div>
        ) : (
          <div className={list ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"}>
            {rows.map((item) => <div key={item.id} className={`${cardStyles} ${list ? "[&>.cw-service-card]:sm:flex-row [&_.cw-service-photo]:h-56! sm:[&_.cw-service-photo]:h-auto! sm:[&_.cw-service-photo]:min-h-[260px] sm:[&_.cw-service-photo]:w-64 sm:[&_.cw-service-photo]:shrink-0 sm:[&_.cw-service-photo>img:first-child]:absolute sm:[&_.cw-service-photo>img:first-child]:inset-0" : "[&_.cw-service-photo]:h-56! xl:[&_.cw-service-photo]:h-[250px]!"}`}><ServiceCard item={item} saved /></div>)}
          </div>
        )}
      </section>

      <footer className="flex flex-col items-center gap-2.5 border-t border-[#e6dfd2] pt-7 pb-2 text-center">
        <span className="inline-flex items-center gap-2 text-[8px] font-medium uppercase tracking-[0.3em] text-[#b29a72]"><Sparkles size={12} strokeWidth={1.3} aria-hidden="true" />MarryNest</span>
        <p className="font-serif text-[17px] italic text-[#9c927f]">A few favorites today. An unforgettable celebration tomorrow.</p>
      </footer>
    </div>
  );
}
