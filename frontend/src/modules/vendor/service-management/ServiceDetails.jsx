import { OfferReview } from "../../commerce/OfferEditor";
import ApprovalTimeline from "../../../components/common/ApprovalTimeline";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Star, ArrowLeft, Eye, CalendarCheck, IndianRupee, MessageCircle, TrendingUp, ArrowUpRight, CalendarDays, Clock3, LayoutGrid, ShieldCheck } from "lucide-react";
import {
  Panel,
  Loading,
  ErrorView,
  Empty,
  useVendorData,
} from "../components/WorkspaceUI";
import { date, money, today } from "../services/workspace.api";
import { Notice, ServiceActions, Status } from "./shared";
import MediaManager from "./MediaManager";
import ServiceOverview from "./ServiceOverview";

function PricingDetails({ pricing = {} }) {
  const labels = [
    ["type", "Pricing type"],
    ["basePrice", "Base price"],
    ["unitPrice", "Unit price"],
    ["minimumPrice", "Minimum price"],
    ["maximumPrice", "Maximum price"],
    ["unit", "Pricing unit"],
    ["discount", "Discount"],
    ["taxRate", "Tax"],
    ["minimumQuantity", "Minimum quantity"],
    ["maximumQuantity", "Maximum quantity"],
    ["specialPrice", "Special price"],
    ["weekendPrice", "Weekend price"],
    ["seasonalPrice", "Seasonal price"],
    ["seasonalFrom", "Season starts"],
    ["seasonalTo", "Season ends"],
    ["additionalCharges", "Additional charges"],

  ];
  const types = {
    Fixed: "Fixed price",
    PerPerson: "Per person",
    PerHour: "Hourly",
    PerDay: "Daily",
    PerItem: "Per item",
    CustomQuote: "Custom pricing",
  };
  const format = (key, value) => {
    if (value == null || value === "")
      return key === "type" ? "Match pricing unit" : "Not specified";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (key === "type") return types[value] || value;
    if (/Price$/.test(key) || key === "additionalCharges") return money(value);
    if (["discount", "taxRate"].includes(key)) return `${value}%`;
    if (["seasonalFrom", "seasonalTo"].includes(key)) return date(value);
    if (key === "unit")
      return value === "Custom"
        ? "Custom pricing"
        : value === "Per KM"
          ? "Per Kilometer"
          : value;
    return value;
  };
  return (
    <dl
      className="
      grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_dt]:text-[10px] [&_dt]:capitalize
      [&_dt]:text-[#99a58d] [&_dt]:mb-[6px] [&_dd]:m-[0] [&_dd]:text-[#54704d]
      [&_dd]:[overflow-wrap:anywhere] service-mobile:grid-cols-[1fr]
    "
    >
      {labels.map(([key, label]) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{format(key, pricing[key])}</dd>
        </div>
      ))}
    </dl>
  );
}
function PackagePreview({ id }) {
  const state = useVendorData(`/services/${id}/packages`);
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  return state.data.length ? (
    <div className="grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[20px] service-tablet:grid-cols-[repeat(2,_minmax(0,_1fr))] service-mobile:grid-cols-[1fr]">
      {state.data.map((p) => (
        <article
          className="
          p-[25px] [background:#fff] [border-top:1px_solid_var(--sm-border)]
          [border-right:1px_solid_var(--sm-border)] [border-bottom:1px_solid_var(--sm-border)]
          [border-left:1px_solid_var(--sm-border)] rounded-[12px] [&_>_.vw-badge]:[float:right]
          [&_h2]:text-[19px] [&_h2]:mt-[20px] [&_p]:min-h-[40px] [&_>_.sm-row-actions]:mt-[20px]
          [&_>_.sm-row-actions]:pt-[20px] [&_>_.sm-row-actions]:[border-top:1px_solid_var(--sm-border)]
        "
          key={p.id}
        >
          <h3>{p.name}</h3>
          <p>{p.description}</p>
          <strong>{money(p.finalPrice)}</strong>
          {Number(p.discount) > 0 && (
            <p>
              <s>{money(p.price)}</s> · {p.discount}% discount
            </p>
          )}
          <p>
            {p.minimumGuests ?? "Any"}–{p.maximumGuests ?? "Any"} guests
          </p>
          <p>{p.active ? "Active" : "Inactive"}</p>
          <h4>Included items</h4>
          {p.items?.length ? (
            <ul>
              {p.items.map((item, index) => (
                <li key={index}>
                  {item.name} · {item.quantity} {item.unit}
                  {item.description && ` · ${item.description}`}
                </li>
              ))}
            </ul>
          ) : (
            <p>No included items.</p>
          )}
          <h4>Optional items</h4>
          <p>{p.optionalItems || "None specified"}</p>
          {p.terms && <p>{p.terms}</p>}
          <Link to={`/vendor/packages/${p.id}/edit`}>View package details</Link>
        </article>
      ))}
    </div>
  ) : (
    <p>No packages added.</p>
  );
}
function AvailabilityPreview({ id }) {
  const state = useVendorData(`/services/${id}/availability`);
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  const rows = state.data.filter(
    (row) => String(row.date).slice(0, 10) >= today(),
  );
  return (
    <details>
      <summary>{rows.length} upcoming date overrides</summary>
      {rows.length ? (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              {date(row.date)} · {row.status}
              {row.startTime &&
                ` · ${String(row.startTime).match(/(?:T|^)(\d{2}:\d{2})/)?.[1]}–${String(row.endTime).match(/(?:T|^)(\d{2}:\d{2})/)?.[1]}`}
              {row.notes && ` · ${row.notes}`}
            </li>
          ))}
        </ul>
      ) : (
        <p>No blocked dates or custom timings.</p>
      )}
    </details>
  );
}
export function ServicePreview({
  service: s,
  category,
  vendorName,
  categoryFields = [],
}) {
  return (
    <div
      className="
      [&_h2]:text-[25px] [&_h3]:mt-[25px] [&_h3]:mb-[10px] [&_p]:leading-[1.9] [&_ul]:pl-[20px]
      [&_ul]:[list-style:disc] [&_ul]:text-[#72866a] service-mobile:[&_h2]:text-[21px]
    "
    >
      <div
        className="
        grid grid-cols-[2fr_1fr_1fr] gap-[10px] mb-[25px] [&_img]:w-[100%] [&_img]:h-[220px]
        [&_img]:rounded-[10px] [&_img]:object-cover [&_img:nth-child(n_+_4)]:hidden
        service-mobile:grid-cols-[2fr_1fr] service-mobile:[&_img]:h-[150px]
        service-mobile:[&_img:nth-child(3)]:hidden
      "
      >
        {s.images?.length ? (
          s.images
            .slice(0, 4)
            .map((image, i) => (
              <img
                key={image.id || i}
                src={image.url}
                alt={`${s.name} ${i + 1}`}
                loading="lazy"
              />
            ))
        ) : (
          <div className="h-[200px] [background:#f0f5eb] grid place-items-center col-[1/-1] rounded-[10px] text-[#9bac8e]">
            Your service images will appear here
          </div>
        )}
      </div>
      {!!s.images?.length && (
        <details>
          <summary>View all {s.images.length} images</summary>
          <div className="grid grid-cols-[repeat(auto-fill,_minmax(120px,_1fr))] gap-[10px] [margin:16px_0] [&_img]:w-[100%] [&_img]:h-[120px] [&_img]:object-cover [&_img]:rounded-[8px]">
            {s.images.map((image, index) => (
              <a
                key={image.id || index}
                href={image.url}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={image.url}
                  alt={`${s.name} image ${index + 1}${image.primary ? " (primary)" : ""}`}
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </details>
      )}
      <span className="inline-block [padding:5px_10px] [background:#edf4e9] text-[#4c7254] text-[10px] rounded-[5px] mb-[20px]">
        {category || "Service"}
      </span>
      <h2>{s.name || "Your service name"}</h2>
      <p>
        {vendorName && `By ${vendorName} · `}
        {s.location?.city || "Location not set"}
        {s.location?.state && `, ${s.location.state}`}
      </p>
      <p className="sm-lead">{s.shortDescription}</p>
      <div
        className="
        p-[25px] [background:#f3f7ef] [border-top:1px_solid_#e1e8d9] [border-right:1px_solid_#e1e8d9]
        [border-bottom:1px_solid_#e1e8d9] [border-left:1px_solid_#e1e8d9] rounded-[10px] [margin:24px_0]
        [&_>_span]:block [&_>_span]:text-[10px] [&_>_span]:tracking-[1px] [&_>_span]:text-[#8d9b80]
        [&_>_strong]:block [&_>_strong]:text-[32px] [&_>_strong]:font-semibold [&_>_strong]:text-[#3c6348]
        [&_>_strong]:[margin:5px_0] [&_p]:max-w-[680px] [&_p]:leading-[1.8] [&_p]:[margin:8px_0_0]
        service-mobile:p-[18px]
      "
      >
        <span>STARTING FROM</span>
        <strong>{money(s.price)}</strong>
        <span>{s.pricing?.unit}</span>
      </div>
      <h3>About this service</h3>
      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
        {s.description || "Add a detailed description."}
      </p>
      <h3>Category details</h3>
      <dl
        className="
        grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_dt]:text-[10px] [&_dt]:capitalize
        [&_dt]:text-[#99a58d] [&_dt]:mb-[6px] [&_dd]:m-[0] [&_dd]:text-[#54704d]
        [&_dd]:[overflow-wrap:anywhere] service-mobile:grid-cols-[1fr]
      "
      >
        {Object.entries(s.attributes || {}).map(([key, value]) => (
          <div key={key}>
            <dt>
              {categoryFields.find((field) => field.key === key)?.label ||
                key.replace(/([A-Z])/g, " $1")}
            </dt>
            <dd>
              {typeof value === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : String(value ?? "Not set")}
            </dd>
          </div>
        ))}
      </dl>
      <h3>Pricing details</h3>
      <OfferReview offer={s.offer} />
      {!s.offer && <PricingDetails pricing={s.pricing} />}
      <h3>Included items</h3>
      {s.items?.length ? (
        <ul>
          {s.items.map((i, n) => (
            <li key={i.id || n}>
              {i.name} · {i.quantity} {i.unit}{" "}
              {i.included ? "(Included)" : `(Optional · ${money(i.price)})`}
            </li>
          ))}
        </ul>
      ) : (
        <p>No items added.</p>
      )}
      <h3>Packages</h3>
      {s.id ? (
        <PackagePreview id={s.id} />
      ) : (
        <p>Save your service draft to add packages.</p>
      )}
      <h3>Availability</h3>
      <p>
        {(s.availability?.days || [])
          .map(
            (d) =>
              [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ][d],
          )
          .join(", ")}{" "}
        · {s.availability?.start}–{s.availability?.end}
      </p>
      <p>
        Future dates can be requested unless blocked or booked ·{" "}
        {s.availability?.noticeHours} hours’ notice
      </p>
      {s.id && <AvailabilityPreview id={s.id} />}
      <h3>Location</h3>
      <p>
        {[
          s.location?.address,
          s.location?.city,
          s.location?.state,
          s.location?.country,
          s.location?.zip,
        ]
          .filter(Boolean)
          .join(", ")}{" "}
        · {s.location?.mode}
      </p>
      <h3>Policies</h3>
      {[
        ["cancellation", "Cancellation"],
        ["refund", "Refunds"],
        ["rescheduling", "Rescheduling"],
        ["terms", "Terms"],
      ].map(([k, l]) => (
        <div key={k}>
          <strong>{l}</strong>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
            {s.policies?.[k] || "Not specified"}
          </p>
        </div>
      ))}
      <p>
        Advance payment:{" "}
        {s.policies?.advanceRequired
          ? `${s.policies.advancePercentage}%`
          : "Not required"}{" "}
        · Travel: {money(s.policies?.travelCharges)} · Setup:{" "}
        {s.policies?.setupTime || 0} min · Duration: {s.policies?.duration || 0}{" "}
        min
      </p>
      <p>{s.policies?.additionalCharges}</p>
      <h3>Customer reviews</h3>
      <p>Verified customer ratings will appear after completed bookings.</p>
    </div>
  );
}
function Chart({ title, rows, metric }) {
  const values = rows.map((r) => Number(r[metric] || 0)),
    max = Math.max(1, ...values),
    w = 500,
    h = 125;
  const points = values
    .map(
      (v, i) =>
        `${values.length === 1 ? w / 2 : 10 + (i * (w - 20)) / (values.length - 1)},${h - 10 - (v / max) * (h - 25)}`,
    )
    .join(" ");
  return (
    <section
      className="
      p-[20px] [border-top:1px_solid_var(--sm-border)] [border-right:1px_solid_var(--sm-border)]
      [border-bottom:1px_solid_var(--sm-border)] [border-left:1px_solid_var(--sm-border)] rounded-[10px]
      [&_svg]:w-[100%] [&_svg]:mt-[20px]
    "
    >
      <h3>{title}</h3>
      {rows.length ? (
        <>
          <svg
            viewBox={`0 0 ${w} ${h}`}
            role="img"
            aria-label={`${title}, last 90 days. Total ${values.reduce((a, b) => a + b, 0)}`}
          >
            <line x1="0" y1={h - 10} x2={w} y2={h - 10} stroke="#e2e9e2" />
            <polyline
              points={points}
              fill="none"
              stroke="#39775c"
              strokeWidth="3"
            />
            {values.length === 1 && (
              <circle
                cx={w / 2}
                cy={h - 10 - (values[0] / max) * (h - 25)}
                r="4"
                fill="#39775c"
              />
            )}
          </svg>
          <div className="flex justify-between text-[10px] text-[#99a58e]">
            <span>{date(rows[0].date)}</span>
            <span>{date(rows.at(-1).date)}</span>
          </div>
        </>
      ) : (
        <p>No recorded activity in the last 90 days.</p>
      )}
    </section>
  );
}
function Performance({ id }) {
  const state = useVendorData(`/services/${id}/performance`);
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  const d = state.data;
  return (
    <>
      <div
        className="
        grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-[14px] [margin:24px_0]
        service-wide:grid-cols-[repeat(8,_minmax(0,_1fr))]
        service-mobile:grid-cols-[repeat(2,_minmax(0,_1fr))] service-mobile:gap-[10px]
      "
      >
        {[
          ["views", "Total Views", Eye],
          ["enquiries", "Total Enquiries", MessageCircle],

          ["bookings", "Total Bookings", CalendarCheck],
          ["completedBookings", "Completed Bookings", CalendarCheck],
          ["conversionRate", "Conversion Rate", TrendingUp],
          ["revenue", "Revenue", IndianRupee],
          ["averageRating", "Average Rating", Star],
          ["reviewCount", "Review Count", Star],
        ].map(([key, label, Icon]) => (
          <div
            className="
            [background:#fff] [border-top:1px_solid_var(--sm-border)] [border-right:1px_solid_var(--sm-border)]
            [border-bottom:1px_solid_var(--sm-border)] [border-left:1px_solid_var(--sm-border)] rounded-[12px]
            p-[20px] flex items-center gap-[15px] [&_div]:flex [&_div]:flex-col [&_div]:gap-[5px]
            [&_div_>_span]:text-[11px] [&_div_>_span]:text-[#7c8b7e] [&_strong]:text-[25px]
            [&_strong]:leading-[1.3] [&_strong]:font-semibold [&_strong]:tabular-nums
            service-wide:[padding:18px_13px] service-wide:gap-[10px] service-wide:[&_strong]:text-[23px]
            service-mobile:p-[14px] service-mobile:gap-[10px] service-mobile:[&_strong]:text-[22px]
            service-mobile:[&_div_>_span]:text-[10px]
          "
            key={key}
          >
            <Icon size={20} />
            <div>
              <span>{label}</span>
              <strong>
                {key === "revenue"
                  ? money(d[key])
                  : key === "conversionRate"
                    ? `${d[key]}%`
                    : (d[key] ?? "—")}
              </strong>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[#8f9c84] text-[11px]">
        Conversion = bookings ÷ recorded views. Revenue is the completed booking
        line value. Charts show the last 90 days.
      </p>
      <div className="grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] service-mobile:grid-cols-[1fr]">
        <Chart title="Views" rows={d.metrics} metric="views" />
        <Chart title="Enquiries" rows={d.metrics} metric="enquiries" />
        <Chart title="Bookings" rows={d.series} metric="bookings" />
        <Chart title="Revenue" rows={d.series} metric="revenue" />
      </div>
    </>
  );
}
function History({ id, kind }) {
  const state = useVendorData(`/services/${id}/${kind}`);
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  return state.data?.rows?.length ? (
    <>
      <div
        className="
        grid gap-[12px] p-[20px] [&_article]:p-[15px] [&_article]:[border-top:1px_solid_var(--sm-border)]
        [&_article]:[border-right:1px_solid_var(--sm-border)]
        [&_article]:[border-bottom:1px_solid_var(--sm-border)]
        [&_article]:[border-left:1px_solid_var(--sm-border)] [&_article]:rounded-[9px]
      "
      >
        {state.data.rows.map((r, i) => (
          <article key={r.id || i}>
            <strong>{r.name || `★ ${r.rating}`}</strong>
            <p>{r.status || r.comment}</p>
            <small>{date(r.createdAt)}</small>
          </article>
        ))}
      </div>
      <p>Showing the latest 50 records.</p>
    </>
  ) : (
    <Empty
      title={`No ${kind} yet`}
      text="Records will appear as customers interact with this service."
    />
  );
}
export default function ServiceDetails() {
  const { id } = useParams(),
    [version, setVersion] = useState(0),
    [tab, setTab] = useState("Overview"),
    [notice, setNotice] = useState("");
  const state = useVendorData(`/services/${id}`, version),
    metadata = useVendorData("/services/metadata");
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  const s = state.data;
  const category = metadata.data?.categories?.find(
    (c) => c.id === s.categoryId,
  )?.name;
  const reviewing = ["Pending", "UnderReview"].includes(s.status);
  const selectTab = (next) => {
    setTab(next);
    requestAnimationFrame(() => {
      document
        .getElementById(`service-tab-${next.replaceAll(" ", "-")}`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };
  return (
    <div
      className="
      service-details [--sd-ink:#253f34] [--sd-muted:#68796e] [--sd-green:#285c45] [--sd-border:#e1e7df] text-[color:var(--sd-ink)] [&_:is(button,_a)]:[-webkit-tap-highlight-color:transparent] [&_button]:cursor-pointer [&_:is(button,_a):focus-visible]:outline-[2px] [&_:is(button,_a):focus-visible]:outline-[#397455] [&_:is(button,_a):focus-visible]:outline-offset-[4px] [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-45 [&_.sd-tab-panel_>_header]:pt-[22px] [&_.sd-tab-panel_>_header]:px-[25px] [&_.sd-tab-panel_>_header]:pb-[17px] [&_.sd-tab-panel_>_header]:border-b [&_.sd-tab-panel_>_header]:border-b-[#e9ede4] [&_.sd-tab-panel_>_header_h2]:font-serif [&_.sd-tab-panel_>_header_h2]:text-[23px] [&_.sd-tab-panel_>_header_h2]:font-normal [&_.sd-tab-panel_:is(dt,_dd,_p)]:text-[12px] [&_.sd-tab-panel_dt]:text-[#6f7d68] [&_.sd-tab-panel_dd]:text-[#3e5a44] [--sm-accent:#2d604b] [--sm-border:#e2e8df] max-w-[1700px] m-[auto] w-full
      [&_button:disabled]:opacity-[0.45] [&_button:disabled]:cursor-not-allowed
      [&_:focus-visible]:[outline:2px_solid_#397455] [&_:focus-visible]:[outline-offset:3px]
    "
    >
      <nav
        className="sd-breadcrumb flex items-center gap-[14px] mb-[25px] text-[12px] text-[#6b786e] [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[8px] [&_a]:text-[#3f6350] [&_a:hover]:text-[#173c2c] [&_>_span:first-of-type]:text-[#b1bcb0] max-[760.001px]:mb-[21px] max-[760.001px]:text-[11px]"
        aria-label="Breadcrumb"
      >
        <Link to="/vendor/services">
          <ArrowLeft size={15} /> All services
        </Link>
        <span aria-hidden="true">/</span>
        <span>Service details</span>
      </nav>
      <header className="sd-page-header flex items-center justify-between gap-[24px] mb-[25px] max-[1150.001px]:flex-wrap max-[1150.001px]:gap-[18px] max-[760.001px]:mb-[20px]">
        <div className="sd-page-title min-w-0">
          <span className="sd-eyebrow text-[10px] font-semibold tracking-[1.8px] text-[#73816e]">
            SERVICE MANAGEMENT
          </span>
          <div className="sd-title-row flex items-center flex-wrap gap-[15px] mt-[7px] mx-0 mb-[11px] [&_h1]:m-0 [&_h1]:font-serif [&_h1]:text-[clamp(28px,_3vw,_40px)] [&_h1]:font-normal [&_h1]:leading-[1.18] [&_h1]:tracking-[-1.1px] [&_h1]:wrap-anywhere [&_.vw-badge]:py-[5px] [&_.vw-badge]:px-[10px] [&_.vw-badge]:border [&_.vw-badge]:border-[#e1e5d9] [&_.vw-badge]:rounded-[20px] [&_.vw-badge]:text-[10px] [&_.vw-badge]:text-[#6c7553] [&_.vw-badge]:bg-[#f0f2e7] [&_.vw-badge-adminreview]:border-[#eddfb9] [&_.vw-badge-adminreview]:text-[#846327] [&_.vw-badge-adminreview]:bg-[#faf3e3] [&_.vw-badge-pendingapproval]:border-[#eddfb9] [&_.vw-badge-pendingapproval]:text-[#846327] [&_.vw-badge-pendingapproval]:bg-[#faf3e3] [&_.vw-badge::before]:content-[''] [&_.vw-badge::before]:w-[5px] [&_.vw-badge::before]:h-[5px] [&_.vw-badge::before]:rounded-[50%] [&_.vw-badge::before]:mr-[6px] [&_.vw-badge::before]:bg-current max-[760.001px]:gap-[11px] max-[480.001px]:[&_h1]:text-[32px]">
            <h1>{s.name}</h1>
            <Status status={s.status} active={s.active} />
          </div>
          <div className="sd-meta flex items-center flex-wrap gap-y-[8px] gap-x-[19px] text-[color:var(--sd-muted)] text-[12px] [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[6px] [&_svg]:text-[#81907d] max-[760.001px]:text-[11px] max-[760.001px]:gap-y-[7px] max-[760.001px]:gap-x-[12px] max-[480.001px]:[&_>_span:last-child]:[flex-basis:100%]">
            <span>
              <LayoutGrid size={14} />
              {category || "Service"}
            </span>
            {s.location?.city && (
              <span>
                <MapPin size={14} />
                {s.location.city}
              </span>
            )}
            <span>
              <Clock3 size={14} /> Updated {date(s.updatedAt)}
            </span>
          </div>
        </div>
        <div className="sd-header-actions flex items-center gap-[9px] shrink-0 [&_[role='group']_>_:is(a,_button)]:w-[39px] [&_[role='group']_>_:is(a,_button)]:h-[39px] [&_[role='group']_>_:is(a,_button)]:rounded-[8px] [&_[role='group']_>_span_>_button]:w-[39px] [&_[role='group']_>_span_>_button]:h-[39px] [&_[role='group']_>_span_>_button]:rounded-[8px] max-[760.001px]:w-full max-[760.001px]:justify-between">
          <ServiceActions
            service={s}
            onChange={(r) => {
              setNotice(r.message);
              setVersion((v) => v + 1);
            }}
          />
          <Link
            className="sd-button inline-flex items-center justify-center gap-[9px] min-h-[40px] py-[10px] px-[15px] border border-[color:var(--sd-border)] rounded-[8px] bg-white text-[color:var(--sd-green)] text-[12px] font-medium no-underline [transition:background_0.15s,_border-color_0.15s] [&:hover]:bg-[#edf4ee] [&:hover]:border-[#a5bba9] sd-button-primary [&.sd-button-primary]:bg-[color:var(--sd-green)] [&.sd-button-primary]:border-[color:var(--sd-green)] [&.sd-button-primary]:text-white [&.sd-button-primary:hover]:bg-[#1c4733] [&.sd-button-primary:hover]:border-[#1c4733] [&.sd-button-primary:hover]:text-white"
            to={`/vendor/services/${id}/availability`}
          >
            <CalendarDays size={16} /> Availability <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <Notice message={notice} />
      {reviewing && (
        <div className="sd-review-banner flex items-center gap-[14px] mb-[26px] py-[16px] px-[19px] border border-[#e9e1cc] rounded-[11px] bg-[#fbf8f0] text-[#74613b] [&_strong]:text-[12px] [&_strong]:font-semibold [&_p]:mt-[3px] [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[#7b725f] [&_p]:text-[12px] [&_p]:leading-[1.6] [&_>_.sd-text-button]:shrink-0 [&_>_.sd-text-button]:ml-auto [&_>_.sd-text-button]:text-[#7d6533] max-[760.001px]:p-[14px] max-[760.001px]:gap-[10px] max-[760.001px]:flex-wrap max-[760.001px]:mb-[20px] max-[760.001px]:[&_>_div]:flex-1 max-[760.001px]:[&_>_div]:min-w-[170px] max-[760.001px]:[&_p]:text-[11px] max-[760.001px]:[&_>_.sd-text-button]:ml-[49px] max-[760.001px]:[&_>_.sd-text-button]:text-[11px]">
          <span className="sd-review-icon grid place-items-center w-[39px] h-[39px] rounded-[11px] shrink-0 bg-[#f1ead7] text-[#9b7a36]">
            <ShieldCheck size={20} />
          </span>
          <div>
            <strong>
              {s.status === "UnderReview"
                ? "Your service is under review"
                : "Your service is awaiting approval"}
            </strong>
            <p>
              {s.status === "UnderReview"
                ? "Our team is reviewing your listing. Follow its progress and feedback in approval history."
                : "Your listing has been submitted. Follow its progress and feedback in approval history."}
            </p>
          </div>
          <button
            type="button"
            className="sd-text-button inline-flex items-center justify-start gap-[6px] py-[3px] px-0 border-0 bg-transparent text-[color:var(--sd-green)] text-[12px] font-medium text-left leading-[1.5] [&:hover]:text-[#142f21] [&:hover]:underline [&:hover]:underline-offset-[4px]"
            onClick={() => selectTab("Approval History")}
          >
            Track progress <ArrowUpRight size={15} />
          </button>
        </div>
      )}
      {s.status === "Rejected" && (
        <div
          className="
          rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fcf0ed]
          [border-top:1px_solid_#efd4cd] [border-right:1px_solid_#efd4cd] [border-bottom:1px_solid_#efd4cd]
          [border-left:1px_solid_#efd4cd] text-[#9d5348] [&_p]:text-[inherit]! [&_.vw-button]:inline-flex
          [&_.vw-button]:m-[10px]
        "
        >
          <h2>Service Rejected</h2>
          <strong>Rejection Reason</strong>
          <p>{s.rejectionReason || "Contact support for the review reason."}</p>
          <strong>Admin Note</strong>
          <p>{s.adminNote || "—"}</p>
          <small>Rejected {date(s.rejectedAt)}</small>
          <Link
            to={`/vendor/services/${id}/edit`}
            className="
            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
          "
          >
            Edit & Resubmit
          </Link>
        </div>
      )}
      <div
        className="sd-tabs flex items-stretch gap-[25px] mb-[25px] py-0 px-[20px] overflow-x-auto border border-[color:var(--sd-border)] rounded-[11px] bg-white [scrollbar-width:thin] [scrollbar-color:#bdcdbb_transparent] [&_>_button]:inline-flex [&_>_button]:items-center [&_>_button]:justify-center [&_>_button]:gap-[7px] [&_>_button]:shrink-0 [&_>_button]:relative [&_>_button]:min-h-[58px] [&_>_button]:py-0 [&_>_button]:px-[1px] [&_>_button]:border-0 [&_>_button]:border-b-[2px] [&_>_button]:border-b-[transparent] [&_>_button]:bg-transparent [&_>_button]:text-[#6c7b6e] [&_>_button]:text-[12px] [&_>_button]:font-medium [&_>_button]:whitespace-nowrap [&_>_button:hover]:text-[color:var(--sd-green)] [&_>_button.selected]:text-[color:var(--sd-green)] [&_>_button.selected]:[border-bottom-color:var(--sd-green)] [&_>_button.selected]:font-semibold [&_>_button:focus-visible]:outline-offset-[-6px] [&_>_button:focus-visible]:rounded-[5px] max-[1150.001px]:gap-[22px] max-[760.001px]:mb-[21px] max-[760.001px]:py-0 max-[760.001px]:px-[15px] max-[760.001px]:gap-[23px] max-[760.001px]:[&_>_button]:min-h-[51px] max-[760.001px]:[&_>_button]:text-[11px]"
        role="tablist"
        aria-label="Service management sections"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const tabs = [
            ...event.currentTarget.querySelectorAll('[role="tab"]'),
          ];
          const index = tabs.indexOf(document.activeElement);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : (index +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    tabs.length) %
                  tabs.length;
          tabs[next].click();
          tabs[next].focus();
        }}
      >
        {[
          "Overview",
          "Approval History",
          "Information",
          "Pricing",
          "Service Items",
          "Packages",
          "Images",
          "Location",
          "Availability",
          "Policies",
          "Bookings",
          "Reviews",
          "Performance",
        ].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`service-tab-${t.replaceAll(" ", "-")}`}
            aria-selected={tab === t}
            aria-controls="service-details-panel"
            tabIndex={tab === t ? 0 : -1}
            className={tab === t ? "selected" : ""}
            onClick={() => selectTab(t)}
          >
            {t === "Overview" && <LayoutGrid size={15} />}
            {t}
          </button>
        ))}
      </div>
      <div
        id="service-details-panel"
        role="tabpanel"
        aria-labelledby={`service-tab-${tab.replaceAll(" ", "-")}`}
        tabIndex={0}
      >
        {tab === "Overview" ? (
          <ServiceOverview
            service={s}
            category={category}
            vendorName={metadata.data?.vendorName}
            categoryFields={metadata.data?.templates?.[category] || []}
            onTabChange={selectTab}
          />
        ) : (
          <Panel title={tab} className="sd-tab-panel">
            {tab === "Information" && (
              <div className="p-[25px] service-mobile:p-[18px]">
                <dl
                  className="
              grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_dt]:text-[10px] [&_dt]:capitalize
              [&_dt]:text-[#99a58d] [&_dt]:mb-[6px] [&_dd]:m-[0] [&_dd]:text-[#54704d]
              [&_dd]:[overflow-wrap:anywhere] service-mobile:grid-cols-[1fr]
            "
                >
                  {[
                    ["Service ID", s.id],
                    ["Service name", s.name],
                    [
                      "Category",
                      metadata.data?.categories.find(
                        (c) => c.id === s.categoryId,
                      )?.name,
                    ],
                    [
                      "Subcategory",
                      metadata.data?.subcategories.find(
                        (c) => c.id === s.subcategoryId,
                      )?.name,
                    ],
                    ["Service type", s.serviceType],
                    ["Description", s.description],
                    ["Approval status", s.status],
                    ["Active status", s.active ? "Active" : "Inactive"],
                    ["Created", date(s.createdAt)],
                    ["Updated", date(s.updatedAt)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {tab === "Approval History" && (
              <div className="p-[25px] service-mobile:p-[18px]">
                <ApprovalTimeline rows={s.approvalHistory} />
              </div>
            )}
            {tab === "Pricing" && (
              <div className="p-[25px] service-mobile:p-[18px]">
                <OfferReview offer={s.offer} />
                {!s.offer && <PricingDetails pricing={s.pricing} />}
                <div
                  className="
              p-[25px] [background:#f3f7ef] [border-top:1px_solid_#e1e8d9] [border-right:1px_solid_#e1e8d9]
              [border-bottom:1px_solid_#e1e8d9] [border-left:1px_solid_#e1e8d9] rounded-[10px] [margin:24px_0]
              [&_>_span]:block [&_>_span]:text-[10px] [&_>_span]:tracking-[1px] [&_>_span]:text-[#8d9b80]
              [&_>_strong]:block [&_>_strong]:text-[32px] [&_>_strong]:font-semibold [&_>_strong]:text-[#3c6348]
              [&_>_strong]:[margin:5px_0] [&_p]:max-w-[680px] [&_p]:leading-[1.8] [&_p]:[margin:8px_0_0]
              service-mobile:p-[18px]
            "
                >
                  <span>SERVER-CALCULATED STARTING PRICE</span>
                  <strong>{money(s.price)}</strong>
                </div>
              </div>
            )}
            {tab === "Service Items" && (
              <div className="p-[25px] service-mobile:p-[18px]">
                {s.items.length ? (
                  <div
                    className="
                grid gap-[12px] p-[20px] [&_article]:p-[15px] [&_article]:[border-top:1px_solid_var(--sm-border)]
                [&_article]:[border-right:1px_solid_var(--sm-border)]
                [&_article]:[border-bottom:1px_solid_var(--sm-border)]
                [&_article]:[border-left:1px_solid_var(--sm-border)] [&_article]:rounded-[9px]
              "
                  >
                    {s.items.map((i) => (
                      <article key={i.id}>
                        <strong>{i.name}</strong>
                        <p>{i.description}</p>
                        <span>
                          {i.quantity} {i.unit} · {money(i.price)} ·{" "}
                          {i.included ? "Included" : "Optional"}
                        </span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty title="No items added" />
                )}
                {s.actions.edit && (
                  <Link
                    className="
                  vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                  [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                  rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                  font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                  [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                  [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                  [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                  [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                "
                    to={`/vendor/services/${id}/edit?step=3`}
                  >
                    Manage Items
                  </Link>
                )}
              </div>
            )}
            {tab === "Images" && (
              <div className="p-[25px] service-mobile:p-[18px]">
                <MediaManager
                  id={id}
                  disabled={!s.actions.edit}
                  onChanged={() => setVersion((v) => v + 1)}
                />
              </div>
            )}
            {tab === "Packages" && (
              <div className="p-[25px] service-mobile:p-[18px]">
                <p>
                  Create flexible packages for different celebrations and
                  budgets.
                </p>
                <Link
                  className="
                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                vw-primary
              "
                  to={`/vendor/services/${id}/packages`}
                >
                  Manage Packages
                </Link>
              </div>
            )}
            {tab === "Availability" && (
              <div className="p-[25px] service-mobile:p-[18px]">
                <p>
                  Manage working days, custom timings, holidays and blocked
                  dates.
                </p>
                <Link
                  className="
                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
              "
                  to={`/vendor/services/${id}/availability`}
                >
                  Open service calendar
                </Link>
              </div>
            )}
            {tab === "Location" && (
              <div className="p-[25px] service-mobile:p-[18px]">
                <MapPin />
                <p>
                  {Object.values(s.location || {})
                    .filter((v) => v !== null)
                    .join(" · ")}
                </p>
              </div>
            )}
            {tab === "Policies" && (
              <dl
                className="
            grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_dt]:text-[10px] [&_dt]:capitalize
            [&_dt]:text-[#99a58d] [&_dt]:mb-[6px] [&_dd]:m-[0] [&_dd]:text-[#54704d]
            [&_dd]:[overflow-wrap:anywhere] service-mobile:grid-cols-[1fr] p-[25px] service-mobile:p-[18px]
          "
              >
                {Object.entries(s.policies || {}).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k.replace(/([A-Z])/g, " $1")}</dt>
                    <dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {typeof v === "boolean"
                        ? v
                          ? "Yes"
                          : "No"
                        : v || "Not specified"}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {["Bookings", "Reviews"].includes(tab) && (
              <History id={id} kind={tab.toLowerCase()} />
            )}
            {tab === "Performance" && (
              <div className="p-[25px] service-mobile:p-[18px]">
                <Performance id={id} />
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
