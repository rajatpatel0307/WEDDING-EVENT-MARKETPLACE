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
    <dl className="sm-definition">
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
    <div className="sm-package-grid">
      {state.data.map((p) => (
        <article className="sm-package" key={p.id}>
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
    <div className="sm-preview">
      <div className="sm-preview-images">
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
          <div className="sm-preview-placeholder">
            Your service images will appear here
          </div>
        )}
      </div>
      {!!s.images?.length && (
        <details>
          <summary>View all {s.images.length} images</summary>
          <div className="sm-preview-gallery">
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
      <span className="sm-category-label">{category || "Service"}</span>
      <h2>{s.name || "Your service name"}</h2>
      <p>
        {vendorName && `By ${vendorName} · `}
        {s.location?.city || "Location not set"}
        {s.location?.state && `, ${s.location.state}`}
      </p>
      <p className="sm-lead">{s.shortDescription}</p>
      <div className="sm-price-preview">
        <span>STARTING FROM</span>
        <strong>{money(s.price)}</strong>
        <span>{s.pricing?.unit}</span>
      </div>
      <h3>About this service</h3>
      <p className="sm-whitespace">
        {s.description || "Add a detailed description."}
      </p>
      <h3>Category details</h3>
      <dl className="sm-definition">
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
        Book up to {s.availability?.advanceDays} days ahead ·{" "}
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
          <p className="sm-whitespace">{s.policies?.[k] || "Not specified"}</p>
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
    <section className="sm-chart">
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
          <div className="sm-chart-labels">
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
      <div className="sm-stats">
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
          <div className="sm-stat" key={key}>
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
      <p className="sm-muted">
        Conversion = bookings ÷ recorded views. Revenue is the completed booking
        line value. Charts show the last 90 days.
      </p>
      <div className="sm-chart-grid">
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
      <div className="sm-history">
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
    <div className="sm-page">
      <Link className="sm-back" to="/vendor/services">
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
        <div className="sm-rejected">
          <h2>Service Rejected</h2>
          <strong>Rejection Reason</strong>
          <p>{s.rejectionReason || "Contact support for the review reason."}</p>
          <strong>Admin Note</strong>
          <p>{s.adminNote || "—"}</p>
          <small>Rejected {date(s.rejectedAt)}</small>
          <Link to={`/vendor/services/${id}/edit`} className="vw-button">
            Edit & Resubmit
          </Link>
        </div>
      )}
      <div className="sm-detail-actions">
        <ServiceActions
          service={s}
          full
          onChange={(r) => {
            setNotice(r.message);
            setVersion((v) => v + 1);
          }}
        />
      </div>
      <div className="sm-tabs sm-detail-tabs">
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
          <div className="sm-form-body">
            <dl className="sm-definition">
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
          <div className="sm-form-body">
            <ApprovalTimeline rows={s.approvalHistory} />
          </div>
        )}
        {tab === "Overview" && (
          <div className="sm-form-body">
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
          <div className="sm-form-body">
            <PricingDetails pricing={s.pricing} />
            <div className="sm-price-preview">
              <span>SERVER-CALCULATED STARTING PRICE</span>
              <strong>{money(s.price)}</strong>
            </div>
          </div>
        )}
        {tab === "Service Items" && (
          <div className="sm-form-body">
            {s.items.length ? (
              <div className="sm-history">
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
                className="vw-button"
                to={`/vendor/services/${id}/edit?step=3`}
              >
                Manage Items
              </Link>
            )}
          </div>
        )}
        {tab === "Images" && (
          <div className="sm-form-body">
            <MediaManager
              id={id}
              disabled={!s.actions.edit}
              onChanged={() => setVersion((v) => v + 1)}
            />
          </div>
        )}
        {tab === "Packages" && (
          <div className="sm-form-body">
            <p>
              Create flexible packages for different celebrations and budgets.
            </p>
            <Link
              className="vw-button vw-primary"
              to={`/vendor/services/${id}/packages`}
            >
              Manage Packages
            </Link>
          </div>
        )}
        {tab === "Availability" && (
          <div className="sm-form-body">
            <p>
              Manage working days, custom timings, holidays and blocked dates.
            </p>
            <Link
              className="vw-button"
              to={`/vendor/services/${id}/availability`}
            >
              Open service calendar
            </Link>
          </div>
        )}
        {tab === "Location" && (
          <div className="sm-form-body">
            <MapPin />
            <p>
              {Object.values(s.location || {})
                .filter((v) => v !== null)
                .join(" · ")}
            </p>
          </div>
        )}
        {tab === "Policies" && (
          <dl className="sm-definition sm-form-body">
            {Object.entries(s.policies || {}).map(([k, v]) => (
              <div key={k}>
                <dt>{k.replace(/([A-Z])/g, " $1")}</dt>
                <dd className="sm-whitespace">
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
          <div className="sm-form-body">
            <Performance id={id} />
          </div>
        )}
      </Panel>
    </div>
  );
}
