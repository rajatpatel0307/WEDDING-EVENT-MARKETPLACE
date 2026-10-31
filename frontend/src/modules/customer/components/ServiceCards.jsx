import { useWishlist } from "../services/wishlist";
import { Link } from "react-router-dom";
import { Heart, MapPin, Star, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { money } from "../services/workspace.api";
export function ServiceCard({ item, saved: savedProp = false, onChange }) {
  const wish = useWishlist(),
    type = item.type || "Service",
    target = savedProp
      ? type === "Vendor"
        ? item.vendorId
        : type === "Package"
          ? item.packageId
          : item.savedServiceId
      : item.id;
  const saved = !!wish.find(type, target);
  const { notify, reload } = useAuth(),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const path =
    item.type === "Vendor"
      ? `/customer/vendors/${item.vendorId || item.id}`
      : `/customer/services/${item.serviceId || item.id}${item.type === "Package" ? `?package=${item.packageId || item.id}` : ""}`;
  async function toggle() {
    setBusy(true);
    try {
      const r = await wish.toggle(type, target);
      notify(r.message);
      onChange?.();
      await reload();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="cw-service-card">
      <div className="cw-service-photo">
        {(item.image || (item.type === "Vendor" && item.cover)) && !failed ? (
          <img
            src={item.type === "Vendor" && item.cover ? item.cover : item.image}
            onError={() => setFailed(true)}
            alt={item.name}
            loading="lazy"
          />
        ) : (
          <div className="cw-service-placeholder">
            <ImageIcon size={35} strokeWidth={1} />
            <span>
              {item.category || item.type || "Beautiful possibilities"}
            </span>
          </div>
        )}
        {item.type === "Vendor" && item.cover && item.image && (
          <img
            className="absolute bottom-3 left-3 h-12 w-12 rounded-full border-2 border-white object-cover"
            src={item.image}
            alt={`${item.name} logo`}
            loading="lazy"
          />
        )}
        <span className="cw-service-category">
          {item.category || item.type}
        </span>
        <button
          className={`cw-heart ${saved ? "saved" : ""}`}
          onClick={toggle}
          disabled={busy || wish.loading}
          aria-label={
            saved
              ? `Remove ${item.name} from wishlist`
              : `Save ${item.name} to wishlist`
          }
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="cw-service-body">
        <div className="cw-service-rating">
          <span>
            <Star size={12} fill="currentColor" />{" "}
            {Number(item.rating || 0).toFixed(1)}
          </span>
          <small>
            {item.reviews ? `(${item.reviews} reviews)` : "New to MarryNest"}
          </small>
        </div>
        <Link className="cw-service-title" to={path}>
          {item.name}
        </Link>
        <p>{item.vendor}</p>
        {item.type === "Vendor" && (
          <p>
            {item.verificationStatus === "Approved"
              ? "Verified business"
              : item.verificationStatus || "Status unavailable"}
            {item.serviceCount != null
              ? ` ? ${item.serviceCount} available services`
              : ""}
          </p>
        )}
        {item.description && <p>{item.description.slice(0, 180)}</p>}
        <div className="cw-service-location">
          <MapPin size={13} />
          {item.city || "Location on request"}
        </div>
        <footer>
          <strong>
            {item.price ? money(item.price) : "Request price"}
            {item.price && (
              <small>
                {" "}
                {item.type === "Package"
                  ? " / package"
                  : item.pricingType === "PerPerson"
                    ? " / person"
                    : " onwards"}
              </small>
            )}
          </strong>
          <Link to={path}>
            Explore <span>↗</span>
          </Link>
        </footer>
        {item.available !== false && item.available !== 0 && (
          <div className="cw-detail-actions">
            <Link
              className="cw-button"
              to={
                item.type === "Vendor"
                  ? path
                  : `${path}${path.includes("?") ? "&" : "?"}action=quote`
              }
            >
              {item.type === "Vendor" ? "View services" : "Request quotation"}
            </Link>
            {item.type !== "Vendor" &&
              (item.type === "Package" ||
                item.pricingType !== "CustomQuote") && (
                <Link
                  className="cw-button"
                  to={`${path}${path.includes("?") ? "&" : "?"}action=book`}
                >
                  Book now
                </Link>
              )}
          </div>
        )}
        {item.available === false || item.available === 0 ? (
          <p className="cw-unavailable">
            Currently unavailable for new bookings
          </p>
        ) : null}
      </div>
    </article>
  );
}
