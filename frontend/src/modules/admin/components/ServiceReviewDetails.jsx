import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowUpRight, Building2, CalendarDays,
  Check, ChevronRight, CirclePause, Clock3, FileCheck2,
  History, Image as ImageIcon, Info, Layers3, MapPin, Package,
  Power, ShieldCheck, Store, Tag, Wallet, X,
} from "lucide-react";
import ApprovalTimeline from "../../../components/common/ApprovalTimeline";
import { money, date } from "../api";
import ServiceReviewStatus, { ReviewStatusBadge as Status, PackageReviewStatus, ApprovalBlockers } from "./ServiceReviewStatus";
import { reviewState, statusLabel } from "../service-review.status";

const reviewSections = [["status", "Review status"], ["overview", "Overview"], ["pricing", "Pricing & packages"], ["gallery", "Gallery"], ["location", "Location & policies"], ["history", "History"]];
const label = (key) => key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ");

function Fields({ value }) {
  if (value == null || value === "") return <span className="text-[11px] text-[#8b9486]">Not provided</span>;
  if (Array.isArray(value)) return value.length ? (
    <ul className="m-0 grid list-none gap-3 p-0 [&>li]:min-w-0 [&>li]:rounded-lg [&>li]:border [&>li]:border-[#e7ece2] [&>li]:px-[15px] [&>li]:py-[5px]">{value.map((item, i) => <li key={i}><Fields value={item} /></li>)}</ul>
  ) : <p className="m-0! rounded-md bg-[#f8f9f5] px-[15px] py-[13px] text-[12px]! leading-[1.8] text-[#8d9687]!">No records provided.</p>;
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([key]) => !["DetailsJson", "AttributesJson"].includes(key));
    return entries.length ? (
      <dl className="m-0 text-[12px] [overflow-wrap:anywhere] [&>div]:grid [&>div]:grid-cols-[minmax(100px,.8fr)_minmax(0,1.5fr)] [&>div]:gap-[18px] [&>div]:border-b [&>div]:border-[#edf0e8] [&>div]:py-3 [&>div:last-child]:border-b-0 [&_dt]:text-[11px] [&_dt]:leading-[1.7] [&_dt]:text-[#86907f] [&_dt]:capitalize [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:whitespace-pre-wrap [&_dd]:text-[#53644f] [&_dd>dl>div]:grid-cols-[minmax(80px,1fr)_minmax(0,1.25fr)] [&_dd>dl>div]:gap-3 [&_dd>dl>div:first-child]:pt-0 [@media(width<=600px)]:[&>div]:grid-cols-[minmax(0,1fr)] [@media(width<=600px)]:[&>div]:gap-[5px] [@media(width<=600px)]:[&_dd>dl>div]:grid-cols-[minmax(0,1fr)] [@media(width<=600px)]:[&_dd>dl>div]:gap-[5px]">{entries.map(([key, val]) => (
        <div key={key}><dt>{label(key)}</dt><dd><Fields value={val} /></dd></div>
      ))}</dl>
    ) : <p className="m-0! rounded-md bg-[#f8f9f5] px-[15px] py-[13px] text-[12px]! leading-[1.8] text-[#8d9687]!">No details provided.</p>;
  }
  return <span>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</span>;
}

function Section({ id, icon: Icon, title, subtitle, children, count }) {
  return <section id={id} className="min-w-0 rounded-xl border border-[#e8eae3] bg-white shadow-[0_4px_15px_#2f462a03] scroll-mt-[110px] px-7 py-[25px] [@media(width>=1600px)]:px-8 [@media(width>=1600px)]:py-7 [@media(600px<width<=1150px)]:p-[21px] [@media(width<=600px)]:p-5">
    <header className="mb-[23px] flex items-center gap-3 border-b border-[#edf0e8] pb-[19px] [&_h2]:m-0 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-[9px] [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:tracking-[-.3px] [&_p]:mt-1 [&_p]:mb-0 [&_p]:text-[11px] [&_p]:text-[#8b9487] [@media(width<=600px)]:gap-[10px] [@media(width<=600px)]:[&_h2]:text-[15px] [@media(width<=600px)]:[&_p]:text-[10px]">
      <span className="grid size-[37px] shrink-0 place-items-center rounded-[9px] bg-[#f1f5ec] text-[#64816a]"><Icon size={19} strokeWidth={1.7} /></span>
      <div><h2>{title}{count != null && <span className="inline-grid h-[21px] min-w-[21px] place-items-center rounded-[5px] bg-[#f1f4ec] px-[6px] text-[10px] font-medium text-[#829077]">{count}</span>}</h2>{subtitle && <p>{subtitle}</p>}</div>
    </header>
    {children}
  </section>;
}

