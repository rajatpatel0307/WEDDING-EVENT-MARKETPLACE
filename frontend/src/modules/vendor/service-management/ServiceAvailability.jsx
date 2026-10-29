import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CalendarOff,
  Trash2,
} from "lucide-react";
import {
  Heading,
  Panel,
  Field,
  Loading,
  ErrorView,
  useVendorData,
} from "../components/WorkspaceUI";
import { save, today } from "../services/workspace.api";
import { Notice } from "./shared";
export default function ServiceAvailability() {
  const { id } = useParams(),
    [month, setMonth] = useState(today().slice(0, 7)),
    [version, setVersion] = useState(0),
    state = useVendorData(`/services/${id}/availability`, version),
    parent = useVendorData(`/services/${id}`),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState({
      from: today(),
      to: today(),
      status: "Blocked",
      startTime: null,
      endTime: null,
      notes: "",
    });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const year = Number(month.slice(0, 4)),
    mo = Number(month.slice(5, 7));
  const days = new Date(Date.UTC(year, mo, 0)).getUTCDate(),
    offset = new Date(Date.UTC(year, mo - 1, 1)).getUTCDay();
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      const result = await fn();
      setNotice(result.message);
      setVersion((v) => v + 1);
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const shift = (by) => {
    const d = new Date(Date.UTC(year, mo - 1 + by, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  if (state.loading || parent.loading) return <Loading />;
  if (state.error || parent.error)
    return (
      <ErrorView
        error={state.error || parent.error}
        retry={() => {
          state.retry();
          parent.retry();
        }}
      />
    );
  const rows = state.data,
    avail = parent.data.availability;
  return (
    <div className="sm-page">
      <Link to={`/vendor/services/${id}`} className="sm-back">
        <ArrowLeft size={15} />
        Back to service
      </Link>
      <Heading title="Service Availability" description={parent.data.name} />
      <Notice message={notice} />
      <div className="sm-availability-layout">
        <Panel
          title="Your service calendar"
          description={`${avail?.start || "09:00"}–${avail?.end || "20:00"} · ${avail?.noticeHours ?? 24} hours’ minimum notice`}
        >
          <div className="sm-calendar">
            <div className="sm-calendar-title">
              <button aria-label="Previous month" onClick={() => shift(-1)}>
                <ChevronLeft size={20} />
              </button>
              <h3>
                {new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </h3>
              <button aria-label="Next month" onClick={() => shift(1)}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="sm-calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <strong key={d}>{d}</strong>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`blank${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const day = `${month}-${String(i + 1).padStart(2, "0")}`,
                  r = rows.find((x) => String(x.date).slice(0, 10) === day),
                  weekday = new Date(`${day}T12:00:00Z`).getUTCDay(),
                  status =
                    r?.status ||
                    (avail?.days?.includes(weekday) ? "Available" : "Closed");
                return (
                  <button
                    key={day}
                    disabled={r?.status === "Booked"}
                    className={`sm-day sm-day-${status.toLowerCase()} ${form.from === day ? "selected" : ""}`}
                    onClick={() => {
                      setForm({
                        from: day,
                        to: day,
                        status:
                          r?.status === "Available" ? "Available" : "Blocked",
                        startTime: r?.startTime
                          ? String(r.startTime).match(
                              /(?:T|^)(\d{2}:\d{2})/,
                            )?.[1] || null
                          : null,
                        endTime: r?.endTime
                          ? String(r.endTime).match(
                              /(?:T|^)(\d{2}:\d{2})/,
                            )?.[1] || null
                          : null,
                        notes: r?.notes || "",
                      });
                      setEditing(r?.id || null);
                    }}
                  >
                    <b>{i + 1}</b>
                    <small>{status}</small>
                  </button>
                );
              })}
            </div>
            <div className="sm-calendar-legend">
              Green: available · Rose: blocked · Gray: closed · Booked dates are
              protected
            </div>
          </div>
        </Panel>
        <Panel
          title={editing ? "Edit date override" : "Block a date or set timing"}
        >
          <form
            className="sm-form-body"
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                save(
                  `/services/${id}/availability${editing ? `/${editing}` : ""}`,
                  editing ? "PUT" : "POST",
                  form,
                ),
              );
            }}
          >
            <div className="sm-form-grid">
              <Field label="From">
                <input
                  type="date"
                  required
                  value={form.from}
                  onChange={(e) => set("from", e.target.value)}
                />
              </Field>
              <Field label="To">
                <input
                  type="date"
                  required
                  min={form.from}
                  value={form.to}
                  onChange={(e) => set("to", e.target.value)}
                />
              </Field>
              <Field label="Date type">
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="Blocked">Blocked / Holiday</option>
                  <option value="Available">Available / Custom Timing</option>
                </select>
              </Field>
              <Field label="Start time">
                <input
                  type="time"
                  value={form.startTime || ""}
                  onChange={(e) => set("startTime", e.target.value || null)}
                />
              </Field>
              <Field label="End time">
                <input
                  type="time"
                  value={form.endTime || ""}
                  onChange={(e) => set("endTime", e.target.value || null)}
                />
              </Field>
              <Field label="Notes">
                <textarea
                  rows={3}
                  placeholder="e.g. Diwali holiday"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
            </div>
            {error && (
              <p className="sm-error" role="alert">
                {error}
              </p>
            )}
            <button className="vw-button vw-primary mt-5" disabled={busy}>
              <CalendarOff size={15} />
              {busy ? "Saving…" : "Save Availability"}
            </button>
            {editing && (
              <button
                type="button"
                className="vw-button mt-5"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Remove this override and return to regular working hours?",
                    )
                  )
                    run(() =>
                      save(
                        `/services/${id}/availability/${editing}`,
                        "DELETE",
                        {},
                      ),
                    );
                }}
              >
                <Trash2 size={15} />
                Unblock / Remove Override
              </button>
            )}
            <Link
              className="sm-back mt-5"
              to={`/vendor/services/${id}/edit?step=6`}
            >
              Edit weekly schedule & booking periods
            </Link>
          </form>
        </Panel>
      </div>
    </div>
  );
}
