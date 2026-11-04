import { optimizedMediaUrl } from '../../media/api';
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
    <article className="cw-service-card [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#ebe4de] [border-right-width:1px] [border-right-style:solid] [border-right-color:#ebe4de] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#ebe4de] [border-left-width:1px] [border-left-style:solid] [border-left-color:#ebe4de] rounded-[8px] overflow-x-hidden overflow-y-hidden min-w-0 [transition:box-shadow_0.2s,_transform_0.2s] motion-reduce:[transition:none] [&:hover]:[box-shadow:0_8px_25px_#6650410c] [&:hover]:[transform:translateY(-2px)] [&:hover_.cw-service-photo_>_img]:[transform:scale(1.035)]">
      <div className="cw-service-photo relative h-[168px] [@media(width<=1050px)]:h-[190px] [@media(1050px<width<=1250px)]:h-[145px] [background:#efe7df] overflow-x-hidden overflow-y-hidden [&_>_img]:w-full [&_>_img]:h-full [&_>_img]:object-cover [&_>_img]:[transition:transform_0.4s] motion-reduce:[&_>_img]:[transition:none]">
        {(item.image || (item.type === "Vendor" && item.cover)) && !failed ? (
          <img
            src={optimizedMediaUrl(item.type === 'Vendor' && item.cover ? item.cover : item.image,'card')}
            onError={() => setFailed(true)}
            alt={item.name}
            loading="lazy"
          />
        ) : (
          <div className="cw-service-placeholder h-full flex flex-col items-center justify-center gap-[12px] [background:radial-gradient(ellipse_at_70%_10%,_#f8f0df,_#e9ded3)] text-[#b49f89] [&_>_span]:[font-family:Georgia,_serif] [&_>_span]:text-[14px]">
            <ImageIcon size={35} strokeWidth={1} />
            <span>
              {item.category || item.type || "Beautiful possibilities"}
            </span>
          </div>
        )}
        {item.type === "Vendor" && item.cover && item.image && (
          <img
            className="absolute bottom-3 left-3 h-12 w-12 rounded-full border-2 border-white object-cover"
            src={optimizedMediaUrl(item.image,'card')}
            alt={`${item.name} logo`}
            loading="lazy"
          />
        )}
        <span className="cw-service-category absolute bottom-[12px] left-[12px] text-[8px] rounded-[3px] [background:#ffffffed] pt-[4px] pr-[8px] pb-[4px] pl-[8px] text-[#8c786a]">
          {item.category || item.type}
        </span>
        <button
          className={`cw-heart absolute right-[11px] top-[11px] [background:#fffefa] [border-top-width:0] [border-top-style:none] [border-top-color:currentColor] [border-right-width:0] [border-right-style:none] [border-right-color:currentColor] [border-bottom-width:0] [border-bottom-style:none] [border-bottom-color:currentColor] [border-left-width:0] [border-left-style:none] [border-left-color:currentColor] rounded-[50%] h-[30px] w-[30px] grid place-items-center text-[#b68a91] [box-shadow:0_2px_9px_#5131250d] [&.saved]:text-[#9d586f] ${saved ? "saved" : ""}`}
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
      <div className="cw-service-body pt-[15px] [@media(width<=1250px)]:pt-[12px] pr-[15px] [@media(width<=1250px)]:pr-[12px] pb-[15px] [@media(width<=1250px)]:pb-[12px] pl-[15px] [@media(width<=1250px)]:pl-[12px] [&_>_p]:text-[9px] [&_>_p]:mt-[4px] [&_>_p]:mr-[0] [&_>_p]:mb-[8px] [&_>_p]:ml-[0] [&_>_footer]:flex [&_>_footer]:items-center [&_>_footer]:justify-between [&_>_footer]:gap-[7px] [&_>_footer]:[border-top-width:1px] [&_>_footer]:[border-top-style:solid] [&_>_footer]:[border-top-color:#efe8e2] [&_>_footer]:mt-[14px] [&_>_footer]:pt-[12px] [&_>_footer_>_strong]:text-[11px] [&_>_footer_>_strong]:text-[#9a6d70] [&_>_footer_>_strong]:font-[500] [&_>_footer_small]:text-[8px] [&_>_footer_small]:text-[#b2a49b] [&_>_footer_small]:font-[400] [&_>_footer_>_a]:text-[9px] [&_>_footer_>_a]:text-[#ac8b80] [&_>_footer_>_a]:whitespace-nowrap">
        <div className="cw-service-rating flex items-center gap-[6px] mb-[8px] [&_>_span]:flex [&_>_span]:items-center [&_>_span]:gap-[4px] [&_>_span]:text-[#c09d68] [&_>_span]:text-[10px] [&_>_small]:text-[8px] [&_>_small]:text-[#b0a39b]">
          <span>
            <Star size={12} fill="currentColor" />{" "}
            {Number(item.rating || 0).toFixed(1)}
          </span>
          <small>
            {item.reviews ? `(${item.reviews} reviews)` : "New to MarryNest"}
          </small>
        </div>
        <Link className="cw-service-title block text-[#5b474b] [font-family:Georgia,_serif] text-[19px] [@media(width<=1250px)]:text-[17px] font-[400] leading-[1.35]" to={path}>
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
        <div className="cw-service-location flex items-center gap-[5px] text-[9px] text-[#aa9e94]">
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
          <div className="cw-detail-actions flex gap-[12px] flex-wrap mt-[22px] [@media(width<=520px)]:[&_>_.cw-button]:text-[11px]">
            <Link
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              to={
                item.type === "Vendor"
                  ? path
                  : `${path}${path.includes("?") ? "&" : "?"}action=quote`
              }
            >
              {item.type === "Vendor" ? "View services" : "Request quotation"}
            </Link>
            {item.bookingAccessStatus === "Approved" && item.type !== "Vendor" &&
              (item.type === "Package" ||
                item.pricingType !== "CustomQuote") && (
                <Link
                  className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
                  to={`${path}${path.includes("?") ? "&" : "?"}action=book`}
                >
                  Book now
                </Link>
              )}
          </div>
        )}
        {item.available === false || item.available === 0 ||
        (item.type !== "Vendor" && item.bookingAccessStatus !== "Approved") ? (
          <p className="cw-unavailable text-[#a96171]!">
            Currently unavailable for new bookings
          </p>
        ) : null}
      </div>
    </article>
  );
}
