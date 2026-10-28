import "./approval-timeline.css";
export default function ApprovalTimeline({ rows = [] }) {
  return rows.length ? (
    <ol className="sa-timeline">
      {rows.map((row) => {
        let detail = {};
        try {
          detail = JSON.parse(row.details || "{}");
        } catch {
          /* Legacy audit payload. */
        }
        return (
          <li key={row.id}>
            <strong>
              {{
                SERVICE_START_REVIEW: "Reviewed",
                SERVICE_REVIEWED: "Reviewed",
                SERVICE_APPROVE: "Approved",
                SERVICE_REJECT: "Rejected",
                VENDOR_SERVICE_SUBMITTED: "Submitted",
                VENDOR_SERVICE_RESUBMITTED: "Resubmitted",
                VENDOR_SERVICE_UPDATED: "Edited",
                ADMIN_SERVICE_CREATED: "Draft created",
                ADMIN_SERVICE_EDITED: "Edited",
                ADMIN_SERVICE_SUBMITTED: "Submitted for review",
                ADMIN_SERVICE_DUPLICATED: "Draft duplicated",
                ADMIN_SERVICE_ITEM_CHANGED: "Service items updated",
                ADMIN_SERVICE_PACKAGE_CHANGED: "Package updated",
                ADMIN_SERVICE_IMAGE_CHANGED: "Images updated",
                ADMIN_SERVICE_IMAGE_UPLOADED: "Image uploaded",
                SERVICE_SUSPEND: "Suspended",
                SERVICE_ACTIVATE: "Activated",
                SERVICE_DEACTIVATE: "Deactivated",
              }[row.action] ||
                row.action
                  .replace(/^VENDOR_SERVICE_|^SERVICE_/, "")
                  .replaceAll("_", " ")}
            </strong>
            <p>
              {row.action.startsWith("VENDOR_") ? "Vendor" : "Admin"}:{" "}
              {row.actor || row.actorId || "System"} ·{" "}
              {new Date(row.timestamp).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}
            </p>
            {detail.reason && <p>Reason: {detail.reason}</p>}
            {(detail.notes || detail.note) && (
              <p>Notes: {detail.notes || detail.note}</p>
            )}
            {detail.status && <small>Status: {detail.status}</small>}
          </li>
        );
      })}
    </ol>
  ) : (
    <p>No approval history recorded yet.</p>
  );
}
