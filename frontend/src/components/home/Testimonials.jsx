import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
import CollectionState from "../common/CollectionState";
export default function Testimonials({ items, loading, retry }) {
  const [index, setIndex] = useState(0),
    selected = items?.length ? index % items.length : 0,
    item = items?.[selected];
  return (
    <section className="mp-testimonials bg-[#f4ece6] border-t border-t-[#e6d9ce] border-b border-b-[#e6d9ce] [&.mp-testimonials_.mp-section-heading]:justify-center [&.mp-testimonials_.mp-section-heading]:text-center">
      <div className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]">
        <SectionHeader
          eyebrow="REAL PEOPLE. MEANINGFUL MOMENTS."
          title="Love stories, in their own words."
        />
        {item ? (
          <div
            className="mp-testimonial-content text-center max-w-[740px] m-auto [&.mp-testimonial-content_blockquote]:font-[Georgia,serif] [&.mp-testimonial-content_blockquote]:text-[clamp(21px,_2.5vw,_30px)] [&.mp-testimonial-content_blockquote]:leading-[1.6] [&.mp-testimonial-content_blockquote]:italic [&.mp-testimonial-content_blockquote]:my-[25px] [&.mp-testimonial-content_blockquote]:mx-0 [&.mp-testimonial-content_blockquote]:text-[#6b4d50] [&.mp-testimonial-content_blockquote]:wrap-anywhere [@media(width<=767px)]:[&.mp-testimonial-content_blockquote]:text-[23px] [@media(width<=767px)]:[&.mp-testimonial-content_.mp-review-person_p]:text-[10px]"
            role="region"
            aria-roledescription="carousel"
            aria-label="Customer experiences"
          >
            <Quote className="mp-quote-icon text-[#b18d7d] mb-[15px]" size={35} strokeWidth={1} />
            <div
              className="mp-review-stars flex justify-center gap-[4px] text-[#bc965d]"
              aria-label={`${item.rating} out of 5 stars`}
            >
              {Array.from({ length: item.rating }, (_, i) => (
                <Star key={i} size={15} fill="currentColor" />
              ))}
            </div>
            <div aria-live="polite" aria-atomic="true">
              <blockquote>“{item.review}”</blockquote>
              <div className="mp-review-person flex items-center justify-center gap-[12px] text-left [&.mp-review-person_strong]:font-medium [&.mp-review-person_strong]:text-[12px] [&.mp-review-person_p]:text-[10px]!">
                <span className="mn-avatar rounded-full bg-[#efe0de] w-[30px] h-[30px] grid place-items-center text-[#8c414e] font-[Georgia,serif] text-[16px] max-[768px]:w-[28px] max-[768px]:h-[28px]">{item.customerName[0]}</span>
                <div>
                  <strong>{item.customerName}</strong>
                  <p>
                    {item.location ? `Celebrated in ${item.location} · ` : ""}
                    {item.weddingDate.slice(0, 4)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mp-carousel-controls flex items-center justify-center gap-[20px] mt-[25px] [&.mp-carousel-controls_button]:bg-transparent [&.mp-carousel-controls_button]:border [&.mp-carousel-controls_button]:border-[#cfb9aa] [&.mp-carousel-controls_button]:rounded-full [&.mp-carousel-controls_button]:w-[38px] [&.mp-carousel-controls_button]:h-[38px] [&.mp-carousel-controls_button]:grid [&.mp-carousel-controls_button]:place-items-center [&.mp-carousel-controls_button]:text-[#947060] [&.mp-carousel-controls_>_div]:flex [&.mp-carousel-controls_>_div]:items-center [&.mp-carousel-controls_>_div]:gap-[1px] [&.mp-carousel-controls_>_div_button]:border-0 [&.mp-carousel-controls_>_div_button]:w-[27px] [&.mp-carousel-controls_>_div_button]:h-[38px] [&.mp-carousel-controls_>_div_button_span]:w-[5px] [&.mp-carousel-controls_>_div_button_span]:h-[5px] [&.mp-carousel-controls_>_div_button_span]:rounded-full [&.mp-carousel-controls_>_div_button_span]:bg-[#cdb9ac] [&.mp-carousel-controls_>_div_button[aria-current='true']_span]:bg-[#8c414e] [&.mp-carousel-controls_>_div_button[aria-current='true']_span]:w-[7px] [&.mp-carousel-controls_>_div_button[aria-current='true']_span]:h-[7px]">
              <button
                aria-label="Previous testimonial"
                onClick={() =>
                  setIndex((selected - 1 + items.length) % items.length)
                }
                disabled={items.length < 2}
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                {items.map((r, i) => (
                  <button
                    key={r.id}
                    aria-label={`Show testimonial ${i + 1}`}
                    aria-current={selected === i ? "true" : undefined}
                    onClick={() => setIndex(i)}
                  >
                    <span />
                  </button>
                ))}
              </div>
              <button
                aria-label="Next testimonial"
                onClick={() => setIndex((selected + 1) % items.length)}
                disabled={items.length < 2}
              >
                <ChevronRight size={18} />
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
