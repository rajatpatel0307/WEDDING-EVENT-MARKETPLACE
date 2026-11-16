import { CreditCard, Clock, CircleCheck, CircleX, RotateCcw, Wallet, Landmark, RefreshCw, ShieldAlert, ReceiptText, Percent, IndianRupee, PauseCircle } from "lucide-react";
import { useAdminData, money, number } from "../services-management.api";
import { useLocation } from "react-router-dom";
import { financeCardSection } from "../navigation";

const definitions = {
  overview: [
    ["captured", "Captured Collections", IndianRupee, "money"], ["pending", "Pending Payment Orders", Clock],
    ["failed", "Failed Attempts", CircleX], ["refunded", "Completed Refunds", RotateCcw, "money"],
    ["refundPending", "Refunds in Processing", RefreshCw, "money"], ["commission", "Platform Commission", Landmark, "money"],
    ["payables", "Vendor Payables", Wallet, "money"], ["paid", "Completed Payouts", CircleCheck, "money"],
    ["failedPayouts", "Failed Payouts", ShieldAlert],
  ],
  "refund-review": [["total", "All Refund Requests", ReceiptText], ["requested", "Pending Review", Clock], ["approved", "Approved", CircleCheck], ["rejected", "Rejected", CircleX]],
  reconciliation: [["total", "All Payment Orders", CreditCard], ["created", "Created", Clock], ["paid", "Paid", CircleCheck], ["review", "Needs Review", ShieldAlert], ["events", "Unprocessed Events", RefreshCw], ["discrepancies", "Discrepancies", CircleX]],
  refunds: [["total", "All Refunds", RotateCcw], ["pending", "Pending", Clock], ["processing", "Processing", RefreshCw], ["completed", "Completed", CircleCheck], ["rejected", "Rejected", ShieldAlert], ["failed", "Failed", CircleX]],
  payouts: [["total", "All Vendor Payouts", Wallet], ["pending", "Pending", Clock], ["processing", "Processing", RefreshCw], ["paid", "Paid", CircleCheck], ["failed", "Failed", CircleX], ["onhold", "On Hold", PauseCircle]],
  commission: [["total", "Commission Records", ReceiptText], ["commission", "Total Commission", Landmark, "money"], ["bookingValue", "Total Booking Value", IndianRupee, "money"], ["averageRate", "Average Rate", Percent, "percent"]],
};
const colors = ["bg-[#e7f0ed] text-[#176b60]", "bg-[#faf3df] text-[#ac8a39]", "bg-[#eaf0fa] text-[#5c7fa8]", "bg-[#edf5e7] text-[#568447]", "bg-[#f3eaf7] text-[#9568a6]", "bg-[#fae8e8] text-[#b65555]"];

function OverviewCards({ data, state }) {
  const primaryKeys = ["captured", "pending", "refunded", "payables"];
  const primary = primaryKeys.map((key) => definitions.overview.find(([name]) => name === key));
  const secondary = definitions.overview.filter(([key]) => !primaryKeys.includes(key));
  const value = (key, type, featured = false) => state?.loading
    ? <span className={`block h-8 w-16 animate-pulse rounded motion-reduce:animate-none ${featured ? "bg-white/15" : "bg-[#edf2ed]"}`} aria-label="Loading count" />
    : state?.error || data?.[key] == null ? "—" : type === "money" ? money(data[key]) : number(data[key]);
  return <div className="grid min-w-0 gap-3" aria-label="Finance statistics" aria-busy={!!state?.loading}>
    <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 min-[1150px]:grid-cols-4">
      {primary.map(([key, label, Icon, type], index) => <article key={key} className={`min-w-0 rounded-xl border p-4 shadow-[0_3px_8px_#263f2d02] sm:p-5 ${key === "captured" ? "border-[#176b60] bg-[#176b60] text-white" : "border-[#e0e9e3] bg-white text-[#294b40]"}`}>
        <div className="flex min-h-8 items-center justify-between gap-2"><span className={`text-[11px] ${key === "captured" ? "text-[#abd2c3]" : "text-[#819587]"}`}>{label}</span><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${key === "captured" ? "bg-white/10 text-[#c5e2d3]" : colors[index]}`}><Icon size={17} strokeWidth={1.7} aria-hidden="true" /></span></div>
        <strong className="mt-2 block text-[25px] leading-tight font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere]" aria-live="polite">{value(key, type, key === "captured")}</strong>
        <span className={`mt-2 block text-[9px] ${key === "captured" ? "text-[#abd2c3]" : "text-[#92a397]"}`}>{type === "money" ? "INR · all time" : "Created orders awaiting payment"}</span>
      </article>)}
    </div>
    <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1350px]:grid-cols-5">
      {secondary.map(([key, label, Icon, type], index) => <article key={key} className="min-w-0 rounded-xl border border-[#e0e9e3] bg-white px-4 py-3 shadow-[0_3px_8px_#263f2d02]"><div className="flex items-center gap-2 text-[10px] text-[#819587]"><Icon size={14} className={index === 0 || key === "failedPayouts" ? "shrink-0 text-[#b47d73]" : "shrink-0 text-[#7e9b88]"} strokeWidth={1.7} aria-hidden="true" /><span>{label}</span></div><strong className="mt-2 block text-lg leading-tight font-semibold tracking-tight text-[#3d6049] tabular-nums [overflow-wrap:anywhere]" aria-live="polite">{value(key, type)}</strong></article>)}
    </div>
  </div>;
}

export default function FinanceCards({ section, revision = 0, overviewState }) {
  const { pathname } = useLocation();
  const active = financeCardSection(pathname) === section;
  const remote = useAdminData(active && section !== "overview" ? `/finance-statistics/${section}` : null, revision);
  const state = section === "overview" ? overviewState : remote;
  const data = section === "overview" ? state?.data?.totals : state.data;
  const cards = definitions[section] || [];
  if (!active) return null;
  if (section === "overview") return <OverviewCards data={data} state={state} />;
  return <div>
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${cards.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`} aria-label="Finance statistics" aria-busy={!!state?.loading}>
      {cards.map(([key, label, Icon, type], index) => <article key={key} className="flex items-center justify-between gap-4 rounded-xl border border-[#e0e8e2] bg-white p-5 shadow-[0_3px_8px_#263f2d02]">
        <div className="min-w-0"><span className="text-xs font-medium text-[#819189]">{label}</span><strong className="mt-2 block break-words text-[25px] font-semibold leading-tight text-[#294b40]" aria-live="polite">{state?.loading ? <span className="block h-8 w-16 animate-pulse rounded bg-[#edf2ed]" aria-label="Loading count" /> : state?.error || !data ? "—" : type === "money" ? money(data[key]) : type === "percent" ? `${Number(data[key]).toFixed(2)}%` : number(data[key])}</strong></div>
        <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${colors[index % colors.length]}`}><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span>
      </article>)}
    </div>
    {state?.error && <div role="alert" className="mt-3 flex items-center gap-3 text-xs text-[#b65555]">Unable to load finance statistics.<button type="button" onClick={state.retry} className="rounded-lg border border-[#e0e8e2] bg-white px-3 py-2">Try again</button></div>}
  </div>;
}
