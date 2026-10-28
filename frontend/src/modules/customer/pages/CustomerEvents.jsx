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
import { save, date, money, today } from "../services/workspace.api";
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
        className="cw-form"
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
          <p className="cw-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="cw-form-actions">
          <button
            type="button"
            className="cw-button"
            onClick={close}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="cw-button cw-primary" disabled={busy}>
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
          className="cw-button cw-primary"
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
              className="cw-button cw-primary"
              onClick={() => setParams({ create: "1" })}
            >
              Create your first event
            </button>
          }
        />
      ) : (
        <>
          <div className="cw-events-grid">
            {r.data.rows.map((e) => (
              <article className="cw-event-card" key={e.id}>
                <div className="cw-event-card-banner">
                  <CalendarDays size={32} strokeWidth={1} />
                  <Badge>{e.type}</Badge>
                </div>
                <div className="cw-event-card-body">
                  <div className="cw-event-card-title">
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
                  <div className="cw-event-card-facts">
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
                  <Link className="cw-button" to={`/customer/events/${e.id}`}>
                    View event <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="cw-pagination">
            <button
              className="cw-button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              className="cw-button"
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
        className="cw-form"
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
          <p role="alert" className="cw-form-error">
            {error}
          </p>
        )}
        <button disabled={busy} className="cw-button cw-primary">
          {busy ? "Saving…" : "Save guest"}
        </button>
      </form>
    </Modal>
  );
}
export function CustomerEventDetails() {
  const { id } = useParams(),
    [v, setV] = useState(0),
    r = useCustomerData(`/events/${id}`, v),
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
        <button className="cw-button" onClick={() => setEdit(true)}>
          <Pencil size={15} /> Edit event
        </button>
        <Link className="cw-button cw-primary" to="/customer/discover">
          Find services <Plus size={15} />
        </Link>
      </Heading>
      <div className="cw-event-summary">
        <div>
          <span>Guest count</span>
          <strong>{e.guests}</strong>
          <small>{r.data.guests.length} on your guest list</small>
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
          <span>RSVPs accepted</span>
          <strong>
            {
              r.data.guests.filter(
                (g) => g.status === "Accepted" || g.status === "Attended",
              ).length
            }
          </strong>
          <small>Of {r.data.guests.length} invited guests</small>
        </div>
      </div>
      {e.description && (
        <section className="cw-panel cw-prose">
          <h2>Your vision</h2>
          <p>{e.description}</p>
        </section>
      )}
      <section className="cw-panel">
        <div className="cw-panel-heading">
          <h2>Your guest list</h2>
          <button className="cw-button" onClick={() => setGuest({})}>
            <Plus size={15} /> Add guest
          </button>
        </div>
        {!r.data.guests.length ? (
          <Empty
            title="Your favourite people, all together"
            text="Add guests and keep track of their RSVPs."
          />
        ) : (
          <div className="cw-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
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
                        className="cw-icon"
                        onClick={() => setGuest(g)}
                        aria-label={`Edit ${g.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="cw-icon"
                        onClick={() => setRemove(g)}
                        aria-label={`Remove ${g.name}`}
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
      <section className="cw-panel cw-prose">
        <h2>Event bookings</h2>
        {r.data.bookings.length ? (
          r.data.bookings.map((b) => (
            <div className="cw-record-line" key={b.id}>
              <Link to={`/customer/bookings/${b.id}`}>{b.number}</Link>
              <strong>{money(b.amount)}</strong>
              <Badge>{b.status}</Badge>
            </div>
          ))
        ) : (
          <p>Discover a service to send your first booking request.</p>
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
            className="cw-button cw-primary"
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
