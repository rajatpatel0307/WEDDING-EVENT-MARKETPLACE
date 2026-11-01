import { MediaGallery } from '../../media/MediaLibrary';
import { PublicReviews } from '../../reviews/Reviews';
import WishlistButton from "../components/WishlistButton";
import EventLocationPanel from "../components/EventLocationPanel";
import { useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  MapPin,
  Star,
  ArrowLeft,
  Heart,
  MessagesSquare,
  ShoppingBag,
  FileText,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  useCustomerData,
  Heading,
  Empty,
  ErrorView,
  Loading,
  Modal,
  Field,
} from "../components/WorkspaceUI";
import BrowsePage from "../../marketplace/BrowsePage";
import { AvailabilityCalendar } from "../../marketplace/DetailPage";
import { ServiceCard } from "../components/ServiceCards";
import { save, money } from "../services/workspace.api";
export default function CustomerDiscovery() {
  return <BrowsePage embedded />;
}
function ServiceAction({
  service,
  packages,
  items = [],
  mode,
  close,
  coverage = {},
}) {
  const related = useCustomerData(`/vendors/${service.vendorId}`),
    events = useCustomerData("/records/events?status=Upcoming&pageSize=50"),
    addresses = useCustomerData("/addresses?pageSize=50"),
    { notify } = useAuth(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(null),
    [reviewBody, setReviewBody] = useState(null),
    [quoteDraft, setQuoteDraft] = useState(null),
    [locationEvent, setLocationEvent] = useState(""),
    [params] = useSearchParams();
  return (
    <Modal
      title={mode === "book" ? "Request a booking" : "Request a quotation"}
      close={close}
      busy={busy}
    >
      <p>
        Final availability is confirmed by your vendor. All prices are
        calculated securely from the selected service or package.
      </p>
      {quoteDraft && (
        <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
          <h2>Review quotation request</h2>
          <p>{service.name}</p>
          <p>
            {events.data?.rows.find((e) => e.id === quoteDraft.eventId)?.name} ·{" "}
            {events.data?.rows
              .find((e) => e.id === quoteDraft.eventId)
              ?.eventDate?.slice(0, 10)}
          </p>
          <p>{quoteDraft.message}</p>
          <p>
            Your event location, guest count, budget and package preference will
            be shared with this vendor. This request does not confirm a booking
            or authorize payment.
          </p>
          <button
            disabled={busy}
            className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
            onClick={async () => {
              setBusy(true);
              try {
                const result = await save(
                  "/quotation-requests",
                  "POST",
                  quoteDraft,
                );
                notify(result.message);
                close();
                navigate("/customer/requests");
              } catch (err) {
                setError(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Send quotation request
          </button>
          <button
            disabled={busy}
            className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
            onClick={() => setQuoteDraft(null)}
          >
            Edit request
          </button>
          {error && <p role="alert">{error}</p>}
        </section>
      )}
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
            <p role="alert" className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]">
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
            <Link className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" to="/customer/events?create=1">
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
                setQuoteDraft(null);
              }}
            />
          )}
          <form
            hidden={!!preview || !!quoteDraft}
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
                  ...(mode === "book"
                    ? {
                        ...(f.locationMode
                          ? { locationMode: f.locationMode }
                          : {}),
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
                          .filter(
                            (i) => !i.included && Number(f[`item-${i.id}`]) > 0,
                          )
                          .map((i) => ({
                            id: i.id,
                            quantity: Number(f[`item-${i.id}`]),
                          })),
                      }
                    : {
                        message: f.message,
                        services: fields
                          .getAll("additionalService")
                          .map((serviceId) => ({ serviceId })),
                        items: items
                          .filter((i) => Number(f[`request-item-${i.id}`]) > 0)
                          .map((i) => ({
                            serviceId: service.id,
                            id: i.id,
                            quantity: Number(f[`request-item-${i.id}`]),
                          })),
                      }),
                };
                if (mode === "quote") {
                  setQuoteDraft(b);
                  return;
                }
                const r = await save(
                  mode === "book" ? "/bookings/preview" : "/quotation-requests",
                  "POST",
                  b,
                );
                if (mode === "book") {
                  setPreview(r);
                  setReviewBody({ ...b, reviewToken: r.reviewToken });
                  return;
                }
                notify(r.message);
                close();
                navigate(
                  mode === "book"
                    ? `/customer/bookings/${r.id}`
                    : "/customer/quotations",
                );
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
            {mode === "book" && (
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
            )}
            {mode === "book" && (
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
            )}
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
                  {service.price ? money(service.price) : "Custom quote"}
                </option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price)}
                  </option>
                ))}
              </select>
            </Field>
            {mode === "book" ? (
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
            ) : (
              <Field label="Tell the vendor what you have in mind">
                <textarea
                  name="message"
                  minLength="5"
                  maxLength="2000"
                  rows="4"
                  required
                  placeholder="Your requirements, preferred style and anything else that matters…"
                />
              </Field>
            )}
            {mode === "quote" && (
              <fieldset>
                <legend>Requested services and items</legend>
                <p>
                  The event supplies the date, time, location, guest count and
                  estimated budget. Edit your event first if these need
                  changing.
                </p>
                {related.loading ? (
                  <p role="status">Loading this vendor's services...</p>
                ) : related.error ? (
                  <ErrorView error={related.error} retry={related.retry} />
                ) : (
                  related.data?.services
                    .filter(
                      (s) =>
                        s.customQuote &&
                        s.id.toLowerCase() !== service.id.toLowerCase(),
                    )
                    .map((s) => (
                      <label key={s.id}>
                        <input
                          type="checkbox"
                          name="additionalService"
                          value={s.id}
                        />
                        {s.name}
                      </label>
                    ))
                )}
                {items.map((i) => (
                  <Field
                    key={i.id}
                    label={`Requested ${i.name} quantity (optional)`}
                  >
                    <input
                      type="number"
                      name={`request-item-${i.id}`}
                      min={0}
                      max={100000}
                      defaultValue={0}
                    />
                  </Field>
                ))}
                <p>
                  Share reference attachments securely through the vendor
                  conversation after submitting.
                </p>
              </fieldset>
            )}
            {mode === "book" && (
              <>
                <Field label="Coupon (base service or package only)">
                  <input
                    name="coupon"
                    maxLength={50}
                    pattern="[A-Za-z0-9_-]*"
                  />
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
            )}
            {error && (
              <p className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]" role="alert">
                {error}
              </p>
            )}
            <button disabled={busy} className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]">
              {busy
                ? "Sending…"
                : mode === "book"
                  ? "Review booking"
                  : "Review quotation request"}
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
export function CustomerServiceDetails({ vendor = false }) {
  const { id } = useParams(),
    [detailParams] = useSearchParams(),
    r = useCustomerData(`/${vendor ? "vendors" : "services"}/${id}`),
    { notify, reload } = useAuth(),
    navigate = useNavigate(),
    [mode, setMode] = useState(() =>
      ["book", "quote"].includes(detailParams.get("action"))
        ? detailParams.get("action")
        : null,
    ),
    [busy, setBusy] = useState(false);
  if (r.loading) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  const item = vendor ? r.data.vendor : r.data.service;
  async function message() {
    setBusy(true);
    try {
      const c = await save("/conversations", "POST", {
        vendorId: vendor ? item.id : item.vendorId,
        ...(!vendor ? { serviceId: item.id } : {}),
        ...(!vendor && detailParams.get('package') ? {packageId:detailParams.get('package')} : {}),
      });
      navigate(`/customer/messages?conversation=${c.id}`);
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="cw-back" to="/customer/discover">
        <ArrowLeft size={15} /> Back to discovery
      </Link>
      <section className="cw-detail-hero [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#ebe0d7] [border-right-width:1px] [border-right-style:solid] [border-right-color:#ebe0d7] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#ebe0d7] [border-left-width:1px] [border-left-style:solid] [border-left-color:#ebe0d7] rounded-[10px] overflow-x-hidden overflow-y-hidden mb-[25px] [&_>_img]:h-[285px] [@media(width<=520px)]:[&_>_img]:h-[200px] [&_>_img]:w-full [&_>_img]:object-cover [&_>_div]:pt-[28px] [@media(width<=520px)]:[&_>_div]:pt-[23px] [&_>_div]:pr-[28px] [@media(width<=520px)]:[&_>_div]:pr-[20px] [&_>_div]:pb-[28px] [@media(width<=520px)]:[&_>_div]:pb-[23px] [&_>_div]:pl-[28px] [@media(width<=520px)]:[&_>_div]:pl-[20px] [&_h1]:mt-[12px] [&_h1]:mr-[0] [&_h1]:mb-[12px] [&_h1]:ml-[0] [&_p]:flex [&_p]:gap-[9px] [&_p]:items-center">
        {(item.cover || item.image) && (
          <img src={item.cover || item.image} alt={item.name} />
        )}
        <div>
          <span className="cw-eyebrow text-[#9aa890] text-[8px] tracking-[1.6px] font-[500]">
            {vendor ? "MEET YOUR VENDOR" : item.category}
          </span>
          <h1>{item.name}</h1>
          <p>
            <MapPin size={15} />
            {item.city || "Location on request"} <Star size={15} />{" "}
            {Number(item.rating || 0).toFixed(1)} · {item.reviews || 0} reviews
          </p>
          <div className="cw-detail-actions flex gap-[12px] flex-wrap mt-[22px] [@media(width<=520px)]:[&_>_.cw-button]:text-[11px]">
            {!vendor && (
              <>
                <button
                  className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
                  disabled={
                    item.customQuote === false || item.customQuote === 0
                  }
                  title={
                    item.customQuote === false || item.customQuote === 0
                      ? "This service accepts bookings rather than custom quotation requests."
                      : undefined
                  }
                  onClick={() => setMode("quote")}
                >
                  <FileText size={16} /> Request quotation
                </button>
                <button className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" onClick={() => setMode("book")}>
                  <ShoppingBag size={16} /> Book service
                </button>
              </>
            )}
            <button className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" disabled={busy} onClick={message}>
              <MessagesSquare size={16} /> Message vendor
            </button>
            <WishlistButton type={vendor ? "Vendor" : "Service"} id={item.id} />
          </div>
        </div>
      </section>
      {!vendor && (
        <div className="customer-marketplace cm-embedded">
          <MediaGallery type="services" id={id} />
          <AvailabilityCalendar id={id} />
          <section className="cm-panel">
            <h2>Booking policies</h2>
            {Object.entries(r.data.policies || {})
              .filter(
                ([k, v]) =>
                  ["cancellation", "refund", "rescheduling", "terms"].includes(
                    k,
                  ) && v,
              )
              .map(([k, v]) => (
                <p key={k}>
                  <strong>{k}: </strong>
                  {v}
                </p>
              ))}
          </section>
        </div>
      )}
      <div className="cw-detail-columns grid grid-cols-[minmax(0,_1.5fr)_minmax(0,_1fr)] [@media(width<=800px)]:grid-cols-[1fr] gap-[24px]">
        <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
          <h2>
            {vendor ? "About the business" : "A little about this service"}
          </h2>
          <p>
            {item.description ||
              "Message the vendor for more information about their services."}
          </p>
          {!vendor && (
            <>
              <h3>Service details</h3>
              <dl>
                <dt>Starting price</dt>
                <dd>{item.price ? money(item.price) : "Custom quotation"}</dd>
                <dt>Pricing</dt>
                <dd>{item.pricingType}</dd>
                <dt>Guest range</dt>
                <dd>
                  {item.minGuests || "—"} – {item.maxGuests || "Flexible"}
                </dd>
              </dl>
              {item.attributes &&
                Object.entries(JSON.parse(item.attributes)).map(([k, v]) => (
                  <p key={k}>
                    <strong>{k.replace(/([A-Z])/g, " $1")}: </strong>
                    {typeof v === "boolean"
                      ? v
                        ? "Included"
                        : "Not included"
                      : String(v)}
                  </p>
                ))}
              <Link
                to={`/customer/vendors/${item.vendorId}`}
                className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              >
                View {item.vendor}
              </Link>
            </>
          )}
          {vendor && (
            <dl>
              <dt>Email</dt>
              <dd>{item.email || "Message through MarryNest"}</dd>
              <dt>Phone</dt>
              <dd>{item.phone || "Message through MarryNest"}</dd>
            </dl>
          )}
        </section>
        {!vendor && (
          <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
            <h2>Packages</h2>
            {r.data.packages.length ? (
              r.data.packages.map((p) => (
                <div className="cw-package-option [border-top-width:1px] [border-top-style:solid] [border-top-color:#eee4db] pt-[20px] pr-[0] pb-[20px] pl-[0] [&_h3]:[font-family:Georgia,_serif] [&_h3]:text-[22px] [&_h3]:font-[400] [&_small]:text-[10px]" key={p.id}>
                  <h3>{p.name}</h3>
                  <WishlistButton type="Package" id={p.id} />
                  <p>{p.description}</p>
                  {p.inclusions?.map((i, n) => (
                    <p key={n}>
                      {i.quantity} {i.unit} {i.name} {i.description}
                    </p>
                  ))}
                  <strong>{money(p.price)}</strong>
                  {Number(p.discount) > 0 && (
                    <small>
                      {" "}
                      {p.discount}% off · <s>{money(p.originalPrice)}</s>
                    </small>
                  )}
                  <p>
                    {p.minGuests || "Flexible"}–{p.maxGuests || "flexible"}{" "}
                    guests
                  </p>
                  <button
                    className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
                    onClick={() => {
                      navigate(`?package=${p.id}`, { replace: true });
                      setMode("book");
                    }}
                  >
                    Select package
                  </button>
                </div>
              ))
            ) : (
              <p>
                No packages published. Ask the vendor for a tailored quotation.
              </p>
            )}
          </section>
        )}
      </div>
      {vendor ? (
        <section>
          <Heading title="Services by this vendor" />
          {r.data.services.length ? (
            <div className="cw-discovery-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=520px)]:grid-cols-[minmax(0,_1fr)] [@media(520px<width<=1250px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[24px]">
              {r.data.services.map((i) => (
                <ServiceCard key={i.id} item={i} />
              ))}
            </div>
          ) : (
            <Empty
              title="Services coming soon"
              text="Message this vendor to discuss your event."
            />
          )}
        </section>
      ) : (
        <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
          <PublicReviews key={id} type="services" id={id} />
        </section>
      )}
      {vendor && <MediaGallery type="vendors" id={id} />}
      {vendor && <PublicReviews key={id} type="vendors" id={id} />}
      {mode && (
        <ServiceAction
          service={item}
          coverage={{
            ...r.data.coverage,
            businessLocations: r.data.businessLocations || [],
          }}
          packages={r.data.packages}
          items={r.data.items}
          mode={mode}
          close={() => setMode(null)}
        />
      )}
    </>
  );
}
