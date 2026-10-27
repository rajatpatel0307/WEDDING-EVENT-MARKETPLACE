import { Flower2, RefreshCw } from "lucide-react";
export default function CollectionState({ loading, failed, empty, retry }) {
  if (loading)
    return (
      <div
        className="mp-skeleton-grid"
        role="status"
        aria-label="Loading marketplace listings"
      >
        {[1, 2, 3].map((n) => (
          <div className="mp-skeleton" key={n} />
        ))}
        <span className="sr-only">Loading listings…</span>
      </div>
    );
  return (
    <div className="mp-collection-state" role="status">
      <Flower2 size={23} strokeWidth={1.25} />
      <h3>
        {failed
          ? "A little pause in the planning."
          : empty || "New possibilities are on their way."}
      </h3>
      <p>
        {failed
          ? "We couldn’t load this collection. Please try again."
          : "Check back for approved listings as our community grows."}
      </p>
      {failed && retry && (
        <button className="mn-text-link" onClick={retry}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}
