import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  Badge,
  ErrorView,
  Field,
  Heading,
  Loading,
  Modal,
  Panel,
  useVendorData,
} from "../components/WorkspaceUI";
import { date, save, today } from "../services/workspace.api";
export default function VendorCalendarPage({ filter = "" }) {
  const { notify } = useAuth(),
    [month, setMonth] = useState(today().slice(0, 7)),
    [version, setVersion] = useState(0),
    [selection, setSelection] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const calendar = useVendorData(`/calendar?month=${month}`, version),
    catalog = useVendorData("/catalog");
  const first = new Date(`${month}-01T12:00:00Z`),
    offset = (first.getUTCDay() + 6) % 7,
    last = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
  function move(step) {
    const next = new Date(`${month}-01T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + step);
    setMonth(next.toISOString().slice(0, 7));
  }
  function select(day) {
    setError("");
    setSelection({
      from: day,
      to: day,
      serviceId: null,
      startTime: "",
      endTime: "",
      status: filter === "blocked" ? "Blocked" : "Available",
      notes: "",
    });
  }
  const change = (key, value) =>
    setSelection((old) => ({ ...old, [key]: value }));
  return (
    <>
      <Heading
        title={
          filter === "blocked"
            ? "Block dates"
            : filter === "available"
              ? "Available dates"
              : "Your availability calendar"
        }
        description="Make space for celebrations. Keep your schedule clear and current."
      >
        <button
          className="vw-button vw-primary"
          onClick={() => select(`${month}-01`)}
        >
          <Plus size={15} />
          {filter === "blocked" ? "Block dates" : "Set availability"}
        </button>
      </Heading>
      <Panel
        title={first.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}
        description="Select a day to mark availability or block a date."
        action={
          <div className="vw-calendar-controls">
            <button
              className="vw-icon"
              aria-label="Previous month"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="vw-button"
              onClick={() => setMonth(today().slice(0, 7))}
            >
              Today
            </button>
            <button
              className="vw-icon"
              aria-label="Next month"
              onClick={() => move(1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        }
      >
        <div className="vw-calendar-legend">
          <span>
            <i className="available" />
            Available
          </span>
          <span>
            <i className="blocked" />
            Blocked
          </span>
          <span>
            <i className="booked" />
            Booked / accepted
          </span>
          <span>
            <i className="pending" />
            Pending request
          </span>
        </div>
        {calendar.error ? (
          <ErrorView error={calendar.error} retry={calendar.retry} />
        ) : calendar.loading ? (
          <Loading />
        ) : (
          <div className="vw-calendar">
            <div className="vw-calendar-week">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <strong key={day}>{day}</strong>
              ))}
            </div>
            <div className="vw-calendar-grid">
              {Array.from({ length: offset }, (_, i) => (
                <div key={`blank-${i}`} className="vw-calendar-blank" />
              ))}
              {Array.from({ length: last }, (_, i) => {
                const day = `${month}-${String(i + 1).padStart(2, "0")}`,
                  slots = calendar.data.slots.filter((s) => s.date === day),
                  bookings = calendar.data.bookings.filter(
                    (b) => b.date === day,
                  );
                return (
                  <button
                    key={day}
                    className={`vw-calendar-day ${day === today() ? "today" : ""}`}
                    onClick={() => select(day)}
                    aria-label={`${date(day)}; ${slots.length} availability entries; ${bookings.length} bookings`}
                  >
                    <strong>{i + 1}</strong>
                    <div>
                      {slots.slice(0, 2).map((slot) => (
                        <span
                          key={slot.id}
                          className={`vw-calendar-entry ${slot.status.toLowerCase()}`}
                        >
                          {slot.status}
                          {slot.startTime ? ` · ${slot.startTime}` : ""}
                        </span>
                      ))}
                      {bookings.slice(0, 2).map((booking) => (
                        <span
                          key={booking.id}
                          className={`vw-calendar-entry ${booking.status === "Pending" ? "pending" : "booked"}`}
                        >
                          {booking.status === "Pending" ? "Request" : "Booked"}{" "}
                          · {booking.number}
                        </span>
                      ))}
                      {slots.length + bookings.length > 4 && (
                        <small>
                          +{slots.length + bookings.length - 4} more
                        </small>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Panel>
      {calendar.data && (
        <Panel
          title={
            filter === "blocked"
              ? "Blocked dates this month"
              : filter === "available"
                ? "Available dates this month"
                : "Schedule details"
          }
          description="Accepted and confirmed bookings are protected when dates are blocked."
        >
          <div className="vw-schedule-list">
            {calendar.data.slots
              .filter(
                (s) =>
                  !filter ||
                  s.status === (filter === "blocked" ? "Blocked" : "Available"),
              )
              .map((slot) => (
                <article key={slot.id}>
                  <CalendarDays size={18} />
                  <div>
                    <strong>{date(slot.date)}</strong>
                    <span>
                      {slot.service || "All services"} ·{" "}
                      {slot.startTime
                        ? `${slot.startTime}–${slot.endTime}`
                        : "All day"}
                    </span>
                    {slot.notes && <small>{slot.notes}</small>}
                  </div>
                  <Badge>{slot.status}</Badge>
                  <button
                    className="vw-button"
                    onClick={() => {
                      setError("");
                      setSelection({
                        from: slot.date,
                        to: slot.date,
                        serviceId: slot.serviceId,
                        startTime: slot.startTime || "",
                        endTime: slot.endTime || "",
                        status:
                          slot.status === "Booked" ? "Available" : slot.status,
                        notes: slot.notes || "",
                      });
                    }}
                  >
                    Update
                  </button>
                </article>
              ))}
            {!calendar.data.slots.length && (
              <p className="vw-form-note">
                No availability entries for this month. Customers' booking
                requests still appear on the calendar.
              </p>
            )}
            {calendar.data.bookings.map((booking) => (
              <article key={booking.id}>
                <CalendarDays size={18} />
                <div>
                  <strong>{date(booking.date)}</strong>
                  <span>{booking.number}</span>
                </div>
                <Badge>{booking.status}</Badge>
                <Link
                  to={`/vendor/bookings/${booking.status === "Pending" ? "requests" : "active"}`}
                  className="vw-text-link"
                >
                  View booking
                </Link>
              </article>
            ))}
          </div>
        </Panel>
      )}
      {selection && (
        <Modal
          title={
            selection.status === "Blocked" ? "Block dates" : "Set availability"
          }
          close={() => setSelection(null)}
          busy={busy}
        >
          <form
            className="vw-form vw-modal-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const result = await save("/availability", "PUT", {
                  ...selection,
                  serviceId: selection.serviceId || null,
                  startTime: selection.startTime || null,
                  endTime: selection.endTime || null,
                });
                notify(result.message);
                setSelection(null);
                setVersion((v) => v + 1);
              } catch (err) {
                setError(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && (
              <p className="vw-form-error" role="alert">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <input
                  type="date"
                  value={selection.from}
                  required
                  onChange={(e) => change("from", e.target.value)}
                />
              </Field>
              <Field label="Until">
                <input
                  type="date"
                  min={selection.from}
                  value={selection.to}
                  required
                  onChange={(e) => change("to", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Service">
              <select
                value={selection.serviceId || ""}
                onChange={(e) => change("serviceId", e.target.value || null)}
              >
                <option value="">All services</option>
                {catalog.data?.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={selection.status}
                onChange={(e) => change("status", e.target.value)}
              >
                <option>Available</option>
                <option>Blocked</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start time (optional)">
                <input
                  type="time"
                  value={selection.startTime}
                  onChange={(e) => change("startTime", e.target.value)}
                />
              </Field>
              <Field label="End time (optional)">
                <input
                  type="time"
                  value={selection.endTime}
                  onChange={(e) => change("endTime", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                rows={3}
                value={selection.notes}
                maxLength={500}
                onChange={(e) => change("notes", e.target.value)}
              />
            </Field>
            <p className="vw-form-note">
              Choose up to 91 days. Existing entries for the selected service
              are updated; confirmed booking dates cannot be blocked.
            </p>
            <div className="vw-modal-actions">
              <button
                className="vw-button"
                type="button"
                disabled={busy}
                onClick={() => setSelection(null)}
              >
                Cancel
              </button>
              <button className="vw-button vw-primary" disabled={busy}>
                {busy ? "Saving…" : "Save availability"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
