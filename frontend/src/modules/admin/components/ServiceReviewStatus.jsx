import { Link } from "react-router-dom";
import { ArrowUpRight, Check, CheckCircle2, ChevronRight, CircleAlert, CirclePause, Clock3, FileCheck2, Package, ShieldCheck, Store, XCircle } from "lucide-react";
import { date } from "../api";
import { reviewState, serviceDecision, statusLabel, statusTone } from "../service-review.status";

export function ReviewStatusBadge({ status, entity = "service", children }) {
  const tone = statusTone(status);
  const Icon = tone === "green" ? CheckCircle2 : status === "Suspended" ? CirclePause : tone === "red" ? XCircle : ["Pending", "UnderReview"].includes(status) ? Clock3 : CircleAlert;
  return <span className={`inline-flex shrink-0 items-center gap-[6px] rounded-md border px-[9px] py-[5px] text-[11px] leading-[1.4] font-medium whitespace-nowrap ${
    tone === "green" ? "border-emerald-200/70 bg-emerald-50 text-emerald-800" :
    tone === "red" ? "border-rose-200/70 bg-rose-50 text-rose-700" :
    tone === "blue" ? "border-blue-200/70 bg-blue-50 text-blue-700" :
    tone === "amber" ? "border-amber-200/70 bg-amber-50 text-amber-800" :
    "border-slate-200 bg-slate-50 text-slate-600"
  }`}><Icon size={13} strokeWidth={1.8} aria-hidden="true" />{children || statusLabel(status, entity)}</span>;
}

function SummaryCard({ icon: Icon, title, href, children, footer, accent }) {
  return <a href={href} className={`group flex min-w-0 flex-col rounded-xl border bg-white p-5 shadow-[0_2px_12px_#203e3504] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_#203e3509] motion-reduce:transform-none ${accent === "red" ? "border-rose-200/80" : accent === "blue" ? "border-blue-200/80" : "border-[#e3e9e0]"}`}>
    <div className="mb-4 flex items-center justify-between gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[#f3f6f0] text-[#6e8464]"><Icon size={18} strokeWidth={1.6} /></span><ArrowUpRight size={14} className="text-[#a3af9a] transition group-hover:text-[#315b40]" /></div>
    <span className="mb-2 text-[11px] font-medium text-[#7a8872]">{title}</span>
    <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>
    <span className="mt-auto border-t border-[#eef1e9] pt-3 text-[11px] leading-[1.7] text-[#78846f]">{footer}</span>
  </a>;
}

