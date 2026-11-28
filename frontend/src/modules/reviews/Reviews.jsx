import { useEffect, useRef, useState, useId } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Star,
  ShieldCheck,
  MessageSquare,
  Flag,
  Plus,
  X,
  ImagePlus,
  Search,
  ChevronDown,
  ArrowRight,
  LoaderCircle,
  SlidersHorizontal,
  RotateCw,
} from "lucide-react";
import AdminReviewOverview from "./AdminReviewOverview";
import VendorReviewOverview from "./VendorReviewOverview";
import { useAuth } from "../../context/AuthContext";
import { useCommunicationSocket } from "../communication/useCommunicationSocket";
import { reviewRequest, reviewSave, imageUrl, useReviews } from "./api";

const ratingLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
const reportReasons = [
  "Spam",
  "Fake review",
  "Abusive language",
  "Irrelevant content",
  "Personal information",
  "Harassment",
  "Conflict of interest",
  "Other",
];
const date = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "");
export function Stars({ value, onChange, label = "Overall rating" }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className={onChange ? "grid gap-2" : undefined}>
      <div
        className="rr-stars [&&]:flex [&&]:gap-1.5 [&&]:items-center [&&]:text-[#b78d3c]"
        role={onChange ? "radiogroup" : "img"}
        aria-label={`${label}: ${value || 0} out of 5`}
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((n) =>
          onChange ? (
            <button
              className="rr-star [&&]:size-11 [&&]:rounded-xl [&&]:border [&&]:border-[#e8dfcc] [&&]:p-2 [&&]:text-[#b78d3c] [&&]:bg-white [&&]:transition [&&:hover]:-translate-y-0.5 [&&:hover]:border-[#b78d3c] [&&:hover]:bg-[#fff8e9] [&&[aria-checked=true]]:border-[#b78d3c] [&&[aria-checked=true]]:bg-[#fff3d6] [&&_svg]:size-6"
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} ${n === 1 ? "star" : "stars"}: ${ratingLabels[n - 1]}`}
              key={n}
              tabIndex={value === n || (!value && n === 1) ? 0 : -1}
              onMouseEnter={() => setHovered(n)}
              onClick={() => onChange(n)}
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const step = ["ArrowLeft", "ArrowDown"].includes(e.key) ? -1 : 1;
                  const next = e.key === "Home" ? 1 : e.key === "End" ? 5
                    : Math.max(1, Math.min(5, (value || 1) + step));
                  setHovered(0);
                  onChange(next);
                  e.currentTarget.parentElement.children[next - 1].focus();
                }
              }}
            >
              <Star aria-hidden="true" strokeWidth={1.7} fill={n <= (hovered || value) ? "currentColor" : "none"} />
            </button>
          ) : (
            <Star
              size={16}
              key={n}
              fill={n <= Math.round(value) ? "currentColor" : "none"}
            />
          ),
        )}
      </div>
      {onChange && (
        <span aria-live="polite" className="rr-muted [&&]:text-[#74816f] [&&]:text-xs">
          {value ? ratingLabels[value - 1] : "Choose a star rating"}
        </span>
      )}
    </div>
  );
}
function Dialog({ title, close, children, description, footer, reviewForm = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="rr-dialog rr-module [&&]:fixed [&&]:inset-0 [&&]:m-auto [&&]:flex [&&]:max-h-[min(92dvh,960px)] [&&]:w-[calc(100%_-_2rem)] [&&]:max-w-[680px] [&&]:min-w-0 [&&]:flex-col [&&]:overflow-hidden [&&]:rounded-3xl [&&]:border [&&]:border-[#e3e8df] [&&]:bg-white [&&]:p-0 [&&]:text-sm [&&]:leading-relaxed [&&]:text-[#344936] [&&]:shadow-[0_24px_100px_#14251840] [&&]:[font-family:inherit] [&&::backdrop]:bg-[#14251899] [&&::backdrop]:backdrop-blur-sm [&_*]:box-border [&_button]:cursor-pointer [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-2 [&_button]:rounded-xl [&_button]:border [&_button]:border-[#dce4d7] [&_button]:bg-white [&_button]:px-4 [&_button]:py-2.5 [&_button]:text-[13px] [&_button]:text-[#36533d] [&_button]:transition-colors [&_button:hover]:bg-[#f2f6ee] [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-55 [&_label]:grid [&_label]:min-w-0 [&_label]:gap-2 [&_label]:text-[13px] [&_label]:font-medium [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-xl [&_input]:border [&_input]:border-[#dce4d7] [&_input]:bg-white [&_input]:px-3.5 [&_input]:py-3 [&_input]:text-[#344936] [&_input]:[font:inherit] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:resize-y [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-[#dce4d7] [&_textarea]:bg-white [&_textarea]:px-3.5 [&_textarea]:py-3 [&_textarea]:text-[#344936] [&_textarea]:[font:inherit] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-xl [&_select]:border [&_select]:border-[#dce4d7] [&_select]:bg-white [&_select]:px-3.5 [&_select]:py-3 [&_select]:text-[#344936] [&_select]:[font:inherit] [&_input::placeholder]:text-[#929b8e] [&_textarea::placeholder]:text-[#929b8e] [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#648d66] [&_:focus-visible]:outline-offset-2"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header className="flex shrink-0 items-start gap-4 border-b border-[#e8ece4] bg-[#f8faf6] px-5 py-5 sm:px-7 sm:py-6">
        {reviewForm && (
          <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl border border-[#e5dbc3] bg-[#faf3e4] text-[#ac863e] sm:flex">
            <Star size={23} strokeWidth={1.5} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {reviewForm && <p className="mb-1.5 text-[10px] font-semibold tracking-[0.18em] text-[#829176]">A MOMENT TO REFLECT</p>}
          <h2 id={titleId} className="text-2xl font-semibold tracking-tight text-[#2d4635] sm:text-[27px]">{title}</h2>
          {description && <p id={descriptionId} className="mt-2 max-w-md text-xs leading-relaxed text-[#75816e]">{description}</p>}
        </div>
        <button className="[&&]:size-9 [&&]:shrink-0 [&&]:rounded-full [&&]:border-transparent [&&]:bg-transparent [&&]:p-0" type="button" aria-label="Close dialog" onClick={close}>
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">{children}</div>
      {footer && <footer className="shrink-0 border-t border-[#e8ece4] bg-[#fcfdfb] px-5 py-4 sm:px-7">{footer}</footer>}
    </dialog>
  );
}

function State({ state }) {
  return state.loading ? (
    <p role="status" className="rr-panel [&&]:bg-[#fff] [&&]:border [&&]:border-[#e2e8dd] [&&]:rounded-[16px] [&&]:p-[24px] [&&]:mb-[20px] [&&]:min-w-0 max-[600.001px]:[&&]:p-[18px] rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
      Loading reviews…
    </p>
  ) : state.error ? (
    <p role="alert" className="rr-error [&&]:bg-[#fff0ed] [&&]:text-[#9d4646] [&&]:py-[12px] [&&]:px-[16px] [&&]:rounded-[8px] [&&]:my-[12px] [&&]:mx-0">
      {state.error}
    </p>
  ) : null;
}
export function RatingSummary({ data }) {
  if (!data) return null;
  return (
    <section className="rr-panel [&&]:bg-[#fff] [&&]:border [&&]:border-[#e2e8dd] [&&]:rounded-[16px] [&&]:p-[24px] [&&]:mb-[20px] [&&]:min-w-0 max-[600.001px]:[&&]:p-[18px]" aria-label="Rating overview">
      <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap [&&&]:gap-[32px]" >
        <div>
          <div className="rr-score [&&]:text-[46px] [&&]:font-semibold [&&]:leading-[1.2] max-[600.001px]:[&&]:text-[38px]">
            {Number(data.averageRating || 0).toFixed(1)}
            <span className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]"> / 5</span>
          </div>
          <Stars value={data.averageRating} />
          <p className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
            {data.totalReviews || 0} reviews · {data.verifiedReviews || 0}{" "}
            verified bookings
          </p>
        </div>
        <div className="rr-distribution [&&]:grid [&&]:gap-[7px] [&&]:min-w-[160px] [&&]:flex-1">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = Number(
              data.distribution?.find((d) => Number(d.rating) === n)?.count ||
                0,
            );
            return (
              <div className="rr-bar [&&]:flex [&&]:gap-[10px] [&&]:items-center [&&]:text-[12px]" key={n}>
                <span>{n}★</span>
                <progress
                  value={count}
                  max={Number(data.totalReviews) || 1}
                  aria-label={`${n} stars: ${count} reviews`}
                />
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
function ReviewImages({ images = [] }) {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <div className="rr-images [&&]:flex [&&]:gap-[10px] [&&]:flex-wrap [&&_img]:h-[88px] [&&_img]:w-[88px] [&&_img]:object-cover [&&_img]:rounded-[8px] [&&_button]:p-0 [&&_button]:border-0 [&&_button]:block">
        {images.map((img) => (
          <button
            type="button"
            key={img.id}
            onClick={() => setSelected(img)}
            aria-label={`View ${img.name || "review photo"}`}
          >
            <img
              src={imageUrl(img.id)}
              alt={img.name || "Customer review photo"}
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {selected && (
        <Dialog title="Customer photo" close={() => setSelected(null)}>
          <img
            className="rr-lightbox [&&]:w-full [&&]:max-h-[70dvh] [&&]:object-contain"
            src={imageUrl(selected.id)}
            alt={selected.name || "Customer review photo"}
          />
          <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap">
            <button
              type="button"
              onClick={() =>
                setSelected(
                  images[
                    (images.indexOf(selected) + images.length - 1) %
                      images.length
                  ],
                )
              }
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setSelected(
                  images[(images.indexOf(selected) + 1) % images.length],
                )
              }
            >
              Next
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
function ReviewCard({ review: r, children, report }) {
  return (
    <article className="rr-panel [&&]:bg-[#fff] [&&]:border [&&]:border-[#e2e8dd] [&&]:rounded-[16px] [&&]:p-[24px] [&&]:mb-[20px] [&&]:min-w-0 max-[600.001px]:[&&]:p-[18px]">
      <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap rr-between [&&]:justify-between">
        <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap">
          <span className="rr-avatar [&&]:w-[42px] [&&]:h-[42px] [&&]:rounded-[50%] [&&]:grid [&&]:[place-items:center] [&&]:bg-[#f1eee4] [&&]:text-[#857350] [&&]:font-semibold [&&]:shrink-0" aria-hidden="true">
            {r.customer?.[0] || "C"}
          </span>
          <div>
            <strong>{r.customer}</strong>
            <div className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
              {date(r.createdAt)} · {r.vendor}
              {r.service ? ` / ${r.service}` : ""}
              {r.package ? ` / ${r.package}` : ""}
            </div>
          </div>
        </div>
        {r.status && (
          <span className="rr-badge [&&]:inline-flex [&&]:gap-[5px] [&&]:items-center [&&]:text-[11px] [&&]:bg-[#edf3e9] [&&]:rounded-[20px] [&&]:py-[4px] [&&]:px-[10px] [&&]:text-[#496442] [&&[data-status='Pending']]:bg-[#fff4dc] [&&[data-status='Pending']]:text-[#98722c] [&&[data-status='Flagged']]:bg-[#fff4dc] [&&[data-status='Flagged']]:text-[#98722c] [&&[data-status='Rejected']]:bg-[#fcebea] [&&[data-status='Rejected']]:text-[#9d4646] [&&[data-status='Hidden']]:bg-[#fcebea] [&&[data-status='Hidden']]:text-[#9d4646]" data-status={r.status}>
            {r.deleted ? "Deleted" : r.status === "Approved" ? "Published" : r.status}
          </span>
        )}
      </div>
      <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap [&&&]:mt-[14px]" >
        <Stars value={r.rating} />
        {r.verified && (
          <span className="rr-badge [&&]:inline-flex [&&]:gap-[5px] [&&]:items-center [&&]:text-[11px] [&&]:bg-[#edf3e9] [&&]:rounded-[20px] [&&]:py-[4px] [&&]:px-[10px] [&&]:text-[#496442] [&&[data-status='Pending']]:bg-[#fff4dc] [&&[data-status='Pending']]:text-[#98722c] [&&[data-status='Flagged']]:bg-[#fff4dc] [&&[data-status='Flagged']]:text-[#98722c] [&&[data-status='Rejected']]:bg-[#fcebea] [&&[data-status='Rejected']]:text-[#9d4646] [&&[data-status='Hidden']]:bg-[#fcebea] [&&[data-status='Hidden']]:text-[#9d4646]">
            <ShieldCheck size={12} />
            Verified booking
          </span>
        )}
      </div>
      <h3>{r.title}</h3>
      <p className="rr-break [&&]:whitespace-pre-wrap [&&]:wrap-anywhere">{r.text}</p>
      <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
        {[
          ["Service quality", r.serviceQualityRating],
          ["Communication", r.communicationRating],
          ["Value for money", r.valueForMoneyRating],
          ["Professionalism", r.professionalismRating],
        ]
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <span key={label}>
              {label}: {value}/5
            </span>
          ))}
      </div>
      <ReviewImages images={r.images} />
      {r.reason && <p className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">Moderation: {r.reason}</p>}
      {r.response && (
        <div className="rr-response [&&]:py-[16px] [&&]:px-[20px] [&&]:border-l-3 [&&]:border-l-[#b4c5a3] [&&]:bg-[#f6f8f2] [&&]:rounded-[0_8px_8px_0] [&&]:my-[16px] [&&]:mx-0">
          <strong>
            <MessageSquare size={14} className="[&&&]:inline" /> Response
            from {r.vendor}
          </strong>
          <p className="rr-break [&&]:whitespace-pre-wrap [&&]:wrap-anywhere">{r.response.text}</p>
          <div className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
            {date(r.response.updatedAt)}
            {r.response.status === "Hidden" ? " · Hidden by moderation" : ""}
          </div>
          {report && (
            <button type="button" onClick={() => report(r, r.response.id)}>
              <Flag size={12} />
              Report response
            </button>
          )}
        </div>
      )}
      <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap rr-between [&&]:justify-between">
        {children}
        {report && (
          <button type="button" onClick={() => report(r)}>
            <Flag size={12} />
            Report review
          </button>
        )}
      </div>
    </article>
  );
}
function VendorReviewsTable({ reviews, actions, report }) {
  return (
    <div className="overflow-hidden rounded-b-2xl bg-white">
      <div className="overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-[#648d66]" tabIndex={0} role="region" aria-label="Customer feedback table. Scroll horizontally to see all columns.">
        <table className="[&&]:w-full [&&]:min-w-[1120px] [&&]:text-xs">
          <caption className="sr-only">Customer feedback, service ratings, vendor responses and booking actions</caption>
          <thead className="bg-[#f2f6ec] text-[10px] tracking-[0.08em] text-[#64765b] uppercase">
            <tr>{["Customer", "Service / experience", "Rating", "Review & response", "Date", "Actions"].map((heading) => <th key={heading} scope="col" className="[&&]:px-5 [&&]:py-4 [&&]:font-semibold">{heading}</th>)}</tr>
          </thead>
          <tbody>
            {reviews.map((r) => {
              const dimensions = [["Service quality", r.serviceQualityRating], ["Communication", r.communicationRating], ["Value for money", r.valueForMoneyRating], ["Professionalism", r.professionalismRating]].filter(([, value]) => value);
              return (
                <tr key={r.id} className="transition-colors even:bg-[#fcfdf9] hover:bg-[#f5f9ee] [&:last-child_td]:border-b-0">
                  <td className="[&&]:px-5 [&&]:py-5 [&&]:align-top">
                    <div className="flex items-start gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#e8e2d1] bg-[#f7f3e9] text-xs font-semibold text-[#9e8451]" aria-hidden="true">{r.customer?.[0] || "C"}</span><div><span className="block text-xs font-semibold">{r.customer || "Customer"}</span>{r.verified && <span className="mt-1 flex items-center gap-1 text-[10px] text-[#688056]"><ShieldCheck size={12} aria-hidden="true" />Verified booking</span>}</div></div>
                  </td>
                  <td className="[&&]:max-w-48 [&&]:px-5 [&&]:py-5 [&&]:align-top [&&]:whitespace-normal"><span className="text-xs font-medium">{r.service || "Overall vendor experience"}</span>{r.package && <span className="mt-1 block text-[11px] text-[#71806a]">{r.package}</span>}</td>
                  <td className="[&&]:px-5 [&&]:py-5 [&&]:align-top"><div className="flex items-center gap-1 text-[#b78d3c]"><Star size={14} fill="currentColor" aria-hidden="true" /><span className="font-semibold tabular-nums text-[#344936]">{r.rating}<span className="font-normal text-[#71806a]"> / 5</span></span></div></td>
                  <td className="[&&]:w-[36%] [&&]:min-w-80 [&&]:px-5 [&&]:py-5 [&&]:align-top [&&]:whitespace-normal">
                    {r.title && <span className="mb-1 block text-xs font-semibold">{r.title}</span>}
                    <p className="[&&]:m-0 [&&]:text-xs [&&]:leading-relaxed [&&]:text-[#62745d] [&&]:whitespace-pre-wrap">{r.text}</p>
                    {(dimensions.length > 0 || r.images?.length > 0) && <details className="mt-3"><summary className="cursor-pointer text-[10px] font-medium text-[#748963]">Photos &amp; detailed ratings</summary><div className="mt-2 grid gap-3">{dimensions.length > 0 && <div className="flex flex-wrap gap-1.5">{dimensions.map(([label, value]) => <span key={label} className="rounded-lg border border-[#e9eddf] bg-[#fafbf6] px-2 py-1 text-[10px] text-[#78866c]">{label}<span className="ml-2 font-semibold text-[#6b8058]">{value}/5</span></span>)}</div>}{r.images?.length > 0 && <ReviewImages images={r.images} />}</div></details>}
                    {r.response && <div className="mt-3 rounded-xl border border-[#e3ead8] bg-[#f7f9f2] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#607c4c]"><MessageSquare size={12} aria-hidden="true" />Your response{r.response.status === "Hidden" && <span className="font-normal text-[#a16e55]">Hidden by moderation</span>}</span><span className="text-[10px] text-[#7c8970]">{date(r.response.updatedAt)}</span></div><p className="[&&]:mt-1.5 [&&]:mb-0 [&&]:text-[11px] [&&]:leading-relaxed [&&]:text-[#62745d] [&&]:whitespace-pre-wrap">{r.response.text}</p><button type="button" className="[&&]:mt-2 [&&]:border-0 [&&]:bg-transparent [&&]:p-0 [&&]:text-[10px] [&&]:text-[#78866c]" onClick={() => report(r, r.response.id)}><Flag size={10} aria-hidden="true" />Report response</button></div>}
                  </td>
                  <td className="[&&]:px-5 [&&]:py-5 [&&]:align-top [&&]:text-[11px] [&&]:text-[#71806a]">{date(r.createdAt)}</td>
                  <td className="[&&]:min-w-56 [&&]:px-5 [&&]:py-5 [&&]:align-top"><div className="grid gap-2 [&_button]:text-[10px] [&_a]:text-[10px]">{actions(r)}<button type="button" className="[&&]:justify-start [&&]:border-transparent [&&]:bg-transparent [&&]:px-1 [&&]:py-1 [&&]:text-[10px] [&&]:text-[#78866c]" onClick={() => report(r)}><Flag size={11} aria-hidden="true" />Report review</button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ReviewTableFilters({ role, filters, choose, metadata, clear }) {
  const [expanded, setExpanded] = useState(false);
  const advancedId = useId();
  const activeCount = Object.values(filters).filter(Boolean).length;
  const selectClass = "[&&&]:min-h-10 [&&&]:rounded-lg [&&&]:bg-white [&&&]:py-2 [&&&]:text-[11px]";
  return (
    <div className="rounded-t-2xl border-b border-[#e2e8dd] bg-white p-4 sm:px-5" role="search" aria-label="Filter customer reviews">
      <div className="flex flex-wrap items-center gap-3">
        <label className="[&&]:relative [&&]:block [&&]:w-full [&&]:min-w-0 sm:[&&]:mr-auto sm:[&&]:w-[260px]">
          <span className="sr-only">Search experiences</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#93a18b]" aria-hidden="true" />
          <input className="[&&&]:min-h-10 [&&&]:rounded-lg [&&&]:bg-white [&&&]:py-2 [&&&]:pl-9 [&&&]:text-[11px]" value={filters.q} maxLength={200} onChange={(e) => choose("q", e.target.value)} placeholder={role === "Vendor" ? "Customer, review or service" : "Search reviews..."} />
        </label>
        <label className="[&&]:block [&&]:w-[120px]">
          <span className="sr-only">Rating</span>
          <select className={selectClass} value={filters.rating} onChange={(e) => choose("rating", e.target.value)}>
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
          </select>
        </label>
        {role === "Admin" && <label className="[&&]:block [&&]:w-[126px]">
          <span className="sr-only">Status</span>
          <select className={selectClass} value={filters.status} onChange={(e) => choose("status", e.target.value)}>
            <option value="">All statuses</option>
            {["Approved", "Flagged", "Hidden", "Rejected"].map((status) => <option key={status} value={status}>{status === "Approved" ? "Published" : status}</option>)}
          </select>
        </label>}
        <label className="[&&]:flex [&&]:items-center [&&]:gap-2 [&&]:text-[10px] [&&]:font-normal [&&]:text-[#819078]">
          From
          <input className="[&&&]:min-h-10 [&&&]:w-[135px] [&&&]:rounded-lg [&&&]:bg-white [&&&]:px-2 [&&&]:py-2 [&&&]:text-[11px]" type="date" value={filters.from} onChange={(e) => choose("from", e.target.value)} />
        </label>
        <label className="[&&]:flex [&&]:items-center [&&]:gap-2 [&&]:text-[10px] [&&]:font-normal [&&]:text-[#819078]">
          To
          <input className="[&&&]:min-h-10 [&&&]:w-[135px] [&&&]:rounded-lg [&&&]:bg-white [&&&]:px-2 [&&&]:py-2 [&&&]:text-[11px]" type="date" value={filters.to} onChange={(e) => choose("to", e.target.value)} />
        </label>
        {role === "Admin" && <button type="button" aria-label="Vendor, service and report filters" aria-expanded={expanded} aria-controls={advancedId} onClick={() => setExpanded((value) => !value)} className="[&&]:min-h-10 [&&]:gap-1.5 [&&]:rounded-lg [&&]:px-3 [&&]:py-2 [&&]:text-[11px]"><SlidersHorizontal size={14} aria-hidden="true" />More filters<ChevronDown size={12} className={expanded ? "rotate-180" : ""} aria-hidden="true" /></button>}
        <button type="button" disabled={!activeCount} onClick={clear} className="[&&]:min-h-10 [&&]:gap-1.5 [&&]:rounded-lg [&&]:px-3 [&&]:py-2 [&&]:text-[11px] [&&:disabled]:cursor-default"><X size={13} aria-hidden="true" />Clear filters{activeCount > 0 && <span className="rounded bg-[#edf3e6] px-1.5 text-[10px] text-[#617e4b]">{activeCount}</span>}</button>
      </div>
        {role === "Admin" && <div id={advancedId} hidden={!expanded} className="mt-4 grid gap-3 border-t border-[#edf0e9] pt-4 sm:grid-cols-2 xl:grid-cols-4 [&[hidden]]:hidden">
          {[["vendorId", "Vendor", "vendors"], ["serviceId", "Service", "services"], ["categoryId", "Category", "categories"]].map(([key, label, collection]) => (
            <label key={key}>{label}<select className={selectClass} value={filters[key]} onChange={(e) => choose(key, e.target.value)}>
              <option value="">All {label.toLowerCase()}s</option>
              {metadata?.[collection]?.filter((option) => collection !== "services" || !filters.vendorId || option.vendorId.toLowerCase() === filters.vendorId.toLowerCase()).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select></label>
          ))}
          <label>Reports<select className={selectClass} value={filters.reported} onChange={(e) => choose("reported", e.target.value)}><option value="">All content</option><option value="true">With pending reports</option></select></label>
        </div>}
    </div>
  );
}
function AdminReviewsTable({ reviews, actions }) {
  return (
    <div className="overflow-hidden rounded-b-2xl bg-white">
      <div className="overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-[#648d66]" tabIndex={0} role="region" aria-label="Customer reviews table. Scroll horizontally to see all columns.">
        <table className="[&&]:w-full [&&]:min-w-[1120px] [&&]:text-xs">
          <caption className="sr-only">Customer reviews, ratings, publication status and management actions</caption>
          <thead className="bg-[#f2f6ec] text-[10px] tracking-[0.08em] text-[#64765b] uppercase">
            <tr>{["Customer", "Vendor / service", "Review", "Rating", "Status", "Date", "Actions"].map((heading) => <th key={heading} scope="col" className="[&&]:px-5 [&&]:py-4 [&&]:font-semibold">{heading}</th>)}</tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="transition-colors even:bg-[#fcfdf9] hover:bg-[#f5f9ee] [&:last-child_td]:border-b-0">
                <td className="[&&]:px-5 [&&]:py-5 [&&]:align-top">
                  <div className="flex items-start gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f1eee4] text-xs font-semibold text-[#8b7751]" aria-hidden="true">{r.customer?.[0] || "C"}</span>
                    <div><span className="block text-xs font-semibold">{r.customer || "Customer"}</span>{r.verified && <span className="mt-1 flex items-center gap-1 text-[10px] text-[#688056]"><ShieldCheck size={12} aria-hidden="true" />Verified booking</span>}</div>
                  </div>
                </td>
                <td className="[&&]:max-w-48 [&&]:px-5 [&&]:py-5 [&&]:align-top [&&]:whitespace-normal">
                  <span className="block text-xs font-medium">{r.vendor}</span>
                  <span className="mt-1 block text-[11px] text-[#71806a]">{[r.service, r.package].filter(Boolean).join(" / ") || "Vendor overall"}</span>
                </td>
                <td className="[&&]:w-[28%] [&&]:min-w-60 [&&]:px-5 [&&]:py-5 [&&]:align-top [&&]:whitespace-normal">
                  {r.title && <span className="mb-1 block text-xs font-semibold">{r.title}</span>}
                  <p className="[&&]:m-0 [&&]:line-clamp-3 [&&]:text-xs [&&]:leading-relaxed [&&]:text-[#6b7a63]" title={r.text}>{r.text}</p>
                  {(r.images?.length > 0 || r.response) && <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#71806a]">
                    {r.images?.length > 0 && <span className="inline-flex items-center gap-1"><ImagePlus size={12} aria-hidden="true" />{r.images.length} {r.images.length === 1 ? "photo" : "photos"}</span>}
                    {r.response && <span className="inline-flex items-center gap-1"><MessageSquare size={12} aria-hidden="true" />Vendor replied</span>}
                  </div>}
                </td>
                <td className="[&&]:px-5 [&&]:py-5 [&&]:align-top"><div className="flex items-center gap-1 text-[#b78d3c]"><Star size={14} fill="currentColor" aria-hidden="true" /><span className="font-semibold tabular-nums text-[#344936]">{r.rating}<span className="font-normal text-[#71806a]"> / 5</span></span></div></td>
                <td className="[&&]:px-5 [&&]:py-5 [&&]:align-top"><span data-status={r.deleted ? "Deleted" : r.status} className="inline-flex rounded-full bg-[#edf3e9] px-2.5 py-1 text-[10px] font-medium text-[#496442] data-[status=Flagged]:bg-[#fff4dc] data-[status=Flagged]:text-[#8a6526] data-[status=Hidden]:bg-[#f5eceb] data-[status=Hidden]:text-[#9d4646] data-[status=Rejected]:bg-[#f5eceb] data-[status=Rejected]:text-[#9d4646] data-[status=Deleted]:bg-[#eff0ed] data-[status=Deleted]:text-[#6d7367]">{r.deleted ? "Deleted" : r.status === "Approved" ? "Published" : r.status}</span></td>
                <td className="[&&]:px-5 [&&]:py-5 [&&]:align-top [&&]:text-[11px] [&&]:text-[#71806a]">{date(r.createdAt)}</td>
                <td className="[&&]:min-w-56 [&&]:px-5 [&&]:py-5 [&&]:align-top"><div className="[&&_button]:px-2 [&&_button]:py-1.5 [&&_button]:text-[10px]">{actions(r)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Pagination({ data, page, setPage }) {
  return data && data.total > data.pageSize ? (
    <nav aria-label="Review pages" className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
        Previous
      </button>
      <span className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
        Page {page} of {Math.ceil(data.total / data.pageSize)}
      </span>
      <button
        disabled={page * data.pageSize >= data.total}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </nav>
  ) : null;
}
function ReportForm({ target, close, done }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog title="Report content" close={close}>
      <p className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
        A moderator will review your report. Reporting does not automatically
        remove content.
      </p>
      <form
        className="rr-stack [&&]:grid [&&]:gap-[16px]"
        onSubmit={async (e) => {
          e.preventDefault();
          const b = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          try {
            await reviewSave(`/reviews/${target.review.id}/report`, "POST", {
              ...b,
              ...(target.responseId ? { responseId: target.responseId } : {}),
            });
            done("Report submitted.");
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Reason
          <select name="reason">
            {reportReasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          Explanation (optional)
          <textarea name="description" rows={4} maxLength={2000} />
        </label>
        {error && (
          <p role="alert" className="rr-error [&&]:bg-[#fff0ed] [&&]:text-[#9d4646] [&&]:py-[12px] [&&]:px-[16px] [&&]:rounded-[8px] [&&]:my-[12px] [&&]:mx-0">
            {error}
          </p>
        )}
        <button className="rr-primary [&&&]:bg-[#36583e] [&&&]:text-[#fff] [&&&]:border-[#36583e] [&&&:hover]:bg-[#294730]" disabled={busy}>
          Submit report
        </button>
      </form>
    </Dialog>
  );
}
export function PublicReviews({ type, id }) {
  const [page, setPage] = useState(1),
    [rating, setRating] = useState(""),
    [target, setTarget] = useState(null),
    [notice, setNotice] = useState(""),
    { user } = useAuth();
  const state = useReviews(
      `/${type}/${id}/reviews?page=${page}&rating=${rating || 0}`,
    ),
    summary = useReviews(`/${type}/${id}/rating-summary`);
  return (
    <section className="rr-module [&&]:text-[#344936] [&&]:[font-family:inherit] [&&]:text-[14px] [&&]:leading-[1.6] [&&]:min-w-0 [&&]:w-full [&_*]:box-border [&_h1]:text-[clamp(25px,_3vw,_34px)] [&_h1]:font-semibold [&_h1]:leading-[1.25] [&_h1]:mt-0 [&_h1]:mx-0 [&_h1]:mb-[10px] [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:mt-0 [&_h2]:mx-0 [&_h2]:mb-[12px] [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:my-[10px] [&_h3]:mx-0 [&_p]:my-[8px] [&_p]:mx-0 [&_p]:wrap-anywhere [&_button]:border [&_button]:border-[#dce4d7] [&_button]:rounded-[8px] [&_button]:py-[9px] [&_button]:px-[15px] [&_button]:bg-[#fff] [&_button]:text-[#36533d] [&_button]:text-[13px] [&_button]:cursor-pointer [&_button]:no-underline [&_button]:inline-flex [&_button]:gap-[7px] [&_button]:items-center [&_button]:justify-center [&_button:hover]:bg-[#f2f6ee] [&_button:disabled]:[cursor:wait] [&_button:disabled]:opacity-55 [&_label]:grid [&_label]:gap-[6px] [&_label]:text-[13px] [&_label]:font-medium [&_label]:min-w-0 [&_input]:w-full [&_input]:min-w-0 [&_input]:border [&_input]:border-[#dce4d7] [&_input]:rounded-[8px] [&_input]:py-[10px] [&_input]:px-[12px] [&_input]:[font:inherit] [&_input]:bg-[#fff] [&_input]:text-[#344936] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:border [&_textarea]:border-[#dce4d7] [&_textarea]:rounded-[8px] [&_textarea]:py-[10px] [&_textarea]:px-[12px] [&_textarea]:[font:inherit] [&_textarea]:bg-[#fff] [&_textarea]:text-[#344936] [&_textarea]:[resize:vertical] [&_select]:w-full [&_select]:min-w-0 [&_select]:border [&_select]:border-[#dce4d7] [&_select]:rounded-[8px] [&_select]:py-[10px] [&_select]:px-[12px] [&_select]:[font:inherit] [&_select]:bg-[#fff] [&_select]:text-[#344936] [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#648d66] [&_:focus-visible]:outline-offset-[3px] [&_progress]:w-full [&_progress]:h-[8px] [&_progress]:[accent-color:#8b9e72] [&_table]:border-collapse [&_table]:w-full [&_table]:text-[13px] [&_th]:text-left [&_th]:p-[10px] [&_th]:border-b [&_th]:border-b-[#e2e8dd] [&_th]:whitespace-nowrap [&_td]:text-left [&_td]:p-[10px] [&_td]:border-b [&_td]:border-b-[#e2e8dd] [&_td]:whitespace-nowrap" aria-label="Customer reviews">
      <h2>Customer experiences</h2>
      <State state={summary} />
      <RatingSummary data={summary.data} />
      <label className="[&&&]:max-w-[220px] [&&&]:mb-[16px]">
        Filter by rating
        <select
          value={rating}
          onChange={(e) => {
            setRating(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} stars
            </option>
          ))}
        </select>
      </label>
      {notice && (
        <p className="rr-notice [&&]:bg-[#edf5e9] [&&]:py-[12px] [&&]:px-[16px] [&&]:rounded-[8px] [&&]:my-[12px] [&&]:mx-0" role="status">
          {notice}
        </p>
      )}
      <State state={state} />
      {state.data?.rows.map((r) => (
        <ReviewCard
          key={r.id}
          review={{ ...r, status: undefined }}
          report={
            user
              ? (review, responseId) => setTarget({ review, responseId })
              : null
          }
        />
      ))}
      {state.data && !state.data.rows.length && (
        <div className="rr-panel [&&]:bg-[#fff] [&&]:border [&&]:border-[#e2e8dd] [&&]:rounded-[16px] [&&]:p-[24px] [&&]:mb-[20px] [&&]:min-w-0 max-[600.001px]:[&&]:p-[18px]">
          <Star size={26} />
          <h3>Every celebration has a story</h3>
          <p className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
            No published reviews match this selection yet.
          </p>
        </div>
      )}
      <Pagination data={state.data} page={page} setPage={setPage} />
      {target && (
        <ReportForm
          target={target}
          close={() => setTarget(null)}
          done={(message) => {
            setNotice(message);
            setTarget(null);
          }}
        />
      )}
    </section>
  );
}
export function ReviewForm({ review, bookingId, close, done }) {
  const formId = useId();
  const [experience, setExperience] = useState(review?.text || "");
  const eligible = useReviews("/reviews/eligible-bookings"),
    [rating, setRating] = useState(review?.rating || 0),
    [images, setImages] = useState([]),
    [keep, setKeep] = useState(review?.images || []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const targets = [];
  const bookings = new Set();
  for (const b of eligible.data || []) {
    if (bookingId && b.bookingId.toLowerCase() !== bookingId.toLowerCase())
      continue;
    if (!bookings.has(b.bookingId)) {
      targets.push({
        ...b,
        key: `${b.bookingId}:`,
        label: `${b.number} · ${b.vendor} (vendor overall)`,
      });
      bookings.add(b.bookingId);
    }
    if (b.bookingItemId)
      targets.push({
        ...b,
        key: `${b.bookingId}:${b.bookingItemId}`,
        label: `${b.number} · ${b.service}`,
      });
  }
  async function upload(files) {
    setError("");
    try {
      if (files.length + images.length + keep.length > 5)
        throw new Error("Choose at most five images.");
      const added = await Promise.all(
        Array.from(files).map(
          (file) =>
            new Promise((resolve, reject) => {
              if (
                !["image/png", "image/jpeg", "image/webp"].includes(
                  file.type,
                ) ||
                !/\.(png|jpe?g|webp)$/i.test(file.name) ||
                file.size > 2 * 1024 * 1024
              ) {
                reject(
                  new Error("Choose PNG, JPEG or WebP images under 2 MB."),
                );
                return;
              }
              const reader = new FileReader();
              reader.onerror = () => reject(new Error("Unable to read image."));
              reader.onload = () =>
                resolve({
                  name: file.name,
                  mimeType: file.type,
                  base64: String(reader.result).split(",")[1],
                  preview: reader.result,
                });
              reader.readAsDataURL(file);
            }),
        ),
      );
      setImages((old) => [...old, ...added]);
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <Dialog
      title={review ? "Edit your review" : "Share your experience"}
      description="Your memories can help someone plan their perfect day. Tell us how it went."
      reviewForm
      close={() => {
        if (!busy) close();
      }}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center justify-center gap-1.5 text-[11px] text-[#75816e] sm:justify-start">
            <ShieldCheck size={15} aria-hidden="true" /> Published immediately
          </span>
          <div className="flex items-center gap-2.5">
            <button className="[&&]:min-h-11 [&&]:flex-1 [&&]:bg-transparent sm:[&&]:flex-none" type="button" disabled={busy} onClick={close}>Cancel</button>
            <button
              form={formId}
              type="submit"
              className="rr-primary [&&&]:min-h-11 [&&&]:flex-1 [&&&]:border-[#36583e] [&&&]:bg-[#36583e] [&&&]:px-5 [&&&]:text-white [&&&]:shadow-sm [&&&:hover]:bg-[#294730] sm:[&&&]:flex-none"
              disabled={busy || (!review && !targets.length)}
            >
              {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : null}
              {busy ? "Publishing..." : review ? "Save changes" : "Publish review"}
              {!busy && <ArrowRight size={15} aria-hidden="true" />}
            </button>
          </div>
        </div>
      }
    >
      <State state={eligible} />
      <form
        id={formId}
        aria-busy={busy}
        className="rr-stack grid gap-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!rating) {
            setError("Choose an overall rating.");
            e.currentTarget.querySelector('[role="radio"]').focus();
            return;
          }
          const f = Object.fromEntries(new FormData(e.currentTarget));
          const [selectedBooking, selectedItem] = (f.target || "").split(":");
          delete f.target;
          for (const key of [
            "serviceQualityRating",
            "communicationRating",
            "valueForMoneyRating",
            "professionalismRating",
          ])
            f[key] = f[key] ? Number(f[key]) : null;
          const b = {
            ...f,
            rating,
            images: images.map((image) => ({
              name: image.name,
              mimeType: image.mimeType,
              base64: image.base64,
            })),
            keepImageIds: keep.map((i) => i.id),
            ...(!review
              ? {
                  bookingId: selectedBooking,
                  bookingItemId: selectedItem ? Number(selectedItem) : null,
                }
              : {}),
          };
          setBusy(true);
          setError("");
          try {
            const r = await reviewSave(
              review ? `/reviews/${review.id}` : "/reviews",
              review ? "PUT" : "POST",
              b,
            );
            done(r.message);
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {!review && (
          <label>
            <span>Who are you reviewing? <span className="text-[#a16d40]" aria-hidden="true">*</span></span>
            <select name="target" required defaultValue="" disabled={busy || eligible.loading}>
              <option value="" disabled>Choose a vendor or booked service</option>
              {targets.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
            <span className="text-xs font-normal text-[#75816e]">
              {eligible.data && !targets.length
                ? "Complete a booking to share your experience."
                : "Only vendors and services from your completed bookings appear here."}
            </span>
          </label>
        )}
        <section className="flex flex-col gap-4 rounded-2xl border border-[#eae3d4] bg-[#fcfaf5] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" aria-label="Overall rating">
          <div>
            <h3 className="text-sm font-semibold text-[#344936]">How was your experience? <span className="text-[#a16d40]" aria-hidden="true">*</span></h3>
            <p className="mt-1 text-xs text-[#85816f]">Every little detail matters.</p>
          </div>
          <Stars value={rating} onChange={setRating} />
        </section>
        <label>
          <span>Give your review a title <span className="font-normal text-[#82907b]">(optional)</span></span>
          <input name="title" maxLength={200} defaultValue={review?.title || ""} placeholder="A little headline for a memorable day" />
        </label>
        <label>
          <span>Your experience <span className="text-[#a16d40]" aria-hidden="true">*</span></span>
          <textarea
            name="text"
            required
            minLength={5}
            maxLength={5000}
            rows={4}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="What made it special? Share what you loved and anything that could have been better."
            aria-describedby={`${formId}-experience-hint`}
          />
          <span id={`${formId}-experience-hint`} className="flex justify-between gap-3 text-[11px] font-normal text-[#82907b]">
            <span>A few honest words go a long way. At least 5 characters.</span>
            <span className="shrink-0 tabular-nums">{experience.length.toLocaleString("en-IN")} / 5,000</span>
          </span>
        </label>
        <details className="group rounded-2xl border border-[#e4e9df] bg-[#fbfcf9]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
            <span>Rate the details <span className="ml-1 font-normal text-[#82907b]">(optional)</span></span>
            <ChevronDown size={16} className="shrink-0 text-[#82907b] transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-4 border-t border-[#e4e9df] p-4 sm:grid-cols-2">
            {[
              ["serviceQualityRating", "Service quality"],
              ["communicationRating", "Communication"],
              ["valueForMoneyRating", "Value for money"],
              ["professionalismRating", "Professionalism"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <select name={key} defaultValue={review?.[key] || ""}>
                  <option value="">Not rated</option>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} &middot; {ratingLabels[n - 1]}</option>)}
                </select>
              </label>
            ))}
          </div>
        </details>
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3 text-[13px] font-medium">
            <span>Add a few memories <span className="font-normal text-[#82907b]">(optional)</span></span>
            <span className="shrink-0 text-xs font-normal text-[#82907b]">{images.length + keep.length} / 5 photos</span>
          </div>
          <label className="relative cursor-pointer place-items-center rounded-2xl border border-dashed border-[#bccaaf] bg-[#f8faf5] p-5 text-center transition-colors hover:border-[#648d66] hover:bg-[#f0f5ea] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#648d66] has-[:disabled]:cursor-default has-[:disabled]:opacity-50">
            <span className="flex size-10 items-center justify-center rounded-xl border border-[#dfe6d6] bg-white text-[#68825a]"><ImagePlus size={21} strokeWidth={1.6} aria-hidden="true" /></span>
            <span className="text-[13px]">Choose photos to add to your review</span>
            <span className="text-[11px] font-normal text-[#82907b]">PNG, JPG or WebP &middot; Up to 5 photos &middot; 2 MB each</span>
            <input
              className="[&&]:absolute [&&]:inset-0 [&&]:h-full [&&]:w-full [&&]:cursor-pointer [&&]:opacity-0"
              type="file"
              aria-label="Add review photos (up to five, 2 MB each)"
              accept="image/png,image/jpeg,image/webp"
              multiple
              disabled={busy || images.length + keep.length >= 5}
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {(keep.length > 0 || images.length > 0) && (
            <div className="flex flex-wrap gap-3">
              {keep.map((i) => (
                <div className="relative" key={i.id}>
                  <img className="size-20 rounded-xl border border-[#e4e9df] object-cover" src={imageUrl(i.id)} alt={i.name || "Existing review photo"} />
                  <button className="[&&]:absolute [&&]:-top-1.5 [&&]:-right-1.5 [&&]:size-6 [&&]:rounded-full [&&]:p-0 [&&]:shadow-sm" type="button" aria-label={`Remove ${i.name || "existing review photo"}`} onClick={() => setKeep((k) => k.filter((x) => x.id !== i.id))}><X size={13} aria-hidden="true" /></button>
                </div>
              ))}
              {images.map((i, index) => (
                <div className="relative" key={index}>
                  <img className="size-20 rounded-xl border border-[#e4e9df] object-cover" src={i.preview} alt={i.name} />
                  <button className="[&&]:absolute [&&]:-top-1.5 [&&]:-right-1.5 [&&]:size-6 [&&]:rounded-full [&&]:p-0 [&&]:shadow-sm" type="button" aria-label={`Remove ${i.name}`} onClick={() => setImages((old) => old.filter((_, n) => n !== index))}><X size={13} aria-hidden="true" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-[#f3f6ef] p-3 text-[11px] leading-relaxed text-[#75816e]">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#68825a]" aria-hidden="true" />
          Your review is linked to a completed booking and published immediately. Please keep it honest, helpful and respectful.
        </p>
        {error && <p className="rounded-xl border border-[#edc9c2] bg-[#fff0ed] px-4 py-3 text-sm text-[#9d4646]" role="alert">{error}</p>}
      </form>
    </Dialog>
  );
}
function ActionDialog({ action, close, done }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      title={action.title}
      close={() => {
        if (!busy) close();
      }}
    >
      <form
        className="rr-stack [&&]:grid [&&]:gap-[16px]"
        onSubmit={async (e) => {
          e.preventDefault();
          const b = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          try {
            await reviewSave(action.path, action.method, b);
            done(action.success || "Changes saved.");
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {action.description && <p>{action.description}</p>}
        {action.response ? (
          <label>
            Public response
            <textarea
              name="text"
              rows={5}
              required
              minLength={5}
              maxLength={3000}
              defaultValue={action.responseText || ""}
            />
          </label>
        ) : (
          action.reason && (
            <label>
              Reason / decision notes
              <textarea
                name="reason"
                rows={4}
                maxLength={2000}
                required={action.required}
              />
            </label>
          )
        )}
        {action.notes && (
          <label>
            Internal moderation note (admins only)
            <textarea
              name="notes"
              rows={3}
              maxLength={2000}
              required={action.notesRequired}
            />
          </label>
        )}
        {error && (
          <p className="rr-error [&&]:bg-[#fff0ed] [&&]:text-[#9d4646] [&&]:py-[12px] [&&]:px-[16px] [&&]:rounded-[8px] [&&]:my-[12px] [&&]:mx-0" role="alert">
            {error}
          </p>
        )}
        <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap">
          <button className="rr-primary [&&&]:bg-[#36583e] [&&&]:text-[#fff] [&&&]:border-[#36583e] [&&&:hover]:bg-[#294730]" disabled={busy}>
            {busy ? "Saving…" : "Confirm"}
          </button>
          <button type="button" onClick={close} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export default function ReviewsWorkspace({ role = "Customer" }) {
  const socket = useCommunicationSocket();
  const [params] = useSearchParams(),
    [page, setPage] = useState(1),
    [reportPage, setReportPage] = useState(1),
    [filters, setFilters] = useState({
      q: "",
      rating: "",
      status: params.get("status") === "Pending" ? "" : params.get("status") || "",
      vendorId: "",
      serviceId: "",
      categoryId: "",
      from: "",
      to: "",
      reported: "",
    }),
    [version, setVersion] = useState(0),
    [editing, setEditing] = useState(null),
    [action, setAction] = useState(null),
    [target, setTarget] = useState(null),
    [notice, setNotice] = useState(""),
    [history, setHistory] = useState(null);
  useEffect(() => {
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setVersion((v) => v + 1), 100);
    };
    socket?.on("new_notification", refresh);
    socket?.on("connect", refresh);
    return () => {
      clearTimeout(timer);
      socket?.off("new_notification", refresh);
      socket?.off("connect", refresh);
    };
  }, [socket]);
  const root =
    role === "Customer"
      ? "/reviews/my-reviews"
      : `/${role.toLowerCase()}/reviews`;
  const query = new URLSearchParams({ page: String(page) });
  for (const [key, value] of Object.entries(filters))
    if (value) query.set(key, value);
  const state = useReviews(`${root}?${query}`, version),
    summary = useReviews(
      role === "Vendor"
        ? "/vendor/rating-summary"
        : role === "Admin"
          ? "/admin/review-analytics"
          : null,
      version,
    ),
    reports = useReviews(
      role === "Admin" ? `/admin/review-reports?page=${reportPage}` : null,
      version,
    ),
    metadata = useReviews(
      role === "Admin" ? "/admin/reviews/filters" : null,
      version,
    );
  const done = (message) => {
    setNotice(message);
    setAction(null);
    setEditing(null);
    setTarget(null);
    setVersion((v) => v + 1);
  };
  const choose = (key, value) => {
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === "vendorId" ? { serviceId: "" } : {}),
    }));
    setPage(1);
  };
  const moderation = (r, name) =>
    setAction({
      title: `${name[0].toUpperCase() + name.slice(1)} review`,
      path: `/admin/reviews/${r.id}/${name}`,
      method: "PATCH",
      reason: true,
      notes: true,
      required: ["reject", "hide", "flag"].includes(name),
    });
  const vendorActions = (r) => (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        className="rr-link [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:gap-1.5 [&&]:rounded-xl [&&]:border [&&]:border-[#dce4d7] [&&]:bg-white [&&]:px-3.5 [&&]:py-2 [&&]:text-[11px] [&&]:text-[#36533d] [&&]:no-underline [&&:hover]:bg-[#f2f6ee]"
        to={`/vendor/bookings/${r.bookingId}`}
      >
        View booking
      </Link>
      <button
        type="button"
        className="[&&]:gap-1.5 [&&]:rounded-xl [&&]:border-[#36583e] [&&]:bg-[#36583e] [&&]:px-3.5 [&&]:py-2 [&&]:text-[11px] [&&]:text-white [&&:hover]:bg-[#294730]"
        onClick={() =>
          setAction({
            title: r.response
              ? "Edit response"
              : "Respond to your customer",
            path: `/vendor/reviews/${r.id}/response`,
            method: r.response ? "PUT" : "POST",
            response: true,
            responseText: r.response?.text,
          })
        }
      >
        <MessageSquare size={13} aria-hidden="true" />{r.response ? "Edit response" : "Write a response"}
      </button>
      {r.response && (
        <button
          className="rr-danger [&&]:text-[#9d4646]"
          onClick={() =>
            setAction({
              title: "Delete response?",
              path: `/vendor/reviews/${r.id}/response`,
              method: "DELETE",
            })
          }
        >
          Delete response
        </button>
      )}
    </div>
  );
  const adminActions = (r) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {(r.status === "Approved" ? ["hide", "flag"] : ["restore"]).map((name) => (
        <button type="button" key={name} disabled={r.deleted} onClick={() => moderation(r, name)}>
          {name[0].toUpperCase() + name.slice(1)}
        </button>
      ))}
      {r.response && (
        <button type="button" onClick={() => setAction({
          title: "Hide vendor response",
          path: `/admin/reviews/${r.id}/response/hide`,
          method: "PATCH",
          reason: true,
          required: true,
        })}>
          Hide response
        </button>
      )}
      <button type="button" onClick={async () => {
        try {
          setHistory(await reviewRequest(`/admin/reviews/${r.id}`));
        } catch (err) {
          setNotice(err.message);
        }
      }}>
        Details & history
      </button>
      <button type="button" onClick={() => setAction({
        title: "Add internal note",
        path: `/admin/reviews/${r.id}/notes`,
        method: "PATCH",
        notes: true,
        notesRequired: true,
      })}>
        Add note
      </button>
    </div>
  );
  return (
    <main data-workspace={role.toLowerCase()} data-enhanced={role !== "Customer"} className="rr-module [&&[data-enhanced=true]]:font-sans [&&[data-enhanced=true]]:text-[#2d4538] [&[data-enhanced=true]_input]:min-h-11 [&[data-enhanced=true]_input]:rounded-xl [&[data-enhanced=true]_input]:border-[#dfe6d9] [&[data-enhanced=true]_input]:bg-[#fcfdfb] [&[data-enhanced=true]_input]:text-xs [&[data-enhanced=true]_select]:min-h-11 [&[data-enhanced=true]_select]:rounded-xl [&[data-enhanced=true]_select]:border-[#dfe6d9] [&[data-enhanced=true]_select]:bg-[#fcfdfb] [&[data-enhanced=true]_select]:text-xs [&[data-enhanced=true]_label]:text-[11px] [&[data-enhanced=true]_label]:text-[#617264] [&&]:text-[#344936] [&&]:[font-family:inherit] [&&]:text-[14px] [&&]:leading-[1.6] [&&]:min-w-0 [&&]:w-full [&_*]:box-border [&_h1]:text-[clamp(25px,_3vw,_34px)] [&_h1]:font-semibold [&_h1]:leading-[1.25] [&_h1]:mt-0 [&_h1]:mx-0 [&_h1]:mb-[10px] [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:mt-0 [&_h2]:mx-0 [&_h2]:mb-[12px] [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:my-[10px] [&_h3]:mx-0 [&_p]:my-[8px] [&_p]:mx-0 [&_p]:wrap-anywhere [&_button]:border [&_button]:border-[#dce4d7] [&_button]:rounded-[8px] [&_button]:py-[9px] [&_button]:px-[15px] [&_button]:bg-[#fff] [&_button]:text-[#36533d] [&_button]:text-[13px] [&_button]:cursor-pointer [&_button]:no-underline [&_button]:inline-flex [&_button]:gap-[7px] [&_button]:items-center [&_button]:justify-center [&_button:hover]:bg-[#f2f6ee] [&_button:disabled]:[cursor:wait] [&_button:disabled]:opacity-55 [&_label]:grid [&_label]:gap-[6px] [&_label]:text-[13px] [&_label]:font-medium [&_label]:min-w-0 [&_input]:w-full [&_input]:min-w-0 [&_input]:border [&_input]:border-[#dce4d7] [&_input]:rounded-[8px] [&_input]:py-[10px] [&_input]:px-[12px] [&_input]:[font:inherit] [&_input]:bg-[#fff] [&_input]:text-[#344936] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:border [&_textarea]:border-[#dce4d7] [&_textarea]:rounded-[8px] [&_textarea]:py-[10px] [&_textarea]:px-[12px] [&_textarea]:[font:inherit] [&_textarea]:bg-[#fff] [&_textarea]:text-[#344936] [&_textarea]:[resize:vertical] [&_select]:w-full [&_select]:min-w-0 [&_select]:border [&_select]:border-[#dce4d7] [&_select]:rounded-[8px] [&_select]:py-[10px] [&_select]:px-[12px] [&_select]:[font:inherit] [&_select]:bg-[#fff] [&_select]:text-[#344936] [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#648d66] [&_:focus-visible]:outline-offset-[3px] [&_progress]:w-full [&_progress]:h-[8px] [&_progress]:[accent-color:#8b9e72] [&_table]:border-collapse [&_table]:w-full [&_table]:text-[13px] [&_th]:text-left [&_th]:p-[10px] [&_th]:border-b [&_th]:border-b-[#e2e8dd] [&_th]:whitespace-nowrap [&_td]:text-left [&_td]:p-[10px] [&_td]:border-b [&_td]:border-b-[#e2e8dd] [&_td]:whitespace-nowrap">
      {role === "Customer" && (
        <Link className="rr-link [&&]:border [&&]:border-[#dce4d7] [&&]:rounded-[8px] [&&]:py-[9px] [&&]:px-[15px] [&&]:bg-[#fff] [&&]:text-[#36533d] [&&]:text-[13px] [&&]:cursor-pointer [&&]:no-underline [&&]:inline-flex [&&]:gap-[7px] [&&]:items-center [&&]:justify-center" to="/customer/media">
          Manage review photos
        </Link>
      )}
      {role !== "Customer" ? (
        <header className="mb-6 flex flex-col justify-between gap-5 border-b border-[#e1e7dc] pb-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-2xl border border-[#d6e2ca] bg-[#eaf1e1] text-[#65834e] sm:flex"><Star size={23} strokeWidth={1.5} aria-hidden="true" /></span>
            <div>
              <h1 className="[&&]:m-0 [&&]:text-[28px] [&&]:font-semibold [&&]:tracking-[-0.04em] sm:[&&]:text-[32px]">{role === "Admin" ? "Reviews & ratings" : "Customer experiences"}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
            <button type="button" disabled={summary.loading || state.loading} onClick={() => setVersion((v) => v + 1)} className="[&&]:gap-1.5 [&&]:rounded-xl [&&]:border-[#d6dfcd] [&&]:bg-white [&&]:px-3 [&&]:py-2 [&&]:text-[11px] [&&]:font-medium [&&]:shadow-[0_1px_2px_#294f3c05]"><RotateCw size={13} className={summary.loading || state.loading ? "animate-spin" : ""} aria-hidden="true" />Refresh</button>
          </div>
        </header>
      ) : (
        <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap rr-between [&&]:justify-between [&&&]:mb-[24px]">
          <div>
            <p className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">{role.toUpperCase()} / REVIEWS &amp; RATINGS</p>
            <h1>{role === "Customer" ? "Your celebrations, your stories" : "Customer experiences"}</h1>
            <p className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
              {role === "Customer" ? "Share the details that help another celebration find its perfect match." : "Listen, respond, and build trust with every celebration."}
            </p>
          </div>
          {role === "Customer" && (
            <button className="rr-primary [&&&]:bg-[#36583e] [&&&]:text-[#fff] [&&&]:border-[#36583e] [&&&:hover]:bg-[#294730]" onClick={() => setEditing({})}>
              <Plus size={16} />Write a review
            </button>
          )}
        </div>
      )}
      {notice && (
        <p className="rr-notice [&&]:bg-[#edf5e9] [&&]:py-[12px] [&&]:px-[16px] [&&]:rounded-[8px] [&&]:my-[12px] [&&]:mx-0" role="status">
          {notice}
        </p>
      )}
      {role === "Admin" && <State state={summary} />}
      {role === "Vendor" && (
        <>
          <State state={summary} />
          {summary.data && <VendorReviewOverview data={summary.data} choose={choose} selectedRating={filters.rating} />}
        </>
      )}
      {role === "Admin" && summary.data && <AdminReviewOverview data={summary.data} choose={choose} />}
      {role === "Admin" && (
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h2 className="[&&]:m-0 [&&]:text-lg">Customer reviews <span className="ml-1.5 rounded-full bg-[#eaf0e3] px-2 py-0.5 text-xs font-medium text-[#5d754c]">{state.data?.total ?? "..."}</span></h2><p className="[&&]:mt-1 [&&]:mb-0 [&&]:text-xs [&&]:text-[#71806a]">Verified bookings. Honest voices. Published instantly.</p></div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Review visibility">
            {[["", "All reviews"], ["Approved", "Published"], ["Flagged", "Flagged"], ["Hidden", "Hidden"]].map(([value, label]) => (
              <button type="button" key={value} aria-pressed={filters.status === value} onClick={() => choose("status", value)} className="[&&]:rounded-full [&&]:border-transparent [&&]:px-3 [&&]:py-1.5 [&&]:text-xs [&&[aria-pressed=true]]:border-[#cbdabd] [&&[aria-pressed=true]]:bg-[#eaf0e3] [&&[aria-pressed=true]]:text-[#486537]">{label}</button>
            ))}
          </div>
        </div>
      )}
      {role === "Vendor" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><h2 className="[&&]:m-0 [&&]:text-base [&&]:font-semibold">Customer feedback</h2><span className="rounded-full border border-[#dce6cf] bg-[#edf3e5] px-2 py-0.5 text-[10px] font-semibold text-[#708957]">{state.data?.total ?? "..."}</span></div>
          <span className="text-[10px] text-[#7a866d]">Overall vendor and service reviews from completed bookings</span>
        </div>
      )}
      <div className={role !== "Customer" ? "mb-5 min-w-0 rounded-2xl border border-[#dfe6d9] bg-white shadow-[0_3px_12px_#294f3c05]" : undefined}>
        {role !== "Customer" ? (
          <ReviewTableFilters role={role} filters={filters} choose={choose} metadata={metadata.data} clear={() => { setFilters(Object.fromEntries(Object.keys(filters).map((key) => [key, ""]))); setPage(1); }} />
        ) : (
          <section className="rr-panel [&&]:bg-[#fff] [&&]:border [&&]:border-[#e2e8dd] [&&]:rounded-2xl [&&]:p-5 [&&]:shadow-[0_2px_4px_#294f3c03] [&&]:mb-[20px] [&&]:min-w-0 max-[600.001px]:[&&]:p-[18px]">
            <div className="rr-grid [&&]:grid [&&]:grid-cols-[repeat(auto-fit,_minmax(180px,_1fr))] [&&]:gap-[16px] max-[600.001px]:[&&]:grid-cols-[1fr]">
              <label>
                <span className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap">
                  <Search size={14} />
                  Search experiences
                </span>
                <input
                  value={filters.q}
                  maxLength={200}
                  onChange={(e) => choose("q", e.target.value)}
                  placeholder={role === "Vendor" ? "Customer, review or service" : "Review, title or vendor"}
                />
              </label>
              <label>
                Rating
                <select
                  value={filters.rating}
                  onChange={(e) => choose("rating", e.target.value)}
                >
                  <option value="">All ratings</option>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} stars
                    </option>
                  ))}
                </select>
              </label>
              {role !== "Vendor" && (
                <label>
                  Status
                  <select
                    value={filters.status}
                    onChange={(e) => choose("status", e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {["Approved", "Flagged", "Hidden", "Rejected"].map(
                      (s) => (
                        <option key={s} value={s}>{s === "Approved" ? "Published" : s}</option>
                      ),
                    )}
                  </select>
                </label>
              )}
              <label>
                From
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => choose("from", e.target.value)}
                />
              </label>
              <label>
                Through
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => choose("to", e.target.value)}
                />
              </label>
            </div>
          </section>
        )}
        <State state={state} />
        {role === "Admin" && state.data?.rows.length > 0 && <AdminReviewsTable reviews={state.data.rows} actions={adminActions} />}
        {role === "Vendor" && state.data?.rows.length > 0 && <VendorReviewsTable reviews={state.data.rows} actions={vendorActions} report={(review, responseId) => setTarget({ review, responseId })} />}
        {role === "Customer" && state.data?.rows.map((r) => (
          <ReviewCard
            key={r.id}
            review={r}
            report={
              role !== "Admin"
                ? (review, responseId) => setTarget({ review, responseId })
                : null
            }
          >
            <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-2 [&&]:flex-wrap">
              {role === "Customer" && (
                <>
                  {r.canEdit && (
                    <button onClick={() => setEditing(r)}>Edit review</button>
                  )}
                  <button
                    className="rr-danger [&&]:text-[#9d4646]"
                    onClick={() =>
                      setAction({
                        title: "Delete your review?",
                        description:
                          "Your review and its images will no longer appear publicly. This booking target cannot be reviewed again.",
                        path: `/reviews/${r.id}`,
                        method: "DELETE",
                        success: "Review deleted.",
                      })
                    }
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </ReviewCard>
        ))}
        {state.data && !state.data.rows.length && (
          <div className={role !== "Customer" ? "p-6" : "rr-panel [&&]:bg-[#fff] [&&]:border [&&]:border-[#e2e8dd] [&&]:rounded-[16px] [&&]:p-[24px] [&&]:mb-[20px] [&&]:min-w-0 max-[600.001px]:[&&]:p-[18px]"}>
            <Star size={28} />
            <h3>No reviews here yet</h3>
            <p className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
              {role === "Customer"
                ? "Complete a booking to tell your story."
                : "Reviews matching your filters will appear here."}
            </p>
          </div>
        )}
        <div className={role !== "Customer" && state.data?.total > state.data?.pageSize ? "border-t border-[#e2e8dd] p-4 sm:px-5" : undefined}>
          <Pagination data={state.data} page={page} setPage={setPage} />
        </div>
      </div>
      {role === "Admin" && (
        <section className="rr-panel [&&]:bg-[#fff] [&&]:border [&&]:border-[#e2e8dd] [&&]:rounded-[16px] [&&]:p-[24px] [&&]:mb-[20px] [&&]:min-w-0 max-[600.001px]:[&&]:p-[18px]">
          <div className="mb-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#fff4e2] text-[#b08a46]"><Flag size={17} aria-hidden="true" /></span><div><h2 className="[&&]:m-0 [&&]:text-base">Reported content</h2><p className="[&&]:mt-0.5 [&&]:mb-0 [&&]:text-xs [&&]:text-[#71806a]">Follow up on concerns raised by your community.</p></div></div>
          <State state={reports} />
          {reports.data?.rows.length === 0 && (
            <p className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">No reported content.</p>
          )}
          {reports.data?.rows.map((r) => (
            <article
              key={r.ReportId}
              className="[&&&]:border-b [&&&]:border-b-[#e2e8dd] [&&&]:py-[16px] [&&&]:px-0"
            >
              <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap rr-between [&&]:justify-between">
                <strong>
                  {r.vendor} ·{" "}
                  {r.ResponseId ? "Vendor response" : "Customer review"}
                </strong>
                <span className="rr-badge [&&]:inline-flex [&&]:gap-[5px] [&&]:items-center [&&]:text-[11px] [&&]:bg-[#edf3e9] [&&]:rounded-[20px] [&&]:py-[4px] [&&]:px-[10px] [&&]:text-[#496442] [&&[data-status='Pending']]:bg-[#fff4dc] [&&[data-status='Pending']]:text-[#98722c] [&&[data-status='Flagged']]:bg-[#fff4dc] [&&[data-status='Flagged']]:text-[#98722c] [&&[data-status='Rejected']]:bg-[#fcebea] [&&[data-status='Rejected']]:text-[#9d4646] [&&[data-status='Hidden']]:bg-[#fcebea] [&&[data-status='Hidden']]:text-[#9d4646]">{r.ReportStatus}</span>
              </div>
              <p>
                {r.ReportReason}: {r.ReportDescription}
              </p>
              <p className="rr-muted [&&]:text-[#74816f] [&&]:text-[13px]">
                Reported by {r.reporter} · {date(r.CreatedAt)}
              </p>
              <p className="rr-break [&&]:whitespace-pre-wrap [&&]:wrap-anywhere">
                {r.ResponseId ? r.ResponseText : r.ReviewText}
              </p>
              {r.AdminNotes && <p>Decision notes: {r.AdminNotes}</p>}
              {r.ReportStatus === "Pending" && (
                <div className="rr-row [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:flex-wrap">
                  {["resolve", "dismiss"].map((name) => (
                    <button
                      key={name}
                      onClick={() =>
                        setAction({
                          title:
                            name === "resolve"
                              ? "Accept report"
                              : "Dismiss report",
                          description:
                            "This records the report decision. Use review or response moderation controls to hide inappropriate content.",
                          path: `/admin/review-reports/${r.ReportId}/${name}`,
                          method: "PATCH",
                          reason: true,
                          required: true,
                        })
                      }
                    >
                      {name === "resolve" ? "Accept" : "Dismiss"}
                    </button>
                  ))}
                  <button
                    onClick={() => moderation({ id: r.ReviewId }, "hide")}
                  >
                    Hide review
                  </button>
                  {r.ResponseId && (
                    <button
                      onClick={() =>
                        setAction({
                          title: "Hide reported response",
                          path: `/admin/reviews/${r.ReviewId}/response/hide`,
                          method: "PATCH",
                          reason: true,
                          required: true,
                        })
                      }
                    >
                      Hide response
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
          <Pagination
            data={reports.data}
            page={reportPage}
            setPage={setReportPage}
          />
        </section>
      )}
      {editing && (
        <ReviewForm
          review={editing.id ? editing : null}
          close={() => setEditing(null)}
          done={done}
        />
      )}{" "}
      {action && (
        <ActionDialog
          action={action}
          close={() => setAction(null)}
          done={done}
        />
      )}{" "}
      {target && (
        <ReportForm target={target} close={() => setTarget(null)} done={done} />
      )}{" "}
      {history && (
        <Dialog
          title="Review details & audit history"
          close={() => setHistory(null)}
        >
          <p>
            Booking:{" "}
            <Link to={`/admin/bookings/${history.BookingId}`}>
              {history.BookingNumber}
            </Link>
          </p>
          <p>
            Customer:{" "}
            <Link to={`/admin/customers/${history.CustomerId}`}>
              {history.CustomerName}
            </Link>{" "}
            · {history.CustomerEmail}
          </p>
          <p>
            Vendor:{" "}
            <Link to={`/admin/vendors/${history.VendorId}`}>
              {history.VendorName}
            </Link>
            {history.ServiceName ? ` / ${history.ServiceName}` : ""}
          </p>
          <p>{history.ReviewText}</p>
          <ReviewImages images={history.images} />
          {history.response && <p>Vendor response: {history.response.text}</p>}
          <h3>Moderation decisions</h3>
          {history.history?.map((h) => (
            <p key={h.HistoryId}>
              {date(h.CreatedAt)} · {h.PreviousStatus} → {h.NewStatus} ·{" "}
              {h.ModerationReason} · Administrator {h.ModeratedBy}
              {h.InternalNotes && (
                <span className="rr-response [&&]:py-[16px] [&&]:px-[20px] [&&]:border-l-3 [&&]:border-l-[#b4c5a3] [&&]:bg-[#f6f8f2] [&&]:rounded-[0_8px_8px_0] [&&]:my-[16px] [&&]:mx-0">
                  Internal note: {h.InternalNotes}
                </span>
              )}
            </p>
          ))}
          <h3>Content and response history</h3>
          {history.audit?.map((a, i) => (
            <details key={i}>
              <summary>
                {date(a.CreatedAt)} · {a.ActionType}
              </summary>
              <pre className="rr-break [&&]:whitespace-pre-wrap [&&]:wrap-anywhere">{a.OldValue}</pre>
              <pre className="rr-break [&&]:whitespace-pre-wrap [&&]:wrap-anywhere">{a.NewValue}</pre>
            </details>
          ))}
        </Dialog>
      )}
    </main>
  );
}
