
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
  const renderCard = (item, index) => {
    const image =
      categoryImages[item.name] ||
      categoryImages["Venue & Location"];

    return (
      <Link
        key={`${item.name}-${index}`}
        to={servicePath(item.name)}
        className="group relative block w-full h-44 sm:h-52 lg:h-56 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
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
          link="/services"
          linkText="All services"
        />
      </div>

      {/* Fixed 4 Column Grid */}
      {items?.length ? (
        <div className="max-w-[1230px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {items.map((item, index) =>
              renderCard(item, index)
            )}
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
