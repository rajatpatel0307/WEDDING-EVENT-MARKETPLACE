import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useVendorData,
  Loading,
  ErrorView,
  Badge,
} from "../components/WorkspaceUI";
import {
  vendorRequest,
  save,
  money,
  date,
  timestamp,
} from "../services/workspace.api";
import BookingChanges from "../../bookings/BookingChanges";
import BookingItemDetails from "../../bookings/BookingItemDetails";
export default function VendorBookingsPage() {
  const { id } = useParams(),
    [version, setVersion] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const r = useVendorData(`/bookings/${id}`, version);
  if (r.loading) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  const d = r.data,
    b = d.booking,
    event = JSON.parse(b.EventSnapshotJson || "{}");
  return (
    <>
      <Link to="/vendor/bookings/requests">← Booking requests</Link>
      <h1 className="my-4 text-2xl font-semibold">{b.BookingNumber}</h1>
      <section className="rounded-xl border bg-white p-5">
        <Badge>{b.BookingStatus}</Badge> <Badge>{b.PaymentStatus}</Badge>
        <p className="mt-3">
          {event.name} · {date(b.BookingDate)} · {event.city} · {event.guests}{" "}
          guests
        </p>
        <p>Requirements: {event.requirements || "None specified"}</p>
        <p className="my-3 text-xl font-semibold">{money(b.TotalAmount)}</p>
        {d.items.map((i) => (
          <div key={i.id}>
            <p>
              {i.name} × {Number(i.quantity)} · {money(i.total)}
            </p>
            <BookingItemDetails description={i.description} />
          </div>
        ))}
        {b.BookingStatus === "Pending" && (
          <form
            className="my-4 grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const body = Object.fromEntries(new FormData(e.currentTarget));
              try {
                await save(`/bookings/${id}/decision`, "POST", body);
                setVersion((v) => v + 1);
              } catch (err) {
                setError(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Decision
              <select name="action" className="ml-3 rounded border p-2">
                <option value="Accept">Accept</option>
                <option value="Reject">Reject</option>
              </select>
            </label>
            <label>
              Note (required for rejection)
              <textarea
                className="block w-full rounded border p-2"
                name="note"
                maxLength={1000}
              />
            </label>
            <button
              className="justify-self-start rounded-lg border px-4 py-2"
              disabled={busy}
            >
              Save decision
            </button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
      <BookingChanges
        id={id}
        data={d}
        role="Vendor"
        request={vendorRequest}
        saved={() => setVersion((v) => v + 1)}
      />
      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">Booking history</h2>
        <ol className="mt-4 grid gap-3">
          {d.history.map((h) => (
            <li key={h.id}>
              <strong>{h.action || h.status}</strong> · {h.role || "System"} ·{" "}
              {timestamp(h.createdAt)}
              <p>
                {h.previous} → {h.status}
              </p>
              <p>{h.note}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
