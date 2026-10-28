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
    <div role="alert" className="asm-empty">
      <AlertCircle size={30} />
      <h2>Unable to load bookings</h2>
      <p>{error.message}</p>
      <button className="ad-button" onClick={retry}>
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  );
}
export function Empty() {
  return (
    <div className="asm-empty">
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
    <span className={`ab-badge ab-${String(value).toLowerCase()}`}>
      {names[value] || value || "Not recorded"}
    </span>
  );
}
