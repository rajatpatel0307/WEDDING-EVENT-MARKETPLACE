import { Link } from "react-router-dom";
import {
  MapPin,
  Star,
  Users,
  BadgeCheck,
  ArrowUpRight,
  Image,
} from "lucide-react";
import { safeImage, money } from "../../services/public";
export default function MarketplaceCard({ item, kind = "vendors" }) {
  const image = safeImage(item.image);
  const priceUnit =
    {
      PerPerson: "/ person",
      PerHour: "/ hour",
      PerDay: "/ day",
      PerItem: "/ item",
    }[item.pricingType] || "";
  return (
    <article className="mp-listing-card">
      <Link
        to={`/${kind}/${item.id}`}
        className="mp-listing-image"
        aria-label={`View ${item.name}`}
      >
        {image ? (
          <img
            src={image}
            alt={item.name}
            loading="lazy"
            decoding="async"
            width="600"
            height="400"
            onError={(e) => {
              e.currentTarget.hidden = true;
            }}
          />
        ) : (
          <span className="mp-no-image">
            <Image size={30} strokeWidth={1} />
            <span>Photography coming soon</span>
          </span>
        )}
        {item.featured && <span className="mp-featured">Featured</span>}
        {item.verified && (
          <span className="mp-verified">
            <BadgeCheck size={13} /> Verified vendor
          </span>
        )}
      </Link>
      <div className="mp-listing-content">
        <span className="mp-card-category">
          {item.category || "Wedding professional"}
        </span>
        <h3>
          <Link to={`/${kind}/${item.id}`}>{item.name}</Link>
        </h3>
        {item.location && (
          <p className="mp-card-location">
            <MapPin size={13} />
            {item.location}
          </p>
        )}
        <div className="mp-card-facts">
          <span>
            {item.reviewCount > 0 ? (
              <>
                <Star size={12} fill="currentColor" />
                {Number(item.rating || 0).toFixed(1)}{" "}
                <small>({item.reviewCount} reviews)</small>
              </>
            ) : (
              "No reviews yet"
            )}
          </span>
          {item.capacity != null && (
            <span>
              <Users size={12} /> Up to {item.capacity}
            </span>
          )}
        </div>
        <div className="mp-card-bottom">
          <div>
            <small>
              {item.startingPrice != null ? "Starting from" : "Pricing"}
            </small>
            <strong>
              {money(item.startingPrice)} <small>{priceUnit}</small>
            </strong>
          </div>
          <Link
            to={`/${kind}/${item.id}`}
            aria-label={`View details for ${item.name}`}
          >
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}
