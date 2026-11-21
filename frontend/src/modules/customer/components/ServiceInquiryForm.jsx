import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import EventLocationPanel from "./EventLocationPanel";
import {
  useCustomerData,
  Empty,
  ErrorView,
  Loading,
  Modal,
  Field,
} from "./WorkspaceUI";
import { save, money } from "../services/workspace.api";

export default function ServiceInquiryForm({
  service,
  packages,
  items = [],
  close,
  coverage = {},
}) {
  const events = useCustomerData("/records/events?status=Upcoming&pageSize=50"),
    addresses = useCustomerData("/addresses?pageSize=50"),
    { notify } = useAuth(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(null),
    [reviewBody, setReviewBody] = useState(null),
    [locationEvent, setLocationEvent] = useState(""),
    [params] = useSearchParams();
  return (
    <Modal title={"Request a booking"} close={close} busy={busy}>
      <p>
        Final availability is confirmed by your vendor. All prices are
        calculated securely from the selected service or package.
      </p>

      {preview && (
        <section
          className="my-4 rounded-xl border p-4"
          aria-label="Booking review"
        >
          <h3 className="font-semibold">Review your booking</h3>
          <p>
            {preview.service} · {preview.vendor}
          </p>
          <p>
            {preview.event.name} · {preview.event.date} · {preview.event.city} ·{" "}
            {preview.event.guests} guests
          </p>
          {preview.items.map((i, k) => (
            <p key={k}>
              {i.name} × {i.quantity} · {money(i.total)}
            </p>
          ))}
          {preview.event.location && (
            <p>
              <strong>Event venue: </strong>
              {[
                preview.event.location.venue,
                preview.event.location.line1,
                preview.event.location.city,
                preview.event.location.state,
                preview.event.location.postalCode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          {preview.event.billingAddress && (
            <p>
              <strong>Billing address: </strong>
              {[
                preview.event.billingAddress.line1,
                preview.event.billingAddress.city,
                preview.event.billingAddress.postalCode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          <p className="my-2">
            Subtotal {money(preview.subtotal)} · Discount{" "}
            {money(preview.discount)} · Tax {money(preview.tax)}
          </p>
          <p className="my-2 font-semibold">
            Total {money(preview.total)} · Advance {money(preview.advance)}
          </p>
          <p>
            Cancellation:{" "}
            {preview.terms?.cancellation ||
              "Requires vendor and administrator review."}
          </p>
          <p>
            Refund:{" "}
            {preview.terms?.refund ||
              "Subject to captured payment and policy review."}
          </p>
          <p>{preview.terms?.terms}</p>
          <p>
            Vendor confirmation is required. Payment status is tracked
            separately.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              disabled={busy}
              className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const result = await save("/bookings", "POST", reviewBody);
                  notify(`${result.number}: ${result.message}`);
                  close();
                  navigate(`/customer/bookings/${result.id}`);
                } catch (err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Submitting…" : "Agree and submit booking"}
            </button>
            <button
              disabled={busy}
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              onClick={() => setPreview(null)}
            >
              Edit selection
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]"
            >
              {error}
            </p>
          )}
        </section>
      )}
      {events.loading ? (
        <Loading />
      ) : events.error ? (
        <ErrorView error={events.error} retry={events.retry} />
      ) : !events.data.rows.filter((e) =>
          ["Planning", "Confirmed"].includes(e.status),
        ).length ? (
        <Empty
          title="Create an event first"
          text="Add your date and guest count so the vendor can plan with you."
          action={
            <Link
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              to="/customer/events?create=1"
            >
              Create an event
            </Link>
          }
        />
      ) : (
        <>
          {(locationEvent || events.data.rows[0]?.id) && (
            <EventLocationPanel
              eventId={locationEvent || events.data.rows[0].id}
              onChange={() => {
                setPreview(null);
              }}
            />
          )}
          <form
            hidden={!!preview}
            className="cw-form min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_fieldset]:pt-[0] [&_fieldset]:pr-[0] [&_fieldset]:pb-[0] [&_fieldset]:pl-[0] [&_fieldset]:mt-[0] [&_fieldset]:mr-[0] [&_fieldset]:mb-[0] [&_fieldset]:ml-[0] [&_fieldset]:min-w-0 [&_>_.cw-panel_+_.cw-panel]:mt-[22px] [&[hidden]]:hidden!"
            onSubmit={async (e) => {
              e.preventDefault();
              const fields = new FormData(e.currentTarget);
              const f = Object.fromEntries(fields);
              setBusy(true);
              setError("");
              try {
                const b = {
                  eventId: f.eventId,
                  serviceId: service.id,
                  ...(f.packageId ? { packageId: f.packageId } : {}),

                  ...(f.locationMode ? { locationMode: f.locationMode } : {}),
                  ...(f.vendorLocationId
                    ? { vendorLocationId: f.vendorLocationId }
                    : {}),
                  ...(f.billingAddressId
                    ? { billingAddressId: f.billingAddressId }
                    : {}),
                  quantity: Number(f.quantity),
                  requirements: f.requirements,
                  coupon: f.coupon,
                  items: items
                    .filter((i) => !i.included && Number(f[`item-${i.id}`]) > 0)
                    .map((i) => ({
                      id: i.id,
                      quantity: Number(f[`item-${i.id}`]),
                    })),
                };

                const r = await save("/bookings/preview", "POST", b);

                setPreview(r);
                setReviewBody({ ...b, reviewToken: r.reviewToken });
              } catch (err) {
                setError(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Your event">
              <select
                name="eventId"
                required
                onChange={(e) => setLocationEvent(e.target.value)}
              >
                {events.data.rows
                  .filter((e) => ["Planning", "Confirmed"].includes(e.status))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} · {String(e.eventDate).slice(0, 10)}
                    </option>
                  ))}
              </select>
            </Field>
            <>
              <Field label="Service delivery">
                <select name="locationMode">
                  {(coverage.mode === "Vendor location"
                    ? ["Vendor location"]
                    : coverage.mode === "Both"
                      ? ["Customer location", "Vendor location"]
                      : ["Customer location"]
                  ).map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              {coverage.vendorLocationIds?.length > 0 && (
                <Field label="Business location (for visits to the vendor)">
                  <select name="vendorLocationId">
                    <option value="">Choose when visiting the vendor</option>
                    {coverage.vendorLocationIds.map((id, i) => (
                      <option key={id} value={id}>
                        {coverage.businessLocations?.find((l) => l.id === id)
                          ?.name ||
                          coverage.businessLocations?.find((l) => l.id === id)
                            ?.address ||
                          `Business location ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </>
            <Field label="Billing address (optional, separate from event venue)">
              <select name="billingAddressId">
                <option value="">No billing address selected</option>
                {addresses.data?.rows?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.type}: {a.line1}, {a.city}
                  </option>
                ))}
              </select>
              <Link to="/customer/addresses">Manage billing addresses</Link>
            </Field>
            <Field label="Service or package">
              <select
                name="packageId"
                defaultValue={
                  packages.find(
                    (p) =>
                      p.id.toLowerCase() ===
                      params.get("package")?.toLowerCase(),
                  )?.id || ""
                }
              >
                <option value="">
                  {service.name} ·{" "}
                  {service.price ? money(service.price) : "Price unavailable"}
                </option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={`Quantity (${service.pricingType === "PerPerson" ? "people" : service.pricingType === "PerHour" ? "hours" : service.pricingType === "PerDay" ? "days" : "units"})`}
            >
              <input
                type="number"
                name="quantity"
                min="1"
                max="100000"
                defaultValue="1"
                required
              />
            </Field>

            <>
              <Field label="Coupon (base service or package only)">
                <input name="coupon" maxLength={50} pattern="[A-Za-z0-9_-]*" />
              </Field>
              <Field label="Special requirements">
                <textarea name="requirements" maxLength={2000} rows={3} />
              </Field>
              {items
                .filter((i) => !i.included)
                .map((i) => (
                  <Field
                    label={`${i.name} · ${money(i.price)} each (optional)`}
                    key={i.id}
                  >
                    <input
                      type="number"
                      name={`item-${i.id}`}
                      min={0}
                      max={100000}
                      defaultValue={0}
                    />
                  </Field>
                ))}
            </>
            {error && (
              <p
                className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]"
                role="alert"
              >
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
            >
              {busy ? "Sending…" : "Review booking"}
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
