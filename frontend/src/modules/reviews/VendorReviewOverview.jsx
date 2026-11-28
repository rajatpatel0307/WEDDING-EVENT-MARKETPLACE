import { BriefcaseBusiness, ChevronDown, MessageSquare, ShieldCheck, Star, TrendingUp } from "lucide-react";

const reviewsLabel = (count) => `${count} ${Number(count) === 1 ? "review" : "reviews"}`;
const progressClasses = "[&&]:h-2 [&&]:w-full [&&]:overflow-hidden [&&]:rounded-full [&&]:border-0 [&&]:bg-[#edf1e6] [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[#edf1e6] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[#a7bb8d] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[#a7bb8d]";

export default function VendorReviewOverview({ data, choose, selectedRating }) {
  const total = Number(data.totalReviews || 0);
  const average = Number(data.averageRating || 0);
  const responseRate = Math.max(0, Math.min(100, Number(data.responseRate || 0)));
  const services = data.services || [];
  const trends = data.trends || [];
  return (
    <div className="mb-6 grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <section aria-labelledby="vendor-rating-heading" className="overflow-hidden rounded-2xl border border-[#e0e7d9] bg-white shadow-[0_3px_12px_#294f3c04]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0e7] px-5 py-4">
            <h2 id="vendor-rating-heading" className="[&&]:m-0 [&&]:text-[13px] [&&]:font-semibold">Your reputation, at a glance</h2>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-[#6b8059]"><ShieldCheck size={13} aria-hidden="true" />Verified bookings only</span>
          </div>
          <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:gap-7 sm:p-6">
            <div className="flex items-center justify-between gap-5 rounded-xl border border-[#ece4d2] bg-[#fcfaf4] p-5 sm:block sm:min-w-40">
              <div><span className="text-[9px] font-semibold tracking-[0.12em] text-[#8b805e] uppercase">Overall vendor rating</span><div className="mt-2 flex items-baseline gap-1.5"><span className="text-[44px] leading-none font-semibold tracking-[-0.05em] text-[#344e39]">{average.toFixed(1)}</span><span className="text-xs text-[#8b8d77]">/ 5</span></div>
                <div className="mt-3 flex gap-1 text-[#b99148]" role="img" aria-label={`${average.toFixed(1)} out of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={15} strokeWidth={1.5} fill={n <= Math.round(average) ? "currentColor" : "none"} aria-hidden="true" />)}</div>
              </div>
              <span className="mt-3 block text-[11px] text-[#7b806b]">Based on {reviewsLabel(total)}</span>
            </div>
            <div className="grid content-center gap-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = Number(data.distribution?.find((row) => Number(row.rating) === rating)?.count || 0);
                return (
                  <button key={rating} type="button" onClick={() => choose("rating", String(selectedRating) === String(rating) ? "" : String(rating))} aria-pressed={String(selectedRating) === String(rating)} aria-label={`Filter ${rating} star reviews: ${count} ${count === 1 ? "review" : "reviews"}`} className="[&&]:grid [&&]:grid-cols-[1.75rem_1fr_1.5rem] [&&]:gap-3 [&&]:rounded-lg [&&]:border-transparent [&&]:bg-transparent [&&]:px-2 [&&]:py-1.5 [&&:hover]:bg-[#f7f9f2] [&&[aria-pressed=true]]:bg-[#edf3e5] [&&[aria-pressed=true]]:ring-1 [&&[aria-pressed=true]]:ring-[#cbdab9]">
                    <span className="flex items-center gap-1 text-[11px] text-[#6b7b60]">{rating}<Star size={10} fill="currentColor" className="text-[#b1be9c]" aria-hidden="true" /></span>
                    <progress className={progressClasses} value={count} max={total || 1} aria-label={`${rating} stars: ${reviewsLabel(count)}`} />
                    <span className="text-right text-[11px] text-[#6b7b60] tabular-nums">{count}</span>
                  </button>
                );
              })}
              <span className="mt-1 px-2 text-[10px] text-[#7a866d]">Select a star row to filter your feedback.</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="vendor-replies-heading" className="flex flex-col justify-between gap-5 rounded-2xl border border-[#35573e] bg-[linear-gradient(135deg,#304d38,#466449)] p-5 text-white shadow-[0_5px_16px_#294f3c12] sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><span className="text-[9px] font-semibold tracking-[0.12em] text-[#c9d9be] uppercase">Keep the conversation going</span><h2 id="vendor-replies-heading" className="[&&]:mt-2 [&&]:mb-0 [&&]:text-base [&&]:font-medium [&&]:text-white">A little reply. A lasting impression.</h2></div><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[#d6dfc0]"><MessageSquare size={18} strokeWidth={1.6} aria-hidden="true" /></span></div>
          <div><div className="mb-2 flex items-baseline justify-between gap-3"><span className="text-[34px] leading-none font-semibold tracking-tight">{responseRate.toFixed(0)}<span className="ml-0.5 text-lg font-normal text-[#bfceb3]">%</span></span><span className="text-[11px] text-[#d4e0c8]">Response rate</span></div><progress className="[&&]:h-2 [&&]:w-full [&&]:overflow-hidden [&&]:rounded-full [&&]:border-0 [&&]:bg-white/10 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-white/10 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[#c5d7a4] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[#c5d7a4]" value={responseRate} max={100} aria-label={`${responseRate.toFixed(0)} percent of overall vendor reviews have a public reply`} /><p className="[&&]:mt-2 [&&]:mb-0 [&&]:text-[10px] [&&]:leading-relaxed [&&]:text-[#d4e0c8]">{total ? "The share of your overall vendor reviews with a public reply." : "Your response rate will appear after your first vendor review."}</p></div>
          <div className="flex items-center gap-2 border-t border-white/15 pt-3 text-[11px] text-[#d4e0c8]"><BriefcaseBusiness size={14} aria-hidden="true" />{services.length} {services.length === 1 ? "service rated" : "services rated"} by your customers</div>
        </section>
      </div>

      <details className="group overflow-hidden rounded-2xl border border-[#e0e7d9] bg-white shadow-[0_2px_4px_#294f3c03]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-[#f2f5eb] text-[#859c6d]"><TrendingUp size={16} aria-hidden="true" /></span><span><span className="block text-[13px] font-semibold">Rating insights</span><span className="mt-0.5 block text-[10px] text-[#71806a]">Monthly trends and individual service ratings</span></span></span><ChevronDown size={16} className="shrink-0 text-[#8b9b7b] transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-6 border-t border-[#edf0e7] p-5 lg:grid-cols-2">
          <section><h3 className="[&&]:mt-0 [&&]:mb-3 [&&]:text-xs [&&]:font-semibold">Monthly vendor ratings</h3>{trends.length ? <div className="overflow-x-auto"><table className="[&&]:text-[11px]"><thead className="bg-[#f7f9f2] text-[#71806a]"><tr><th scope="col">Month</th><th scope="col">Reviews</th><th scope="col">Rating</th></tr></thead><tbody>{trends.map((trend) => <tr key={trend.month}><td>{new Date(`${trend.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td><td>{trend.count}</td><td><span className="inline-flex items-center gap-1 font-medium text-[#a1813b]"><Star size={11} fill="currentColor" aria-hidden="true" />{Number(trend.rating).toFixed(1)}</span></td></tr>)}</tbody></table></div> : <p className="[&&]:m-0 [&&]:text-xs [&&]:text-[#71806a]">Your monthly trends will appear after your first vendor review.</p>}</section>
          <section><h3 className="[&&]:mt-0 [&&]:mb-3 [&&]:text-xs [&&]:font-semibold">Service ratings</h3>{services.length ? <div className="divide-y divide-[#edf0e7]">{services.map((service) => <div key={service.id} className="flex items-center justify-between gap-4 py-3 first:pt-0"><div><span className="block text-xs font-medium">{service.name}</span><span className="mt-1 block text-[10px] text-[#71806a]">{reviewsLabel(service.count)}</span></div><span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#ece1c8] bg-[#fcf7eb] px-2 py-1 text-xs font-semibold text-[#a1813b]"><Star size={11} fill="currentColor" aria-hidden="true" />{Number(service.rating).toFixed(1)}</span></div>)}</div> : <p className="[&&]:m-0 [&&]:text-xs [&&]:text-[#71806a]">Reviews for individual services will appear here separately from your overall vendor rating.</p>}</section>
        </div>
      </details>
    </div>
  );
}
