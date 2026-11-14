import OfferActions, { OfferPrices } from "../commerce/OfferActions";
import { useSelectedLocation, setSelectedLocation } from "./location-selection";
import { offerState } from "../commerce/offer-state";
import { optimizedMediaUrl } from "../media/api";
import { useWishlist } from "../customer/services/wishlist";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Heart,
  MapPin,
  Star,
  Image as ImageIcon,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ShieldCheck,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Flower2,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMarketplace, money } from "./api";


export function ReadState({ state }) {
  return state.loading ? (
    <div role="status" className="cm-state [.customer-marketplace_&]:border [.customer-marketplace_&]:border-[#e8dfd9] [.customer-marketplace_&]:p-[32px] [.customer-marketplace_&]:rounded-[16px]">
      Loading…
    </div>
  ) : state.error ? (
    <div role="alert" className="cm-state [.customer-marketplace_&]:border [.customer-marketplace_&]:border-[#e8dfd9] [.customer-marketplace_&]:p-[32px] [.customer-marketplace_&]:rounded-[16px]">
      <p>{state.error.message}</p>
      <button onClick={state.retry}>Try again</button>
    </div>
  ) : null;
}
export function DiscoveryCard({ item, compare, toggleCompare, compareFull }) {
  const { user, notify, reload } = useAuth(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const wishState = useWishlist(),
    saved = !!wishState.find(item.type || "Service", item.id);
  const offer = offerState(item);
  const path =
    item.type === "Vendor"
      ? `/vendors/${item.vendorId || item.id}`
      : `/services/${item.serviceId || item.id}${item.type === "Package" ? `?package=${item.id}` : ""}`;
  const wish = async () => {
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent(path)}`);
      return;
    }
    setBusy(true);
    try {
      const result = await wishState.toggle(item.type || "Service", item.id);
      notify(result.message);
      await reload();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="cm-card [.customer-marketplace_&]:overflow-hidden [.customer-marketplace_&]:border [.customer-marketplace_&]:border-[#e8dfd9] [.customer-marketplace_&]:rounded-[16px] [.customer-marketplace_&]:bg-white [.customer-marketplace_&]:min-w-0 [.customer-marketplace_&_.cm-actions]:mb-0 [.customer-marketplace.cm-browse_&]:flex [.customer-marketplace.cm-browse_&]:flex-col [.customer-marketplace.cm-browse_&]:rounded-[14px] [.customer-marketplace.cm-browse_&]:border-[#e9e0db] [.customer-marketplace.cm-browse_&]:shadow-[0_4px_18px_#55393108] [.customer-marketplace.cm-browse_&]:transition-[border-color,box-shadow,transform] [.customer-marketplace.cm-browse_&]:duration-200 [.customer-marketplace.cm-browse_&]:ease-[ease] [.customer-marketplace.cm-browse_&:hover]:border-[#cfaaa4] [.customer-marketplace.cm-browse_&:hover]:shadow-[0_10px_26px_#5539310d] [.customer-marketplace.cm-browse_&:hover]:[transform:translateY(-3px)] [.customer-marketplace.cm-browse_&:hover_.cm-photo_img]:[transform:scale(1.035)] [.customer-marketplace.cm-browse_&_h3]:mt-[6px] [.customer-marketplace.cm-browse_&_h3]:mx-0 [.customer-marketplace.cm-browse_&_h3]:mb-[4px] [.customer-marketplace.cm-browse_&_h3]:text-[21px] [.customer-marketplace.cm-browse_&_h3]:leading-[1.3] [.customer-marketplace.cm-browse_&_h3]:tracking-[-0.4px] [.customer-marketplace.cm-browse_&_h3]:text-[#4a353a] [.customer-marketplace.cm-browse_&_h3]:capitalize [.customer-marketplace.cm-browse_&_.cm-meta]:mb-0 [.customer-marketplace.cm-browse_&_.cm-meta]:text-[11px] [.customer-marketplace.cm-browse_&_.cm-meta]:text-[#8e7c76] [.customer-marketplace.cm-browse_&_.cm-meta]:capitalize cm-discovery-card [.customer-marketplace_&_.commerce-price]:[flex-wrap:nowrap] [.customer-marketplace_&_.commerce-price]:gap-[8px] [.customer-marketplace_&_.commerce-price]:m-0 [.customer-marketplace_&_.commerce-price_>_div]:flex-1 [.customer-marketplace_&_.commerce-price_>_div]:min-w-0 [.customer-marketplace_&_.commerce-price_>_div]:py-[7px] [.customer-marketplace_&_.commerce-price_>_div]:px-[9px] [.customer-marketplace_&_.commerce-price_>_div]:border [.customer-marketplace_&_.commerce-price_>_div]:border-[#eee5df] [.customer-marketplace_&_.commerce-price_>_div]:rounded-[8px] [.customer-marketplace_&_.commerce-price_>_div]:bg-[#faf7f3] [.customer-marketplace_&_.commerce-price_small]:mt-0 [.customer-marketplace_&_.commerce-price_small]:mx-0 [.customer-marketplace_&_.commerce-price_small]:mb-[3px] [.customer-marketplace_&_.commerce-price_small]:text-[#9a7c76] [.customer-marketplace_&_.commerce-price_small]:text-[9px] [.customer-marketplace_&_.commerce-price_small]:tracking-[0.1px] [.customer-marketplace_&_.commerce-price_strong]:block [.customer-marketplace_&_.commerce-price_strong]:text-[#76434d] [.customer-marketplace_&_.commerce-price_strong]:text-[19px] [.customer-marketplace_&_.commerce-price_strong]:font-semibold [.customer-marketplace_&_.commerce-price_strong]:leading-[1.2] [.customer-marketplace_&_.commerce-price_strong]:tabular-nums [.customer-marketplace_&_.commerce-price_p]:mt-[3px] [.customer-marketplace_&_.commerce-price_p]:mx-0 [.customer-marketplace_&_.commerce-price_p]:mb-0 [.customer-marketplace_&_.commerce-price_p]:text-[#a18d83] [.customer-marketplace_&_.commerce-price_p]:text-[9px] [.customer-marketplace_&_.commerce-price_p]:leading-[1.5] [.customer-marketplace_&_.commerce-offer-actions]:[flex-wrap:nowrap] [.customer-marketplace_&_.commerce-offer-actions]:gap-[7px] [.customer-marketplace_&_.commerce-offer-actions]:mt-[8px] [.customer-marketplace_&_.commerce-offer-actions]:mx-0 [.customer-marketplace_&_.commerce-offer-actions]:mb-0 [.customer-marketplace_&_.commerce-offer-actions_>_button]:inline-flex [.customer-marketplace_&_.commerce-offer-actions_>_button]:[flex:1_1_0] [.customer-marketplace_&_.commerce-offer-actions_>_button]:items-center [.customer-marketplace_&_.commerce-offer-actions_>_button]:justify-center [.customer-marketplace_&_.commerce-offer-actions_>_button]:min-w-0 [.customer-marketplace_&_.commerce-offer-actions_>_button]:min-h-[36px] [.customer-marketplace_&_.commerce-offer-actions_>_button]:py-[7px] [.customer-marketplace_&_.commerce-offer-actions_>_button]:px-[5px] [.customer-marketplace_&_.commerce-offer-actions_>_button]:border [.customer-marketplace_&_.commerce-offer-actions_>_button]:border-[#e6d6d0] [.customer-marketplace_&_.commerce-offer-actions_>_button]:rounded-[7px] [.customer-marketplace_&_.commerce-offer-actions_>_button]:bg-[#fffdfa] [.customer-marketplace_&_.commerce-offer-actions_>_button]:text-[#80555d] [.customer-marketplace_&_.commerce-offer-actions_>_button]:text-[10px] [.customer-marketplace_&_.commerce-offer-actions_>_button]:font-medium [.customer-marketplace_&_.commerce-offer-actions_>_button]:leading-[1.4] [.customer-marketplace_&_.commerce-offer-actions_>_button]:whitespace-nowrap [.customer-marketplace_&_.commerce-offer-actions_>_a]:inline-flex [.customer-marketplace_&_.commerce-offer-actions_>_a]:[flex:1_1_0] [.customer-marketplace_&_.commerce-offer-actions_>_a]:items-center [.customer-marketplace_&_.commerce-offer-actions_>_a]:justify-center [.customer-marketplace_&_.commerce-offer-actions_>_a]:min-w-0 [.customer-marketplace_&_.commerce-offer-actions_>_a]:min-h-[36px] [.customer-marketplace_&_.commerce-offer-actions_>_a]:py-[7px] [.customer-marketplace_&_.commerce-offer-actions_>_a]:px-[5px] [.customer-marketplace_&_.commerce-offer-actions_>_a]:border [.customer-marketplace_&_.commerce-offer-actions_>_a]:border-[#e6d6d0] [.customer-marketplace_&_.commerce-offer-actions_>_a]:rounded-[7px] [.customer-marketplace_&_.commerce-offer-actions_>_a]:bg-[#fffdfa] [.customer-marketplace_&_.commerce-offer-actions_>_a]:text-[#80555d] [.customer-marketplace_&_.commerce-offer-actions_>_a]:text-[10px] [.customer-marketplace_&_.commerce-offer-actions_>_a]:font-medium [.customer-marketplace_&_.commerce-offer-actions_>_a]:leading-[1.4] [.customer-marketplace_&_.commerce-offer-actions_>_a]:whitespace-nowrap [.customer-marketplace_&_.commerce-offer-actions_>_button.cm-primary]:border-[#d8b5b7] [.customer-marketplace_&_.commerce-offer-actions_>_button.cm-primary]:bg-[#f8edef] [.customer-marketplace_&_.commerce-offer-actions_>_button.cm-primary]:text-[#8c414e] [.customer-marketplace_&_.commerce-offer-actions_>_a.cm-primary]:border-[#d8b5b7] [.customer-marketplace_&_.commerce-offer-actions_>_a.cm-primary]:bg-[#f8edef] [.customer-marketplace_&_.commerce-offer-actions_>_a.cm-primary]:text-[#8c414e] [.customer-marketplace_&_.commerce-offer-actions_>_button:hover:not(:disabled)]:border-[#743440] [.customer-marketplace_&_.commerce-offer-actions_>_button:hover:not(:disabled)]:bg-[#743440] [.customer-marketplace_&_.commerce-offer-actions_>_button:hover:not(:disabled)]:text-[#fff] [.customer-marketplace_&_.commerce-offer-actions_>_a:hover]:border-[#743440] [.customer-marketplace_&_.commerce-offer-actions_>_a:hover]:bg-[#743440] [.customer-marketplace_&_.commerce-offer-actions_>_a:hover]:text-[#fff] [.customer-marketplace_&_.commerce-offer-actions_>_span]:text-[#a08b83] [.customer-marketplace_&_.commerce-offer-actions_>_span]:text-[11px]">
      <div className="cm-card-visual [.customer-marketplace_&]:relative [.customer-marketplace_&]:min-w-0 [.customer-marketplace_&]:overflow-hidden">
        <Link to={path} className="cm-photo [.customer-marketplace_&]:[aspect-ratio:4/3] [.customer-marketplace_&]:bg-[#f3ece7] [.customer-marketplace_&]:grid [.customer-marketplace_&]:[place-items:center] [.customer-marketplace_&]:overflow-hidden [.customer-marketplace_&_img]:w-full [.customer-marketplace_&_img]:h-full [.customer-marketplace_&_img]:object-cover [.customer-marketplace.cm-browse_&]:h-[145px] [.customer-marketplace.cm-browse_&]:[aspect-ratio:auto] [.customer-marketplace.cm-browse_&]:text-[#b7a298] [.customer-marketplace.cm-browse_&_img]:transition-[transform] [.customer-marketplace.cm-browse_&_img]:duration-500 [.customer-marketplace.cm-browse_&_img]:ease-[ease]" aria-label={`View ${item.name}`}>
          {item.image && !failed ? (
            <img
              src={optimizedMediaUrl(item.image, "card")}
              alt={item.name}
              loading="lazy"
              onError={() => setFailed(true)}
            />
          ) : (
            <ImageIcon size={38} />
          )}
        </Link>
        <button
          className="cm-save-button [.customer-marketplace_&]:absolute [.customer-marketplace_&]:top-[12px] [.customer-marketplace_&]:right-[12px] [.customer-marketplace_&]:grid [.customer-marketplace_&]:[place-items:center] [.customer-marketplace_&]:w-[36px] [.customer-marketplace_&]:h-[36px] [.customer-marketplace_&]:p-0 [.customer-marketplace_&]:border [.customer-marketplace_&]:border-[#ffffffa8] [.customer-marketplace_&]:rounded-[50%] [.customer-marketplace_&]:bg-[#fffcf5f2] [.customer-marketplace_&]:text-[#8c414e] [.customer-marketplace_&]:shadow-[0_2px_8px_#3323230d] [.customer-marketplace_&]:[backdrop-filter:blur(8px)] [.customer-marketplace_&[aria-pressed=true]]:bg-[#8c414e] [.customer-marketplace_&[aria-pressed=true]]:text-[#fff] [.customer-marketplace_&[aria-pressed=true]]:border-[#8c414e]"
          onClick={wish}
          disabled={busy}
          aria-pressed={saved}
          aria-label={`${saved ? "Remove" : "Save"} ${item.name}`}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="cm-card-body [.customer-marketplace_&]:p-[18px] [.customer-marketplace.cm-browse_&]:flex [.customer-marketplace.cm-browse_&]:flex-1 [.customer-marketplace.cm-browse_&]:flex-col [.customer-marketplace.cm-browse_&]:py-[12px] [.customer-marketplace.cm-browse_&]:px-[14px] [.customer-marketplace.cm-browse_&_>_.cm-actions]:mt-[15px] [.customer-marketplace.cm-browse_&_>_.cm-actions]:mx-0 [.customer-marketplace.cm-browse_&_>_.cm-actions]:mb-0 [.customer-marketplace.cm-browse_&_>_.cm-actions]:pt-[2px] [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a]:flex-1 [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a]:justify-between [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a]:py-[10px] [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a]:px-[12px] [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a]:rounded-[6px] [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a]:bg-[#fcf8f5] [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a]:border-[#e9d8d3] [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a]:text-[#8c414e] [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a]:text-[11px] [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a:hover]:border-[#8c414e] [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a:hover]:bg-[#8c414e] [.customer-marketplace.cm-browse_&_>_.cm-actions_>_a:hover]:text-[#fff]">
        <div className="cm-card-topline [.customer-marketplace_&]:flex [.customer-marketplace_&]:justify-between [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[8px] [.customer-marketplace_&_.cm-kicker]:text-[9px] [.customer-marketplace_&_.cm-kicker]:tracking-[1px] [.customer-marketplace_&_.cm-kicker]:text-[#9d726c]">
          <p className="cm-kicker [.customer-marketplace_&]:tracking-[0.16em] [.customer-marketplace_&]:text-[11px] [.customer-marketplace_&]:uppercase [.customer-marketplace_&]:text-[#8c414e]">{item.category || item.type}</p>
          {(offer.canSell || offer.canBook) && (
            <span className="cm-offer-tag [.customer-marketplace_&]:shrink-0 [.customer-marketplace_&]:py-[2px] [.customer-marketplace_&]:px-[6px] [.customer-marketplace_&]:border [.customer-marketplace_&]:border-[#e8ded5] [.customer-marketplace_&]:rounded-[5px] [.customer-marketplace_&]:bg-[#f8f4ee] [.customer-marketplace_&]:text-[#8b7560] [.customer-marketplace_&]:text-[9px] [.customer-marketplace_&]:leading-[1.5]">
              {offer.canSell && offer.canBook
                ? "Buy or book"
                : offer.canSell
                  ? "For purchase"
                  : "For booking"}
            </span>
          )}
        </div>
        <h3>
          <Link to={path}>{item.name}</Link>
        </h3>
        <div className="cm-card-meta-row [.customer-marketplace_&]:flex [.customer-marketplace_&]:flex-wrap [.customer-marketplace_&]:items-center [.customer-marketplace_&]:justify-between [.customer-marketplace_&]:gap-[5px_10px]">
          <p className="cm-meta [.customer-marketplace_&]:text-[13px] [.customer-marketplace_&]:text-[#75645d] [.customer-marketplace_&]:flex [.customer-marketplace_&]:gap-[6px] [.customer-marketplace_&]:items-center [.customer-marketplace_&]:flex-wrap">
            <MapPin size={13} strokeWidth={1.5} />
            {item.city || "Location on request"}
            {item.type !== "Vendor" && item.vendor && (
              <span className="cm-vendor-inline [.customer-marketplace_&]:text-[10px] [.customer-marketplace_&]:text-[#a08d84] [.customer-marketplace_&]:[text-transform:none] [.customer-marketplace_&_>_span]:mr-[4px] [.customer-marketplace_&_strong]:text-[#715b59] [.customer-marketplace_&_strong]:text-[10px] [.customer-marketplace_&_strong]:font-medium [.customer-marketplace_&_strong]:capitalize">
                <span aria-hidden="true">·</span> by{" "}
                <strong>{item.vendor}</strong>
              </span>
            )}
          </p>
          {Number(item.reviews) > 0 ? (
            <span className="cm-rating [.customer-marketplace_&]:flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[4px] [.customer-marketplace_&]:shrink-0 [.customer-marketplace_&]:text-[10px] [.customer-marketplace_&]:text-[#927344] [.customer-marketplace_&_small]:text-[#a08b84] [.customer-marketplace_&_small]:text-[9px]">
              <Star size={12} fill="currentColor" />{" "}
              {Number(item.rating || 0).toFixed(1)}{" "}
              <small>
                ({item.reviews}{" "}
                {Number(item.reviews) === 1 ? "review" : "reviews"})
              </small>
            </span>
          ) : (
            <span className="cm-new-listing [.customer-marketplace_&]:text-[10px] [.customer-marketplace_&]:text-[#a08c84] [.customer-marketplace_&]:inline-flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[4px]">
              <Star size={12} strokeWidth={1.5} /> No reviews yet
            </span>
          )}
        </div>
        {item.type === "Vendor" ? (
          <p className="cm-meta [.customer-marketplace_&]:text-[13px] [.customer-marketplace_&]:text-[#75645d] [.customer-marketplace_&]:flex [.customer-marketplace_&]:gap-[6px] [.customer-marketplace_&]:items-center [.customer-marketplace_&]:flex-wrap">
            <ShieldCheck size={14} />
            Approved business · {item.serviceCount ?? "Published"} services
          </p>
        ) : (
          <>
            <div className="cm-card-commerce [.customer-marketplace_&]:mt-auto [.customer-marketplace_&]:pt-[9px]">
              {!offer.type && (
                <p className="cm-card-price [.customer-marketplace_&]:mt-[15px] [.customer-marketplace_&]:pt-[12px] [.customer-marketplace_&]:border-t [.customer-marketplace_&]:border-t-[#efe7e1] [.customer-marketplace_&]:text-[#a28b82] [.customer-marketplace_&]:text-[10px] [.customer-marketplace_&_>_small]:block [.customer-marketplace_&_>_small]:mb-[3px] [.customer-marketplace_&_>_small]:text-[#a08b80] [.customer-marketplace_&_>_small]:text-[9px] [.customer-marketplace_&_>_strong]:text-[#7e454e] [.customer-marketplace_&_>_strong]:text-[17px] [.customer-marketplace_&_>_strong]:font-medium">
                  <small>
                    {item.price ? "Starting from" : "Made for your celebration"}
                  </small>
                  <strong>
                    {item.price ? money(item.price) : "Request a quotation"}
                  </strong>
                  {item.price ? <span> onwards</span> : null}
                </p>
              )}
              <OfferPrices item={item} />
              <OfferActions item={item} />
            </div>
          </>
        )}
        <div className="cm-card-footer [.customer-marketplace_&]:flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:justify-between [.customer-marketplace_&]:gap-[10px] [.customer-marketplace_&]:mt-[9px] [.customer-marketplace_&]:pt-[6px] [.customer-marketplace_&]:border-t [.customer-marketplace_&]:border-t-[#efe7e1]">
          {toggleCompare && (
            <label className="cm-compare-label [.customer-marketplace_&]:flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:mt-[14px] [.customer-marketplace_&_input]:w-[16px] [.customer-marketplace.cm-browse_&]:gap-[7px] [.customer-marketplace.cm-browse_&]:mt-0 [.customer-marketplace.cm-browse_&]:text-[10px] [.customer-marketplace.cm-browse_&]:text-[#9c8b86] [.customer-marketplace.cm-browse_&_input]:w-[13px] [.customer-marketplace.cm-browse_&_input]:h-[13px] [.customer-marketplace.cm-browse_&_input]:[accent-color:#8c414e]">
              <input
                type="checkbox"
                checked={compare}
                disabled={compareFull && !compare}
                onChange={() => toggleCompare(item)}
              />
              Compare
            </label>
          )}
          <Link className="cm-card-details [.customer-marketplace_&]:inline-flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:justify-end [.customer-marketplace_&]:gap-[6px] [.customer-marketplace_&]:min-h-[24px] [.customer-marketplace_&]:ml-auto [.customer-marketplace_&]:text-[#8c414e] [.customer-marketplace_&]:text-[11px] [.customer-marketplace_&]:font-medium [.customer-marketplace_&:hover]:underline [.customer-marketplace_&:hover]:[text-underline-offset:4px]" to={path}>
            View details <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
function FilterDrawer({ children, close, reset, canReset, total }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      id="cm-filter-drawer"
      ref={ref}
      className="customer-marketplace [&]:max-w-[1320px] [&]:m-auto [&]:pt-[140px] [&]:px-[32px] [&]:pb-[70px] [&]:text-[#302725] [&]:[font-family:inherit] [&]:min-h-[70vh] [&]:wrap-anywhere [&_*]:box-border [&_h1]:[font:clamp(32px,_5vw,_56px)/1.12_Georgia,_serif] [&_h1]:my-[20px] [&_h1]:mx-0 [&_h2]:[font:28px/1.2_Georgia,_serif] [&_h2]:my-[20px] [&_h2]:mx-0 [&_h3]:[font:21px/1.3_Georgia,_serif] [&_h3]:my-[10px] [&_h3]:mx-0 [&_p]:leading-[1.7] [&_.cm-actions]:flex [&_.cm-actions]:items-center [&_.cm-actions]:gap-[12px] [&_.cm-actions]:flex-wrap [&_.cm-actions]:my-[20px] [&_.cm-actions]:mx-0 [&_button]:cursor-pointer [&_button]:border [&_button]:border-[#dfd4ce] [&_button]:rounded-[9px] [&_button]:bg-white [&_button]:py-[11px] [&_button]:px-[16px] [&_button]:inline-flex [&_button]:gap-[8px] [&_button]:items-center [&_button]:text-inherit [&_button]:no-underline [&_button]:[font:inherit] [&_.cm-button]:cursor-pointer [&_.cm-button]:border [&_.cm-button]:border-[#dfd4ce] [&_.cm-button]:rounded-[9px] [&_.cm-button]:bg-white [&_.cm-button]:py-[11px] [&_.cm-button]:px-[16px] [&_.cm-button]:inline-flex [&_.cm-button]:gap-[8px] [&_.cm-button]:items-center [&_.cm-button]:text-inherit [&_.cm-button]:no-underline [&_.cm-button]:[font:inherit] [&_button:disabled]:opacity-45 [&_button:disabled]:[cursor:not-allowed] [&_.cm-primary]:bg-[#8c414e] [&_.cm-primary]:text-white [&_.cm-primary]:border-[#8c414e] [&_:focus-visible]:outline-3 [&_:focus-visible]:outline-[#8c414e] [&_:focus-visible]:outline-offset-[3px] [&_input]:bg-white [&_input]:border [&_input]:border-[#dfd4ce] [&_input]:rounded-[8px] [&_input]:p-[11px] [&_input]:w-full [&_input]:[font:inherit] [&_input]:text-inherit [&_input]:min-w-0 [&_select]:bg-white [&_select]:border [&_select]:border-[#dfd4ce] [&_select]:rounded-[8px] [&_select]:p-[11px] [&_select]:w-full [&_select]:[font:inherit] [&_select]:text-inherit [&_select]:min-w-0 [&_label]:grid [&_label]:gap-[7px] [&_label]:text-[13px] [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:border-b [&_th]:border-b-[#e8dfd9] [&_th]:p-[12px] [&_th]:min-w-[130px] [&_td]:text-left [&_td]:border-b [&_td]:border-b-[#e8dfd9] [&_td]:p-[12px] [&_td]:min-w-[130px] max-[760.001px]:[&]:pt-[110px] max-[760.001px]:[&]:px-[18px] max-[760.001px]:[&]:pb-[40px] cm-filter-dialog [.customer-marketplace&]:max-w-[420px] [.customer-marketplace&]:w-[calc(100%_-_32px)] [.customer-marketplace&]:max-h-[90dvh] [.customer-marketplace&]:p-[24px] [.customer-marketplace&]:border [.customer-marketplace&]:border-[#e8dfd9] [.customer-marketplace&]:rounded-[16px] [.customer-marketplace&]:[overflow-y:auto] [.customer-marketplace&]:bg-[#fcfaf7] [.customer-marketplace&]:min-h-0 [.customer-marketplace&::backdrop]:bg-[rgb(40_25_25_/_0.45)] cm-filter-drawer [.customer-marketplace.cm-filter-dialog&]:fixed [.customer-marketplace.cm-filter-dialog&]:inset-[0_0_0_auto] [.customer-marketplace.cm-filter-dialog&]:flex-col [.customer-marketplace.cm-filter-dialog&]:w-[min(390px,_100%)] [.customer-marketplace.cm-filter-dialog&]:max-w-full [.customer-marketplace.cm-filter-dialog&]:h-[100dvh] [.customer-marketplace.cm-filter-dialog&]:max-h-[100dvh] [.customer-marketplace.cm-filter-dialog&]:m-0 [.customer-marketplace.cm-filter-dialog&]:p-0 [.customer-marketplace.cm-filter-dialog&]:border-0 [.customer-marketplace.cm-filter-dialog&]:border-l [.customer-marketplace.cm-filter-dialog&]:border-l-[#e8dfd9] [.customer-marketplace.cm-filter-dialog&]:rounded-[16px_0_0_16px] [.customer-marketplace.cm-filter-dialog&]:overflow-hidden [.customer-marketplace.cm-filter-dialog&]:bg-[#fffdfa] [.customer-marketplace.cm-filter-dialog&]:shadow-[-12px_0_50px_#39252b1a] [.customer-marketplace.cm-filter-dialog&]:[transform:translateX(0)] [.customer-marketplace.cm-filter-dialog&]:transition-[transform] [.customer-marketplace.cm-filter-dialog&]:duration-220 [.customer-marketplace.cm-filter-dialog&]:ease-[ease-out] [.customer-marketplace&[open]]:flex starting:[.customer-marketplace&[open]]:[transform:translateX(100%)]"
      aria-labelledby="cm-filter-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          close();
      }}
    >
      <div className="cm-toolbar [.customer-marketplace_&]:flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[12px] [.customer-marketplace_&]:flex-wrap [.customer-marketplace_&]:my-[20px] [.customer-marketplace_&]:mx-0 cm-drawer-heading [.customer-marketplace_&]:justify-between [.customer-marketplace_&]:mt-0 [.customer-marketplace_&]:mx-0 [.customer-marketplace_&]:mb-[8px] [.customer-marketplace_&_h2]:text-[24px] [.customer-marketplace_&_button]:p-[8px] [.customer-marketplace.cm-filter-drawer_&]:shrink-0 [.customer-marketplace.cm-filter-drawer_&]:[flex-wrap:nowrap] [.customer-marketplace.cm-filter-drawer_&]:m-0 [.customer-marketplace.cm-filter-drawer_&]:pt-[22px] [.customer-marketplace.cm-filter-drawer_&]:px-[24px] [.customer-marketplace.cm-filter-drawer_&]:pb-[18px] [.customer-marketplace.cm-filter-drawer_&]:border-b [.customer-marketplace.cm-filter-drawer_&]:border-b-[#e9e0db] [.customer-marketplace.cm-filter-drawer_&_h2]:m-0 [.customer-marketplace.cm-filter-drawer_&_h2]:text-[25px]">
        <h2 id="cm-filter-title">Refine your search</h2>
        <button onClick={close} aria-label="Close filters">
          <X size={19} />
        </button>
      </div>
      <div className="cm-drawer-fields [.customer-marketplace_&]:grid [.customer-marketplace_&]:gap-[16px] [.customer-marketplace_&]:mb-[24px] [.customer-marketplace.cm-filter-drawer_&]:flex-1 [.customer-marketplace.cm-filter-drawer_&]:min-h-0 [.customer-marketplace.cm-filter-drawer_&]:[align-content:start] [.customer-marketplace.cm-filter-drawer_&]:gap-0 [.customer-marketplace.cm-filter-drawer_&]:m-0 [.customer-marketplace.cm-filter-drawer_&]:py-0 [.customer-marketplace.cm-filter-drawer_&]:px-[24px] [.customer-marketplace.cm-filter-drawer_&]:[overflow-y:auto] [.customer-marketplace.cm-filter-drawer_&]:overscroll-contain">{children}</div>
      <div className="cm-drawer-footer [.customer-marketplace_&]:flex [.customer-marketplace_&]:shrink-0 [.customer-marketplace_&]:gap-[12px] [.customer-marketplace_&]:pt-[16px] [.customer-marketplace_&]:px-[24px] [.customer-marketplace_&]:pb-[max(16px,_env(safe-area-inset-bottom))] [.customer-marketplace_&]:border-t [.customer-marketplace_&]:border-t-[#e9e0db] [.customer-marketplace_&]:bg-[#fffdfa] [.customer-marketplace_&_button]:flex-1 [.customer-marketplace_&_button]:justify-center [.customer-marketplace_&_button]:min-h-[42px] [.customer-marketplace_&_button]:p-[10px] [.customer-marketplace_&_button]:text-[11px] [.customer-marketplace_&_.cm-primary]:[flex:1.5]">
        <button onClick={reset} disabled={!canReset}>
          Reset filters
        </button>
        <button className="cm-primary" onClick={close}>
          {total == null
            ? "View results"
            : `View ${total} ${total === 1 ? "result" : "results"}`}
        </button>
      </div>
    </dialog>
  );
}
export default function BrowsePage({ embedded = false }) {
  const selectedLocation = useSelectedLocation();
  const [params, setParams] = useSearchParams(),
    location = useLocation(),
    catalog = useMarketplace("/catalog"),
    [open, setOpen] = useState(false),
    [view, setView] = useState("grid"),
    [compare, setCompare] = useState([]);
  const kind = embedded
    ? params.get("type") || "services"
    : { vendors: "vendors", packages: "packages", offers: "offers" }[
        location.pathname.split("/")[1]
      ] || "services";
  const query = new URLSearchParams();
  for (const k of [
    "q",
    "city",
    "postalCode",
    "min",
    "max",
    "rating",
    "subcategory",
    "date",
    "guests",
    "sort",
    "serviceType",
    "page",
  ])
    if (params.get(k)) query.set(k, params.get(k));
  if (!params.has("city") && selectedLocation) query.set("city", selectedLocation);
  useEffect(() => {
    if (params.has("city")) setSelectedLocation(params.get("city") || "");
  }, [params]);
  query.set("type", kind);
  query.set("pageSize", "12");
  const requested =
      params.get("category") ||
      (location.pathname === "/venues" ? "Venue & Location" : null),
    matched = catalog.data?.categories.find(
      (c) =>
        String(c.id) === requested ||
        c.name.toLowerCase() === requested?.toLowerCase(),
    );
  if (matched) query.set("category", matched.id);
  else if (requested && catalog.data)
    query.set("q", [params.get("q"), requested].filter(Boolean).join(" "));
  const results = useMarketplace(catalog.data ? `/discover?${query}` : null);
  const filter = useCallback(
    (key, value) => {
      if (key === "city") setSelectedLocation(value);
      setParams((prev) => {
        const n = new URLSearchParams(prev);
        if (value) n.set(key, value);
        else n.delete(key);
        if (key === "category") n.delete("subcategory");
        if (key === "type")
          for (const field of [
            "min",
            "max",
            "guests",
            "date",
            "serviceType",
            "subcategory",
            "sort",
          ])
            n.delete(field);
        n.delete("page");
        return n;
      });
    },
    [setParams],
  );
  const activeFilters = [...params].filter(
    ([key]) => !["page", "type", "sort"].includes(key),
  );
  const resetFilters = () => {
    setSelectedLocation("");
    setParams(embedded && params.get("type") ? { type: kind } : {});
  };
  const select = (key, label, options) => (
    <label>
      {label}
      <select
        value={
          key === "category" ? String(matched?.id || "") : key === "city" ? params.get(key) ?? selectedLocation : params.get(key) || ""
        }
        onChange={(e) => filter(key, e.target.value)}
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((o) => (
          <option key={o.id ?? o.name} value={o.id ?? o.name}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
  const input = (key, label, type = "number") => (
    <label>
      {label}
      <input
        type={type}
        key={`${key}-${params.get(key) || ""}`}
        defaultValue={params.get(key) || ""}
        min={type === "number" ? (key === "guests" ? 1 : 0) : undefined}
        onBlur={(e) => filter(key, e.target.value)}
      />
    </label>
  );
  const filters = (
    <>
      <fieldset className="cm-filter-section [.customer-marketplace_&]:grid [.customer-marketplace_&]:min-w-0 [.customer-marketplace_&]:gap-[13px] [.customer-marketplace_&]:m-0 [.customer-marketplace_&]:py-[20px] [.customer-marketplace_&]:px-0 [.customer-marketplace_&]:border-0 [.customer-marketplace_&]:border-b [.customer-marketplace_&]:border-b-[#ece3de] [.customer-marketplace_&_legend]:flex [.customer-marketplace_&_legend]:items-center [.customer-marketplace_&_legend]:gap-[7px] [.customer-marketplace_&_legend]:[float:left] [.customer-marketplace_&_legend]:w-full [.customer-marketplace_&_legend]:p-0 [.customer-marketplace_&_legend]:text-[#9b6e68] [.customer-marketplace_&_legend]:text-[10px] [.customer-marketplace_&_legend]:font-medium [.customer-marketplace_&_legend]:tracking-[0.3px] [.customer-marketplace_&_.cm-visually-hidden]:absolute [.customer-marketplace_&_.cm-visually-hidden]:w-[1px] [.customer-marketplace_&_.cm-visually-hidden]:h-[1px] [.customer-marketplace_&_.cm-visually-hidden]:overflow-hidden [.customer-marketplace_&_.cm-visually-hidden]:[clip-path:inset(50%)] [.customer-marketplace_&_.cm-visually-hidden]:whitespace-nowrap [.customer-marketplace_&_label]:gap-[7px] [.customer-marketplace_&_label]:text-[11px] [.customer-marketplace_&_label]:text-[#756669] [.customer-marketplace_&_input]:h-[40px] [.customer-marketplace_&_input]:border-[#e8ded8] [.customer-marketplace_&_input]:rounded-[6px] [.customer-marketplace_&_input]:py-[9px] [.customer-marketplace_&_input]:px-[10px] [.customer-marketplace_&_input]:text-[11px] [.customer-marketplace_&_input]:bg-[#fff] [.customer-marketplace_&_input]:text-[#534549] [.customer-marketplace_&_select]:h-[40px] [.customer-marketplace_&_select]:border-[#e8ded8] [.customer-marketplace_&_select]:rounded-[6px] [.customer-marketplace_&_select]:py-[9px] [.customer-marketplace_&_select]:px-[10px] [.customer-marketplace_&_select]:text-[11px] [.customer-marketplace_&_select]:bg-[#fff] [.customer-marketplace_&_select]:text-[#534549] [.customer-marketplace_&_input::placeholder]:text-[#a59896]">
        <legend>
          <Sparkles size={14} /> Your essentials
        </legend>
        {select("category", "Category", catalog.data?.categories || [])}
        {kind !== "vendors" &&
          select(
            "subcategory",
            "Subcategory",
            (catalog.data?.subcategories || []).filter(
              (s) => !matched || s.categoryId === matched.id,
            ),
          )}
      </fieldset>
      <fieldset className="cm-filter-section [.customer-marketplace_&]:grid [.customer-marketplace_&]:min-w-0 [.customer-marketplace_&]:gap-[13px] [.customer-marketplace_&]:m-0 [.customer-marketplace_&]:py-[20px] [.customer-marketplace_&]:px-0 [.customer-marketplace_&]:border-0 [.customer-marketplace_&]:border-b [.customer-marketplace_&]:border-b-[#ece3de] [.customer-marketplace_&_legend]:flex [.customer-marketplace_&_legend]:items-center [.customer-marketplace_&_legend]:gap-[7px] [.customer-marketplace_&_legend]:[float:left] [.customer-marketplace_&_legend]:w-full [.customer-marketplace_&_legend]:p-0 [.customer-marketplace_&_legend]:text-[#9b6e68] [.customer-marketplace_&_legend]:text-[10px] [.customer-marketplace_&_legend]:font-medium [.customer-marketplace_&_legend]:tracking-[0.3px] [.customer-marketplace_&_.cm-visually-hidden]:absolute [.customer-marketplace_&_.cm-visually-hidden]:w-[1px] [.customer-marketplace_&_.cm-visually-hidden]:h-[1px] [.customer-marketplace_&_.cm-visually-hidden]:overflow-hidden [.customer-marketplace_&_.cm-visually-hidden]:[clip-path:inset(50%)] [.customer-marketplace_&_.cm-visually-hidden]:whitespace-nowrap [.customer-marketplace_&_label]:gap-[7px] [.customer-marketplace_&_label]:text-[11px] [.customer-marketplace_&_label]:text-[#756669] [.customer-marketplace_&_input]:h-[40px] [.customer-marketplace_&_input]:border-[#e8ded8] [.customer-marketplace_&_input]:rounded-[6px] [.customer-marketplace_&_input]:py-[9px] [.customer-marketplace_&_input]:px-[10px] [.customer-marketplace_&_input]:text-[11px] [.customer-marketplace_&_input]:bg-[#fff] [.customer-marketplace_&_input]:text-[#534549] [.customer-marketplace_&_select]:h-[40px] [.customer-marketplace_&_select]:border-[#e8ded8] [.customer-marketplace_&_select]:rounded-[6px] [.customer-marketplace_&_select]:py-[9px] [.customer-marketplace_&_select]:px-[10px] [.customer-marketplace_&_select]:text-[11px] [.customer-marketplace_&_select]:bg-[#fff] [.customer-marketplace_&_select]:text-[#534549] [.customer-marketplace_&_input::placeholder]:text-[#a59896]">
        <legend>
          <MapPin size={14} /> The perfect place
        </legend>
        {select("city", "Location", catalog.data?.cities || [])}
        <label>
          Postal code
          <input
            value={params.get("postalCode") || ""}
            placeholder="Enter postal code"
            autoComplete="postal-code"
            maxLength={20}
            onChange={(e) => filter("postalCode", e.target.value)}
          />
        </label>
      </fieldset>
      <details
        className="cm-filter-advanced [.customer-marketplace_&_summary]:flex [.customer-marketplace_&_summary]:items-center [.customer-marketplace_&_summary]:justify-between [.customer-marketplace_&_summary]:gap-[10px] [.customer-marketplace_&_summary]:py-[19px] [.customer-marketplace_&_summary]:px-0 [.customer-marketplace_&_summary]:text-[#9b6e68] [.customer-marketplace_&_summary]:text-[11px] [.customer-marketplace_&_summary]:cursor-pointer [.customer-marketplace_&_summary]:[list-style:none] [.customer-marketplace_&_summary::-webkit-details-marker]:hidden [.customer-marketplace_&_summary_>_span]:flex [.customer-marketplace_&_summary_>_span]:items-center [.customer-marketplace_&_summary_>_span]:gap-[7px] [.customer-marketplace_&[open]_summary_>_svg]:[transform:rotate(180deg)] [.customer-marketplace_&_.cm-filter-section]:pt-0"
        open={
          ["rating", "date", "guests", "min", "max", "serviceType"].some(
            (key) => params.has(key),
          ) || undefined
        }
      >
        <summary>
          <span>
            <SlidersHorizontal size={14} /> More preferences
          </span>
          <ChevronDown size={14} />
        </summary>
        <fieldset className="cm-filter-section [.customer-marketplace_&]:grid [.customer-marketplace_&]:min-w-0 [.customer-marketplace_&]:gap-[13px] [.customer-marketplace_&]:m-0 [.customer-marketplace_&]:py-[20px] [.customer-marketplace_&]:px-0 [.customer-marketplace_&]:border-0 [.customer-marketplace_&]:border-b [.customer-marketplace_&]:border-b-[#ece3de] [.customer-marketplace_&_legend]:flex [.customer-marketplace_&_legend]:items-center [.customer-marketplace_&_legend]:gap-[7px] [.customer-marketplace_&_legend]:[float:left] [.customer-marketplace_&_legend]:w-full [.customer-marketplace_&_legend]:p-0 [.customer-marketplace_&_legend]:text-[#9b6e68] [.customer-marketplace_&_legend]:text-[10px] [.customer-marketplace_&_legend]:font-medium [.customer-marketplace_&_legend]:tracking-[0.3px] [.customer-marketplace_&_.cm-visually-hidden]:absolute [.customer-marketplace_&_.cm-visually-hidden]:w-[1px] [.customer-marketplace_&_.cm-visually-hidden]:h-[1px] [.customer-marketplace_&_.cm-visually-hidden]:overflow-hidden [.customer-marketplace_&_.cm-visually-hidden]:[clip-path:inset(50%)] [.customer-marketplace_&_.cm-visually-hidden]:whitespace-nowrap [.customer-marketplace_&_label]:gap-[7px] [.customer-marketplace_&_label]:text-[11px] [.customer-marketplace_&_label]:text-[#756669] [.customer-marketplace_&_input]:h-[40px] [.customer-marketplace_&_input]:border-[#e8ded8] [.customer-marketplace_&_input]:rounded-[6px] [.customer-marketplace_&_input]:py-[9px] [.customer-marketplace_&_input]:px-[10px] [.customer-marketplace_&_input]:text-[11px] [.customer-marketplace_&_input]:bg-[#fff] [.customer-marketplace_&_input]:text-[#534549] [.customer-marketplace_&_select]:h-[40px] [.customer-marketplace_&_select]:border-[#e8ded8] [.customer-marketplace_&_select]:rounded-[6px] [.customer-marketplace_&_select]:py-[9px] [.customer-marketplace_&_select]:px-[10px] [.customer-marketplace_&_select]:text-[11px] [.customer-marketplace_&_select]:bg-[#fff] [.customer-marketplace_&_select]:text-[#534549] [.customer-marketplace_&_input::placeholder]:text-[#a59896]">
          <legend className="cm-visually-hidden">
            Rating, budget and event preferences
          </legend>
          {select("rating", "Rating", [
            { id: 4, name: "4 stars and above" },
            { id: 3, name: "3 stars and above" },
          ])}
          {kind !== "vendors" && (
            <>
              {input("date", "Event date", "date")}
              {input("guests", "Guest count")}
              {input("min", "Minimum price")}
              {input("max", "Maximum price")}
              {select(
                "serviceType",
                "Service type",
                ["On site", "Rental", "Sale", "Digital", "Hybrid"].map(
                  (name) => ({
                    name,
                  }),
                ),
              )}
            </>
          )}
        </fieldset>
      </details>
    </>
  );
  const toggleCompare = (item) =>
    setCompare((current) =>
      current.some((i) => i.id === item.id)
        ? current.filter((i) => i.id !== item.id)
        : current.length < 3
          ? [...current, item]
          : current,
    );
  return (
    <main
      className={`customer-marketplace [&]:max-w-[1320px] [&]:m-auto [&]:pt-[140px] [&]:px-[32px] [&]:pb-[70px] [&]:text-[#302725] [&]:[font-family:inherit] [&]:min-h-[70vh] [&]:wrap-anywhere [&_*]:box-border [&_h1]:[font:clamp(32px,_5vw,_56px)/1.12_Georgia,_serif] [&_h1]:my-[20px] [&_h1]:mx-0 [&_h2]:[font:28px/1.2_Georgia,_serif] [&_h2]:my-[20px] [&_h2]:mx-0 [&_h3]:[font:21px/1.3_Georgia,_serif] [&_h3]:my-[10px] [&_h3]:mx-0 [&_p]:leading-[1.7] [&_.cm-actions]:flex [&_.cm-actions]:items-center [&_.cm-actions]:gap-[12px] [&_.cm-actions]:flex-wrap [&_.cm-actions]:my-[20px] [&_.cm-actions]:mx-0 [&_button]:cursor-pointer [&_button]:border [&_button]:border-[#dfd4ce] [&_button]:rounded-[9px] [&_button]:bg-white [&_button]:py-[11px] [&_button]:px-[16px] [&_button]:inline-flex [&_button]:gap-[8px] [&_button]:items-center [&_button]:text-inherit [&_button]:no-underline [&_button]:[font:inherit] [&_.cm-button]:cursor-pointer [&_.cm-button]:border [&_.cm-button]:border-[#dfd4ce] [&_.cm-button]:rounded-[9px] [&_.cm-button]:bg-white [&_.cm-button]:py-[11px] [&_.cm-button]:px-[16px] [&_.cm-button]:inline-flex [&_.cm-button]:gap-[8px] [&_.cm-button]:items-center [&_.cm-button]:text-inherit [&_.cm-button]:no-underline [&_.cm-button]:[font:inherit] [&_button:disabled]:opacity-45 [&_button:disabled]:[cursor:not-allowed] [&_.cm-primary]:bg-[#8c414e] [&_.cm-primary]:text-white [&_.cm-primary]:border-[#8c414e] [&_:focus-visible]:outline-3 [&_:focus-visible]:outline-[#8c414e] [&_:focus-visible]:outline-offset-[3px] [&_input]:bg-white [&_input]:border [&_input]:border-[#dfd4ce] [&_input]:rounded-[8px] [&_input]:p-[11px] [&_input]:w-full [&_input]:[font:inherit] [&_input]:text-inherit [&_input]:min-w-0 [&_select]:bg-white [&_select]:border [&_select]:border-[#dfd4ce] [&_select]:rounded-[8px] [&_select]:p-[11px] [&_select]:w-full [&_select]:[font:inherit] [&_select]:text-inherit [&_select]:min-w-0 [&_label]:grid [&_label]:gap-[7px] [&_label]:text-[13px] [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:border-b [&_th]:border-b-[#e8dfd9] [&_th]:p-[12px] [&_th]:min-w-[130px] [&_td]:text-left [&_td]:border-b [&_td]:border-b-[#e8dfd9] [&_td]:p-[12px] [&_td]:min-w-[130px] max-[760.001px]:[&]:pt-[110px] max-[760.001px]:[&]:px-[18px] max-[760.001px]:[&]:pb-[40px] cm-browse [.customer-marketplace&]:max-w-[1440px] [.customer-marketplace&]:pt-[28px] [.customer-marketplace&]:px-[5%] [.customer-marketplace&]:pb-[72px] [.customer-marketplace&]:text-[#3d3032] max-[760.001px]:[.customer-marketplace&]:pt-[20px] max-[760.001px]:[.customer-marketplace&]:px-[6%] max-[760.001px]:[.customer-marketplace&]:pb-[45px] ${embedded ? "cm-embedded [.customer-marketplace&]:p-0 [.customer-marketplace&]:max-w-none [.customer-marketplace.cm-browse&]:p-0" : ""}`}
      id={embedded ? undefined : "main-content"}
    >
      <nav className="cm-breadcrumb [.customer-marketplace_&]:flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[10px] [.customer-marketplace_&]:mb-[24px] [.customer-marketplace_&]:text-[#9a898a] [.customer-marketplace_&]:text-[11px] [.customer-marketplace_&_span]:text-[#68575b]" aria-label="Breadcrumb">
        <Link to="/">Home</Link> <ChevronRight size={12} />{" "}
        <span aria-current="page">
          {kind === "vendors"
            ? "Wedding professionals"
            : kind === "packages"
              ? "Wedding packages"
              : kind === "offers"
                ? "Wedding offers"
                : "Wedding services"}
        </span>
      </nav>
      <div className="cm-discovery-controls [.customer-marketplace_&]:flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[20px] [.customer-marketplace_&]:min-w-0 [.customer-marketplace_&]:mb-[22px] max-[760.001px]:[.customer-marketplace_&]:flex-wrap max-[760.001px]:[.customer-marketplace_&]:gap-[10px] max-[760.001px]:[.customer-marketplace_&]:mb-[18px]">
        {catalog.data?.categories.length > 0 && (
          <div className="cm-category-bar [.customer-marketplace_&]:flex [.customer-marketplace_&]:flex-1 [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[8px] [.customer-marketplace_&]:min-w-0 [.customer-marketplace_&]:[overflow-x:auto] [.customer-marketplace_&]:py-[6px] [.customer-marketplace_&]:px-0 [.customer-marketplace_&]:[scrollbar-width:thin] [.customer-marketplace_&_>_span]:mr-[5px] [.customer-marketplace_&_>_span]:text-[10px] [.customer-marketplace_&_>_span]:text-[#9a8785] [.customer-marketplace_&_button]:shrink-0 [.customer-marketplace_&_button]:py-[7px] [.customer-marketplace_&_button]:px-[13px] [.customer-marketplace_&_button]:border-[#e8ded8] [.customer-marketplace_&_button]:rounded-[30px] [.customer-marketplace_&_button]:bg-transparent [.customer-marketplace_&_button]:text-[#786a6b] [.customer-marketplace_&_button]:text-[10px] [.customer-marketplace_&_button[aria-pressed=true]]:bg-[#8c414e] [.customer-marketplace_&_button[aria-pressed=true]]:border-[#8c414e] [.customer-marketplace_&_button[aria-pressed=true]]:text-[#fff] max-[760.001px]:[.customer-marketplace_&]:[flex-basis:100%] max-[760.001px]:[.customer-marketplace_&]:py-[4px] max-[760.001px]:[.customer-marketplace_&]:px-0" aria-label="Popular categories">
            <span>Explore</span>
            <button
              aria-pressed={!requested}
              onClick={() => {
                if (location.pathname === "/venues")
                  navigate(
                    `/services?${new URLSearchParams([...params].filter(([key]) => key !== "category" && key !== "subcategory" && key !== "page"))}`,
                  );
                else filter("category", "");
              }}
            >
              All categories
            </button>
            {catalog.data.categories.slice(0, 5).map((category) => (
              <button
                key={category.id}
                aria-pressed={matched?.id === category.id}
                onClick={() => filter("category", String(category.id))}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
        <div className="cm-toolbar [.customer-marketplace_&]:flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[12px] [.customer-marketplace_&]:flex-wrap [.customer-marketplace_&]:my-[20px] [.customer-marketplace_&]:mx-0 cm-results-toolbar [.customer-marketplace_&.cm-results-toolbar]:[flex-wrap:nowrap] [.customer-marketplace_&.cm-results-toolbar]:shrink-0 [.customer-marketplace_&.cm-results-toolbar]:justify-end [.customer-marketplace_&.cm-results-toolbar]:gap-[16px] [.customer-marketplace_&.cm-results-toolbar]:mt-0 [.customer-marketplace_&.cm-results-toolbar]:mr-0 [.customer-marketplace_&.cm-results-toolbar]:mb-0 [.customer-marketplace_&.cm-results-toolbar]:ml-auto [.customer-marketplace_&.cm-results-toolbar_>_label]:flex [.customer-marketplace_&.cm-results-toolbar_>_label]:items-center [.customer-marketplace_&.cm-results-toolbar_>_label]:gap-[8px] [.customer-marketplace_&.cm-results-toolbar_>_label]:text-[#927e7d] [.customer-marketplace_&.cm-results-toolbar_>_label]:text-[10px] [.customer-marketplace_&.cm-results-toolbar_>_label]:tracking-[0.2px] [.customer-marketplace_&.cm-results-toolbar_>_label_+_label]:shrink-0 [.customer-marketplace_&.cm-results-toolbar_>_label_+_label]:pl-[16px] [.customer-marketplace_&.cm-results-toolbar_>_label_+_label]:border-l [.customer-marketplace_&.cm-results-toolbar_>_label_+_label]:border-l-[#e9e0db] [.customer-marketplace_&.cm-results-toolbar_select]:w-auto [.customer-marketplace_&.cm-results-toolbar_select]:max-w-[180px] [.customer-marketplace_&.cm-results-toolbar_select]:h-[40px] [.customer-marketplace_&.cm-results-toolbar_select]:py-[2px] [.customer-marketplace_&.cm-results-toolbar_select]:px-[6px] [.customer-marketplace_&.cm-results-toolbar_select]:border-0 [.customer-marketplace_&.cm-results-toolbar_select]:rounded-[0] [.customer-marketplace_&.cm-results-toolbar_select]:bg-transparent [.customer-marketplace_&.cm-results-toolbar_select]:text-[12px] [.customer-marketplace_&.cm-results-toolbar_select]:text-[#3d3032] [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:inline-flex [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:justify-center [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:gap-[6px] [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:h-[40px] [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:py-[8px] [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:px-[12px] [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:border-[#e4d5ce] [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:rounded-[7px] [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:bg-[#fffdfa] [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:text-[#8c414e] [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:text-[11px] [.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:whitespace-nowrap max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar]:flex-wrap max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar]:gap-[8px] max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_>_label]:flex-1 max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_>_label]:min-w-0 max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_>_label]:pl-0 max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_>_label]:border-0 max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_select]:flex-1 max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_select]:min-w-0 max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_select]:w-full max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_select]:max-w-none max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_select]:h-[36px] max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:gap-[5px] max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:h-[38px] max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:p-[8px] max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:border-[#e8dcd5] max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:rounded-[6px] max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:bg-[#fffdfa] max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:text-[#8c414e] max-[760.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-filter-toggle]:text-[11px] max-[520.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-control-label]:absolute max-[520.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-control-label]:w-[1px] max-[520.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-control-label]:h-[1px] max-[520.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-control-label]:overflow-hidden max-[520.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-control-label]:[clip-path:inset(50%)] max-[520.001px]:[.customer-marketplace_&.cm-results-toolbar_.cm-control-label]:whitespace-nowrap">
          {embedded && (
            <label>
              <span className="cm-control-label [.customer-marketplace_&]:shrink-0 [.customer-marketplace_&]:whitespace-nowrap [.customer-marketplace_&]:text-[11px]">Browse</span>
              <select
                value={kind}
                onChange={(e) => filter("type", e.target.value)}
              >
                <option value="services">Services</option>
                <option value="vendors">Vendors</option>
                <option value="packages">Packages</option>
                <option value="offers">Vendors with offers</option>
              </select>
            </label>
          )}
          <label className="cm-sort">
            <span className="cm-control-label [.customer-marketplace_&]:shrink-0 [.customer-marketplace_&]:whitespace-nowrap [.customer-marketplace_&]:text-[11px]">Sort by</span>
            <select
              value={params.get("sort") || "relevance"}
              onChange={(e) => filter("sort", e.target.value)}
            >
              {[
                ["relevance", "Recommended"],
                ["rating", "Highest rated"],
                ...(kind === "vendors"
                  ? []
                  : [
                      ["priceAsc", "Price: low to high"],
                      ["priceDesc", "Price: high to low"],
                    ]),
                ["newest", "Newest"],
              ].map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            className="cm-filter-toggle [.customer-marketplace_&]:hidden max-[760.001px]:[.customer-marketplace_&]:inline-flex [.customer-marketplace_&_>_span]:grid [.customer-marketplace_&_>_span]:[place-items:center] [.customer-marketplace_&_>_span]:min-w-[17px] [.customer-marketplace_&_>_span]:h-[17px] [.customer-marketplace_&_>_span]:rounded-[50%] [.customer-marketplace_&_>_span]:bg-[#f3e6e7] [.customer-marketplace_&_>_span]:text-[9px]"
            aria-expanded={open}
            aria-controls="cm-filter-drawer"
            aria-haspopup="dialog"
            onClick={() => setOpen(!open)}
          >
            <SlidersHorizontal size={17} />
            Filters{" "}
            {activeFilters.length > 0 && <span>{activeFilters.length}</span>}
          </button>
          <div
            className="cm-view-switch [.customer-marketplace_&]:flex [.customer-marketplace_&]:gap-[3px] [.customer-marketplace_&]:shrink-0 [.customer-marketplace_&]:p-[3px] [.customer-marketplace_&]:border [.customer-marketplace_&]:border-[#e9e0db] [.customer-marketplace_&]:rounded-[8px] [.customer-marketplace_&]:bg-[#f7f3ef] [.customer-marketplace_&_button]:justify-center [.customer-marketplace_&_button]:w-[32px] [.customer-marketplace_&_button]:h-[32px] [.customer-marketplace_&_button]:p-0 [.customer-marketplace_&_button]:border [.customer-marketplace_&_button]:border-[transparent] [.customer-marketplace_&_button]:rounded-[5px] [.customer-marketplace_&_button]:bg-transparent [.customer-marketplace_&_button]:text-[#99898a] [.customer-marketplace_&_button[aria-pressed=true]]:border-[#e9ddd7] [.customer-marketplace_&_button[aria-pressed=true]]:bg-white [.customer-marketplace_&_button[aria-pressed=true]]:text-[#8c414e] [.customer-marketplace_&_button[aria-pressed=true]]:shadow-[0_2px_4px_#4d30300a] max-[760.001px]:[.customer-marketplace_&]:p-[3px] max-[760.001px]:[.customer-marketplace_&_button]:w-[29px] max-[760.001px]:[.customer-marketplace_&_button]:h-[29px]"
            role="group"
            aria-label="Results layout"
          >
            <button
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>
      {activeFilters.length > 0 && (
        <div className="cm-chips [.customer-marketplace_&]:flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[12px] [.customer-marketplace_&]:flex-wrap [.customer-marketplace_&]:my-[20px] [.customer-marketplace_&]:mx-0 [.customer-marketplace_&_button]:py-[6px] [.customer-marketplace_&_button]:px-[10px] [.customer-marketplace_&_button]:text-[12px] [.customer-marketplace_&_button]:bg-[#faf2f3] [.customer-marketplace_&_.cm-reset]:py-[4px] [.customer-marketplace_&_.cm-reset]:px-0 [.customer-marketplace_&_.cm-reset]:border-0 [.customer-marketplace_&_.cm-reset]:bg-transparent [.customer-marketplace_&_.cm-reset]:text-[#8c414e] [.customer-marketplace_&_.cm-reset]:text-[10px] [.customer-marketplace_&_.cm-reset]:underline [.customer-marketplace_&_.cm-reset]:[text-underline-offset:3px] [.customer-marketplace.cm-browse_&]:gap-[8px] [.customer-marketplace.cm-browse_&]:mt-0 [.customer-marketplace.cm-browse_&]:mx-0 [.customer-marketplace.cm-browse_&]:mb-[20px] [.customer-marketplace.cm-browse_&_button]:border-[#eadbd6] [.customer-marketplace.cm-browse_&_button]:bg-[#f6eeea] [.customer-marketplace.cm-browse_&_button]:text-[#90616a] [.customer-marketplace.cm-browse_&_button]:text-[10px]">
          {activeFilters.map(([k, v]) => (
            <button
              key={k}
              aria-label={`Remove ${k} filter`}
              onClick={() => filter(k, "")}
            >
              {k === "category"
                ? matched?.name || v
                : k === "subcategory"
                  ? catalog.data?.subcategories.find((s) => String(s.id) === v)
                      ?.name || v
                  : k === "city"
                    ? `Location: ${catalog.data?.cities.find(l => String(l.id).toLowerCase() === v.toLowerCase() || l.city === v)?.name || "Unavailable location"}`
                    : `${{ q: "Search", min: "Min price", max: "Max price", postalCode: "Postal code", serviceType: "Service type", date: "Event date", guests: "Guests", rating: "Rating" }[k] || k}: ${v}`}{" "}
              <X size={12} />
            </button>
          ))}
          {activeFilters.length > 0 && (
            <button className="cm-reset" onClick={resetFilters}>
              Clear all
            </button>
          )}
        </div>
      )}
      <ReadState state={catalog} />
      <div className="cm-body [.customer-marketplace_&]:grid [.customer-marketplace_&]:grid-cols-[235px_1fr] [.customer-marketplace_&]:gap-[28px] [.customer-marketplace_&]:[align-items:start] max-[760.001px]:[.customer-marketplace_&]:grid-cols-[1fr] [.customer-marketplace.cm-browse_&]:grid-cols-[minmax(0,_1fr)] [.customer-marketplace.cm-browse_&]:mt-[6px] max-[760.001px]:[.customer-marketplace.cm-browse_&]:grid-cols-[minmax(0,_1fr)]">
        {open && (
          <FilterDrawer
            close={() => setOpen(false)}
            reset={resetFilters}
            canReset={activeFilters.length > 0}
            total={results.data?.total}
          >
            {filters}
          </FilterDrawer>
        )}
        <section
          aria-label="Search results"
          className="cm-results [.customer-marketplace_&]:min-w-0"
          aria-busy={results.loading || catalog.loading || false}
        >
          <div className="cm-results-heading [.customer-marketplace_&]:flex [.customer-marketplace_&]:justify-between [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[16px] [.customer-marketplace_&]:pt-[3px] [.customer-marketplace_&]:px-0 [.customer-marketplace_&]:pb-[20px] [.customer-marketplace_&_.cm-kicker]:text-[8px] [.customer-marketplace_&_.cm-kicker]:tracking-[1.6px] [.customer-marketplace_&_.cm-kicker]:text-[#a4837b] [.customer-marketplace_&_h1]:mt-[5px] [.customer-marketplace_&_h1]:mx-0 [.customer-marketplace_&_h1]:mb-0 [.customer-marketplace_&_h1]:text-[26px] [.customer-marketplace_&_h1]:leading-[1.2] [.customer-marketplace_&_h1]:tracking-[-0.6px] [.customer-marketplace_&_>_p]:shrink-0 [.customer-marketplace_&_>_p]:text-[11px] [.customer-marketplace_&_>_p]:text-[#978486] [.customer-marketplace_&_>_p_strong]:text-[#675156] [.customer-marketplace_&_>_p_strong]:font-medium max-[760.001px]:[.customer-marketplace_&]:pb-[16px] max-[760.001px]:[.customer-marketplace_&_h1]:text-[25px] max-[760.001px]:[.customer-marketplace_&_.cm-kicker]:text-[7px] max-[760.001px]:[.customer-marketplace_&_.cm-kicker]:tracking-[1.1px]">
            <div>
              <p className="cm-kicker [.customer-marketplace_&]:tracking-[0.16em] [.customer-marketplace_&]:text-[11px] [.customer-marketplace_&]:uppercase [.customer-marketplace_&]:text-[#8c414e]">YOUR CELEBRATION STARTS HERE</p>
              <h1>
                {matched?.name ||
                  (kind === "vendors"
                    ? "Meet the professionals"
                    : kind === "packages"
                      ? "Beautifully brought together"
                      : "Discover the possibilities")}
              </h1>
            </div>
            <p aria-live="polite">
              {results.data ? (
                <>
                  <strong>{results.data.total}</strong>{" "}
                  {results.data.total === 1 ? "result" : "results"}
                </>
              ) : (
                "Finding your possibilities…"
              )}
            </p>
          </div>
          {results.loading ? (
            <div
              className="cm-grid [.customer-marketplace_&]:grid [.customer-marketplace_&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [.customer-marketplace_&]:gap-[22px] [.customer-marketplace_&.cm-list]:grid-cols-[1fr] max-[1100.001px]:[.customer-marketplace_&]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[480.001px]:[.customer-marketplace_&]:grid-cols-[1fr] max-[480.001px]:[.customer-marketplace_&.cm-list_.cm-card]:grid-cols-[1fr] [.customer-marketplace.cm-browse_&]:gap-[20px] [.customer-marketplace.cm-browse_&:not(.cm-list)]:grid-cols-[repeat(auto-fill,_minmax(min(100%,_300px),_300px))] [.customer-marketplace.cm-browse_&:not(.cm-list)]:[justify-content:start] max-[1100.001px]:[.customer-marketplace.cm-browse_&]:gap-[16px] max-[1100.001px]:[.customer-marketplace.cm-browse_&.cm-list]:grid-cols-[1fr] max-[520.001px]:[.customer-marketplace.cm-browse_&]:gap-[20px] max-[520.001px]:[.customer-marketplace.cm-browse_&.cm-list_.cm-card]:grid-cols-[110px_minmax(0,_1fr)]"
              role="status"
              aria-label="Loading listings"
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="cm-skeleton [.customer-marketplace_&]:h-[360px] [.customer-marketplace_&]:bg-[#f4efeb] [.customer-marketplace_&]:rounded-[16px]" />
              ))}
            </div>
          ) : results.error ? (
            <ReadState state={results} />
          ) : results.data?.rows.length ? (
            <>
              <div className={`cm-grid [.customer-marketplace_&]:grid [.customer-marketplace_&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [.customer-marketplace_&]:gap-[22px] [.customer-marketplace_&.cm-list]:grid-cols-[1fr] max-[1100.001px]:[.customer-marketplace_&]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[480.001px]:[.customer-marketplace_&]:grid-cols-[1fr] max-[480.001px]:[.customer-marketplace_&.cm-list_.cm-card]:grid-cols-[1fr] [.customer-marketplace.cm-browse_&]:gap-[20px] [.customer-marketplace.cm-browse_&:not(.cm-list)]:grid-cols-[repeat(auto-fill,_minmax(min(100%,_300px),_300px))] [.customer-marketplace.cm-browse_&:not(.cm-list)]:[justify-content:start] max-[1100.001px]:[.customer-marketplace.cm-browse_&]:gap-[16px] max-[1100.001px]:[.customer-marketplace.cm-browse_&.cm-list]:grid-cols-[1fr] max-[520.001px]:[.customer-marketplace.cm-browse_&]:gap-[20px] max-[520.001px]:[.customer-marketplace.cm-browse_&.cm-list_.cm-card]:grid-cols-[110px_minmax(0,_1fr)] ${view === "list" ? "cm-list [.customer-marketplace_&_.cm-card]:grid [.customer-marketplace_&_.cm-card]:grid-cols-[210px_1fr] [.customer-marketplace_&_.cm-photo]:[aspect-ratio:auto] [.customer-marketplace_&_.cm-photo]:min-h-[190px] max-[760.001px]:[.customer-marketplace_&_.cm-card]:grid-cols-[130px_1fr] [.customer-marketplace.cm-browse_&_.cm-card]:grid [.customer-marketplace.cm-browse_&_.cm-card]:grid-cols-[minmax(200px,_34%)_minmax(0,_1fr)] [.customer-marketplace.cm-browse_&_.cm-photo]:h-full [.customer-marketplace.cm-browse_&_.cm-photo]:min-h-[260px] [.customer-marketplace.cm-browse_&_.cm-photo]:[aspect-ratio:auto] [.customer-marketplace.cm-browse_&_.cm-card-body]:p-[24px] [.customer-marketplace.cm-browse_&_.cm-card-body_>_.cm-actions]:max-w-[240px] max-[1100.001px]:[.customer-marketplace.cm-browse_&_.cm-card]:grid-cols-[minmax(160px,_35%)_minmax(0,_1fr)] max-[760.001px]:[.customer-marketplace.cm-browse_&_.cm-card-body]:p-[17px] max-[520.001px]:[.customer-marketplace.cm-browse_&_.cm-photo]:min-h-[230px] max-[520.001px]:[.customer-marketplace.cm-browse_&_.cm-card_h3]:text-[19px] max-[520.001px]:[.customer-marketplace.cm-browse_&_.cm-card-body]:p-[12px] max-[520.001px]:[.customer-marketplace_&_.cm-discovery-card_.commerce-price]:flex-wrap max-[520.001px]:[.customer-marketplace_&_.cm-discovery-card_.commerce-offer-actions]:flex-wrap max-[520.001px]:[.customer-marketplace_&_.cm-discovery-card_.commerce-offer-actions_>_button]:[flex-basis:70px] max-[520.001px]:[.customer-marketplace_&_.cm-discovery-card_.commerce-offer-actions_>_a]:[flex-basis:70px] max-[520.001px]:[.customer-marketplace_&_.cm-discovery-card_.cm-card-footer]:flex-wrap max-[520.001px]:[.customer-marketplace.cm-browse_&_.cm-card-topline]:items-start max-[520.001px]:[.customer-marketplace.cm-browse_&_.cm-card-topline]:flex-col" : ""}`}>
                {results.data.rows.map((item) => (
                  <DiscoveryCard
                    key={item.id}
                    item={item}
                    compare={compare.some((c) => c.id === item.id)}
                    compareFull={compare.length >= 3}
                    toggleCompare={
                      kind === "services" ? toggleCompare : undefined
                    }
                  />
                ))}
              </div>
              <div className="cm-pagination [.customer-marketplace_&]:flex [.customer-marketplace_&]:items-center [.customer-marketplace_&]:gap-[12px] [.customer-marketplace_&]:flex-wrap [.customer-marketplace_&]:my-[20px] [.customer-marketplace_&]:mx-0 [.customer-marketplace_&]:justify-center [.customer-marketplace.cm-browse_&]:gap-[16px] [.customer-marketplace.cm-browse_&]:my-[28px] [.customer-marketplace.cm-browse_&]:mx-0 [.customer-marketplace.cm-browse_&]:pt-[20px] [.customer-marketplace.cm-browse_&]:border-t [.customer-marketplace.cm-browse_&]:border-t-[#e9e0db] [.customer-marketplace.cm-browse_&]:text-[11px] [.customer-marketplace.cm-browse_&]:text-[#9c8682] [.customer-marketplace.cm-browse_&_button]:py-[8px] [.customer-marketplace.cm-browse_&_button]:px-[12px] [.customer-marketplace.cm-browse_&_button]:rounded-[6px] [.customer-marketplace.cm-browse_&_button]:bg-[#fffdfa] [.customer-marketplace.cm-browse_&_button]:text-[10px]">
                <button
                  disabled={results.data.page <= 1}
                  onClick={() =>
                    setParams((p) => {
                      const n = new URLSearchParams(p);
                      n.set("page", results.data.page - 1);
                      return n;
                    })
                  }
                >
                  Previous
                </button>
                <span>
                  Page {results.data.page} of{" "}
                  {Math.max(
                    1,
                    Math.ceil(results.data.total / results.data.pageSize),
                  )}
                </span>
                <button
                  disabled={
                    results.data.page * results.data.pageSize >=
                    results.data.total
                  }
                  onClick={() =>
                    setParams((p) => {
                      const n = new URLSearchParams(p);
                      n.set("page", results.data.page + 1);
                      return n;
                    })
                  }
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            results.data && (
              <div className="cm-state [.customer-marketplace_&]:border [.customer-marketplace_&]:border-[#e8dfd9] [.customer-marketplace_&]:p-[32px] [.customer-marketplace_&]:rounded-[16px] cm-empty-results [.customer-marketplace.cm-browse_&]:flex [.customer-marketplace.cm-browse_&]:flex-col [.customer-marketplace.cm-browse_&]:items-center [.customer-marketplace.cm-browse_&]:justify-center [.customer-marketplace.cm-browse_&]:gap-[14px] [.customer-marketplace.cm-browse_&]:min-h-[320px] [.customer-marketplace.cm-browse_&]:p-[35px] [.customer-marketplace.cm-browse_&]:[border-style:dashed] [.customer-marketplace.cm-browse_&]:rounded-[10px] [.customer-marketplace.cm-browse_&]:bg-[#fffaf5] [.customer-marketplace.cm-browse_&]:text-center [.customer-marketplace.cm-browse_&]:text-[#ab817a] [.customer-marketplace_&_h2]:m-0 [.customer-marketplace_&_h2]:text-[#634950] [.customer-marketplace_&_h2]:text-[27px] [.customer-marketplace_&_p]:max-w-[350px] [.customer-marketplace_&_p]:text-[12px] [.customer-marketplace_&_button]:mt-[5px] [.customer-marketplace_&_button]:text-[11px]">
                <Flower2 size={34} strokeWidth={1} />
                <h2>Let’s try a different combination.</h2>
                <p>
                  Try another city, broaden your price range, or remove a
                  filter.
                </p>
                <button className="cm-primary" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            )
          )}
        </section>
      </div>
      {compare.length > 0 && (
        <section className="cm-panel [.customer-marketplace_&]:border [.customer-marketplace_&]:border-[#e8dfd9] [.customer-marketplace_&]:rounded-[16px] [.customer-marketplace_&]:p-[24px] [.customer-marketplace_&]:mb-[20px] [.customer-marketplace_&]:bg-white">
          <h2>Compare your shortlist ({compare.length}/3)</h2>
          <div className="cm-table-wrap [.customer-marketplace_&]:max-w-full [.customer-marketplace_&]:overflow-auto">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  {compare.map((i) => (
                    <th key={i.id}>
                      <Link to={`/services/${i.id}`}>{i.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Vendor", (i) => i.vendor],
                  ["Starting price", (i) => money(i.price)],
                  ["Location", (i) => i.city],
                  ["Rating", (i) => Number(i.rating || 0).toFixed(1)],
                  ["Guest limit", (i) => i.maxGuests || "Flexible"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    {compare.map((i) => (
                      <td key={i.id}>{value(i)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setCompare([])}>Clear comparison</button>
        </section>
      )}
    </main>
  );
}
