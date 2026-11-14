import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Settings, Trash2, X } from "lucide-react";
import { communicationRequest } from "./api";
import { useCommunicationSocket } from "./useCommunicationSocket";
import ResourceStatistics from "../admin/components/ResourceStatistics";
import NotificationTable from "./NotificationTable";

export function relativeTime(value) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000),
    abs = Math.abs(seconds);
  const [size, unit] =
    abs < 60
      ? [1, "second"]
      : abs < 3600
        ? [60, "minute"]
        : abs < 86400
          ? [3600, "hour"]
          : [86400, "day"];
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    Math.round(seconds / size),
    unit,
  );
}
function useInbox(role, query = "") {
  const socket = useCommunicationSocket(),
    [data, setData] = useState({ rows: [], hasMore: false }),
    [count, setCount] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    try {
      const inbox = await communicationRequest(role, `/notifications${query}`);
      if (current !== generation.current) return;
      setData(inbox);
      setCount(inbox.summary.unread);
      setError("");
    } catch (e) {
      if (current === generation.current) setError(e.message);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [role, query]);
  useEffect(() => {
    setLoading(true);
    reload();
    const events = [
      "new_notification",
      "notification_read",
      "notification_count_updated",
      "connect",
    ];
    let refreshTimer;
    const schedule = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(reload, 100);
    };
    events.forEach((e) => socket?.on(e, schedule));
    const timer = setInterval(() => {
      if (!document.hidden) reload();
    }, 30000);
    return () => {
      generation.current++;
      clearInterval(timer);
      clearTimeout(refreshTimer);
      events.forEach((e) => socket?.off(e, schedule));
    };
  }, [reload, socket]);
  async function action(path, method = "PATCH") {
    try {
      await communicationRequest(role, path, { method, data: {} });
      await reload();
      window.dispatchEvent(new Event("chat:read"));
    } catch (e) {
      setError(e.message);
    }
  }
  return { data, count, error, loading, reload, action };
}
function NotificationCard({ item, action, onOpen }) {
  return (
    <article className={`comm-notification [&&]:flex [&&]:gap-[18px] [&&]:p-[20px] [&&]:border-b [&&]:border-b-[#e9ede6] [&&]:text-[#34493d] [&&.unread]:bg-[#f0f5ec] [&&.unread]:border-l-3 [&&.unread]:border-l-[#72917e] [&&_>_div:first-child]:flex-1 [&&_>_div:first-child]:min-w-0 [&&_a]:no-underline [&&_a]:text-inherit [&&_strong]:text-[13px] [&&_strong]:font-semibold [&&_p]:text-[12px] [&&_p]:text-[#778371] [&&_p]:my-[6px] [&&_p]:mx-0 [&&_p]:leading-[1.6] [&&_small]:text-[10px] [&&_small]:text-[#97a08f] max-[640.001px]:[&&]:p-[15px] ${item.isRead ? "" : "unread"}`}>
      <div>
        <Link
          to={item.actionUrl}
          onClick={() => {
            action(`/notifications/${item.id}/read`);
            onOpen?.();
          }}
        >
          <strong>{item.title}</strong>
          <p>{item.message}</p>
        </Link>
        <small>
          {item.category} ·{" "}
          <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
        </small>
      </div>
      <div className="comm-notification-actions [&&]:flex [&&]:items-center [&&]:gap-[12px]">
        {!item.isRead && (
          <button
            aria-label="Mark notification as read"
            title="Mark as read"
            onClick={() => action(`/notifications/${item.id}/read`)}
          >
            <Check size={16} />
          </button>
        )}
        <button
          aria-label="Dismiss notification"
          title="Dismiss"
          onClick={() => action(`/notifications/${item.id}`, "DELETE")}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
export function NotificationBell({ role, unreadOnly = false }) {
  const { data, count, error, loading, reload, action } = useInbox(role, unreadOnly ? "?unread=1" : ""),
    [open, setOpen] = useState(false),
    root = useRef();
  const rows = data.rows.filter(item => !unreadOnly || !item.isRead);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (
        e.key === "Escape" ||
        (e.type === "pointerdown" && !root.current?.contains(e.target))
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div className="comm-bell [&&_button]:cursor-pointer [&&_button:focus-visible]:outline-2 [&&_button:focus-visible]:outline-[#72917e] [&&_button:focus-visible]:outline-offset-[3px] [&&]:relative [&&]:inline-flex [&&]:text-[#64745f] [&&_>_button]:relative [&&_>_button]:p-[8px] [&&_>_button]:flex [&&_>_button]:items-center [&&_em]:absolute [&&_em]:right-[-3px] [&&_em]:top-[-2px] [&&_em]:text-[9px] [&&_em]:not-italic [&&_em]:rounded-[10px] [&&_em]:bg-[#40674f] [&&_em]:text-white [&&_em]:py-[2px] [&&_em]:px-[5px]" ref={root}>
      <button
        aria-label={`Notifications: ${count} unread`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={20} />
        {count > 0 && <em>{count > 99 ? "99+" : count}</em>}
      </button>
      {open && (
        <section className="comm-dropdown [&&]:absolute [&&]:right-0 [&&]:top-[43px] [&&]:w-[min(360px,_calc(100vw_-_30px))] [&&]:border [&&]:border-[#e0e7da] [&&]:bg-white [&&]:shadow-[0_10px_35px_#263e3520] [&&]:rounded-[12px] [&&]:z-[100] [&&]:max-h-[70dvh] [&&]:overflow-auto [&&_>_header]:flex [&&_>_header]:justify-between [&&_>_header]:p-[16px] [&&_>_header]:border-b [&&_>_header]:border-b-[#e0e7da] [&&_>_header_h3]:text-[14px] [&&_>_header_h3]:font-semibold [&&_>_p]:block [&&_>_p]:p-[16px] [&&_>_p]:text-[12px] [&&_>_a]:block [&&_>_a]:p-[16px] [&&_>_a]:text-[12px] [&&_.comm-notification]:p-[14px] [&&_.comm-notification_strong]:text-[12px] [&&_.comm-notification_p]:text-[11px] [&&_.comm-notification-actions]:gap-[7px]" aria-label={unreadOnly ? "Unread notifications" : "Recent notifications"}>
          <header>
            <h3>{unreadOnly ? "Unread notifications" : "Notifications"}</h3>
            <button
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </header>
          {error ? (
            <p role="alert">
              {error}
              <button onClick={reload}>Retry</button>
            </p>
          ) : loading ? (
            <p role="status">Loading…</p>
          ) : rows.length ? (
            rows
              .slice(0, 5)
              .map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  action={action}
                  onOpen={() => setOpen(false)}
                />
              ))
          ) : (
            <p>You're all caught up.</p>
          )}
          <Link
            to={`/${role.toLowerCase()}/notifications`}
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </section>
      )}
    </div>
  );
}
export default function NotificationCenter({ role }) {
  const [page, setPage] = useState(1),
    [category, setCategory] = useState("all"),
    [unread, setUnread] = useState(false);
  const { data, count, error, loading, reload, action } = useInbox(
    role,
    `?${new URLSearchParams({ page, category, unread: unread ? "1" : "0" })}`,
  );
  return (
    <div className="comm-root [&&]:text-[#263e35] [&&]:[font-family:inherit] [&&]:min-w-0 [&&_button]:cursor-pointer [&&_button:disabled]:opacity-45 [&&_button:disabled]:cursor-default [&&_button:focus-visible]:outline-2 [&&_button:focus-visible]:outline-[#72917e] [&&_button:focus-visible]:outline-offset-[3px] [&&_a:focus-visible]:outline-2 [&&_a:focus-visible]:outline-[#72917e] [&&_a:focus-visible]:outline-offset-[3px] [&&_input:focus-visible]:outline-2 [&&_input:focus-visible]:outline-[#72917e] [&&_input:focus-visible]:outline-offset-[3px] [&&_textarea:focus-visible]:outline-2 [&&_textarea:focus-visible]:outline-[#72917e] [&&_textarea:focus-visible]:outline-offset-[3px] [&&_.comm-filters]:flex [&&_.comm-filters]:items-center [&&_.comm-filters]:flex-wrap [&&_.comm-filters]:gap-[12px] [&&_.comm-filters]:py-[12px] [&&_.comm-filters]:px-[16px] [&&_.comm-filters]:text-[12px] [&&_.comm-send]:inline-flex [&&_.comm-send]:items-center [&&_.comm-send]:justify-center [&&_.comm-send]:gap-[9px] [&&_.comm-send]:bg-[#365f4d] [&&_.comm-send]:text-white [&&_.comm-send]:py-[11px] [&&_.comm-send]:px-[18px] [&&_.comm-send]:rounded-[8px] [&&_.comm-send]:text-[12px] max-[640.001px]:[&&_.comm-send]:p-[10px]">
      <div className="comm-title [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[20px] [&&]:mb-[25px] [&&_p]:text-[10px] [&&_p]:tracking-[2px] [&&_p]:text-[#8a7961] [&&_p]:mb-[8px] [&&_h1]:text-[30px] [&&_h1]:mt-0 [&&_h1]:mx-0 [&&_h1]:mb-[8px] [&&_h1]:font-semibold [&&_span]:text-[13px] [&&_span]:text-[#7b857f] [&&_>_a]:flex [&&_>_a]:items-center [&&_>_a]:gap-[8px] [&&_>_a]:text-[13px] [&&_.comm-connection]:text-[11px] [&&_.comm-connection]:border [&&_.comm-connection]:border-[#e3e8e2] [&&_.comm-connection]:py-[9px] [&&_.comm-connection]:px-[13px] [&&_.comm-connection]:rounded-[25px] [&&_.comm-connection]:bg-white max-[900.001px]:[&&_.comm-connection]:hidden max-[640.001px]:[&&_h1]:text-[25px] max-[640.001px]:[&&]:gap-[10px] max-[640.001px]:[&&_>_a]:text-[11px]">
        <div>
          <p>STAY IN THE LOOP</p>
          <h1>Notifications</h1>
          <span>{count} unread updates for your celebrations.</span>
        </div>
        <Link to={`/${role.toLowerCase()}/notification-settings`}>
          <Settings size={17} /> Preferences
        </Link>
      </div>
      <ResourceStatistics resource="notifications" summary={data.summary} loading={loading} error={error} />
      <div className="comm-filters [&&_button]:py-[6px] [&&_button]:px-[10px] [&&_button]:border [&&_button]:border-[#e3e8e2] [&&_button]:rounded-[6px] [&&_button]:bg-white [&&_button[aria-pressed=true]]:bg-[#edf3ee] [&&_button[aria-pressed=true]]:text-[#365f4d] [&&_button[aria-pressed=true]]:border-[#b9cdbf] [&&_label]:flex [&&_label]:gap-[6px] [&&_label]:items-center [&&_select]:border [&&_select]:border-[#e3e8e2] [&&_select]:p-[7px] [&&_select]:rounded-[6px]">
        <label>
          Type{" "}
          <select
            aria-label="Notification type"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            {["all", "chat", "booking", "quotation", "general"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={unread}
            onChange={(e) => {
              setUnread(e.target.checked);
              setPage(1);
            }}
          />{" "}
          Unread only
        </label>
        <button onClick={() => action("/notifications/read-all")}>
          Mark all as read
        </button>
      </div>
      {error ? (
        <div className="comm-error [&&]:flex [&&]:flex-wrap [&&]:gap-[10px] [&&]:items-center [&&]:bg-[#fff3ef] [&&]:text-[#914d3c] [&&]:py-[12px] [&&]:px-[16px] [&&]:rounded-[8px] [&&]:text-[12px] [&&]:mb-[12px] [&&_button]:underline" role="alert">
          {error}
          <button onClick={reload}>Retry</button>
        </div>
      ) : loading ? (
        <p role="status">Loading notifications…</p>
      ) : data.rows.length ? (
        <NotificationTable rows={data.rows} action={action} />
      ) : (
        <div className="comm-empty [&&]:flex [&&]:flex-1 [&&]:flex-col [&&]:items-center [&&]:justify-center [&&]:text-center [&&]:py-[35px] [&&]:px-[25px] [&&]:gap-[12px] [&&]:text-[#879380] [&&_h2]:font-medium [&&_h2]:text-[#53644f] [&&_h2]:text-[18px] [&&_h3]:font-medium [&&_h3]:text-[#53644f] [&&_h3]:text-[18px] [&&_p]:text-[12px] [&&_p]:max-w-[280px] [&&_p]:leading-[1.8]">
          <Bell size={36} />
          <h2>You’re all caught up</h2>
          <p>New updates will appear here.</p>
        </div>
      )}
      <div className="comm-pagination [&&]:flex [&&]:justify-between [&&]:items-center [&&]:gap-[10px] [&&]:p-[15px] [&&]:text-[12px] [&&_button]:border [&&_button]:border-[#e3e8e2] [&&_button]:py-[6px] [&&_button]:px-[9px] [&&_button]:rounded-[6px]">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
export function NotificationSettings({ role }) {
  const [settings, setSettings] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const load = useCallback(
    () =>
      communicationRequest(role, "/notification-preferences")
        .then(setSettings)
        .catch((e) => setError(e.message)),
    [role],
  );
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div className="comm-root [&&]:text-[#263e35] [&&]:[font-family:inherit] [&&]:min-w-0 [&&_button]:cursor-pointer [&&_button:disabled]:opacity-45 [&&_button:disabled]:cursor-default [&&_button:focus-visible]:outline-2 [&&_button:focus-visible]:outline-[#72917e] [&&_button:focus-visible]:outline-offset-[3px] [&&_a:focus-visible]:outline-2 [&&_a:focus-visible]:outline-[#72917e] [&&_a:focus-visible]:outline-offset-[3px] [&&_input:focus-visible]:outline-2 [&&_input:focus-visible]:outline-[#72917e] [&&_input:focus-visible]:outline-offset-[3px] [&&_textarea:focus-visible]:outline-2 [&&_textarea:focus-visible]:outline-[#72917e] [&&_textarea:focus-visible]:outline-offset-[3px] [&&_.comm-filters]:flex [&&_.comm-filters]:items-center [&&_.comm-filters]:flex-wrap [&&_.comm-filters]:gap-[12px] [&&_.comm-filters]:py-[12px] [&&_.comm-filters]:px-[16px] [&&_.comm-filters]:text-[12px] [&&_.comm-send]:inline-flex [&&_.comm-send]:items-center [&&_.comm-send]:justify-center [&&_.comm-send]:gap-[9px] [&&_.comm-send]:bg-[#365f4d] [&&_.comm-send]:text-white [&&_.comm-send]:py-[11px] [&&_.comm-send]:px-[18px] [&&_.comm-send]:rounded-[8px] [&&_.comm-send]:text-[12px] max-[640.001px]:[&&_.comm-send]:p-[10px]">
      <div className="comm-title [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[20px] [&&]:mb-[25px] [&&_p]:text-[10px] [&&_p]:tracking-[2px] [&&_p]:text-[#8a7961] [&&_p]:mb-[8px] [&&_h1]:text-[30px] [&&_h1]:mt-0 [&&_h1]:mx-0 [&&_h1]:mb-[8px] [&&_h1]:font-semibold [&&_span]:text-[13px] [&&_span]:text-[#7b857f] [&&_>_a]:flex [&&_>_a]:items-center [&&_>_a]:gap-[8px] [&&_>_a]:text-[13px] [&&_.comm-connection]:text-[11px] [&&_.comm-connection]:border [&&_.comm-connection]:border-[#e3e8e2] [&&_.comm-connection]:py-[9px] [&&_.comm-connection]:px-[13px] [&&_.comm-connection]:rounded-[25px] [&&_.comm-connection]:bg-white max-[900.001px]:[&&_.comm-connection]:hidden max-[640.001px]:[&&_h1]:text-[25px] max-[640.001px]:[&&]:gap-[10px] max-[640.001px]:[&&_>_a]:text-[11px]">
        <div>
          <p>MAKE IT YOURS</p>
          <h1>Notification preferences</h1>
          <span>Choose the optional in-app updates you receive.</span>
        </div>
      </div>
      {error && (
        <p className="comm-error [&&]:flex [&&]:flex-wrap [&&]:gap-[10px] [&&]:items-center [&&]:bg-[#fff3ef] [&&]:text-[#914d3c] [&&]:py-[12px] [&&]:px-[16px] [&&]:rounded-[8px] [&&]:text-[12px] [&&]:mb-[12px] [&&_button]:underline" role="alert">
          {error}
          <button onClick={load}>Retry</button>
        </p>
      )}
      {!settings ? (
        <p role="status">Loading preferences…</p>
      ) : (
        <form
          className="comm-settings [&&]:p-[25px] [&&]:bg-white [&&]:max-w-[650px] [&&]:border [&&]:border-[#e3e8e2] [&&]:rounded-[14px] [&&_>_label]:flex [&&_>_label]:justify-between [&&_>_label]:gap-[15px] [&&_>_label]:py-[20px] [&&_>_label]:px-0 [&&_>_label]:border-b [&&_>_label]:border-b-[#e3e8e2] [&&_strong]:text-[14px] [&&_strong]:block [&&_small]:block [&&_small]:text-[12px] [&&_small]:mt-[7px] [&&_small]:text-[#83917c] [&&_>_p]:text-[12px] [&&_>_p]:leading-[1.7] [&&_>_p]:text-[#83917c] [&&_>_p]:my-[25px] [&&_>_p]:mx-0 [&&_>_span]:m-[15px] [&&_>_span]:text-[12px] max-[640.001px]:[&&]:p-[18px]"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              setSettings(
                await communicationRequest(role, "/notification-preferences", {
                  method: "PUT",
                  data: settings,
                }),
              );
              setSaved(true);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {Object.entries({
            chatEnabled: [
              "Chat updates",
              "New conversations, messages and attachments.",
            ],
            bookingEnabled: [
              "Booking reminders",
              "Optional reminders for upcoming bookings.",
            ],
            quotationEnabled: [
              "Quotation reminders",
              "Optional reminders about quotation expiry.",
            ],
          }).map(([key, [title, description]]) => (
            <label key={key}>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <input
                type="checkbox"
                checked={!!settings[key]}
                onChange={(e) => {
                  setSettings({ ...settings, [key]: e.target.checked });
                  setSaved(false);
                }}
              />
            </label>
          ))}
          <p>
            Essential account, booking and quotation status changes are always
            delivered in-app.
          </p>
          <button className="comm-send max-[640.001px]:[&&_>_span]:hidden" disabled={busy}>
            {busy ? "Saving…" : "Save preferences"}
          </button>
          {saved && <span role="status">Preferences saved.</span>}
        </form>
      )}
    </div>
  );
}
