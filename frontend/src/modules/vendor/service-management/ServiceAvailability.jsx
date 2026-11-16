import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  Field,
  Loading,
  ErrorView,
  useVendorData,
} from "../components/WorkspaceUI";
import { date, save, today } from "../services/workspace.api";
import { Notice } from "./shared";
import {
  availabilityPayload,
  clockValue,
  dateKey,
  dateSelection,
  monthDays,
  selectedDays,
  validateAvailability,
} from "./availability-calendar";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const statuses = ["Available", "Blocked", "Booked", "Closed"];
const displayDate = (value) =>
  value ? date(`${value}T12:00:00Z`) : "Choose a date";

export default function ServiceAvailability() {
  const { id } = useParams();
  const localToday = today();
  const [month, setMonth] = useState(() => localToday.slice(0, 7));
  const [version, setVersion] = useState(0);
  const state = useVendorData(`/services/${id}/availability`, version);
  const parent = useVendorData(`/services/${id}`);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => localToday);
  const [selection, setSelection] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const errorRef = useRef(null);
  const fromRef = useRef(null);

  if ((state.loading && !state.data) || (parent.loading && !parent.data))
    return <Loading />;
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

  const rows = state.data || [];
  const service = parent.data;
  const avail = service.availability;
  const form =
    selection ||
    dateSelection(
      selectedDay,
      rows.find((row) => dateKey(row.date) === selectedDay),
    );
  const editing = form.overrideId;
  const pending = busy || state.loading;
  const calendar = monthDays(month, rows, localToday);
  const rangeDays = selectedDays(form);
  const bookedRange = rows.some(
    (row) =>
      row.status === "Booked" &&
      dateKey(row.date) >= form.from &&
      dateKey(row.date) <= form.to,
  );
  const monthLabel = new Date(`${month}-01T12:00:00Z`).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
  const monthlyRows = rows
    .filter((row) => dateKey(row.date).startsWith(month))
    .sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)));
  const upcoming = calendar.days.filter((day) => !day.past);
  const blockedCount = upcoming.filter(
    (day) => day.status === "Blocked",
  ).length;
  const availableCount = upcoming.filter(
    (day) => day.status === "Available",
  ).length;
  const customCount = monthlyRows.filter(
    (row) => row.status === "Available" && (row.startTime || row.endTime),
  ).length;
  const heading = editing ? "Edit date override" : "Set your availability";

  const set = (key, value) => {
    setError("");
    setNotice("");
    setSelection((previous) => {
      const next = { ...(previous || form), [key]: value };
      if (key === "from" && (!next.to || next.to < value)) next.to = value;
      if (key === "status" && value === "Blocked") {
        next.startTime = null;
        next.endTime = null;
      }
      return next;
    });
  };
  const chooseDay = (day, row) => {
    setError("");
    setNotice("");
    setSelectedDay(day);
    setSelection(dateSelection(day, row));
  };
  const reset = () => {
    setError("");
    setNotice("");
    setSelection({ ...dateSelection(selectedDay), overrideId: null });
  };
  const shift = (by) => {
    const [year, index] = month.split("-").map(Number);
    const next = new Date(Date.UTC(year, index - 1 + by, 1));
    setMonth(next.toISOString().slice(0, 7));
    setShowAll(false);
  };
  const run = async (operation, nextDay = form.from) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await operation();
      setNotice(result.message);
      setSelectedDay(nextDay);
      setSelection(null);
      setVersion((value) => value + 1);
    } catch (failure) {
      setError(failure.message);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  };
  const submit = (event) => {
    event.preventDefault();
    const issue = validateAvailability(form, rows, localToday);
    if (issue) {
      setError(issue);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    run(() =>
      save(
        `/services/${id}/availability${editing ? `/${editing}` : ""}`,
        editing ? "PUT" : "POST",
        availabilityPayload(form),
      ),
    );
  };

  return (
    <div className="service-availability [--sa-ink:#263f33] [--sa-muted:#6d7b6b] [--sa-green:#2c6048] [--sa-border:#e0e7dc] w-full max-w-[1700px] m-auto text-[color:var(--sa-ink)] [&_:is(button,_a,_input,_textarea):focus-visible]:outline-[2px] [&_:is(button,_a,_input,_textarea):focus-visible]:outline-[#397455] [&_:is(button,_a,_input,_textarea):focus-visible]:outline-offset-[3px] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_:where(.sa-status-available)]:[--sa-state-bg:#f3f7ed] [&_:where(.sa-status-available)]:[--sa-state-border:#e1e9d8] [&_:where(.sa-status-available)]:[--sa-state-ink:#5b7d43] [&_:where(.sa-status-available)]:text-[color:var(--sa-state-ink)] [&_:where(.sa-status-blocked)]:[--sa-state-bg:#fcf1ec] [&_:where(.sa-status-blocked)]:[--sa-state-border:#f0ded4] [&_:where(.sa-status-blocked)]:[--sa-state-ink:#a16650] [&_:where(.sa-status-blocked)]:text-[color:var(--sa-state-ink)] [&_:where(.sa-status-booked)]:[--sa-state-bg:#f2eff8] [&_:where(.sa-status-booked)]:[--sa-state-border:#e5ddf0] [&_:where(.sa-status-booked)]:[--sa-state-ink:#8a71a7] [&_:where(.sa-status-booked)]:text-[color:var(--sa-state-ink)] [&_:where(.sa-status-closed)]:[--sa-state-bg:#f4f5f2] [&_:where(.sa-status-closed)]:[--sa-state-border:#e7eae2] [&_:where(.sa-status-closed)]:[--sa-state-ink:#83907a] [&_:where(.sa-status-closed)]:text-[color:var(--sa-state-ink)] [&_.sa-form_.vw-field]:text-[11px] [&_.sa-form_.vw-field]:text-[#58714c] [&_.sa-form.service-form_:is(input:not([type='radio']),_textarea)]:min-h-[43px] [&_.sa-form.service-form_:is(input:not([type='radio']),_textarea)]:py-[10px] [&_.sa-form.service-form_:is(input:not([type='radio']),_textarea)]:px-[11px] [&_.sa-form.service-form_:is(input:not([type='radio']),_textarea)]:border-[#ccd7c4] [&_.sa-form.service-form_:is(input:not([type='radio']),_textarea)]:rounded-[7px] [&_.sa-form.service-form_:is(input:not([type='radio']),_textarea)]:text-[12px] [&_.sa-form.service-form_:is(input:not([type='radio']),_textarea)]:text-[#405e35] [&_.sa-form.service-form_:is(input:not([type='radio']),_textarea)]:bg-white [&_.sa-form.service-form_:is(input:not([type='radio']),_textarea)]:shadow-[0_1px_2px_#203d2103] [&_.sa-form.service-form_textarea]:min-h-[86px] [&_.sa-form.service-form_textarea::placeholder]:text-[#8c9880] [&_.sa-form.service-form_textarea::placeholder]:text-[11px] [&_.sa-form.service-form_input:not([type='radio']):hover:enabled]:border-[#91a67f] [&_.sa-form.service-form_textarea:hover:enabled]:border-[#91a67f]">
      <nav
        className="sa-breadcrumb flex items-center gap-[13px] mb-[25px] text-[#71806e] text-[12px] [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[8px] [&_a]:text-[#486b54] [&_a:hover]:text-[#1f4e35] [&_>_span:first-of-type]:text-[#b3bead]"
        aria-label="Breadcrumb"
      >
        <Link to={`/vendor/services/${id}`}>
          <ArrowLeft size={15} /> Back to service
        </Link>
        <span aria-hidden="true">/</span>
        <span>Availability</span>
      </nav>
      <header className="sa-page-header flex items-center justify-between gap-[25px] mb-[26px] [&_h1]:mt-[7px] [&_h1]:mx-0 [&_h1]:mb-[9px] [&_h1]:text-[color:var(--sa-ink)] [&_h1]:font-serif [&_h1]:text-[clamp(30px,_3vw,_38px)] [&_h1]:font-normal [&_h1]:leading-[1.2] [&_h1]:tracking-[-1.1px] [&_p]:m-0 [&_p]:text-[color:var(--sa-muted)] [&_p]:text-[12px] [&_p]:leading-[1.7] max-[620.001px]:items-start max-[620.001px]:flex-col max-[620.001px]:gap-[19px] max-[620.001px]:mb-[21px] max-[620.001px]:[&_h1]:text-[32px] max-[620.001px]:[&_p]:text-[11px]">
        <div>
          <span className="sa-eyebrow text-[#73836c] text-[9px] tracking-[1.8px] font-semibold">
            SERVICE MANAGEMENT
          </span>
          <h1>Service availability</h1>
          <p>
            Make room for every celebration. Keep your dates and hours up to
            date.
          </p>
        </div>
        <Link
          className="sa-service-link flex items-center gap-[12px] min-w-0 max-w-[340px] py-[13px] px-[16px] border border-[color:var(--sa-border)] rounded-[11px] bg-white [&_>_span:nth-child(2)]:min-w-0 [&_small]:block [&_small]:mb-[3px] [&_small]:text-[#798572] [&_small]:text-[8px] [&_small]:tracking-[1px] [&_strong]:block [&_strong]:text-[#3c5842] [&_strong]:font-serif [&_strong]:text-[17px] [&_strong]:font-normal [&_strong]:wrap-anywhere [&_strong]:leading-[1.3] [&_>_svg]:ml-[15px] [&_>_svg]:text-[#74876c] [&_>_svg]:shrink-0 [&:hover]:bg-[#f8faf5] [&:hover]:border-[#bccbb5] max-[620.001px]:w-full max-[620.001px]:max-w-none max-[620.001px]:py-[11px] max-[620.001px]:px-[14px] max-[620.001px]:[&_>_svg]:ml-auto max-[620.001px]:[&_strong]:text-[16px]"
          to={`/vendor/services/${id}`}
        >
          <span className="sa-icon-tile grid w-[37px] h-[37px] place-items-center shrink-0 rounded-[10px] text-[#6a845e] bg-[#f0f4eb]">
            <CalendarDays size={19} />
          </span>
          <span>
            <small>MANAGING AVAILABILITY FOR</small>
            <strong>{service.name}</strong>
          </span>
          <ArrowUpRight size={16} />
        </Link>
      </header>
      <Notice message={notice} />

      <div
        className="sa-schedule-strip flex items-center gap-[30px] py-[17px] px-[22px] mb-[25px] border border-[color:var(--sa-border)] rounded-[11px] bg-[#f1f5ed] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[12px] [&_>_div]:pr-[28px] [&_>_div]:border-r [&_>_div]:border-r-[#dce4d5] [&_>_div_>_svg]:text-[#7a8f6c] [&_>_div_>_svg]:shrink-0 [&_small]:block [&_small]:mb-[3px] [&_small]:text-[#6e7d65] [&_small]:text-[10px] [&_strong]:block [&_strong]:text-[#405d3f] [&_strong]:text-[13px] [&_strong]:font-medium [&_strong]:tabular-nums [&_em]:ml-[7px] [&_em]:text-[9px] [&_em]:not-italic [&_em]:font-normal [&_em]:text-[#738369] [&_>_a]:inline-flex [&_>_a]:items-center [&_>_a]:gap-[7px] [&_>_a]:ml-auto [&_>_a]:text-[#4e7049] [&_>_a]:text-[11px] [&_>_a:hover]:underline [&_>_a:hover]:underline-offset-[4px] max-[1200.001px]:gap-[18px] max-[1200.001px]:[&_>_div]:pr-[18px] max-[1000.001px]:flex-wrap max-[1000.001px]:gap-y-[15px] max-[1000.001px]:gap-x-[22px] max-[1000.001px]:[&_>_a]:ml-0 max-[620.001px]:p-[15px] max-[620.001px]:gap-[16px] max-[620.001px]:mb-[20px] max-[620.001px]:[&_>_div]:w-[calc(50%_-_8px)] max-[620.001px]:[&_>_div]:gap-[8px] max-[620.001px]:[&_>_div]:pr-0 max-[620.001px]:[&_>_div]:border-0 max-[620.001px]:[&_small]:text-[9px] max-[620.001px]:[&_strong]:text-[12px] max-[620.001px]:[&_>_a]:w-full max-[620.001px]:[&_>_a]:pt-[12px] max-[620.001px]:[&_>_a]:border-t max-[620.001px]:[&_>_a]:border-t-[#dee6d6] max-[620.001px]:[&_>_a]:text-[10px]"
        aria-label="Regular service schedule"
      >
        <div>
          <Clock3 size={18} />
          <span>
            <small>Regular service hours</small>
            <strong>
              {avail?.start && avail?.end
                ? `${avail.start} – ${avail.end}`
                : "Not set"}
              <em>IST</em>
            </strong>
          </span>
        </div>
        <div>
          <ShieldCheck size={18} />
          <span>
            <small>Minimum booking notice</small>
            <strong>
              {avail?.noticeHours != null
                ? `${avail.noticeHours} hours`
                : "Not set"}
            </strong>
          </span>
        </div>
        {service.actions?.edit ? (
          <Link to={`/vendor/services/${id}/edit?step=6`}>
            <SlidersHorizontal size={16} /> Edit regular schedule{" "}
            <ArrowUpRight size={14} />
          </Link>
        ) : (
          <span className="sa-schedule-locked inline-flex items-center gap-[7px] ml-auto text-[#74816d] text-[11px] max-[1000.001px]:ml-0 max-[620.001px]:w-full max-[620.001px]:pt-[12px] max-[620.001px]:border-t max-[620.001px]:border-t-[#dee6d6] max-[620.001px]:text-[10px]">
            <LockKeyhole size={14} /> Regular schedule editing unavailable
          </span>
        )}
      </div>

      <div className="sa-workspace grid grid-cols-[minmax(0,_1.55fr)_minmax(340px,_1fr)] items-start gap-[24px] min-[1550px]:grid-cols-[minmax(0,_1.6fr)_minmax(390px,_1fr)] min-[1550px]:gap-[27px] max-[1200.001px]:grid-cols-[minmax(0,_1fr)_330px] max-[1200.001px]:gap-[18px] max-[1000.001px]:grid-cols-[minmax(0,_1fr)]">
        <div className="sa-calendar-column grid gap-[22px] min-w-0 max-[1000.001px]:contents">
          <section
            className="sa-card min-w-0 border border-[color:var(--sa-border)] rounded-[13px] bg-white overflow-hidden sa-calendar-card max-[1000.001px]:[order:0]"
            aria-labelledby="service-calendar-heading"
            aria-busy={state.loading}
          >
            <div className="sa-card-header flex items-start justify-between gap-[15px] pt-[23px] px-[24px] pb-[18px] [&_h2]:m-0 [&_h2]:text-[color:var(--sa-ink)] [&_h2]:font-serif [&_h2]:text-[22px] [&_h2]:font-normal [&_h2]:tracking-[-0.4px] [&_h2]:leading-[1.35] [&_p]:mt-[6px] [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[color:var(--sa-muted)] [&_p]:text-[11px] [&_p]:leading-[1.7] max-[1200.001px]:pt-[20px] max-[1200.001px]:px-[18px] max-[1200.001px]:pb-[16px] max-[1200.001px]:[&_h2]:text-[20px] max-[620.001px]:pt-[18px] max-[620.001px]:px-[15px] max-[620.001px]:pb-[16px] max-[620.001px]:gap-[10px] max-[620.001px]:[&_h2]:text-[20px] max-[620.001px]:[&_p]:text-[10px]">
              <div>
                <h2 id="service-calendar-heading">Your service calendar</h2>
                <p>Select a date to block it or set custom hours.</p>
              </div>
              <span className="sa-timezone inline-flex items-center gap-[5px] shrink-0 py-[5px] px-[8px] border border-[#e5eadd] rounded-[20px] text-[#718269] bg-[#f8faf4] text-[9px] max-[1200.001px]:hidden max-[1000.001px]:inline-flex max-[620.001px]:text-[8px] max-[620.001px]:py-[4px] max-[620.001px]:px-[6px]">
                <Clock3 size={12} /> India time
              </span>
            </div>
            <div className="sa-calendar-toolbar flex items-center justify-between gap-[12px] py-[17px] px-0 my-0 mx-[24px] border-t border-t-[#e9ede4] max-[1200.001px]:my-0 max-[1200.001px]:mx-[18px] max-[620.001px]:my-0 max-[620.001px]:mx-[15px] max-[620.001px]:py-[14px] max-[620.001px]:px-0">
              <div className="sa-month-navigation flex items-center gap-[14px] [&_h3]:min-w-[155px] [&_h3]:m-0 [&_h3]:text-center [&_h3]:text-[17px] [&_h3]:font-medium [&_h3]:tracking-[-0.3px] max-[1200.001px]:gap-[7px] max-[1200.001px]:[&_h3]:min-w-[135px] max-[1200.001px]:[&_h3]:text-[15px] max-[370.001px]:gap-[5px] max-[370.001px]:[&_h3]:min-w-[118px] max-[370.001px]:[&_h3]:text-[14px]">
                <button
                  type="button"
                  className="sa-icon-button grid place-items-center w-[31px] h-[31px] p-0 border border-[#e0e7da] rounded-[7px] bg-white text-[#65815a] [&:hover]:bg-[#f1f6ec] [&:hover]:border-[#b7c9ac]"
                  aria-label="Previous month"
                  onClick={() => shift(-1)}
                  disabled={pending}
                >
                  <ChevronLeft size={18} />
                </button>
                <h3 aria-live="polite">{monthLabel}</h3>
                <button
                  type="button"
                  className="sa-icon-button grid place-items-center w-[31px] h-[31px] p-0 border border-[#e0e7da] rounded-[7px] bg-white text-[#65815a] [&:hover]:bg-[#f1f6ec] [&:hover]:border-[#b7c9ac]"
                  aria-label="Next month"
                  onClick={() => shift(1)}
                  disabled={pending}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                type="button"
                className="sa-today-button min-h-[31px] py-[6px] px-[13px] border border-[#dce6d4] rounded-[6px] bg-[#f6f9f2] text-[#4a7042] text-[11px] font-medium [&:hover]:bg-[#eaf3e1]"
                disabled={pending}
                onClick={() => {
                  setMonth(localToday.slice(0, 7));
                  chooseDay(
                    localToday,
                    rows.find((row) => dateKey(row.date) === localToday),
                  );
                  setShowAll(false);
                }}
              >
                Today
              </button>
            </div>
            <div
              className="sa-calendar-legend flex items-center flex-wrap gap-[17px] mt-0 mx-[24px] mb-[15px] text-[#6e7e67] text-[10px] [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[6px] [&_.sa-legend-today]:ml-auto max-[1200.001px]:mr-[18px] max-[1200.001px]:ml-[18px] max-[1200.001px]:gap-[11px] max-[620.001px]:mt-0 max-[620.001px]:mx-[15px] max-[620.001px]:mb-[15px] max-[620.001px]:text-[9px] max-[620.001px]:gap-[12px] max-[370.001px]:gap-[8px] max-[370.001px]:text-[8px]"
              aria-label="Calendar status legend"
            >
              {statuses.map((status) => (
                <span key={status}>
                  <i
                    className={`sa-dot inline-block w-[5px] h-[5px] shrink-0 rounded-[50%] bg-current sa-status-${status.toLowerCase()}`}
                  />
                  {status}
                </span>
              ))}
              <span className="sa-legend-today [&_>_i]:w-[7px] [&_>_i]:h-[7px] [&_>_i]:border-[1.5px] [&_>_i]:border-[#4a7440] [&_>_i]:rounded-[50%]">
                <i />
                Today
              </span>
            </div>
            <div
              className="sa-calendar-grid grid grid-cols-[repeat(7,_minmax(0,_1fr))] gap-[7px] py-0 px-[24px] min-[1550px]:gap-[9px] max-[1200.001px]:py-0 max-[1200.001px]:px-[18px] max-[1200.001px]:gap-[5px] max-[620.001px]:py-0 max-[620.001px]:px-[12px] max-[620.001px]:gap-[4px]"
              aria-label={`${monthLabel} dates`}
            >
              {weekdays.map((day) => (
                <span
                  className="sa-weekday pt-[3px] px-0 pb-[8px] text-[#7a886f] text-center text-[10px] font-medium max-[620.001px]:pb-[6px] max-[620.001px]:text-[9px]"
                  key={day}
                >
                  {day}
                </span>
              ))}
              {Array.from({ length: calendar.offset }, (_, index) => (
                <span
                  className="sa-empty-day"
                  key={`blank-${index}`}
                  aria-hidden="true"
                />
              ))}
              {calendar.days.map((day) => {
                const selected = day.date >= form.from && day.date <= form.to;
                return (
                  <button
                    type="button"
                    key={day.date}
                    disabled={pending || day.past || day.status === "Booked"}
                    className={`sa-day flex items-stretch flex-col min-h-[83px] relative pt-[11px] px-[9px] pb-[9px] border border-[color:var(--sa-state-border,_#e4e9df)] rounded-[8px] bg-[color:var(--sa-state-bg,_#f4f7ef)] text-[color:var(--sa-state-ink,_#627c51)] text-left [transition:border-color_0.15s,_box-shadow_0.15s] [&:hover:enabled]:border-[#809f6d] [&:hover:enabled]:shadow-[0_1px_5px_#28562910] [&.sa-day-past]:bg-[#fafbf8] [&.sa-day-past]:border-[#edf0e7] [&.sa-day-past]:text-[#8a9581] [&.sa-day-today_.sa-day-number::before]:content-[''] [&.sa-day-today_.sa-day-number::before]:absolute [&.sa-day-today_.sa-day-number::before]:top-[5px] [&.sa-day-today_.sa-day-number::before]:left-[5px] [&.sa-day-today_.sa-day-number::before]:w-[4px] [&.sa-day-today_.sa-day-number::before]:h-[4px] [&.sa-day-today_.sa-day-number::before]:rounded-[50%] [&.sa-day-today_.sa-day-number::before]:bg-[#47723c] [&.sa-day-today]:border-[#a1b98f] [&.sa-day-selected]:border-[#47753c] [&.sa-day-selected]:shadow-[inset_0_0_0_1px_#47753c] [&.sa-day-selected:not(.sa-status-blocked,_.sa-status-booked)]:bg-[#eaf2e0] [&.sa-day-selected:not(.sa-status-blocked,_.sa-status-booked)]:text-[#416e35] motion-reduce:transition-none min-[1550px]:min-h-[91px] min-[1550px]:py-[13px] min-[1550px]:px-[12px] max-[1200.001px]:py-[10px] max-[1200.001px]:px-[6px] max-[1200.001px]:min-h-[75px] max-[1000.001px]:min-h-[84px] max-[1000.001px]:py-[12px] max-[1000.001px]:px-[10px] max-[620.001px]:min-h-[65px] max-[620.001px]:py-[8px] max-[620.001px]:px-[5px] max-[620.001px]:rounded-[6px] sa-status-${day.status.toLowerCase()} ${day.past ? "sa-day-past [&_.sa-day-status]:text-[#8e9787] [&_.sa-day-status_.sa-dot]:bg-[#bdc5b7]" : ""} ${day.today ? "sa-day-today" : ""} ${selected ? "sa-day-selected" : ""}`}
                    aria-label={`${displayDate(day.date)}: ${day.status}${day.past ? ", past date" : ""}${day.today ? ", today" : ""}`}
                    aria-pressed={selected}
                    aria-current={day.today ? "date" : undefined}
                    title={
                      day.status === "Booked"
                        ? "Booked dates are protected"
                        : day.past
                          ? "Past date"
                          : day.override?.notes || undefined
                    }
                    onClick={() => chooseDay(day.date, day.override)}
                  >
                    <span className="sa-day-number flex items-center justify-between gap-[2px] min-h-[20px] mb-[10px] text-[13px] font-semibold tabular-nums [&_>_svg]:shrink-0 max-[620.001px]:mb-[7px] max-[620.001px]:text-[12px] max-[370.001px]:[&_>_svg]:w-[9px]">
                      {day.number}
                      {day.status === "Booked" ? (
                        <LockKeyhole size={11} />
                      ) : (
                        selected && <Check size={12} />
                      )}
                    </span>
                    <span className="sa-day-status flex items-center gap-[4px] text-[9px] leading-[1.4] [&_.sa-dot]:w-[4px] [&_.sa-dot]:h-[4px] max-[1200.001px]:text-[8px] max-[1000.001px]:text-[9px] max-[620.001px]:gap-[2px] max-[620.001px]:text-[7px] max-[620.001px]:[&_.sa-dot]:w-[3px] max-[620.001px]:[&_.sa-dot]:h-[3px] max-[370.001px]:[&_.sa-dot]:hidden">
                      <i className="sa-dot inline-block w-[5px] h-[5px] shrink-0 rounded-[50%] bg-current" />
                      {day.past ? "Past" : day.status}
                    </span>
                    {!day.past &&
                      day.override?.status === "Available" &&
                      clockValue(day.override.startTime) && (
                        <span className="sa-day-time mt-[3px] pl-[8px] text-[8px] max-[620.001px]:text-[7px] max-[620.001px]:pl-0">
                          {clockValue(day.override.startTime)}
                        </span>
                      )}
                  </button>
                );
              })}
            </div>
            <div className="sa-calendar-footer flex items-start gap-[7px] my-[19px] mx-[24px] text-[#76856d] [&_svg]:shrink-0 [&_svg]:mt-[2px] [&_p]:m-0 [&_p]:text-[10px] [&_p]:leading-[1.7] max-[1200.001px]:my-[17px] max-[1200.001px]:mx-[18px] max-[620.001px]:m-[15px] max-[620.001px]:[&_p]:text-[9px]">
              <Info size={14} />
              <p>
                Future dates are open unless blocked or booked. Existing
                bookings are protected.
              </p>
            </div>
            <div className="sa-month-summary flex items-center justify-between gap-[12px] flex-wrap py-[14px] px-[24px] border-t border-t-[#e9ede3] bg-[#fafbf7] [&_>_div]:inline-flex [&_>_div]:items-center [&_>_div]:gap-[6px] [&_>_div]:text-[#728366] [&_>_div]:text-[10px] [&_strong]:text-[12px] [&_strong]:font-semibold [&_strong]:text-[#496541] max-[1200.001px]:pr-[18px] max-[1200.001px]:pl-[18px] max-[1200.001px]:gap-y-[10px] max-[1200.001px]:gap-x-[14px] max-[1200.001px]:justify-start max-[620.001px]:py-[13px] max-[620.001px]:px-[15px] max-[620.001px]:gap-y-[10px] max-[620.001px]:gap-x-[16px] max-[620.001px]:[&_>_div]:text-[9px] max-[620.001px]:[&_>_div]:gap-[5px]">
              <div>
                <span className="sa-dot inline-block w-[5px] h-[5px] shrink-0 rounded-[50%] bg-current sa-status-available" />
                <strong>{availableCount}</strong>
                <span>open dates left</span>
              </div>
              <div>
                <span className="sa-dot inline-block w-[5px] h-[5px] shrink-0 rounded-[50%] bg-current sa-status-blocked" />
                <strong>{blockedCount}</strong>
                <span>blocked dates left</span>
              </div>
              <div>
                <Clock3 size={13} />
                <strong>{customCount}</strong>
                <span>custom hours this month</span>
              </div>
            </div>
          </section>

          <section
            className="sa-card min-w-0 border border-[color:var(--sa-border)] rounded-[13px] bg-white overflow-hidden sa-overrides-card [&_.sa-card-header]:pb-[18px] [&_h2]:text-[20px] max-[1000.001px]:[order:2] max-[620.001px]:[&_.sa-card-header]:pr-[15px] max-[620.001px]:[&_.sa-card-header]:pl-[15px]"
            aria-labelledby="date-overrides-heading"
          >
            <div className="sa-card-header flex items-start justify-between gap-[15px] pt-[23px] px-[24px] pb-[18px] [&_h2]:m-0 [&_h2]:text-[color:var(--sa-ink)] [&_h2]:font-serif [&_h2]:text-[22px] [&_h2]:font-normal [&_h2]:tracking-[-0.4px] [&_h2]:leading-[1.35] [&_p]:mt-[6px] [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[color:var(--sa-muted)] [&_p]:text-[11px] [&_p]:leading-[1.7] max-[1200.001px]:pt-[20px] max-[1200.001px]:px-[18px] max-[1200.001px]:pb-[16px] max-[1200.001px]:[&_h2]:text-[20px] max-[620.001px]:pt-[18px] max-[620.001px]:px-[15px] max-[620.001px]:pb-[16px] max-[620.001px]:gap-[10px] max-[620.001px]:[&_h2]:text-[20px] max-[620.001px]:[&_p]:text-[10px]">
              <div>
                <h2 id="date-overrides-heading">Date overrides</h2>
                <p>Saved changes for {monthLabel}.</p>
              </div>
              <span className="sa-count grid place-items-center min-w-[26px] h-[26px] p-[4px] border border-[#e2e8da] rounded-[7px] bg-[#f7f9f2] text-[#718466] text-[11px]">
                {monthlyRows.length}
              </span>
            </div>
            {monthlyRows.length ? (
              <>
                <ul className="sa-override-list list-none m-0 pt-0 px-[24px] pb-[5px] [&_li]:flex [&_li]:items-center [&_li]:gap-[12px] [&_li]:py-[14px] [&_li]:px-0 [&_li]:border-t [&_li]:border-t-[#eaf0e3] [&_li_>_div]:min-w-0 [&_li_>_div]:flex-1 [&_strong]:block [&_strong]:text-[#46613e] [&_strong]:text-[12px] [&_strong]:font-medium [&_p]:mt-[3px] [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[11px] [&_p]:text-[#78866d] [&_p]:wrap-anywhere [&_p]:leading-[1.6] max-[620.001px]:pt-0 max-[620.001px]:px-[15px] max-[620.001px]:pb-[5px] max-[620.001px]:[&_li]:gap-[9px] max-[620.001px]:[&_li]:flex-wrap max-[620.001px]:[&_.sa-status-pill]:text-[8px] max-[620.001px]:[&_.sa-status-pill]:py-[3px] max-[620.001px]:[&_.sa-status-pill]:px-[5px]">
                  {(showAll ? monthlyRows : monthlyRows.slice(0, 4)).map(
                    (row) => (
                      <li key={row.id}>
                        <span
                          className={`sa-override-icon grid place-items-center w-[34px] h-[34px] shrink-0 rounded-[8px] bg-[color:var(--sa-state-bg)] sa-status-${row.status.toLowerCase()}`}
                        >
                          {row.status === "Booked" ? (
                            <LockKeyhole size={16} />
                          ) : row.status === "Available" ? (
                            <CalendarCheck size={17} />
                          ) : (
                            <CalendarOff size={17} />
                          )}
                        </span>
                        <div>
                          <strong>{displayDate(dateKey(row.date))}</strong>
                          <p>
                            {row.notes ||
                              (row.status === "Available"
                                ? "Custom availability"
                                : row.status === "Booked"
                                  ? "Reserved for a booking"
                                  : "Unavailable for bookings")}
                            {row.startTime && row.endTime && (
                              <>
                                {" "}
                                · {clockValue(row.startTime)}–
                                {clockValue(row.endTime)}
                              </>
                            )}
                          </p>
                        </div>
                        <span
                          className={`sa-status-pill shrink-0 py-[4px] px-[8px] border border-[color:var(--sa-state-border)] rounded-[5px] bg-[color:var(--sa-state-bg)] text-[9px] sa-status-${row.status.toLowerCase()}`}
                        >
                          {row.status}
                        </span>
                        {row.status !== "Booked" &&
                          dateKey(row.date) >= localToday && (
                            <button
                              type="button"
                              className="sa-text-button inline-flex items-center gap-[5px] p-0 border-0 bg-transparent text-[#557849] text-[11px] leading-[1.6] [&:hover:enabled]:underline [&:hover:enabled]:underline-offset-[3px]"
                              disabled={pending}
                              onClick={() => {
                                chooseDay(dateKey(row.date), row);
                                fromRef.current?.focus();
                              }}
                            >
                              Edit <ArrowUpRight size={13} />
                            </button>
                          )}
                      </li>
                    ),
                  )}
                </ul>
                {monthlyRows.length > 4 && (
                  <button
                    type="button"
                    className="sa-show-overrides [&.sa-show-overrides]:flex [&.sa-show-overrides]:mt-[5px] [&.sa-show-overrides]:mx-[24px] [&.sa-show-overrides]:mb-[20px] sa-text-button inline-flex items-center gap-[5px] p-0 border-0 bg-transparent text-[#557849] text-[11px] leading-[1.6] [&:hover:enabled]:underline [&:hover:enabled]:underline-offset-[3px]"
                    onClick={() => setShowAll((value) => !value)}
                  >
                    {showAll
                      ? "Show fewer overrides"
                      : `View all ${monthlyRows.length} overrides`}
                  </button>
                )}
              </>
            ) : (
              <div className="sa-empty-overrides flex items-center gap-[15px] pt-[10px] px-[24px] pb-[25px] text-[#77936a] [&_svg]:shrink-0 [&_strong]:block [&_strong]:text-[#536e48] [&_strong]:text-[12px] [&_strong]:font-medium [&_p]:mt-[4px] [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[#7b8772] [&_p]:text-[11px] [&_p]:leading-[1.7] max-[620.001px]:pt-[5px] max-[620.001px]:px-[15px] max-[620.001px]:pb-[22px]">
                <CalendarCheck size={23} strokeWidth={1.4} />
                <div>
                  <strong>
                    A clear calendar for {monthLabel.split(" ")[0]}
                  </strong>
                  <p>
                    No date overrides this month. Regular service hours apply.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="sa-editor-column min-w-0 max-[1000.001px]:[order:1] max-[1000.001px]:grid max-[1000.001px]:grid-cols-[minmax(0,_1fr)]">
          <section
            className="sa-card min-w-0 border border-[color:var(--sa-border)] rounded-[13px] bg-white overflow-hidden sa-form-card [&_>_.sa-card-header]:pb-[20px] [&_>_.sa-card-header]:border-b [&_>_.sa-card-header]:border-b-[#e9ede3] [&_>_.sa-card-header_h2]:mt-[6px] [&_>_.sa-card-header_>_.sa-icon-tile]:mt-[6px] max-[1000.001px]:[&_>_.sa-card-header]:pr-[24px] max-[1000.001px]:[&_>_.sa-card-header]:pl-[24px] max-[620.001px]:[&_>_.sa-card-header]:pr-[18px] max-[620.001px]:[&_>_.sa-card-header]:pl-[18px]"
            aria-labelledby="availability-editor-heading"
          >
            <div className="sa-card-header flex items-start justify-between gap-[15px] pt-[23px] px-[24px] pb-[18px] [&_h2]:m-0 [&_h2]:text-[color:var(--sa-ink)] [&_h2]:font-serif [&_h2]:text-[22px] [&_h2]:font-normal [&_h2]:tracking-[-0.4px] [&_h2]:leading-[1.35] [&_p]:mt-[6px] [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[color:var(--sa-muted)] [&_p]:text-[11px] [&_p]:leading-[1.7] max-[1200.001px]:pt-[20px] max-[1200.001px]:px-[18px] max-[1200.001px]:pb-[16px] max-[1200.001px]:[&_h2]:text-[20px] max-[620.001px]:pt-[18px] max-[620.001px]:px-[15px] max-[620.001px]:pb-[16px] max-[620.001px]:gap-[10px] max-[620.001px]:[&_h2]:text-[20px] max-[620.001px]:[&_p]:text-[10px]">
              <div>
                <span className="sa-eyebrow text-[#73836c] text-[9px] tracking-[1.8px] font-semibold">
                  PLAN YOUR DATES
                </span>
                <h2 id="availability-editor-heading">{heading}</h2>
                <p>
                  {editing
                    ? "Update this saved date or remove its override."
                    : "Block a date range or adjust hours for a specific day."}
                </p>
              </div>
              <span className="sa-icon-tile grid w-[37px] h-[37px] place-items-center shrink-0 rounded-[10px] text-[#6a845e] bg-[#f0f4eb]">
                <CalendarDays size={20} />
              </span>
            </div>
            <form
              className="service-form sa-form py-[23px] px-[24px] [&_fieldset]:min-w-0 [&_fieldset]:m-0 [&_fieldset]:p-0 [&_fieldset]:border-0 [&_fieldset:disabled]:opacity-70 max-[1200.001px]:py-[20px] max-[1200.001px]:px-[18px] max-[1000.001px]:py-[22px] max-[1000.001px]:px-[24px] max-[620.001px]:py-[21px] max-[620.001px]:px-[18px]"
              onSubmit={submit}
              aria-busy={pending}
            >
              <fieldset disabled={pending}>
                <legend className="sr-only">Date availability settings</legend>
                <div className="sa-form-step flex items-center gap-[9px] mt-[23px] mx-0 mb-[14px] [&:first-of-type]:mt-0 [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:w-[22px] [&_>_span]:h-[22px] [&_>_span]:shrink-0 [&_>_span]:border [&_>_span]:border-[#dce6d2] [&_>_span]:rounded-[6px] [&_>_span]:bg-[#f5f8ef] [&_>_span]:text-[#81936f] [&_>_span]:text-[9px] [&_>_span]:font-medium [&_h3]:m-0 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:text-[#45633d] [&_>_small]:ml-auto [&_>_small]:text-[#89947e] [&_>_small]:text-[10px] [&_>_.sa-text-button]:ml-auto [&_>_.sa-text-button]:text-[10px]">
                  <span>01</span>
                  <h3>Choose your dates</h3>
                  {selection && (
                    <button
                      className="sa-text-button inline-flex items-center gap-[5px] p-0 border-0 bg-transparent text-[#557849] text-[11px] leading-[1.6] [&:hover:enabled]:underline [&:hover:enabled]:underline-offset-[3px]"
                      type="button"
                      onClick={reset}
                    >
                      <RotateCcw size={12} /> Reset
                    </button>
                  )}
                </div>
                <div className="sa-field-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[13px]">
                  <Field label="From">
                    <input
                      ref={fromRef}
                      type="date"
                      required
                      min={localToday}
                      value={form.from}
                      onChange={(event) => set("from", event.target.value)}
                    />
                  </Field>
                  <Field label="To">
                    <input
                      type="date"
                      required
                      min={form.from || localToday}
                      value={form.to}
                      onChange={(event) => set("to", event.target.value)}
                    />
                  </Field>
                </div>
                <p className="sa-field-hint mt-[8px] mx-0 mb-0 text-[#7c8a71] text-[10px] leading-[1.7]">
                  Select up to 91 consecutive days.
                </p>

                <div className="sa-form-step flex items-center gap-[9px] mt-[23px] mx-0 mb-[14px] [&:first-of-type]:mt-0 [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:w-[22px] [&_>_span]:h-[22px] [&_>_span]:shrink-0 [&_>_span]:border [&_>_span]:border-[#dce6d2] [&_>_span]:rounded-[6px] [&_>_span]:bg-[#f5f8ef] [&_>_span]:text-[#81936f] [&_>_span]:text-[9px] [&_>_span]:font-medium [&_h3]:m-0 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:text-[#45633d] [&_>_small]:ml-auto [&_>_small]:text-[#89947e] [&_>_small]:text-[10px] [&_>_.sa-text-button]:ml-auto [&_>_.sa-text-button]:text-[10px]">
                  <span>02</span>
                  <h3>Set date availability</h3>
                </div>
                <div
                  className="sa-type-options grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[11px] max-[370.001px]:gap-[8px]"
                  role="radiogroup"
                  aria-label="Date availability type"
                >
                  {[
                    [
                      "Blocked",
                      "Block dates",
                      "Holiday or time away",
                      CalendarOff,
                    ],
                    [
                      "Available",
                      "Set available",
                      "Regular or custom hours",
                      CalendarCheck,
                    ],
                  ].map(([value, label, hint, Icon]) => (
                    <label
                      key={value}
                      className={`sa-type-option relative flex items-start flex-col gap-[5px] min-w-0 pt-[14px] px-[12px] pb-[13px] border border-[#dfe7d6] rounded-[9px] bg-white text-[#7a8c6c] cursor-pointer [&_>_input]:absolute [&_>_input]:inset-0 [&_>_input]:w-full [&_>_input]:h-full [&_>_input]:opacity-0 [&_>_input]:m-0 [&_>_input]:cursor-pointer [&:has(input:focus-visible)]:outline-[2px] [&:has(input:focus-visible)]:outline-[#397455] [&:has(input:focus-visible)]:outline-offset-[3px] [&:has(input:disabled)]:cursor-not-allowed [&_strong]:mt-[4px] [&_strong]:text-[#526b46] [&_strong]:text-[12px] [&_strong]:font-medium [&_small]:text-[#859276] [&_small]:text-[9px] [&_small]:leading-[1.6] [&.sa-type-selected]:border-[#829e70] [&.sa-type-selected]:bg-[#f4f8ed] [&.sa-type-selected]:shadow-[inset_0_0_0_0.5px_#829e70] [&.sa-type-selected_.sa-radio-indicator]:bg-[#557c41] [&.sa-type-selected_.sa-radio-indicator]:border-[#557c41] [&.sa-type-selected.sa-type-blocked]:border-[#c19780] [&.sa-type-selected.sa-type-blocked]:bg-[#fcf7f2] [&.sa-type-selected.sa-type-blocked]:shadow-[inset_0_0_0_0.5px_#c19780] [&.sa-type-selected.sa-type-blocked]:text-[#ad7b5e] [&.sa-type-selected.sa-type-blocked_strong]:text-[#886447] [&.sa-type-selected.sa-type-blocked_small]:text-[#987e66] [&.sa-type-selected.sa-type-blocked_.sa-radio-indicator]:bg-[#a1785a] [&.sa-type-selected.sa-type-blocked_.sa-radio-indicator]:border-[#a1785a] max-[1200.001px]:py-[13px] max-[1200.001px]:px-[10px] max-[1200.001px]:[&_strong]:text-[11px] max-[370.001px]:pr-[8px] max-[370.001px]:pl-[8px] max-[370.001px]:[&_small]:text-[8px] ${form.status === value ? "sa-type-selected" : ""} sa-type-${value.toLowerCase()}`}
                    >
                      <input
                        type="radio"
                        name="availability-status"
                        value={value}
                        checked={form.status === value}
                        onChange={() => set("status", value)}
                      />
                      <span className="sa-radio-indicator absolute top-[13px] right-[12px] grid place-items-center w-[14px] h-[14px] border border-[#d0dac7] rounded-[50%] bg-white text-white">
                        {form.status === value && <Check size={10} />}
                      </span>
                      <Icon size={19} strokeWidth={1.6} />
                      <strong>{label}</strong>
                      <small>{hint}</small>
                    </label>
                  ))}
                </div>

                {form.status === "Available" && (
                  <>
                    <div className="sa-form-step flex items-center gap-[9px] mt-[23px] mx-0 mb-[14px] [&:first-of-type]:mt-0 [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:w-[22px] [&_>_span]:h-[22px] [&_>_span]:shrink-0 [&_>_span]:border [&_>_span]:border-[#dce6d2] [&_>_span]:rounded-[6px] [&_>_span]:bg-[#f5f8ef] [&_>_span]:text-[#81936f] [&_>_span]:text-[9px] [&_>_span]:font-medium [&_h3]:m-0 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:text-[#45633d] [&_>_small]:ml-auto [&_>_small]:text-[#89947e] [&_>_small]:text-[10px] [&_>_.sa-text-button]:ml-auto [&_>_.sa-text-button]:text-[10px]">
                      <span>03</span>
                      <h3>Custom hours</h3>
                      <small>Optional</small>
                    </div>
                    <div className="sa-field-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[13px]">
                      <Field label="Start time">
                        <input
                          type="time"
                          value={form.startTime || ""}
                          required={!!form.endTime}
                          onChange={(event) =>
                            set("startTime", event.target.value || null)
                          }
                        />
                      </Field>
                      <Field label="End time">
                        <input
                          type="time"
                          value={form.endTime || ""}
                          required={!!form.startTime}
                          onChange={(event) =>
                            set("endTime", event.target.value || null)
                          }
                        />
                      </Field>
                    </div>
                    <p className="sa-field-hint mt-[8px] mx-0 mb-0 text-[#7c8a71] text-[10px] leading-[1.7]">
                      India time (IST). Leave both empty to use regular service
                      hours.
                    </p>
                  </>
                )}
                <div className="sa-form-step flex items-center gap-[9px] mt-[23px] mx-0 mb-[14px] [&:first-of-type]:mt-0 [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:w-[22px] [&_>_span]:h-[22px] [&_>_span]:shrink-0 [&_>_span]:border [&_>_span]:border-[#dce6d2] [&_>_span]:rounded-[6px] [&_>_span]:bg-[#f5f8ef] [&_>_span]:text-[#81936f] [&_>_span]:text-[9px] [&_>_span]:font-medium [&_h3]:m-0 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:text-[#45633d] [&_>_small]:ml-auto [&_>_small]:text-[#89947e] [&_>_small]:text-[10px] [&_>_.sa-text-button]:ml-auto [&_>_.sa-text-button]:text-[10px]">
                  <span>{form.status === "Available" ? "04" : "03"}</span>
                  <h3>Add a note</h3>
                  <small>Optional</small>
                </div>
                <Field label="Notes">
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder={
                      form.status === "Blocked"
                        ? "e.g. Diwali holiday or venue maintenance"
                        : "e.g. Extended hours for the wedding season"
                    }
                    value={form.notes}
                    onChange={(event) => set("notes", event.target.value)}
                  />
                </Field>
                <div className="sa-note-count mt-[5px] text-[#8b967f] text-right text-[9px]">
                  {form.notes.length}/500
                </div>

                <div
                  className={`sa-selection-summary flex items-center gap-[11px] my-[19px] mx-0 p-[13px] border border-[#dfe8d5] rounded-[8px] bg-[#f5f8ef] text-[#637e51] [&_strong]:block [&_strong]:text-[11px] [&_strong]:font-medium [&_strong]:leading-[1.7] [&_p]:mt-[2px] [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[10px] [&_p]:leading-[1.7] [&.sa-summary-blocked]:border-[#eddfd3] [&.sa-summary-blocked]:bg-[#fbf7f2] [&.sa-summary-blocked]:text-[#977458] ${form.status === "Blocked" ? "sa-summary-blocked" : ""}`}
                >
                  <span className="sa-summary-icon shrink-0">
                    {form.status === "Blocked" ? (
                      <CalendarOff size={19} />
                    ) : (
                      <CalendarCheck size={19} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {form.from === form.to
                        ? displayDate(form.from)
                        : `${displayDate(form.from)} – ${displayDate(form.to)}`}
                    </strong>
                    <p>
                      {rangeDays
                        ? `${rangeDays} ${rangeDays === 1 ? "day" : "days"} · `
                        : ""}
                      {form.status === "Blocked"
                        ? "Blocked for the whole day"
                        : form.startTime && form.endTime
                          ? `${form.startTime}–${form.endTime} IST`
                          : "Available during regular hours"}
                    </p>
                  </div>
                </div>
                {bookedRange && (
                  <p className="sa-booking-warning mt-0 mx-0 mb-[16px] py-[12px] px-[13px] border border-[#efdbcd] rounded-[7px] bg-[#fff5ee] text-[#a26145] text-[12px] leading-[1.7] flex items-start gap-[8px] [&_svg]:shrink-0 [&_svg]:mt-[3px]">
                    <LockKeyhole size={15} /> This selection includes a booked
                    date. Choose a different date range.
                  </p>
                )}
                {error && (
                  <p
                    className="sa-error mt-0 mx-0 mb-[16px] py-[12px] px-[13px] border border-[#efdbcd] rounded-[7px] bg-[#fff5ee] text-[#a26145] text-[12px] leading-[1.7]"
                    role="alert"
                    tabIndex={-1}
                    ref={errorRef}
                  >
                    {error}
                  </p>
                )}
                <button
                  className="sa-button inline-flex items-center justify-center gap-[9px] min-h-[42px] py-[11px] px-[16px] border border-[#dfe7d8] rounded-[8px] bg-white text-[#59764d] text-[12px] font-medium sa-button-primary [&.sa-button-primary]:bg-[color:var(--sa-green)] [&.sa-button-primary]:border-[color:var(--sa-green)] [&.sa-button-primary]:text-white [&.sa-button-primary:hover:enabled]:bg-[#214b35] [&.sa-button-primary:hover:enabled]:border-[#214b35] sa-save [&.sa-save]:w-full [&.sa-save:disabled]:opacity-60"
                  type="submit"
                  disabled={pending || bookedRange}
                >
                  {pending ? (
                    <LoaderCircle
                      className="sa-spinner animate-spin motion-reduce:animate-none"
                      size={16}
                    />
                  ) : (
                    <Save size={16} />
                  )}
                  {busy
                    ? "Saving availability…"
                    : state.loading
                      ? "Refreshing calendar…"
                      : editing
                        ? "Update availability"
                        : "Save availability"}
                </button>
                {editing && (
                  <button
                    className="sa-remove-button flex items-center justify-center gap-[7px] w-full mt-[11px] p-[9px] border border-[#eeded3] rounded-[7px] bg-[#fdfaf6] text-[#a17458] text-[11px] [&:hover:enabled]:bg-[#fcf1e9] [&:disabled]:opacity-50"
                    type="button"
                    disabled={pending || bookedRange}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this date override and return to regular service hours?",
                        )
                      )
                        run(
                          () =>
                            save(
                              `/services/${id}/availability/${editing}`,
                              "DELETE",
                              {},
                            ),
                          selectedDay,
                        );
                    }}
                  >
                    <Trash2 size={14} /> Remove date override
                  </button>
                )}
              </fieldset>
            </form>
            <div className="sa-form-footer flex items-center justify-center gap-[6px] py-[12px] px-[18px] border-t border-t-[#e7edde] bg-[#fafbf7] text-[#7c8a70] text-[10px]">
              <ShieldCheck size={14} />
              <span>Changes apply to this service only.</span>
            </div>
          </section>
          <div className="sa-help-note flex items-start gap-[10px] mt-[19px] mx-[5px] mb-0 text-[#849775] [&_>_svg]:shrink-0 [&_>_svg]:mt-[3px] [&_p]:m-0 [&_p]:text-[#829075] [&_p]:text-[11px] [&_p]:leading-[1.8] [&_strong]:block [&_strong]:text-[#617b51] [&_strong]:font-medium">
            <Info size={17} />
            <p>
              <strong>Just for the dates you choose.</strong> Date overrides
              affect only the selected days. Your regular hours apply again
              automatically afterward.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
