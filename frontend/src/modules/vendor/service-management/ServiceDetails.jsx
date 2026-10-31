import ApprovalTimeline from "../../../components/common/ApprovalTimeline";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapPin,
  Star,
  ArrowLeft,
  Eye,
  CalendarCheck,
  IndianRupee,
  MessageCircle,
  FileText,
  TrendingUp,
} from "lucide-react";
import {
  Heading,
  Panel,
  Loading,
  ErrorView,
  Empty,
  useVendorData,
} from "../components/WorkspaceUI";
import { date, money, today } from "../services/workspace.api";
import { Notice, ServiceActions, Status } from "./shared";
import MediaManager from "./MediaManager";
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
    ["customQuote", "Custom quotation available"],
  ];
  const types = {
    Fixed: "Fixed price",
    PerPerson: "Per person",
    PerHour: "Hourly",
    PerDay: "Daily",
    PerItem: "Per item",
    CustomQuote: "Custom quote",
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
        ? "Custom Quote"
        : value === "Per KM"
          ? "Per Kilometer"
          : value;
    return value;
  };
  return (
    <dl className="
      grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_dt]:text-[10px] [&_dt]:capitalize
      [&_dt]:text-[#99a58d] [&_dt]:mb-[6px] [&_dd]:m-[0] [&_dd]:text-[#54704d]
      [&_dd]:[overflow-wrap:anywhere] service-mobile:grid-cols-[1fr]
    ">
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
        <article className="
          p-[25px] [background:#fff] [border-top:1px_solid_var(--sm-border)]
          [border-right:1px_solid_var(--sm-border)] [border-bottom:1px_solid_var(--sm-border)]
          [border-left:1px_solid_var(--sm-border)] rounded-[12px] [&_>_.vw-badge]:[float:right]
          [&_h2]:text-[19px] [&_h2]:mt-[20px] [&_p]:min-h-[40px] [&_>_.sm-row-actions]:mt-[20px]
          [&_>_.sm-row-actions]:pt-[20px] [&_>_.sm-row-actions]:[border-top:1px_solid_var(--sm-border)]
        " key={p.id}>
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
    <div className="
      [&_h2]:text-[25px] [&_h3]:mt-[25px] [&_h3]:mb-[10px] [&_p]:leading-[1.9] [&_ul]:pl-[20px]
      [&_ul]:[list-style:disc] [&_ul]:text-[#72866a] service-mobile:[&_h2]:text-[21px]
    ">
      <div className="
        grid grid-cols-[2fr_1fr_1fr] gap-[10px] mb-[25px] [&_img]:w-[100%] [&_img]:h-[220px]
        [&_img]:rounded-[10px] [&_img]:object-cover [&_img:nth-child(n_+_4)]:hidden
        service-mobile:grid-cols-[2fr_1fr] service-mobile:[&_img]:h-[150px]
        service-mobile:[&_img:nth-child(3)]:hidden
      ">
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
      <span className="inline-block [padding:5px_10px] [background:#edf4e9] text-[#4c7254] text-[10px] rounded-[5px] mb-[20px]">{category || "Service"}</span>
      <h2>{s.name || "Your service name"}</h2>
      <p>
        {vendorName && `By ${vendorName} · `}
        {s.location?.city || "Location not set"}
        {s.location?.state && `, ${s.location.state}`}
      </p>
      <p className="sm-lead">{s.shortDescription}</p>
      <div className="
        p-[25px] [background:#f3f7ef] [border-top:1px_solid_#e1e8d9] [border-right:1px_solid_#e1e8d9]
        [border-bottom:1px_solid_#e1e8d9] [border-left:1px_solid_#e1e8d9] rounded-[10px] [margin:24px_0]
        [&_>_span]:block [&_>_span]:text-[10px] [&_>_span]:tracking-[1px] [&_>_span]:text-[#8d9b80]
        [&_>_strong]:block [&_>_strong]:text-[32px] [&_>_strong]:font-semibold [&_>_strong]:text-[#3c6348]
        [&_>_strong]:[margin:5px_0] [&_p]:max-w-[680px] [&_p]:leading-[1.8] [&_p]:[margin:8px_0_0]
        service-mobile:p-[18px]
      ">
        <span>STARTING FROM</span>
        <strong>{money(s.price)}</strong>
        <span>{s.pricing?.unit}</span>
      </div>
      <h3>About this service</h3>
      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
        {s.description || "Add a detailed description."}
      </p>
      <h3>Category details</h3>
      <dl className="
        grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_dt]:text-[10px] [&_dt]:capitalize
        [&_dt]:text-[#99a58d] [&_dt]:mb-[6px] [&_dd]:m-[0] [&_dd]:text-[#54704d]
        [&_dd]:[overflow-wrap:anywhere] service-mobile:grid-cols-[1fr]
      ">
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
      <PricingDetails pricing={s.pricing} />
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
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{s.policies?.[k] || "Not specified"}</p>
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
    <section className="
      p-[20px] [border-top:1px_solid_var(--sm-border)] [border-right:1px_solid_var(--sm-border)]
      [border-bottom:1px_solid_var(--sm-border)] [border-left:1px_solid_var(--sm-border)] rounded-[10px]
      [&_svg]:w-[100%] [&_svg]:mt-[20px]
    ">
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
      <div className="
        grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-[14px] [margin:24px_0]
        service-wide:grid-cols-[repeat(9,_minmax(0,_1fr))]
        service-mobile:grid-cols-[repeat(2,_minmax(0,_1fr))] service-mobile:gap-[10px]
      ">
        {[
          ["views", "Total Views", Eye],
          ["enquiries", "Total Enquiries", MessageCircle],
          ["quotations", "Total Quotations", FileText],
          ["bookings", "Total Bookings", CalendarCheck],
          ["completedBookings", "Completed Bookings", CalendarCheck],
          ["conversionRate", "Conversion Rate", TrendingUp],
          ["revenue", "Revenue", IndianRupee],
          ["averageRating", "Average Rating", Star],
          ["reviewCount", "Review Count", Star],
        ].map(([key, label, Icon]) => (
          <div className="
            [background:#fff] [border-top:1px_solid_var(--sm-border)] [border-right:1px_solid_var(--sm-border)]
            [border-bottom:1px_solid_var(--sm-border)] [border-left:1px_solid_var(--sm-border)] rounded-[12px]
            p-[20px] flex items-center gap-[15px] [&_div]:flex [&_div]:flex-col [&_div]:gap-[5px]
            [&_div_>_span]:text-[11px] [&_div_>_span]:text-[#7c8b7e] [&_strong]:text-[25px]
            [&_strong]:leading-[1.3] [&_strong]:font-semibold [&_strong]:tabular-nums
            service-wide:[padding:18px_13px] service-wide:gap-[10px] service-wide:[&_strong]:text-[23px]
            service-mobile:p-[14px] service-mobile:gap-[10px] service-mobile:[&_strong]:text-[22px]
            service-mobile:[&_div_>_span]:text-[10px]
          " key={key}>
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
      <div className="
        grid gap-[12px] p-[20px] [&_article]:p-[15px] [&_article]:[border-top:1px_solid_var(--sm-border)]
        [&_article]:[border-right:1px_solid_var(--sm-border)]
        [&_article]:[border-bottom:1px_solid_var(--sm-border)]
        [&_article]:[border-left:1px_solid_var(--sm-border)] [&_article]:rounded-[9px]
      ">
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
  return (
    <div className="
      [--sm-accent:#2d604b] [--sm-border:#e2e8df] max-w-[1700px] m-[auto]
      [&_button:disabled]:opacity-[0.45] [&_button:disabled]:cursor-not-allowed
      [&_:focus-visible]:[outline:2px_solid_#397455] [&_:focus-visible]:[outline-offset:3px]
    ">
      <Link className="inline-flex items-center gap-[7px] text-[#5d7566] mb-[18px] text-[12px]" to="/vendor/services">
        <ArrowLeft size={15} />
        All services
      </Link>
      <Heading
        title={s.name}
        eyebrow="SERVICE MANAGEMENT"
        description={`${metadata.data?.categories.find((c) => c.id === s.categoryId)?.name || "Service"} · Updated ${date(s.updatedAt)}`}
      >
        <Status status={s.status} active={s.active} />
      </Heading>
      <Notice message={notice} />
      {s.status === "Rejected" && (
        <div className="
          rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fcf0ed]
          [border-top:1px_solid_#efd4cd] [border-right:1px_solid_#efd4cd] [border-bottom:1px_solid_#efd4cd]
          [border-left:1px_solid_#efd4cd] text-[#9d5348] [&_p]:text-[inherit]! [&_.vw-button]:inline-flex
          [&_.vw-button]:m-[10px]
        ">
          <h2>Service Rejected</h2>
          <strong>Rejection Reason</strong>
          <p>{s.rejectionReason || "Contact support for the review reason."}</p>
          <strong>Admin Note</strong>
          <p>{s.adminNote || "—"}</p>
          <small>Rejected {date(s.rejectedAt)}</small>
          <Link to={`/vendor/services/${id}/edit`} className="
            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
          ">
            Edit & Resubmit
          </Link>
        </div>
      )}
      <div className="mb-[25px] [&_.sm-row-actions]:gap-[8px] [&_.sm-row-actions_>_a]:[padding:9px_12px] [&_.sm-row-actions_>_button]:[padding:9px_12px]">
        <ServiceActions
          service={s}
          full
          onChange={(r) => {
            setNotice(r.message);
            setVersion((v) => v + 1);
          }}
        />
      </div>
      <div className="
        flex gap-[25px] [padding:0_25px] overflow-auto [border-bottom:1px_solid_var(--sm-border)]
        whitespace-nowrap [&_button]:[border-top:0] [&_button]:[border-right:0]
        [&_button]:[border-bottom:2px_solid_transparent] [&_button]:[border-left:0]
        [&_button]:[background:none] [&_button]:text-[12px] [&_button]:[padding:16px_0]
        [&_button]:text-[#8b978a] [&_button]:font-medium [&_button.selected]:text-[#2d604b]
        [&_button.selected]:[border-bottom-color:#2d604b] service-mobile:gap-[20px]
        service-mobile:[padding:0_15px] [background:white] [border-top:1px_solid_var(--sm-border)]
        [border-right:1px_solid_var(--sm-border)] [border-bottom:1px_solid_var(--sm-border)]
        [border-left:1px_solid_var(--sm-border)] rounded-[10px] mb-[20px]
      ">
        {[
          "Approval History",
          "Overview",
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
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <Panel title={tab}>
        {tab === "Information" && (
          <div className="p-[25px] service-mobile:p-[18px]">
            <dl className="
              grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_dt]:text-[10px] [&_dt]:capitalize
              [&_dt]:text-[#99a58d] [&_dt]:mb-[6px] [&_dd]:m-[0] [&_dd]:text-[#54704d]
              [&_dd]:[overflow-wrap:anywhere] service-mobile:grid-cols-[1fr]
            ">
              {[
                ["Service ID", s.id],
                ["Service name", s.name],
                [
                  "Category",
                  metadata.data?.categories.find((c) => c.id === s.categoryId)
                    ?.name,
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
        {tab === "Overview" && (
          <div className="p-[25px] service-mobile:p-[18px]">
            <ServicePreview
              service={s}
              category={
                metadata.data?.categories.find((c) => c.id === s.categoryId)
                  ?.name
              }
              vendorName={metadata.data?.vendorName}
              categoryFields={
                metadata.data?.templates[
                  metadata.data?.categories.find(
                    (category) => category.id === s.categoryId,
                  )?.name
                ] || []
              }
            />
          </div>
        )}
        {tab === "Pricing" && (
          <div className="p-[25px] service-mobile:p-[18px]">
            <PricingDetails pricing={s.pricing} />
            <div className="
              p-[25px] [background:#f3f7ef] [border-top:1px_solid_#e1e8d9] [border-right:1px_solid_#e1e8d9]
              [border-bottom:1px_solid_#e1e8d9] [border-left:1px_solid_#e1e8d9] rounded-[10px] [margin:24px_0]
              [&_>_span]:block [&_>_span]:text-[10px] [&_>_span]:tracking-[1px] [&_>_span]:text-[#8d9b80]
              [&_>_strong]:block [&_>_strong]:text-[32px] [&_>_strong]:font-semibold [&_>_strong]:text-[#3c6348]
              [&_>_strong]:[margin:5px_0] [&_p]:max-w-[680px] [&_p]:leading-[1.8] [&_p]:[margin:8px_0_0]
              service-mobile:p-[18px]
            ">
              <span>SERVER-CALCULATED STARTING PRICE</span>
              <strong>{money(s.price)}</strong>
            </div>
          </div>
        )}
        {tab === "Service Items" && (
          <div className="p-[25px] service-mobile:p-[18px]">
            {s.items.length ? (
              <div className="
                grid gap-[12px] p-[20px] [&_article]:p-[15px] [&_article]:[border-top:1px_solid_var(--sm-border)]
                [&_article]:[border-right:1px_solid_var(--sm-border)]
                [&_article]:[border-bottom:1px_solid_var(--sm-border)]
                [&_article]:[border-left:1px_solid_var(--sm-border)] [&_article]:rounded-[9px]
              ">
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
              Create flexible packages for different celebrations and budgets.
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
              Manage working days, custom timings, holidays and blocked dates.
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
          <dl className="
            grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_dt]:text-[10px] [&_dt]:capitalize
            [&_dt]:text-[#99a58d] [&_dt]:mb-[6px] [&_dd]:m-[0] [&_dd]:text-[#54704d]
            [&_dd]:[overflow-wrap:anywhere] service-mobile:grid-cols-[1fr] p-[25px] service-mobile:p-[18px]
          ">
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
    </div>
  );
}
