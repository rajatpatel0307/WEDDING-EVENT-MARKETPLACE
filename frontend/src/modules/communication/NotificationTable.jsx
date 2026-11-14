import { Link } from "react-router-dom";
import { Check, Eye, Trash2 } from "lucide-react";

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
});
const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
});

export default function NotificationTable({ rows, action }) {
  return (
    <div className="comm-notification-table-wrap [&&]:min-w-0 [&&]:border [&&]:border-[#e3e8e2] [&&]:rounded-[12px] [&&]:overflow-hidden [&&]:bg-white">
      <table className="comm-notification-table [&&]:w-full [&&]:border-collapse [&&]:table-fixed [&&]:text-left [&&_th]:py-[17px] [&&_th]:px-[16px] [&&_th]:wrap-anywhere [&&_th]:[vertical-align:middle] [&&_th]:border-b [&&_th]:border-b-[#edf1ed] [&&_th]:bg-[#f7faf6] [&&_th]:text-[#8a9b8f] [&&_th]:text-[10px] [&&_th]:font-medium [&&_th]:tracking-[0.5px] [&&_th]:uppercase [&&_td]:py-[17px] [&&_td]:px-[16px] [&&_td]:wrap-anywhere [&&_td]:[vertical-align:middle] [&&_td]:border-b [&&_td]:border-b-[#edf1ed] [&&_th:first-child]:pl-[22px] [&&_td:first-child]:pl-[22px] [&&_th:last-child]:text-center [&&_td:last-child]:text-center [&&_tbody_tr:last-child_td]:border-b-0 [&&_tbody_tr[data-unread=true]]:bg-[#f6faf3] [&&_tbody_tr[data-unread=true]_td:first-child]:shadow-[inset_3px_0_#729a7e] max-[800.001px]:[&&]:block max-[800.001px]:[&&]:w-full max-[800.001px]:[&&_tbody]:block max-[800.001px]:[&&_tbody]:w-full max-[800.001px]:[&&_colgroup]:hidden max-[800.001px]:[&&_thead]:hidden max-[800.001px]:[&&_tbody_tr]:grid max-[800.001px]:[&&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[800.001px]:[&&_tbody_tr]:gap-[18px] max-[800.001px]:[&&_tbody_tr]:p-[20px] max-[800.001px]:[&&_tbody_tr]:border-b max-[800.001px]:[&&_tbody_tr]:border-b-[#edf1ed] max-[800.001px]:[&&_tbody_tr:last-child]:border-b-0 max-[800.001px]:[&&_tbody_tr[data-unread=true]]:shadow-[inset_3px_0_#729a7e] max-[800.001px]:[&&_td]:block max-[800.001px]:[&&_td]:min-w-0 max-[800.001px]:[&&_td]:p-0 max-[800.001px]:[&&_td]:border-0 max-[800.001px]:[&&_td:first-child]:block max-[800.001px]:[&&_td:first-child]:min-w-0 max-[800.001px]:[&&_td:first-child]:p-0 max-[800.001px]:[&&_td:first-child]:border-0 max-[800.001px]:[&&_td:first-child]:col-span-full max-[800.001px]:[&&_tbody_tr[data-unread=true]_td:first-child]:shadow-none max-[800.001px]:[&&_td:not(:first-child)::before]:block max-[800.001px]:[&&_td:not(:first-child)::before]:mb-[7px] max-[800.001px]:[&&_td:not(:first-child)::before]:text-[#98a79c] max-[800.001px]:[&&_td:not(:first-child)::before]:text-[9px] max-[800.001px]:[&&_td:not(:first-child)::before]:tracking-[0.6px] max-[800.001px]:[&&_td:not(:first-child)::before]:uppercase max-[800.001px]:[&&_td:not(:first-child)::before]:content-[attr(data-label)] max-[800.001px]:[&&_td:last-child]:text-left">
        <caption className="sr-only">Your notifications, read status, received dates and available actions</caption>
        <colgroup>
          {[48, 11, 11, 16, 14].map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}
        </colgroup>
        <thead>
          <tr>
            {["Notification", "Type", "Status", "Received", "Actions"].map(label => <th key={label} scope="col">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(item => {
            const open = () => action(`/notifications/${item.id}/read`);
            return (
              <tr key={item.id} data-unread={!item.isRead}>
                <td data-label="Notification">
                  <Link className="comm-notification-link [&&]:block [&&]:no-underline [&&_strong]:text-[#355a45] [&&_strong]:text-[12px] [&&_strong]:font-semibold [&&_strong]:leading-[1.6] [&&_p]:mt-[5px] [&&_p]:mx-0 [&&_p]:mb-0 [&&_p]:text-[#869789] [&&_p]:text-[11px] [&&_p]:leading-[1.75] [&&_p]:whitespace-pre-wrap [&&:hover_strong]:text-[#176b60] [&&:hover_strong]:underline" to={item.actionUrl} onClick={open}>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                  </Link>
                </td>
                <td data-label="Type"><span className="comm-notification-type [&&]:inline-flex [&&]:max-w-full [&&]:py-[4px] [&&]:px-[8px] [&&]:border [&&]:border-[#e5ece3] [&&]:rounded-[6px] [&&]:text-[#7a907e] [&&]:bg-[#f7f9f4] [&&]:text-[10px] [&&]:leading-[1.4] [&&]:capitalize">{item.category || "general"}</span></td>
                <td data-label="Status"><span className={`comm-notification-status [&&]:inline-flex [&&]:max-w-full [&&]:py-[4px] [&&]:px-[8px] [&&]:border [&&]:border-[#e5ece3] [&&]:rounded-[6px] [&&]:text-[#7a907e] [&&]:bg-[#f7f9f4] [&&]:text-[10px] [&&]:leading-[1.4] [&&]:capitalize [&&.unread]:border-[#c6dccb] [&&.unread]:bg-[#eaf4e7] [&&.unread]:text-[#4f815a] [&&.unread]:font-semibold [&&.read]:border-[#e5ebe5] [&&.read]:text-[#8a9b8e] [&&.read]:bg-[#f3f6f2] ${item.isRead ? "read" : "unread"}`}>{item.isRead ? "Read" : "Unread"}</span></td>
                <td data-label="Received">
                  {item.createdAt ? (
                    <time className="comm-notification-date [&&]:grid [&&]:gap-[5px] [&&]:text-[#718678] [&&]:text-[11px] [&&]:leading-[1.5] [&&_small]:text-[#9aa89d] [&&_small]:text-[10px]" dateTime={item.createdAt}>
                      <span>{dateFormat.format(new Date(item.createdAt))}</span>
                      <small>{timeFormat.format(new Date(item.createdAt))} IST</small>
                    </time>
                  ) : <span className="comm-notification-no-date [&&]:text-[#9aa89d] [&&]:text-[10px]">Not recorded</span>}
                </td>
                <td data-label="Actions">
                  <div className="comm-notification-row-actions [&&]:flex [&&]:flex-wrap [&&]:justify-center [&&]:gap-[5px] [&&_a]:inline-flex [&&_a]:w-[28px] [&&_a]:h-[28px] [&&_a]:shrink-0 [&&_a]:items-center [&&_a]:justify-center [&&_a]:p-0 [&&_a]:border [&&_a]:border-[#e0e8df] [&&_a]:rounded-[6px] [&&_a]:bg-white [&&_a]:text-[#72937c] [&&_a]:transition-[background,border-color] [&&_a]:duration-200 [&&_a]:ease-[ease] [&&_button]:inline-flex [&&_button]:w-[28px] [&&_button]:h-[28px] [&&_button]:shrink-0 [&&_button]:items-center [&&_button]:justify-center [&&_button]:p-0 [&&_button]:border [&&_button]:border-[#e0e8df] [&&_button]:rounded-[6px] [&&_button]:bg-white [&&_button]:text-[#72937c] [&&_button]:transition-[background,border-color] [&&_button]:duration-200 [&&_button]:ease-[ease] [&&_a:hover]:border-[#b8d0bc] [&&_a:hover]:bg-[#f0f6ed] [&&_button:hover]:border-[#b8d0bc] [&&_button:hover]:bg-[#f0f6ed] [&&_.comm-notification-dismiss:hover]:border-[#ead0cb] [&&_.comm-notification-dismiss:hover]:bg-[#fff2ed] [&&_.comm-notification-dismiss:hover]:text-[#af6c60] max-[800.001px]:[&&]:[justify-content:flex-start]">
                    <Link to={item.actionUrl} onClick={open} title="Open notification" aria-label={`Open ${item.title}`}><Eye size={15} aria-hidden="true" /></Link>
                    {!item.isRead && <button type="button" onClick={() => action(`/notifications/${item.id}/read`)} title="Mark as read" aria-label={`Mark ${item.title} as read`}><Check size={15} aria-hidden="true" /></button>}
                    <button type="button" className="comm-notification-dismiss" onClick={() => action(`/notifications/${item.id}`, "DELETE")} title="Dismiss notification" aria-label={`Dismiss ${item.title}`}><Trash2 size={14} aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
