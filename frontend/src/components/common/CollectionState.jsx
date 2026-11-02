import { Flower2, RefreshCw } from "lucide-react";
export default function CollectionState({ loading, failed, empty, retry }) {
  if (loading)
    return (
      <div
        className="mp-skeleton-grid grid grid-cols-[repeat(3,_1fr)] gap-[20px] [@media(width<=767px)]:grid-cols-[1fr]"
        role="status"
        aria-label="Loading marketplace listings"
      >
        {[1, 2, 3].map((n) => (
          <div className="mp-skeleton h-[260px] rounded-[7px] bg-[linear-gradient(110deg,_#eee6df_20%,_#f8f3ed_40%,_#eee6df_60%)] bg-size-[200%_100%] animate-mp-shimmer [@media(width<=767px)]:[&.mp-skeleton:not(:first-child)]:hidden" key={n} />
        ))}
        <span className="sr-only">Loading listings…</span>
      </div>
    );
  return (
    <div className="mp-collection-state min-h-[210px] border border-dashed border-[#d9c9bf] flex flex-col justify-center items-center gap-[12px] bg-[#f6f0e980] rounded-[6px] p-[35px] text-center [&.mp-collection-state_>_svg]:text-[#9d726b] [&.mp-collection-state_h3]:m-0 [&.mp-collection-state_h3]:text-[23px] [&.mp-collection-state_p]:text-[12px] [&.mp-collection-state_button]:border-0 [&.mp-collection-state_button]:bg-transparent [&.mp-collection-state_button]:min-h-[40px] [@media(width<=767px)]:py-[30px] [@media(width<=767px)]:px-[18px] [@media(width<=767px)]:min-h-[210px] [@media(width<=767px)]:[&.mp-collection-state_h3]:text-[23px]" role="status">
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
        <button className="mn-text-link inline-flex items-center gap-[8px] text-[#8c414e] text-[12px]" onClick={retry}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}
