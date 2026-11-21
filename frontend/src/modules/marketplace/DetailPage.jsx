import OfferActions, { OfferPrices } from "../commerce/OfferActions";
import { MediaGallery } from '../media/MediaLibrary';
import { PublicReviews } from '../reviews/Reviews';
import { useReviews } from '../reviews/api';
import WishlistButton from "../customer/components/WishlistButton";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
  Users,
  CalendarDays,
  Tag,
  PackageOpen,
  Check,
  Heart,
  Images,
  Mail,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { save } from "../customer/services/workspace.api";
import { useMarketplace, money } from "./api";
import { offerState } from "../commerce/offer-state";
import { DiscoveryCard, ReadState } from "./BrowsePage";
const ServiceInquiry = lazy(() => import("../customer/components/ServiceInquiryForm"));

function ListingSectionNavigation({ hasOffer, reviewCount }) {
  const [active, setActive] = useState("listing-overview");
  const nav = useRef(null);
  useEffect(() => {
    const ids = ["listing-overview", "listing-packages", ...(!hasOffer ? ["listing-availability"] : []), "listing-policies", "listing-reviews"];
    let frame;
    const update = () => {
      setActive(ids.filter((id) => document.getElementById(id)?.getBoundingClientRect().top <= 220).at(-1) || ids[0]);
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
  }, [hasOffer]);
  const sections = [
    ["listing-overview", "Overview"],
    ["listing-packages", "Packages"],
    ...(!hasOffer ? [["listing-availability", "Availability"]] : []),
    ["listing-policies", "Policies"],
    ["listing-reviews", "Reviews"],
  ];
  return (
    <nav ref={nav} aria-label="Listing sections" className="flex gap-5 overflow-x-auto border-b border-[#e6dcd7] px-1 text-sm font-medium text-[#8b757e] sm:gap-7">
      {sections.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} className="flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-1 py-4 hover:text-rose-brand aria-[current=location]:border-rose-brand aria-[current=location]:text-rose-brand">{label}{id === "listing-reviews" && reviewCount > 0 && <span className="rounded bg-[#f0e8e5] px-1.5 py-0.5 text-xs">{reviewCount}</span>}</a>)}
    </nav>
  );
}

