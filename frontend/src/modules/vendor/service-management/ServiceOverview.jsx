import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  ImageIcon,
  Images,
  MapPin,
  Package,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import { Image, Modal } from "../components/WorkspaceUI";
import { money } from "../services/workspace.api";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ServiceOverview({
  service: s,
  category,
  categoryFields = [],
  vendorName,
  onTabChange,
}) {
  const [galleryIndex, setGalleryIndex] = useState(null);
  const images = s.images || [];
  const attributes = Object.entries(s.attributes || {}).filter(
    ([, value]) => value != null && value !== "",
  );
  const included = (s.items || []).filter((item) => item.included);
  const location = [s.location?.city, s.location?.state]
    .filter(Boolean)
    .join(", ");
  const address = [
    s.location?.address,
    s.location?.city,
    s.location?.state,
    s.location?.zip,
  ]
    .filter(Boolean)
    .join(", ");
  const days = [...new Set(s.availability?.days || [])];
  const capacity = s.attributes?.maximumCapacity || s.attributes?.capacity;
  const unit = s.pricing?.unit;
  const customQuote = unit === "Custom" || s.pricing?.type === "CustomQuote";
  const pricingUnit = customQuote
    ? "Custom quotation"
    : unit === "Per KM"
      ? "Per kilometer"
      : unit;
  const active = s.status === "Approved" && s.active;
  const reviewing = ["Pending", "UnderReview"].includes(s.status);
  const moveGallery = (offset) =>
    setGalleryIndex(
      (index) => (index + offset + images.length) % images.length,
    );

  return (
    <div className="sd-overview">
      <div className="sd-section-heading">
        <div>
          <h2>Service overview</h2>
          <p>Your listing at a glance.</p>
        </div>
        <button
          type="button"
          className="sd-text-button"
          onClick={() => onTabChange("Images")}
        >
          <Images size={15} />{" "}
          {s.actions?.edit ? "Manage images" : "View images"}{" "}
          <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="sd-hero-grid">
        <div className="sd-gallery">
          {images.length ? (
            <>
              <button
                type="button"
                className="sd-cover"
                onClick={() => setGalleryIndex(0)}
                aria-label={`Open photo gallery for ${s.name}`}
              >
                <Image
                  src={images[0].url}
                  alt={s.name}
                  className="sd-cover-image"
                />
              </button>
              <span className="sd-photo-label">
                <ImageIcon size={13} /> Cover photo
              </span>
              <button
                type="button"
                className="sd-gallery-button"
                onClick={() => setGalleryIndex(0)}
              >
                <Images size={16} />{" "}
                {images.length === 1
                  ? "View photo"
                  : `View all ${images.length} photos`}
              </button>
            </>
          ) : (
            <div className="sd-no-photo">
              <Images size={36} strokeWidth={1.2} />
              <h3>Set the scene for your service</h3>
              <p>
                {s.actions?.edit
                  ? "Add photos that bring your listing to life."
                  : "Service photos will appear here once added."}
              </p>
              {s.actions?.edit && (
                <button
                  type="button"
                  className="sd-button"
                  onClick={() => onTabChange("Images")}
                >
                  Add service photos <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          )}
          {!!images.length && (
            <div className="sd-image-caption">
              <span>{category || "Service"}</span>
              {location && (
                <span>
                  <MapPin size={13} /> {location}
                </span>
              )}
            </div>
          )}
        </div>

        <aside
          className="sd-price-card"
          aria-label="Pricing and availability summary"
        >
          <div className="sd-price-heading">
            <span className="sd-eyebrow">STARTING FROM</span>
            <span className="sd-icon-tile">
              <Tag size={17} />
            </span>
          </div>
          <div className="sd-price">
            {customQuote && !Number(s.price) ? "On request" : money(s.price)}
          </div>
          {pricingUnit && <p className="sd-price-unit">{pricingUnit}</p>}
          <button
            type="button"
            className="sd-text-button sd-pricing-link"
            onClick={() => onTabChange("Pricing")}
          >
            View pricing breakdown <ArrowUpRight size={13} />
          </button>
          <dl className="sd-summary-list">
            <div>
              <dt>
                <Package size={16} /> Service type
              </dt>
              <dd>{s.serviceType || "Not specified"}</dd>
            </div>
            {capacity != null && (
              <div>
                <dt>
                  <Users size={16} /> Guest capacity
                </dt>
                <dd>Up to {capacity}</dd>
              </div>
            )}
            <div>
              <dt>
                <CalendarDays size={16} /> Working days
              </dt>
              <dd>
                {days.length === 7
                  ? "Every day"
                  : days.length
                    ? `${days.length} days a week`
                    : "Not set"}
              </dd>
            </div>
            <div>
              <dt>
                <Clock3 size={16} /> Advance notice
              </dt>
              <dd>
                {s.availability?.noticeHours != null
                  ? `${s.availability.noticeHours} hours`
                  : "Not set"}
              </dd>
            </div>
          </dl>
          <Link
            className="sd-button sd-button-primary"
            to={`/vendor/services/${s.id}/availability`}
          >
            <CalendarDays size={16} /> Manage availability{" "}
            <ArrowUpRight size={16} />
          </Link>
          <p className="sd-price-note">
            Keep your calendar up to date for every celebration.
          </p>
        </aside>
      </div>

      <div className="sd-details-grid">
        <div className="sd-main-column">
          <section className="sd-card sd-about">
            <div className="sd-card-heading">
              <h3>About this service</h3>
              <span className="sd-category-tag">{category || "Service"}</span>
            </div>
            {vendorName && (
              <p className="sd-byline">
                Offered by <strong>{vendorName}</strong>
              </p>
            )}
            {s.shortDescription && (
              <p className="sd-short-description">{s.shortDescription}</p>
            )}
            <p className="sd-description">
              {s.description ||
                "A detailed service description has not been added yet."}
            </p>
            {address && (
              <button
                type="button"
                className="sd-location-link"
                onClick={() => onTabChange("Location")}
              >
                <MapPin size={16} />
                <span>{address}</span>
                <ArrowUpRight size={14} />
              </button>
            )}
            {!!attributes.length && (
              <div className="sd-features">
                <h4>Service details & amenities</h4>
                <dl className="sd-attribute-grid">
                  {attributes.map(([key, value]) => (
                    <div
                      key={key}
                      className={
                        typeof value === "boolean" && value
                          ? "sd-feature-included"
                          : ""
                      }
                    >
                      <dt>
                        {categoryFields.find((field) => field.key === key)
                          ?.label || key.replace(/([A-Z])/g, " $1")}
                      </dt>
                      <dd>
                        {typeof value === "boolean" ? (
                          <>
                            {value && <Check size={14} aria-hidden="true" />}
                            {value ? "Available" : "Not available"}
                          </>
                        ) : (
                          String(value)
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>

          <section className="sd-card">
            <div className="sd-card-heading">
              <h3>What’s included</h3>
              <button
                type="button"
                className="sd-text-button"
                onClick={() => onTabChange("Service Items")}
              >
                All service items <ArrowUpRight size={14} />
              </button>
            </div>
            {included.length ? (
              <ul className="sd-included-list">
                {included.map((item, index) => (
                  <li key={item.id || index}>
                    <span className="sd-check">
                      <Check size={14} />
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      {item.description && <p>{item.description}</p>}
                    </div>
                    <span className="sd-item-quantity">
                      {item.quantity} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sd-muted">
                Included items haven’t been added to this service yet.
              </p>
            )}
            <button
              type="button"
              className="sd-package-link"
              onClick={() => onTabChange("Packages")}
            >
              <span className="sd-icon-tile">
                <Package size={18} />
              </span>
              <span>
                <strong>Packages for every occasion</strong>
                <small>View this service’s package options.</small>
              </span>
              <ArrowUpRight size={18} />
            </button>
          </section>
        </div>

        <div className="sd-side-column">
          <section className="sd-card sd-listing-card">
            <div className="sd-card-heading">
              <h3>Listing status</h3>
              <ShieldCheck size={18} />
            </div>
            <div className={`sd-listing-state ${active ? "sd-is-live" : ""}`}>
              <span />
              {active
                ? "Active listing"
                : reviewing
                  ? "Awaiting approval"
                  : s.status === "Approved"
                    ? "Inactive listing"
                    : s.status || "Draft"}
            </div>
            <p>
              {active
                ? "Your approved service is active. Keep its details and availability up to date."
                : reviewing
                  ? "Your listing is being reviewed. You can follow its progress in approval history."
                  : s.status === "Draft"
                    ? "Complete your service details, then submit your listing for review."
                    : s.status === "Rejected"
                      ? "Review the feedback above and update your service before resubmitting."
                      : s.status === "Approved"
                        ? "Your service is approved and currently inactive."
                        : "Check approval history for the latest updates to this listing."}
            </p>
            <button
              type="button"
              className="sd-text-button"
              onClick={() => onTabChange("Approval History")}
            >
              View approval history <ArrowUpRight size={14} />
            </button>
          </section>

          <section className="sd-card">
            <div className="sd-card-heading">
              <h3>Working schedule</h3>
              <CalendarDays size={18} />
            </div>
            <div className="sd-weekdays" aria-label="Regular working days">
              {weekdays.map((day, index) => (
                <span
                  key={day}
                  className={days.includes(index) ? "sd-day-active" : ""}
                  aria-label={`${day}: ${days.includes(index) ? "working day" : "not a working day"}`}
                >
                  {day}
                </span>
              ))}
            </div>
            <p className="sd-working-hours">
              {s.availability?.start && s.availability?.end
                ? `${s.availability.start} – ${s.availability.end}`
                : "Working hours not set"}
            </p>
            <p className="sd-muted">
              Regular hours. Blocked dates and bookings may affect availability.
            </p>
            <button
              type="button"
              className="sd-text-button"
              onClick={() => onTabChange("Availability")}
            >
              View availability details <ArrowUpRight size={14} />
            </button>
          </section>

          <section className="sd-card sd-policy-card">
            <div className="sd-card-heading">
              <h3>Booking policies</h3>
              <FileText size={18} />
            </div>
            <dl className="sd-policy-list">
              <div>
                <dt>Advance payment</dt>
                <dd>
                  {s.policies?.advanceRequired
                    ? `${s.policies.advancePercentage}% required`
                    : "Not required"}
                </dd>
              </div>
              <div>
                <dt>Cancellation</dt>
                <dd>
                  {s.policies?.cancellation
                    ? "Policy available"
                    : "Not specified"}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className="sd-text-button"
              onClick={() => onTabChange("Policies")}
            >
              View all policies <ArrowUpRight size={14} />
            </button>
          </section>
        </div>
      </div>

      {galleryIndex !== null && !!images.length && (
        <Modal
          title={`${s.name} · Photo gallery`}
          close={() => setGalleryIndex(null)}
          wide
        >
          <div
            className="sd-lightbox"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                moveGallery(event.key === "ArrowLeft" ? -1 : 1);
              }
            }}
          >
            <Image
              src={images[galleryIndex].url}
              alt={`${s.name}, photo ${galleryIndex + 1}`}
              className="sd-lightbox-image"
            />
            <div className="sd-gallery-controls">
              <button
                type="button"
                className="sd-button"
                onClick={() => moveGallery(-1)}
                disabled={images.length < 2}
                aria-label="Previous photo"
              >
                <ChevronLeft size={18} />
              </button>
              <span role="status" aria-live="polite">
                Photo {galleryIndex + 1} of {images.length}
              </span>
              <button
                type="button"
                className="sd-button"
                onClick={() => moveGallery(1)}
                disabled={images.length < 2}
                aria-label="Next photo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            {images.length > 1 && (
              <div className="sd-gallery-thumbnails">
                {images.map((photo, index) => (
                  <button
                    type="button"
                    key={photo.id || index}
                    aria-label={`Show photo ${index + 1}`}
                    aria-pressed={galleryIndex === index}
                    onClick={() => setGalleryIndex(index)}
                  >
                    <Image src={photo.url} alt="" className="sd-thumbnail" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
