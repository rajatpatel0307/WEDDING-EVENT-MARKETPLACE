import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { communicationRequest } from "./api";
import "./communication.css";
export default function CommunicationOverview() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    communicationRequest("Admin", "/overview")
      .then((r) => {
        if (current) {
          setData(r);
          setError("");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [revision]);
  return (
    <div className="comm-root">
      <div className="comm-title">
        <div>
          <p>OPERATIONS</p>
          <h1>Communication overview</h1>
          <span>Aggregate activity for the marketplace.</span>
        </div>
        <button onClick={() => setRevision((v) => v + 1)}>Refresh</button>
      </div>
      {error ? (
        <p className="comm-error" role="alert">
          {error}
        </p>
      ) : !data ? (
        <p role="status">Loading activity…</p>
      ) : (
        <div className="comm-notifications">
          {Object.entries({
            conversations: "Active conversations",
            messagesToday: "Messages in the last 24 hours",
            awaitingDelivery: "Messages awaiting recipient acknowledgement",
            unreadNotifications: "Unread in-app notifications",
          }).map(([key, label]) => (
            <article className="comm-notification" key={key}>
              <div>
                <strong>{label}</strong>
                <p>{data[key]}</p>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="comm-note">
        Recipient acknowledgement may remain pending while a user is offline.
      </p>
      <div className="comm-filters">
        <Link to="/admin/audit-logs">Communication audit history</Link>
        <Link to="/admin/notifications">Operational notifications</Link>
      </div>
    </div>
  );
}
