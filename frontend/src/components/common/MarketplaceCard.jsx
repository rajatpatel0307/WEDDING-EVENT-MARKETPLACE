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
    <article className="mp-listing-card bg-[#fffdfa] border border-[#e7ddd6] rounded-[7px] overflow-hidden min-w-0 transition-[box-shadow,transform] duration-200 ease-[ease] hover:shadow-[0_12px_30px_#56373e12] hover:transform-[translateY(-3px)]">
      <Link
        to={`/${kind}/${item.id}`}
        className="mp-listing-image relative block h-auto aspect-[1.48] bg-[#ede5df] overflow-hidden [&.mp-listing-image_>_img]:w-full [&.mp-listing-image_>_img]:h-full [&.mp-listing-image_>_img]:object-cover [&.mp-listing-image_>_img]:transition-[transform] [&.mp-listing-image_>_img]:duration-300 [&.mp-listing-image_>_img]:ease-[ease] [&.mp-listing-image:hover_>_img]:transform-[scale(1.025)] [@media(width<=767px)]:aspect-[1.65]"
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
          <span className="mp-no-image flex flex-col gap-[8px] items-center justify-center h-full text-[10px] text-[#a68d83]">
            <Image size={30} strokeWidth={1} />
            <span>Photography coming soon</span>
          </span>
        )}
        {item.featured && <span className="mp-featured absolute left-[13px] bottom-auto flex items-center gap-[4px] rounded-[3px] bg-[#8c414eee] py-[5px] px-[8px] text-[9px] text-white top-[13px]">Featured</span>}
        {item.verified && (
          <span className="mp-verified absolute left-[13px] bottom-[13px] flex items-center gap-[4px] rounded-[3px] bg-[#fff9edee] py-[5px] px-[8px] text-[9px] text-[#6a634d]">
            <BadgeCheck size={13} /> Verified vendor
          </span>
        )}
      </Link>
      <div className="mp-listing-content p-[20px] [&.mp-listing-content_h3]:text-[21px] [&.mp-listing-content_h3]:mt-[7px] [&.mp-listing-content_h3]:mx-0 [&.mp-listing-content_h3]:mb-[6px] [&.mp-listing-content_h3]:wrap-anywhere [&.mp-listing-content_p.mp-card-location]:text-[10px] [&.mp-listing-content_p.mp-card-location]:flex [&.mp-listing-content_p.mp-card-location]:gap-[5px] [&.mp-listing-content_p.mp-card-location]:items-center [@media(width<=1100px)]:p-[16px] [@media(width<=767px)]:p-[20px] [@media(width<=767px)]:[&.mp-listing-content_h3]:text-[24px] [@media(width<=767px)]:[&.mp-listing-content_p.mp-card-location]:text-[11px]">
        <span className="mp-card-category text-[8px] tracking-[1.3px] uppercase text-[#9b756c] [@media(width<=767px)]:text-[9px]">
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
        <div className="mp-card-facts flex justify-between gap-[8px] text-[10px] text-[#826d65] my-[13px] mx-0 [&.mp-card-facts_>_span]:flex [&.mp-card-facts_>_span]:items-center [&.mp-card-facts_>_span]:gap-[4px] [&.mp-card-facts_small]:text-[#a18e87] [&.mp-card-facts_small]:text-[9px] [&.mp-card-facts_svg]:text-[#ad8b5d] [@media(width<=767px)]:text-[11px] [@media(width<=767px)]:[&.mp-card-facts_small]:text-[10px]">
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
        <div className="mp-card-bottom border-t border-t-[#eee5dd] pt-[13px] flex items-center justify-between gap-[12px] [&.mp-card-bottom_>_div_>_small]:block [&.mp-card-bottom_>_div_>_small]:text-[#a18b81] [&.mp-card-bottom_>_div_>_small]:text-[8px] [&.mp-card-bottom_strong]:text-[14px] [&.mp-card-bottom_strong]:font-medium [&.mp-card-bottom_strong]:text-[#77454e] [&.mp-card-bottom_strong_>_small]:text-[9px] [&.mp-card-bottom_strong_>_small]:font-normal [&.mp-card-bottom_>_a]:grid [&.mp-card-bottom_>_a]:place-items-center [&.mp-card-bottom_>_a]:border [&.mp-card-bottom_>_a]:border-[#e7dad1] [&.mp-card-bottom_>_a]:rounded-full [&.mp-card-bottom_>_a]:w-[35px] [&.mp-card-bottom_>_a]:h-[35px] [&.mp-card-bottom_>_a]:text-[#955b62] [@media(width<=767px)]:[&.mp-card-bottom_strong]:text-[17px]">
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
