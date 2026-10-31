import WishlistButton from "../customer/components/WishlistButton";
import { useState } from "react";
import {
  Link,
  useParams,
  useLocation,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  MapPin,
  Star,
  Share2,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { save } from "../customer/services/workspace.api";
import { useMarketplace, money } from "./api";
import { DiscoveryCard, ReadState } from "./BrowsePage";
import "./marketplace.css";
export function AvailabilityCalendar({ id }) {
  const [from, setFrom] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
  );
  const state = useMarketplace(`/services/${id}/availability?from=${from}`);
  return (
    <section className="cm-panel">
      <h2>Availability</h2>
      <label>
        Starting date
        <input
          type="date"
          value={from}
          onChange={(e) => {
            if (e.target.value) setFrom(e.target.value);
          }}
        />
      </label>
      <ReadState state={state} />
      {state.data && (
        <div className="cm-calendar">
          {state.data.days.map((d) => (
            <span
              key={d.date}
              aria-disabled={!d.available}
              title={`${d.date}: ${d.reason || "Available to request"}`}
              aria-label={`${d.date}: ${d.reason || "Available to request"}`}
            >
              {d.date.slice(8)}
            </span>
          ))}
        </div>
      )}
      <p>
        Available dates can be requested. The server checks availability again
        when booking.
      </p>
    </section>
  );
}
export default function DetailPage() {
  const { id } = useParams(),
    location = useLocation(),
    [params, setParams] = useSearchParams(),
    vendor = location.pathname.startsWith("/vendors"),
    pack = location.pathname.startsWith("/packages"),
    packageRoute = useMarketplace(pack ? `/packages/${id}` : null);
  const serviceId = pack ? packageRoute.data?.serviceId : id;
  const state = useMarketplace(
      serviceId
        ? `/${vendor ? "vendors" : "services"}/${serviceId}?reviewSort=${params.get("reviewSort") || "newest"}`
        : null,
    ),
    { user, notify, reload } = useAuth(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [shareNotice, setShareNotice] = useState("");
  if (packageRoute.loading || packageRoute.error)
    return (
      <main className="customer-marketplace">
        <ReadState state={packageRoute} />
      </main>
    );
  if (state.loading || state.error || !state.data)
    return (
      <main className="customer-marketplace">
        <ReadState state={state} />
      </main>
    );
  const d = state.data,
    item = vendor ? d.vendor : d.service,
    privatePath = `/customer/${vendor ? "vendors" : "services"}/${item.id}`;
  function begin(action, packageId) {
    const path = `${privatePath}?${new URLSearchParams({ ...(!vendor ? { action } : {}), ...(packageId ? { package: packageId } : {}) })}`;
    navigate(user ? path : `/auth/login?redirect=${encodeURIComponent(path)}`);
  }
  async function message() {
    if (!user) {
      begin("message");
      return;
    }
    setBusy(true);
    try {
      const result = await save("/conversations", "POST", {
        vendorId: vendor ? item.id : item.vendorId,
        ...(!vendor ? { serviceId: item.id } : {}),
        ...(pack ? { packageId:id } : {}),
      });
      navigate(`/customer/messages?conversation=${result.id}`);
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  const selectedPackage = pack ? id : params.get("package");
  const canBook =
    !vendor &&
    (item.pricingType !== "CustomQuote" ||
      d.packages.some(
        (p) => p.id.toLowerCase() === selectedPackage?.toLowerCase(),
      ));
  const attributes =
    !vendor && item.attributes ? JSON.parse(item.attributes) : {};
  return (
    <main id="main-content" className="customer-marketplace">
      <nav aria-label="Breadcrumb">
        <Link to="/">Home</Link> /{" "}
        <Link to={vendor ? "/vendors" : "/services"}>
          {vendor ? "Vendors" : "Services"}
        </Link>{" "}
        / {item.name}
      </nav>
      <p className="cm-kicker">
        {vendor ? "YOUR WEDDING DREAM TEAM" : item.category}
      </p>
      <h1>{item.name}</h1>
      <p className="cm-meta">
        <MapPin size={16} />
        {item.city || "Location on request"} <Star size={16} />
        {Number(item.rating || 0).toFixed(1)} · {item.reviews || 0} reviews{" "}
        {vendor && (
          <>
            <ShieldCheck size={16} />
            Approved vendor
          </>
        )}
      </p>
      {!vendor && (
        <Link to={`/vendors/${item.vendorId}`}>By {item.vendor}</Link>
      )}
      <div className="cm-actions">
        {!vendor && (
          <>
            {canBook && (
              <button
                className="cm-primary"
                onClick={() => begin("book", pack ? id : params.get("package"))}
              >
                Book now
              </button>
            )}
            <button
              disabled={item.customQuote === false || item.customQuote === 0}
              title={
                item.customQuote === false || item.customQuote === 0
                  ? "Custom quotations are unavailable for this service."
                  : undefined
              }
              onClick={() => begin("quote", pack ? id : params.get("package"))}
            >
              Request quotation
            </button>
          </>
        )}
        <button onClick={message} disabled={busy}>
          <MessageSquare size={16} />
          Message vendor
        </button>
        <WishlistButton
          type={
            vendor
              ? "Vendor"
              : pack || params.get("package")
                ? "Package"
                : "Service"
          }
          id={pack ? id : params.get("package") || item.id}
          className="cm-button"
        />
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setShareNotice("Link copied.");
            } catch {
              setShareNotice(`Share this link: ${window.location.href}`);
            }
          }}
        >
          <Share2 size={16} />
          Share
        </button>
        <span role="status">{shareNotice}</span>
      </div>
      <div className="cm-gallery">
        {vendor
          ? (item.cover || item.image) && (
              <img src={item.cover || item.image} alt={item.name} />
            )
          : d.gallery.map((m, i) => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open photo ${i + 1}`}
              >
                <img
                  src={m.url}
                  alt={`${item.name}, photo ${i + 1}`}
                  loading={i ? "lazy" : "eager"}
                />
              </a>
            ))}
      </div>
      <div className="cm-detail">
        <div>
          <section className="cm-panel">
            <h2>{vendor ? "Meet the business" : "About this service"}</h2>
            <p>
              {item.description ||
                "Message the vendor to discuss the details of your celebration."}
            </p>
            {vendor ? (
              <>
                <h3>Categories</h3>
                <p>
                  {d.categories.map((c) => c.name).join(" · ") ||
                    "Explore services below"}
                </p>
                <h3>Service locations</h3>
                {d.locations.map((l, i) => (
                  <p key={i}>
                    {l.city}, {l.state}
                  </p>
                ))}
              </>
            ) : (
              <>
                <p>
                  Pricing: {item.pricingType} · {item.minGuests || "Flexible"}–
                  {item.maxGuests || "flexible"} guests
                </p>
                <p>
                  Coverage:{" "}
                  {d.coverage.mode || "Discuss your location with the vendor"}{" "}
                  {d.coverage.city}
                </p>
                {Object.entries(attributes).map(([k, v]) => (
                  <p key={k}>
                    <strong>{k.replace(/([A-Z])/g, " $1")}: </strong>
                    {typeof v === "boolean"
                      ? v
                        ? "Included"
                        : "Not included"
                      : String(v)}
                  </p>
                ))}
                <h3>Inclusions and optional items</h3>
                {d.items.length ? (
                  d.items.map((i) => (
                    <p key={i.id}>
                      {i.name} · {i.included ? "Included" : money(i.price)}
                      {i.description ? ` — ${i.description}` : ""}
                    </p>
                  ))
                ) : (
                  <p>Request a tailored quotation for your requirements.</p>
                )}
              </>
            )}
          </section>
          {!vendor && (
            <>
              <section className="cm-panel">
                <h2>Packages</h2>
                {d.packages.length ? (
                  d.packages.map((p) => (
                    <article key={p.id}>
                      <h3>{p.name}</h3>
                      <p>{p.description}</p>
                      <p className="cm-price">{money(p.price)}</p>
                      <p>
                        {p.minGuests || "Flexible"}–{p.maxGuests || "flexible"}{" "}
                        guests
                      </p>
                      <button
                        className="cm-primary"
                        onClick={() => begin("book", p.id)}
                      >
                        Choose this package
                      </button>
                    </article>
                  ))
                ) : (
                  <p>No packages published. Request a customized quotation.</p>
                )}
              </section>
              <AvailabilityCalendar id={item.id} />
              <section className="cm-panel">
                <h2>Booking policies</h2>
                {[
                  ["Cancellation", d.policies.cancellation],
                  ["Refund", d.policies.refund],
                  ["Rescheduling", d.policies.rescheduling],
                  ["Terms", d.policies.terms],
                ].map(([label, value]) => (
                  <p key={label}>
                    <strong>{label}: </strong>
                    {value ||
                      "Confirm the terms with your vendor before submitting a booking."}
                  </p>
                ))}
              </section>
            </>
          )}
          <section className="cm-panel">
            <h2>Customer experiences</h2>
            {!vendor && (
              <label>
                Sort reviews
                <select
                  value={params.get("reviewSort") || "newest"}
                  onChange={(e) =>
                    setParams((p) => {
                      const n = new URLSearchParams(p);
                      n.set("reviewSort", e.target.value);
                      return n;
                    })
                  }
                >
                  <option value="newest">Newest</option>
                  <option value="highest">Highest rated</option>
                  <option value="lowest">Lowest rated</option>
                </select>
              </label>
            )}
            {d.reviews.length ? (
              d.reviews.map((r) => (
                <article className="cm-review" key={r.id}>
                  <strong>
                    {r.customer} · {r.rating}/5
                  </strong>
                  <p>{r.verified ? "Verified booking" : ""}</p>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </article>
              ))
            ) : (
              <p>No published reviews yet.</p>
            )}
          </section>
        </div>
        <aside className="cm-sticky cm-panel">
          <p className="cm-kicker">YOUR CELEBRATION, BEAUTIFULLY PLANNED</p>
          <h2>
            {vendor
              ? "Find your perfect service"
              : "Make this part of your day"}
          </h2>
          {vendor ? (
            <a href="#vendor-services" className="cm-button cm-primary">
              View services
            </a>
          ) : (
            <>
              <p className="cm-price">
                {item.price ? money(item.price) : "Custom quotation"}
              </p>
              <p>
                Final prices, taxes and fees are calculated on the server for
                your event.
              </p>
              <div className="cm-actions">
                {canBook && (
                  <button
                    className="cm-primary"
                    onClick={() =>
                      begin("book", pack ? id : params.get("package"))
                    }
                  >
                    Book now
                  </button>
                )}
                <button
                  disabled={
                    item.customQuote === false || item.customQuote === 0
                  }
                  title={
                    item.customQuote === false || item.customQuote === 0
                      ? "Custom quotations are unavailable for this service."
                      : undefined
                  }
                  onClick={() =>
                    begin("quote", pack ? id : params.get("package"))
                  }
                >
                  Request quotation
                </button>
              </div>
            </>
          )}
          <p>
            Your event, guest count and preferences are selected in your secure
            customer workspace.
          </p>
        </aside>
      </div>
      {vendor && (
        <section id="vendor-services">
          <h2>Services by {item.name}</h2>
          {d.services.length ? (
            <div className="cm-grid">
              {d.services.map((s) => (
                <DiscoveryCard key={s.id} item={s} />
              ))}
            </div>
          ) : (
            <p>No services published yet.</p>
          )}
        </section>
      )}
    </main>
  );
}
