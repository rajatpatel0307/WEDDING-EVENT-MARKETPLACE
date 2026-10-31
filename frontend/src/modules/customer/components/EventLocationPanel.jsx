import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  useCustomerData,
  Loading,
  ErrorView,
  Modal,
  Field,
} from "./WorkspaceUI";
import { LocationFields, MapLink } from "./LocationFields";
import { save } from "../services/workspace.api";
export default function EventLocationPanel({ eventId, onChange }) {
  const [version, setVersion] = useState(0),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [addressId, setAddressId] = useState("");
  const location = useCustomerData(`/events/${eventId}/location`, version),
    addresses = useCustomerData("/addresses?pageSize=50"),
    { notify } = useAuth();
  const refresh = () => {
    setVersion((v) => v + 1);
    onChange?.();
  };
  if (location.loading) return <Loading />;
  if (location.error)
    return <ErrorView error={location.error} retry={location.retry} />;
  const value = location.data;
  return (
    <section className="cw-panel cw-prose">
      <h2>Event location</h2>
      {value ? (
        <>
          <h3>{value.venue || value.name || value.type}</h3>
          <p>
            {[
              value.line1,
              value.line2,
              value.landmark,
              value.city,
              value.district,
              value.state,
              value.postalCode,
              value.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p>
            {value.contactName} {value.contactPhone}
          </p>
          <p>{value.instructions}</p>
          <MapLink value={value} />
        </>
      ) : (
        <p>
          Add a venue or copy a saved address before requesting bookings or
          quotations.
        </p>
      )}
      <div className="cw-detail-actions">
        <button
          className="cw-button"
          onClick={() => {
            setError("");
            setEditing(true);
          }}
        >
          {value ? "Edit location" : "Add event location"}
        </button>
        {value && (
          <button
            className="cw-button"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm("Remove this event location?")) return;
              setBusy(true);
              try {
                await save(`/events/${eventId}/location`, "DELETE", {});
                refresh();
                notify("Location removed.");
              } catch (e) {
                notify(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove location
          </button>
        )}
      </div>
      {editing && (
        <Modal
          title="Event venue and access"
          busy={busy}
          close={() => setEditing(false)}
        >
          <form
            className="cw-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const body = addressId
                  ? { addressId }
                  : Object.fromEntries(new FormData(e.currentTarget));
                await save(`/events/${eventId}/location`, "PUT", body);
                refresh();
                setEditing(false);
                notify("Event location saved.");
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Copy a saved address">
              <select
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
              >
                <option value="">Enter a custom venue</option>
                {addresses.data?.rows?.map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.type}: {a.line1}, {a.city}
                  </option>
                ))}
              </select>
            </Field>
            {!addressId && (
              <>
                <Field label="Venue type">
                  <select name="type" defaultValue={value?.type || "Other"}>
                    {[
                      "Home",
                      "Marriage Hall",
                      "Banquet Hall",
                      "Hotel",
                      "Farmhouse",
                      "Outdoor Location",
                      "Temple",
                      "Resort",
                      "Convention Center",
                      "Other",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                {[
                  "name",
                  "venue",
                  "contactName",
                  "contactPhone",
                  "instructions",
                ].map((k) => (
                  <Field
                    key={k}
                    label={
                      {
                        name: "Location name",
                        venue: "Venue name",
                        contactName: "Contact person",
                        contactPhone: "Contact phone",
                        instructions: "Setup and access instructions",
                      }[k]
                    }
                  >
                    <input
                      name={k}
                      defaultValue={value?.[k] || ""}
                      maxLength={k === "instructions" ? 2000 : 200}
                    />
                  </Field>
                ))}
                <LocationFields value={value || {}} />
              </>
            )}
            {error && <p role="alert">{error}</p>}
            <button className="cw-button cw-primary" disabled={busy}>
              {busy ? "Saving…" : "Save event location"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
