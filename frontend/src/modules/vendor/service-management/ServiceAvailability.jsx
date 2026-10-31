
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
    <div className="
      [--sm-accent:#2d604b] [--sm-border:#e2e8df] max-w-[1700px] m-[auto]
      [&_button:disabled]:opacity-[0.45] [&_button:disabled]:cursor-not-allowed
      [&_:focus-visible]:[outline:2px_solid_#397455] [&_:focus-visible]:[outline-offset:3px]
    ">
      <Link to={`/vendor/services/${id}`} className="inline-flex items-center gap-[7px] text-[#5d7566] mb-[18px] text-[12px]">
        <ArrowLeft size={15} />
        Back to service
      </Link>
      <Heading title="Service Availability" description={parent.data.name} />
      <Notice message={notice} />
      <div className="grid grid-cols-[1.4fr_1fr] gap-[20px] [align-items:start] service-tablet:grid-cols-[1fr]">
        <Panel
          title="Your service calendar"
          description={`${avail?.start || "09:00"}–${avail?.end || "20:00"} · ${avail?.noticeHours ?? 24} hours’ minimum notice`}
        >
          <div className="p-[20px] service-mobile:p-[12px]">
            <div className="
              flex justify-between items-center mb-[20px] [&_button]:[background:none] [&_button]:[border-top:0]
              [&_button]:[border-right:0] [&_button]:[border-bottom:0] [&_button]:[border-left:0]
              [&_button]:text-[#759167] service-mobile:[&_h3]:text-[15px]
            ">
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
            <div className="
              grid grid-cols-[repeat(7,_minmax(0,_1fr))] gap-[6px] [&_>_strong]:text-center
              [&_>_strong]:text-[10px] [&_>_strong]:text-[#99a98c] [&_>_strong]:font-medium
              [&_>_strong]:[padding:8px_0] service-mobile:gap-[3px]
            ">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <strong key={d}>{d}</strong>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`blank${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const day = `${month}-${String(i + 1).padStart(2, "0")}`,
                  r = rows.find((x) => String(x.date).slice(0, 10) === day),
                  status = r?.status || "Available";
                return (
                  <button
                    key={day}
                    disabled={r?.status === "Booked"}
                    className={`[border-top:1px_solid_#e5ebde] [border-right:1px_solid_#e5ebde] [border-bottom:1px_solid_#e5ebde]
                      [border-left:1px_solid_#e5ebde] [background:#f3f8ee] min-h-[72px] rounded-[7px]
                      [padding:10px_5px] text-[#6f8d5b] text-left [&_small]:block [&_small]:text-[8px]
                      [&_small]:overflow-hidden [&.selected]:[outline:2px_solid_#578345]
                      service-mobile:min-h-[55px] service-mobile:[padding:7px_3px]
                      service-mobile:[&_small]:text-[7px] [&.sm-day-blocked]:[background:#fcf0eb]
                      [&.sm-day-blocked]:text-[#b98c7d] [&.sm-day-blocked]:[border-color:#f0ddd5]
                      [&.sm-day-booked]:[background:#f2edf8] [&.sm-day-booked]:text-[#9a83af]
                      [&.sm-day-closed]:[background:#f6f7f4] [&.sm-day-closed]:text-[#adb5a2] sm-day-${status.toLowerCase()} ${form.from === day ? "selected" : ""}`}
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
            <div className="text-[9px] text-[#98a48d] mt-[18px]">
              Green: available · Rose: blocked · Gray: closed · Booked dates are
              protected
            </div>
          </div>
        </Panel>
        <Panel
          title={editing ? "Edit date override" : "Block a date or set timing"}
        >
          <form
            className="p-[25px] service-mobile:p-[18px]"
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
            <div className="
              grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_input]:w-[100%] [&_input]:rounded-[7px]
              [&_input]:[padding:10px_12px] [&_input]:[background:#fff] [&_input]:min-h-[40px] [&_select]:w-[100%]
              [&_select]:rounded-[7px] [&_select]:[padding:10px_12px] [&_select]:[background:#fff]
              [&_select]:min-h-[40px] [&_textarea]:w-[100%] [&_textarea]:rounded-[7px]
              [&_textarea]:[padding:10px_12px] [&_textarea]:[background:#fff] [&_textarea]:min-h-[40px]
              [&_textarea]:resize-y [&_.vw-field]:m-[0] service-mobile:grid-cols-[1fr] service-mobile:gap-[18px]
            ">
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
              <p className="rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fff0ed] text-[#ab4b3c]" role="alert">
                {error}
              </p>
            )}
            <button className="
              vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
              [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
              rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
              font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
              [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
              [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
              [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
              [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
              vw-primary mt-5
            " disabled={busy}>
              <CalendarOff size={15} />
              {busy ? "Saving…" : "Save Availability"}
            </button>
            {editing && (
              <button
                type="button"
                className="
                  vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                  [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                  rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                  font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                  [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                  [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                  [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                  [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                  mt-5
                "
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
              className="inline-flex items-center gap-[7px] text-[#5d7566] mb-[18px] text-[12px] mt-5"
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
