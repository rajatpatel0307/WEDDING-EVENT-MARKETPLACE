import OfferActions, { OfferPrices } from "../commerce/OfferActions";
import { MediaGallery } from '../media/MediaLibrary';
import { PublicReviews } from '../reviews/Reviews';
import { useReviews } from '../reviews/api';
import WishlistButton from "../customer/components/WishlistButton";
import { useEffect, useRef, useState } from "react";
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
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  Users,
  CalendarDays,
  Tag,
  PackageOpen,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { save } from "../customer/services/workspace.api";
import { useMarketplace, money } from "./api";
import { DiscoveryCard, ReadState } from "./BrowsePage";
import "./marketplace.css";
import "./detail-page.css";

function ListingSectionNavigation({ vendor, hasOffer, reviewCount }) {
  const [active, setActive] = useState("listing-overview");
  const nav = useRef(null);
  const sections = [
    ["listing-overview", "Overview"],
    ...(!vendor ? [["listing-packages", "Packages"]] : []),
    ...(!vendor && !hasOffer ? [["listing-availability", "Availability"]] : []),
    ...(!vendor ? [["listing-policies", "Policies"]] : []),
    ["listing-reviews", "Reviews"],
    ...(vendor ? [["vendor-services", "Services"]] : []),
  ];
  useEffect(() => {
    let frame;
    const ids = ["listing-overview", ...(!vendor ? ["listing-packages", ...(!hasOffer ? ["listing-availability"] : []), "listing-policies"] : []), "listing-reviews", ...(vendor ? ["vendor-services"] : [])];
    const update = () => {
      const threshold = (nav.current?.getBoundingClientRect().bottom || 180) + 60;
      const current = ids.filter((id) => {
        const section = document.getElementById(id);
        return section && section.getBoundingClientRect().top <= threshold;
      }).at(-1);
      setActive(current || ids[0]);
      frame = undefined;
    };
    const schedule = () => { if (frame === undefined) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [vendor, hasOffer]);
  return (
    <nav ref={nav} className="cm-section-nav" aria-label="Listing sections">
      {sections.map(([id, label]) => (
        <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}>
          {label}{id === "listing-reviews" && reviewCount > 0 && <span>{reviewCount}</span>}
        </a>
      ))}
      <a className="cm-nav-enquiry" href="#listing-booking">Enquire now<ArrowUpRight size={14} aria-hidden="true" /></a>
    </nav>
  );
}

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
    [params] = useSearchParams(),
    vendor = location.pathname.startsWith("/vendors"),
    pack = location.pathname.startsWith("/packages"),
    packageRoute = useMarketplace(pack ? `/packages/${id}` : null);
  const packageRating = useReviews(pack ? `/packages/${id}/rating-summary` : null);
  const serviceId = pack ? packageRoute.data?.serviceId : id;
  const state = useMarketplace(
      serviceId
        ? `/${vendor ? "vendors" : "services"}/${serviceId}?reviewSort=${params.get("reviewSort") || "newest"}`
        : null,
    ),
    { user, notify } = useAuth(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [shareNotice, setShareNotice] = useState("");
  if (packageRoute.loading || packageRoute.error)
    return (
      <main id="main-content" className="customer-marketplace cm-detail-page">
        <ReadState state={packageRoute} />
      </main>
    );
  if (state.loading || state.error || !state.data)
    return (
      <main id="main-content" className="customer-marketplace cm-detail-page">
        <ReadState state={state} />
      </main>
    );
  const d = state.data,
    item = vendor ? d.vendor : d.service,
    privatePath = `/customer/${vendor ? "vendors" : "services"}/${item.id}`;
  const bookingAllowed = item.bookingAccessStatus === "Approved" && item.bookEnabled !== false && item.bookEnabled !== 0;
  function begin(action, packageId) {
    if (action === "book" && !bookingAllowed) return;
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
    !item.offer &&
    (item.pricingType !== "CustomQuote" ||
      d.packages.some(
        (p) => p.id.toLowerCase() === selectedPackage?.toLowerCase(),
      ));
  const attributes =
    !vendor && item.attributes ? JSON.parse(item.attributes) : {};
  const reviewCount = (pack ? packageRating.data?.totalReviews : item.reviews) || 0;
  const rating = Number((pack ? packageRating.data?.averageRating : item.rating) || 0).toFixed(1);
  const galleryType = vendor ? "vendors" : pack ? "packages" : "services";
  const hostName = vendor ? item.name : item.vendor || "Your vendor";
  const guestRange = item.minGuests && item.maxGuests
    ? `${item.minGuests}–${item.maxGuests} guests`
    : item.maxGuests ? `Up to ${item.maxGuests} guests`
      : item.minGuests ? `From ${item.minGuests} guests` : "Flexible guest count";
  const quotationDisabled = item.customQuote === false || item.customQuote === 0;
  return (
    <main id="main-content" className="customer-marketplace cm-detail-page">
      <nav className="cm-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link><ChevronRight size={12} aria-hidden="true" />
        <Link to={vendor ? "/vendors" : "/services"}>{vendor ? "Vendors" : "Services"}</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span aria-current="page">{item.name}</span>
      </nav>

      <header className="cm-listing-header">
        <div>
          <p className="cm-kicker">{vendor ? "YOUR WEDDING DREAM TEAM" : item.category}</p>
          <h1>{item.name}</h1>
          <div className="cm-listing-meta">
            <span><MapPin size={16} aria-hidden="true" />{item.city || "Location on request"}</span>
            <span className="cm-meta-divider" aria-hidden="true" />
            <a href="#listing-reviews"><Star size={15} aria-hidden="true" />
              {reviewCount ? <><strong>{rating}</strong><span>({reviewCount} reviews)</span></> : "No reviews yet"}
            </a>
            {vendor && <span className="cm-approved"><ShieldCheck size={15} aria-hidden="true" />Approved vendor</span>}
          </div>
        </div>
        <div className="cm-listing-tools">
          <WishlistButton
            type={vendor ? "Vendor" : pack || params.get("package") ? "Package" : "Service"}
            id={pack ? id : params.get("package") || item.id}
            className="cm-button"
          />
          <button onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setShareNotice("Link copied.");
            } catch {
              setShareNotice(`Share this link: ${window.location.href}`);
            }
          }}><Share2 size={16} aria-hidden="true" />Share</button>
          <span className="cm-share-notice" role="status">{shareNotice}</span>
        </div>
      </header>

      <div className="cm-gallery-stage">
        <MediaGallery
            key={`${galleryType}:${id}`}
            type={galleryType}
            id={id}
            variant="editorial"
            fallbackImage={item.cover || item.image}
            title={item.name}
        />
        <div className="cm-gallery-caption"><span>A SPACE FOR YOUR STORY</span><span>{item.city || "Discover the details"}<span className="cm-caption-line" aria-hidden="true" /></span></div>
      </div>

      {!vendor && <div className="cm-highlights" aria-label="Service highlights">
        <div><span className="cm-highlight-icon"><Users size={22} strokeWidth={1.4} aria-hidden="true" /></span><span>Room for your people<strong>{guestRange}</strong></span></div>
        <div><span className="cm-highlight-icon"><MapPin size={22} strokeWidth={1.4} aria-hidden="true" /></span><span>The setting<strong>{item.city || "Location on request"}</strong></span></div>
        <div><span className="cm-highlight-icon"><Tag size={22} strokeWidth={1.4} aria-hidden="true" /></span><span>The experience<strong>{item.category || "Wedding service"}</strong></span></div>
      </div>}

      <ListingSectionNavigation key={id} vendor={vendor} hasOffer={!!item.offer} reviewCount={reviewCount} />

      <div className="cm-listing-layout">
        <div className="cm-listing-content">

          <section id="listing-overview" className="cm-panel cm-overview">
            <div className="cm-section-heading"><span className="cm-section-number" aria-hidden="true">01</span><div><p className="cm-kicker">THE DETAILS THAT MATTER</p><h2>{vendor ? "Meet the business" : "A place in your story."}</h2></div></div>
            <p className="cm-description">{item.description || "Message the vendor to discuss the details of your celebration."}</p>
            {vendor ? (
              <div className="cm-business-details">
                <div><h3>Categories</h3><p>{d.categories.map((c) => c.name).join(" · ") || "Explore services below"}</p></div>
                <div><h3>Service locations</h3>{d.locations.map((l, i) => <p key={i}>{l.city}, {l.state}</p>)}</div>
              </div>
            ) : (
              <>
                <div className="cm-service-details">
                  <div><Tag size={17} strokeWidth={1.5} aria-hidden="true" /><span>Pricing<strong>{item.pricingType?.replace(/([a-z])([A-Z])/g, "$1 $2") || "On request"}</strong></span></div>
                  <div><MapPin size={17} strokeWidth={1.5} aria-hidden="true" /><span>Coverage<strong>{[d.coverage.mode, d.coverage.city].filter(Boolean).join(" · ") || "Discuss with vendor"}</strong></span></div>
                </div>
                {Object.keys(attributes).length > 0 && <dl className="cm-attributes">{Object.entries(attributes).map(([k, v]) => (
                  <div key={k}><dt>{k.replace(/([A-Z])/g, " $1")}</dt><dd>{typeof v === "boolean" ? v ? "Included" : "Not included" : String(v)}</dd></div>
                ))}</dl>}
                <h3>Inclusions & optional extras</h3>
                {d.items.length ? <ul className="cm-inclusions">{d.items.map((i) => (
                  <li key={i.id}><span>{i.name}{i.description && <small>{i.description}</small>}</span><strong>{i.included ? "Included" : money(i.price)}</strong></li>
                ))}</ul> : <p>Request a tailored quotation for your requirements.</p>}
              </>
            )}
          </section>

          {!vendor && (
            <>
              <section id="listing-packages" className="cm-panel">
                <div className="cm-section-heading"><span className="cm-section-number" aria-hidden="true">02</span><div><p className="cm-kicker">BEAUTIFULLY BROUGHT TOGETHER</p><h2>Thoughtfully packaged.</h2></div></div>
                {d.packages.length ? <div className="cm-package-list">{d.packages.map((p) => (
                  <article className="cm-package-card" key={p.id}>
                    <div><h3>{p.name}</h3><p>{p.description}</p><span className="cm-meta"><Users size={15} aria-hidden="true" />{p.minGuests || "Flexible"}–{p.maxGuests || "flexible"} guests</span></div>
                    <div><p className="cm-price">{money(p.price)}</p><button className="cm-primary" disabled={!bookingAllowed || !!item.offer} onClick={() => begin("book", p.id)}>Choose package<ArrowUpRight size={15} aria-hidden="true" /></button></div>
                  </article>
                ))}</div> : <div className="cm-package-empty"><PackageOpen size={26} strokeWidth={1.3} aria-hidden="true" /><div><strong>A celebration, tailored to you.</strong><p>No packages published yet. Message the vendor to discuss your requirements.</p></div></div>}
              </section>
              {!item.offer && <div id="listing-availability"><AvailabilityCalendar id={item.id} /></div>}
              <section id="listing-policies" className="cm-panel">
                <div className="cm-section-heading"><span className="cm-section-number" aria-hidden="true">03</span><div><p className="cm-kicker">A LITTLE CLARITY, BEFORE YOU COMMIT</p><h2>The finer details.</h2></div></div>
                <div className="cm-policy-list">{[
                  ["Cancellation", d.policies.cancellation],
                  ["Refund", d.policies.refund],
                  ["Rescheduling", d.policies.rescheduling],
                  ["Terms", d.policies.terms],
                ].map(([label, value]) => <details key={label}><summary>{label}<ChevronDown size={16} aria-hidden="true" /></summary><p>{value || "Confirm the terms with your vendor before submitting a booking."}</p></details>)}</div>
              </section>
            </>
          )}
          <div id="listing-reviews"><PublicReviews key={`${galleryType}:${id}`} type={galleryType} id={id} /></div>
          {vendor && <section id="vendor-services" className="cm-panel">
            <p className="cm-kicker">FIND YOUR PERFECT FIT</p>
            <h2>Services by {item.name}</h2>
            {d.services.length ? <div className="cm-grid">{d.services.map((s) => <DiscoveryCard key={s.id} item={s} />)}</div> : <p>No services published yet.</p>}
          </section>}
        </div>

        <aside id="listing-booking" className="cm-panel cm-reservation" aria-label={vendor ? "Contact vendor" : "Pricing and booking"}>
          <div className="cm-reservation-label"><p className="cm-kicker">YOUR DAY. YOUR WAY.</p><span className="cm-reservation-mark" aria-hidden="true">✳</span></div>
          <h2>{vendor ? "Let’s plan something special." : "Make it part of your day."}</h2>
          <p className="cm-reservation-intro">{vendor ? "Find the right services for your celebration." : "A beautiful celebration starts with the right details."}</p>
          {vendor ? <a href="#vendor-services" className="cm-button cm-primary">Explore services<ArrowUpRight size={16} aria-hidden="true" /></a> : item.offer ? (
            <div className="cm-booking-offer"><OfferPrices item={item} /><OfferActions item={item} /></div>
          ) : (
            <>
              <div className="cm-starting-price"><span>Starting from</span><p className="cm-price">{item.price ? money(item.price) : "Custom quotation"}</p><small>Final pricing depends on your event requirements.</small></div>
              <div className="cm-actions cm-booking-actions">
                {canBook && <button className="cm-primary" disabled={!bookingAllowed || !!item.offer} onClick={() => begin("book", pack ? id : params.get("package"))}>Book now<ArrowUpRight size={16} aria-hidden="true" /></button>}
                <button disabled={quotationDisabled} title={quotationDisabled ? "Custom quotations are unavailable for this service." : undefined} onClick={() => begin("quote", pack ? id : params.get("package"))}>Request quotation</button>
              </div>
            </>
          )}
          {!vendor && !bookingAllowed && <p className="cm-booking-unavailable" role="status">This vendor is currently unavailable for new bookings.</p>}
          <div className="cm-host">
            <span className="cm-host-avatar" aria-hidden="true">{hostName.trim().charAt(0).toUpperCase()}</span>
            <div><span>{vendor ? "Meet your vendor" : "Offered by"}</span><Link to={`/vendors/${vendor ? item.id : item.vendorId}`}>{hostName}<ArrowUpRight size={13} aria-hidden="true" /></Link></div>
          </div>
          <button className="cm-message-button" onClick={message} disabled={busy}><MessageSquare size={17} aria-hidden="true" />{busy ? "Opening conversation…" : "Message vendor"}</button>
          <span className="cm-message-hint">A conversation is a lovely place to start.</span>
          <div className="cm-booking-note"><CalendarDays size={17} strokeWidth={1.5} aria-hidden="true" /><p>Discuss your date, guest count, and the little details that make it yours.</p></div>
        </aside>
      </div>
    </main>
  );
}
