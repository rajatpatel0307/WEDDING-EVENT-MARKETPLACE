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
    <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
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
      <div className="cw-detail-actions flex gap-[12px] flex-wrap mt-[22px] [@media(width<=520px)]:[&_>_.cw-button]:text-[11px]">
        <button
          className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
          onClick={() => {
            setError("");
            setEditing(true);
          }}
        >
          {value ? "Edit location" : "Add event location"}
        </button>
        {value && (
          <button
            className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
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
            className="cw-form min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_fieldset]:pt-[0] [&_fieldset]:pr-[0] [&_fieldset]:pb-[0] [&_fieldset]:pl-[0] [&_fieldset]:mt-[0] [&_fieldset]:mr-[0] [&_fieldset]:mb-[0] [&_fieldset]:ml-[0] [&_fieldset]:min-w-0 [&_>_.cw-panel_+_.cw-panel]:mt-[22px]"
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
            <button className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" disabled={busy}>
              {busy ? "Saving…" : "Save event location"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
