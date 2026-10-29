import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../services-management.api";
import { adminRequest, date } from "../api";
import { Skeleton, ErrorState, Empty } from "../components/AdminTable";
import { notificationLink } from "../notification-links";
export default function AdminInbox() {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const state = useAdminData(
    `/notifications/inbox?page=${page}&pageSize=20`,
    revision,
  );
  return (
    <>
      <div className="ad-page-heading">
        <div>
          <h1>Notifications</h1>
          <p>Your operational inbox · {state.data?.unread ?? "—"} unread</p>
        </div>
        <Link className="ad-button" to="/admin/dashboard">
          Pending work & recent activity
        </Link>
      </div>
      {error && (
        <p role="alert" className="ad-inline-error">
          {error}
        </p>
      )}
      {state.loading ? (
        <Skeleton />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.retry} />
      ) : (
        <section className="ad-panel">
          {!state.data.rows.length && (
            <Empty
              text="Your inbox is up to date"
              description="New registrations, submissions and financial events appear here."
            />
          )}
          {state.data.rows.map((item) => (
            <article className="ad-inbox-row" key={item.id}>
              <div>
                <strong>
                  {!item.read && "● "}
                  {item.title}
                </strong>
                <p>{item.message}</p>
                <small>{date(item.createdAt)}</small>
              </div>
              <div className="ad-heading-actions">
                <Link className="ad-button" to={notificationLink(item)}>
                  Open record
                </Link>
                <button
                  className="ad-button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await adminRequest(`/notifications/${item.id}/read`, {
                        method: "PATCH",
                        body: JSON.stringify({ read: !item.read }),
                      });
                      setRevision((v) => v + 1);
                    } catch (failure) {
                      setError(failure.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {item.read ? "Mark unread" : "Mark read"}
                </button>
              </div>
            </article>
          ))}
          <div className="ad-table-footer">
            <button
              className="ad-button"
              disabled={page <= 1}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} · {state.data.total} notifications
            </span>
            <button
              className="ad-button"
              disabled={page * 20 >= state.data.total}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </button>
          </div>
        </section>
      )}
    </>
  );
}
