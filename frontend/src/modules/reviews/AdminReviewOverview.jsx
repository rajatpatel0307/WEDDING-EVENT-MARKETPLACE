import { ArrowUpRight, Flag, MessageSquare, ShieldCheck, Star, Trophy, TrendingUp } from "lucide-react";

const reviewCount = (count) => `${count} ${Number(count) === 1 ? "review" : "reviews"}`;
const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

export default function AdminReviewOverview({ data, choose }) {
  const total = (data.counts || []).reduce((sum, row) => sum + Number(row.count), 0);
  const published = Number(data.totalApproved || 0);
  const average = Number(data.averageRating || 0);
  const vendors = (data.vendors || []).slice(0, 5);
  const trends = (data.trends || []).slice(0, 6).reverse();
  const latest = trends.at(-1);
  const metrics = [
    { label: "Total reviews", value: total.toLocaleString("en-IN"), note: "From completed bookings", icon: MessageSquare, action: () => choose("status", "") },
    { label: "Published reviews", value: published.toLocaleString("en-IN"), note: "Shared with your community", icon: ShieldCheck, action: () => choose("status", "Approved") },
    { label: "Average rating", value: average.toFixed(2), note: `${reviewCount(published)} published`, icon: Star, featured: true },
    { label: "Open reports", value: Number(data.pendingReports || 0).toLocaleString("en-IN"), note: Number(data.pendingReports) ? "Ready for your attention" : "You're all caught up", icon: Flag, action: () => choose("reported", "true") },
  ];
  return (
    <div className="mb-6 grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon, featured, action }) => {
          const Card = action ? "button" : "div";
          return (
            <Card
              key={label}
              {...(action ? { type: "button", onClick: action } : {})}
              className={`group [&&]:relative [&&]:grid [&&]:min-h-36 [&&]:content-between [&&]:justify-stretch [&&]:gap-3 [&&]:overflow-hidden [&&]:rounded-2xl [&&]:border [&&]:p-5 [&&]:text-left [&&]:transition-all [&&]:duration-200 motion-reduce:[&&]:transition-none ${featured ? "[&&]:border-[#315842] [&&]:bg-[linear-gradient(120deg,#2c4e3b,#3c634d)] [&&]:text-white [&&]:shadow-[0_6px_18px_#284b3a18]" : "[&&]:border-[#e0e7dd] [&&]:bg-white [&&]:shadow-[0_2px_4px_#294f3c03] [&&:hover]:border-[#a9bca1] [&&:hover]:shadow-[0_5px_18px_#294f3c08]"}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className={`text-[10px] font-semibold tracking-[0.1em] uppercase ${featured ? "text-[#d1e1d0]" : "text-[#687a66]"}`}>{label}</span>
                <span className={`grid size-8 place-items-center rounded-[10px] ${featured ? "bg-white/10 text-[#ebcd8f]" : "border border-[#e8eddf] bg-[#f6f8f1] text-[#789064]"}`}><Icon size={16} strokeWidth={1.7} aria-hidden="true" /></span>
              </span>
              <span className="flex items-end justify-between gap-2">
                <span className="text-[34px] leading-none font-semibold tracking-[-0.05em] tabular-nums">{value}{featured && <span className="ml-2 text-sm font-normal tracking-normal text-[#bdd0bd]">/ 5</span>}</span>
                {featured && <span className="mb-1 flex gap-0.5 text-[#e4c584]" aria-label={`${average.toFixed(2)} out of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={11} fill={n <= Math.round(average) ? "currentColor" : "none"} aria-hidden="true" />)}</span>}
              </span>
              <span className={`flex items-center justify-between gap-2 text-[11px] ${featured ? "text-[#d1e1d0]" : "text-[#71806a]"}`}>{note}{action && <ArrowUpRight size={14} className="text-[#9caa91] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" />}</span>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-[#e0e7dd] bg-white shadow-[0_2px_4px_#294f3c03]" aria-labelledby="review-trends-heading">
          <div className="flex items-center justify-between gap-3 border-b border-[#edf0e9] px-5 py-4">
            <div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f0f5e9] text-[#71895e]"><TrendingUp size={16} aria-hidden="true" /></span><div><h2 id="review-trends-heading" className="[&&]:m-0 [&&]:text-[13px] [&&]:font-semibold">Rating activity</h2><p className="[&&]:mt-0.5 [&&]:mb-0 [&&]:text-[11px] [&&]:text-[#71806a]">The customer perspective, month by month</p></div></div>
            <span className="rounded-md border border-[#e7ecdf] bg-[#fafbf7] px-2 py-1 text-[10px] text-[#6b7a62]">{trends.length ? `${trends.length} ${trends.length === 1 ? "month" : "months"}` : "No activity"}</span>
          </div>
          {trends.length ? (
            <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:gap-7">
              <div className="flex items-center justify-between gap-5 sm:block sm:min-w-24 sm:border-r sm:border-[#edf0e9] sm:pr-6">
                <div><span className="text-[10px] font-medium tracking-wide text-[#71806a] uppercase">Latest month</span><div className="mt-1.5 flex items-center gap-2"><span className="text-[30px] leading-none font-semibold tracking-tight tabular-nums">{Number(latest.rating).toFixed(1)}</span><Star size={17} fill="currentColor" className="text-[#bd944e]" aria-hidden="true" /></div></div>
                <span className="mt-2 block text-[10px] text-[#71806a]">{monthLabel(latest.month)}</span>
              </div>
              <div className="grid content-center gap-4">
                {trends.map((trend) => (
                  <div key={trend.month} className="grid grid-cols-[3rem_1fr_1.75rem] items-center gap-x-3 gap-y-1.5">
                    <span className="text-[11px] text-[#63745f]">{monthLabel(trend.month)}</span>
                    <progress className="[&&]:h-2.5 [&&]:w-full [&&]:overflow-hidden [&&]:rounded-full [&&]:border-0 [&&]:bg-[#eef2e9] [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[#eef2e9] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[linear-gradient(90deg,#8aa777,#b5c69c)] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[#91a67c]" value={Number(trend.rating)} max={5} aria-label={`${trend.month}: ${Number(trend.rating).toFixed(2)} out of 5 from ${reviewCount(trend.count)}`} />
                    <span className="text-right text-[11px] font-semibold tabular-nums">{Number(trend.rating).toFixed(1)}</span>
                    <span className="col-start-2 text-[10px] text-[#71806a]">{reviewCount(trend.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="grid min-h-32 place-content-center gap-2 px-5 text-center"><Star size={24} className="mx-auto text-[#a7b599]" aria-hidden="true" /><p className="[&&]:m-0 [&&]:text-xs [&&]:text-[#71806a]">Published reviews will bring your rating trends to life.</p></div>}
        </section>
        <section className="overflow-hidden rounded-2xl border border-[#e0e7dd] bg-white shadow-[0_2px_4px_#294f3c03]" aria-labelledby="review-vendors-heading">
          <div className="flex items-center justify-between gap-3 border-b border-[#edf0e9] px-5 py-4">
            <div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#faf4e8] text-[#b58c46]"><Trophy size={16} aria-hidden="true" /></span><div><h2 id="review-vendors-heading" className="[&&]:m-0 [&&]:text-[13px] [&&]:font-semibold">Standout vendors</h2><p className="[&&]:mt-0.5 [&&]:mb-0 [&&]:text-[11px] [&&]:text-[#71806a]">Highest rated by verified customers</p></div></div>
            <span className="text-[10px] text-[#71806a]">Top {vendors.length || 5}</span>
          </div>
          {vendors.length ? <ol className="divide-y divide-[#edf0e8] px-4 py-2">
            {vendors.map((vendor, index) => <li key={vendor.id}>
              <button type="button" onClick={() => choose("vendorId", vendor.id)} className="group [&&]:flex [&&]:w-full [&&]:justify-start [&&]:gap-3 [&&]:rounded-xl [&&]:border-0 [&&]:bg-transparent [&&]:px-2 [&&]:py-3 [&&]:text-left [&&:hover]:bg-[#f7f9f2]">
                <span className={`grid size-8 shrink-0 place-items-center rounded-xl border text-[11px] font-semibold ${index === 0 ? "border-[#ebdfc5] bg-[#fbf5e8] text-[#aa8140]" : "border-[#e5ebdd] bg-[#f4f7ef] text-[#7c8d6a]"}`}>{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{vendor.name}</span><span className="mt-0.5 block text-[10px] text-[#71806a]">{reviewCount(vendor.count)} from verified bookings</span></span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-[#eee2c9] bg-[#fcf7eb] px-2 py-1 text-xs font-semibold text-[#946e2e]"><Star size={11} fill="currentColor" aria-hidden="true" />{Number(vendor.rating).toFixed(1)}</span>
                <ArrowUpRight size={13} className="text-[#9da990] transition-colors group-hover:text-[#4c6c3b]" aria-hidden="true" />
              </button>
            </li>)}
          </ol> : <p className="[&&]:my-12 [&&]:px-5 [&&]:text-center [&&]:text-xs [&&]:text-[#71806a]">Vendor rankings appear after their first published review.</p>}
        </section>
      </div>
    </div>
  );
}
