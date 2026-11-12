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
    <div className="comm-notification-table-wrap">
      <table className="comm-notification-table">
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
                  <Link className="comm-notification-link" to={item.actionUrl} onClick={open}>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                  </Link>
                </td>
                <td data-label="Type"><span className="comm-notification-type">{item.category || "general"}</span></td>
                <td data-label="Status"><span className={`comm-notification-status ${item.isRead ? "read" : "unread"}`}>{item.isRead ? "Read" : "Unread"}</span></td>
                <td data-label="Received">
                  {item.createdAt ? (
                    <time className="comm-notification-date" dateTime={item.createdAt}>
                      <span>{dateFormat.format(new Date(item.createdAt))}</span>
                      <small>{timeFormat.format(new Date(item.createdAt))} IST</small>
                    </time>
                  ) : <span className="comm-notification-no-date">Not recorded</span>}
                </td>
                <td data-label="Actions">
                  <div className="comm-notification-row-actions">
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
