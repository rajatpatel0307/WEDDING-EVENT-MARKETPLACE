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
    ? "Custom pricing"
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
    <div className="sd-overview pb-[8px]">
      <div className="sd-section-heading flex items-center justify-between gap-[16px] mb-[18px] [&_h2]:m-0 [&_h2]:font-serif [&_h2]:text-[23px] [&_h2]:font-normal [&_h2]:tracking-[-0.4px] [&_p]:mt-[4px] [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[12px] [&_p]:text-[color:var(--sd-muted)] max-[760.001px]:[&_h2]:text-[22px] max-[760.001px]:[&_p]:text-[11px] max-[760.001px]:[&_>_.sd-text-button]:text-[11px] max-[480.001px]:flex-wrap max-[480.001px]:gap-[9px] max-[480.001px]:[&_>_.sd-text-button]:ml-auto">
        <div>
          <h2>Service overview</h2>
          <p>Your listing at a glance.</p>
        </div>
        <button
          type="button"
          className="sd-text-button inline-flex items-center justify-start gap-[6px] py-[3px] px-0 border-0 bg-transparent text-[color:var(--sd-green)] text-[12px] font-medium text-left leading-[1.5] [&:hover]:text-[#142f21] [&:hover]:underline [&:hover]:underline-offset-[4px]"
          onClick={() => onTabChange("Images")}
        >
          <Images size={15} />{" "}
          {s.actions?.edit ? "Manage images" : "View images"}{" "}
          <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="sd-hero-grid grid grid-cols-[minmax(0,_1fr)_330px] gap-[22px] min-[1500px]:grid-cols-[minmax(0,_1fr)_360px] min-[1500px]:gap-[26px] max-[1150.001px]:grid-cols-[minmax(0,_1fr)_285px] max-[1150.001px]:gap-[18px] max-[760.001px]:grid-cols-[minmax(0,_1fr)] max-[760.001px]:gap-[18px]">
        <div className="sd-gallery relative min-w-0 min-h-[360px] overflow-hidden border border-[#dce3d9] rounded-[13px] bg-[#eaf0e7] min-[1500px]:min-h-[390px] max-[760.001px]:min-h-[280px] max-[480.001px]:min-h-[240px]">
          {images.length ? (
            <>
              <button
                type="button"
                className="sd-cover block w-full h-full min-h-[360px] p-0 border-0 bg-transparent [&:focus-visible]:outline-offset-[-6px]! min-[1500px]:min-h-[390px] max-[760.001px]:min-h-[280px] max-[480.001px]:min-h-[240px]"
                onClick={() => setGalleryIndex(0)}
                aria-label={`Open photo gallery for ${s.name}`}
              >
                <Image
                  src={images[0].url}
                  alt={s.name}
                  className="sd-cover-image block w-full h-full min-h-[360px] max-h-[460px] object-cover min-[1500px]:min-h-[390px] max-[760.001px]:min-h-[280px] max-[760.001px]:h-[320px] max-[480.001px]:min-h-[240px] max-[480.001px]:h-[260px]"
                />
              </button>
              <span className="sd-photo-label inline-flex items-center gap-[6px] absolute top-[17px] left-[17px] py-[6px] px-[10px] border border-[#ffffff50] rounded-[6px] bg-[#20332b99] text-white text-[10px] pointer-events-none [backdrop-filter:blur(6px)] max-[480.001px]:top-[12px] max-[480.001px]:left-[12px]">
                <ImageIcon size={13} /> Cover photo
              </span>
              <button
                type="button"
                className="sd-gallery-button inline-flex items-center gap-[8px] absolute right-[18px] bottom-[52px] min-h-[37px] py-[9px] px-[13px] border border-[#ffffffb3] rounded-[7px] bg-[#fffffff2] text-[#304a39] text-[11px] font-medium shadow-[0_2px_8px_#16362315] [&:hover]:bg-white max-[480.001px]:right-[12px] max-[480.001px]:bottom-[50px] max-[480.001px]:text-[10px]"
                onClick={() => setGalleryIndex(0)}
              >
                <Images size={16} />{" "}
                {images.length === 1
                  ? "View photo"
                  : `View all ${images.length} photos`}
              </button>
            </>
          ) : (
            <div className="sd-no-photo flex h-full min-h-[360px] items-center justify-center flex-col gap-[12px] p-[30px] text-center [background:linear-gradient(135deg,_#edf1e7,_#f7f8f3)] text-[#7b9078] [&_h3]:font-serif [&_h3]:text-[23px] [&_h3]:font-normal [&_h3]:text-[#415f49] [&_p]:max-w-[260px] [&_p]:text-[12px] max-[760.001px]:min-h-[280px]">
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
                  className="sd-button inline-flex items-center justify-center gap-[9px] min-h-[40px] py-[10px] px-[15px] border border-[color:var(--sd-border)] rounded-[8px] bg-white text-[color:var(--sd-green)] text-[12px] font-medium no-underline [transition:background_0.15s,_border-color_0.15s] [&:hover]:bg-[#edf4ee] [&:hover]:border-[#a5bba9]"
                  onClick={() => onTabChange("Images")}
                >
                  Add service photos <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          )}
          {!!images.length && (
            <div className="sd-image-caption flex items-center justify-between gap-[12px] absolute bottom-0 left-0 w-full min-h-[37px] py-[9px] px-[17px] bg-[#18382be6] text-[#f4f6ed] text-[10px] pointer-events-none [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[5px] max-[480.001px]:py-[9px] max-[480.001px]:px-[12px]">
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
          className="sd-price-card flex flex-col min-w-0 p-[25px] border border-[color:var(--sd-border)] rounded-[13px] bg-white shadow-[0_3px_14px_#1f3b2803] [&_>_.sd-button]:mt-auto [&_>_.sd-button]:w-full [&_>_.sd-button_svg:last-child]:ml-auto min-[1500px]:p-[28px] max-[1150.001px]:p-[20px] max-[760.001px]:p-[22px]"
          aria-label="Pricing and availability summary"
        >
          <div className="sd-price-heading flex justify-between items-center [&_.sd-eyebrow]:text-[9px] [&_.sd-eyebrow]:tracking-[1.3px]">
            <span className="sd-eyebrow text-[10px] font-semibold tracking-[1.8px] text-[#73816e]">
              STARTING FROM
            </span>
            <span className="sd-icon-tile inline-flex items-center justify-center shrink-0 w-[34px] h-[34px] rounded-[9px] bg-[#eef3eb] text-[#64805e]">
              <Tag size={17} />
            </span>
          </div>
          <div className="sd-price mt-[3px] text-[color:var(--sd-ink)] font-serif text-[37px] leading-[1.3] tracking-[-1px] wrap-anywhere lining-nums tabular-nums max-[1150.001px]:text-[32px] max-[760.001px]:text-[36px]">
            {customQuote && !Number(s.price) ? "On request" : money(s.price)}
          </div>
          {pricingUnit && (
            <p className="sd-price-unit mt-[1px] mx-0 mb-0 text-[12px] text-[color:var(--sd-muted)]">
              {pricingUnit}
            </p>
          )}
          <button
            type="button"
            className="sd-text-button inline-flex items-center justify-start gap-[6px] py-[3px] px-0 border-0 bg-transparent text-[color:var(--sd-green)] text-[12px] font-medium text-left leading-[1.5] [&:hover]:text-[#142f21] [&:hover]:underline [&:hover]:underline-offset-[4px] sd-pricing-link [&.sd-pricing-link]:self-start [&.sd-pricing-link]:mt-[10px] [&.sd-pricing-link]:mx-0 [&.sd-pricing-link]:mb-[18px] [&.sd-pricing-link]:text-[11px]"
            onClick={() => onTabChange("Pricing")}
          >
            View pricing breakdown <ArrowUpRight size={13} />
          </button>
          <dl className="sd-summary-list grid gap-[14px] mt-0 mx-0 mb-[23px] pt-[20px] border-t border-t-[#e9ede5] [&_>_div]:flex [&_>_div]:items-start [&_>_div]:justify-between [&_>_div]:gap-[12px] [&_dt]:inline-flex [&_dt]:items-center [&_dt]:gap-[8px] [&_dt]:text-[#71816e] [&_dt]:text-[11px] [&_dt_svg]:shrink-0 [&_dt_svg]:text-[#85957d] [&_dd]:m-0 [&_dd]:text-[#3d5644] [&_dd]:text-right [&_dd]:text-[11px] [&_dd]:font-medium [&_dd]:wrap-anywhere min-[1500px]:gap-[17px] max-[760.001px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[760.001px]:gap-y-[18px] max-[760.001px]:gap-x-[15px] max-[760.001px]:[&_>_div]:flex-col max-[760.001px]:[&_>_div]:gap-[5px] max-[760.001px]:[&_dd]:pl-[24px]">
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
            className="sd-button inline-flex items-center justify-center gap-[9px] min-h-[40px] py-[10px] px-[15px] border border-[color:var(--sd-border)] rounded-[8px] bg-white text-[color:var(--sd-green)] text-[12px] font-medium no-underline [transition:background_0.15s,_border-color_0.15s] [&:hover]:bg-[#edf4ee] [&:hover]:border-[#a5bba9] sd-button-primary [&.sd-button-primary]:bg-[color:var(--sd-green)] [&.sd-button-primary]:border-[color:var(--sd-green)] [&.sd-button-primary]:text-white [&.sd-button-primary:hover]:bg-[#1c4733] [&.sd-button-primary:hover]:border-[#1c4733] [&.sd-button-primary:hover]:text-white"
            to={`/vendor/services/${s.id}/availability`}
          >
            <CalendarDays size={16} /> Manage availability{" "}
            <ArrowUpRight size={16} />
          </Link>
          <p className="sd-price-note mt-[11px] mx-0 mb-0 text-center text-[10px] text-[#768371] leading-[1.7]">
            Keep your calendar up to date for every celebration.
          </p>
        </aside>
      </div>

      <div className="sd-details-grid grid grid-cols-[minmax(0,_1fr)_330px] gap-[22px] mt-[22px] items-start min-[1500px]:grid-cols-[minmax(0,_1fr)_360px] min-[1500px]:gap-[26px] max-[1150.001px]:grid-cols-[minmax(0,_1fr)_285px] max-[1150.001px]:gap-[18px] max-[760.001px]:grid-cols-[minmax(0,_1fr)] max-[760.001px]:gap-[18px] max-[760.001px]:mt-[18px]">
        <div className="sd-main-column grid gap-[20px] min-w-0">
          <section className="sd-card min-w-0 p-[24px] border border-[color:var(--sd-border)] rounded-[12px] bg-white min-[1500px]:p-[27px] max-[1150.001px]:p-[20px] max-[760.001px]:p-[21px] sd-about">
            <div className="sd-card-heading flex items-center justify-between flex-wrap gap-[12px] mb-[17px] [&_h3]:m-0 [&_h3]:text-[color:var(--sd-ink)] [&_h3]:font-serif [&_h3]:text-[20px] [&_h3]:font-normal [&_h3]:tracking-[-0.3px] [&_>_svg]:text-[#819078] max-[1150.001px]:[&_h3]:text-[19px] max-[760.001px]:mb-[16px] max-[480.001px]:items-start max-[480.001px]:gap-[10px] max-[480.001px]:[&_>_.sd-text-button]:text-[11px]">
              <h3>About this service</h3>
              <span className="sd-category-tag py-[5px] px-[9px] border border-[#e1e8dc] rounded-[5px] bg-[#f4f7f0] text-[#687c5d] text-[10px]">
                {category || "Service"}
              </span>
            </div>
            {vendorName && (
              <p className="sd-byline mt-[-6px] mx-0 mb-[17px] text-[11px] text-[color:var(--sd-muted)] [&_strong]:font-medium [&_strong]:text-[#3b5e45]">
                Offered by <strong>{vendorName}</strong>
              </p>
            )}
            {s.shortDescription && (
              <p className="sd-short-description mt-0 mx-0 mb-[11px] text-[#3b5745] text-[14px] leading-[1.8] wrap-anywhere">
                {s.shortDescription}
              </p>
            )}
            <p className="sd-description m-0 text-[#6b796b] text-[12px] leading-[1.9] whitespace-pre-wrap wrap-anywhere">
              {s.description ||
                "A detailed service description has not been added yet."}
            </p>
            {address && (
              <button
                type="button"
                className="sd-location-link flex items-center gap-[8px] w-full mt-[20px] mx-0 mb-0 py-[12px] px-[13px] border border-[#e9ede4] rounded-[7px] bg-[#fafbf8] text-[#5b7357] text-[11px] text-left [&_svg]:shrink-0 [&_svg:last-child]:ml-auto [&_span]:wrap-anywhere [&:hover]:bg-[#f0f5eb]"
                onClick={() => onTabChange("Location")}
              >
                <MapPin size={16} />
                <span>{address}</span>
                <ArrowUpRight size={14} />
              </button>
            )}
            {!!attributes.length && (
              <div className="sd-features mt-[24px] pt-[22px] border-t border-t-[#e8ede3] [&_h4]:mt-0 [&_h4]:mx-0 [&_h4]:mb-[17px] [&_h4]:text-[12px] [&_h4]:font-semibold [&_h4]:text-[#435b47]">
                <h4>Service details & amenities</h4>
                <dl className="sd-attribute-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-y-[19px] gap-x-[20px] m-0 [&_dt]:text-[11px] [&_dt]:text-[#73816e] [&_dd]:flex [&_dd]:items-center [&_dd]:gap-[5px] [&_dd]:mt-[4px] [&_dd]:mx-0 [&_dd]:mb-0 [&_dd]:text-[#3f5943] [&_dd]:text-[12px] [&_dd]:font-medium [&_dd]:wrap-anywhere [&_dd]:whitespace-pre-wrap max-[1150.001px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[480.001px]:gap-y-[17px] max-[480.001px]:gap-x-[14px]">
                  {attributes.map(([key, value]) => (
                    <div
                      key={key}
                      className={
                        typeof value === "boolean" && value
                          ? "sd-feature-included [&_dd_svg]:text-[#50804d]"
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

          <section className="sd-card min-w-0 p-[24px] border border-[color:var(--sd-border)] rounded-[12px] bg-white min-[1500px]:p-[27px] max-[1150.001px]:p-[20px] max-[760.001px]:p-[21px]">
            <div className="sd-card-heading flex items-center justify-between flex-wrap gap-[12px] mb-[17px] [&_h3]:m-0 [&_h3]:text-[color:var(--sd-ink)] [&_h3]:font-serif [&_h3]:text-[20px] [&_h3]:font-normal [&_h3]:tracking-[-0.3px] [&_>_svg]:text-[#819078] max-[1150.001px]:[&_h3]:text-[19px] max-[760.001px]:mb-[16px] max-[480.001px]:items-start max-[480.001px]:gap-[10px] max-[480.001px]:[&_>_.sd-text-button]:text-[11px]">
              <h3>What’s included</h3>
              <button
                type="button"
                className="sd-text-button inline-flex items-center justify-start gap-[6px] py-[3px] px-0 border-0 bg-transparent text-[color:var(--sd-green)] text-[12px] font-medium text-left leading-[1.5] [&:hover]:text-[#142f21] [&:hover]:underline [&:hover]:underline-offset-[4px]"
                onClick={() => onTabChange("Service Items")}
              >
                All service items <ArrowUpRight size={14} />
              </button>
            </div>
            {included.length ? (
              <ul className="sd-included-list list-none p-0 m-0 [&_li]:flex [&_li]:items-start [&_li]:gap-[11px] [&_li]:py-[12px] [&_li]:px-0 [&_li]:border-b [&_li]:border-b-[#edf0e8] [&_li:last-child]:border-b-0 [&_strong]:text-[12px] [&_strong]:font-medium [&_strong]:wrap-anywhere [&_p]:mt-[3px] [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[11px] [&_p]:text-[color:var(--sd-muted)] [&_p]:wrap-anywhere">
                {included.map((item, index) => (
                  <li key={item.id || index}>
                    <span className="sd-check grid place-items-center shrink-0 w-[23px] h-[23px] rounded-[50%] bg-[#f0f5ec] text-[#50794b]">
                      <Check size={14} />
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      {item.description && <p>{item.description}</p>}
                    </div>
                    <span className="sd-item-quantity ml-auto text-[#74816f] text-[11px] shrink-0 max-[480.001px]:max-w-[85px] max-[480.001px]:text-right">
                      {item.quantity} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sd-muted m-0 text-[color:var(--sd-muted)] text-[12px] leading-[1.8]">
                Included items haven’t been added to this service yet.
              </p>
            )}
            <button
              type="button"
              className="sd-package-link flex items-center gap-[12px] w-full mt-[20px] py-[16px] px-[13px] border border-[#e3e9dd] rounded-[9px] bg-[#f7f9f3] text-[#45613f] text-left [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-medium [&_small]:block [&_small]:mt-[2px] [&_small]:text-[#76816c] [&_small]:text-[11px] [&_>_svg]:ml-auto [&_>_svg]:shrink-0 [&:hover]:bg-[#f0f5e9]"
              onClick={() => onTabChange("Packages")}
            >
              <span className="sd-icon-tile inline-flex items-center justify-center shrink-0 w-[34px] h-[34px] rounded-[9px] bg-[#eef3eb] text-[#64805e]">
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

        <div className="sd-side-column grid gap-[20px] min-w-0 [&_.sd-muted]:text-[11px] [&_.sd-card_>_.sd-text-button]:mt-[15px] [&_.sd-card_>_.sd-text-button]:text-[11px] max-[760.001px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[760.001px]:gap-[18px] max-[480.001px]:grid-cols-[minmax(0,_1fr)]">
          <section className="sd-card min-w-0 p-[24px] border border-[color:var(--sd-border)] rounded-[12px] bg-white min-[1500px]:p-[27px] max-[1150.001px]:p-[20px] max-[760.001px]:p-[21px] sd-listing-card [&.sd-listing-card]:bg-[#f4f7f0] [&.sd-listing-card]:border-[#dce6d6] [&.sd-listing-card_p]:mt-[10px] [&.sd-listing-card_p]:mx-0 [&.sd-listing-card_p]:mb-[15px] [&.sd-listing-card_p]:text-[#6c7864] [&.sd-listing-card_p]:text-[12px] [&.sd-listing-card_p]:leading-[1.8] max-[760.001px]:[&.sd-listing-card]:col-span-full">
            <div className="sd-card-heading flex items-center justify-between flex-wrap gap-[12px] mb-[17px] [&_h3]:m-0 [&_h3]:text-[color:var(--sd-ink)] [&_h3]:font-serif [&_h3]:text-[20px] [&_h3]:font-normal [&_h3]:tracking-[-0.3px] [&_>_svg]:text-[#819078] max-[1150.001px]:[&_h3]:text-[19px] max-[760.001px]:mb-[16px] max-[480.001px]:items-start max-[480.001px]:gap-[10px] max-[480.001px]:[&_>_.sd-text-button]:text-[11px]">
              <h3>Listing status</h3>
              <ShieldCheck size={18} />
            </div>
            <div
              className={`sd-listing-state inline-flex items-center gap-[7px] text-[12px] font-semibold text-[#7d683d] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:rounded-[50%] [&_>_span]:bg-current [&.sd-is-live]:text-[#3d784b] ${active ? "sd-is-live" : ""}`}
            >
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
              className="sd-text-button inline-flex items-center justify-start gap-[6px] py-[3px] px-0 border-0 bg-transparent text-[color:var(--sd-green)] text-[12px] font-medium text-left leading-[1.5] [&:hover]:text-[#142f21] [&:hover]:underline [&:hover]:underline-offset-[4px]"
              onClick={() => onTabChange("Approval History")}
            >
              View approval history <ArrowUpRight size={14} />
            </button>
          </section>

          <section className="sd-card min-w-0 p-[24px] border border-[color:var(--sd-border)] rounded-[12px] bg-white min-[1500px]:p-[27px] max-[1150.001px]:p-[20px] max-[760.001px]:p-[21px]">
            <div className="sd-card-heading flex items-center justify-between flex-wrap gap-[12px] mb-[17px] [&_h3]:m-0 [&_h3]:text-[color:var(--sd-ink)] [&_h3]:font-serif [&_h3]:text-[20px] [&_h3]:font-normal [&_h3]:tracking-[-0.3px] [&_>_svg]:text-[#819078] max-[1150.001px]:[&_h3]:text-[19px] max-[760.001px]:mb-[16px] max-[480.001px]:items-start max-[480.001px]:gap-[10px] max-[480.001px]:[&_>_.sd-text-button]:text-[11px]">
              <h3>Working schedule</h3>
              <CalendarDays size={18} />
            </div>
            <div
              className="sd-weekdays grid grid-cols-[repeat(7,_minmax(0,_1fr))] gap-[5px] mb-[13px] [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:min-h-[30px] [&_>_span]:border [&_>_span]:border-[#e6eae1] [&_>_span]:rounded-[5px] [&_>_span]:bg-[#f8f9f5] [&_>_span]:text-[9px] [&_>_span]:text-[#848d7c] [&_>_span.sd-day-active]:bg-[#edf4e8] [&_>_span.sd-day-active]:border-[#d7e5cf] [&_>_span.sd-day-active]:text-[#416c3e] [&_>_span.sd-day-active]:font-semibold"
              aria-label="Regular working days"
            >
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
            <p className="sd-working-hours mt-0 mx-0 mb-[8px] text-[14px] font-medium text-[#415c44] tabular-nums">
              {s.availability?.start && s.availability?.end
                ? `${s.availability.start} – ${s.availability.end}`
                : "Working hours not set"}
            </p>
            <p className="sd-muted m-0 text-[color:var(--sd-muted)] text-[12px] leading-[1.8]">
              Regular hours. Blocked dates and bookings may affect availability.
            </p>
            <button
              type="button"
              className="sd-text-button inline-flex items-center justify-start gap-[6px] py-[3px] px-0 border-0 bg-transparent text-[color:var(--sd-green)] text-[12px] font-medium text-left leading-[1.5] [&:hover]:text-[#142f21] [&:hover]:underline [&:hover]:underline-offset-[4px]"
              onClick={() => onTabChange("Availability")}
            >
              View availability details <ArrowUpRight size={14} />
            </button>
          </section>

          <section className="sd-card min-w-0 p-[24px] border border-[color:var(--sd-border)] rounded-[12px] bg-white min-[1500px]:p-[27px] max-[1150.001px]:p-[20px] max-[760.001px]:p-[21px] sd-policy-card">
            <div className="sd-card-heading flex items-center justify-between flex-wrap gap-[12px] mb-[17px] [&_h3]:m-0 [&_h3]:text-[color:var(--sd-ink)] [&_h3]:font-serif [&_h3]:text-[20px] [&_h3]:font-normal [&_h3]:tracking-[-0.3px] [&_>_svg]:text-[#819078] max-[1150.001px]:[&_h3]:text-[19px] max-[760.001px]:mb-[16px] max-[480.001px]:items-start max-[480.001px]:gap-[10px] max-[480.001px]:[&_>_.sd-text-button]:text-[11px]">
              <h3>Booking policies</h3>
              <FileText size={18} />
            </div>
            <dl className="sd-policy-list grid gap-[13px] m-0 [&_>_div]:flex [&_>_div]:justify-between [&_>_div]:gap-[14px] [&_>_div]:text-[11px] [&_dt]:text-[color:var(--sd-muted)] [&_dd]:m-0 [&_dd]:font-medium [&_dd]:text-right">
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
              className="sd-text-button inline-flex items-center justify-start gap-[6px] py-[3px] px-0 border-0 bg-transparent text-[color:var(--sd-green)] text-[12px] font-medium text-left leading-[1.5] [&:hover]:text-[#142f21] [&:hover]:underline [&:hover]:underline-offset-[4px]"
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
            className="sd-lightbox p-[18px] [&_:focus-visible]:outline-[2px] [&_:focus-visible]:outline-[#397455] [&_:focus-visible]:outline-offset-[3px]"
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
              className="sd-lightbox-image block w-full h-[min(52vh,_470px)] rounded-[8px] bg-[#f0f3ec] object-contain"
            />
            <div className="sd-gallery-controls flex justify-center items-center gap-[22px] mt-[15px] text-[#536b53] text-[12px] [&_.sd-button]:p-[8px]">
              <button
                type="button"
                className="sd-button inline-flex items-center justify-center gap-[9px] min-h-[40px] py-[10px] px-[15px] border border-[color:var(--sd-border)] rounded-[8px] bg-white text-[color:var(--sd-green)] text-[12px] font-medium no-underline [transition:background_0.15s,_border-color_0.15s] [&:hover]:bg-[#edf4ee] [&:hover]:border-[#a5bba9]"
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
                className="sd-button inline-flex items-center justify-center gap-[9px] min-h-[40px] py-[10px] px-[15px] border border-[color:var(--sd-border)] rounded-[8px] bg-white text-[color:var(--sd-green)] text-[12px] font-medium no-underline [transition:background_0.15s,_border-color_0.15s] [&:hover]:bg-[#edf4ee] [&:hover]:border-[#a5bba9]"
                onClick={() => moveGallery(1)}
                disabled={images.length < 2}
                aria-label="Next photo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            {images.length > 1 && (
              <div className="sd-gallery-thumbnails flex gap-[8px] overflow-x-auto mt-[16px] p-[3px] [&_>_button]:w-[64px] [&_>_button]:h-[48px] [&_>_button]:p-[2px] [&_>_button]:shrink-0 [&_>_button]:border-[2px] [&_>_button]:border-[transparent] [&_>_button]:rounded-[6px] [&_>_button]:bg-transparent [&_>_button[aria-pressed='true']]:border-[#397455]">
                {images.map((photo, index) => (
                  <button
                    type="button"
                    key={photo.id || index}
                    aria-label={`Show photo ${index + 1}`}
                    aria-pressed={galleryIndex === index}
                    onClick={() => setGalleryIndex(index)}
                  >
                    <Image
                      src={photo.url}
                      alt=""
                      className="sd-thumbnail block w-full h-full object-cover rounded-[3px]"
                    />
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
