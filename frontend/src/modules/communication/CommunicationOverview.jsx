import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Bell, History, Info, MessagesSquare, RefreshCw } from "lucide-react";
import { communicationRequest } from "./api";
import ResourceStatistics from "../admin/components/ResourceStatistics";


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
    <table className="comm-overview-table [&&]:w-full [&&]:border-collapse [&&]:table-fixed [&&]:text-left [&&_th]:py-[18px] [&&_th]:px-[24px] [&&_th]:border-b [&&_th]:border-b-[#edf1ed] [&&_th]:[vertical-align:middle] [&&_th]:wrap-anywhere [&&_th]:border-t [&&_th]:border-t-[#eaf0eb] [&&_th]:text-[#8b9c90] [&&_th]:bg-[#f8faf8] [&&_th]:text-[9px] [&&_th]:font-medium [&&_th]:tracking-[0.7px] [&&_th]:uppercase [&&_td]:py-[18px] [&&_td]:px-[24px] [&&_td]:border-b [&&_td]:border-b-[#edf1ed] [&&_td]:[vertical-align:middle] [&&_td]:wrap-anywhere [&&_tbody_tr:last-child_td]:border-b-0 [&&_tbody_tr:hover]:bg-[#fbfcfa] [&&_strong]:text-[#41634e] [&&_strong]:text-[12px] [&&_strong]:font-medium [&&_strong]:leading-[1.7] [&&_p]:m-0 [&&_p]:text-[#8b9c8e] [&&_p]:text-[11px] [&&_p]:leading-[1.75] max-[1100.001px]:[&&]:block max-[1100.001px]:[&&]:w-full max-[1100.001px]:[&&_tbody]:block max-[1100.001px]:[&&_tbody]:w-full max-[1100.001px]:[&&_colgroup]:hidden max-[1100.001px]:[&&_thead]:hidden max-[1100.001px]:[&&_tbody_tr]:grid max-[1100.001px]:[&&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[1100.001px]:[&&_tbody_tr]:gap-[16px] max-[1100.001px]:[&&_tbody_tr]:p-[20px] max-[1100.001px]:[&&_tbody_tr]:border-t max-[1100.001px]:[&&_tbody_tr]:border-t-[#edf1ed] max-[1100.001px]:[&&_td]:min-w-0 max-[1100.001px]:[&&_td]:p-0 max-[1100.001px]:[&&_td]:border-0 max-[1100.001px]:[&&_td:last-child]:col-span-full max-[1100.001px]:[&&_td::before]:block max-[1100.001px]:[&&_td::before]:mb-[7px] max-[1100.001px]:[&&_td::before]:text-[#98a79c] max-[1100.001px]:[&&_td::before]:text-[9px] max-[1100.001px]:[&&_td::before]:tracking-[0.6px] max-[1100.001px]:[&&_td::before]:uppercase max-[1100.001px]:[&&_td::before]:content-[attr(data-label)]">
      <caption className="sr-only">Marketplace communication activity totals and metric definitions</caption>
      <colgroup>{[31, 10, 17, 42].map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup>
      <thead><tr>{["Activity", "Total", "Coverage", "Details"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>
        {metrics.map(({ key, label, scope, description }) => (
          <tr key={key}>
            <td data-label="Activity"><strong>{label}</strong></td>
            <td data-label="Total"><span className="comm-overview-total [&&]:text-[#2f5f46] [&&]:text-[17px] [&&]:font-semibold [&&]:tabular-nums">{data[key] == null ? "?" : counts.format(data[key])}</span></td>
            <td data-label="Coverage"><span className="comm-overview-scope [&&]:inline-flex [&&]:max-w-full [&&]:py-[4px] [&&]:px-[7px] [&&]:border [&&]:border-[#e5ece2] [&&]:rounded-[6px] [&&]:text-[#7e937c] [&&]:bg-[#f6f9f2] [&&]:text-[10px] [&&]:leading-[1.5]">{scope}</span></td>
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
    <div className="comm-root [&&]:text-[#263e35] [&&]:[font-family:inherit] [&&]:min-w-0 [&&_button]:cursor-pointer [&&_button:disabled]:opacity-45 [&&_button:disabled]:cursor-default [&&_button:focus-visible]:outline-2 [&&_button:focus-visible]:outline-[#72917e] [&&_button:focus-visible]:outline-offset-[3px] [&&_a:focus-visible]:outline-2 [&&_a:focus-visible]:outline-[#72917e] [&&_a:focus-visible]:outline-offset-[3px] [&&_input:focus-visible]:outline-2 [&&_input:focus-visible]:outline-[#72917e] [&&_input:focus-visible]:outline-offset-[3px] [&&_textarea:focus-visible]:outline-2 [&&_textarea:focus-visible]:outline-[#72917e] [&&_textarea:focus-visible]:outline-offset-[3px] [&&_.comm-filters]:flex [&&_.comm-filters]:items-center [&&_.comm-filters]:flex-wrap [&&_.comm-filters]:gap-[12px] [&&_.comm-filters]:py-[12px] [&&_.comm-filters]:px-[16px] [&&_.comm-filters]:text-[12px] [&&_.comm-send]:inline-flex [&&_.comm-send]:items-center [&&_.comm-send]:justify-center [&&_.comm-send]:gap-[9px] [&&_.comm-send]:bg-[#365f4d] [&&_.comm-send]:text-white [&&_.comm-send]:py-[11px] [&&_.comm-send]:px-[18px] [&&_.comm-send]:rounded-[8px] [&&_.comm-send]:text-[12px] max-[640.001px]:[&&_.comm-send]:p-[10px] comm-overview">
      <div className="comm-title [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[20px] [&&]:mb-[25px] [&&_p]:text-[10px] [&&_p]:tracking-[2px] [&&_p]:text-[#8a7961] [&&_p]:mb-[8px] [&&_h1]:text-[30px] [&&_h1]:mt-0 [&&_h1]:mx-0 [&&_h1]:mb-[8px] [&&_h1]:font-semibold [&&_span]:text-[13px] [&&_span]:text-[#7b857f] [&&_>_a]:flex [&&_>_a]:items-center [&&_>_a]:gap-[8px] [&&_>_a]:text-[13px] [&&_.comm-connection]:text-[11px] [&&_.comm-connection]:border [&&_.comm-connection]:border-[#e3e8e2] [&&_.comm-connection]:py-[9px] [&&_.comm-connection]:px-[13px] [&&_.comm-connection]:rounded-[25px] [&&_.comm-connection]:bg-white max-[900.001px]:[&&_.comm-connection]:hidden max-[640.001px]:[&&_h1]:text-[25px] max-[640.001px]:[&&]:gap-[10px] max-[640.001px]:[&&_>_a]:text-[11px]">
        <div>
          <p>OPERATIONS</p>
          <h1>Communication overview</h1>
          <span>Messaging activity and notification totals across the marketplace.</span>
        </div>
        <button type="button" className="comm-overview-refresh [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:gap-[8px] [&&]:py-[10px] [&&]:px-[13px] [&&]:border [&&]:border-[#dfe8e0] [&&]:rounded-[8px] [&&]:text-[#5b7b65] [&&]:bg-white [&&]:text-[11px] [&&]:no-underline [&&]:transition-[background,border-color] [&&]:duration-200 [&&]:ease-[ease] [&&]:shrink-0 [&&:hover]:bg-[#f3f8f0] [&&:hover]:border-[#b9cebe]" disabled={loading} onClick={refresh}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          {loading ? "Refreshing?" : "Refresh"}
        </button>
      </div>
      <ResourceStatistics resource="communication-overview" summary={data} loading={loading} error={error} />
      <section className="comm-overview-panel [&&]:min-w-0 [&&]:overflow-hidden [&&]:border [&&]:border-[#e1e9e3] [&&]:rounded-[14px] [&&]:bg-white [&&]:shadow-[0_4px_20px_#24483d04]" aria-labelledby="communication-activity-heading" aria-busy={loading}>
        <div className="comm-overview-panel-heading [&&]:flex [&&]:flex-wrap [&&]:items-center [&&]:gap-[12px] [&&]:py-[22px] [&&]:px-[24px] [&&_h2]:m-0 [&&_h2]:text-[#2f4f3f] [&&_h2]:text-[15px] [&&_h2]:font-semibold [&&_h2]:leading-[1.5] [&&_h2]:tracking-[-0.2px] [&&_p]:mt-[4px] [&&_p]:mx-0 [&&_p]:mb-0 [&&_p]:text-[#93a196] [&&_p]:text-[11px] [&&_p]:leading-[1.6] max-[1100.001px]:[&&]:py-[18px] max-[1100.001px]:[&&]:px-[20px]">
          <span className="comm-overview-heading-icon [&&]:grid [&&]:w-[38px] [&&]:h-[38px] [&&]:shrink-0 [&&]:[place-items:center] [&&]:border [&&]:border-[#e2ebe3] [&&]:rounded-[10px] [&&]:text-[#6b8b75] [&&]:bg-[#f1f6f1]" aria-hidden="true"><MessagesSquare size={18} strokeWidth={1.6} /></span>
          <div><h2 id="communication-activity-heading">Communication activity</h2><p>Current totals, reporting coverage and metric definitions.</p></div>
          <span className="comm-overview-indicators [&&]:ml-auto [&&]:py-[5px] [&&]:px-[10px] [&&]:border [&&]:border-[#e4ebe4] [&&]:rounded-[20px] [&&]:text-[#829984] [&&]:bg-[#f7f9f5] [&&]:text-[10px]">4 indicators</span>
        </div>
        {error ? (
          <div className="comm-error [&&]:flex [&&]:flex-wrap [&&]:gap-[10px] [&&]:items-center [&&]:bg-[#fff3ef] [&&]:text-[#914d3c] [&&]:py-[12px] [&&]:px-[16px] [&&]:rounded-[8px] [&&]:text-[12px] [&&]:mb-[12px] [&&_button]:underline" role="alert">{error}<button type="button" onClick={refresh}>Retry</button></div>
        ) : loading ? (
          <div className="comm-overview-loading [&&]:py-[32px] [&&]:px-[24px] [&&]:text-[#8b9c90] [&&]:text-[12px]" role="status">Loading communication activity?</div>
        ) : data ? <CommunicationActivityTable data={data} /> : null}
        <footer className="comm-overview-panel-footer [&&]:flex [&&]:flex-wrap [&&]:items-center [&&]:justify-between [&&]:gap-[12px] [&&]:py-[16px] [&&]:px-[24px] [&&]:border-t [&&]:border-t-[#edf1ed] [&&]:bg-[#fcfdfa] [&&_p]:flex [&&_p]:items-start [&&_p]:gap-[7px] [&&_p]:m-0 [&&_p]:text-[#92a18f] [&&_p]:text-[10px] [&&_p]:leading-[1.7] [&&_svg]:shrink-0 [&&_svg]:mt-[2px] [&&_time]:text-[#99a69c] [&&_time]:text-[9px] max-[1100.001px]:[&&]:py-[18px] max-[1100.001px]:[&&]:px-[20px]">
          <p><Info size={14} aria-hidden="true" /> Recipient acknowledgement may remain pending while a user is offline.</p>
          {updatedAt && <time dateTime={updatedAt}>Last refreshed {refreshedAt.format(new Date(updatedAt))} IST</time>}
        </footer>
      </section>
      <nav className="comm-overview-links [&&_a]:inline-flex [&&_a]:items-center [&&_a]:justify-center [&&_a]:gap-[8px] [&&_a]:py-[10px] [&&_a]:px-[13px] [&&_a]:border [&&_a]:border-[#dfe8e0] [&&_a]:rounded-[8px] [&&_a]:text-[#5b7b65] [&&_a]:bg-white [&&_a]:text-[11px] [&&_a]:no-underline [&&_a]:transition-[background,border-color] [&&_a]:duration-200 [&&_a]:ease-[ease] [&&_a:hover]:bg-[#f3f8f0] [&&_a:hover]:border-[#b9cebe] [&&]:flex [&&]:flex-wrap [&&]:gap-[10px] [&&]:mt-[18px]" aria-label="Communication tools">
        <Link to="/admin/audit-logs"><History size={15} aria-hidden="true" /> Communication audit history <ArrowUpRight size={13} aria-hidden="true" /></Link>
        <Link to="/admin/notifications"><Bell size={15} aria-hidden="true" /> Operational notifications <ArrowUpRight size={13} aria-hidden="true" /></Link>
      </nav>
    </div>
  );
}
