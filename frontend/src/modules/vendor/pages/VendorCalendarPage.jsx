
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
          className="
            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
            vw-primary
          "
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
          <div className="flex items-center gap-[7px] vendor-phone:gap-[3px] vendor-phone:[&_.vw-button]:[padding:5px_8px] vendor-phone:[&_.vw-button]:text-[8px]">
            <button
              className="
                vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
              "
              aria-label="Previous month"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="
                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
              "
              onClick={() => setMonth(today().slice(0, 7))}
            >
              Today
            </button>
            <button
              className="
                vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
              "
              aria-label="Next month"
              onClick={() => move(1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        }
      >
        <div className="
          flex justify-end gap-[18px] flex-wrap [padding:0_22px_20px] [&_span]:flex [&_span]:items-center
          [&_span]:gap-[6px] [&_span]:text-[8px] [&_span]:text-[#a5b592] [&_i]:w-[6px] [&_i]:h-[6px]
          [&_i]:rounded-[50%] [&_.available]:[background:#95b773] [&_.blocked]:[background:#d49c85]
          [&_.booked]:[background:#6ca895] [&_.pending]:[background:#d1bd82] vendor-mobile:justify-start
          vendor-mobile:[padding:0_17px_15px] vendor-mobile:gap-[12px] vendor-phone:[&_span]:text-[7px]
        ">
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
            <div className="
              grid grid-cols-[repeat(7,_minmax(0,_1fr))] [border-top:1px_solid_#e6efdb]
              [border-bottom:1px_solid_#e6efdb] [background:#f9fcf4] [&_>_strong]:[padding:13px_5px]
              [&_>_strong]:text-[#a0b38a] [&_>_strong]:text-center [&_>_strong]:text-[9px] [&_>_strong]:font-medium
            ">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <strong key={day}>{day}</strong>
              ))}
            </div>
            <div className="grid grid-cols-[repeat(7,_minmax(0,_1fr))]">
              {Array.from({ length: offset }, (_, i) => (
                <div key={`blank-${i}`} className="
                  min-h-[115px] [border-top:0] [border-right:1px_solid_#edf2e4] [border-bottom:1px_solid_#edf2e4]
                  [border-left:0] [background:#fff] [padding:10px_8px] min-w-[0] text-left [vertical-align:top]
                  vendor-mobile:min-h-[85px] vendor-mobile:[padding:7px_3px] vendor-phone:min-h-[75px]
                " />
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
                    className={`min-h-[115px] [border-top:0] [border-right:1px_solid_#edf2e4] [border-bottom:1px_solid_#edf2e4]
                      [border-left:0] [background:#fff] [padding:10px_8px] min-w-[0] text-left
                      [vertical-align:top] flex flex-col gap-[8px] [&:hover]:[background:#f8fcf1]
                      [&_>_strong]:text-[11px] [&_>_strong]:text-[#a1b28d] [&_>_strong]:w-[23px]
                      [&_>_strong]:h-[23px] [&_>_strong]:grid [&_>_strong]:place-items-center
                      [&_>_strong]:font-normal [&.today_>_strong]:[background:#99b57b]
                      [&.today_>_strong]:text-[white] [&.today_>_strong]:rounded-[50%] [&_>_div]:grid
                      [&_>_div]:gap-[4px] [&_>_div]:w-[100%] [&_>_div]:min-w-[0] [&_small]:text-[7px]
                      [&_small]:text-[#a3b38f] vendor-mobile:min-h-[85px] vendor-mobile:[padding:7px_3px]
                      vendor-mobile:[&_>_strong]:text-[10px] vendor-phone:min-h-[75px] ${day === today() ? "today" : ""}`}
                    onClick={() => select(day)}
                    aria-label={`${date(day)}; ${slots.length} availability entries; ${bookings.length} bookings`}
                  >
                    <strong>{i + 1}</strong>
                    <div>
                      {slots.slice(0, 2).map((slot) => (
                        <span
                          key={slot.id}
                          className={`block [padding:3px_5px] rounded-[3px] text-[7px] whitespace-nowrap overflow-hidden text-ellipsis
                            [&.available]:[background:#edf6e3] [&.available]:text-[#94b16e]
                            [&.blocked]:[background:#fff2e9] [&.blocked]:text-[#c99c81]
                            [&.pending]:[background:#fcf6e7] [&.pending]:text-[#bba66c]
                            [&.booked]:[background:#eaf5ef] [&.booked]:text-[#81aa93]
                            vendor-mobile:text-[6px] vendor-mobile:p-[2px] ${slot.status.toLowerCase()}`}
                        >
                          {slot.status}
                          {slot.startTime ? ` · ${slot.startTime}` : ""}
                        </span>
                      ))}
                      {bookings.slice(0, 2).map((booking) => (
                        <span
                          key={booking.id}
                          className={`block [padding:3px_5px] rounded-[3px] text-[7px] whitespace-nowrap overflow-hidden text-ellipsis
                            [&.available]:[background:#edf6e3] [&.available]:text-[#94b16e]
                            [&.blocked]:[background:#fff2e9] [&.blocked]:text-[#c99c81]
                            [&.pending]:[background:#fcf6e7] [&.pending]:text-[#bba66c]
                            [&.booked]:[background:#eaf5ef] [&.booked]:text-[#81aa93]
                            vendor-mobile:text-[6px] vendor-mobile:p-[2px] ${booking.status === "Pending" ? "pending" : "booked"}`}
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
          <div className="
            grid [padding:0_22px_22px] [&_>_article]:flex [&_>_article]:items-center [&_>_article]:gap-[15px]
            [&_>_article]:[padding:15px_0] [&_>_article]:[border-top:1px_solid_#edf3e3]
            [&_>_article_>_svg]:text-[#a7bc8c] [&_>_article_>_div]:[flex:1] [&_>_article_>_div]:min-w-[0]
            [&_strong]:block [&_strong]:text-[11px] [&_strong]:font-medium [&_strong]:text-[#93aa7a]
            [&_span:not(.vw-badge)]:block [&_span:not(.vw-badge)]:text-[9px]
            [&_span:not(.vw-badge)]:text-[#b1c29c] [&_small]:block [&_small]:text-[#b1c29c] [&_small]:text-[8px]
            [&_small]:[overflow-wrap:anywhere] vendor-phone:[&_>_article]:flex-wrap
            vendor-phone:[&_>_article]:gap-[9px]
          ">
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
                    className="
                      vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                      [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                      rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                      font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                      [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                      [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                      [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                      [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                    "
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
              <p className="
                [background:#f4f7ee] [border-top:1px_solid_#e8eedc] [border-right:1px_solid_#e8eedc]
                [border-bottom:1px_solid_#e8eedc] [border-left:1px_solid_#e8eedc] text-[#95a581]! [padding:12px_15px]
                rounded-[6px] text-[10px]! leading-[1.8]
              ">
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
                  className="inline-flex items-center gap-[6px] text-[#799464] text-[10px] [border-top:0] [border-right:0] [border-bottom:0] [border-left:0] [background:none] p-[0]"
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
            className="
              min-w-[0] [&_fieldset]:[border-top:0] [&_fieldset]:[border-right:0] [&_fieldset]:[border-bottom:0]
              [&_fieldset]:[border-left:0] [&_fieldset]:p-[0] [&_fieldset]:m-[0] [&_fieldset]:min-w-[0]
              [&_>_.vw-panel_+_.vw-panel]:mt-[22px] grid gap-[19px] [padding:22px_24px]
            "
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
              <p className="
                vw-form-error [background:#fff4ee] [border-top:1px_solid_#f0ddcf] [border-right:1px_solid_#f0ddcf]
                [border-bottom:1px_solid_#f0ddcf] [border-left:1px_solid_#f0ddcf] text-[#b6836e]! [padding:12px_15px]
                rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]
              " role="alert">
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
            <p className="
              [background:#f4f7ee] [border-top:1px_solid_#e8eedc] [border-right:1px_solid_#e8eedc]
              [border-bottom:1px_solid_#e8eedc] [border-left:1px_solid_#e8eedc] text-[#95a581]! [padding:12px_15px]
              rounded-[6px] text-[10px]! leading-[1.8]
            ">
              Choose up to 91 days. Existing entries for the selected service
              are updated; confirmed booking dates cannot be blocked.
            </p>
            <div className="flex justify-end gap-[9px] pt-[7px]">
              <button
                className="
                  vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                  [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                  rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                  font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                  [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                  [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                  [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                  [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                "
                type="button"
                disabled={busy}
                onClick={() => setSelection(null)}
              >
                Cancel
              </button>
              <button className="
                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                vw-primary
              " disabled={busy}>
                {busy ? "Saving…" : "Save availability"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
