import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
import CollectionState from "../common/CollectionState";
export default function Testimonials({ items, loading, retry }) {
  const [index, setIndex] = useState(0),
    selected = items?.length ? index % items.length : 0,
    item = items?.[selected];
  return (
    <section className="mp-testimonials">
      <div className="mp-section">
        <SectionHeader
          eyebrow="REAL PEOPLE. MEANINGFUL MOMENTS."
          title="Love stories, in their own words."
        />
        {item ? (
          <div
            className="mp-testimonial-content"
            role="region"
            aria-roledescription="carousel"
            aria-label="Customer experiences"
          >
            <Quote className="mp-quote-icon" size={35} strokeWidth={1} />
            <div
              className="mp-review-stars"
              aria-label={`${item.rating} out of 5 stars`}
            >
              {Array.from({ length: item.rating }, (_, i) => (
                <Star key={i} size={15} fill="currentColor" />
              ))}
            </div>
            <div aria-live="polite" aria-atomic="true">
              <blockquote>“{item.review}”</blockquote>
              <div className="mp-review-person">
                <span className="mn-avatar">{item.customerName[0]}</span>
                <div>
                  <strong>{item.customerName}</strong>
                  <p>
                    {item.location ? `Celebrated in ${item.location} · ` : ""}
                    {item.weddingDate.slice(0, 4)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mp-carousel-controls">
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
