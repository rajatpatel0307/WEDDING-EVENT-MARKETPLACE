import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, RotateCcw, X, XCircle } from "lucide-react";
import { money, save } from "../services/workspace.api";

const labels = {
  Confirmed: "Confirm Booking",
  InProgress: "Start Event",
  Completed: "Complete Booking",
  Disputed: "Mark Disputed",
  cancel: "Cancel Booking",
  refund: "Initiate Refund",
};
const button = "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function ActionDialog({ action, data, close, saved }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const refund = action === "refund";
  const cancel = action === "cancel";

  useEffect(() => { ref.current.showModal(); }, []);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await save(`/bookings/${data.booking.BookingId}/${refund ? "refund" : cancel ? "cancel" : "status"}`, "POST", {
        expectedUpdatedAt: new Date(data.booking.UpdatedAt).toISOString(),
        reason: reason.trim(),
        notes: notes.trim(),
        ...(refund ? { idempotencyKey: key } : cancel ? {} : { status: action }),
      });
      saved(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return createPortal(<dialog ref={ref} aria-labelledby="vendor-booking-action-title"
    onCancel={(e) => { if (busy) e.preventDefault(); else close(); }}
    className="m-auto max-h-[90vh] w-[min(95vw,32rem)] overflow-y-auto rounded-2xl border border-[#dfe8e2] bg-white p-5 text-sm text-[#34564f] shadow-xl backdrop:bg-black/40 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 id="vendor-booking-action-title" className="text-lg font-semibold">{labels[action]}</h2>
      <button type="button" disabled={busy} onClick={close} aria-label="Close booking action" className="rounded-lg p-2 hover:bg-[#f0f5f2] disabled:opacity-50"><X size={19} /></button>
    </div>
    <p className="mb-4">{data.booking.BookingNumber}{data.customer?.name && <> · {data.customer.name}</>}</p>
    <form onSubmit={submit} className="space-y-4">
      {cancel && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">This will cancel the booking and update its payout eligibility. Any eligible refund must be initiated separately.</p>}
      {refund && <div className="rounded-xl border border-[#d9e6dd] bg-[#f4f8f5] p-4">
        <p>Eligible refund: <strong>{money(data.refundEstimate)}</strong></p>
        <p className="mt-2 text-xs leading-relaxed">The refund will be queued for the payment provider. Completion appears after provider confirmation.</p>
      </div>}
      <label className="block text-sm font-medium">Reason shared with customer
        <textarea autoFocus required minLength={3} maxLength={1000} disabled={busy} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#d9e3dc] p-3 font-normal" />
      </label>
      <label className="block text-sm font-medium">Internal vendor note <span className="font-normal text-[#61766a]">(optional)</span>
        <textarea maxLength={2000} disabled={busy} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-[#d9e3dc] p-3 font-normal" />
      </label>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" disabled={busy} onClick={close} className={`${button} border-[#d9e3dc]`}>Close</button>
        <button type="submit" disabled={busy || reason.trim().length < 3} className={`${button} ${cancel ? "border-rose-700 bg-rose-700" : "border-[#176b60] bg-[#176b60]"} text-white`}>
          {busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? "Saving…" : labels[action]}
        </button>
      </div>
    </form>
  </dialog>, document.body);
}

export default function VendorBookingActions({ data, disabled, saved }) {
  const [action, setAction] = useState("");
  const management = data.management;
  const actions = management?.actions || [];
  return <>
    {actions.filter((value) => !["view", "cancel", "refund"].includes(value)).map((value) => <button type="button" key={value} disabled={disabled} onClick={() => setAction(value)} className={`${button} border-[#176b60] bg-[#176b60] text-white hover:bg-[#12584f]`}>{labels[value]}</button>)}
    {actions.includes("cancel") && <button type="button" disabled={disabled} onClick={() => setAction("cancel")} className={`${button} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}><XCircle size={15} aria-hidden="true" />Cancel Booking</button>}
    <button type="button" disabled={disabled || !management?.canRefund} title={management?.refundBlockedReason || "Initiate eligible refund"} onClick={() => setAction("refund")} className={`${button} border-[#d9e3dc] bg-white text-[#527260] hover:bg-[#f0f5f2]`}><RotateCcw size={15} aria-hidden="true" />Refund</button>
    {action && <ActionDialog key={action} action={action} data={data} close={() => setAction("")} saved={(message) => { setAction(""); saved(message); }} />}
  </>;
}