export function AvailabilityCalendar({ id }) {
  const [from, setFrom] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const state = useMarketplace(`/services/${id}/availability?from=${from}`);
  return (
    <section className={`${panel} p-5 sm:p-7`} aria-labelledby="service-availability-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-brand">Save the date</p><h2 id="service-availability-title" className="font-serif text-[28px] tracking-[-0.6px]">Availability</h2></div>
        <CalendarDays size={23} className="mt-2 text-[#ad8b96]" aria-hidden="true" />
      </div>
      <label className="mt-5 grid max-w-xs gap-2 text-sm font-medium text-[#6e5d64]">Starting date<input className={field} type="date" value={from} onChange={(event) => { if (event.target.value) setFrom(event.target.value); }} /></label>
      <ReadState state={state} />
      {state.data && <div className="mt-5 grid grid-cols-7 gap-2">{state.data.days.map((day) => <span key={day.date} aria-disabled={!day.available} title={`${day.date}: ${day.reason || "Available to request"}`} aria-label={`${day.date}: ${day.reason || "Available to request"}`} className="flex min-h-11 items-center justify-center rounded-lg border border-[#dce9dc] bg-[#eff5ed] px-1 py-2 text-sm font-medium text-[#548863] aria-disabled:border-[#eee3e0] aria-disabled:bg-[#f8f2ef] aria-disabled:text-[#b4938d] aria-disabled:line-through">{day.date.slice(8)}</span>)}</div>}
      <p className="mt-4 text-xs leading-6 text-[#99868e]">Available dates can be requested. The server checks availability again when booking.</p>
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
      <main id="main-content" className="customer-marketplace [&]:max-w-[1320px] [&]:m-auto [&]:pt-[140px] [&]:px-[32px] [&]:pb-[70px] [&]:text-[#302725] [&]:[font-family:inherit] [&]:min-h-[70vh] [&]:wrap-anywhere [&.cm-embedded]:p-0 [&.cm-embedded]:max-w-none [&_*]:box-border [&_h1]:[font:clamp(32px,_5vw,_56px)/1.12_Georgia,_serif] [&_h1]:my-[20px] [&_h1]:mx-0 [&_h2]:[font:28px/1.2_Georgia,_serif] [&_h2]:my-[20px] [&_h2]:mx-0 [&_h3]:[font:21px/1.3_Georgia,_serif] [&_h3]:my-[10px] [&_h3]:mx-0 [&_p]:leading-[1.7] [&_.cm-kicker]:tracking-[0.16em] [&_.cm-kicker]:text-[11px] [&_.cm-kicker]:uppercase [&_.cm-kicker]:text-[#8c414e] [&_.cm-toolbar]:flex [&_.cm-toolbar]:items-center [&_.cm-toolbar]:gap-[12px] [&_.cm-toolbar]:flex-wrap [&_.cm-toolbar]:my-[20px] [&_.cm-toolbar]:mx-0 [&_.cm-actions]:flex [&_.cm-actions]:items-center [&_.cm-actions]:gap-[12px] [&_.cm-actions]:flex-wrap [&_.cm-actions]:my-[20px] [&_.cm-actions]:mx-0 [&_.cm-pagination]:flex [&_.cm-pagination]:items-center [&_.cm-pagination]:gap-[12px] [&_.cm-pagination]:flex-wrap [&_.cm-pagination]:my-[20px] [&_.cm-pagination]:mx-0 [&_.cm-pagination]:justify-center [&_.cm-chips]:flex [&_.cm-chips]:items-center [&_.cm-chips]:gap-[12px] [&_.cm-chips]:flex-wrap [&_.cm-chips]:my-[20px] [&_.cm-chips]:mx-0 [&_button]:cursor-pointer [&_button]:border [&_button]:border-[#dfd4ce] [&_button]:rounded-[9px] [&_button]:bg-white [&_button]:py-[11px] [&_button]:px-[16px] [&_button]:inline-flex [&_button]:gap-[8px] [&_button]:items-center [&_button]:text-inherit [&_button]:no-underline [&_button]:[font:inherit] [&_.cm-button]:cursor-pointer [&_.cm-button]:border [&_.cm-button]:border-[#dfd4ce] [&_.cm-button]:rounded-[9px] [&_.cm-button]:bg-white [&_.cm-button]:py-[11px] [&_.cm-button]:px-[16px] [&_.cm-button]:inline-flex [&_.cm-button]:gap-[8px] [&_.cm-button]:items-center [&_.cm-button]:text-inherit [&_.cm-button]:no-underline [&_.cm-button]:[font:inherit] [&_button:disabled]:opacity-45 [&_button:disabled]:[cursor:not-allowed] [&_.cm-primary]:bg-[#8c414e] [&_.cm-primary]:text-white [&_.cm-primary]:border-[#8c414e] [&_:focus-visible]:outline-3 [&_:focus-visible]:outline-[#8c414e] [&_:focus-visible]:outline-offset-[3px] [&_input]:bg-white [&_input]:border [&_input]:border-[#dfd4ce] [&_input]:rounded-[8px] [&_input]:p-[11px] [&_input]:w-full [&_input]:[font:inherit] [&_input]:text-inherit [&_input]:min-w-0 [&_select]:bg-white [&_select]:border [&_select]:border-[#dfd4ce] [&_select]:rounded-[8px] [&_select]:p-[11px] [&_select]:w-full [&_select]:[font:inherit] [&_select]:text-inherit [&_select]:min-w-0 [&_label]:grid [&_label]:gap-[7px] [&_label]:text-[13px] [&_.cm-search]:flex-1 [&_.cm-search]:min-w-[200px] [&_.cm-body]:grid [&_.cm-body]:grid-cols-[235px_1fr] [&_.cm-body]:gap-[28px] [&_.cm-body]:[align-items:start] [&_.cm-filters]:p-[22px] [&_.cm-filters]:border [&_.cm-filters]:border-[#e8dfd9] [&_.cm-filters]:rounded-[16px] [&_.cm-filters]:grid [&_.cm-filters]:gap-[16px] [&_.cm-filters]:bg-[#fcfaf7] [&_.cm-card]:overflow-hidden [&_.cm-card]:border [&_.cm-card]:border-[#e8dfd9] [&_.cm-card]:rounded-[16px] [&_.cm-card]:bg-white [&_.cm-card]:min-w-0 [&_.cm-photo]:[aspect-ratio:4/3] [&_.cm-photo]:bg-[#f3ece7] [&_.cm-photo]:grid [&_.cm-photo]:[place-items:center] [&_.cm-photo]:overflow-hidden [&_.cm-photo_img]:w-full [&_.cm-photo_img]:h-full [&_.cm-photo_img]:object-cover [&_.cm-card-body]:p-[18px] [&_.cm-card_.cm-actions]:mb-0 [&_.cm-list_.cm-card]:grid [&_.cm-list_.cm-card]:grid-cols-[210px_1fr] [&_.cm-list_.cm-photo]:[aspect-ratio:auto] [&_.cm-list_.cm-photo]:min-h-[190px] [&_.cm-state]:border [&_.cm-state]:border-[#e8dfd9] [&_.cm-state]:p-[32px] [&_.cm-state]:rounded-[16px] [&_.cm-skeleton]:h-[360px] [&_.cm-skeleton]:bg-[#f4efeb] [&_.cm-skeleton]:rounded-[16px] [&_.cm-chips_button]:py-[6px] [&_.cm-chips_button]:px-[10px] [&_.cm-chips_button]:text-[12px] [&_.cm-chips_button]:bg-[#faf2f3] [&_.cm-gallery]:grid [&_.cm-gallery]:grid-cols-[repeat(3,_1fr)] [&_.cm-gallery]:gap-[12px] [&_.cm-gallery]:my-[24px] [&_.cm-gallery]:mx-0 [&_.cm-gallery_img]:h-[260px] [&_.cm-gallery_img]:w-full [&_.cm-gallery_img]:object-cover [&_.cm-gallery_img]:rounded-[14px] [&_.cm-detail]:grid [&_.cm-detail]:grid-cols-[minmax(0,_1fr)_340px] [&_.cm-detail]:gap-[30px] [&_.cm-sticky]:[position:sticky] [&_.cm-sticky]:top-[110px] [&_.cm-table-wrap]:max-w-full [&_.cm-table-wrap]:overflow-auto [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:border-b [&_th]:border-b-[#e8dfd9] [&_th]:p-[12px] [&_th]:min-w-[130px] [&_td]:text-left [&_td]:border-b [&_td]:border-b-[#e8dfd9] [&_td]:p-[12px] [&_td]:min-w-[130px] [&_.cm-filter-toggle]:hidden [&_.cm-compare-label]:flex [&_.cm-compare-label]:items-center [&_.cm-compare-label]:mt-[14px] [&_.cm-compare-label_input]:w-[16px] [&_.cm-review]:border-b [&_.cm-review]:border-b-[#e8dfd9] [&_.cm-review]:py-[18px] [&_.cm-review]:px-0 [&_.cm-error]:text-[#9d253c] [&_.cm-empty-icon]:text-[#8c414e] max-[1100.001px]:[&_.cm-detail]:grid-cols-[minmax(0,_1fr)_290px] max-[760.001px]:[&]:pt-[110px] max-[760.001px]:[&]:px-[18px] max-[760.001px]:[&]:pb-[40px] max-[760.001px]:[&_.cm-body]:grid-cols-[1fr] max-[760.001px]:[&_.cm-detail]:grid-cols-[1fr] max-[760.001px]:[&_.cm-filter-toggle]:inline-flex max-[760.001px]:[&_.cm-filters]:hidden max-[760.001px]:[&_.cm-filters.cm-open]:grid max-[760.001px]:[&_.cm-sticky]:[position:static] max-[760.001px]:[&_.cm-gallery]:grid-cols-[1fr_1fr] max-[760.001px]:[&_.cm-gallery_img]:h-[180px] max-[760.001px]:[&_.cm-list_.cm-card]:grid-cols-[130px_1fr] max-[480.001px]:[&_.cm-gallery_img]:h-[130px] [&.cm-filter-dialog]:max-w-[420px] [&.cm-filter-dialog]:w-[calc(100%_-_32px)] [&.cm-filter-dialog]:max-h-[90dvh] [&.cm-filter-dialog]:p-[24px] [&.cm-filter-dialog]:border [&.cm-filter-dialog]:border-[#e8dfd9] [&.cm-filter-dialog]:rounded-[16px] [&.cm-filter-dialog]:[overflow-y:auto] [&.cm-filter-dialog]:bg-[#fcfaf7] [&.cm-filter-dialog]:min-h-0 [&.cm-filter-dialog::backdrop]:bg-[rgb(40_25_25_/_0.45)] [&_.cm-drawer-fields]:grid [&_.cm-drawer-fields]:gap-[16px] [&_.cm-drawer-fields]:mb-[24px] [&&.cm-detail-page_.cm-kicker]:text-[10px] [&&.cm-detail-page_.cm-kicker]:font-semibold [&&.cm-detail-page_.cm-kicker]:tracking-[.19em] [&&.cm-detail-page_.cm-kicker]:m-0 [&&.cm-detail-page_.cm-button]:text-[12px] [&&.cm-detail-page_.cm-button]:min-h-[43px] [&&.cm-detail-page_.cm-button]:rounded-[8px] [&&.cm-detail-page_.cm-button]:justify-center [&&.cm-detail-page_.cm-button]:transition-[box-shadow,border-color,background-color] [&&.cm-detail-page_.cm-button]:duration-200 [&&.cm-detail-page_.cm-button]:ease-[ease] [&&.cm-detail-page_.cm-button:hover]:border-[#8c414e] [&&.cm-detail-page_.cm-button:hover]:shadow-[0_3px_10px_#3027250a] [&&.cm-detail-page_.cm-primary:hover]:shadow-[0_4px_14px_#8c414e30] [&.cm-detail-page_.cm-editorial-gallery]:relative [&.cm-detail-page_.cm-editorial-gallery]:rounded-[18px] [&.cm-detail-page_.cm-editorial-gallery]:overflow-hidden [&.cm-detail-page_.cm-editorial-gallery]:bg-[#f3ece7] [&.cm-detail-page_.cm-editorial-gallery]:h-[clamp(340px,_34vw,_490px)] [&.cm-detail-page_.cm-editorial-gallery[data-empty=true]]:h-auto [&.cm-detail-page_.cm-editorial-gallery[data-empty=true]_.cm-gallery-placeholder]:min-h-[410px] [&.cm-detail-page_.cm-gallery-mosaic]:grid [&.cm-detail-page_.cm-gallery-mosaic]:h-full [&.cm-detail-page_.cm-gallery-mosaic]:grid-cols-[minmax(0,_1.6fr)_minmax(0,_1fr)] [&.cm-detail-page_.cm-gallery-mosaic]:[grid-template-rows:1fr_1fr] [&.cm-detail-page_.cm-gallery-mosaic]:gap-[5px] [&.cm-detail-page_.cm-gallery-mosaic_>_button]:p-0 [&.cm-detail-page_.cm-gallery-mosaic_>_button]:border-0 [&.cm-detail-page_.cm-gallery-mosaic_>_button]:rounded-[0] [&.cm-detail-page_.cm-gallery-mosaic_>_button]:block [&.cm-detail-page_.cm-gallery-mosaic_>_button]:overflow-hidden [&.cm-detail-page_.cm-gallery-mosaic_>_button]:h-full [&.cm-detail-page_.cm-gallery-mosaic_>_button]:min-h-0 [&.cm-detail-page_.cm-gallery-mosaic_>_button:first-child]:[grid-row:1_/_-1] [&.cm-detail-page_.cm-gallery-mosaic_>_button:nth-child(2):last-child]:[grid-row:1_/_-1] [&.cm-detail-page_.cm-gallery-single]:grid-cols-[1fr] [&.cm-detail-page_.cm-gallery-rich]:grid-cols-[1.8fr_1fr_1fr] [&.cm-detail-page_.cm-gallery-rich_>_button:nth-child(4):last-child]:[grid-column:2_/_-1] [&.cm-detail-page_.cm-gallery-mosaic_img]:block [&.cm-detail-page_.cm-gallery-mosaic_img]:h-full [&.cm-detail-page_.cm-gallery-mosaic_img]:w-full [&.cm-detail-page_.cm-gallery-mosaic_img]:object-cover [&.cm-detail-page_.cm-gallery-mosaic_img]:transition-[transform] [&.cm-detail-page_.cm-gallery-mosaic_img]:duration-400 [&.cm-detail-page_.cm-gallery-mosaic_img]:ease-[ease] [&.cm-detail-page_.cm-gallery-mosaic_button:hover_img]:[transform:scale(1.035)] [&.cm-detail-page_.cm-gallery-mosaic_button:focus-visible]:outline-offset-[-5px] [&.cm-detail-page_.cm-gallery-mosaic_button:focus-visible]:relative [&.cm-detail-page_.cm-gallery-mosaic_button:focus-visible]:z-[1] [&.cm-detail-page_.cm-gallery-view]:absolute [&.cm-detail-page_.cm-gallery-view]:right-[24px] [&.cm-detail-page_.cm-gallery-view]:bottom-[24px] [&.cm-detail-page_.cm-gallery-view]:bg-white [&.cm-detail-page_.cm-gallery-view]:shadow-[0_3px_12px_#30272512] [&.cm-detail-page_.cm-gallery-view]:z-[1] [&.cm-detail-page_.cm-gallery-view]:rounded-[24px] [&.cm-detail-page_.cm-gallery-view]:[padding-inline:18px] [&.cm-detail-page_.cm-gallery-label]:absolute [&.cm-detail-page_.cm-gallery-label]:top-[24px] [&.cm-detail-page_.cm-gallery-label]:left-[24px] [&.cm-detail-page_.cm-gallery-label]:inline-flex [&.cm-detail-page_.cm-gallery-label]:items-center [&.cm-detail-page_.cm-gallery-label]:gap-[8px] [&.cm-detail-page_.cm-gallery-label]:text-[9px] [&.cm-detail-page_.cm-gallery-label]:tracking-[.17em] [&.cm-detail-page_.cm-gallery-label]:bg-[#fcfaf7] [&.cm-detail-page_.cm-gallery-label]:text-[#302725] [&.cm-detail-page_.cm-gallery-label]:py-[10px] [&.cm-detail-page_.cm-gallery-label]:px-[15px] [&.cm-detail-page_.cm-gallery-label]:rounded-[20px] [&.cm-detail-page_.cm-gallery-cover]:w-full [&.cm-detail-page_.cm-gallery-cover]:h-full [&.cm-detail-page_.cm-gallery-cover]:object-cover [&.cm-detail-page_.cm-gallery-note]:absolute [&.cm-detail-page_.cm-gallery-note]:bottom-[12px] [&.cm-detail-page_.cm-gallery-note]:left-[12px] [&.cm-detail-page_.cm-gallery-note]:right-[12px] [&.cm-detail-page_.cm-gallery-note]:bg-white [&.cm-detail-page_.cm-gallery-note]:py-[8px] [&.cm-detail-page_.cm-gallery-note]:px-[12px] [&.cm-detail-page_.cm-gallery-note]:rounded-[8px] [&.cm-detail-page_.cm-gallery-note]:text-[11px] [&.cm-detail-page_.cm-gallery-placeholder]:relative [&.cm-detail-page_.cm-gallery-placeholder]:h-full [&.cm-detail-page_.cm-gallery-placeholder]:py-[54px] [&.cm-detail-page_.cm-gallery-placeholder]:px-[7%] [&.cm-detail-page_.cm-gallery-placeholder]:flex [&.cm-detail-page_.cm-gallery-placeholder]:[flex-direction:row] [&.cm-detail-page_.cm-gallery-placeholder]:items-center [&.cm-detail-page_.cm-gallery-placeholder]:justify-between [&.cm-detail-page_.cm-gallery-placeholder]:gap-[32px] [&.cm-detail-page_.cm-gallery-placeholder]:text-left [&.cm-detail-page_.cm-gallery-placeholder]:bg-[linear-gradient(115deg,_#fcfaf7,_#f3ece7)] [&.cm-detail-page_.cm-gallery-placeholder]:text-[#75645d] [&.cm-detail-page_.cm-gallery-placeholder]:border [&.cm-detail-page_.cm-gallery-placeholder]:border-[#e8dfd9] [&.cm-detail-page_.cm-gallery-placeholder]:rounded-[inherit] [&.cm-detail-page_.cm-gallery-placeholder::before]:content-[''] [&.cm-detail-page_.cm-gallery-placeholder::before]:absolute [&.cm-detail-page_.cm-gallery-placeholder::before]:inset-[16px] [&.cm-detail-page_.cm-gallery-placeholder::before]:border [&.cm-detail-page_.cm-gallery-placeholder::before]:border-[#dfd4ce] [&.cm-detail-page_.cm-gallery-placeholder::before]:rounded-[8px] [&.cm-detail-page_.cm-gallery-placeholder::before]:[pointer-events:none] [&.cm-detail-page_.cm-gallery-placeholder_h2]:text-[clamp(30px,_3.7vw,_52px)] [&.cm-detail-page_.cm-gallery-placeholder_h2]:leading-[1.12] [&.cm-detail-page_.cm-gallery-placeholder_h2]:text-[#302725] [&.cm-detail-page_.cm-gallery-placeholder_h2]:my-[20px] [&.cm-detail-page_.cm-gallery-placeholder_h2]:mx-0 [&.cm-detail-page_.cm-gallery-placeholder_h2_em]:font-normal [&.cm-detail-page_.cm-gallery-placeholder_h2_em]:text-[#8c414e] [&.cm-detail-page_.cm-gallery-placeholder_p]:max-w-[340px] [&.cm-detail-page_.cm-gallery-placeholder_p]:text-[12px] [&.cm-detail-page_.cm-gallery-placeholder_p]:leading-[1.9] [&.cm-detail-page_.cm-gallery-placeholder-copy]:relative [&.cm-detail-page_.cm-gallery-placeholder-copy]:z-[1] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:inline-flex [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:items-center [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:gap-[14px] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:border-b [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:border-b-[#8c414e] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:text-[#8c414e] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:pt-0 [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:px-0 [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:pb-[7px] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:mt-[22px] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:text-[11px] [&.cm-detail-page_.cm-gallery-art]:w-[30%] [&.cm-detail-page_.cm-gallery-art]:max-w-[310px] [&.cm-detail-page_.cm-gallery-art]:shrink-0 [&.cm-detail-page_.cm-gallery-art]:text-[#8c414e] [&.cm-detail-page_.cm-gallery-art]:opacity-65 [&.cm-detail-page_.cm-gallery-art]:text-center [&.cm-detail-page_.cm-gallery-art_svg]:w-full [&.cm-detail-page_.cm-gallery-art_svg]:max-h-[330px] [&.cm-detail-page_.cm-gallery-art_>_span]:text-[8px] [&.cm-detail-page_.cm-gallery-art_>_span]:tracking-[.25em] [&.cm-detail-page_.cm-gallery-art_>_span]:block [&.cm-detail-page_.cm-gallery-art_>_span]:mt-[12px] [&.cm-detail-page_.cm-gallery-index]:absolute [&.cm-detail-page_.cm-gallery-index]:bottom-[29px] [&.cm-detail-page_.cm-gallery-index]:left-[7%] [&.cm-detail-page_.cm-gallery-index]:text-[8px] [&.cm-detail-page_.cm-gallery-index]:tracking-[.2em] max-[860.001px]:[&.cm-detail-page_.cm-editorial-gallery]:h-[370px] max-[860.001px]:[&.cm-detail-page_.cm-gallery-placeholder]:[padding-inline:6%] max-[860.001px]:[&.cm-detail-page_.cm-gallery-placeholder]:gap-[18px] max-[860.001px]:[&.cm-detail-page_.cm-gallery-art]:w-[28%] max-[860.001px]:[&.cm-detail-page_.cm-gallery-art_>_span]:hidden max-[560.001px]:[&.cm-detail-page_.cm-editorial-gallery]:h-[340px] max-[560.001px]:[&.cm-detail-page_.cm-editorial-gallery]:rounded-[12px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-mosaic]:grid-cols-[1fr] max-[560.001px]:[&.cm-detail-page_.cm-gallery-mosaic_>_button:not(:first-child)]:hidden max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder]:pt-[32px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder]:px-[32px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder]:pb-[58px] max-[560.001px]:[&.cm-detail-page_.cm-editorial-gallery[data-empty=true]_.cm-gallery-placeholder]:min-h-[350px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder::before]:inset-[10px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-art]:absolute max-[560.001px]:[&.cm-detail-page_.cm-gallery-art]:w-[42%] max-[560.001px]:[&.cm-detail-page_.cm-gallery-art]:right-[20px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-art]:bottom-[22px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-art]:opacity-12 max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder_h2]:text-[clamp(28px,_8vw,_34px)] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder_h2]:[margin-block:17px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder_p]:max-w-[260px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder_p]:text-[11px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:mt-[18px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-index]:bottom-[22px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-index]:left-[32px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-index]:text-[7px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-label]:top-[16px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-label]:left-[16px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-view]:right-[16px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-view]:bottom-[16px] max-[560.001px]:[&&.cm-detail-page_.cm-kicker]:text-[9px] motion-reduce:[&&.cm-detail-page_.cm-button]:transition-none motion-reduce:[&.cm-detail-page_.cm-gallery-mosaic_img]:transition-none cm-detail-page [.customer-marketplace&]:max-w-[1440px] [.customer-marketplace&]:pt-[34px] [.customer-marketplace&]:px-[48px] [.customer-marketplace&]:pb-[90px] [.customer-marketplace&]:text-[14px] [.customer-marketplace&_a]:no-underline [.customer-marketplace&_h1]:text-[clamp(40px,_4.8vw,_66px)] [.customer-marketplace&_h1]:tracking-[-.045em] [.customer-marketplace&_h1]:mt-[12px] [.customer-marketplace&_h1]:mx-0 [.customer-marketplace&_h1]:mb-[19px] [.customer-marketplace&_h1]:leading-[1.06] [.customer-marketplace&_h2]:text-[32px] [.customer-marketplace&_h2]:tracking-[-.03em] [.customer-marketplace&_h2]:mt-[9px] [.customer-marketplace&_h2]:mx-0 [.customer-marketplace&_h2]:mb-[17px] [.customer-marketplace&_h3]:text-[21px] [.customer-marketplace&_h3]:mt-[25px] [.customer-marketplace&_h3]:mx-0 [.customer-marketplace&_h3]:mb-[12px] [.customer-marketplace&_button]:text-[12px] [.customer-marketplace&_button]:min-h-[43px] [.customer-marketplace&_button]:rounded-[8px] [.customer-marketplace&_button]:justify-center [.customer-marketplace&_button]:transition-[box-shadow,border-color,background-color] [.customer-marketplace&_button]:duration-200 [.customer-marketplace&_button]:ease-[ease] [.customer-marketplace&_button:not(:disabled):hover]:border-[#8c414e] [.customer-marketplace&_button:not(:disabled):hover]:shadow-[0_3px_10px_#3027250a] [.customer-marketplace&_[id^='listing-']]:[scroll-margin-top:210px] [.customer-marketplace&_#vendor-services]:[scroll-margin-top:210px] [.customer-marketplace&_.commerce-price]:grid [.customer-marketplace&_.commerce-price]:grid-cols-[repeat(auto-fit,_minmax(110px,_1fr))] [.customer-marketplace&_.commerce-price]:gap-[16px] [.customer-marketplace&_.commerce-price]:mt-0 [.customer-marketplace&_.commerce-price]:mx-0 [.customer-marketplace&_.commerce-price]:mb-[20px] [.customer-marketplace&_.commerce-price]:p-[17px] [.customer-marketplace&_.commerce-price]:border [.customer-marketplace&_.commerce-price]:border-[#e8dfd9] [.customer-marketplace&_.commerce-price]:rounded-[10px] [.customer-marketplace&_.commerce-price]:bg-[#fcfaf7] [.customer-marketplace&_.commerce-price_small]:text-[11px] [.customer-marketplace&_.commerce-price_small]:text-[#75645d] [.customer-marketplace&_.commerce-price_strong]:block [.customer-marketplace&_.commerce-price_strong]:[font:30px/1.2_Georgia,_serif] [.customer-marketplace&_.commerce-price_strong]:tracking-[-.04em] [.customer-marketplace&_.commerce-price_strong]:my-[7px] [.customer-marketplace&_.commerce-price_strong]:mx-0 [.customer-marketplace&_.commerce-price_p]:m-0 [.customer-marketplace&_.commerce-price_p]:text-[10px] [.customer-marketplace&_.commerce-price_p]:text-[#75645d] [.customer-marketplace&_.commerce-offer-actions]:grid [.customer-marketplace&_.commerce-offer-actions]:grid-cols-[1fr] [.customer-marketplace&_.commerce-offer-actions]:gap-[9px] [.customer-marketplace&_.commerce-offer-actions]:mt-[20px] [.customer-marketplace&_.commerce-offer-actions]:mx-0 [.customer-marketplace&_.commerce-offer-actions]:mb-0 [.customer-marketplace&_#listing-reviews_.rr-panel]:border-[#e8dfd9] [.customer-marketplace&_#listing-reviews_.rr-panel]:rounded-[12px] [.customer-marketplace&_.mm-dialog]:max-w-[calc(100vw_-_32px)] max-[1100.001px]:[.customer-marketplace&]:[padding-inline:28px] max-[560.001px]:[.customer-marketplace&]:pt-[22px] max-[560.001px]:[.customer-marketplace&]:px-[18px] max-[560.001px]:[.customer-marketplace&]:pb-[48px] max-[560.001px]:[.customer-marketplace&_h1]:text-[44px] max-[560.001px]:[.customer-marketplace&_h1]:mt-[12px] max-[560.001px]:[.customer-marketplace&_h1]:mx-0 max-[560.001px]:[.customer-marketplace&_h1]:mb-[16px] max-[560.001px]:[.customer-marketplace&_h2]:text-[28px] motion-reduce:[.customer-marketplace&_button]:transition-none">
        <ReadState state={packageRoute} />
      </main>
    );
  if (state.loading || state.error || !state.data)
    return (
      <main id="main-content" className="customer-marketplace [&]:max-w-[1320px] [&]:m-auto [&]:pt-[140px] [&]:px-[32px] [&]:pb-[70px] [&]:text-[#302725] [&]:[font-family:inherit] [&]:min-h-[70vh] [&]:wrap-anywhere [&.cm-embedded]:p-0 [&.cm-embedded]:max-w-none [&_*]:box-border [&_h1]:[font:clamp(32px,_5vw,_56px)/1.12_Georgia,_serif] [&_h1]:my-[20px] [&_h1]:mx-0 [&_h2]:[font:28px/1.2_Georgia,_serif] [&_h2]:my-[20px] [&_h2]:mx-0 [&_h3]:[font:21px/1.3_Georgia,_serif] [&_h3]:my-[10px] [&_h3]:mx-0 [&_p]:leading-[1.7] [&_.cm-kicker]:tracking-[0.16em] [&_.cm-kicker]:text-[11px] [&_.cm-kicker]:uppercase [&_.cm-kicker]:text-[#8c414e] [&_.cm-toolbar]:flex [&_.cm-toolbar]:items-center [&_.cm-toolbar]:gap-[12px] [&_.cm-toolbar]:flex-wrap [&_.cm-toolbar]:my-[20px] [&_.cm-toolbar]:mx-0 [&_.cm-actions]:flex [&_.cm-actions]:items-center [&_.cm-actions]:gap-[12px] [&_.cm-actions]:flex-wrap [&_.cm-actions]:my-[20px] [&_.cm-actions]:mx-0 [&_.cm-pagination]:flex [&_.cm-pagination]:items-center [&_.cm-pagination]:gap-[12px] [&_.cm-pagination]:flex-wrap [&_.cm-pagination]:my-[20px] [&_.cm-pagination]:mx-0 [&_.cm-pagination]:justify-center [&_.cm-chips]:flex [&_.cm-chips]:items-center [&_.cm-chips]:gap-[12px] [&_.cm-chips]:flex-wrap [&_.cm-chips]:my-[20px] [&_.cm-chips]:mx-0 [&_button]:cursor-pointer [&_button]:border [&_button]:border-[#dfd4ce] [&_button]:rounded-[9px] [&_button]:bg-white [&_button]:py-[11px] [&_button]:px-[16px] [&_button]:inline-flex [&_button]:gap-[8px] [&_button]:items-center [&_button]:text-inherit [&_button]:no-underline [&_button]:[font:inherit] [&_.cm-button]:cursor-pointer [&_.cm-button]:border [&_.cm-button]:border-[#dfd4ce] [&_.cm-button]:rounded-[9px] [&_.cm-button]:bg-white [&_.cm-button]:py-[11px] [&_.cm-button]:px-[16px] [&_.cm-button]:inline-flex [&_.cm-button]:gap-[8px] [&_.cm-button]:items-center [&_.cm-button]:text-inherit [&_.cm-button]:no-underline [&_.cm-button]:[font:inherit] [&_button:disabled]:opacity-45 [&_button:disabled]:[cursor:not-allowed] [&_.cm-primary]:bg-[#8c414e] [&_.cm-primary]:text-white [&_.cm-primary]:border-[#8c414e] [&_:focus-visible]:outline-3 [&_:focus-visible]:outline-[#8c414e] [&_:focus-visible]:outline-offset-[3px] [&_input]:bg-white [&_input]:border [&_input]:border-[#dfd4ce] [&_input]:rounded-[8px] [&_input]:p-[11px] [&_input]:w-full [&_input]:[font:inherit] [&_input]:text-inherit [&_input]:min-w-0 [&_select]:bg-white [&_select]:border [&_select]:border-[#dfd4ce] [&_select]:rounded-[8px] [&_select]:p-[11px] [&_select]:w-full [&_select]:[font:inherit] [&_select]:text-inherit [&_select]:min-w-0 [&_label]:grid [&_label]:gap-[7px] [&_label]:text-[13px] [&_.cm-search]:flex-1 [&_.cm-search]:min-w-[200px] [&_.cm-body]:grid [&_.cm-body]:grid-cols-[235px_1fr] [&_.cm-body]:gap-[28px] [&_.cm-body]:[align-items:start] [&_.cm-filters]:p-[22px] [&_.cm-filters]:border [&_.cm-filters]:border-[#e8dfd9] [&_.cm-filters]:rounded-[16px] [&_.cm-filters]:grid [&_.cm-filters]:gap-[16px] [&_.cm-filters]:bg-[#fcfaf7] [&_.cm-card]:overflow-hidden [&_.cm-card]:border [&_.cm-card]:border-[#e8dfd9] [&_.cm-card]:rounded-[16px] [&_.cm-card]:bg-white [&_.cm-card]:min-w-0 [&_.cm-photo]:[aspect-ratio:4/3] [&_.cm-photo]:bg-[#f3ece7] [&_.cm-photo]:grid [&_.cm-photo]:[place-items:center] [&_.cm-photo]:overflow-hidden [&_.cm-photo_img]:w-full [&_.cm-photo_img]:h-full [&_.cm-photo_img]:object-cover [&_.cm-card-body]:p-[18px] [&_.cm-card_.cm-actions]:mb-0 [&_.cm-list_.cm-card]:grid [&_.cm-list_.cm-card]:grid-cols-[210px_1fr] [&_.cm-list_.cm-photo]:[aspect-ratio:auto] [&_.cm-list_.cm-photo]:min-h-[190px] [&_.cm-state]:border [&_.cm-state]:border-[#e8dfd9] [&_.cm-state]:p-[32px] [&_.cm-state]:rounded-[16px] [&_.cm-skeleton]:h-[360px] [&_.cm-skeleton]:bg-[#f4efeb] [&_.cm-skeleton]:rounded-[16px] [&_.cm-chips_button]:py-[6px] [&_.cm-chips_button]:px-[10px] [&_.cm-chips_button]:text-[12px] [&_.cm-chips_button]:bg-[#faf2f3] [&_.cm-gallery]:grid [&_.cm-gallery]:grid-cols-[repeat(3,_1fr)] [&_.cm-gallery]:gap-[12px] [&_.cm-gallery]:my-[24px] [&_.cm-gallery]:mx-0 [&_.cm-gallery_img]:h-[260px] [&_.cm-gallery_img]:w-full [&_.cm-gallery_img]:object-cover [&_.cm-gallery_img]:rounded-[14px] [&_.cm-detail]:grid [&_.cm-detail]:grid-cols-[minmax(0,_1fr)_340px] [&_.cm-detail]:gap-[30px] [&_.cm-sticky]:[position:sticky] [&_.cm-sticky]:top-[110px] [&_.cm-table-wrap]:max-w-full [&_.cm-table-wrap]:overflow-auto [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:border-b [&_th]:border-b-[#e8dfd9] [&_th]:p-[12px] [&_th]:min-w-[130px] [&_td]:text-left [&_td]:border-b [&_td]:border-b-[#e8dfd9] [&_td]:p-[12px] [&_td]:min-w-[130px] [&_.cm-filter-toggle]:hidden [&_.cm-compare-label]:flex [&_.cm-compare-label]:items-center [&_.cm-compare-label]:mt-[14px] [&_.cm-compare-label_input]:w-[16px] [&_.cm-review]:border-b [&_.cm-review]:border-b-[#e8dfd9] [&_.cm-review]:py-[18px] [&_.cm-review]:px-0 [&_.cm-error]:text-[#9d253c] [&_.cm-empty-icon]:text-[#8c414e] max-[1100.001px]:[&_.cm-detail]:grid-cols-[minmax(0,_1fr)_290px] max-[760.001px]:[&]:pt-[110px] max-[760.001px]:[&]:px-[18px] max-[760.001px]:[&]:pb-[40px] max-[760.001px]:[&_.cm-body]:grid-cols-[1fr] max-[760.001px]:[&_.cm-detail]:grid-cols-[1fr] max-[760.001px]:[&_.cm-filter-toggle]:inline-flex max-[760.001px]:[&_.cm-filters]:hidden max-[760.001px]:[&_.cm-filters.cm-open]:grid max-[760.001px]:[&_.cm-sticky]:[position:static] max-[760.001px]:[&_.cm-gallery]:grid-cols-[1fr_1fr] max-[760.001px]:[&_.cm-gallery_img]:h-[180px] max-[760.001px]:[&_.cm-list_.cm-card]:grid-cols-[130px_1fr] max-[480.001px]:[&_.cm-gallery_img]:h-[130px] [&.cm-filter-dialog]:max-w-[420px] [&.cm-filter-dialog]:w-[calc(100%_-_32px)] [&.cm-filter-dialog]:max-h-[90dvh] [&.cm-filter-dialog]:p-[24px] [&.cm-filter-dialog]:border [&.cm-filter-dialog]:border-[#e8dfd9] [&.cm-filter-dialog]:rounded-[16px] [&.cm-filter-dialog]:[overflow-y:auto] [&.cm-filter-dialog]:bg-[#fcfaf7] [&.cm-filter-dialog]:min-h-0 [&.cm-filter-dialog::backdrop]:bg-[rgb(40_25_25_/_0.45)] [&_.cm-drawer-fields]:grid [&_.cm-drawer-fields]:gap-[16px] [&_.cm-drawer-fields]:mb-[24px] [&&.cm-detail-page_.cm-kicker]:text-[10px] [&&.cm-detail-page_.cm-kicker]:font-semibold [&&.cm-detail-page_.cm-kicker]:tracking-[.19em] [&&.cm-detail-page_.cm-kicker]:m-0 [&&.cm-detail-page_.cm-button]:text-[12px] [&&.cm-detail-page_.cm-button]:min-h-[43px] [&&.cm-detail-page_.cm-button]:rounded-[8px] [&&.cm-detail-page_.cm-button]:justify-center [&&.cm-detail-page_.cm-button]:transition-[box-shadow,border-color,background-color] [&&.cm-detail-page_.cm-button]:duration-200 [&&.cm-detail-page_.cm-button]:ease-[ease] [&&.cm-detail-page_.cm-button:hover]:border-[#8c414e] [&&.cm-detail-page_.cm-button:hover]:shadow-[0_3px_10px_#3027250a] [&&.cm-detail-page_.cm-primary:hover]:shadow-[0_4px_14px_#8c414e30] [&.cm-detail-page_.cm-editorial-gallery]:relative [&.cm-detail-page_.cm-editorial-gallery]:rounded-[18px] [&.cm-detail-page_.cm-editorial-gallery]:overflow-hidden [&.cm-detail-page_.cm-editorial-gallery]:bg-[#f3ece7] [&.cm-detail-page_.cm-editorial-gallery]:h-[clamp(340px,_34vw,_490px)] [&.cm-detail-page_.cm-editorial-gallery[data-empty=true]]:h-auto [&.cm-detail-page_.cm-editorial-gallery[data-empty=true]_.cm-gallery-placeholder]:min-h-[410px] [&.cm-detail-page_.cm-gallery-mosaic]:grid [&.cm-detail-page_.cm-gallery-mosaic]:h-full [&.cm-detail-page_.cm-gallery-mosaic]:grid-cols-[minmax(0,_1.6fr)_minmax(0,_1fr)] [&.cm-detail-page_.cm-gallery-mosaic]:[grid-template-rows:1fr_1fr] [&.cm-detail-page_.cm-gallery-mosaic]:gap-[5px] [&.cm-detail-page_.cm-gallery-mosaic_>_button]:p-0 [&.cm-detail-page_.cm-gallery-mosaic_>_button]:border-0 [&.cm-detail-page_.cm-gallery-mosaic_>_button]:rounded-[0] [&.cm-detail-page_.cm-gallery-mosaic_>_button]:block [&.cm-detail-page_.cm-gallery-mosaic_>_button]:overflow-hidden [&.cm-detail-page_.cm-gallery-mosaic_>_button]:h-full [&.cm-detail-page_.cm-gallery-mosaic_>_button]:min-h-0 [&.cm-detail-page_.cm-gallery-mosaic_>_button:first-child]:[grid-row:1_/_-1] [&.cm-detail-page_.cm-gallery-mosaic_>_button:nth-child(2):last-child]:[grid-row:1_/_-1] [&.cm-detail-page_.cm-gallery-single]:grid-cols-[1fr] [&.cm-detail-page_.cm-gallery-rich]:grid-cols-[1.8fr_1fr_1fr] [&.cm-detail-page_.cm-gallery-rich_>_button:nth-child(4):last-child]:[grid-column:2_/_-1] [&.cm-detail-page_.cm-gallery-mosaic_img]:block [&.cm-detail-page_.cm-gallery-mosaic_img]:h-full [&.cm-detail-page_.cm-gallery-mosaic_img]:w-full [&.cm-detail-page_.cm-gallery-mosaic_img]:object-cover [&.cm-detail-page_.cm-gallery-mosaic_img]:transition-[transform] [&.cm-detail-page_.cm-gallery-mosaic_img]:duration-400 [&.cm-detail-page_.cm-gallery-mosaic_img]:ease-[ease] [&.cm-detail-page_.cm-gallery-mosaic_button:hover_img]:[transform:scale(1.035)] [&.cm-detail-page_.cm-gallery-mosaic_button:focus-visible]:outline-offset-[-5px] [&.cm-detail-page_.cm-gallery-mosaic_button:focus-visible]:relative [&.cm-detail-page_.cm-gallery-mosaic_button:focus-visible]:z-[1] [&.cm-detail-page_.cm-gallery-view]:absolute [&.cm-detail-page_.cm-gallery-view]:right-[24px] [&.cm-detail-page_.cm-gallery-view]:bottom-[24px] [&.cm-detail-page_.cm-gallery-view]:bg-white [&.cm-detail-page_.cm-gallery-view]:shadow-[0_3px_12px_#30272512] [&.cm-detail-page_.cm-gallery-view]:z-[1] [&.cm-detail-page_.cm-gallery-view]:rounded-[24px] [&.cm-detail-page_.cm-gallery-view]:[padding-inline:18px] [&.cm-detail-page_.cm-gallery-label]:absolute [&.cm-detail-page_.cm-gallery-label]:top-[24px] [&.cm-detail-page_.cm-gallery-label]:left-[24px] [&.cm-detail-page_.cm-gallery-label]:inline-flex [&.cm-detail-page_.cm-gallery-label]:items-center [&.cm-detail-page_.cm-gallery-label]:gap-[8px] [&.cm-detail-page_.cm-gallery-label]:text-[9px] [&.cm-detail-page_.cm-gallery-label]:tracking-[.17em] [&.cm-detail-page_.cm-gallery-label]:bg-[#fcfaf7] [&.cm-detail-page_.cm-gallery-label]:text-[#302725] [&.cm-detail-page_.cm-gallery-label]:py-[10px] [&.cm-detail-page_.cm-gallery-label]:px-[15px] [&.cm-detail-page_.cm-gallery-label]:rounded-[20px] [&.cm-detail-page_.cm-gallery-cover]:w-full [&.cm-detail-page_.cm-gallery-cover]:h-full [&.cm-detail-page_.cm-gallery-cover]:object-cover [&.cm-detail-page_.cm-gallery-note]:absolute [&.cm-detail-page_.cm-gallery-note]:bottom-[12px] [&.cm-detail-page_.cm-gallery-note]:left-[12px] [&.cm-detail-page_.cm-gallery-note]:right-[12px] [&.cm-detail-page_.cm-gallery-note]:bg-white [&.cm-detail-page_.cm-gallery-note]:py-[8px] [&.cm-detail-page_.cm-gallery-note]:px-[12px] [&.cm-detail-page_.cm-gallery-note]:rounded-[8px] [&.cm-detail-page_.cm-gallery-note]:text-[11px] [&.cm-detail-page_.cm-gallery-placeholder]:relative [&.cm-detail-page_.cm-gallery-placeholder]:h-full [&.cm-detail-page_.cm-gallery-placeholder]:py-[54px] [&.cm-detail-page_.cm-gallery-placeholder]:px-[7%] [&.cm-detail-page_.cm-gallery-placeholder]:flex [&.cm-detail-page_.cm-gallery-placeholder]:[flex-direction:row] [&.cm-detail-page_.cm-gallery-placeholder]:items-center [&.cm-detail-page_.cm-gallery-placeholder]:justify-between [&.cm-detail-page_.cm-gallery-placeholder]:gap-[32px] [&.cm-detail-page_.cm-gallery-placeholder]:text-left [&.cm-detail-page_.cm-gallery-placeholder]:bg-[linear-gradient(115deg,_#fcfaf7,_#f3ece7)] [&.cm-detail-page_.cm-gallery-placeholder]:text-[#75645d] [&.cm-detail-page_.cm-gallery-placeholder]:border [&.cm-detail-page_.cm-gallery-placeholder]:border-[#e8dfd9] [&.cm-detail-page_.cm-gallery-placeholder]:rounded-[inherit] [&.cm-detail-page_.cm-gallery-placeholder::before]:content-[''] [&.cm-detail-page_.cm-gallery-placeholder::before]:absolute [&.cm-detail-page_.cm-gallery-placeholder::before]:inset-[16px] [&.cm-detail-page_.cm-gallery-placeholder::before]:border [&.cm-detail-page_.cm-gallery-placeholder::before]:border-[#dfd4ce] [&.cm-detail-page_.cm-gallery-placeholder::before]:rounded-[8px] [&.cm-detail-page_.cm-gallery-placeholder::before]:[pointer-events:none] [&.cm-detail-page_.cm-gallery-placeholder_h2]:text-[clamp(30px,_3.7vw,_52px)] [&.cm-detail-page_.cm-gallery-placeholder_h2]:leading-[1.12] [&.cm-detail-page_.cm-gallery-placeholder_h2]:text-[#302725] [&.cm-detail-page_.cm-gallery-placeholder_h2]:my-[20px] [&.cm-detail-page_.cm-gallery-placeholder_h2]:mx-0 [&.cm-detail-page_.cm-gallery-placeholder_h2_em]:font-normal [&.cm-detail-page_.cm-gallery-placeholder_h2_em]:text-[#8c414e] [&.cm-detail-page_.cm-gallery-placeholder_p]:max-w-[340px] [&.cm-detail-page_.cm-gallery-placeholder_p]:text-[12px] [&.cm-detail-page_.cm-gallery-placeholder_p]:leading-[1.9] [&.cm-detail-page_.cm-gallery-placeholder-copy]:relative [&.cm-detail-page_.cm-gallery-placeholder-copy]:z-[1] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:inline-flex [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:items-center [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:gap-[14px] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:border-b [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:border-b-[#8c414e] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:text-[#8c414e] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:pt-0 [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:px-0 [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:pb-[7px] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:mt-[22px] [&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:text-[11px] [&.cm-detail-page_.cm-gallery-art]:w-[30%] [&.cm-detail-page_.cm-gallery-art]:max-w-[310px] [&.cm-detail-page_.cm-gallery-art]:shrink-0 [&.cm-detail-page_.cm-gallery-art]:text-[#8c414e] [&.cm-detail-page_.cm-gallery-art]:opacity-65 [&.cm-detail-page_.cm-gallery-art]:text-center [&.cm-detail-page_.cm-gallery-art_svg]:w-full [&.cm-detail-page_.cm-gallery-art_svg]:max-h-[330px] [&.cm-detail-page_.cm-gallery-art_>_span]:text-[8px] [&.cm-detail-page_.cm-gallery-art_>_span]:tracking-[.25em] [&.cm-detail-page_.cm-gallery-art_>_span]:block [&.cm-detail-page_.cm-gallery-art_>_span]:mt-[12px] [&.cm-detail-page_.cm-gallery-index]:absolute [&.cm-detail-page_.cm-gallery-index]:bottom-[29px] [&.cm-detail-page_.cm-gallery-index]:left-[7%] [&.cm-detail-page_.cm-gallery-index]:text-[8px] [&.cm-detail-page_.cm-gallery-index]:tracking-[.2em] max-[860.001px]:[&.cm-detail-page_.cm-editorial-gallery]:h-[370px] max-[860.001px]:[&.cm-detail-page_.cm-gallery-placeholder]:[padding-inline:6%] max-[860.001px]:[&.cm-detail-page_.cm-gallery-placeholder]:gap-[18px] max-[860.001px]:[&.cm-detail-page_.cm-gallery-art]:w-[28%] max-[860.001px]:[&.cm-detail-page_.cm-gallery-art_>_span]:hidden max-[560.001px]:[&.cm-detail-page_.cm-editorial-gallery]:h-[340px] max-[560.001px]:[&.cm-detail-page_.cm-editorial-gallery]:rounded-[12px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-mosaic]:grid-cols-[1fr] max-[560.001px]:[&.cm-detail-page_.cm-gallery-mosaic_>_button:not(:first-child)]:hidden max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder]:pt-[32px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder]:px-[32px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder]:pb-[58px] max-[560.001px]:[&.cm-detail-page_.cm-editorial-gallery[data-empty=true]_.cm-gallery-placeholder]:min-h-[350px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder::before]:inset-[10px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-art]:absolute max-[560.001px]:[&.cm-detail-page_.cm-gallery-art]:w-[42%] max-[560.001px]:[&.cm-detail-page_.cm-gallery-art]:right-[20px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-art]:bottom-[22px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-art]:opacity-12 max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder_h2]:text-[clamp(28px,_8vw,_34px)] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder_h2]:[margin-block:17px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder_p]:max-w-[260px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder_p]:text-[11px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-placeholder-copy_>_a]:mt-[18px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-index]:bottom-[22px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-index]:left-[32px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-index]:text-[7px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-label]:top-[16px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-label]:left-[16px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-view]:right-[16px] max-[560.001px]:[&.cm-detail-page_.cm-gallery-view]:bottom-[16px] max-[560.001px]:[&&.cm-detail-page_.cm-kicker]:text-[9px] motion-reduce:[&&.cm-detail-page_.cm-button]:transition-none motion-reduce:[&.cm-detail-page_.cm-gallery-mosaic_img]:transition-none cm-detail-page [.customer-marketplace&]:max-w-[1440px] [.customer-marketplace&]:pt-[34px] [.customer-marketplace&]:px-[48px] [.customer-marketplace&]:pb-[90px] [.customer-marketplace&]:text-[14px] [.customer-marketplace&_a]:no-underline [.customer-marketplace&_h1]:text-[clamp(40px,_4.8vw,_66px)] [.customer-marketplace&_h1]:tracking-[-.045em] [.customer-marketplace&_h1]:mt-[12px] [.customer-marketplace&_h1]:mx-0 [.customer-marketplace&_h1]:mb-[19px] [.customer-marketplace&_h1]:leading-[1.06] [.customer-marketplace&_h2]:text-[32px] [.customer-marketplace&_h2]:tracking-[-.03em] [.customer-marketplace&_h2]:mt-[9px] [.customer-marketplace&_h2]:mx-0 [.customer-marketplace&_h2]:mb-[17px] [.customer-marketplace&_h3]:text-[21px] [.customer-marketplace&_h3]:mt-[25px] [.customer-marketplace&_h3]:mx-0 [.customer-marketplace&_h3]:mb-[12px] [.customer-marketplace&_button]:text-[12px] [.customer-marketplace&_button]:min-h-[43px] [.customer-marketplace&_button]:rounded-[8px] [.customer-marketplace&_button]:justify-center [.customer-marketplace&_button]:transition-[box-shadow,border-color,background-color] [.customer-marketplace&_button]:duration-200 [.customer-marketplace&_button]:ease-[ease] [.customer-marketplace&_button:not(:disabled):hover]:border-[#8c414e] [.customer-marketplace&_button:not(:disabled):hover]:shadow-[0_3px_10px_#3027250a] [.customer-marketplace&_[id^='listing-']]:[scroll-margin-top:210px] [.customer-marketplace&_#vendor-services]:[scroll-margin-top:210px] [.customer-marketplace&_.commerce-price]:grid [.customer-marketplace&_.commerce-price]:grid-cols-[repeat(auto-fit,_minmax(110px,_1fr))] [.customer-marketplace&_.commerce-price]:gap-[16px] [.customer-marketplace&_.commerce-price]:mt-0 [.customer-marketplace&_.commerce-price]:mx-0 [.customer-marketplace&_.commerce-price]:mb-[20px] [.customer-marketplace&_.commerce-price]:p-[17px] [.customer-marketplace&_.commerce-price]:border [.customer-marketplace&_.commerce-price]:border-[#e8dfd9] [.customer-marketplace&_.commerce-price]:rounded-[10px] [.customer-marketplace&_.commerce-price]:bg-[#fcfaf7] [.customer-marketplace&_.commerce-price_small]:text-[11px] [.customer-marketplace&_.commerce-price_small]:text-[#75645d] [.customer-marketplace&_.commerce-price_strong]:block [.customer-marketplace&_.commerce-price_strong]:[font:30px/1.2_Georgia,_serif] [.customer-marketplace&_.commerce-price_strong]:tracking-[-.04em] [.customer-marketplace&_.commerce-price_strong]:my-[7px] [.customer-marketplace&_.commerce-price_strong]:mx-0 [.customer-marketplace&_.commerce-price_p]:m-0 [.customer-marketplace&_.commerce-price_p]:text-[10px] [.customer-marketplace&_.commerce-price_p]:text-[#75645d] [.customer-marketplace&_.commerce-offer-actions]:grid [.customer-marketplace&_.commerce-offer-actions]:grid-cols-[1fr] [.customer-marketplace&_.commerce-offer-actions]:gap-[9px] [.customer-marketplace&_.commerce-offer-actions]:mt-[20px] [.customer-marketplace&_.commerce-offer-actions]:mx-0 [.customer-marketplace&_.commerce-offer-actions]:mb-0 [.customer-marketplace&_#listing-reviews_.rr-panel]:border-[#e8dfd9] [.customer-marketplace&_#listing-reviews_.rr-panel]:rounded-[12px] [.customer-marketplace&_.mm-dialog]:max-w-[calc(100vw_-_32px)] max-[1100.001px]:[.customer-marketplace&]:[padding-inline:28px] max-[560.001px]:[.customer-marketplace&]:pt-[22px] max-[560.001px]:[.customer-marketplace&]:px-[18px] max-[560.001px]:[.customer-marketplace&]:pb-[48px] max-[560.001px]:[.customer-marketplace&_h1]:text-[44px] max-[560.001px]:[.customer-marketplace&_h1]:mt-[12px] max-[560.001px]:[.customer-marketplace&_h1]:mx-0 max-[560.001px]:[.customer-marketplace&_h1]:mb-[16px] max-[560.001px]:[.customer-marketplace&_h2]:text-[28px] motion-reduce:[.customer-marketplace&_button]:transition-none">
        <ReadState state={state} />
      </main>
    );
  const d = state.data,
    item = vendor ? d.vendor : d.service,
    listingPath = `/${vendor ? "vendors" : "services"}/${item.id}`;
  const bookingAllowed = item.bookingAccessStatus === "Approved" && item.bookEnabled !== false && item.bookEnabled !== 0;
  const packageBookingAllowed = item.offer ? offerState(item).canBook : bookingAllowed;
  function begin(action, packageId) {
    if (action === "book" && !bookingAllowed) return;
    if (action === "book" && item.offer) {
      if (!packageBookingAllowed) return;
      const path = `/customer/booking-checkout/${item.id}${packageId ? `?${new URLSearchParams({ package: packageId })}` : ""}`;
      navigate(user ? path : `/auth/login?redirect=${encodeURIComponent(path)}`);
      return;
    }
    const path = `${listingPath}?${new URLSearchParams({ ...Object.fromEntries(params), ...(!vendor ? { action } : {}), ...(packageId ? { package: packageId } : {}) })}`;
    navigate(user ? path : `/auth/login?redirect=${encodeURIComponent(path)}`);
  }
  async function message(enquiry) {
    if (!user) {
      begin("message");
      return;
    }
    if (user.role !== "Customer") {
      notify("Sign in as a customer to message this vendor.");
      return;
    }
    setBusy(true);
    try {
      const result = await save("/conversations", "POST", {
        vendorId: vendor ? item.id : item.vendorId,
        ...(!vendor ? { serviceId: item.id } : {}),
        ...(pack ? { packageId:id } : {}),
      });
      if (enquiry?.text) {
        await save(`/conversations/${result.id}/messages`, "POST", {
          text: enquiry.text,
          clientMessageId: enquiry.clientMessageId,
        });
      }
      navigate(`/customer/messages?conversation=${result.id}`);
    } catch (e) {
      if (enquiry?.text) throw e;
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

  if (vendor) return <VendorProfile key={id} data={d} onMessage={message} busy={busy} />;

  return (
    <main id="main-content" className="customer-marketplace mx-auto w-full max-w-[1500px] px-4 pb-16 pt-6 text-base text-[#493b41] sm:px-8 lg:px-12 lg:pt-8">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[#99868e]">
        <Link to="/" className="hover:text-rose-brand">Home</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <Link to="/services" className="hover:text-rose-brand">Services</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span aria-current="page" className="text-[#6f5b64]">{item.name}</span>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)] lg:gap-7">
        <div className="min-w-0">
          <div id="listing-gallery" className="scroll-mt-40">
            <MediaGallery key={`${galleryType}:${id}`} type={galleryType} id={id} variant="profile" fallbackImage={item.cover || item.image} title={item.name} />
          </div>
          <header className={`${panel} relative z-[1] mx-3 -mt-10 overflow-hidden sm:mx-5`}>
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-brand">{item.category || "Wedding service"}</p>
                <h1 className="break-words font-sans text-[26px] font-semibold leading-tight tracking-[-0.7px] sm:text-[30px]">{item.name}</h1>
                <p className="mt-3 flex items-start gap-1.5 text-sm text-[#82727a]"><MapPin size={16} className="mt-0.5 text-rose-brand" aria-hidden="true" />{[item.city, item.state].filter(Boolean).join(", ") || "Location on request"}</p>
                <Link to={`/vendors/${item.vendorId}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#48735c] hover:underline"><ShieldCheck size={15} aria-hidden="true" />By {hostName}</Link>
              </div>
              <a href="#listing-reviews" className="shrink-0 text-center" aria-label={reviewCount ? `${rating} out of 5 from ${reviewCount} reviews` : "No reviews yet"}>
                <span className={`inline-flex items-center justify-center gap-1 rounded-md px-3 py-2 text-lg font-semibold ${reviewCount ? "bg-[#548863] text-white" : "bg-[#f4eeea] text-[#927d86]"}`}><Star size={17} fill={reviewCount ? "currentColor" : "none"} aria-hidden="true" />{reviewCount ? rating : "New"}</span>
                <span className="mt-1.5 block text-xs text-[#8e7c84]">{reviewCount ? `${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}` : "No reviews yet"}</span>
              </a>
            </div>
            <div className="grid grid-cols-2 divide-[#e9e0dc] border-t border-[#eee7e3] bg-[#fdfbfa] text-sm text-[#79676f] sm:grid-cols-4 sm:divide-x">
              <a href="#listing-gallery" className="flex min-h-14 items-center justify-center gap-2 px-2 py-3 hover:bg-[#f5eeeb]"><Images size={17} aria-hidden="true" />Photos</a>
              <WishlistButton type={pack || params.get("package") ? "Package" : "Service"} id={pack ? id : params.get("package") || item.id} className="flex min-h-14 items-center justify-center gap-2 px-2 py-3 text-sm hover:bg-[#f5eeeb] aria-pressed:text-rose-brand" />
              <a href="#listing-reviews" className="flex min-h-14 items-center justify-center gap-2 border-t border-[#eee7e3] px-2 py-3 hover:bg-[#f5eeeb] sm:border-t-0"><Star size={17} aria-hidden="true" />Reviews</a>
              <button type="button" className="flex min-h-14 items-center justify-center gap-2 border-t border-[#eee7e3] px-2 py-3 hover:bg-[#f5eeeb] sm:border-t-0" onClick={async () => {
                try { await navigator.clipboard.writeText(window.location.href); setShareNotice("Link copied."); }
                catch { setShareNotice(`Share this link: ${window.location.href}`); }
              }}><Share2 size={17} aria-hidden="true" />Share</button>
            </div>
            {shareNotice && <p role="status" className="break-all border-t border-[#eee7e3] px-5 py-2 text-sm text-rose-brand">{shareNotice}</p>}
          </header>
        </div>

        <aside className="row-start-2 min-w-0 space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-label="Pricing and booking">
          <section className={panel} aria-labelledby="service-pricing-title">
            <div className="flex items-center justify-between gap-3 border-b border-[#eee7e3] px-5 py-4 sm:px-6">
              <h2 id="service-pricing-title" className="font-sans text-lg font-semibold tracking-normal">Pricing & booking</h2>
              <a href="#listing-packages" className="text-sm font-medium text-rose-brand hover:underline">Packages</a>
            </div>
            <div className="p-5 sm:p-6">
              {item.offer ? (
                <div className="[&_.commerce-price]:mt-0 [&_.commerce-price]:mb-5 [&_.commerce-price]:grid [&_.commerce-price]:grid-cols-[repeat(auto-fit,minmax(140px,1fr))] [&_.commerce-price]:gap-4 [&_.commerce-price>div]:rounded-lg [&_.commerce-price>div]:border [&_.commerce-price>div]:border-[#eee1e3] [&_.commerce-price>div]:bg-[#fcf7f8] [&_.commerce-price>div]:p-4 [&_.commerce-price_small]:text-sm [&_.commerce-price_small]:text-[#8b777e] [&_.commerce-price_strong]:text-[26px] [&_.commerce-price_strong]:text-rose-brand [&_.commerce-price_p]:text-xs [&_.commerce-price_p]:text-[#8b777e] [&_.commerce-offer-actions]:my-0 [&_.commerce-offer-actions]:grid [&_.commerce-offer-actions]:grid-cols-1 [&_.commerce-offer-actions_button]:min-h-12 [&_.commerce-offer-actions_button]:rounded-lg [&_.commerce-offer-actions_button]:text-sm [&_.commerce-offer-actions_a]:flex [&_.commerce-offer-actions_a]:min-h-12 [&_.commerce-offer-actions_a]:items-center [&_.commerce-offer-actions_a]:justify-center [&_.commerce-offer-actions_a]:rounded-lg [&_.commerce-offer-actions_a]:text-sm [&_.commerce-offer-actions_.cm-primary]:border-rose-brand [&_.commerce-offer-actions_.cm-primary]:bg-rose-brand [&_.commerce-offer-actions_.cm-primary]:text-white">
                  <OfferPrices item={item} /><OfferActions item={item} />
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#8b777e]">Starting from</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <p className="text-[30px] font-semibold tracking-[-1px] text-rose-brand">{servicePrice(item) === null ? "Custom pricing" : money(servicePrice(item))}</p>
                    {servicePrice(item) !== null && <span className="text-sm text-[#8b777e]">{{ PerPerson: "/ person", PerHour: "/ hour", PerDay: "/ day", PerEvent: "/ event" }[item.pricingType]}</span>}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#96868b]">Final pricing depends on your event requirements.</p>
                  {canBook ? <button type="button" className={`${action} mt-5 w-full rounded-lg bg-rose-brand text-white hover:bg-[#743440]`} disabled={!bookingAllowed} onClick={() => begin("book", pack ? id : params.get("package"))}><CalendarDays size={17} aria-hidden="true" />Book now</button> : <a href="#listing-packages" className={`${action} mt-5 w-full rounded-lg bg-[#f4eaec] text-rose-brand hover:bg-[#eddee2]`}>Explore packages</a>}
                </>
              )}
              {!bookingAllowed && item.offer?.type !== "Sell" && <p role="status" className="mt-4 rounded-lg bg-[#faf2ee] p-3 text-sm leading-6 text-[#9b695e]">This vendor is currently unavailable for new bookings.</p>}
            </div>
            <div className="flex items-center gap-3 border-t border-[#eee7e3] px-5 py-4 sm:px-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f3e9eb] font-serif text-xl text-rose-brand" aria-hidden="true">{hostName.trim().charAt(0).toUpperCase()}</span>
              <div className="min-w-0"><p className="text-xs text-[#99868e]">Offered by</p><Link to={`/vendors/${item.vendorId}`} className="break-words text-sm font-semibold text-[#67525c] hover:text-rose-brand">{hostName}</Link></div>
              <ShieldCheck size={20} className="ml-auto text-[#548863]" aria-hidden="true" />
            </div>
          </section>
          <VendorEnquiry key={`${galleryType}:${id}`} vendor={{ id: item.vendorId, name: hostName }} services={[item]} onMessage={message} busy={busy} contextId={`${galleryType}:${id}`} exploreHref="#listing-packages" exploreLabel="View packages" />
          <p className="flex items-start gap-2 px-2 text-sm leading-6 text-[#94818a]"><ShieldCheck size={17} className="mt-1" aria-hidden="true" />Discuss your date and requirements directly with the vendor before booking.</p>
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <ListingSectionNavigation key={id} hasOffer={!!item.offer} reviewCount={reviewCount} />
          <section id="listing-overview" className={`${panel} mt-6 scroll-mt-40 p-5 sm:p-7`} aria-labelledby="service-about-title">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-brand">The details that matter</p>
            <h2 id="service-about-title" className="font-serif text-[28px] tracking-[-0.6px]">About this service</h2>
            <p className="mt-4 whitespace-pre-line break-words text-base leading-7 text-[#88767f]">{item.description || "Message the vendor to discuss the details of your celebration."}</p>
            <div aria-label="Service highlights" className="mt-6 grid gap-3 min-[480px]:grid-cols-2">
              {[[Tag, "Pricing", item.pricingType?.replace(/([a-z])([A-Z])/g, "$1 $2") || "On request"], [MapPin, "Coverage", [d.coverage.mode, d.coverage.city].filter(Boolean).join(" · ") || item.city || "Discuss with vendor"], ...(item.minGuests || item.maxGuests ? [[Users, "Guest count", guestRange]] : [])].map(([Icon, label, value]) => (
                <div key={label} className="flex items-start gap-3 rounded-lg bg-[#faf8f5] p-4"><Icon size={19} className="mt-0.5 text-rose-brand" aria-hidden="true" /><div><p className="text-xs text-[#99868e]">{label}</p><p className="mt-1 text-sm font-medium text-[#67525c]">{value}</p></div></div>
              ))}
            </div>
            {Object.keys(attributes).length > 0 && <dl className="mt-6 grid gap-x-6 sm:grid-cols-2">{Object.entries(attributes).map(([key, value]) => <div key={key} className="flex justify-between gap-4 border-b border-[#eee7e3] py-3 text-sm"><dt className="capitalize text-[#88767f]">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="text-right font-medium text-[#67525c]">{typeof value === "boolean" ? value ? "Included" : "Not included" : String(value)}</dd></div>)}</dl>}
            <h3 className="mb-3 mt-7 text-base font-semibold text-[#67525c]">Inclusions & optional extras</h3>
            {d.items.length ? <ul className="divide-y divide-[#eee7e3]">{d.items.map((entry) => <li key={entry.id} className="flex items-start justify-between gap-5 py-3 text-sm"><span className="text-[#67525c]">{entry.name}{entry.description && <small className="mt-1 block text-xs leading-5 text-[#99868e]">{entry.description}</small>}</span><strong className="shrink-0 font-medium text-[#548863]">{entry.included ? "Included" : money(entry.price)}</strong></li>)}</ul> : <p className="text-sm leading-6 text-[#88767f]">Contact the vendor to discuss your requirements.</p>}
          </section>

          <section id="listing-packages" className={`${panel} mt-6 scroll-mt-40 p-5 sm:p-7`} aria-labelledby="service-packages-title">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-brand">Find your perfect fit</p>
            <h2 id="service-packages-title" className="font-serif text-[28px] tracking-[-0.6px]">Packages for your celebration</h2>
            {d.packages.length ? <div className="mt-5 space-y-4">{d.packages.map((entry) => <article key={entry.id} className="rounded-lg border border-[#eadfe0] bg-[#fdfafa] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="mb-0 text-lg font-semibold text-[#67525c]">{entry.name}</h3><p className="text-xl font-semibold text-rose-brand">{money(entry.price)}</p></div><p className="mt-2 text-sm leading-6 text-[#88767f]">{entry.description}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm text-[#99868e]"><Users size={15} aria-hidden="true" />{entry.minGuests || "Flexible"}–{entry.maxGuests || "flexible"} guests</span><button type="button" className={`${action} min-h-10 rounded-lg border border-[#dfc5cb] bg-white px-4 py-2 text-rose-brand hover:bg-[#f4eaec]`} disabled={!packageBookingAllowed} title={!packageBookingAllowed ? "Booking is currently unavailable for this service." : undefined} onClick={() => begin("book", entry.id)}>Choose package</button></div></article>)}</div> : <div className="mt-5 flex items-start gap-3 rounded-lg bg-[#faf8f5] p-4"><PackageOpen size={23} className="mt-0.5 text-[#a48690]" aria-hidden="true" /><div><p className="text-sm font-medium text-[#67525c]">A celebration, tailored to you.</p><p className="mt-1 text-sm leading-6 text-[#88767f]">No packages published yet. Message the vendor to discuss your requirements.</p></div></div>}
          </section>

          {!item.offer && <div id="listing-availability" className="mt-6 scroll-mt-40"><AvailabilityCalendar id={item.id} /></div>}
          <section id="listing-policies" className={`${panel} mt-6 scroll-mt-40 p-5 sm:p-7`} aria-labelledby="service-policies-title">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-brand">Before you book</p><h2 id="service-policies-title" className="font-serif text-[28px] tracking-[-0.6px]">The finer details</h2>
            <div className="mt-4 divide-y divide-[#eee7e3]">{[["Cancellation", d.policies.cancellation], ["Refund", d.policies.refund], ["Rescheduling", d.policies.rescheduling], ["Terms", d.policies.terms]].map(([label, value]) => <details key={label} className="group"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-[#67525c] [&::-webkit-details-marker]:hidden">{label}<ChevronDown size={16} className="text-[#a48690] transition-transform group-open:rotate-180" aria-hidden="true" /></summary><p className="pb-4 text-sm leading-6 text-[#88767f]">{value || "Confirm the terms with your vendor before submitting a booking."}</p></details>)}</div>
          </section>
          <div id="listing-reviews" className={`${panel} mt-6 scroll-mt-40 p-5 sm:p-7`}><PublicReviews key={`${galleryType}:${id}`} type={galleryType} id={id} /></div>
        </div>
      </div>

      {user?.role === "Customer" && !item.offer && params.get("action") === "book" && bookingAllowed && (
        <Suspense fallback={<p role="status">Loading request form…</p>}>
          <ServiceInquiry service={item} packages={d.packages || []} items={d.items || []} coverage={{ ...d.coverage, businessLocations: d.businessLocations || [] }} mode={params.get("action")} close={() => setParams((current) => { const next = new URLSearchParams(current); next.delete("action"); return next; }, { replace: true })} />
        </Suspense>
      )}
    </main>
  );
}


const panel = "rounded-xl border border-[#e9e1dc] bg-white shadow-[0_3px_18px_#49313905]";
const field = "w-full min-w-0 rounded-lg border border-[#e5dcd7] bg-white px-3.5 py-3 text-base text-[#42383c] placeholder:text-[#a2979a] focus:border-rose-brand focus:outline-2 focus:outline-rose-brand/20 disabled:bg-[#faf8f6]";
const action = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60";

function servicePrice(service) {
  if (service.pricingType === "CustomQuote") return null;
  const type = service.offer?.type || service.offerType;
  const price = type === "Sell"
    ? service.offer?.sell?.price ?? service.sellingPrice ?? service.price
    : service.offer?.book?.price ?? service.bookingPrice ?? service.price;
  return price !== null && price !== undefined && Number.isFinite(Number(price)) && Number(price) > 0
    ? Number(price) : null;
}

function PriceEstimate({ services }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? services : services.slice(0, 2);
  return (
    <section className={panel} aria-labelledby="vendor-pricing-title">
      <div className="flex items-center justify-between gap-3 border-b border-[#eee7e3] px-5 py-4 sm:px-6">
        <h2 id="vendor-pricing-title" className="font-sans text-lg font-semibold tracking-normal">Service pricing</h2>
        <a href="#vendor-services" className="text-sm font-medium text-rose-brand hover:underline">View services</a>
      </div>
      {visible.length ? visible.map((service) => {
        const price = servicePrice(service);
        const unit = { PerPerson: "/ person", PerHour: "/ hour", PerDay: "/ day", PerEvent: "/ event" }[service.pricingType];
        return (
          <Link key={service.id} to={`/services/${service.serviceId || service.id}`} className="group flex items-center justify-between gap-5 border-b border-[#eee7e3] px-5 py-5 last:border-b-0 hover:bg-[#fcf8f8] sm:px-6">
            <span className="shrink-0 text-xl font-semibold tracking-tight text-rose-brand">
              {price === null ? <span className="text-base">Price on request</span> : money(price)}
              {price !== null && unit && <span className="ml-1 text-xs font-normal tracking-normal text-[#8b777e]">{unit}</span>}
            </span>
            <span className="flex min-w-0 items-center gap-2 text-right text-sm leading-6 text-[#6c6065]">
              <span className="line-clamp-2">{service.name}</span><ChevronRight size={14} className="text-[#b8a1a7] group-hover:text-rose-brand" aria-hidden="true" />
            </span>
          </Link>
        );
      }) : (
        <div className="px-6 py-6"><p className="text-lg font-semibold text-rose-brand">Pricing tailored to your day</p><p className="mt-2 text-sm leading-6 text-[#82747a]">Message the vendor to discuss services and receive a personal estimate.</p></div>
      )}
      {services.length > 2 && <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="flex w-full items-center justify-center gap-2 border-t border-[#eee7e3] px-5 py-3 text-sm text-rose-brand hover:bg-[#fcf8f8]">{expanded ? "Show less" : `See all ${services.length} services`}<ChevronDown size={15} className={expanded ? "rotate-180" : ""} aria-hidden="true" /></button>}
      <p className="border-t border-[#eee7e3] px-5 py-3 text-xs leading-5 text-[#8b7d82] sm:px-6">Listed starting prices. Final pricing depends on your requirements.</p>
    </section>
  );
}

function VendorEnquiry({ vendor, services, onMessage, busy, contextId, exploreHref = `/services?${new URLSearchParams({ vendor: vendor.id })}`, exploreLabel = "Explore services" }) {
  const { user, notify } = useAuth();
  const navigate = useNavigate();
  const draftKey = `vendor-enquiry:${contextId || vendor.id}`;
  const [draft, setDraft] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(draftKey)) || {}; }
    catch { return {}; }
  });
  const [error, setError] = useState("");
  const pendingMessage = useRef(null);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  function update(event) {
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }));
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (user && user.role !== "Customer") {
      setError("Please sign in as a customer to enquire about this vendor.");
      return;
    }
    if (!user) {
      try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); } catch { /* The form can still be used after sign-in. */ }
      navigate(`/auth/login?redirect=${encodeURIComponent(`/vendors/${vendor.id}#listing-booking`)}`);
      return;
    }
    const service = services.find((entry) => entry.id === draft.service);
    const text = [
      `Hi ${vendor.name}, I'd like to enquire about my celebration.`,
      service && `Service: ${service.name}`,
      `Event date: ${draft.date}`,
      draft.guests && `Guests: ${draft.guests}`,
      draft.details?.trim(),
    ].filter(Boolean).join("\n\n");
    // Keep the same ID when retrying a failed send to avoid duplicate messages.
    if (pendingMessage.current?.text !== text) pendingMessage.current = { text, clientMessageId: crypto.randomUUID() };
    try {
      await onMessage(pendingMessage.current);
      try { sessionStorage.removeItem(draftKey); } catch { /* Storage may be disabled. */ }
      notify("Your enquiry has been sent.");
    } catch (err) {
      setError(err.message || "Your enquiry could not be sent. Please try again.");
    }
  }
  return (
    <section id="listing-booking" className={`${panel} scroll-mt-40 p-5 sm:p-6`} aria-labelledby="vendor-enquiry-title">
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <button type="button" className={`${action} bg-rose-brand text-white hover:bg-[#743440]`} disabled={busy} onClick={() => onMessage()}><Mail size={18} aria-hidden="true" />{busy ? "Opening chat…" : "Send message"}</button>
        <a className={`${action} bg-[#edf5ef] text-[#35634d] hover:bg-[#e0eee4]`} href={exploreHref}><Heart size={17} aria-hidden="true" />{exploreLabel}</a>
      </div>

      <div className="mb-6 mt-8 border-t border-[#eee7e3] pt-6">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-rose-brand"><Sparkles size={14} aria-hidden="true" />Your celebration starts here</p>
        <h2 id="vendor-enquiry-title" className="font-serif text-[28px] leading-tight tracking-[-0.6px]">Let’s plan something special.</h2>
        <p className="mt-2 text-sm leading-6 text-[#86767c]">Share a few details with {vendor.name}.</p>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          {services.length > 0 && <label className="grid gap-2 text-sm font-medium text-[#6e5d64]">Interested in
            <div className="relative"><select name="service" value={draft.service || ""} onChange={update} className={`${field} appearance-none pr-9`}><option value="">Help me choose a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-4 text-[#9c878e]" aria-hidden="true" /></div>
          </label>}
          <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[#6e5d64]">Event date <span className="sr-only">(required)</span><input className={field} type="date" name="date" required min={today} value={draft.date || ""} onChange={update} /></label>
            <label className="grid gap-2 text-sm font-medium text-[#6e5d64]">Number of guests<input className={field} type="number" name="guests" min="1" max="100000" placeholder="e.g. 150" value={draft.guests || ""} onChange={update} /></label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-[#6e5d64]">Tell us about your celebration <span className="sr-only">(required)</span><textarea className={`${field} min-h-28 resize-y`} name="details" required maxLength={3000} placeholder="Your venue, the occasion, and what you have in mind…" value={draft.details || ""} onChange={update} /></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" className={`${action} w-full rounded-lg bg-rose-brand text-white hover:bg-[#743440]`}><MessageSquare size={17} aria-hidden="true" />{busy ? "Sending enquiry…" : user ? "Send enquiry" : "Sign in to send enquiry"}</button>
        </fieldset>
        <p className="flex items-start justify-center gap-2 text-center text-xs leading-5 text-[#96868b]"><ShieldCheck size={14} className="mt-0.5" aria-hidden="true" />Your enquiry is shared privately with this vendor.</p>
      </form>

    </section>
  );
}

function VendorProfile({ data, onMessage, busy }) {
  const { vendor, services = [], categories = [], locations = [] } = data;
  const [shareNotice, setShareNotice] = useState("");
  const [activeSection, setActiveSection] = useState("listing-overview");
  useEffect(() => {
    const ids = ["listing-overview", "vendor-services", "listing-reviews"];
    let frame;
    const update = () => {
      setActiveSection(ids.filter((id) => document.getElementById(id)?.getBoundingClientRect().top <= 220).at(-1) || ids[0]);
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
  }, [vendor.id]);
  const reviewCount = Number(vendor.reviews) || 0;
  const rating = Number(vendor.rating || 0).toFixed(1);
  const city = [vendor.city, vendor.state].filter(Boolean).join(", ");
  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); setShareNotice("Link copied to clipboard."); }
    catch { setShareNotice(`Share this link: ${window.location.href}`); }
  }
  return (
    <main id="main-content" className="customer-marketplace mx-auto w-full max-w-[1500px] px-4 pb-16 pt-6 text-base text-[#493b41] sm:px-8 lg:px-12 lg:pt-8">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[#99868e]">
        <Link to="/" className="hover:text-rose-brand">Home</Link><ChevronRight size={13} aria-hidden="true" /><Link to="/vendors" className="hover:text-rose-brand">Vendors</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page" className="text-[#6f5b64]">{vendor.name}</span>
      </nav>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)] lg:gap-7">
        <div className="min-w-0">
          <div id="vendor-gallery" className="scroll-mt-40"><MediaGallery type="vendors" id={vendor.id} variant="profile" fallbackImage={vendor.cover || vendor.image} title={vendor.name} /></div>
          <header className={`${panel} relative z-[1] mx-3 -mt-10 overflow-hidden sm:mx-5`}>
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3"><h1 className="break-words font-sans text-[26px] font-semibold leading-tight tracking-[-0.7px] sm:text-[30px]">{vendor.name}</h1><span className="inline-flex items-center gap-1 rounded bg-[#edf5f4] px-2 py-1 text-xs font-medium text-[#367667]"><ShieldCheck size={14} aria-hidden="true" />Approved vendor</span></div>
                <p className="mt-3 flex items-start gap-1.5 text-sm text-[#82727a]"><MapPin size={16} className="mt-0.5 text-rose-brand" aria-hidden="true" />{city || "Location on request"}</p>
                <p className="mt-4 flex items-center gap-1.5 text-sm text-[#48735c]"><Check size={15} aria-hidden="true" />{services.length ? `${services.length} ${services.length === 1 ? "service" : "services"} to make your day yours` : "Let’s bring your celebration to life"}</p>
              </div>
              <a href="#listing-reviews" className="shrink-0 text-center" aria-label={reviewCount ? `${rating} out of 5 from ${reviewCount} reviews` : "No reviews yet"}>
                <span className={`inline-flex items-center justify-center gap-1 rounded-md px-3 py-2 text-lg font-semibold ${reviewCount ? "bg-[#548863] text-white" : "bg-[#f4eeea] text-[#927d86]"}`}><Star size={17} fill={reviewCount ? "currentColor" : "none"} aria-hidden="true" />{reviewCount ? rating : "New"}</span><span className="mt-1.5 block text-xs text-[#8e7c84]">{reviewCount ? `${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}` : "No reviews yet"}</span>
              </a>
            </div>
            <div className="grid grid-cols-2 divide-[#e9e0dc] border-t border-[#eee7e3] bg-[#fdfbfa] text-sm text-[#79676f] sm:grid-cols-4 sm:divide-x">
              <a href="#vendor-gallery" className="flex min-h-14 items-center justify-center gap-2 px-2 py-3 hover:bg-[#f5eeeb]"><Images size={17} aria-hidden="true" />Photos</a>
              <WishlistButton type="Vendor" id={vendor.id} className="flex min-h-14 items-center justify-center gap-2 px-2 py-3 text-sm hover:bg-[#f5eeeb] aria-pressed:text-rose-brand" />
              <a href="#listing-reviews" className="flex min-h-14 items-center justify-center gap-2 border-t border-[#eee7e3] px-2 py-3 hover:bg-[#f5eeeb] sm:border-t-0"><Star size={17} aria-hidden="true" />Reviews</a>
              <button type="button" onClick={share} className="flex min-h-14 items-center justify-center gap-2 border-t border-[#eee7e3] px-2 py-3 hover:bg-[#f5eeeb] sm:border-t-0"><Share2 size={17} aria-hidden="true" />Share</button>
            </div>
            {shareNotice && <p role="status" className="break-all border-t border-[#eee7e3] px-5 py-2 text-sm text-rose-brand">{shareNotice}</p>}
          </header>
        </div>
        <aside className="row-start-2 min-w-0 space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-label="Vendor pricing and enquiry">
          <PriceEstimate services={services} />
          <VendorEnquiry vendor={vendor} services={services} onMessage={onMessage} busy={busy} />
          <div className="flex items-start gap-3 px-2 text-[#94818a]"><CalendarDays size={18} className="mt-1" aria-hidden="true" /><p className="text-sm leading-6">Good things begin with a conversation. Discuss your date and details directly with your vendor.</p></div>
        </aside>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <nav aria-label="Vendor sections" className="flex gap-7 overflow-x-auto border-b border-[#e6dcd7] px-1 text-sm font-medium text-[#8b757e]">
            {[["listing-overview", "About the vendor"], ["vendor-services", "Services"], ["listing-reviews", "Reviews"]].map(([id, label]) => <a key={id} href={`#${id}`} aria-current={activeSection === id ? "location" : undefined} className="shrink-0 border-b-2 border-transparent px-1 py-4 hover:text-rose-brand aria-[current=location]:border-rose-brand aria-[current=location]:text-rose-brand">{label}{id === "vendor-services" && <span className="ml-1 rounded bg-[#f0e8e5] px-1.5 py-0.5 text-xs">{services.length}</span>}</a>)}
          </nav>
          <section id="listing-overview" className={`${panel} mt-6 scroll-mt-40 p-5 sm:p-7`} aria-labelledby="vendor-about-title">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-brand">A little about us</p><h2 id="vendor-about-title" className="font-serif text-[28px] tracking-[-0.6px]">Meet the business</h2>
            <p className="mt-4 whitespace-pre-line break-words text-base leading-7 text-[#88767f]">{vendor.description || "Message the vendor to discuss the details of your celebration."}</p>
            <div className="mt-6 border-t border-[#eee7e3] pt-6"><h3 className="mb-3 text-sm font-semibold text-[#67525c]">Specialities</h3><div className="flex flex-wrap gap-2">{categories.length ? categories.map((category) => <span key={category.name} className="rounded-md border border-[#eedfe2] bg-[#fbf5f5] px-3 py-1.5 text-sm text-[#94606d]">{category.name}</span>) : <p className="text-sm text-[#88767f]">Explore services below.</p>}</div></div>
            <div className="mt-6 flex items-start gap-3 rounded-lg bg-[#faf8f5] p-4"><MapPin size={19} className="mt-0.5 text-rose-brand" aria-hidden="true" /><div><h3 className="mb-1 text-sm font-semibold text-[#67525c]">Service locations</h3>{locations.length ? locations.map((location, index) => <p key={index} className="text-sm leading-6 text-[#88767f]">{[location.city, location.state].filter(Boolean).join(", ")}</p>) : <p className="text-sm text-[#88767f]">{city || "Discuss your event location with the vendor."}</p>}</div></div>
          </section>
          <section id="vendor-services" className="mt-8 scroll-mt-40" aria-labelledby="vendor-services-title">
            <div className="mb-5 flex items-end justify-between gap-3"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-brand">Find your perfect fit</p><h2 id="vendor-services-title" className="font-serif text-[28px] leading-tight tracking-[-0.6px]">Services by {vendor.name}</h2></div></div>
            {services.length ? <div className="grid gap-4 sm:grid-cols-2">{services.map((service) => <DiscoveryCard key={service.id} item={service} />)}</div> : <div className={`${panel} p-6 text-sm leading-6 text-[#88767f]`}>No services published yet. Message the vendor to discuss your requirements.</div>}
          </section>
          <div id="listing-reviews" className={`${panel} mt-8 scroll-mt-40 p-5 sm:p-7`}><PublicReviews type="vendors" id={vendor.id} /></div>
        </div>
      </div>
    </main>
  );
}
