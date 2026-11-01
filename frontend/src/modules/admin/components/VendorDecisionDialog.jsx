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
      <form className="ad-form va-decision flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7] [&_.ad-inline-error]:grid [&_.ad-inline-error]:gap-[10px] [&_.ad-inline-error_.ad-button]:[justify-self:start]" onSubmit={submit}>
        {error && (
          <div className="ad-inline-error [background:#fff1ed] text-[#af6158] p-[12px] rounded-[7px] text-[12px] [margin:12px_0]" role="alert">
            <strong>{error.message}</strong>
            {[409, 500].includes(error.status) || !snapshot ? (
              <button
                type="button"
                className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                disabled={busy}
                onClick={() => setRevision((n) => n + 1)}
              >
                <RefreshCw size={13} /> Reload current details
              </button>
            ) : null}
          </div>
        )}
        {!snapshot && !error ? (
          <div className="va-dialog-loading flex items-center gap-[10px] [padding:25px_0] text-[#728b75]" role="status">
            <LoaderCircle size={19} className="animate-spin" /> Loading vendor
            verification details...
          </div>
        ) : (
          snapshot && (
            <>
              <div className="va-decision-business flex items-center justify-between gap-[12px] [padding:13px_15px] [background:#edf4ef] [border-top-width:1px] [border-top-style:solid] [border-top-color:#deeadf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#deeadf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#deeadf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#deeadf] rounded-[8px] [&_strong]:text-[#315c48] [&_strong]:text-[15px] [&_strong]:[overflow-wrap:anywhere]">
                <strong>{v.businessName}</strong>
                <span className="ad-badge rounded-[5px] inline-flex text-[8px] [padding:3px_7px] [background:#f1f4ed] text-[#85927b] [white-space:normal] [&.ad-badge-approved]:[background:#edf5e9] [&.ad-badge-approved]:text-[#65905d] [&.ad-badge-active]:[background:#edf5e9] [&.ad-badge-active]:text-[#65905d] [&.ad-badge-confirmed]:[background:#edf5e9] [&.ad-badge-confirmed]:text-[#65905d] [&.ad-badge-success]:[background:#edf5e9] [&.ad-badge-success]:text-[#65905d] [&.ad-badge-paid]:[background:#edf5e9] [&.ad-badge-paid]:text-[#65905d] [&.ad-badge-published]:[background:#edf5e9] [&.ad-badge-published]:text-[#65905d] [&.ad-badge-completed]:[background:#edf5e9] [&.ad-badge-completed]:text-[#65905d] [&.ad-badge-pending]:[background:#fbf5e7] [&.ad-badge-pending]:text-[#b09454] [&.ad-badge-underreview]:[background:#fbf5e7] [&.ad-badge-underreview]:text-[#b09454] [&.ad-badge-processing]:[background:#fbf5e7] [&.ad-badge-processing]:text-[#b09454] [&.ad-badge-invited]:[background:#fbf5e7] [&.ad-badge-invited]:text-[#b09454] [&.ad-badge-rejected]:[background:#fcf0eb] [&.ad-badge-rejected]:text-[#bc7c68] [&.ad-badge-cancelled]:[background:#fcf0eb] [&.ad-badge-cancelled]:text-[#bc7c68] [&.ad-badge-failed]:[background:#fcf0eb] [&.ad-badge-failed]:text-[#bc7c68] [&.ad-badge-blocked]:[background:#fcf0eb] [&.ad-badge-blocked]:text-[#bc7c68] [&.ad-badge-suspended]:[background:#fcf0eb] [&.ad-badge-suspended]:text-[#bc7c68] [&.ad-badge-disputed]:[background:#fcf0eb] [&.ad-badge-disputed]:text-[#bc7c68]">
                  {v.status} · Cycle {v.cycle || 1}
                </span>
              </div>
              <dl className="va-decision-details grid grid-cols-[1fr_1fr] [@media(width<=600px)]:grid-cols-[1fr] gap-[16px_20px] [margin:4px_0] [&_>_div]:min-w-0 [&_dt]:text-[10px] [&_dt]:text-[#839081] [&_dt]:uppercase [&_dt]:tracking-[0.4px] [&_dt]:mb-[4px] [&_dd]:m-[0] [&_dd]:text-[#46614b] [&_dd]:text-[12px] [&_dd]:[overflow-wrap:anywhere]">
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
              <p className="cd-dialog-note text-[#738176] leading-[1.7] text-[12px] [background:#f3f7f3] [padding:12px_14px] rounded-[7px]">
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
                <p className="ad-inline-error [background:#fff1ed] text-[#af6158] p-[12px] rounded-[7px] text-[12px] [margin:12px_0]" role="alert">
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
        <div className="cd-dialog-actions flex items-center justify-end gap-[9px] mt-[10px]">
          <button
            type="button"
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] ${action === "Rejected" ? "ad-danger" : "ad-primary"}`}
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
