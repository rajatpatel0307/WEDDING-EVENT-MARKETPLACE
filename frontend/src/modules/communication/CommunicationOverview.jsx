import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Bell, History, Info, MessagesSquare, RefreshCw } from "lucide-react";
import { communicationRequest } from "./api";
import ResourceStatistics from "../admin/components/ResourceStatistics";
import "./communication.css";

const metrics = [
  { key: "conversations", label: "Active conversations", scope: "Currently active", description: "Customer and vendor conversations currently marked as active." },
  { key: "messagesToday", label: "Messages sent", scope: "Last 24 hours", description: "Messages created across the marketplace during the last 24 hours." },
  { key: "awaitingDelivery", label: "Awaiting acknowledgement", scope: "Current backlog", description: "Unread, non-deleted messages awaiting a delivery receipt from the recipient." },
  { key: "unreadNotifications", label: "Unread in-app notifications", scope: "Not dismissed", description: "Unread notifications across marketplace accounts, excluding dismissed updates." },
];
const counts = new Intl.NumberFormat("en-IN");
const refreshedAt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
});

export function CommunicationActivityTable({ data }) {
  return (
    <table className="comm-overview-table">
      <caption className="sr-only">Marketplace communication activity totals and metric definitions</caption>
      <colgroup>{[31, 10, 17, 42].map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup>
      <thead><tr>{["Activity", "Total", "Coverage", "Details"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>
        {metrics.map(({ key, label, scope, description }) => (
          <tr key={key}>
            <td data-label="Activity"><strong>{label}</strong></td>
            <td data-label="Total"><span className="comm-overview-total">{data[key] == null ? "?" : counts.format(data[key])}</span></td>
            <td data-label="Coverage"><span className="comm-overview-scope">{scope}</span></td>
            <td data-label="Details"><p>{description}</p></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CommunicationOverview() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [updatedAt, setUpdatedAt] = useState(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    communicationRequest("Admin", "/overview", { signal: abort.signal })
      .then(result => {
        if (abort.signal.aborted) return;
        setData(result);
        setUpdatedAt(new Date().toISOString());
        setError("");
      })
      .catch(e => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [revision]);
  function refresh() {
    setLoading(true);
    setError("");
    setRevision(value => value + 1);
  }
  return (
    <div className="comm-root comm-overview">
      <div className="comm-title">
        <div>
          <p>OPERATIONS</p>
          <h1>Communication overview</h1>
          <span>Messaging activity and notification totals across the marketplace.</span>
        </div>
        <button type="button" className="comm-overview-refresh" disabled={loading} onClick={refresh}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          {loading ? "Refreshing?" : "Refresh"}
        </button>
      </div>
      <ResourceStatistics resource="communication-overview" summary={data} loading={loading} error={error} />
      <section className="comm-overview-panel" aria-labelledby="communication-activity-heading" aria-busy={loading}>
        <div className="comm-overview-panel-heading">
          <span className="comm-overview-heading-icon" aria-hidden="true"><MessagesSquare size={18} strokeWidth={1.6} /></span>
          <div><h2 id="communication-activity-heading">Communication activity</h2><p>Current totals, reporting coverage and metric definitions.</p></div>
          <span className="comm-overview-indicators">4 indicators</span>
        </div>
        {error ? (
          <div className="comm-error" role="alert">{error}<button type="button" onClick={refresh}>Retry</button></div>
        ) : loading ? (
          <div className="comm-overview-loading" role="status">Loading communication activity?</div>
        ) : data ? <CommunicationActivityTable data={data} /> : null}
        <footer className="comm-overview-panel-footer">
          <p><Info size={14} aria-hidden="true" /> Recipient acknowledgement may remain pending while a user is offline.</p>
          {updatedAt && <time dateTime={updatedAt}>Last refreshed {refreshedAt.format(new Date(updatedAt))} IST</time>}
        </footer>
      </section>
      <nav className="comm-overview-links" aria-label="Communication tools">
        <Link to="/admin/audit-logs"><History size={15} aria-hidden="true" /> Communication audit history <ArrowUpRight size={13} aria-hidden="true" /></Link>
        <Link to="/admin/notifications"><Bell size={15} aria-hidden="true" /> Operational notifications <ArrowUpRight size={13} aria-hidden="true" /></Link>
      </nav>
    </div>
  );
}
