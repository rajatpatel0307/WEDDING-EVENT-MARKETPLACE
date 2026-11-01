import EventLocationPanel from "../components/EventLocationPanel";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Plus,
  MapPin,
  Users,
  CalendarDays,
  ArrowRight,
  Pencil,
  Trash2,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  useCustomerData,
  Heading,
  Loading,
  ErrorView,
  Empty,
  Badge,
  Modal,
  Field,
} from "../components/WorkspaceUI";
import {
  save,
  date,
  money,
  today,
  customerRequest,
  download,
} from "../services/workspace.api";
export function EventForm({ event, close, done }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { notify } = useAuth();
  return (
    <Modal
      title={event ? "Edit your event" : "A beautiful beginning"}
      busy={busy}
      close={close}
    >
      <form
        className="cw-form min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_fieldset]:pt-[0] [&_fieldset]:pr-[0] [&_fieldset]:pb-[0] [&_fieldset]:pl-[0] [&_fieldset]:mt-[0] [&_fieldset]:mr-[0] [&_fieldset]:mb-[0] [&_fieldset]:ml-[0] [&_fieldset]:min-w-0 [&_>_.cw-panel_+_.cw-panel]:mt-[22px]"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          setError("");
          try {
            const r = await save(
              event ? `/events/${event.id}` : "/events",
              event ? "PUT" : "POST",
              {
                ...f,
                guests: Number(f.guests),
                budget: Number(f.budget),
                ...(event ? { expectedUpdatedAt: event.updatedAt } : {}),
              },
            );
            notify(r.message);
            done(r.id);
            close();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Event name">
          <input
            name="name"
            defaultValue={event?.name}
            required
            minLength="2"
            maxLength="200"
            placeholder="Our happily ever after"
          />
        </Field>
        <div className="cw-form-grid">
          <Field label="Event type">
            <select name="type" defaultValue={event?.type || "Wedding"}>
              {[
                "Wedding",
                "Engagement",
                "Reception",
                "Sangeet",
                "Mehndi",
                "Birthday",
                "Anniversary",
                "Corporate",
                "Other",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Event date">
            <input
              type="date"
              name="eventDate"
              min={today()}
              defaultValue={event?.eventDate?.slice(0, 10)}
              required
            />
          </Field>
          <Field label="City">
            <input
              name="city"
              defaultValue={event?.city}
              required
              maxLength="100"
            />
          </Field>
          <Field label="Event end date (optional)">
            <input
              type="date"
              name="endDate"
              defaultValue={event?.endDate?.slice(0, 10) || ""}
            />
          </Field>
          <Field label="Bride name (if applicable)">
            <input
              name="brideName"
              maxLength={150}
              defaultValue={event?.brideName || ""}
            />
          </Field>
          <Field label="Groom name (if applicable)">
            <input
              name="groomName"
              maxLength={150}
              defaultValue={event?.groomName || ""}
            />
          </Field>
          <Field label="Start time (optional)">
            <input
              type="time"
              name="startTime"
              defaultValue={event?.startTime || ""}
            />
          </Field>
          <Field label="End time (optional)">
            <input
              type="time"
              name="endTime"
              defaultValue={event?.endTime || ""}
            />
          </Field>
          <Field label="State">
            <input
              name="state"
              defaultValue={event?.state || ""}
              maxLength="100"
            />
          </Field>
          <Field label="Guest count">
            <input
              type="number"
              name="guests"
              min="1"
              max="100000"
              defaultValue={event?.guests || 100}
              required
            />
          </Field>
          <Field label="Budget (INR)">
            <input
              type="number"
              step="0.01"
              name="budget"
              min="0"
              max="100000000"
              defaultValue={event?.budget || 0}
              required
            />
          </Field>
        </div>
        <Field label="Your vision">
          <textarea
            name="description"
            maxLength="5000"
            rows="3"
            defaultValue={event?.description || ""}
          />
        </Field>
        {error && (
          <p className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]" role="alert">
            {error}
          </p>
        )}
        <div className="cw-form-actions">
          <button
            type="button"
            className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
            onClick={close}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" disabled={busy}>
            {busy ? "Saving…" : event ? "Save event" : "Create event"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function CustomerEvents() {
  const [params, setParams] = useSearchParams(),
    [page, setPage] = useState(1),
    [v, setV] = useState(0),
    r = useCustomerData(`/records/events?page=${page}`, v);
  return (
    <>
      <Heading
        title="Your celebrations"
        description="Every unforgettable moment starts with a little planning."
      >
        <button
          className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
          onClick={() => setParams({ create: "1" })}
        >
          <Plus size={16} /> Create an event
        </button>
      </Heading>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorView error={r.error} retry={r.retry} />
      ) : !r.data.rows.length ? (
        <Empty
          title="Let’s give your celebration a home"
          text="Set your date, guest count and budget. We’ll help with the beautiful details."
          action={
            <button
              className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              onClick={() => setParams({ create: "1" })}
            >
              Create your first event
            </button>
          }
        />
      ) : (
        <>
          <div className="cw-events-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=520px)]:grid-cols-[minmax(0,_1fr)] [@media(520px<width<=1250px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[24px]">
            {r.data.rows.map((e) => (
              <article className="cw-event-card [border-top-width:1px] [border-top-style:solid] [border-top-color:#e9dfd6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e9dfd6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e9dfd6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e9dfd6] rounded-[9px] [background:#fff] overflow-x-hidden overflow-y-hidden" key={e.id}>
                <div className="cw-event-card-banner h-[100px] [background:radial-gradient(ellipse_at_right_top,_#ecdfce,_#f4ebe4)] flex items-center justify-between pt-[25px] pr-[25px] pb-[25px] pl-[25px] text-[#b89c83]">
                  <CalendarDays size={32} strokeWidth={1} />
                  <Badge>{e.type}</Badge>
                </div>
                <div className="cw-event-card-body pt-[23px] pr-[23px] pb-[23px] pl-[23px] [&_p]:flex [&_p]:items-center [&_p]:gap-[7px] [&_p]:text-[11px] [&_>_.cw-button]:w-full [&_>_.cw-button]:justify-between [&_>_.cw-button]:mt-[20px]">
                  <div className="cw-event-card-title flex justify-between items-center gap-[10px] mb-[15px] [&_h2]:text-[25px]">
                    <h2>{e.name}</h2>
                    <Badge>{e.status}</Badge>
                  </div>
                  <p>
                    <CalendarDays size={15} />
                    {date(e.eventDate)}
                  </p>
                  <p>
                    <MapPin size={15} />
                    {[e.city, e.state].filter(Boolean).join(", ")}
                  </p>
                  <div className="cw-event-card-facts flex justify-between pt-[15px] pr-[0] pb-[15px] pl-[0] [border-block:1px_solid_#f0e7de] mt-[17px] mr-[0] mb-[17px] ml-[0] gap-[12px] text-[11px] text-[#a08b7b] [&_>_span]:flex [&_>_span]:items-center [&_>_span]:gap-[5px]">
                    <span>
                      <Users size={15} />
                      {e.guests} guests
                    </span>
                    <span>
                      <Wallet size={15} />
                      {money(e.budget, true)}
                    </span>
                  </div>
                  <p>
                    <strong>{e.bookedServices}</strong> booked services ·{" "}
                    {money(e.committed)} committed
                  </p>
                  <Link className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" to={`/customer/events/${e.id}`}>
                    View event <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="cw-pagination flex items-center justify-center gap-[20px] mt-[25px] mr-[0] mb-[25px] ml-[0] text-[11px] text-[#a59187]">
            <button
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              disabled={page * r.data.pageSize >= r.data.total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {params.has("create") && (
        <EventForm
          close={() => setParams({})}
          done={() => {
            setPage(1);
            setV(v + 1);
          }}
        />
      )}
    </>
  );
}
function GuestForm({ eventId, guest, close, done }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title={guest ? "Edit guest" : "Add a guest"}
      close={close}
      busy={busy}
    >
      <form
        className="cw-form min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_fieldset]:pt-[0] [&_fieldset]:pr-[0] [&_fieldset]:pb-[0] [&_fieldset]:pl-[0] [&_fieldset]:mt-[0] [&_fieldset]:mr-[0] [&_fieldset]:mb-[0] [&_fieldset]:ml-[0] [&_fieldset]:min-w-0 [&_>_.cw-panel_+_.cw-panel]:mt-[22px]"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save(
              `/events/${eventId}/guests${guest ? `/${guest.id}` : ""}`,
              guest ? "PUT" : "POST",
              Object.fromEntries(new FormData(e.currentTarget)),
            );
            done();
            close();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {[
          ["name", "Name", "text"],
          ["email", "Email (optional)", "email"],
          ["phone", "Phone (optional)", "tel"],
        ].map(([key, label, type]) => (
          <Field label={label} key={key}>
            <input
              name={key}
              type={type}
              required={key === "name"}
              defaultValue={guest?.[key] || ""}
              maxLength={key === "name" ? 200 : key === "email" ? 320 : 20}
            />
          </Field>
        ))}
        <Field label="RSVP">
          <select name="status" defaultValue={guest?.status || "Invited"}>
            {["Invited", "Accepted", "Declined", "Attended"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        {error && (
          <p role="alert" className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]">
            {error}
          </p>
        )}
        <Field label="Family or group">
          <input
            name="group"
            maxLength={100}
            defaultValue={guest?.group || ""}
          />
        </Field>
        <Field label="Invitation">
          <select name="invitation" defaultValue={guest?.invitation || ""}>
            <option value="">Not recorded</option>
            <option value="NotSent">Not sent</option>
            <option value="Sent">Sent</option>
          </select>
        </Field>
        <Field label="Number of attendees">
          <input
            type="number"
            name="attendees"
            min={1}
            max={100}
            defaultValue={guest?.attendees || 1}
            required
          />
        </Field>
        <Field label="Dietary preferences (optional)">
          <input
            name="dietary"
            maxLength={500}
            defaultValue={guest?.dietary || ""}
          />
        </Field>
        <Field label="Private notes">
          <textarea
            name="notes"
            maxLength={1000}
            defaultValue={guest?.notes || ""}
          />
        </Field>
        <button disabled={busy} className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]">
          {busy ? "Saving…" : "Save guest"}
        </button>
      </form>
    </Modal>
  );
}
export function CustomerEventDetails() {
  const { id } = useParams(),
    [v, setV] = useState(0),
    [guestSearch, setGuestSearch] = useState(""),
    [guestPage, setGuestPage] = useState(1),
    [rsvp, setRsvp] = useState(""),
    [archive, setArchive] = useState(false),
    r = useCustomerData(
      `/events/${id}?${new URLSearchParams({ q: guestSearch, guestPage, rsvp })}`,
      v,
    ),
    [edit, setEdit] = useState(false),
    [guest, setGuest] = useState(null),
    [remove, setRemove] = useState(null),
    [busy, setBusy] = useState(false),
    { notify } = useAuth();
  if (r.loading) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  const e = r.data.event;
  return (
    <>
      <Link className="cw-back" to="/customer/events">
        ← Your events
      </Link>
      <Heading
        title={e.name}
        description={`${e.type} · ${date(e.eventDate)} · ${[e.city, e.state].filter(Boolean).join(", ")}`}
      >
        <button
          className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
          disabled={e.status === "Cancelled"}
          onClick={() => setEdit(true)}
        >
          <Pencil size={15} /> Edit event
        </button>
        <Link className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" to="/customer/discover">
          Find services <Plus size={15} />
        </Link>
      </Heading>
      <EventLocationPanel eventId={id} />
      <p>
        {e.brideName && e.groomName
          ? `${e.brideName} & ${e.groomName}`
          : e.brideName || e.groomName}{" "}
        {e.endDate ? ` | Until ${date(e.endDate)}` : ""}
      </p>
      <button
        className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
        disabled={e.status === "Cancelled"}
        onClick={() => setArchive(true)}
      >
        Archive event
      </button>
      {archive && (
        <Modal
          title="Archive this event?"
          close={() => setArchive(false)}
          busy={busy}
        >
          <p>
            Your history will be preserved. Active bookings or quotations must
            be resolved first.
          </p>
          <button
            className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await save(`/events/${id}/archive`, "POST", {});
                notify(result.message);
                setArchive(false);
                setV((v) => v + 1);
              } catch (err) {
                notify(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm archive
          </button>
        </Modal>
      )}
      <div className="cw-event-summary grid grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(width<=1050px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [@media(width<=520px)]:gap-[12px] mt-[25px] mr-[0] mb-[25px] ml-[0] [&_>_div]:[background:white] [&_>_div]:[border-top-width:1px] [&_>_div]:[border-top-style:solid] [&_>_div]:[border-top-color:#e9dfd6] [&_>_div]:[border-right-width:1px] [&_>_div]:[border-right-style:solid] [&_>_div]:[border-right-color:#e9dfd6] [&_>_div]:[border-bottom-width:1px] [&_>_div]:[border-bottom-style:solid] [&_>_div]:[border-bottom-color:#e9dfd6] [&_>_div]:[border-left-width:1px] [&_>_div]:[border-left-style:solid] [&_>_div]:[border-left-color:#e9dfd6] [&_>_div]:rounded-[8px] [&_>_div]:pt-[25px] [@media(width<=520px)]:[&_>_div]:pt-[20px] [&_>_div]:pr-[25px] [@media(width<=520px)]:[&_>_div]:pr-[15px] [&_>_div]:pb-[25px] [@media(width<=520px)]:[&_>_div]:pb-[20px] [&_>_div]:pl-[25px] [@media(width<=520px)]:[&_>_div]:pl-[15px] [&_>_div]:flex [&_>_div]:flex-col [&_>_div]:items-start [&_>_div]:gap-[12px] [&_span]:text-[11px] [&_span]:text-[#a38e80] [&_strong]:[font-family:Georgia,_serif] [&_strong]:text-[28px] [@media(width<=520px)]:[&_strong]:text-[25px] [&_strong]:font-[400] [&_small]:text-[10px] [&_small]:text-[#b3a298]">
        <div>
          <span>Guest count</span>
          <strong>{e.guests}</strong>
          <small>{r.data.guestStats?.guests || 0} on your guest list</small>
        </div>
        <div>
          <span>Budget</span>
          <strong>{money(e.budget)}</strong>
          <small>{money(e.committed)} committed</small>
        </div>
        <div>
          <span>Booked services</span>
          <strong>{e.bookedServices}</strong>
          <Badge>{e.status}</Badge>
        </div>
        <div>
          <span>Confirmed attendees</span>
          <strong>{r.data.guestStats?.confirmed || 0}</strong>
          <small>
            Of {r.data.guestStats?.attendees || 0} invited attendees
          </small>
        </div>
      </div>
      {e.description && (
        <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
          <h2>Your vision</h2>
          <p>{e.description}</p>
        </section>
      )}
      <section className="cw-panel [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden">
        <div className="cw-panel-heading flex items-center justify-between gap-[14px] pt-[20px] [@media(width<=767px)]:pt-[17px] pr-[23px] [@media(width<=767px)]:pr-[17px] pb-[20px] [@media(width<=767px)]:pb-[17px] pl-[23px] [@media(width<=767px)]:pl-[17px] [&_p]:mt-[4px] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [@media(width<=520px)]:flex-wrap">
          <h2>Your guest list</h2>
          <button
            className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
            disabled={["Cancelled", "Completed"].includes(e.status)}
            onClick={() => setGuest({})}
          >
            <Plus size={15} /> Add guest
          </button>
        </div>
        <form
          className="cw-form min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_fieldset]:pt-[0] [&_fieldset]:pr-[0] [&_fieldset]:pb-[0] [&_fieldset]:pl-[0] [&_fieldset]:mt-[0] [&_fieldset]:mr-[0] [&_fieldset]:mb-[0] [&_fieldset]:ml-[0] [&_fieldset]:min-w-0 [&_>_.cw-panel_+_.cw-panel]:mt-[22px]"
          onSubmit={(event) => {
            event.preventDefault();
            setGuestSearch(new FormData(event.currentTarget).get("q"));
            setGuestPage(1);
          }}
        >
          <Field label="Search guests or family">
            <input name="q" defaultValue={guestSearch} maxLength={150} />
          </Field>
          <Field label="RSVP filter">
            <select
              value={rsvp}
              onChange={(e) => {
                setRsvp(e.target.value);
                setGuestPage(1);
              }}
            >
              <option value="">All responses</option>
              {["Invited", "Accepted", "Declined", "Attended"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <button className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]">Search guests</button>
        </form>
        <p>
          {r.data.guestStats?.attendees || 0} invited attendees |{" "}
          {r.data.guestStats?.confirmed || 0} confirmed | Event guest count{" "}
          {e.guests}
        </p>
        <button
          className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const blob = await customerRequest(
                `/events/${id}/guests/export`,
                { download: true },
              );
              download(blob, "event-guests.csv");
            } catch (err) {
              notify(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Export guest list
        </button>
        {!r.data.guests.length ? (
          <Empty
            title="Your favourite people, all together"
            text="Add guests and keep track of their RSVPs."
          />
        ) : (
          <div className="cw-table-wrap overflow-x-auto max-w-full min-w-0">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Family / group</th>
                  <th>Invitation</th>
                  <th>Attendees</th>
                  <th>Dietary / notes</th>
                  <th>RSVP</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {r.data.guests.map((g) => (
                  <tr key={g.id}>
                    <td>{g.name}</td>
                    <td>{g.email || "—"}</td>
                    <td>{g.phone || "—"}</td>
                    <td>
                      <Badge>{g.status}</Badge>
                    </td>
                    <td>
                      <button
                        className="cw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e] [background:none] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] rounded-[5px] pt-[0] pr-[0] pb-[0] pl-[0] [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]"
                        onClick={() => setGuest(g)}
                        aria-label={`Edit ${g.name}`}
                        disabled={["Cancelled", "Completed"].includes(e.status)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="cw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e] [background:none] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] rounded-[5px] pt-[0] pr-[0] pb-[0] pl-[0] [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]"
                        onClick={() => setRemove(g)}
                        aria-label={`Remove ${g.name}`}
                        disabled={["Cancelled", "Completed"].includes(e.status)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="cw-pagination flex items-center justify-center gap-[20px] mt-[25px] mr-[0] mb-[25px] ml-[0] text-[11px] text-[#a59187]">
        <button
          className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
          disabled={guestPage <= 1}
          onClick={() => setGuestPage((p) => p - 1)}
        >
          Previous guests
        </button>
        <span>Page {guestPage}</span>
        <button
          className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
          disabled={guestPage * 50 >= (r.data.guestTotal || 0)}
          onClick={() => setGuestPage((p) => p + 1)}
        >
          Next guests
        </button>
      </div>
      <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
        <h2>Event bookings</h2>
        <p>
          Committed: {money(r.data.financial?.committed)} · Captured payments:{" "}
          {money(r.data.financial?.captured)} · Budget: {money(e.budget)}
        </p>
        {r.data.bookings.length ? (
          r.data.bookings.map((b) => (
            <div className="cw-record-line flex justify-between items-center gap-[18px] pt-[12px] pr-[0] pb-[12px] pl-[0] [&_>_h2]:mt-[0] [&_>_h2]:mr-[0] [&_>_h2]:mb-[0] [&_>_h2]:ml-[0] [@media(width<=520px)]:flex-wrap" key={b.id}>
              <Link to={`/customer/bookings/${b.id}`}>{b.number}</Link>
              <strong>{money(b.amount)}</strong>
              <Badge>{b.status}</Badge>
            </div>
          ))
        ) : (
          <p>Discover a service to send your first booking request.</p>
        )}
      </section>
      <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
        <h2>Event quotations</h2>
        {r.data.quotations?.length ? (
          r.data.quotations.map((q) => (
            <p key={q.id}>
              <Link to={`/customer/quotations/${q.id}`}>{q.number}</Link> ·{" "}
              {q.status} · {money(q.amount)}
            </p>
          ))
        ) : (
          <p>No proposals received yet.</p>
        )}
      </section>
      {edit && (
        <EventForm
          event={e}
          close={() => setEdit(false)}
          done={() => setV(v + 1)}
        />
      )}{" "}
      {guest && (
        <GuestForm
          eventId={id}
          guest={guest.id ? guest : null}
          close={() => setGuest(null)}
          done={() => setV(v + 1)}
        />
      )}{" "}
      {remove && (
        <Modal title="Remove guest" close={() => setRemove(null)} busy={busy}>
          <p>Remove {remove.name} from this event’s guest list?</p>
          <button
            disabled={busy}
            className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
            onClick={async () => {
              setBusy(true);
              try {
                await save(`/events/${id}/guests/${remove.id}`, "DELETE", {});
                setRemove(null);
                setV(v + 1);
              } catch (e) {
                notify(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Removing…" : "Remove guest"}
          </button>
        </Modal>
      )}
    </>
  );
}
