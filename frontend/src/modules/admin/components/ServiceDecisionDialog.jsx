import { useState } from "react";
import { adminRequest, money } from "../api";
import AdminDialog from "./AdminDialog";
const reasons = [
  "Incomplete information",
  "Invalid pricing",
  "Poor quality images",
  "Invalid service information",
  "Incorrect category",
  "Duplicate service",
  "Vendor verification issue",
  "Policy violation",
  "Inappropriate content",
  "Location information invalid",
  "Other",
];
const serviceChangedEvent = "marrynest:service-decision";
export default function ServiceDecisionDialog({
  service,
  action,
  close,
  saved,
}) {
  const [reason, setReason] = useState(""),
    [customReason, setCustomReason] = useState(""),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const title = {
    approve: "Approve Service",
    reject: "Reject Service",
    suspend: "Suspend Service",
    activate: "Activate Service",
    deactivate: "Deactivate Service",
  }[action];
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest(`/services/${service.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({
          notes,
          ...(action === "reject" ? { reason, customReason } : {}),
          expectedUpdatedAt: new Date(service.updatedAt).toISOString(),
        }),
      });
      saved(result.message);
      window.dispatchEvent(new Event(serviceChangedEvent));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminDialog title={title} close={close} busy={busy}>
      <form className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]" onSubmit={submit}>
        <dl className="sa-fields grid gap-[10px] [margin:14px_0] [overflow-wrap:anywhere] [&_>_div]:grid [&_>_div]:grid-cols-[minmax(120px,_1fr)_minmax(0,_3fr)] [@media(width<=640px)]:[&_>_div]:grid-cols-[1fr] [&_>_div]:gap-[16px] [&_>_div]:[padding:9px_0] [&_>_div]:[border-bottom-width:1px] [&_>_div]:[border-bottom-style:solid] [&_>_div]:[border-bottom-color:#edf0ed] [&_dt]:font-[600] [&_dt]:text-[#64716a] [&_dd]:m-[0] [&_dd]:whitespace-pre-wrap">
          {Object.entries({
            Service: service.name,
            Vendor: service.vendor,
            Category: service.category,
            Price: money(service.price),
            Location: service.location || "Not provided",
          }).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p>
          {action === "approve"
            ? "Are you sure you want to approve this service?"
            : `Confirm this service action: ${title.toLowerCase()}.`}
        </p>
        {action === "reject" && (
          <>
            <label>
              Rejection Reason
              <select
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              >
                <option value="">Select a reason</option>
                {reasons.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            {reason === "Other" && (
              <label>
                Custom reason
                <textarea
                  required
                  maxLength={1000}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  disabled={busy}
                />
              </label>
            )}
          </>
        )}
        <label>
          Admin Note (optional)
          <textarea
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
          />
        </label>
        {error && (
          <p role="alert" className="sa-error text-[#a22c3c]">
            {error}
          </p>
        )}
        <footer className="sa-actions flex gap-[10px] items-center flex-wrap [&_input]:min-w-[220px] [&_input]:p-[10px] [&_input]:[border-top-width:1px] [&_input]:[border-top-style:solid] [&_input]:[border-top-color:#dce2dd] [&_input]:[border-right-width:1px] [&_input]:[border-right-style:solid] [&_input]:[border-right-color:#dce2dd] [&_input]:[border-bottom-width:1px] [&_input]:[border-bottom-style:solid] [&_input]:[border-bottom-color:#dce2dd] [&_input]:[border-left-width:1px] [&_input]:[border-left-style:solid] [&_input]:[border-left-color:#dce2dd] [&_input]:rounded-[8px]">
          <button
            type="button"
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button
            className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            disabled={
              busy ||
              (action === "reject" &&
                (!reason || (reason === "Other" && !customReason.trim())))
            }
          >
            {busy ? "Saving…" : title}
          </button>
        </footer>
      </form>
    </AdminDialog>
  );
}