export default function ServiceReviewStatus({ data }) {
  const state = reviewState(data);
  const decision = serviceDecision(data);
  const vendorIssue = ["Rejected", "Suspended"].includes(state.vendorStatus);
  const pending = ["Pending", "UnderReview"].includes(state.serviceStatus);
  const decided = ["Approved", "Rejected", "Suspended"].includes(state.serviceStatus);
  const submitted = !!data.SubmittedAt || pending || decided;
  const steps = [
    { name: "Submitted", detail: data.SubmittedAt ? date(data.SubmittedAt) : submitted ? "Submission received" : "Not submitted", done: submitted },
    { name: "Admin review", detail: state.serviceStatus === "UnderReview" ? "In progress" : decided ? "Review completed" : "Awaiting review", done: decided, current: state.serviceStatus === "UnderReview" },
    { name: "Decision", detail: decided ? statusLabel(state.serviceStatus) : "Awaiting decision", done: decided, error: ["Rejected", "Suspended"].includes(state.serviceStatus) },
  ];
  return <section id="service-review-status" className="grid scroll-mt-[110px] gap-[18px]" aria-label="Approval status overview">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="m-0! text-[18px]! font-semibold tracking-[-.4px]">Approval at a glance</h2><p className="mt-[5px]! mb-0! text-[12px]! text-[#7a8772]!">Know exactly what is approved, what needs review, and what needs attention.</p></div>
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#7b8775]" aria-label="Status colors"><span className="flex items-center gap-[5px]"><span className="size-[6px] rounded-full bg-emerald-600" />Approved</span><span className="flex items-center gap-[5px]"><span className="size-[6px] rounded-full bg-blue-500" />Under review</span><span className="flex items-center gap-[5px]"><span className="size-[6px] rounded-full bg-rose-500" />Rejected</span></div>
    </div>
    <div className="grid grid-cols-4 gap-[14px] [@media(width<=1200px)]:grid-cols-2 [@media(width<=420px)]:grid-cols-1">
      <SummaryCard icon={Store} title="Vendor verification" href="#service-review-vendor" accent={statusTone(state.vendorStatus)} footer={vendorIssue ? "Vendor action required before service approval." : state.vendorStatus === "Approved" ? data.VendorActive ? "Verified business · Vendor active" : "Verification approved · Vendor inactive" : "Business verification is reviewed separately."}>
        <ReviewStatusBadge status={state.vendorStatus} entity="vendor" />
      </SummaryCard>
      <SummaryCard icon={ShieldCheck} title="Service approval" href="#service-review-controls" accent={statusTone(state.serviceStatus)} footer={state.serviceStatus === "Approved" ? `Approved ${data.ApprovedAt ? date(data.ApprovedAt) : "by an administrator"}` : state.serviceStatus === "Rejected" ? "See the rejection reason below." : state.serviceStatus === "UnderReview" ? "An administrator is reviewing this listing." : "This decision applies to the service listing."}>
        <ReviewStatusBadge status={state.serviceStatus} />
      </SummaryCard>
      <SummaryCard icon={Package} title="Service packages" href="#service-review-packages" footer="Packages follow the parent service approval.">
        <strong className="text-[25px] leading-none font-medium tracking-[-.8px] text-[#36513c]">{state.enabledPackages}<span className="text-[13px] font-normal tracking-normal text-[#98a38d]"> / {state.packageCount}</span></strong><span className="text-[11px] text-[#7b8871]">enabled</span>
      </SummaryCard>
      <SummaryCard icon={FileCheck2} title="Verification documents" href="#service-review-documents" accent={statusTone(state.documentStatus)} footer={`${state.documentCounts.approved} approved · ${state.documentCounts.pending + state.documentCounts.underReview} awaiting review · ${state.documentCounts.rejected} rejected${state.documentCounts.unknown ? ` · ${state.documentCounts.unknown} status unavailable` : ""}`}>
        <ReviewStatusBadge status={state.documentStatus} entity="document" />
      </SummaryCard>
    </div>

    <div className="rounded-xl border border-[#e3e9df] bg-white px-6 py-5 [@media(width<=600px)]:px-4">
      <div className="mb-5 flex items-center justify-between gap-3"><span className="text-[11px] font-semibold text-[#667b5b]">SERVICE REVIEW PROGRESS</span><a href="#service-review-history" className="inline-flex items-center gap-1 text-[11px] text-[#829475]">View history<ChevronRight size={13} /></a></div>
      <ol className="m-0 grid list-none grid-cols-3 gap-4 p-0 [@media(width<=520px)]:grid-cols-1">
        {steps.map((step, i) => <li key={step.name} className="flex items-start gap-[10px]">
          <span className={`grid size-8 shrink-0 place-items-center rounded-full border text-[11px] ${step.error ? "border-rose-200 bg-rose-50 text-rose-600" : step.current ? "border-blue-200 bg-blue-50 text-blue-600 ring-4 ring-blue-50/50" : step.done ? "border-[#d7e5cf] bg-[#edf4e7] text-[#50733f]" : "border-[#e4e8de] bg-[#fafbf7] text-[#a7b09b]"}`}>{step.error ? <XCircle size={15} /> : step.done ? <Check size={15} /> : step.current ? <Clock3 size={15} /> : `0${i + 1}`}</span>
          <div className="min-w-0"><strong className="block text-[12px] font-medium text-[#506649]">{step.name}</strong><span className={`mt-1 block text-[11px] ${step.current ? "text-blue-600" : step.error ? "text-rose-600" : "text-[#929d85]"}`}>{step.detail}</span></div>
        </li>)}
      </ol>
    </div>

    {(decision || vendorIssue || state.blockers.length > 0) && <div className="grid gap-3 [@media(width>=1200px)]:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
      {decision && <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-5">
        <div className="flex items-center gap-2 text-rose-700"><XCircle size={17} /><strong className="text-[13px] font-semibold">{decision.title}</strong>{decision.timestamp && <span className="ml-auto text-[10px] text-rose-500">{date(decision.timestamp)}</span>}</div>
        <p className="mt-3! mb-0! text-[12px]! leading-[1.8] whitespace-pre-wrap text-rose-800! [overflow-wrap:anywhere]">{decision.reason || (state.serviceStatus === "Rejected" ? "No rejection reason was recorded." : "This service is suspended from the marketplace.")}</p>
        {decision.note && <div className="mt-3 border-t border-rose-200/70 pt-3"><span className="text-[10px] font-semibold text-rose-600">ADMIN NOTE</span><p className="mt-1! mb-0! text-[12px]! leading-[1.8] whitespace-pre-wrap text-rose-700! [overflow-wrap:anywhere]">{decision.note}</p></div>}
      </div>}
      {vendorIssue && <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-5">
        <div className="flex items-center gap-2 text-rose-700"><Store size={17} /><strong className="text-[13px] font-semibold">Vendor {state.vendorStatus.toLowerCase()}</strong></div>
        <p className="mt-3! mb-0! text-[12px]! leading-[1.8] whitespace-pre-wrap text-rose-800! [overflow-wrap:anywhere]">{state.vendorReason || "No vendor decision reason was recorded."}</p>
        <Link to={`/admin/vendors/${data.VendorId}`} className="mt-3 inline-flex items-center gap-[6px] text-[11px] font-medium text-rose-700 hover:text-rose-900!">Open vendor review<ArrowUpRight size={13} /></Link>
      </div>}
      {state.blockers.length > 0 && !vendorIssue && <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-5"><div className="flex items-center gap-2 text-amber-800"><CircleAlert size={17} /><strong className="text-[13px] font-semibold">Vendor action required</strong></div><ul className="mt-3 list-disc space-y-2 pl-4 text-[12px] leading-[1.8] text-amber-800">{state.blockers.map((reason) => <li key={reason}>{reason}</li>)}</ul><Link to={`/admin/vendors/${data.VendorId}`} className="mt-3 inline-flex items-center gap-[6px] text-[11px] font-medium text-amber-800">Review vendor<ArrowUpRight size={13} /></Link></div>}
    </div>}
  </section>;
}

export function PackageReviewStatus({ data, item }) {
  return <div className="mt-3 rounded-lg bg-[#f7f9f3] p-3">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-medium text-[#829174]">Package setting</span><ReviewStatusBadge status={item.IsActive ? "Enabled" : "Disabled"} /></div>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-medium text-[#829174]">Parent service</span><ReviewStatusBadge status={data.ApprovalStatus} /></div>
    <p className="mt-2! mb-0! text-[10px]! leading-[1.7] text-[#8b977f]!">{item.IsActive ? "Follows this service’s approval and availability." : "Disabled by its package setting."}</p>
  </div>;
}

export function ApprovalBlockers({ data }) {
  const state = reviewState(data);
  if (!state.blockers.length) return null;
  return <div id="service-review-blockers" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-[13px] py-3">
    <div className="flex items-center gap-[6px] text-amber-800"><CircleAlert size={14} /><strong className="text-[11px] font-semibold">Approval & activation blocked</strong></div>
    <ul className="mt-2 list-disc space-y-2 pl-4 text-[11px] leading-[1.7] text-amber-800">{state.blockers.map((reason) => <li key={reason}>{reason}</li>)}</ul>
    <Link to={`/admin/vendors/${data.VendorId}`} className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">Review vendor<ArrowUpRight size={12} /></Link>
  </div>;
}
