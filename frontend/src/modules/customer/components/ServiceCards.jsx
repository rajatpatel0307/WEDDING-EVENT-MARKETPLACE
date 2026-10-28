import { Link } from "react-router-dom";
import { Heart, MapPin, Star, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { save, money } from "../services/workspace.api";
export function ServiceCard({ item, saved = false, onChange }) {
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
      const r = saved
        ? await save(`/wishlist/${item.id}`, "DELETE", {})
        : await save("/wishlist", "POST", {
            type: item.type || "Service",
            id: item.id,
          });
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
        {item.image && !failed ? (
          <img
            src={item.image}
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
        <span className="cw-service-category">
          {item.category || item.type}
        </span>
        <button
          className={`cw-heart ${saved ? "saved" : ""}`}
          onClick={toggle}
          disabled={busy}
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
        {item.available === false || item.available === 0 ? (
          <p className="cw-unavailable">
            Currently unavailable for new bookings
          </p>
        ) : null}
      </div>
    </article>
  );
}
