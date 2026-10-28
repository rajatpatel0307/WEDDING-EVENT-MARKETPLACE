import "../service-approval.css";
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
      <form className="ad-form" onSubmit={submit}>
        <dl className="sa-fields">
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
          <p role="alert" className="sa-error">
            {error}
          </p>
        )}
        <footer className="sa-actions">
          <button
            type="button"
            className="ad-button"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button
            className="ad-button ad-primary"
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
