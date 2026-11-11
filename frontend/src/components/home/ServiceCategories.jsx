
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { servicePath } from "../layout/services";
import SectionHeader from "../common/SectionHeader";
import CollectionState from "../common/CollectionState";
import { categoryImages } from "./categoryImages";

export default function ServiceCategories({
  items,
  loading,
  retry,
  visual = true,
}) {
  const midpoint = Math.ceil((items?.length || 0) / 2);
  const rows = items?.length
    ? [items.slice(0, midpoint), items.slice(midpoint)].filter((row) => row.length)
    : [];

  const renderCard = (item, index) => {
    const image =
      item.image ||
      categoryImages[item.name] ||
      categoryImages["Venue & Location"];

    return (
      <Link
        key={`${item.name}-${index}`}
        to={servicePath(item.name)}
        className="group relative block flex-none w-[calc((100cqw-var(--category-gap))/1.25)] sm:w-[calc((100cqw-var(--category-gap))/2)] lg:w-[calc((100cqw-3*var(--category-gap))/4)] h-44 sm:h-52 lg:h-56 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      >
        {/* Category Image */}
        <img
          src={image}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {/* Card Content */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
          <h3 className="text-sm sm:text-base lg:text-lg font-serif font-medium text-white leading-snug">
            {item.name}
          </h3>

          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium tracking-wider uppercase text-amber-200 mt-2 group-hover:text-white transition-colors">
            Explore
            <ArrowUpRight
              size={14}
              className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </span>
        </div>
      </Link>
    );
  };

  return (
    <section className="relative py-10 sm:py-16">
      {/* Header */}
      <div className="max-w-[1230px] mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-10">
        <SectionHeader
          eyebrow={
            visual
              ? "FIND YOUR OWN WAY TO CELEBRATE"
              : "FROM THE BIG THINGS TO THE LITTLE DETAILS"
          }
          title={
            visual
              ? "A day that’s entirely you."
              : "Everything you need for your wedding."
          }
          description={
            visual
              ? "Explore the people and possibilities behind your celebration."
              : "Find wedding professionals for every part of your celebration."
          }
          link="/categories"
          linkText="All categories"
        />
      </div>

      {/* Both rows reverse at the last card and travel in opposite directions. */}
      {items?.length ? (
        <div className="max-w-[1230px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:gap-5 lg:gap-6 [container-type:inline-size] [--category-gap:1rem] sm:[--category-gap:1.25rem] lg:[--category-gap:1.5rem]">
            {rows.map((row, rowIndex) => (
              <div
                className="group/service-row overflow-hidden py-1.5 focus-within:overflow-x-auto motion-reduce:overflow-x-auto"
                key={rowIndex}
              >
                <div
                  className={`flex w-max gap-4 sm:gap-5 lg:gap-6 animate-service-categories-scroll group-hover/service-row:[animation-play-state:paused] group-active/service-row:[animation-play-state:paused] group-focus-within/service-row:animate-none motion-reduce:animate-none ${rowIndex === 0 ? "[animation-direction:alternate]" : "[animation-direction:alternate-reverse]"}`}
                  style={{
                    "--category-duration": `${(Math.max(midpoint - 4, 1) * 10) }s`,
                  }}
                >
                  {row.map((item, index) => renderCard(item, index))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CollectionState
            loading={loading}
            failed={!items}
            retry={retry}
            empty="Our service collection is growing."
          />
        </div>
      )}
    </section>
  );
}
