import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  LayoutGrid,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { CATEGORIES } from "../../../services/public";
import PageMeta from "../../../components/common/PageMeta";
import CollectionState from "../../../components/common/CollectionState";
import { categoryImages } from "../../../components/home/categoryImages";
import { serviceGroups, servicePath } from "../../../components/layout/services";

const categoryDetails = new Map(
  serviceGroups.flatMap((group) =>
    group.items.map(([name, description, Icon]) => [
      name,
      { group: group.name, description, Icon },
    ]),
  ),
);
const filters = [
  { name: "All categories", Icon: LayoutGrid },
  ...serviceGroups.map((group) => ({
    name: group.name,
    Icon: group.items[0][2],
  })),
];

export default function CategoriesPage() {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("All categories");
  const { data, loading, error, refetch } = useQuery(CATEGORIES, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const categories = (data?.popularServices || []).map((category) => {
    const details = categoryDetails.get(category.name);
    return {
      ...category,
      group: details?.group || "Additional Services",
      subtitle:
        details?.description ||
        category.description ||
        "Discover the details that make your day yours",
      Icon: details?.Icon || Sparkles,
    };
  });
  const search = query.trim().toLowerCase();
  const visibleCategories = categories.filter(
    (category) =>
      (activeGroup === "All categories" || category.group === activeGroup) &&
      `${category.name} ${category.subtitle} ${category.description || ""}`
        .toLowerCase()
        .includes(search),
  );
  const resetFilters = () => {
    setQuery("");
    setActiveGroup("All categories");
  };
  const retry = () => {
    void refetch().catch(() => {});
  };

  return (
    <main id="main-content" className="min-h-screen bg-cream text-[#443a3c] selection:bg-rose-brand/15">
      <PageMeta
        title="All wedding and event categories"
        description="Explore every wedding and event category, from venues and catering to photography, beauty and celebration essentials."
      />
      <div className="mx-auto max-w-[1360px] px-4 pb-16 pt-5 sm:px-6 sm:pb-20 lg:px-10 lg:pt-7">
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-3 text-xs text-[#8e7d78]">
          <Link
            to="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-sm transition-colors hover:text-rose-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-brand"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Home
          </Link>
          <span aria-hidden="true" className="text-[#c8b8ae]">/</span>
          <span aria-current="page" className="text-rose-brand">All categories</span>
        </nav>

        <section id="category-collection" aria-labelledby="category-collection-title" className="scroll-mt-28">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 id="category-collection-title" className="font-serif text-[26px] leading-tight tracking-[-0.6px] sm:text-[30px]">
                Find your celebration essentials
              </h1>
              <p className="mt-2 text-[13px] text-[#8a7976]">
                Big moments. Little details. Everything in between.
              </p>
            </div>
            <div className="flex min-h-12 w-full items-center gap-3 rounded-full border border-[#e5dad1] bg-white px-4 shadow-[0_2px_6px_#57423b03] transition focus-within:border-rose-brand/60 focus-within:ring-2 focus-within:ring-rose-brand/10 lg:max-w-[340px]">
              <Search size={17} strokeWidth={1.5} className="shrink-0 text-[#9b817a]" aria-hidden="true" />
              <label htmlFor="category-search" className="sr-only">Search categories</label>
              <input
                id="category-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What are you looking for?"
                className="min-w-0 flex-1 bg-transparent py-3 text-[13px] text-[#443a3c] outline-none placeholder:text-[#aa9790] [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear category search" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8a7976] hover:bg-[#f5eeea] focus-visible:outline-2 focus-visible:outline-rose-brand">
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div role="group" aria-label="Filter categories" className="mt-6 flex gap-2 overflow-x-auto pb-3 sm:flex-wrap">
            {filters.map(({ name, Icon }) => {
              const count = name === "All categories"
                ? categories.length
                : categories.filter((category) => category.group === name).length;
              if (!count && name !== "All categories") return null;
              const selected = activeGroup === name;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveGroup(name)}
                  className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-brand ${selected ? "border-rose-brand bg-rose-brand text-white" : "border-[#e5dad1] bg-transparent text-[#807174] hover:border-[#c5a69e] hover:bg-[#f2e9e3] hover:text-rose-brand"}`}
                >
                  <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
                  {name}
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${selected ? "bg-white/15 text-white" : "bg-[#eee5de] text-[#8a7976]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-5 mt-2 flex items-center justify-between gap-4 border-t border-[#e9e0d9] pt-5">
            <p aria-live="polite" aria-atomic="true" className="text-xs text-[#8a7976]">
              {loading && !categories.length
                ? "Loading categories..."
                : <>Showing <span className="font-semibold text-[#68534d]">{visibleCategories.length}</span> of {categories.length} categories</>}
            </p>
            {(query || activeGroup !== "All categories") && (
              <button type="button" onClick={resetFilters} className="inline-flex min-h-9 items-center gap-1.5 rounded-sm text-xs text-rose-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-brand">
                <X size={12} aria-hidden="true" /> Clear filters
              </button>
            )}
          </div>

          {visibleCategories.length ? (
          <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-6">
            {visibleCategories.map((category) => (
              <Link
                key={category.id}
                to={servicePath(category.name)}
                className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#e9dfd6] bg-[#fffdfb] p-2 shadow-[0_3px_12px_-8px_#6a484028] transition duration-300 hover:-translate-y-1 hover:border-[#cfb0a5] hover:shadow-[0_16px_36px_-22px_#6a484065] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-brand motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="relative aspect-[1.35] overflow-hidden rounded-[13px] bg-[#eee5dd]">
                  <img
                    src={category.image || categoryImages[category.name] || categoryImages["Venue & Location"]}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                  />
                  <span className="absolute left-3 top-3 rounded-full border border-white/50 bg-[#fffaf4]/95 px-2.5 py-1.5 text-[9px] font-medium tracking-wide text-[#765d53] shadow-sm">
                    {category.group}
                  </span>
                  <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-[#fffaf4]/95 text-rose-brand shadow-sm" aria-hidden="true">
                    <category.Icon size={17} strokeWidth={1.4} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
                  <h3 className="min-h-12 font-serif text-[19px] leading-[1.3] tracking-[-0.3px] text-[#443a3c] transition-colors group-hover:text-rose-brand sm:text-[20px]">
                    {category.name}
                  </h3>
                  <p className="mt-1 min-h-10 line-clamp-2 text-xs leading-[1.7] text-[#95827b]">
                    {category.subtitle}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f0e7e0] pt-3">
                    <span className="text-[11px] font-medium text-rose-brand">Explore category</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5ece6] text-rose-brand transition-colors group-hover:bg-rose-brand group-hover:text-white">
                      <ArrowUpRight size={15} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : categories.length ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#ddc9bd] bg-[#fffdfb] px-5 py-12 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f5ece6] text-rose-brand">
              <Search size={21} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <h3 className="font-serif text-2xl">No categories found</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#8a7976]">Try a different search or clear your filters to explore the full collection.</p>
            <button type="button" onClick={resetFilters} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-rose-brand px-5 py-2.5 text-xs font-medium text-white hover:bg-[#74333f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-brand">
              View all categories <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <CollectionState
            loading={loading}
            failed={Boolean(error)}
            retry={retry}
            empty="Our category collection is growing."
          />
        )}
        </section>
      </div>
    </main>
  );
}
