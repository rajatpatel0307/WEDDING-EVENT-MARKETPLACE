import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import CollectionState from "../common/CollectionState";

const arrowClass =
  "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-[#d9c4b8] text-rose-brand transition-colors hover:border-rose-brand hover:bg-rose-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-brand disabled:cursor-default disabled:opacity-40 disabled:hover:border-[#d9c4b8] disabled:hover:bg-transparent disabled:hover:text-rose-brand";

export default function Testimonials({ items, loading, retry }) {
  const [index, setIndex] = useState(0);
  const selected = items?.length ? index % items.length : 0;
  const item = items?.[selected];
  return (
    <section
      aria-labelledby="stories-heading"
      className="relative overflow-hidden border-y border-[#e8dcd2] bg-[#f2eae3]"
    >
      <div
        className="pointer-events-none absolute -right-20 top-12 size-72 rounded-full border border-[#dfccbf]/60"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-[1320px] px-[6%] py-14 sm:px-[5%] lg:py-20">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <span className="text-[10px] font-semibold tracking-[2px] text-rose-brand">
            REAL PEOPLE. MEANINGFUL MOMENTS.
          </span>
          <h2 id="stories-heading" className="mt-4 font-serif">
            Love stories, <em>in their own words.</em>
          </h2>
        </div>
        {item ? (
          <div
            className="mx-auto max-w-3xl text-center"
            role="region"
            aria-roledescription="carousel"
            aria-label="Customer experiences"
          >
            <div className="rounded-[24px] border border-white/80 bg-[#fffdfa] px-6 py-9 shadow-[0_8px_32px_#76504406] sm:px-12 sm:py-10">
              <Quote
                size={34}
                strokeWidth={1}
                className="mx-auto mb-5 text-[#b68e7b]"
                aria-hidden="true"
              />
              <div aria-live="polite" aria-atomic="true">
                <div
                  className="flex justify-center gap-1 text-[#b68a47]"
                  aria-label={`${item.rating} out of 5 stars`}
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < Number(item.rating) ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <blockquote className="my-6 wrap-anywhere font-serif text-[22px] italic leading-relaxed text-[#6b4d50] sm:text-[28px]">
                  &ldquo;{item.review}&rdquo;
                </blockquote>
                <div className="flex items-center justify-center gap-3 text-left">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f0e1db] font-serif text-xl text-rose-brand"
                    aria-hidden="true"
                  >
                    {item.customerName?.[0] || "M"}
                  </span>
                  <div>
                    <strong className="text-xs font-medium">
                      {item.customerName}
                    </strong>
                    <p className="mt-0.5 text-[10px]!">
                      {[
                        item.location ? `Celebrated in ${item.location}` : null,
                        item.weddingDate?.slice(0, 4),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                className={arrowClass}
                aria-label="Previous testimonial"
                onClick={() =>
                  setIndex((selected - 1 + items.length) % items.length)
                }
                disabled={items.length < 2}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <div className="flex max-w-[50%] flex-wrap justify-center">
                {items.map((review, i) => (
                  <button
                    key={review.id}
                    type="button"
                    aria-label={`Show testimonial ${i + 1}`}
                    aria-current={selected === i ? "true" : undefined}
                    onClick={() => setIndex(i)}
                    className="group grid min-h-11 w-7 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-rose-brand"
                  >
                    <span className="size-1.5 rounded-full bg-[#cbb3a6] transition-all group-hover:bg-rose-brand group-aria-current:w-4 group-aria-current:bg-rose-brand" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={arrowClass}
                aria-label="Next testimonial"
                onClick={() => setIndex((selected + 1) % items.length)}
                disabled={items.length < 2}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <CollectionState
            loading={loading}
            failed={!items}
            retry={retry}
            empty="The next love story could be yours."
          />
        )}
      </div>
    </section>
  );
}