export function ServiceReviewHeader() {
  return <header className="flex items-center justify-between gap-6 pb-1 [&_h1]:mt-0 [&_h1]:mb-2 [&_h1]:text-[clamp(28px,2.6vw,39px)] [&_h1]:leading-[1.2] [&_h1]:font-medium [&_h1]:tracking-[-1.3px] [&_h1>span]:text-[#ae9057] [&>div>p:last-child]:m-0 [&>div>p:last-child]:text-[13px] [&>div>p:last-child]:text-[#77847b] [@media(width<=600px)]:flex-col [@media(width<=600px)]:items-start [@media(width<=600px)]:gap-4">
    <div>
      <nav className="mb-[25px] flex flex-wrap items-center gap-[9px] text-[11px] text-[#7b877e] [&_[aria-current]]:text-[#354d40] [@media(width<=600px)]:mb-5 [@media(width<=600px)]:text-[10px]" aria-label="Breadcrumb">
        <Link to="/admin/services">Services</Link><ChevronRight size={12} />
        <Link to="/admin/services/pending">Approval queue</Link><ChevronRight size={12} />
        <span aria-current="page">Service review</span>
      </nav>
      <p className="mt-0! mb-2! text-[10px]! font-semibold tracking-[2.2px] text-[#9b8255]!">MARKETPLACE CURATION</p>
      <h1>Review service<span>.</span></h1>
      <p>Review approval status, rejection reasons, and every listing detail.</p>
    </div>
    <Link className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-[9px] rounded-lg border px-4 py-[11px] text-[12px] leading-[1.5] font-medium no-underline transition-[background,box-shadow,border-color] duration-180 hover:shadow-[0_3px_8px_#203e3510] disabled:cursor-not-allowed disabled:opacity-55 border-[#dce3da] bg-white text-[#45614f] hover:border-[#b6c5b6] hover:bg-[#f2f5ef] mb-[3px] shrink-0 self-end [@media(width<=600px)]:min-h-[38px] [@media(width<=600px)]:self-start [@media(width<=600px)]:px-3 [@media(width<=600px)]:py-2 [@media(width<=600px)]:text-[11px]" to="/admin/services/pending"><ArrowLeft size={15} />Back to queue</Link>
  </header>;
}

function Gallery({ images, name }) {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState({});
  const current = images[selected] || images[0];
  const fallback = <div className="flex min-h-[190px] flex-col items-center justify-center rounded-lg border border-dashed border-[#dce3d3] bg-[#f7f8f2] p-[25px] text-center text-[#a2ae92] [&_h3]:mt-[14px] [&_h3]:mb-[5px] [&_h3]:text-[13px] [&_h3]:text-[#738465] [&_p]:m-0 [&_p]:text-[11px] [&_p]:text-[#8b9680]"><ImageIcon size={32} strokeWidth={1.2} /><h3 className="mb-[10px] text-[11px] font-semibold tracking-[.1px] text-[#566b53]">No image available</h3><p>Service photos will appear here when provided by the vendor.</p></div>;
  if (!current) return fallback;
  return <div>
    {failed[current.id] ? fallback : <a className="relative block overflow-hidden rounded-[9px] bg-[#edf0e6] [&_img]:h-[330px] [&_img]:w-full [&_img]:object-cover [&>span]:absolute [&>span]:right-[13px] [&>span]:bottom-[13px] [&>span]:inline-flex [&>span]:items-center [&>span]:gap-2 [&>span]:rounded-md [&>span]:border [&>span]:border-[#ffffff70] [&>span]:bg-[#fffef8eb] [&>span]:px-3 [&>span]:py-2 [&>span]:text-[10px] [&>span]:text-[#365740] [@media(width<=600px)]:[&_img]:h-[230px]" href={current.url} target="_blank" rel="noreferrer">
      <img src={current.url} alt={`${name} — photo ${selected + 1}`} loading="lazy" onError={() => setFailed((value) => ({ ...value, [current.id]: true }))} />
      <span>View full image<ArrowUpRight size={14} /></span>
    </a>}
    <div className="flex justify-between gap-[10px] pt-3 text-[10px] text-[#85927d]"><span>{selected + 1} of {images.length} photos</span><span>Vendor gallery</span></div>
    {images.length > 1 && <div className="-mx-1 mt-3 -mb-1 flex gap-[10px] overflow-x-auto p-1 [&_button]:shrink-0 [&_button]:cursor-pointer [&_button]:overflow-hidden [&_button]:rounded-[7px] [&_button]:border-2 [&_button]:border-transparent [&_button]:bg-[#f6f7f0] [&_button]:p-[2px] [&_button[aria-pressed=true]]:border-[#5e7c58] [&_img]:h-[57px] [&_img]:w-[76px] [&_img]:rounded-[3px] [&_img]:object-cover" aria-label="Service photos">
      {images.map((img, i) => <button type="button" key={img.id} aria-label={`View photo ${i + 1}`} aria-pressed={i === selected} onClick={() => setSelected(i)}>
        <img src={img.url} alt="" loading="lazy" />
      </button>)}
    </div>}
  </div>;
}

function parseDetails(value) {
  try { return JSON.parse(value || "{}"); } catch { return { details: value }; }
}

export default function ServiceReviewDetails({ data, service, busy, startReview, setDialog, actionError }) {
  const [activeSection, setActiveSection] = useState("status");
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) setActiveSection(visible.target.id.replace("service-review-", ""));
    }, { rootMargin: "-15% 0px -60% 0px" });
    reviewSections.forEach(([id]) => {
      const section = window.document.getElementById(`service-review-${id}`);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);
  const document = data.document || {};
  const images = data.images || [];
  const items = data.items || [];
  const packages = data.packages || [];
  const documents = data.documents || [];
  const canDecide = ["Pending", "UnderReview"].includes(data.ApprovalStatus);
  const approved = data.ApprovalStatus === "Approved";
  const review = reviewState(data);
  const location = [document.location?.city, document.location?.state].filter(Boolean).join(", ");
  const decide = (action) => setDialog({ service, action });

  return <>
    <section className="overflow-hidden rounded-[14px] border border-[#e2e5da] bg-[linear-gradient(112deg,#f8f8f1,#fcfcf8_64%,#f0f3e9)] shadow-[0_4px_16px_#33482c04]">
      <div className="flex items-center gap-[23px] p-[30px] [@media(600px<width<=1150px)]:gap-[17px] [@media(600px<width<=1150px)]:p-[25px] [@media(width<=1000px)]:flex-wrap [@media(width<=600px)]:gap-[15px] [@media(width<=600px)]:px-[19px] [@media(width<=600px)]:py-[21px]">
        <span className="grid h-[88px] w-20 shrink-0 place-items-center rounded-[42px_42px_10px_10px] border border-[#e1decc] bg-[#f0eee0] text-[#9f8758] shadow-[inset_0_0_0_6px_#f8f7ee] [@media(600px<width<=1150px)]:h-[75px] [@media(600px<width<=1150px)]:w-16 [@media(width<=600px)]:h-[65px] [@media(width<=600px)]:w-[51px] [@media(width<=600px)]:[&_svg]:w-7" aria-hidden="true"><Building2 size={36} strokeWidth={1.1} /></span>
        <div className="min-w-0 flex-1 [&_h2]:my-0 [&_h2]:mt-[10px] [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-[clamp(26px,2.4vw,36px)] [&_h2]:leading-[1.25] [&_h2]:font-normal [&_h2]:tracking-[-.7px] [&_h2]:[overflow-wrap:anywhere] [@media(width<=600px)]:[&_h2]:text-[25px]">
          <div className="flex flex-wrap items-center gap-3 [&>span:first-child]:text-[9px] [&>span:first-child]:font-semibold [&>span:first-child]:tracking-[1.6px] [&>span:first-child]:text-[#8c886e] [@media(width<=600px)]:gap-[7px] [@media(width<=600px)]:[&>span:first-child]:text-[8px] [@media(width<=600px)]:[&>span:first-child]:tracking-[1px]"><span>SERVICE LISTING</span><Status status={data.ApprovalStatus} /></div>
          <h2>{data.ServiceName}</h2>
          <div className="flex flex-wrap items-center gap-x-[19px] gap-y-[10px] text-[12px] text-[#798374] [&>span]:inline-flex [&>span]:items-center [&>span]:gap-[7px] [@media(width<=600px)]:gap-2 [@media(width<=600px)]:text-[10px] [@media(width<=600px)]:[&_svg]:w-3">
            <span><Store size={14} />{data.BusinessName}</span>
            <span><Tag size={14} />{data.CategoryName || "Uncategorized"}</span>
            {location && <span><MapPin size={14} />{location}</span>}
          </div>
        </div>
        <div className="flex min-w-[170px] flex-col gap-[5px] border-l border-[#dde2d4] pl-[30px] [&>span]:text-[9px] [&>span]:tracking-[1.7px] [&>span]:text-[#89917f] [&>strong]:text-[30px] [&>strong]:font-medium [&>strong]:tracking-[-1px] [&>strong]:text-[#204d40] [&>strong]:[overflow-wrap:anywhere] [&>small]:text-[10px] [&>small]:text-[#7c8777] [@media(1000px<width<=1150px)]:min-w-[125px] [@media(1000px<width<=1150px)]:pl-5 [@media(width<=1150px)]:[&>strong]:text-[25px] [@media(width<=1000px)]:basis-full [@media(width<=1000px)]:border-t [@media(width<=1000px)]:border-l-0 [@media(width<=1000px)]:pt-[18px] [@media(width<=1000px)]:pl-0"><span>BASE PRICE</span><strong>{money(data.BasePrice)}</strong><small>As listed by the vendor</small></div>
      </div>
      <div className="flex flex-wrap items-center gap-x-[26px] gap-y-[14px] border-t border-[#e4e7db] bg-[#ffffff75] px-[30px] py-[14px] text-[10px] text-[#7c877b] [&>span]:inline-flex [&>span]:items-center [&>span]:gap-[7px] [&_strong]:font-medium [&_strong]:text-[#53674f] [@media(width<=600px)]:flex-col [@media(width<=600px)]:items-start [@media(width<=600px)]:gap-[10px] [@media(width<=600px)]:px-[19px] [@media(width<=600px)]:py-[13px]">
        <span><CalendarDays size={14} />Submitted <strong>{data.SubmittedAt ? date(data.SubmittedAt) : "Not yet submitted"}</strong></span>
        <span><Clock3 size={14} />Updated <strong>{date(data.UpdatedAt)}</strong></span>
        <span className={`ml-auto [@media(width<=600px)]:ml-0 ${data.IsActive ? "text-[#5f8254]" : ""}`}><span className="inline-block size-[6px] shrink-0 rounded-full bg-current" />Listing {data.IsActive ? "active" : "inactive"}</span>
      </div>
    </section>

    <nav className="flex gap-[25px] overflow-x-auto border-b border-[#dfe5dc] px-[3px] [&_a]:flex [&_a]:min-h-[43px] [&_a]:shrink-0 [&_a]:items-center [&_a]:gap-2 [&_a]:border-b-2 [&_a]:border-transparent [&_a]:pb-[13px] [&_a]:text-[11px] [&_a]:text-[#758473] [&_a]:transition-colors [&_a]:duration-180 [&_a[aria-current=location]]:border-[#55765b] [&_a[aria-current=location]]:text-[#204d40] [&_a:hover]:border-[#a6b497] [&_a:hover]:text-[#204d40] [&_a:focus-visible]:border-[#a6b497] [&_a:focus-visible]:text-[#204d40] [&_a>span]:text-[9px] [&_a>span]:text-[#a0a78e] [@media(width<=1000px)]:gap-5" aria-label="Service review sections">
      {reviewSections.map(([id, title], i) => <a key={id} href={`#service-review-${id}`} aria-current={activeSection === id ? "location" : undefined} onClick={() => setActiveSection(id)}><span>0{i + 1}</span>{title}</a>)}
    </nav>

    <ServiceReviewStatus data={data} />

    <div className="grid grid-cols-[minmax(0,1fr)_310px] items-start gap-6 [@media(width>=1600px)]:grid-cols-[minmax(0,1fr)_350px] [@media(width>=1600px)]:gap-7 [@media(1000px<width<=1150px)]:grid-cols-[minmax(0,1fr)_275px] [@media(width<=1150px)]:gap-[18px] [@media(width<=1000px)]:grid-cols-[minmax(0,1fr)]">
      <div className="grid min-w-0 gap-[22px]">
        <Section id="service-review-overview" icon={Info} title="Service information" subtitle="The details behind the listing.">
          {document.shortDescription && <p className="mt-0! mb-[22px]! border-l-2 border-[#b7ba93] bg-[#f7f8f3] px-[18px] py-[15px] text-[13px]! leading-[1.8] whitespace-pre-wrap text-[#52634c]! [overflow-wrap:anywhere]">{document.shortDescription}</p>}
          <div className="[&_p]:m-0 [&_p]:text-[13px] [&_p]:leading-[1.9] [&_p]:whitespace-pre-wrap [&_p]:text-[#7a8575] [&_p]:[overflow-wrap:anywhere]"><h3 className="mb-[10px] text-[11px] font-semibold tracking-[.1px] text-[#566b53]">About this service</h3><p>{data.Description || "The vendor has not provided a description."}</p></div>
          <div className="mt-6 border-t border-[#edf0e8] pt-[21px] [&>dl]:grid [&>dl]:grid-cols-2 [&>dl]:gap-3 [&>dl]:border-0 [&>dl>div]:flex [&>dl>div]:flex-col [&>dl>div]:gap-[6px] [&>dl>div]:rounded-[7px] [&>dl>div]:border [&>dl>div]:border-[#edf0e8] [&>dl>div]:bg-[#fdfefa] [&>dl>div]:px-[15px] [&>dl>div]:py-[13px] [&>dl>div>dd]:text-[13px] [&>dl>div>dd]:font-medium [&>dl>div>dd]:text-[#435c43] [@media(1000px<width<=1150px)]:[&>dl]:grid-cols-1 [@media(width<=600px)]:[&>dl]:grid-cols-1"><h3 className="mb-[10px] text-[11px] font-semibold tracking-[.1px] text-[#566b53]">Features & specifications</h3><Fields value={data.attributes} /></div>
        </Section>

        <Section id="service-review-pricing" icon={Wallet} title="Pricing & packages" subtitle="Review the price and everything included.">
          <div className="mb-[14px] flex items-center justify-between gap-[15px] rounded-lg bg-[#f1f5ec] px-[21px] py-[18px] text-[#7e9471] [&>div]:grid [&>div]:gap-[5px] [&_span]:text-[10px] [&_span]:text-[#7f8f74] [&_strong]:text-2xl [&_strong]:font-medium [&_strong]:tracking-[-.7px] [&_strong]:text-[#31573e] [&_strong]:[overflow-wrap:anywhere]"><div><span>Listed base price</span><strong>{money(data.BasePrice)}</strong></div><Wallet size={27} strokeWidth={1.2} /></div>
          <Fields value={{ ...document.pricing, calculatedPrice: data.BasePrice }} />
          <div className="mt-[22px] mb-[13px] flex items-center gap-2 border-t border-[#edf0e8] pt-[23px] text-[#8b9b80] [&_h3]:m-0 [&>span]:ml-auto"><Package size={16} /><h3 className="mb-[10px] text-[11px] font-semibold tracking-[.1px] text-[#566b53]">Service items</h3><span className="inline-grid h-[21px] min-w-[21px] place-items-center rounded-[5px] bg-[#f1f4ec] px-[6px] text-[10px] font-medium text-[#829077]">{items.length}</span></div>
          {items.length ? <div className="grid gap-[10px] [&_article]:flex [&_article]:items-center [&_article]:gap-3 [&_article]:rounded-lg [&_article]:border [&_article]:border-[#e8ecdf] [&_article]:p-[14px] [&_article>div]:min-w-0 [&_article>div]:flex-1 [&_h4]:text-[13px] [&_h4]:font-medium [&_h4]:text-[#526d45] [&_h4]:[overflow-wrap:anywhere] [&_p]:my-1 [&_p]:text-[11px] [&_p]:text-[#76866b] [&_p]:[overflow-wrap:anywhere] [&_small]:text-[10px] [&_small]:text-[#89967d] [&_strong]:max-w-[35%] [&_strong]:text-[13px] [&_strong]:font-medium [&_strong]:text-[#526d45] [&_strong]:[overflow-wrap:anywhere]">{items.map((item) => <article key={item.ServiceItemId}>
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#f2f5eb] text-[#8c9b77]"><Package size={16} strokeWidth={1.5} /></span>
            <div><h4>{item.ItemName}</h4>{item.Description && <p>{item.Description}</p>}<small>{item.Quantity} {item.Unit}{item.IsIncluded ? " · Included" : " · Additional item"}{!item.IsActive && " · Inactive"}</small></div>
            <strong>{money(item.UnitPrice)}</strong>
          </article>)}</div> : <p className="m-0! rounded-md bg-[#f8f9f5] px-[15px] py-[13px] text-[12px]! leading-[1.8] text-[#8d9687]!">No service items provided.</p>}
          <div id="service-review-packages" className="scroll-mt-[110px] mt-[22px] mb-[13px] flex items-center gap-2 border-t border-[#edf0e8] pt-[23px] text-[#8b9b80] [&_h3]:m-0 [&>span]:ml-auto"><Layers3 size={16} /><h3 className="mb-[10px] text-[11px] font-semibold tracking-[.1px] text-[#566b53]">Packages</h3><span className="inline-grid h-[21px] min-w-[21px] place-items-center rounded-[5px] bg-[#f1f4ec] px-[6px] text-[10px] font-medium text-[#829077]">{packages.length}</span></div>
          {packages.length ? <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-3 [&>article]:min-w-0 [&>article]:rounded-lg [&>article]:border [&>article]:border-[#e2e8d9] [&>article]:p-[19px] [&_header]:flex [&_header]:items-baseline [&_header]:justify-between [&_header]:gap-[10px] [&_h4]:text-[13px] [&_h4]:font-medium [&_h4]:text-[#526d45] [&_h4]:[overflow-wrap:anywhere] [&_p]:my-[11px] [&_p]:text-[11px] [&_p]:leading-[1.8] [&_p]:text-[#76866b] [&_p]:[overflow-wrap:anywhere] [&>article>strong]:mt-[14px] [&>article>strong]:block [&>article>strong]:text-2xl [&>article>strong]:font-medium [&>article>strong]:text-[#44603a] [&>article>strong]:[overflow-wrap:anywhere] [&>article>small]:text-[10px] [&>article>small]:text-[#8b977d] [&_dl>div]:grid-cols-1 [&_dl>div]:gap-[5px]">{packages.map((p) => <article key={p.PackageId}>
            <header><h4>{p.PackageName}</h4><Package size={15} className="shrink-0 text-[#9ba88c]" /></header>
            {p.Description && <p>{p.Description}</p>}
            <strong>{money(p.FinalPrice ?? p.Price)}</strong>
            {Number(p.DiscountPercentage) > 0 && <small><del>{money(p.Price)}</del> · {p.DiscountPercentage}% off</small>}
            <p>Guests: {p.MinimumGuests ?? "No minimum"} – {p.MaximumGuests ?? "No maximum"}</p>
            <PackageReviewStatus data={data} item={p} />
            <details className="mt-[18px] border-t border-[#edf0e8] pt-[14px] [&_summary]:flex [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:items-center [&_summary]:justify-between [&_summary]:gap-[9px] [&_summary]:text-[11px] [&_summary]:text-[#768c67] [&_summary::-webkit-details-marker]:hidden [&[open]>summary]:mb-[14px] [&[open]>summary>svg]:rotate-90"><summary>Package details<ChevronRight size={15} /></summary><Fields value={{ durationMinutes: p.DurationMinutes, ...parseDetails(p.DetailsJson), items: p.items }} /></details>
          </article>)}</div> : <p className="m-0! rounded-md bg-[#f8f9f5] px-[15px] py-[13px] text-[12px]! leading-[1.8] text-[#8d9687]!">No packages provided.</p>}
          <div className="mt-[22px] mb-[13px] flex items-center gap-2 border-t border-[#edf0e8] pt-[23px] text-[#8b9b80] [&_h3]:m-0 [&>span]:ml-auto"><Tag size={16} /><h3 className="mb-[10px] text-[11px] font-semibold tracking-[.1px] text-[#566b53]">Product & service options</h3></div>
          <Fields value={document.offer} />
        </Section>

        <Section id="service-review-gallery" icon={ImageIcon} title="Service gallery" subtitle="A visual look at the vendor’s offering." count={images.length}>
          <Gallery images={images} name={data.ServiceName} />
        </Section>

        <Section id="service-review-location" icon={MapPin} title="Location & availability" subtitle="Where, when, and how the service is offered.">
          <h3 className="mb-[10px] text-[11px] font-semibold tracking-[.1px] text-[#566b53]">Service location</h3><Fields value={document.location} />
          <div className="mt-[22px] mb-[13px] flex items-center gap-2 border-t border-[#edf0e8] pt-[23px] text-[#8b9b80] [&_h3]:m-0 [&>span]:ml-auto"><CalendarDays size={16} /><h3 className="mb-[10px] text-[11px] font-semibold tracking-[.1px] text-[#566b53]">Availability</h3></div>
          <Fields value={{ schedule: document.availability, dates: data.availability }} />
          <div className="mt-[22px] mb-[13px] flex items-center gap-2 border-t border-[#edf0e8] pt-[23px] text-[#8b9b80] [&_h3]:m-0 [&>span]:ml-auto"><ShieldCheck size={16} /><h3 className="mb-[10px] text-[11px] font-semibold tracking-[.1px] text-[#566b53]">Policies</h3></div>
          <Fields value={document.policies} />
        </Section>

        <Section id="service-review-history" icon={History} title="Approval history" subtitle="Every decision, in one place.">
          <div className="[&_ol]:m-0 [&_ol]:list-none [&_ol]:pr-0 [&_ol]:pl-[9px] [&_ol>li]:relative [&_ol>li]:border-l [&_ol>li]:border-[#dce5d5] [&_ol>li]:pt-0 [&_ol>li]:pr-0 [&_ol>li]:pb-[23px] [&_ol>li]:pl-[23px] [&_ol>li]:before:absolute [&_ol>li]:before:top-[6px] [&_ol>li]:before:-left-[5px] [&_ol>li]:before:size-[9px] [&_ol>li]:before:rounded-full [&_ol>li]:before:border-2 [&_ol>li]:before:border-white [&_ol>li]:before:bg-[#b0bc9c] [&_ol>li]:before:shadow-[0_0_0_1px_#dce5d5] [&_ol>li]:before:content-[''] [&_ol>li:first-child]:before:bg-[#4e7853] [&_ol>li:last-child]:pb-1 [&_strong]:text-[12px] [&_strong]:font-medium [&_strong]:text-[#5c7451] [&_p]:text-[11px] [&_p]:leading-[1.8] [&_p]:text-[#8b9680] [&_p]:[overflow-wrap:anywhere]"><ApprovalTimeline rows={data.history || []} /></div>
          <details className="mt-[18px] border-t border-[#edf0e8] pt-[14px] [&_summary]:flex [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:items-center [&_summary]:justify-between [&_summary]:gap-[9px] [&_summary]:text-[11px] [&_summary]:text-[#768c67] [&_summary::-webkit-details-marker]:hidden [&[open]>summary]:mb-[14px] [&[open]>summary>svg]:rotate-90"><summary>View approval details<ChevronRight size={15} /></summary>
            <Fields value={{ submittedAt: data.SubmittedAt ? date(data.SubmittedAt) : null, approvalCycle: data.ApprovalCycle, approvedAt: data.ApprovedAt ? date(data.ApprovedAt) : null, approvedBy: data.ApprovedBy, rejectedAt: data.RejectedAt ? date(data.RejectedAt) : null, rejectedBy: data.RejectedBy, rejectionReason: data.RejectionReason, adminNote: data.AdminNote }} />
          </details>
        </Section>
      </div>

      <aside className="sticky top-[104px] grid min-w-0 gap-[22px] [@media(width<=1000px)]:static [@media(width<=1000px)]:row-start-1 [@media(600px<width<=1000px)]:grid-cols-2 [@media(width<=1000px)]:items-start [@media(width<=1000px)]:gap-[18px] [@media(width<=600px)]:grid-cols-[minmax(0,1fr)]" aria-label="Service review controls">
        <section id="service-review-controls" className="min-w-0 scroll-mt-[110px] rounded-xl border border-[#e8eae3] bg-white shadow-[0_4px_15px_#2f462a03] overflow-hidden">
          <div className="flex items-center gap-[9px] bg-[#244e40] px-[21px] py-[17px] text-[#eef1e3] [&>span]:text-[9px] [&>span]:font-medium [&>span]:tracking-[1.5px]"><ShieldCheck size={19} /><span>REVIEW WORKSPACE</span><span className="ml-auto size-[5px] rounded-full bg-[#c5bc8b]" /></div>
          <div className="px-[21px] pt-[23px] pb-[17px] [&_h2]:mt-0 [&_h2]:mb-2 [&_h2]:text-[18px] [&_h2]:font-medium [&_h2]:tracking-[-.5px] [&>p]:mt-0 [&>p]:mb-[22px] [&>p]:text-[11px] [&>p]:leading-[1.8] [&>p]:text-[#86917d]">
            <h2>{approved ? "Service approved" : data.ApprovalStatus === "UnderReview" ? "Service under review" : data.ApprovalStatus === "Rejected" ? "Service rejected" : canDecide ? "Review this service" : `Service ${statusLabel(data.ApprovalStatus).toLowerCase()}`}</h2>
            <p>{approved ? "Manage this service’s availability on the marketplace." : canDecide ? "Review the listing details before approving it for the marketplace." : "Review the service details and its approval history below."}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0e8] py-3 text-[10px] text-[#85917b]"><span>Service approval</span><Status status={data.ApprovalStatus} /></div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0e8] py-3 text-[10px] text-[#85917b]"><span>Service activity</span><span className={`inline-flex items-center gap-[6px] text-[10px] ${data.IsActive ? "text-[#5f8254]" : "text-[#89917e]"}`}><span className="inline-block size-[6px] shrink-0 rounded-full bg-current" />{data.IsActive ? "Active" : "Inactive"}</span></div>
            <ApprovalBlockers data={data} />
            <div className="my-[18px] grid gap-[9px]">
              {data.ApprovalStatus === "Pending" && <button type="button" className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-[9px] rounded-lg border px-4 py-[11px] text-[12px] leading-[1.5] font-medium no-underline transition-[background,box-shadow,border-color] duration-180 hover:shadow-[0_3px_8px_#203e3510] disabled:cursor-not-allowed disabled:opacity-55 border-[#dce3da] bg-white text-[#45614f] hover:border-[#b6c5b6] hover:bg-[#f2f5ef]" disabled={busy} onClick={startReview}><Clock3 size={16} />{busy ? "Starting review…" : "Start admin review"}</button>}
              {canDecide && <>
                <button type="button" className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-[9px] rounded-lg border px-4 py-[11px] text-[12px] leading-[1.5] font-medium no-underline transition-[background,box-shadow,border-color] duration-180 hover:shadow-[0_3px_8px_#203e3510] disabled:cursor-not-allowed disabled:opacity-55 border-[#204d40] bg-[#204d40] text-white hover:border-[#173e31] hover:bg-[#173e31] hover:text-white!" disabled={busy || !review.canApprove} aria-describedby={!review.canApprove ? "service-review-blockers" : undefined} onClick={() => decide("approve")}><Check size={17} />Approve service</button>
                <button type="button" className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-[9px] rounded-lg border px-4 py-[11px] text-[12px] leading-[1.5] font-medium no-underline transition-[background,box-shadow,border-color] duration-180 hover:shadow-[0_3px_8px_#203e3510] disabled:cursor-not-allowed disabled:opacity-55 border-[#eddfd5] bg-[#fffcf9] text-[#aa6e60] hover:border-[#dec2b3] hover:bg-[#fcf1e9] hover:text-[#98503e]" disabled={busy} onClick={() => decide("reject")}><X size={16} />Reject service</button>
              </>}
              {approved && <>
                <button type="button" className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-[9px] rounded-lg border px-4 py-[11px] text-[12px] leading-[1.5] font-medium no-underline transition-[background,box-shadow,border-color] duration-180 hover:shadow-[0_3px_8px_#203e3510] disabled:cursor-not-allowed disabled:opacity-55 border-[#204d40] bg-[#204d40] text-white hover:border-[#173e31] hover:bg-[#173e31] hover:text-white!" disabled={busy || (!data.IsActive && !review.canApprove)} aria-describedby={!data.IsActive && !review.canApprove ? "service-review-blockers" : undefined} onClick={() => decide(data.IsActive ? "deactivate" : "activate")}><Power size={16} />{data.IsActive ? "Deactivate" : "Activate"} service</button>
                <button type="button" className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-[9px] rounded-lg border px-4 py-[11px] text-[12px] leading-[1.5] font-medium no-underline transition-[background,box-shadow,border-color] duration-180 hover:shadow-[0_3px_8px_#203e3510] disabled:cursor-not-allowed disabled:opacity-55 border-[#eddfd5] bg-[#fffcf9] text-[#aa6e60] hover:border-[#dec2b3] hover:bg-[#fcf1e9] hover:text-[#98503e]" onClick={() => decide("suspend")}><CirclePause size={16} />Suspend service</button>
              </>}
            </div>
            {actionError && <p className="text-[#a34f44]!" role="alert">{actionError}</p>}
            <div className="flex items-start gap-[7px] border-t border-[#edf0e8] pt-[15px] text-[#9aa28d] [&_svg]:mt-[2px] [&_svg]:shrink-0 [&_p]:m-0 [&_p]:text-[10px] [&_p]:leading-[1.7] [&_p]:text-[#9aa28d]"><Info size={14} /><p>Service and vendor approvals are reviewed separately.</p></div>
          </div>
        </section>

        <section id="service-review-vendor" className="min-w-0 scroll-mt-[110px] rounded-xl border border-[#e8eae3] bg-white shadow-[0_4px_15px_#2f462a03] p-[21px] [&_dl>div]:grid-cols-1 [&_dl>div]:gap-1">
          <div className="mb-[23px] flex items-center gap-2 text-[#819474] [&_h2]:text-[12px] [&_h2]:tracking-normal"><Store size={16} /><h2>The service provider</h2></div>
          <Link className="flex items-center gap-[11px] [&>span:nth-child(2)]:min-w-0 [&>span:nth-child(2)]:flex-1 [&_strong]:block [&_strong]:text-[14px] [&_strong]:font-medium [&_strong]:text-[#38543a] [&_strong]:[overflow-wrap:anywhere] [&_small]:mt-1 [&_small]:flex [&_small]:items-center [&_small]:gap-[5px] [&_small]:text-[10px] [&_small]:text-[#93a086] [&>svg]:shrink-0 [&>svg]:text-[#a2ae95]" to={`/admin/vendors/${data.VendorId}`}>
            <span className="grid h-11 w-[42px] shrink-0 place-items-center rounded-lg border border-[#e4dfcf] bg-[#f4efe2] font-serif text-[23px] text-[#9c8458]">{data.BusinessName?.trim().charAt(0).toUpperCase() || "V"}</span>
            <span><strong>{data.BusinessName || "Vendor"}</strong><small>View vendor profile<ArrowUpRight size={12} /></small></span>
            <ChevronRight size={16} />
          </Link>
          <div className="my-[17px] flex flex-wrap items-center gap-[10px]">
            <Status status={review.vendorStatus} entity="vendor" />
            <span className="text-[11px] text-[#7a8870]">{data.VendorActive ? "Active vendor" : "Inactive vendor"}</span>
          </div>
          {["Rejected", "Suspended"].includes(review.vendorStatus) && <div className="rounded-lg border border-rose-100 bg-rose-50 p-3"><span className="text-[10px] font-semibold text-rose-600">VENDOR DECISION REASON</span><p className="mt-[5px]! mb-0! text-[11px]! leading-[1.8] whitespace-pre-wrap text-rose-700! [overflow-wrap:anywhere]">{review.vendorReason || "No reason was recorded."}</p></div>}
          <details className="mt-[18px] border-t border-[#edf0e8] pt-[14px] [&_summary]:flex [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:items-center [&_summary]:justify-between [&_summary]:gap-[9px] [&_summary]:text-[11px] [&_summary]:text-[#768c67] [&_summary::-webkit-details-marker]:hidden [&[open]>summary]:mb-[14px] [&[open]>summary>svg]:rotate-90"><summary>Vendor information<ChevronRight size={15} /></summary><Fields value={data.vendor} /></details>
          <div id="service-review-documents" className="mt-[18px] mb-[13px] flex scroll-mt-[110px] items-center gap-[7px] border-t border-[#edf0e8] pt-5 text-[#8b9b7d]">
            <FileCheck2 size={15} /><h3 className="m-0 text-[11px] font-semibold text-[#566b53]">Verification documents</h3><span className="ml-auto text-[11px] text-[#859377]">{documents.length}</span>
          </div>
          {documents.length ? <ul className="m-0 list-none divide-y divide-[#edf0e8] p-0">{documents.map((doc) => <li key={doc.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><Link to={`/admin/vendors/${data.VendorId}`} className="inline-flex items-center gap-[5px] text-[11px] text-[#69825b]">{doc.DocumentType}<ArrowUpRight size={12} /></Link><Status status={doc.VerificationStatus} entity="document" /></div>
            {doc.VerificationStatus === "Rejected" && <p className="mt-2! mb-0! rounded-md bg-rose-50 px-[10px] py-2 text-[11px]! leading-[1.7] whitespace-pre-wrap text-rose-700! [overflow-wrap:anywhere]">{doc.RejectionReason || "No document rejection reason was recorded."}</p>}
          </li>)}</ul> : <p className="m-0! rounded-md bg-[#f8f9f5] px-[15px] py-[13px] text-[12px]! leading-[1.8] text-[#8d9687]!">No verification documents provided.</p>}
        </section>
        <div className="flex items-center justify-center gap-[10px] px-2 py-[2px] text-[9px] leading-[1.9] text-[#a0aa94] [&_strong]:font-normal [&_strong]:text-[#adb49f] [@media(width<=1000px)]:hidden"><ShieldCheck size={16} /><span>Thoughtfully curated.<br /><strong>Every celebration deserves the best.</strong></span></div>
      </aside>
    </div>
  </>;
}
