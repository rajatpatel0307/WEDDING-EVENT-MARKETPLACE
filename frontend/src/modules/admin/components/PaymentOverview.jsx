import { Link } from "react-router-dom";
import { BarChart3, ArrowUpRight, CircleCheck, CircleX, CreditCard, ChartPie, Inbox, Info } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { money, number } from "../services-management.api";

const panel = "min-w-0 overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white shadow-sm shadow-[#254c3810]";
const series = [
  { key: "captured", label: "Captured payments", color: "#176b60", tone: "bg-[#176b60]" },
  { key: "refunds", label: "Refunds", color: "#c47d6c", tone: "bg-[#c47d6c]" },
  { key: "payouts", label: "Vendor payouts", color: "#7b9cb4", tone: "bg-[#7b9cb4]" },
  { key: "commission", label: "Commission", color: "#b89b60", tone: "bg-[#b89b60]" },
];
const methodTones = ["fill-[#176b60]", "fill-[#7b9cb4]", "fill-[#b89b60]", "fill-[#9b86ae]", "fill-[#82ada0]"];
const monthLabel = (value, full = false) => /^\d{4}-\d{2}$/.test(String(value))
  ? new Date(`${value}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: full ? "long" : "short", year: full ? "numeric" : "2-digit", timeZone: "UTC" })
  : String(value);

function EmptyChart({ text }) {
  return <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-5 py-8 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-[#f0f5f1] text-[#8aa391]"><Inbox size={23} strokeWidth={1.5} aria-hidden="true" /></span><p className="max-w-xs text-xs! leading-relaxed text-[#82968a]!">{text}</p></div>;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="min-w-48 rounded-xl border border-[#dfe8e1] bg-white p-3 shadow-lg shadow-[#254c3820]">
    <strong className="mb-2 block text-xs font-semibold text-[#3f5e4b]">{monthLabel(label, true)}</strong>
    <div className="grid gap-2">{payload.map((entry) => <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-[11px]"><span className="flex items-center gap-2 text-[#82968a]"><span className={`size-1.5 rounded-full ${series.find((item) => item.key === entry.dataKey)?.tone || "bg-[#176b60]"}`} />{entry.name}</span><strong className="font-medium text-[#456950] tabular-nums">{money(entry.value)}</strong></div>)}</div>
  </div>;
}

export default function PaymentOverview({ data }) {
  const totals = data?.totals || {};
  const monthly = Array.isArray(data?.monthly) ? data.monthly : [];
  const methods = Array.isArray(data?.methods) ? data.methods : [];
  const outcomes = [
    { name: "Successful", value: Number(totals.successful || 0), color: "#176b60", icon: CircleCheck, tone: "bg-emerald-50 text-emerald-700" },
    { name: "Failed", value: Number(totals.failed || 0), color: "#c47d6c", icon: CircleX, tone: "bg-rose-50 text-rose-600" },
  ];
  const outcomeCount = outcomes.reduce((sum, item) => sum + item.value, 0);
  const methodTotal = methods.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const hasActivity = monthly.some((month) => series.some(({ key }) => Number(month[key] || 0) !== 0));

  return <div className="grid min-w-0 gap-5 text-[#2b4638]">
    <section className={panel} aria-labelledby="monthly-activity-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e8eeea] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-2.5"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[#edf4ef] text-[#71937e]"><BarChart3 size={17} strokeWidth={1.7} aria-hidden="true" /></span><div><h2 id="monthly-activity-heading" className="text-sm! font-semibold!">Monthly financial activity</h2><p className="mt-1 text-[11px]! text-[#82968a]!">Payments, refunds, payouts and commission by creation month.</p></div></div>
        <div className="flex shrink-0 items-center gap-2"><span className="rounded-md bg-[#f1f5f2] px-2 py-1 text-[10px] font-medium text-[#789181]">INR</span><span className="text-[10px] text-[#8c9e92]">All time</span></div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 pt-4 pb-2">{series.map(({ key, label, tone }) => <span key={key} className="flex items-center gap-1.5 text-[10px] text-[#789181]"><span className={`size-2 rounded-sm ${tone}`} aria-hidden="true" />{label}</span>)}</div>
      {hasActivity ? (
        <div role="img" aria-label="Monthly captured payments, refunds, vendor payouts and commission in INR" className="h-[260px] min-w-0 w-full pr-3 pb-3 pl-1 sm:h-[285px] sm:pr-5 sm:pl-2 [&_text]:fill-[#839689] [&_text]:text-[10px] [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-[#176b60]">
          <ResponsiveContainer initialDimension={{ width: 900, height: 260 }}>
            <BarChart data={monthly} margin={{ top: 12, right: 4, left: 4, bottom: 0 }} barGap={4} maxBarSize={32} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="#edf2ee" strokeDasharray="3 3" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} tickFormatter={(value) => monthLabel(value)} minTickGap={25} />
              <YAxis axisLine={false} tickLine={false} tickMargin={8} width={64} tickFormatter={(value) => money(value, true)} />
              <Tooltip content={<ChartTooltip />} cursor={false} />
              {series.map(({ key, label, color }) => <Bar key={key} dataKey={key} name={label} fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyChart text="No financial activity recorded for this period." />}
    </section>

    <div className="grid min-w-0 gap-5 min-[1150px]:grid-cols-2">
      <section className={panel} aria-labelledby="payment-outcomes-heading">
        <div className="flex items-center gap-2 border-b border-[#e8eeea] px-5 py-4"><ChartPie size={16} className="text-[#71937e]" aria-hidden="true" /><h2 id="payment-outcomes-heading" className="text-sm! font-semibold!">Payment outcomes</h2><span className="ml-auto rounded-md bg-[#f1f5f2] px-2 py-0.5 text-[10px] text-[#789181]">{number(outcomeCount)} recorded</span></div>
        {outcomeCount > 0 ? <div className="flex flex-col items-center gap-4 p-5 min-[460px]:flex-row">
          <div role="img" aria-label={`${number(outcomes[0].value)} successful and ${number(outcomes[1].value)} failed payments`} className="relative size-[170px] shrink-0">
            <ResponsiveContainer initialDimension={{ width: 170, height: 170 }}>
              <PieChart accessibilityLayer><Pie data={outcomes} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>{outcomes.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie></PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl font-semibold tracking-tight tabular-nums">{number(outcomeCount)}</strong><span className="mt-0.5 text-[9px] text-[#8b9f91]">Outcomes</span></div>
          </div>
          <dl className="grid w-full min-w-0 gap-3">{outcomes.map(({ name, value, icon: Icon, tone }) => <div key={name} className="flex items-center gap-2.5 rounded-xl border border-[#e8eeea] px-3 py-3"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={16} aria-hidden="true" /></span><dt className="text-[11px] text-[#789181]">{name}</dt><dd className="ml-auto text-lg font-semibold tabular-nums">{number(value)}</dd></div>)}</dl>
        </div> : <EmptyChart text="No successful or failed payment attempts recorded yet." />}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf2ee] bg-[#fcfdfc] px-5 py-3"><span className="text-[10px] text-[#8c9f91]">Successful counts include refunded INR payments.</span><Link to="/admin/payments" className="inline-flex items-center gap-1 text-[11px] font-medium text-[#176b60] hover:underline">View payments<ArrowUpRight size={13} aria-hidden="true" /></Link></div>
      </section>

      <section className={panel} aria-labelledby="payment-methods-heading">
        <div className="flex items-center gap-2 border-b border-[#e8eeea] px-5 py-4"><CreditCard size={16} className="text-[#71937e]" aria-hidden="true" /><h2 id="payment-methods-heading" className="text-sm! font-semibold!">Payment methods</h2><span className="ml-auto rounded-md bg-[#f1f5f2] px-2 py-0.5 text-[10px] text-[#789181]">INR</span></div>
        {methods.length > 0 ? <div className="p-5"><div className="mb-5 flex flex-wrap items-baseline justify-between gap-2"><span className="text-[11px] text-[#819587]">Captured by payment method</span><strong className="text-xl font-semibold tracking-tight text-[#31553e] tabular-nums">{money(methodTotal)}</strong></div><dl className="grid gap-5">{methods.map((item, index) => {
          const amount = Number(item.amount || 0);
          const share = methodTotal > 0 ? Math.max(0, Math.min(100, amount / methodTotal * 100)) : 0;
          return <div key={item.method || index} className="min-w-0"><div className="mb-2 flex items-center justify-between gap-3"><dt className="text-xs text-[#6f8979] capitalize [overflow-wrap:anywhere]">{item.method || "Not recorded"}</dt><dd className="shrink-0 text-xs font-semibold text-[#3c6048] tabular-nums">{money(amount)}</dd></div><svg aria-hidden="true" viewBox="0 0 100 3" preserveAspectRatio="none" className="h-1.5 w-full overflow-hidden rounded-full"><rect width="100" height="3" className="fill-[#edf3ef]" /><rect width={share} height="3" className={methodTones[index % methodTones.length]} /></svg></div>;
        })}</dl></div> : <EmptyChart text="No recorded payment methods. Captured payments will appear here." />}
      </section>
    </div>

    {data?.commissionPolicy && <aside className="flex items-start gap-2.5 rounded-xl border border-[#dfe8e1] bg-[#f0f5f1] px-4 py-3.5"><Info size={16} className="mt-0.5 shrink-0 text-[#7b9985]" aria-hidden="true" /><p className="text-[11px]! leading-relaxed text-[#7c9283]!">{data.commissionPolicy}</p></aside>}
  </div>;
}
