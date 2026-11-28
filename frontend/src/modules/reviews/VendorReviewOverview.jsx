import { BriefcaseBusiness, MessageSquare, Reply, Star, TrendingUp, BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const reviewsLabel = (count) => `${count} ${Number(count) === 1 ? "review" : "reviews"}`;
const monthLabel = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
const panel = "min-w-0 overflow-hidden rounded-2xl border border-[#e0e7d9] bg-white shadow-[0_3px_12px_#294f3c04]";
const chart = "h-[260px] min-w-0 w-full [&_text]:text-[10px] [&_text]:fill-[#71806a] [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-[#547c5b]";
const number = (value) => Number(value) || 0;

function ChartHeader({ id, title, icon: Icon, children }) {
  return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0e7] px-5 py-4"><div className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f0f5e9] text-[#71895e]"><Icon size={16} aria-hidden="true" /></span><h2 id={id} className="[&&]:m-0 [&&]:text-[13px] [&&]:font-semibold">{title}</h2></div>{children}</header>;
}

function ChartEmpty({ children }) {
  return <div className="flex min-h-[260px] items-center justify-center px-5 text-center text-xs text-[#7b8c70]">{children}</div>;
}

function ChartTooltip({ active, payload, kind }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return <div className="grid max-w-64 gap-2 rounded-xl border border-[#dfe7d8] bg-white p-3 text-[11px] text-[#62745b] shadow-lg">
    <strong className="break-words font-semibold text-[#344e3b]">{kind === "trends" ? monthLabel(row.month) : kind === "distribution" ? `${row.rating}-star reviews` : row.name}</strong>
    {kind !== "distribution" && <span className="flex items-center justify-between gap-5">Average rating<strong className="font-semibold tabular-nums text-[#547c5b]">{row.rating.toFixed(2)} / 5</strong></span>}
    <span className="flex items-center justify-between gap-5">Reviews<strong className="font-semibold tabular-nums text-[#947638]">{row.count.toLocaleString("en-IN")}</strong></span>
  </div>;
}

