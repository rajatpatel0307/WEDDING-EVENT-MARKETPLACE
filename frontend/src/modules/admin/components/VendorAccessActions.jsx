import { useEffect, useState } from "react";
import { Ban, Check } from "lucide-react";
import { adminRequest } from "../api";
import { Badge } from "./AdminTable";
import AdminDialog from "./AdminDialog";

const button = "inline-flex items-center justify-center gap-[7px] rounded-[7px] border px-3 py-2 text-[10px] leading-[1.6] whitespace-nowrap transition-colors disabled:opacity-45 disabled:cursor-not-allowed";
const actions = [
  { action: "approve", status: "Approved", label: "Approve", Icon: Check, style: "border-[#176b60] bg-[#176b60] text-white hover:bg-[#11594f]" },
  { action: "suspend", status: "Suspended", label: "Suspend", Icon: Ban, style: "border-[#dfe7df] bg-white text-[#63786a] hover:bg-[#f0f5ef]" },
];

export default function VendorAccessActions({ vendorId, refreshKey = 0, onChange }) {
  const [data, setData] = useState(null), [error, setError] = useState("");
  const [revision, setRevision] = useState(0), [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState(""), [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(""), [notice, setNotice] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    adminRequest(`/vendor-access/${vendorId}`, { signal: abort.signal })
      .then(result => { setData(result); setError(""); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [vendorId, refreshKey, revision]);
  const current = data?.id.toLowerCase() === vendorId.toLowerCase() ? data : null;
  function open(type, action) {
    setDialog({ type, ...action, expectedStatus: current[`${type}Status`] });
    setReason(""); setFormError(""); setNotice("");
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setFormError("");
    try {
      const result = await adminRequest(`/vendor-access/${vendorId}/${dialog.type}/${dialog.action}`, {
        method: "PATCH", body: JSON.stringify({ expectedStatus: dialog.expectedStatus, reason }),
      });
      setData(result.vendor); setNotice(result.message); setDialog(null);
      onChange?.(result.vendor);
    } catch (e) {
      setFormError(e.message);
      if (e.status === 409) setRevision(value => value + 1);
    } finally { setBusy(false); }
  }
  return <div className="w-full basis-full border-t border-[#edf1e8] mt-2 pt-3" aria-label="Vendor service and booking access actions">
    {error ? <div className="text-xs text-[#b25454]" role="alert">{error} <button className={`${button} border-[#dfe7df] bg-white text-[#63786a]`} onClick={() => setRevision(value => value + 1)}>Retry access controls</button></div> : !current ? <p className="text-xs text-[#73816c]" role="status">Loading access controls…</p> : <div className="flex flex-col gap-3">
      {["service", "booking"].map(type => {
        const label = type === "service" ? "Service" : "Booking";
        return <section key={type} aria-label={`${label} access`} className="flex flex-col items-end gap-2 [@media(width<=1000px)]:items-start">
          <div className="flex items-center gap-2 text-[10px] text-[#63786a]"><span>{label} Access</span><Badge>{current[`${type}Status`]}</Badge></div>
          <div className="flex flex-wrap justify-end gap-2 [@media(width<=1000px)]:justify-start">
            {actions.filter(action => action.status !== current[`${type}Status`]).map(action => <button key={action.action} className={`${button} ${action.style}`} disabled={busy} onClick={() => open(type, action)}><action.Icon size={14} />{action.label} {label}{action.action === "suspend" ? " Access" : ""}</button>)}
          </div>
        </section>;
      })}
    </div>}
    {notice && <p role="status" className="mt-2 text-xs text-[#176b60]">{notice}</p>}
    {dialog && <AdminDialog title={`${dialog.label} ${dialog.type === "service" ? "Service" : "Booking"} Access`} busy={busy} close={() => setDialog(null)}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p>Confirm this change for {current?.businessName}. The other permission and existing bookings will remain unchanged.</p>
        <label className="flex flex-col gap-2 text-xs">Reason {dialog.action === "approve" ? "(optional)" : "(required)"}<textarea rows={4} maxLength={1000} required={dialog.action !== "approve"} value={reason} onChange={event => setReason(event.target.value)} /></label>
        {formError && <div role="alert" className="text-xs text-[#b25454]">{formError}</div>}
        <div className="flex justify-end gap-2"><button type="button" className={`${button} border-[#dfe7df] text-[#63786a]`} disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button className={`${button} ${dialog.style}`} disabled={busy || (dialog.action !== "approve" && !reason.trim())}>{busy ? "Saving…" : "Confirm"}</button></div>
      </form>
    </AdminDialog>}
  </div>;
}
