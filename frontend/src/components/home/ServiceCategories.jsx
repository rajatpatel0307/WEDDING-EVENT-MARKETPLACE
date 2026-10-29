import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { serviceGroups, servicePath } from "../layout/services";
import SectionHeader from "../common/SectionHeader";
import CollectionState from "../common/CollectionState";
import { categoryImages } from "./categoryImages";

const taxonomy = serviceGroups.flatMap((g) => g.items);

export default function ServiceCategories({
  items,
  loading,
  retry,
  visual = false,
}) {
  const half = items?.length ? Math.ceil(items.length / 2) : 0;
  const row1 = items ? items.slice(0, half) : [];
  const row2 = items ? items.slice(half) : [];

  const renderCard = (item, uniqueKey) => {
    const Icon =
      taxonomy.find(([name]) => name === item.name)?.[2] || Sparkles;
    const image =
      categoryImages[item.name] || categoryImages["Venue & Location"];

    return (
      <Link
        key={uniqueKey}
        to={servicePath(item.name)}
        className="group relative flex-shrink-0 w-60 sm:w-72 h-40 sm:h-52 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-200/80 bg-white"
      >
        {visual ? (
          <div className="w-full h-full relative overflow-hidden">
            <img
              src={image}
              alt={item.name}
              loading="lazy"
              width="450"
              height="340"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-900/35 to-transparent" />
          </div>
        ) : (
          <div className="p-4 sm:p-5 flex flex-col justify-between h-full bg-stone-50">
            <Icon size={24} strokeWidth={1.25} className="text-amber-800" />
            <p className="text-xs text-stone-500 line-clamp-2">
              {item.description ||
                taxonomy.find(([name]) => name === item.name)?.[1] ||
                "Find the details that make your day."}
            </p>
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 p-3.5 sm:p-4 flex items-end justify-between z-10">
          <div>
            <h3
              className={`text-sm sm:text-base md:text-lg font-serif font-medium ${visual ? "text-white" : "text-stone-900"
                }`}
            >
              {item.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium tracking-wide uppercase mt-0.5 sm:mt-1 ${visual
                  ? "text-amber-200 group-hover:text-amber-100"
                  : "text-amber-800"
                }`}
            >
              Explore <ArrowUpRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section className="relative overflow-hidden py-10 sm:py-16">
      {/* Component-scoped Animations */}
      <style>{`
        @keyframes scrollClockwise {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes scrollAnticlockwise {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .anim-clockwise {
          display: flex;
          width: max-content;
          animation: scrollClockwise 30s linear infinite;
        }
        .anim-anticlockwise {
          display: flex;
          width: max-content;
          animation: scrollAnticlockwise 30s linear infinite;
        }
        .marquee-container:hover .anim-clockwise,
        .marquee-container:hover .anim-anticlockwise {
          animation-play-state: paused;
        }
      `}</style>

      {/* Header Container */}
      <div className="max-w-[1230px] mx-auto px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
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

      {items?.length ? (
        /* Screen edges se proper spacing container */
        <div className="max-w-[1230px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative w-full space-y-4 sm:space-y-6 overflow-hidden rounded-3xl p-1">
            {/* Left & Right Soft Fade Masks */}
            <div className="absolute left-0 inset-y-0 w-8 sm:w-20 bg-gradient-to-r from-[#faf8f5] to-transparent z-20 pointer-events-none" />
            <div className="absolute right-0 inset-y-0 w-8 sm:w-20 bg-gradient-to-l from-[#faf8f5] to-transparent z-20 pointer-events-none" />

            {/* Row 1: Clockwise scroll (Left to Right) */}
            <div className="flex overflow-hidden marquee-container py-1">
              <div className="anim-clockwise gap-4 sm:gap-6">
                {row1.map((item, idx) => renderCard(item, `r1-a-${idx}`))}
                {row1.map((item, idx) => renderCard(item, `r1-b-${idx}`))}
              </div>
            </div>

            {/* Row 2: Anti-Clockwise scroll (Right to Left) */}
            <div className="flex overflow-hidden marquee-container py-1">
              <div className="anim-anticlockwise gap-4 sm:gap-6">
                {row2.map((item, idx) => renderCard(item, `r2-a-${idx}`))}
                {row2.map((item, idx) => renderCard(item, `r2-b-${idx}`))}
              </div>
            </div>
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