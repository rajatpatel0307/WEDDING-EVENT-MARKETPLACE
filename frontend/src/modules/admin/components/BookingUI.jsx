import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
export { Field, Definition, Pager } from "./ServicesUI";
export function Loading() {
  return (
    <div
      className="space-y-4 animate-pulse"
      role="status"
      aria-label="Loading bookings"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-20 rounded-xl bg-stone-100" />
      ))}
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div role="alert" className="asm-empty flex flex-col items-center gap-[14px] text-center [padding:55px_20px] text-[#839286] [&_h2]:text-[18px] [&_h2]:text-[#345b4a] [&_h2]:m-[0] [&_p]:text-[13px] [&_p]:max-w-[400px]">
      <AlertCircle size={30} />
      <h2>Unable to load bookings</h2>
      <p>{error.message}</p>
      <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={retry}>
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  );
}
export function Empty() {
  return (
    <div className="asm-empty flex flex-col items-center gap-[14px] text-center [padding:55px_20px] text-[#839286] [&_h2]:text-[18px] [&_h2]:text-[#345b4a] [&_h2]:m-[0] [&_p]:text-[13px] [&_p]:max-w-[400px]">
      <Inbox size={34} />
      <h2>No bookings found</h2>
      <p>Try another search or adjust your filters.</p>
    </div>
  );
}
export function BookingStatus({ value }) {
  const names = {
    Accepted: "Vendor Accepted",
    PaymentPending: "Payment Pending",
    InProgress: "In Progress",
    PartiallyPaid: "Partially Paid",
    RefundPending: "Refund Pending",
    PartiallyRefunded: "Partially Refunded",
  };
  return (
    <span className={`ab-badge inline-flex items-center whitespace-nowrap [padding:5px_9px] rounded-[6px] text-[11px] [background:#f0f3ef] text-[#7e8e83] font-[550] [&.ab-confirmed]:[background:#e6f4eb] [&.ab-confirmed]:text-[#377756] [&.ab-paid]:[background:#e6f4eb] [&.ab-paid]:text-[#377756] [&.ab-success]:[background:#e6f4eb] [&.ab-success]:text-[#377756] [&.ab-completed]:[background:#e6f4eb] [&.ab-completed]:text-[#377756] [&.ab-pending]:[background:#faf1dc] [&.ab-pending]:text-[#a4863e] [&.ab-accepted]:[background:#faf1dc] [&.ab-accepted]:text-[#a4863e] [&.ab-paymentpending]:[background:#faf1dc] [&.ab-paymentpending]:text-[#a4863e] [&.ab-partiallypaid]:[background:#faf1dc] [&.ab-partiallypaid]:text-[#a4863e] [&.ab-refundpending]:[background:#faf1dc] [&.ab-refundpending]:text-[#a4863e] [&.ab-processing]:[background:#faf1dc] [&.ab-processing]:text-[#a4863e] [&.ab-inprogress]:[background:#e7eff9] [&.ab-inprogress]:text-[#5072a2] [&.ab-cancelled]:[background:#fae9e7] [&.ab-cancelled]:text-[#ae6660] [&.ab-rejected]:[background:#fae9e7] [&.ab-rejected]:text-[#ae6660] [&.ab-failed]:[background:#fae9e7] [&.ab-failed]:text-[#ae6660] [&.ab-disputed]:[background:#fae9e7] [&.ab-disputed]:text-[#ae6660] [&.ab-refunded]:[background:#eee9f8] [&.ab-refunded]:text-[#8a70ad] [&.ab-partiallyrefunded]:[background:#eee9f8] [&.ab-partiallyrefunded]:text-[#8a70ad] ab-${String(value).toLowerCase()}`}>
      {names[value] || value || "Not recorded"}
    </span>
  );
}
