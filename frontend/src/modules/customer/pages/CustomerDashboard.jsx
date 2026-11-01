import { QuotationOverview } from "../../quotations/QuotationPages";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarHeart,
  ShoppingBag,
  FileText,
  Heart,
  Wallet,
  ArrowUpRight,
  Plus,
  CalendarDays,
  MapPin,
  Users,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  useCustomerData,
  ErrorView,
  Empty,
  Badge,
} from "../components/WorkspaceUI";
import { ServiceCard } from "../components/ServiceCards";
import { date, money } from "../services/workspace.api";
const categorySections = [
  ["Popular venues", "Venue & Location"],
  ["Best caterers", "Catering & Food"],
  ["Dream-worthy decoration", "Decoration"],
  ["Set the mood with a DJ", "DJ & Entertainment"],
  ["Capture every moment", "Photography & Videography"],
  ["Your perfect makeup artist", "Makeup & Beauty"],
  ["Beautiful mehndi", "Mehndi"],
  ["Arrive in style", "Transportation"],
];
function Recommendation({ title, category, id }) {
  const r = useCustomerData(`/discover?category=${id}&pageSize=4`);
  return (
    <section className="cw-recommendation [&_>_header]:flex [&_>_header]:items-center [&_>_header]:justify-between [&_>_header]:gap-[15px] [&_>_header]:pt-[0] [&_>_header]:pr-[0] [&_>_header]:pb-[18px] [&_>_header]:pl-[0] [&_>_header_>_a]:flex [&_>_header_>_a]:items-center [&_>_header_>_a]:gap-[6px] [&_>_header_>_a]:text-[10px] [@media(width<=520px)]:[&_>_header_>_a]:text-[9px] [&_>_header_>_a]:text-[#9f7885] [&_>_header_>_a]:whitespace-nowrap mt-[28px] mr-[0] mb-[36px] ml-[0] [&_h2]:text-[26px] [@media(width<=520px)]:[&_h2]:text-[24px] [&_h2]:mt-[7px] [&_h2]:mr-[0] [&_h2]:mb-[0] [&_h2]:ml-[0] [@media(width<=520px)]:[&_.cw-eyebrow]:text-[7px] [@media(width<=520px)]:[&_.cw-eyebrow]:tracking-[1.5px]">
      <header>
        <div>
          <span className="cw-eyebrow text-[#9aa890] text-[8px] tracking-[1.6px] font-[500]">CURATED FOR YOUR CELEBRATION</span>
          <h2>{title}</h2>
        </div>
        <Link to={`/customer/discover?category=${id}`}>
          View all <ArrowRight size={15} />
        </Link>
      </header>
      {r.loading ? (
        <div
          className="cw-card-skeletons grid grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(width<=800px)]:grid-cols-[repeat(4,_minmax(235px,_1fr))] [@media(800px<width<=1050px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[19px] [@media(width<=1250px)]:gap-[13px] [@media(width<=800px)]:overflow-x-auto [@media(width<=800px)]:pb-[12px] [@media(width<=800px)]:[scroll-snap-type:x_mandatory]"
          role="status"
          aria-label={`Loading ${title}`}
        >
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="cw-skeleton cw-card-skeleton [background:linear-gradient(100deg,_#eee9e4_20%,_#faf7f3_40%,_#eee9e4_60%)] [background-size:200%_100%]! animate-vendor-shimmer motion-reduce:[animation:none] rounded-[9px] h-[300px]" />
          ))}
        </div>
      ) : r.error ? (
        <ErrorView error={r.error} retry={r.retry} />
      ) : !r.data.rows.length ? (
        <div className="cw-category-empty flex items-center gap-[15px] pt-[21px] pr-[21px] pb-[21px] pl-[21px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#eee3d9] [border-right-width:1px] [border-right-style:solid] [border-right-color:#eee3d9] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#eee3d9] [border-left-width:1px] [border-left-style:solid] [border-left-color:#eee3d9] rounded-[7px] [background:#f8f3ed] text-[#baa18a] [&_strong]:text-[12px] [&_strong]:text-[#9a8677] [&_p]:mt-[3px] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [&_p]:text-[10px] [&_>_a]:ml-[auto] [&_>_a]:text-[10px] [&_>_a]:text-[#9e7b73] [@media(width<=800px)]:[&_>_a]:hidden">
          <Sparkles size={20} />
          <div>
            <strong>{category}</strong>
            <p>New services will appear here as vendors are approved.</p>
          </div>
          <Link to="/customer/discover">Explore other services ↗</Link>
        </div>
      ) : (
        <div className="cw-recommendation-grid grid grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(width<=800px)]:grid-cols-[repeat(4,_minmax(235px,_1fr))] [@media(800px<width<=1050px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[19px] [@media(width<=1250px)]:gap-[13px] [@media(width<=800px)]:overflow-x-auto [@media(width<=800px)]:pb-[12px] [@media(width<=800px)]:[scroll-snap-type:x_mandatory] [@media(width<=800px)]:[&_>_article]:[scroll-snap-align:start]">
          {r.data.rows.map((item) => (
            <ServiceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
export default function CustomerDashboard() {
  const [now] = useState(() => Date.now()),
    { user } = useAuth(),
    r = useCustomerData("/dashboard"),
    catalog = useCustomerData("/catalog");
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  const d = r.data,
    e = d?.event;
  const days = e
    ? Math.max(
        0,
        Math.ceil(
          (new Date(`${String(e.eventDate).slice(0, 10)}T00:00:00+05:30`) -
            now) /
            86400000,
        ),
      )
    : null;
  const checklist = [
      ["Create your event", !!e],
      ["Find your dream team", Number(e?.bookedServices) > 0],
      [
        "Confirm your bookings",
        d?.bookings?.some((b) =>
          ["Confirmed", "Completed", "InProgress"].includes(b.status),
        ),
      ],
      ["Make it official", d?.stats.spent > 0],
    ],
    progress = Math.round(
      (checklist.filter((c) => c[1]).length / checklist.length) * 100,
    );
  return (
    <>
      <div className="cw-dashboard-greeting flex items-center [@media(width<=520px)]:items-start justify-between mb-[26px] gap-[20px] [&_h1]:mt-[8px] [&_h1]:mr-[0] [&_h1]:mb-[9px] [&_h1]:ml-[0] [&_h1]:text-[31px] [@media(width<=520px)]:[&_h1]:text-[25px] [@media(520px<width<=1250px)]:[&_h1]:text-[28px] [&_h1_>_span]:text-[#a46d7f] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [&_p]:text-[11px] [@media(width<=520px)]:[&_p]:text-[10px] [@media(width<=520px)]:[&_>_.cw-button]:text-[0px] [@media(520px<width<=800px)]:[&_>_.cw-button]:text-[10px] [@media(width<=520px)]:[&_>_.cw-button]:pl-[10px] [@media(520px<width<=800px)]:[&_>_.cw-button]:pl-[12px] [@media(width<=520px)]:[&_>_.cw-button]:pr-[10px] [@media(520px<width<=800px)]:[&_>_.cw-button]:pr-[12px] [@media(width<=520px)]:[&_h1]:max-w-[245px] [@media(width<=520px)]:[&_>_.cw-button]:pt-[10px] [@media(width<=520px)]:[&_>_.cw-button]:pb-[10px] [@media(width<=520px)]:[&_>_.cw-button]:min-h-[35px] [@media(width<=520px)]:[&_>_.cw-button]:gap-[0] [@media(width<=520px)]:[&_>_.cw-button_svg]:w-[16px]">
        <div>
          <span className="cw-eyebrow text-[#9aa890] text-[8px] tracking-[1.6px] font-[500]">A BEAUTIFUL BEGINNING</span>
          <h1>
            Your celebration starts here<span>.</span>
          </h1>
          <p>
            Welcome back, {user.firstName}. Let’s bring your vision to life.
          </p>
        </div>
        <Link className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" to="/customer/events?create=1">
          <Plus size={16} /> Create an event
        </Link>
      </div>
      <section className="cw-planning-hero relative rounded-[10px] min-h-[315px] [@media(width<=520px)]:min-h-[300px] [@media(520px<width<=800px)]:min-h-[310px] [@media(width>=1800px)]:min-h-[350px] overflow-x-hidden overflow-y-hidden [background:#534539_url('/images/wedding-garden-1024.webp')_center_49%_/_cover_no-repeat] flex items-center [&:before]:[content:''] [&:before]:absolute [&:before]:[inset:0] [&:before]:[background:linear-gradient(_90deg,_#322e23eb_0%,_#3c3725c4_38%,_#39342622_76%_)]">
        <div className="cw-hero-copy relative pt-[32px] [@media(width<=520px)]:pt-[28px] [@media(520px<width<=800px)]:pt-[30px] pr-[39px] [@media(width<=520px)]:pr-[23px] [@media(520px<width<=800px)]:pr-[30px] pb-[32px] [@media(width<=520px)]:pb-[28px] [@media(520px<width<=800px)]:pb-[30px] pl-[39px] [@media(width<=520px)]:pl-[23px] [@media(520px<width<=800px)]:pl-[30px] z-[1] [&_h2]:text-[45px] [@media(width<=520px)]:[&_h2]:text-[36px] [@media(520px<width<=800px)]:[&_h2]:text-[42px] [&_h2]:leading-[1.13] [&_h2]:tracking-[-1px] [&_h2]:text-[#fff8ed] [&_h2]:font-[400] [&_h2]:mt-[18px] [&_h2]:mr-[0] [&_h2]:mb-[13px] [&_h2]:ml-[0] [&_h2_em]:text-[#e4c9b0] [&_h2_em]:font-[400] [&_p]:text-[#dfd6c8] [&_p]:text-[10px] [@media(width<=520px)]:[&_p]:text-[9px] [&_p]:leading-[1.9] [&_.cw-button]:mt-[14px] [&_.cw-button]:[background:#f9f4eb] [&_.cw-button]:[border-top-color:#f9f4eb] [&_.cw-button]:[border-right-color:#f9f4eb] [&_.cw-button]:[border-bottom-color:#f9f4eb] [&_.cw-button]:[border-left-color:#f9f4eb] [&_.cw-button]:text-[#75624c] [&_.cw-button]:min-h-[37px] [&_.cw-button]:text-[10px] [&_.cw-button]:pt-[0] [&_.cw-button]:pr-[16px] [&_.cw-button]:pb-[0] [&_.cw-button]:pl-[16px]">
          <span className="cw-hero-label text-[8px] [@media(width<=520px)]:text-[6px] tracking-[2px] [@media(width<=520px)]:tracking-[1.3px] text-[#e3d2b4] flex items-center gap-[7px]">
            <Sparkles size={14} /> EVERY LITTLE DETAIL, BEAUTIFULLY YOURS
          </span>
          <h2>
            Plan Your
            <br />
            <em>Perfect Wedding</em>
          </h2>
          <p>
            Your people. Your vision. One unforgettable celebration.
            <br />
            Bring it all together, one beautiful detail at a time.
          </p>
          <Link to="/customer/discover" className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]">
            Find your dream team <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="cw-hero-caption absolute right-[30px] bottom-[25px] text-right text-[#fff8ed] [&_>_span]:block [&_>_span]:text-[7px] [&_>_span]:tracking-[3px] [&_>_span]:opacity-[0.85] [&_>_i]:block [&_>_i]:[font-family:Georgia,_serif] [&_>_i]:text-[16px] [&_>_i]:mt-[9px] [@media(width<=1050px)]:hidden">
          <span>THE BEGINNING OF FOREVER</span>
          <i>A day as extraordinary as your story.</i>
        </div>
      </section>
      <div className="cw-kpi-grid [@media(width<=1050px)]:grid-cols-[repeat(3,_minmax(0,_1fr))]!" aria-busy={r.loading}>
        {[
          ["Active Events", "events", CalendarHeart],
          ["Upcoming Bookings", "bookings", ShoppingBag],
          ["Pending Quotations", "quotations", FileText],
          ["Wishlist Items", "wishlist", Heart],
          ["Total Spent", "spent", Wallet],
        ].map(([label, key, Icon], i) => (
          <div className="cw-kpi [&_>_div]:min-w-0" key={key}>
            <div>
              <span>{label}</span>
              {r.loading ? (
                <span className="cw-skeleton cw-number-skeleton [background:linear-gradient(100deg,_#eee9e4_20%,_#faf7f3_40%,_#eee9e4_60%)] [background-size:200%_100%]! animate-vendor-shimmer motion-reduce:[animation:none] rounded-[9px] h-[33px] w-[60px] mt-[10px] mr-[0] mb-[10px] ml-[0]" />
              ) : (
                <strong>
                  {key === "spent" ? money(d.stats[key], true) : d.stats[key]}
                </strong>
              )}
              <small>
                {
                  [
                    "Your celebrations",
                    "Getting closer to the day",
                    "Ready for your decision",
                    "Saved with love",
                    "Verified INR payments",
                  ][i]
                }
              </small>
            </div>
            <span className={`cw-kpi-icon [&.tone-1]:[background:#edf1e8] [&.tone-1]:text-[#92a07c] [&.tone-2]:[background:#f6f0e5] [&.tone-2]:text-[#bc9b67] [&.tone-3]:[background:#f8eaf0] [&.tone-3]:text-[#bb839c] [&.tone-4]:[background:#edf0ed] [&.tone-4]:text-[#81988c] [@media(width<=1250px)]:[&_>_svg]:w-[16px] tone-${i}`}>
              <Icon size={20} strokeWidth={1.6} />
            </span>
          </div>
        ))}
      </div>
      <QuotationOverview role="Customer" />
      <div className="cw-dashboard-middle grid grid-cols-[minmax(0,_1.9fr)_minmax(260px,_1fr)] [@media(width<=1050px)]:grid-cols-[minmax(0,_1fr)] [@media(1050px<width<=1250px)]:grid-cols-[minmax(0,_1.6fr)_minmax(240px,_1fr)] gap-[23px] [@media(width<=1250px)]:gap-[17px] mt-[27px] mr-[0] mb-[27px] ml-[0]">
        <section className="cw-event-feature [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#eae2db] [border-right-width:1px] [border-right-style:solid] [border-right-color:#eae2db] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#eae2db] [border-left-width:1px] [border-left-style:solid] [border-left-color:#eae2db] rounded-[9px] overflow-x-hidden overflow-y-hidden min-w-0 [&_>_header]:flex [&_>_header]:items-center [&_>_header]:justify-between [&_>_header]:gap-[15px] [&_>_header]:pt-[23px] [@media(width<=520px)]:[&_>_header]:pt-[20px] [&_>_header]:pr-[26px] [@media(width<=520px)]:[&_>_header]:pr-[18px] [@media(520px<width<=1250px)]:[&_>_header]:pr-[20px] [&_>_header]:pb-[21px] [@media(width<=520px)]:[&_>_header]:pb-[20px] [&_>_header]:pl-[26px] [@media(width<=520px)]:[&_>_header]:pl-[18px] [@media(520px<width<=1250px)]:[&_>_header]:pl-[20px] [&_>_header_h2]:text-[24px] [@media(width<=520px)]:[&_>_header_h2]:text-[22px] [&_>_header_h2]:mt-[7px] [&_>_header_h2]:mr-[0] [&_>_header_h2]:mb-[0] [&_>_header_h2]:ml-[0] [&_>_header_>_a]:flex [&_>_header_>_a]:items-center [&_>_header_>_a]:gap-[6px] [&_>_header_>_a]:text-[10px] [&_>_header_>_a]:text-[#9f7885] [&_>_header_>_a]:whitespace-nowrap [&_>_footer]:pt-[17px] [&_>_footer]:pr-[26px] [@media(width<=1250px)]:[&_>_footer]:pr-[20px] [&_>_footer]:pb-[17px] [&_>_footer]:pl-[26px] [@media(width<=1250px)]:[&_>_footer]:pl-[20px] [&_>_footer]:[background:#fdfbf7] [&_>_footer]:[border-top-width:1px] [&_>_footer]:[border-top-style:solid] [&_>_footer]:[border-top-color:#eee8de] [&_>_footer]:flex [&_>_footer]:items-center [&_>_footer]:justify-between [&_>_footer]:gap-[20px] [&_>_footer_>_div_span]:text-[10px] [&_>_footer_>_div_span]:text-[#9d8b7e] [&_>_footer_>_div_small]:block [&_>_footer_>_div_small]:text-[9px] [&_>_footer_>_div_small]:text-[#b0a398] [&_>_footer_>_div_small]:mt-[3px] [&_>_footer_.cw-button]:[background:#f8f1e7] [&_>_footer_.cw-button]:[border-top-color:#eadfce] [&_>_footer_.cw-button]:[border-right-color:#eadfce] [&_>_footer_.cw-button]:[border-bottom-color:#eadfce] [&_>_footer_.cw-button]:[border-left-color:#eadfce] [&_>_footer_.cw-button]:text-[#9e8264] [&_>_footer_.cw-button]:text-[10px] [@media(width<=520px)]:[&_>_header_.cw-eyebrow]:text-[7px] [@media(width<=520px)]:[&_>_header_.cw-eyebrow]:tracking-[1.1px]">
          <header>
            <div>
              <span className="cw-eyebrow text-[#9aa890] text-[8px] tracking-[1.6px] font-[500]">
                THE DAY YOU’RE COUNTING DOWN TO
              </span>
              <h2>Your upcoming event</h2>
            </div>
            <Link to="/customer/events">
              All events <ArrowUpRight size={15} />
            </Link>
          </header>
          {r.loading ? (
            <div className="cw-skeleton h-48 [background:linear-gradient(100deg,_#eee9e4_20%,_#faf7f3_40%,_#eee9e4_60%)] [background-size:200%_100%]! animate-vendor-shimmer motion-reduce:[animation:none] rounded-[9px]" />
          ) : e ? (
            <>
              <div className="cw-event-feature-top flex items-center gap-[17px] [@media(width<=360px)]:gap-[8px] [@media(360px<width<=520px)]:gap-[12px] mt-[0] mr-[26px] [@media(width<=520px)]:mr-[18px] [@media(520px<width<=1250px)]:mr-[20px] mb-[0] ml-[26px] [@media(width<=520px)]:ml-[18px] [@media(520px<width<=1250px)]:ml-[20px] pt-[22px] pr-[0] pb-[22px] pl-[0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#efe8e1] [&_h3]:text-[23px] [@media(width<=360px)]:[&_h3]:text-[18px] [@media(360px<width<=520px)]:[&_h3]:text-[21px] [&_h3]:[font-family:Georgia,_serif] [&_h3]:font-[400] [&_h3]:mt-[8px] [&_h3]:mr-[0] [&_h3]:mb-[5px] [&_h3]:ml-[0] [&_p]:flex [&_p]:items-center [&_p]:gap-[4px] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [&_p]:text-[10px] [&_.cw-badge]:[background:#eef0e7] [&_.cw-badge]:text-[#909d7b]">
                <span className="cw-event-symbol h-[69px] [@media(width<=520px)]:h-[55px] w-[65px] [@media(width<=360px)]:w-[38px] [@media(360px<width<=520px)]:w-[48px] rounded-[8px] [background:#f5ebe5] text-[#b68e7a] grid place-items-center shrink-0">
                  <CalendarHeart size={27} strokeWidth={1.2} />
                </span>
                <div>
                  <Badge>{e.type}</Badge>
                  <h3>{e.name}</h3>
                  <p>
                    <MapPin size={13} />
                    {[e.city, e.state].filter(Boolean).join(", ")}
                  </p>
                </div>
                <div className="cw-countdown ml-[auto] text-center [background:#faf6ef] [border-top-width:1px] [border-top-style:solid] [border-top-color:#efe7dc] [border-right-width:1px] [border-right-style:solid] [border-right-color:#efe7dc] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#efe7dc] [border-left-width:1px] [border-left-style:solid] [border-left-color:#efe7dc] rounded-[8px] min-w-[82px] [@media(width<=360px)]:min-w-[55px] [@media(360px<width<=520px)]:min-w-[61px] pt-[12px] [@media(width<=520px)]:pt-[10px] pr-[12px] [@media(width<=520px)]:pr-[10px] pb-[12px] [@media(width<=520px)]:pb-[10px] pl-[12px] [@media(width<=520px)]:pl-[10px] [&_>_strong]:text-[30px] [@media(width<=520px)]:[&_>_strong]:text-[25px] [&_>_strong]:leading-[1.2] [&_>_strong]:[font-family:Georgia,_serif] [&_>_strong]:text-[#b48b69] [&_>_strong]:font-[400] [&_>_span]:block [&_>_span]:text-[7px] [@media(width<=520px)]:[&_>_span]:text-[6px] [&_>_span]:text-[#bca78d] [&_>_span]:tracking-[1.3px] [&_>_span]:mt-[5px]">
                  <strong>{days}</strong>
                  <span>DAYS TO GO</span>
                </div>
              </div>
              <div className="cw-event-facts grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=360px)]:grid-cols-[1fr] pt-[2px] pr-[26px] [@media(width<=520px)]:pr-[18px] [@media(520px<width<=1250px)]:pr-[20px] pb-[24px] pl-[26px] [@media(width<=520px)]:pl-[18px] [@media(520px<width<=1250px)]:pl-[20px] gap-[20px] [@media(width<=520px)]:gap-[10px] [@media(520px<width<=1250px)]:gap-[12px] [&_>_div]:flex [&_>_div]:items-center [@media(width<=520px)]:[&_>_div]:items-start [&_>_div]:gap-[9px] [@media(width<=520px)]:[&_>_div]:gap-[6px] [&_>_div]:text-[#b1a28c] [&_span]:text-[9px] [@media(width<=520px)]:[&_span]:text-[8px] [&_span]:text-[#a59a93] [&_strong]:block [&_strong]:text-[#78665f] [&_strong]:text-[11px] [@media(width<=520px)]:[&_strong]:text-[9px] [@media(520px<width<=1250px)]:[&_strong]:text-[10px] [&_strong]:font-[500] [&_strong]:mt-[5px] [@media(width<=520px)]:[&_>_div_>_svg]:w-[13px] [@media(width<=520px)]:[&_>_div_>_svg]:mt-[3px]">
                <div>
                  <CalendarDays size={16} />
                  <span>
                    Event date<strong>{date(e.eventDate)}</strong>
                  </span>
                </div>
                <div>
                  <Users size={16} />
                  <span>
                    Guest count<strong>{e.guests} guests</strong>
                  </span>
                </div>
                <div>
                  <Wallet size={16} />
                  <span>
                    Your budget<strong>{money(e.budget)}</strong>
                  </span>
                </div>
              </div>
              <footer>
                <div>
                  <span>
                    <strong>{e.bookedServices}</strong> booked services
                  </span>
                  <small>{money(e.committed)} committed</small>
                </div>
                <Link className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" to={`/customer/events/${e.id}`}>
                  Manage event <ArrowRight size={15} />
                </Link>
              </footer>
            </>
          ) : (
            <Empty
              title="Your story starts with a date"
              text="Create your first event to keep your budget, guests and vendors together."
              action={
                <Link
                  className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
                  to="/customer/events?create=1"
                >
                  Plan my event <Plus size={15} />
                </Link>
              }
            />
          )}
        </section>
        <section className="cw-planning-card pt-[25px] pr-[27px] pb-[25px] pl-[27px] [background:#f0f2e9] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e2e6d9] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e2e6d9] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e2e6d9] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e2e6d9] rounded-[9px] [&_.cw-eyebrow]:text-[#9aa481] [&_h2]:text-[23px] [&_h2]:text-[#71805b] [&_h2]:mt-[7px] [&_h2]:mr-[0] [&_h2]:mb-[18px] [&_h2]:ml-[0] [&_.cw-progress]:h-[5px] [&_.cw-progress]:[background:#e1e6d7] [&_.cw-progress]:rounded-[10px] [&_.cw-progress]:overflow-x-hidden [&_.cw-progress]:overflow-y-hidden [&_ul]:[list-style:none] [&_ul]:mt-[19px] [&_ul]:mr-[0] [&_ul]:mb-[21px] [&_ul]:ml-[0] [&_ul]:pt-[0] [&_ul]:pr-[0] [&_ul]:pb-[0] [&_ul]:pl-[0] [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-[13px] [&_li]:flex [&_li]:items-center [&_li]:gap-[10px] [&_li]:text-[10px] [&_li]:text-[#9ba18e] [&_li_>_span]:w-[16px] [&_li_>_span]:h-[16px] [&_li_>_span]:[border-top-width:1px] [&_li_>_span]:[border-top-style:solid] [&_li_>_span]:[border-top-color:#c5cfb7] [&_li_>_span]:[border-right-width:1px] [&_li_>_span]:[border-right-style:solid] [&_li_>_span]:[border-right-color:#c5cfb7] [&_li_>_span]:[border-bottom-width:1px] [&_li_>_span]:[border-bottom-style:solid] [&_li_>_span]:[border-bottom-color:#c5cfb7] [&_li_>_span]:[border-left-width:1px] [&_li_>_span]:[border-left-style:solid] [&_li_>_span]:[border-left-color:#c5cfb7] [&_li_>_span]:rounded-[50%] [&_li_>_span]:grid [&_li_>_span]:place-items-center [&_li.done]:text-[#788965] [&_li.done_>_span]:[background:#b4c09f] [&_li.done_>_span]:text-[white] [&_li.done_>_span]:[border-top-color:#b4c09f] [&_li.done_>_span]:[border-right-color:#b4c09f] [&_li.done_>_span]:[border-bottom-color:#b4c09f] [&_li.done_>_span]:[border-left-color:#b4c09f] [&_>_a]:flex [&_>_a]:items-center [&_>_a]:gap-[8px] [&_>_a]:text-[10px] [&_>_a]:text-[#7f8d6d] [@media(width<=1050px)]:block">
          <span className="cw-eyebrow text-[#9aa890] text-[8px] tracking-[1.6px] font-[500]">ONE STEP CLOSER</span>
          <h2>Your planning journey</h2>
          <div className="cw-planning-progress flex items-center gap-[17px] mb-[12px] [&_strong]:text-[40px] [&_strong]:[font-family:Georgia,_serif] [&_strong]:text-[#929f76] [&_strong]:font-[400] [&_strong]:leading-[1.1] [&_strong_small]:text-[20px] [&_>_span]:text-[10px] [&_>_span]:text-[#9fa68c] [&_>_span]:leading-[1.8]">
            <strong>
              {progress}
              <small>%</small>
            </strong>
            <span>
              Little steps.
              <br />
              Beautiful memories.
            </span>
          </div>
          <div className="cw-progress [&_>_span]:h-full [&_>_span]:[background:#9eac87] [&_>_span]:block [&_>_span]:rounded-[inherit]">
            <span
              className="[width:var(--customer-progress)]!"
              style={{ "--customer-progress": `${progress}%` }}
            />
          </div>
          <ul>
            {checklist.map(([label, done]) => (
              <li key={label} className={done ? "done" : ""}>
                <span>{done ? <Check size={12} /> : null}</span>
                {label}
              </li>
            ))}
          </ul>
          <Link to="/customer/events">
            Keep planning <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <section className="cw-quick-start [background:#f5ede7] [border-top-width:1px] [border-top-style:solid] [border-top-color:#ece0d7] [border-right-width:1px] [border-right-style:solid] [border-right-color:#ece0d7] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#ece0d7] [border-left-width:1px] [border-left-style:solid] [border-left-color:#ece0d7] rounded-[8px] flex items-center gap-[18px] [@media(width<=520px)]:gap-[12px] pt-[21px] [@media(width<=520px)]:pt-[18px] pr-[25px] [@media(width<=520px)]:pr-[18px] pb-[21px] [@media(width<=520px)]:pb-[18px] pl-[25px] [@media(width<=520px)]:pl-[18px] mt-[28px] mr-[0] mb-[32px] ml-[0] [&_>_svg]:text-[#b99a80] [&_>_svg]:shrink-0 [&_h3]:[font-family:Georgia,_serif] [&_h3]:font-[400] [&_h3]:text-[20px] [@media(width<=520px)]:[&_h3]:text-[19px] [&_h3]:mt-[0] [&_h3]:mr-[0] [&_h3]:mb-[4px] [&_h3]:ml-[0] [&_p]:text-[10px] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [&_>_a]:ml-[auto] [@media(width<=520px)]:[&_>_a]:ml-[35px] [&_>_a]:flex [&_>_a]:items-center [&_>_a]:gap-[9px] [&_>_a]:text-[#ac8278] [&_>_a]:text-[10px] [&_>_a]:whitespace-nowrap [@media(width<=520px)]:flex-wrap [@media(width<=520px)]:[&_>_div]:flex-1">
        <Sparkles size={23} />
        <div>
          <h3>A dream team for your dream day</h3>
          <p>
            From the perfect venue to the final flourish — find your kind of
            extraordinary.
          </p>
        </div>
        <Link to="/customer/discover">
          Explore all services <ArrowUpRight size={16} />
        </Link>
      </section>
      {catalog.error ? (
        <ErrorView error={catalog.error} retry={catalog.retry} />
      ) : catalog.loading ? (
        <div className="cw-skeleton h-64 [background:linear-gradient(100deg,_#eee9e4_20%,_#faf7f3_40%,_#eee9e4_60%)] [background-size:200%_100%]! animate-vendor-shimmer motion-reduce:[animation:none] rounded-[9px]" />
      ) : (
        categorySections.map(([title, name]) => {
          const c = catalog.data.categories.find((c) => c.name === name);
          return c ? (
            <Recommendation
              key={c.id}
              title={title}
              category={name}
              id={c.id}
            />
          ) : null;
        })
      )}
      <section className="cw-event-feature cw-recent-bookings [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#eae2db] [border-right-width:1px] [border-right-style:solid] [border-right-color:#eae2db] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#eae2db] [border-left-width:1px] [border-left-style:solid] [border-left-color:#eae2db] rounded-[9px] overflow-x-hidden overflow-y-hidden min-w-0 [&_>_header]:flex [&_>_header]:items-center [&_>_header]:justify-between [&_>_header]:gap-[15px] [&_>_header]:pt-[23px] [@media(width<=520px)]:[&_>_header]:pt-[20px] [&_>_header]:pr-[26px] [@media(width<=520px)]:[&_>_header]:pr-[18px] [@media(520px<width<=1250px)]:[&_>_header]:pr-[20px] [&_>_header]:pb-[21px] [@media(width<=520px)]:[&_>_header]:pb-[20px] [&_>_header]:pl-[26px] [@media(width<=520px)]:[&_>_header]:pl-[18px] [@media(520px<width<=1250px)]:[&_>_header]:pl-[20px] [&_>_header_h2]:text-[24px] [@media(width<=520px)]:[&_>_header_h2]:text-[22px] [&_>_header_h2]:mt-[7px] [&_>_header_h2]:mr-[0] [&_>_header_h2]:mb-[0] [&_>_header_h2]:ml-[0] [&_>_header_>_a]:flex [&_>_header_>_a]:items-center [&_>_header_>_a]:gap-[6px] [&_>_header_>_a]:text-[10px] [&_>_header_>_a]:text-[#9f7885] [&_>_header_>_a]:whitespace-nowrap [&_>_footer]:pt-[17px] [&_>_footer]:pr-[26px] [@media(width<=1250px)]:[&_>_footer]:pr-[20px] [&_>_footer]:pb-[17px] [&_>_footer]:pl-[26px] [@media(width<=1250px)]:[&_>_footer]:pl-[20px] [&_>_footer]:[background:#fdfbf7] [&_>_footer]:[border-top-width:1px] [&_>_footer]:[border-top-style:solid] [&_>_footer]:[border-top-color:#eee8de] [&_>_footer]:flex [&_>_footer]:items-center [&_>_footer]:justify-between [&_>_footer]:gap-[20px] [&_>_footer_>_div_span]:text-[10px] [&_>_footer_>_div_span]:text-[#9d8b7e] [&_>_footer_>_div_small]:block [&_>_footer_>_div_small]:text-[9px] [&_>_footer_>_div_small]:text-[#b0a398] [&_>_footer_>_div_small]:mt-[3px] [&_>_footer_.cw-button]:[background:#f8f1e7] [&_>_footer_.cw-button]:[border-top-color:#eadfce] [&_>_footer_.cw-button]:[border-right-color:#eadfce] [&_>_footer_.cw-button]:[border-bottom-color:#eadfce] [&_>_footer_.cw-button]:[border-left-color:#eadfce] [&_>_footer_.cw-button]:text-[#9e8264] [&_>_footer_.cw-button]:text-[10px] [@media(width<=520px)]:[&_>_header_.cw-eyebrow]:text-[7px] [@media(width<=520px)]:[&_>_header_.cw-eyebrow]:tracking-[1.1px] mt-[35px]">
        <header>
          <div>
            <span className="cw-eyebrow text-[#9aa890] text-[8px] tracking-[1.6px] font-[500]">COMING TOGETHER</span>
            <h2>Your latest bookings</h2>
          </div>
          <Link to="/customer/bookings">
            View all <ArrowUpRight size={15} />
          </Link>
        </header>
        {r.loading ? (
          <div className="cw-skeleton h-32 [background:linear-gradient(100deg,_#eee9e4_20%,_#faf7f3_40%,_#eee9e4_60%)] [background-size:200%_100%]! animate-vendor-shimmer motion-reduce:[animation:none] rounded-[9px]" />
        ) : !d.bookings.length ? (
          <Empty
            title="Your dream team is waiting"
            text="Your booking requests and confirmations will appear here."
            action={
              <Link to="/customer/discover" className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]">
                Discover services
              </Link>
            }
          />
        ) : (
          <div className="cw-table-wrap overflow-x-auto max-w-full min-w-0">
            <table>
              <thead>
                <tr>
                  <th>Vendor / service</th>
                  <th>Event date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.vendor}</strong>
                      <small>{b.services}</small>
                    </td>
                    <td>{date(b.bookingDate)}</td>
                    <td>{money(b.amount)}</td>
                    <td>
                      <Badge>{b.status}</Badge>
                    </td>
                    <td>
                      <Link to={`/customer/bookings/${b.id}`}>
                        View <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <footer className="cw-page-footer text-center [border-top-width:1px] [border-top-style:solid] [border-top-color:#eee5dd] mt-[40px] pt-[25px] pr-[0] pb-[25px] pl-[0] text-[#b0a296] text-[9px] [@media(width<=520px)]:text-[8px] [&_>_span]:[font-family:Georgia,_serif] [&_>_span]:text-[16px] [&_>_span]:text-[#aa8c83] [&_>_span]:mr-[15px] [@media(width<=520px)]:[&_>_span]:mr-[0] [@media(width<=520px)]:[&_>_span]:block [@media(width<=520px)]:[&_>_span]:mt-[0] [@media(width<=520px)]:[&_>_span]:mb-[8px] [@media(width<=520px)]:[&_>_span]:ml-[0]">
        <span>MarryNest</span> Thoughtfully planned. Wholeheartedly celebrated.
      </footer>
    </>
  );
}
