import { useEffect, useState } from "react";
import { Check, LoaderCircle, RefreshCw, X } from "lucide-react";
import { adminRequest, number } from "../api";
import { useAuth } from "../../../context/AuthContext";
import {
  canDecide,
  decisionActions,
  rejectionReasons,
  vendorChanged,
} from "../vendor-workflow";
import AdminDialog from "./AdminDialog";
import "../vendor-workflow.css";

const labels = {
  Approved: "Approve Vendor",
  Rejected: "Reject Vendor",
  Suspended: "Suspend Vendor",
  UnderReview: "Start Review",
  Reapply: "Reopen Application",
};
function Field({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children || "Not provided"}</dd>
    </div>
  );
}
export default function VendorDecisionDialog({
  vendorId,
  action,
  close,
  onSuccess,
}) {
  const { notify } = useAuth();
  const [snapshot, setSnapshot] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [reason, setReason] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    setSnapshot(null);
    setError(null);
    adminRequest(`/vendors/${vendorId}/details`, { signal: abort.signal })
      .then(setSnapshot)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e);
      });
    return () => abort.abort();
  }, [vendorId, revision]);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError(null);
    try {
      const result = await adminRequest(
        `/vendors/${vendorId}/${decisionActions[action]}`,
        {
          method: "PUT",
          body: JSON.stringify({
            notes: fields.notes || "",
            reason:
              reason === "Other"
                ? fields.otherReason
                : reason || fields.reason || "",
            expectedStatus: snapshot.vendor.status,
            expectedUpdatedAt: snapshot.vendor.updatedAt,
          }),
        },
      );
      onSuccess?.(result.data);
      vendorChanged(result.data);
      notify(result.message);
      close();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const v = snapshot?.vendor,
    s = snapshot?.summary;
  const permitted = v && canDecide(v.status, action);
  const loadingLabel =
    action === "Approved"
      ? "Approving..."
      : action === "Rejected"
        ? "Rejecting..."
        : "Saving...";
  return (
    <AdminDialog title={labels[action]} close={close} busy={busy}>
      <form className="ad-form va-decision" onSubmit={submit}>
        {error && (
          <div className="ad-inline-error" role="alert">
            <strong>{error.message}</strong>
            {[409, 500].includes(error.status) || !snapshot ? (
              <button
                type="button"
                className="ad-button"
                disabled={busy}
                onClick={() => setRevision((n) => n + 1)}
              >
                <RefreshCw size={13} /> Reload current details
              </button>
            ) : null}
          </div>
        )}
        {!snapshot && !error ? (
          <div className="va-dialog-loading" role="status">
            <LoaderCircle size={19} className="animate-spin" /> Loading vendor
            verification details...
          </div>
        ) : (
          snapshot && (
            <>
              <div className="va-decision-business">
                <strong>{v.businessName}</strong>
                <span className="ad-badge">
                  {v.status} · Cycle {v.cycle || 1}
                </span>
              </div>
              <dl className="va-decision-details">
                <Field label="Owner">{v.owner}</Field>
                <Field label="Email">{v.email}</Field>
                <Field label="Phone">{v.phone}</Field>
                <Field label="Location">
                  {snapshot.locations
                    .map((l) => `${l.city}, ${l.state}`)
                    .join("; ")}
                </Field>
                <Field label="Categories">
                  {snapshot.categories.map((c) => c.name).join(", ")}
                </Field>
                <Field label="Services">{number(s.services)}</Field>
                <Field label="Document verification">
                  {s.documents
                    ? `${number(s.approvedDocuments)} of ${number(s.documents)} approved · ${number(s.pendingDocuments)} pending · ${number(s.rejectedDocuments)} rejected`
                    : "No documents uploaded"}
                </Field>
                <Field label="Owner account">
                  {v.ownerBlocked
                    ? "Blocked"
                    : v.ownerActive
                      ? "Active"
                      : "Inactive"}
                </Field>
                <Field label="Owner email verified">
                  {v.emailVerified ? "Yes" : "No"}
                </Field>
              </dl>
              <p className="cd-dialog-note">
                {action === "Approved"
                  ? "Are you sure you want to approve this vendor?"
                  : action === "Rejected"
                    ? "The vendor will receive the rejection reason and admin notes. Records will be retained."
                    : action === "Suspended"
                      ? "Suspend approved vendor features and end the owner’s active sessions."
                      : action === "Reapply"
                        ? "Start a new verification cycle. Previous decisions, reasons, documents and audit records will be retained."
                        : "Mark this application as under review. The vendor will be notified."}
              </p>
              {!permitted && (
                <p className="ad-inline-error" role="alert">
                  This action is unavailable for a {v.status} application.
                  Reload the vendor page to choose another action.
                </p>
              )}
              {action === "Rejected" && (
                <>
                  <label>
                    Rejection reason
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    >
                      <option value="">Select a reason</option>
                      {rejectionReasons.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  {reason === "Other" && (
                    <label>
                      Explain the reason
                      <textarea
                        name="otherReason"
                        required
                        rows={3}
                        maxLength={1000}
                      />
                    </label>
                  )}
                </>
              )}
              {action === "Suspended" && (
                <label>
                  Suspension reason
                  <textarea name="reason" rows={3} required maxLength={1000} />
                </label>
              )}
              <label>
                {action === "Approved"
                  ? "Admin approval note (optional)"
                  : action === "Rejected"
                    ? "Admin notes (shared with vendor)"
                    : "Admin notes"}
                <textarea
                  name="notes"
                  rows={3}
                  required={["Rejected", "Suspended", "Reapply"].includes(
                    action,
                  )}
                  maxLength={2000}
                  placeholder={
                    action === "Rejected"
                      ? "Tell the vendor what needs to be corrected."
                      : "Record the context for this decision."
                  }
                />
              </label>
            </>
          )
        )}
        <div className="cd-dialog-actions">
          <button
            type="button"
            className="ad-button"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`ad-button ${action === "Rejected" ? "ad-danger" : "ad-primary"}`}
            disabled={
              busy ||
              !snapshot ||
              !permitted ||
              (action === "Approved" &&
                (!v?.emailVerified || !v?.ownerActive || v?.ownerBlocked))
            }
          >
            {busy ? (
              <>
                <LoaderCircle size={14} className="animate-spin" />
                {loadingLabel}
              </>
            ) : (
              <>
                {action === "Rejected" ? <X size={14} /> : <Check size={14} />}
                {labels[action]}
              </>
            )}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
