import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Settings, Trash2, X } from "lucide-react";
import { communicationRequest } from "./api";
import { useCommunicationSocket } from "./useCommunicationSocket";
import "./communication.css";
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
      const [inbox, c] = await Promise.all([
        communicationRequest(role, `/notifications${query}`),
        communicationRequest(role, "/notifications/unread-count"),
      ]);
      if (current !== generation.current) return;
      setData(inbox);
      setCount(c.count);
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
    <article className={`comm-notification ${item.isRead ? "" : "unread"}`}>
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
      <div className="comm-notification-actions">
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
export function NotificationBell({ role }) {
  const { data, count, error, loading, reload, action } = useInbox(role),
    [open, setOpen] = useState(false),
    root = useRef();
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
    <div className="comm-bell" ref={root}>
      <button
        aria-label={`Notifications: ${count} unread`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={20} />
        {count > 0 && <em>{count > 99 ? "99+" : count}</em>}
      </button>
      {open && (
        <section className="comm-dropdown" aria-label="Recent notifications">
          <header>
            <h3>Notifications</h3>
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
          ) : data.rows.length ? (
            data.rows
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
            <p>You’re all caught up.</p>
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
    <div className="comm-root">
      <div className="comm-title">
        <div>
          <p>STAY IN THE LOOP</p>
          <h1>Notifications</h1>
          <span>{count} unread updates for your celebrations.</span>
        </div>
        <Link to={`/${role.toLowerCase()}/notification-settings`}>
          <Settings size={17} /> Preferences
        </Link>
      </div>
      <div className="comm-filters">
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
        <div className="comm-error" role="alert">
          {error}
          <button onClick={reload}>Retry</button>
        </div>
      ) : loading ? (
        <p role="status">Loading notifications…</p>
      ) : data.rows.length ? (
        <div className="comm-notifications">
          {data.rows.map((item) => (
            <NotificationCard key={item.id} item={item} action={action} />
          ))}
        </div>
      ) : (
        <div className="comm-empty">
          <Bell size={36} />
          <h2>You’re all caught up</h2>
          <p>New updates will appear here.</p>
        </div>
      )}
      <div className="comm-pagination">
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
    <div className="comm-root">
      <div className="comm-title">
        <div>
          <p>MAKE IT YOURS</p>
          <h1>Notification preferences</h1>
          <span>Choose the optional in-app updates you receive.</span>
        </div>
      </div>
      {error && (
        <p className="comm-error" role="alert">
          {error}
          <button onClick={load}>Retry</button>
        </p>
      )}
      {!settings ? (
        <p role="status">Loading preferences…</p>
      ) : (
        <form
          className="comm-settings"
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
          <button className="comm-send" disabled={busy}>
            {busy ? "Saving…" : "Save preferences"}
          </button>
          {saved && <span role="status">Preferences saved.</span>}
        </form>
      )}
    </div>
  );
}
