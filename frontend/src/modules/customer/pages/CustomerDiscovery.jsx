import { useState, useEffect } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
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
import { ServiceCard } from "../components/ServiceCards";
import { save, money } from "../services/workspace.api";
export default function CustomerDiscovery() {
  const [params, setParams] = useSearchParams(),
    catalog = useCustomerData("/catalog"),
    [search, setSearch] = useState(params.get("q") || "");
  const queryText = params.get("q") || "";
  useEffect(() => {
    setSearch(queryText);
  }, [queryText]);
  useEffect(() => {
    if (params.get("venue") && catalog.data) {
      const category = catalog.data.categories.find(
        (c) => c.name === "Venue & Location",
      );
      if (category) {
        const n = new URLSearchParams(params);
        n.delete("venue");
        n.set("category", category.id);
        setParams(n, { replace: true });
      }
    }
  }, [catalog.data, params, setParams]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (params.get("q") || "")) {
        const n = new URLSearchParams(params);
        if (search) n.set("q", search);
        else n.delete("q");
        n.delete("page");
        setParams(n, { replace: true });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search, params, setParams]);
  const r = useCustomerData(`/discover?${params}`);
  function filter(k, v) {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    n.delete("page");
    setParams(n);
  }
  return (
    <>
      <Heading
        title="Find your kind of extraordinary"
        description="The right people make all the difference. Discover your dream team."
      />
      <div className="cw-discovery-filters">
        <label className="cw-search">
          <Search size={18} />
          <input
            aria-label="Search services or vendors"
            placeholder="Venues, photographers, a little magic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Browse type"
          value={params.get("type") || "services"}
          onChange={(e) => filter("type", e.target.value)}
        >
          <option value="services">Services</option>
          <option value="vendors">Vendors</option>
          <option value="packages">Packages</option>
          <option value="offers">Vendors with offers</option>
        </select>
        <select
          aria-label="Category"
          value={params.get("category") || ""}
          onChange={(e) => filter("category", e.target.value)}
        >
          <option value="">All categories</option>
          {catalog.data?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Location"
          value={params.get("city") || ""}
          onChange={(e) => filter("city", e.target.value)}
        >
          <option value="">All locations</option>
          {catalog.data?.cities.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          key={`min-${params.get("min") || ""}`}
          aria-label="Minimum price"
          placeholder="Min ₹"
          defaultValue={params.get("min") || ""}
          onBlur={(e) => filter("min", e.target.value)}
        />
        <input
          type="number"
          min="0"
          key={`max-${params.get("max") || ""}`}
          aria-label="Maximum price"
          placeholder="Max ₹"
          defaultValue={params.get("max") || ""}
          onBlur={(e) => filter("max", e.target.value)}
        />
        <select
          aria-label="Minimum rating"
          value={params.get("rating") || ""}
          onChange={(e) => filter("rating", e.target.value)}
        >
          <option value="">All ratings</option>
          {[4, 3, 2].map((v) => (
            <option key={v} value={v}>
              {v} stars & above
            </option>
          ))}
        </select>
        <button
          className="cw-button"
          onClick={() => {
            setSearch("");
            setParams({});
          }}
        >
          Clear filters
        </button>
      </div>
      {catalog.error && (
        <ErrorView error={catalog.error} retry={catalog.retry} />
      )}
      <p className="cw-results-label">
        <SlidersHorizontal size={14} />
        {r.loading
          ? "Finding beautiful possibilities…"
          : `${r.data?.total || 0} possibilities for your celebration`}
      </p>
      {r.loading ? (
        <div
          className="cw-discovery-grid"
          role="status"
          aria-label="Loading services"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="cw-skeleton cw-card-skeleton" key={i} />
          ))}
        </div>
      ) : r.error ? (
        <ErrorView error={r.error} retry={r.retry} />
      ) : !r.data.rows.length ? (
        <Empty
          title="Let’s try a different combination"
          text="Try another location, category or price range to find your match."
        />
      ) : (
        <>
          <div className="cw-discovery-grid">
            {r.data.rows.map((i) => (
              <ServiceCard key={i.id} item={i} />
            ))}
          </div>
          <div className="cw-pagination">
            <button
              className="cw-button"
              disabled={r.data.page === 1}
              onClick={() => {
                const n = new URLSearchParams(params);
                n.set("page", r.data.page - 1);
                setParams(n);
              }}
            >
              Previous
            </button>
            <span>
              Page {r.data.page} of {Math.ceil(r.data.total / r.data.pageSize)}
            </span>
            <button
              className="cw-button"
              disabled={r.data.page * r.data.pageSize >= r.data.total}
              onClick={() => {
                const n = new URLSearchParams(params);
                n.set("page", r.data.page + 1);
                setParams(n);
              }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </>
  );
}
function ServiceAction({ service, packages, items = [], mode, close }) {
  const events = useCustomerData("/records/events?pageSize=50"),
    { notify } = useAuth(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(null),
    [reviewBody, setReviewBody] = useState(null),
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
              className="cw-button cw-primary"
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
              className="cw-button"
              onClick={() => setPreview(null)}
            >
              Edit selection
            </button>
          </div>
          {error && (
            <p role="alert" className="cw-form-error">
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
            <Link className="cw-button" to="/customer/events?create=1">
              Create an event
            </Link>
          }
        />
      ) : (
        <form
          hidden={!!preview}
          style={preview ? { display: "none" } : undefined}
          className="cw-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            setBusy(true);
            setError("");
            try {
              const b = {
                eventId: f.eventId,
                serviceId: service.id,
                ...(f.packageId ? { packageId: f.packageId } : {}),
                ...(mode === "book"
                  ? {
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
                  : { message: f.message }),
              };
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
            <select name="eventId" required>
              {events.data.rows
                .filter((e) => ["Planning", "Confirmed"].includes(e.status))
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {String(e.eventDate).slice(0, 10)}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Service or package">
            <select name="packageId" defaultValue={params.get("package") || ""}>
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
          {mode === "book" && (
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
          )}
          {error && (
            <p className="cw-form-error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy} className="cw-button cw-primary">
            {busy
              ? "Sending…"
              : mode === "book"
                ? "Review booking"
                : "Request quotation"}
          </button>
        </form>
      )}
    </Modal>
  );
}
export function CustomerServiceDetails({ vendor = false }) {
  const { id } = useParams(),
    r = useCustomerData(`/${vendor ? "vendors" : "services"}/${id}`),
    { notify, reload } = useAuth(),
    navigate = useNavigate(),
    [mode, setMode] = useState(null),
    [busy, setBusy] = useState(false);
  if (r.loading) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  const item = vendor ? r.data.vendor : r.data.service;
  async function message() {
    setBusy(true);
    try {
      const c = await save("/conversations", "POST", {
        vendorId: vendor ? item.id : item.vendorId,
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
      <section className="cw-detail-hero">
        {(item.cover || item.image) && (
          <img src={item.cover || item.image} alt={item.name} />
        )}
        <div>
          <span className="cw-eyebrow">
            {vendor ? "MEET YOUR VENDOR" : item.category}
          </span>
          <h1>{item.name}</h1>
          <p>
            <MapPin size={15} />
            {item.city || "Location on request"} <Star size={15} />{" "}
            {Number(item.rating || 0).toFixed(1)} · {item.reviews || 0} reviews
          </p>
          <div className="cw-detail-actions">
            {!vendor && (
              <>
                <button
                  className="cw-button cw-primary"
                  onClick={() => setMode("quote")}
                >
                  <FileText size={16} /> Request quotation
                </button>
                <button className="cw-button" onClick={() => setMode("book")}>
                  <ShoppingBag size={16} /> Book service
                </button>
              </>
            )}
            <button className="cw-button" disabled={busy} onClick={message}>
              <MessagesSquare size={16} /> Message vendor
            </button>
            <button
              className="cw-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await save("/wishlist", "POST", {
                    type: vendor ? "Vendor" : "Service",
                    id: item.id,
                  });
                  notify(result.message);
                  await reload();
                } catch (e) {
                  notify(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Heart size={16} /> Save
            </button>
          </div>
        </div>
      </section>
      <div className="cw-detail-columns">
        <section className="cw-panel cw-prose">
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
                className="cw-button"
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
          <section className="cw-panel cw-prose">
            <h2>Packages</h2>
            {r.data.packages.length ? (
              r.data.packages.map((p) => (
                <div className="cw-package-option" key={p.id}>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
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
                    className="cw-button"
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
            <div className="cw-discovery-grid">
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
        <section className="cw-panel cw-prose">
          <h2>Customer experiences</h2>
          {r.data.reviews.length ? (
            r.data.reviews.map((r, i) => (
              <div key={i} className="cw-review">
                <strong>
                  {r.customer} · {r.rating}/5
                </strong>
                <p>{r.text}</p>
              </div>
            ))
          ) : (
            <p>No published reviews yet.</p>
          )}
        </section>
      )}
      {mode && (
        <ServiceAction
          service={item}
          packages={r.data.packages}
          items={r.data.items}
          mode={mode}
          close={() => setMode(null)}
        />
      )}
    </>
  );
}