export default function VendorReviewOverview({ data, choose, selectedRating }) {
  const total = number(data.totalReviews);
  const average = number(data.averageRating);
  const responseRate = Math.max(0, Math.min(100, number(data.responseRate)));
  const services = (data.services || []).map((row) => ({ ...row, rating: number(row.rating), count: number(row.count) })).sort((a, b) => b.rating - a.rating || b.count - a.count);
  const trends = [...(data.trends || [])].sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map((row) => ({ ...row, rating: number(row.rating), count: number(row.count) }));
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({ rating, label: `${rating} stars`, count: number(data.distribution?.find((row) => number(row.rating) === rating)?.count) }));
  const filterRating = (rating) => choose("rating", String(selectedRating) === String(rating) ? "" : String(rating));
  const metrics = [
    { label: "Overall vendor rating", value: average.toFixed(1), suffix: "/ 5", note: `Based on ${reviewsLabel(total)}`, icon: Star, featured: true },
    { label: "Vendor reviews", value: total.toLocaleString("en-IN"), note: "Overall vendor feedback", icon: MessageSquare },
    { label: "Response rate", value: responseRate.toFixed(0), suffix: "%", note: "Vendor reviews with a public reply", icon: Reply },
    { label: "Services rated", value: services.length.toLocaleString("en-IN"), note: `${services.reduce((sum, row) => sum + row.count, 0).toLocaleString("en-IN")} service reviews`, icon: BriefcaseBusiness },
  ];
  return (
    <div className="mb-6 grid min-w-0 gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, suffix, note, icon: Icon, featured }) => <section key={label} aria-label={label} className={`grid min-w-0 min-h-36 content-between gap-4 rounded-2xl border p-5 ${featured ? "border-[#35573e] bg-[#35573e] text-white shadow-[0_5px_16px_#294f3c12]" : "border-[#e0e7d9] bg-white shadow-[0_3px_12px_#294f3c04]"}`}>
          <div className="flex items-center justify-between gap-3"><span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${featured ? "text-[#d4e1ce]" : "text-[#71806a]"}`}>{label}</span><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${featured ? "bg-white/10 text-[#e3c68e]" : "bg-[#f1f5e9] text-[#819568]"}`}><Icon size={16} aria-hidden="true" /></span></div>
          <div className="flex items-baseline gap-1.5"><strong className="text-[34px] font-semibold leading-none tracking-tight tabular-nums">{value}</strong>{suffix && <span className={`text-sm ${featured ? "text-[#c0d1b7]" : "text-[#849575]"}`}>{suffix}</span>}</div>
          <span className={`text-[10px] ${featured ? "text-[#cfddc5]" : "text-[#7a896f]"}`}>{note}</span>
        </section>)}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.2fr_1fr]">
        <section className={panel} aria-labelledby="vendor-trend-heading">
          <ChartHeader id="vendor-trend-heading" title="Monthly rating trends" icon={TrendingUp}><span className="text-[10px] text-[#7b8b70]">{trends.length ? `${trends.length} ${trends.length === 1 ? "month" : "months"}` : "No activity"}</span></ChartHeader>
          {trends.length ? <>
            <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 pt-4 text-[10px] text-[#71806a]"><span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 bg-[#547c5b]" aria-hidden="true" />Rating (left axis, 0-5)</span><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-sm bg-[#d8c291]" aria-hidden="true" />Reviews (right axis)</span></div>
            <div className="px-2 pt-4 pb-3 sm:px-4"><div className={chart}>
              <ResponsiveContainer initialDimension={{ width: 640, height: 260 }}>
                <ComposedChart data={trends} margin={{ top: 15, right: 5, bottom: 8, left: 0 }} accessibilityLayer>
                  <CartesianGrid vertical={false} stroke="#edf1e8" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} tickMargin={12} minTickGap={20} />
                  <YAxis yAxisId="rating" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} width={28} axisLine={false} tickLine={false} tickMargin={8} />
                  <YAxis yAxisId="reviews" orientation="right" allowDecimals={false} width={36} axisLine={false} tickLine={false} tickMargin={8} />
                  <Tooltip content={<ChartTooltip kind="trends" />} cursor={{ fill: "#f5f8ef" }} />
                  <Bar yAxisId="reviews" dataKey="count" name="Vendor reviews" fill="#d8c291" maxBarSize={36} radius={[5, 5, 0, 0]} isAnimationActive={false} />
                  <Line yAxisId="rating" dataKey="rating" name="Average rating" type="linear" stroke="#547c5b" strokeWidth={2.5} dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div></div>
            <table className="sr-only"><caption>Monthly overall vendor rating data</caption><thead><tr><th scope="col">Month</th><th scope="col">Reviews</th><th scope="col">Rating out of 5</th></tr></thead><tbody>{trends.map((row) => <tr key={row.month}><th scope="row">{monthLabel(row.month)}</th><td>{row.count}</td><td>{row.rating.toFixed(2)}</td></tr>)}</tbody></table>
          </> : <ChartEmpty>No monthly vendor reviews yet.</ChartEmpty>}
        </section>

        <section className={panel} aria-labelledby="vendor-distribution-heading">
          <ChartHeader id="vendor-distribution-heading" title="Rating distribution" icon={BarChart3}><span className="text-[10px] text-[#7b8b70]">{reviewsLabel(total)}</span></ChartHeader>
          {total > 0 ? <div className="px-2 pt-5 pb-3 sm:px-4"><div className={chart}>
            <ResponsiveContainer initialDimension={{ width: 520, height: 260 }}>
              <BarChart data={distribution} margin={{ top: 20, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="#edf1e8" strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={12} interval={0} />
                <YAxis allowDecimals={false} width={32} axisLine={false} tickLine={false} tickMargin={8} />
                <Tooltip content={<ChartTooltip kind="distribution" />} cursor={{ fill: "#f5f8ef" }} />
                <Bar dataKey="count" name="Vendor reviews" maxBarSize={42} radius={[5, 5, 0, 0]} isAnimationActive={false} className="cursor-pointer" onClick={({ payload }) => payload && filterRating(payload.rating)}>
                  {distribution.map((row) => <Cell key={row.rating} fill={String(selectedRating) === String(row.rating) ? "#35573e" : selectedRating ? "#c7d5bb" : "#91ad7d"} />)}
                  <LabelList dataKey="count" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div></div> : <ChartEmpty>No overall vendor reviews yet.</ChartEmpty>}
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-[#edf0e7] bg-[#fafcf8] px-4 py-3" role="group" aria-label="Filter reviews by star rating">
            {distribution.map((row) => <button key={row.rating} type="button" onClick={() => filterRating(row.rating)} aria-pressed={String(selectedRating) === String(row.rating)} aria-label={`Filter ${row.rating} star reviews: ${reviewsLabel(row.count)}`} className="[&&]:gap-1 [&&]:rounded-lg [&&]:px-2 [&&]:py-1.5 [&&]:text-[10px] [&&[aria-pressed=true]]:border-[#35573e] [&&[aria-pressed=true]]:bg-[#35573e] [&&[aria-pressed=true]]:text-white">{row.rating}<Star size={10} aria-hidden="true" /><span className="ml-1 opacity-70">({row.count})</span></button>)}
          </div>
          <table className="sr-only"><caption>Overall vendor star distribution data</caption><thead><tr><th scope="col">Stars</th><th scope="col">Reviews</th></tr></thead><tbody>{distribution.map((row) => <tr key={row.rating}><th scope="row">{row.rating}</th><td>{row.count}</td></tr>)}</tbody></table>
        </section>
      </div>

      <section className={panel} aria-labelledby="vendor-services-heading">
        <ChartHeader id="vendor-services-heading" title="Service ratings" icon={BriefcaseBusiness}><span className="text-[10px] text-[#7b8b70]">Scored separately from your overall vendor rating</span></ChartHeader>
        {services.length ? <>
          <div className="max-h-[360px] overflow-y-auto px-2 py-4 sm:px-5 [&_text]:text-[10px] [&_text]:fill-[#71806a]" tabIndex={0} role="region" aria-label="Service rating chart. Scroll to view all services.">
            <ResponsiveContainer width="100%" height={Math.max(200, services.length * 48)} initialDimension={{ width: 1000, height: Math.max(200, services.length * 48) }}>
              <BarChart data={services} layout="vertical" margin={{ top: 8, right: 38, bottom: 8, left: 0 }} accessibilityLayer>
                <CartesianGrid horizontal={false} stroke="#edf1e8" strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} axisLine={false} tickLine={false} tickMargin={10} />
                <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tickMargin={10} tickFormatter={(name) => name.length > 18 ? `${name.slice(0, 17)}...` : name} />
                <Tooltip content={<ChartTooltip kind="services" />} cursor={{ fill: "#f5f8ef" }} />
                <Bar dataKey="rating" name="Service rating" fill="#83a17a" barSize={22} radius={[0, 5, 5, 0]} isAnimationActive={false}><LabelList dataKey="rating" position="right" formatter={(value) => Number(value).toFixed(1)} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only"><caption>Individual service rating data</caption><thead><tr><th scope="col">Service</th><th scope="col">Reviews</th><th scope="col">Rating out of 5</th></tr></thead><tbody>{services.map((row) => <tr key={row.id}><th scope="row">{row.name}</th><td>{reviewsLabel(row.count)}</td><td>{row.rating.toFixed(2)}</td></tr>)}</tbody></table>
        </> : <ChartEmpty>No service reviews yet.</ChartEmpty>}
      </section>
    </div>
  );
}
