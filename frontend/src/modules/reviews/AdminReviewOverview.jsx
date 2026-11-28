import { ArrowUpRight, Flag, MessageSquare, ShieldCheck, Star, BarChart3, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const reviewCount = (count) => `${count} ${Number(count) === 1 ? "review" : "reviews"}`;
const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

export default function AdminReviewOverview({ data, choose }) {
  const total = (data.counts || []).reduce((sum, row) => sum + Number(row.count), 0);
  const published = Number(data.totalApproved || 0);
  const average = Number(data.averageRating || 0);
  const vendors = (data.vendors || []).slice(0, 5).map((vendor) => ({ ...vendor, rating: Number(vendor.rating), count: Number(vendor.count) }));
  const trends = [...(data.trends || [])].sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map((trend) => ({ ...trend, rating: Number(trend.rating), count: Number(trend.count) }));
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
      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.2fr_1fr]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e0e7dd] bg-white shadow-[0_2px_4px_#294f3c03]" aria-labelledby="review-trends-heading">
          <div className="flex items-center justify-between gap-3 border-b border-[#edf0e9] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f0f5e9] text-[#71895e]"><TrendingUp size={16} aria-hidden="true" /></span>
              <div><h2 id="review-trends-heading" className="[&&]:m-0 [&&]:text-[13px] [&&]:font-semibold">Rating &amp; review trends</h2><p className="[&&]:mt-0.5 [&&]:mb-0 [&&]:text-[11px] [&&]:text-[#71806a]">Monthly average rating and published review count</p></div>
            </div>
            <span className="shrink-0 rounded-md border border-[#e7ecdf] bg-[#fafbf7] px-2 py-1 text-[10px] text-[#6b7a62]">{trends.length ? `${trends.length} ${trends.length === 1 ? "month" : "months"}` : "No activity"}</span>
          </div>
          {trends.length ? (
            <>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 pt-4 text-[10px] text-[#71806a]">
                <span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 bg-[#547c5b]" aria-hidden="true" />Average rating (left axis, 0-5)</span>
                <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-sm bg-[#d8c291]" aria-hidden="true" />Published reviews (right axis)</span>
              </div>
              <div className="px-2 pt-4 pb-1 sm:px-4">
                <div className={chartClass}>
                  <ResponsiveContainer initialDimension={{ width: 640, height: 270 }}>
                    <ComposedChart data={trends} margin={{ top: 15, right: 5, bottom: 8, left: 0 }} accessibilityLayer>
                      <CartesianGrid vertical={false} stroke="#edf1e8" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} tickMargin={12} minTickGap={20} />
                      <YAxis yAxisId="rating" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} width={28} axisLine={false} tickLine={false} tickMargin={8} />
                      <YAxis yAxisId="reviews" orientation="right" allowDecimals={false} width={36} axisLine={false} tickLine={false} tickMargin={8} />
                      <Tooltip content={<ReviewChartTooltip />} cursor={{ fill: "#f5f8ef" }} />
                      <Bar yAxisId="reviews" dataKey="count" name="Published reviews" fill="#d8c291" maxBarSize={36} radius={[5, 5, 0, 0]} isAnimationActive={false} />
                      <Line yAxisId="rating" dataKey="rating" name="Average rating" type="linear" stroke="#547c5b" strokeWidth={2.5} dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0e9] bg-[#fafcf8] px-5 py-3 text-[10px] text-[#71806a]"><span>Latest: {monthLabel(latest.month)}</span><span className="font-medium tabular-nums">{latest.rating.toFixed(1)} / 5 &middot; {reviewCount(latest.count)}</span></div>
              <table className="sr-only"><caption>Monthly rating and published review data</caption><thead><tr><th scope="col">Month</th><th scope="col">Average rating out of 5</th><th scope="col">Published reviews</th></tr></thead><tbody>{trends.map((trend) => <tr key={trend.month}><th scope="row">{monthLabel(trend.month)}</th><td>{trend.rating.toFixed(2)}</td><td>{trend.count}</td></tr>)}</tbody></table>
            </>
          ) : <div className="grid min-h-72 place-content-center gap-2 px-5 text-center"><TrendingUp size={24} className="mx-auto text-[#a7b599]" aria-hidden="true" /><p className="[&&]:m-0 [&&]:text-xs [&&]:text-[#71806a]">Published reviews will bring your rating trends to life.</p></div>}
        </section>
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e0e7dd] bg-white shadow-[0_2px_4px_#294f3c03]" aria-labelledby="review-vendors-heading">
          <div className="flex items-center justify-between gap-3 border-b border-[#edf0e9] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#faf4e8] text-[#b58c46]"><BarChart3 size={16} aria-hidden="true" /></span>
              <div><h2 id="review-vendors-heading" className="[&&]:m-0 [&&]:text-[13px] [&&]:font-semibold">Vendor rating comparison</h2><p className="[&&]:mt-0.5 [&&]:mb-0 [&&]:text-[11px] [&&]:text-[#71806a]">Average published rating on a 0-5 scale</p></div>
            </div>
            <span className="shrink-0 text-[10px] text-[#71806a]">Top {vendors.length || 5}</span>
          </div>
          {vendors.length ? <>
            <div className="px-2 pt-4 sm:px-4">
              <div className={chartClass}>
                <ResponsiveContainer initialDimension={{ width: 520, height: 270 }}>
                  <BarChart data={vendors} layout="vertical" margin={{ top: 10, right: 36, bottom: 8, left: 0 }} accessibilityLayer>
                    <CartesianGrid horizontal={false} stroke="#edf1e8" strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} axisLine={false} tickLine={false} tickMargin={10} />
                    <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tickMargin={10} tickFormatter={(name) => name.length > 16 ? `${name.slice(0, 15)}...` : name} />
                    <Tooltip content={<ReviewChartTooltip />} cursor={{ fill: "#f5f8ef" }} />
                    <Bar dataKey="rating" name="Average rating" fill="#83a17a" barSize={22} radius={[0, 5, 5, 0]} isAnimationActive={false} className="cursor-pointer" onClick={({ payload }) => payload?.id && choose("vendorId", payload.id)}>
                      <LabelList dataKey="rating" position="right" formatter={(value) => Number(value).toFixed(1)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="border-t border-[#edf0e9] bg-[#fafcf8] px-5 py-3">
              <span className="mb-2 block text-[10px] text-[#71806a]">Select a vendor to filter reviews</span>
              <div className="flex flex-wrap gap-2">{vendors.map((vendor) => <button key={vendor.id} type="button" onClick={() => choose("vendorId", vendor.id)} className="[&&]:max-w-full [&&]:rounded-lg [&&]:px-2 [&&]:py-1 [&&]:text-[10px]"><span className="truncate">{vendor.name}</span><ArrowUpRight size={11} className="shrink-0" aria-hidden="true" /></button>)}</div>
            </div>
            <table className="sr-only"><caption>Vendor rating comparison data</caption><thead><tr><th scope="col">Vendor</th><th scope="col">Average rating out of 5</th><th scope="col">Published reviews</th></tr></thead><tbody>{vendors.map((vendor) => <tr key={vendor.id}><th scope="row">{vendor.name}</th><td>{vendor.rating.toFixed(2)}</td><td>{vendor.count}</td></tr>)}</tbody></table>
          </> : <div className="grid min-h-72 place-content-center gap-2 px-5 text-center"><BarChart3 size={24} className="mx-auto text-[#a7b599]" aria-hidden="true" /><p className="[&&]:m-0 [&&]:text-xs [&&]:text-[#71806a]">Vendor rankings appear after their first published review.</p></div>}
        </section>
      </div>
    </div>
  );
}

const chartClass = "h-[270px] min-w-0 w-full [&_text]:text-[10px] [&_text]:fill-[#71806a] [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-[#547c5b]";

function ReviewChartTooltip({ active, payload }) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <div className="grid max-w-64 gap-2 rounded-xl border border-[#dfe7d8] bg-white p-3 text-[11px] text-[#62745b] shadow-lg">
      <strong className="break-words font-semibold text-[#344e3b]">{item.month ? monthLabel(item.month) : item.name}</strong>
      <span className="flex items-center justify-between gap-5">Average rating<strong className="font-semibold tabular-nums text-[#547c5b]">{item.rating.toFixed(2)} / 5</strong></span>
      <span className="flex items-center justify-between gap-5">Published reviews<strong className="font-semibold tabular-nums text-[#947638]">{item.count.toLocaleString("en-IN")}</strong></span>
    </div>
  );
}
