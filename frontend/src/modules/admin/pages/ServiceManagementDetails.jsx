import { useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Image as ImageIcon,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  adminRequest,
  useAdminData,
  money,
  date,
  number,
  serviceSummary,
  versionOf,
} from "../services-management.api";
import {
  Loading,
  ErrorState,
  Empty,
  Pager,
  Status,
  ServiceActions,
  Field,
  Definition,
} from "../components/ServicesUI";
import ServiceDecisionDialog from "../components/ServiceDecisionDialog";
import AdminDialog from "../components/AdminDialog";
import ApprovalTimeline from "../../../components/common/ApprovalTimeline";
import "../services-management.css";

const tabs = [
  "Overview",
  "Service Information",
  "Pricing",
  "Items",
  "Packages",
  "Images",
  "Location",
  "Availability",
  "Bookings",
  "Reviews",
  "Audit History",
];
function Chart({ title, rows, metric }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...rows.map((r) => Number(r[metric])));
  return (
    <article className="asm-chart">
      <h3>
        {title} <small>Last 90 days</small>
      </h3>
      {rows.length ? (
        <>
          <svg
            viewBox="0 0 600 160"
            role="img"
            aria-label={`${title} over the last 90 days`}
          >
            <line x1="8" y1="145" x2="592" y2="145" stroke="#dce7e0" />
            <polyline
              fill="none"
              stroke="#187366"
              strokeWidth="2.5"
              points={rows
                .map(
                  (r, i) =>
                    `${8 + (i * 584) / Math.max(1, rows.length - 1)},${145 - (Number(r[metric]) / max) * 125}`,
                )
                .join(" ")}
            />
            {rows.map((r, i) => (
              <rect
                key={i}
                x={(i * 600) / rows.length}
                y="0"
                width={600 / rows.length}
                height="160"
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <title>
                  {date(r.date)}:{" "}
                  {metric === "revenue" ? money(r[metric]) : number(r[metric])}
                </title>
              </rect>
            ))}
          </svg>
          <p>
            {hover === null
              ? `Total: ${metric === "revenue" ? money(rows.reduce((s, r) => s + Number(r[metric]), 0)) : number(rows.reduce((s, r) => s + Number(r[metric]), 0))}`
              : `${date(rows[hover].date)}: ${metric === "revenue" ? money(rows[hover][metric]) : number(rows[hover][metric])}`}
          </p>
        </>
      ) : (
        <p>No activity recorded.</p>
      )}
    </article>
  );
}
function Performance({ id, revision }) {
  const state = useAdminData(`/services/${id}/performance`, revision);
  if (state.loading) return <Loading />;
  if (state.error) return <p role="alert">{state.error.message}</p>;
  const d = state.data;
  return (
    <>
      <div className="asm-stats">
        {[
          ["views", "Total Views"],
          ["enquiries", "Total Enquiries"],
          ["quotations", "Total Quotations"],
          ["bookings", "Total Bookings"],
          ["completed", "Completed Bookings"],
          ["cancelled", "Cancelled Bookings"],
          ["revenue", "Revenue"],
          ["rating", "Average Rating"],
          ["reviews", "Reviews"],
        ].map(([key, label]) => (
          <article key={key}>
            <span>{label}</span>
            <strong>
              {key === "revenue"
                ? money(d[key])
                : key === "rating"
                  ? d.rating
                    ? Number(d.rating).toFixed(1)
                    : "No ratings"
                  : number(d[key])}
            </strong>
          </article>
        ))}
      </div>
      <p className="asm-muted">
        Revenue is the completed service booking line value. Charts group
        activity by date in India.
      </p>
      <div className="asm-charts">
        {["views", "bookings", "revenue"].map((metric) => (
          <Chart
            key={metric}
            title={metric[0].toUpperCase() + metric.slice(1)}
            rows={d.series}
            metric={metric}
          />
        ))}
      </div>
    </>
  );
}
function Records({ id, kind, revision }) {
  const [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const state = useAdminData(
    `/services/${id}/records/${kind}?page=${page}`,
    `${revision}:${retry}`,
  );
  if (state.loading) return <Loading />;
  if (state.error)
    return (
      <ErrorState error={state.error} retry={() => setRetry((v) => v + 1)} />
    );
  const d = state.data;
  return d.rows.length ? (
    <>
      <div className="asm-records">
        {d.rows.map((r) => (
          <article key={r.id}>
            {kind === "bookings" ? (
              <>
                <Link to={`/admin/bookings?q=${encodeURIComponent(r.name)}`}>
                  {r.name}
                </Link>
                <Status status={r.status} />
                <strong>{money(r.amount)}</strong>
              </>
            ) : (
              <>
                <strong>★ {r.rating}</strong>
                <p>{r.comment}</p>
                <small>{r.published ? "Published" : "Unpublished"}</small>
              </>
            )}
            <small>{date(r.date)}</small>
          </article>
        ))}
      </div>
      <Pager data={d} page={page} change={setPage} />
    </>
  ) : (
    <Empty
      title={`No ${kind} yet`}
      description="Records will appear as customers interact with this service."
    />
  );
}
function ChildEditor({ dialog, data, close, saved }) {
  const p = dialog.record,
    item = dialog.kind === "item";
  const [values, setValues] = useState(
    item
      ? {
          name: p?.ItemName || "",
          description: p?.Description || "",
          quantity: Number(p?.Quantity ?? 1),
          unit: p?.Unit || "",
          price: Number(p?.UnitPrice || 0),
          included: p ? !!p.IsIncluded : true,
          active: p ? !!p.IsActive : true,
        }
      : {
          name: p.PackageName,
          description: p.Description || "",
          price: Number(p.Price),
          discount: Number(p.DiscountPercentage),
          minimumGuests: p.MinimumGuests,
          maximumGuests: p.MaximumGuests,
          active: !!p.IsActive,
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest(
        `/services/${data.ServiceId}/${item ? `items${p ? `/${p.ServiceItemId}` : ""}` : `packages/${p.PackageId}`}`,
        {
          method: item && !p ? "POST" : "PUT",
          body: JSON.stringify({
            ...versionOf(data),
            ...(item ? { item: values } : values),
          }),
        },
      );
      saved(result.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminDialog
      title={`${p ? "Edit" : "Add"} ${item ? "service item" : "package"}`}
      close={close}
      busy={busy}
    >
      <form className="ad-form" onSubmit={submit}>
        <Field
          label="Name"
          required
          maxLength={200}
          value={values.name}
          onChange={(e) => change("name", e.target.value)}
        />
        <Field label="Description">
          <textarea
            value={values.description}
            maxLength={item ? 500 : 5000}
            onChange={(e) => change("description", e.target.value)}
          />
        </Field>
        <div className="asm-form-grid">
          {(item
            ? [
                ["quantity", "Quantity", 0.001],
                ["price", "Price", 0.01],
              ]
            : [
                ["price", "Original price", 0.01],
                ["discount", "Discount %", 0.01],
                ["minimumGuests", "Minimum guests", 1],
                ["maximumGuests", "Maximum guests", 1],
              ]
          ).map(([key, label, step]) => (
            <Field
              key={key}
              label={label}
              type="number"
              min={0}
              max={key === "discount" ? 100 : 100000000}
              step={step}
              required={!["minimumGuests", "maximumGuests"].includes(key)}
              value={values[key] ?? ""}
              onChange={(e) =>
                change(
                  key,
                  e.target.value === "" && key.endsWith("Guests")
                    ? null
                    : Number(e.target.value),
                )
              }
            />
          ))}
          {item && (
            <Field
              label="Unit"
              maxLength={50}
              value={values.unit}
              onChange={(e) => change("unit", e.target.value)}
            />
          )}
        </div>
        {item && (
          <label className="asm-checkbox">
            <input
              type="checkbox"
              checked={values.included}
              onChange={(e) => change("included", e.target.checked)}
            />
            Included in service
          </label>
        )}
        <label className="asm-checkbox">
          <input
            type="checkbox"
            checked={values.active}
            onChange={(e) => change("active", e.target.checked)}
          />
          Active
        </label>
        <p className="asm-muted">
          Changes to approved content require a new review before the listing is
          published.
        </p>
        {error && (
          <p role="alert" className="asm-alert">
            {error}
          </p>
        )}
        <footer className="flex justify-end gap-2">
          <button
            type="button"
            className="ad-button"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button className="ad-button ad-primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </form>
    </AdminDialog>
  );
}
export default function ServiceManagementDetails() {
  const { serviceId } = useParams(),
    [params, setParams] = useSearchParams(),
    navigate = useNavigate(),
    { notify } = useAuth();
  const [revision, setRevision] = useState(0),
    [dialog, setDialog] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const state = useAdminData(`/services/${serviceId}`, revision),
    tab = tabs.includes(params.get("tab")) ? params.get("tab") : "Overview";
  const refresh = (message) => {
    setDialog(null);
    setError("");
    setRevision((v) => v + 1);
    if (message) notify(message);
    window.dispatchEvent(new Event("marrynest:service-decision"));
  };
  const action = (row, action) => {
    setError("");
    setDialog({ kind: "action", service: row, action });
  };
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      let path = `/services/${serviceId}`,
        method = "POST",
        body = versionOf(state.data);
      if (dialog.kind === "image") {
        path += `/images/${dialog.record.id}`;
        body.action = dialog.action;
      } else if (dialog.kind === "remove-item") {
        path += `/items/${dialog.record.ServiceItemId}`;
        method = "DELETE";
      } else if (dialog.action === "delete") method = "DELETE";
      else path += `/${dialog.action}`;
      const result = await adminRequest(path, {
        method,
        body: JSON.stringify(body),
      });
      refresh(result.message);
      if (dialog.action === "delete") navigate("/admin/services");
      else if (result.id) navigate(`/admin/services/${result.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await adminRequest(
        `/services/${serviceId}/images/upload`,
        {
          method: "POST",
          body: JSON.stringify({ ...versionOf(state.data), base64 }),
        },
      );
      refresh(result.message);
    } catch (err) {
      setError(err.message || "Image upload failed.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  if (state.loading)
    return (
      <div className="asm-panel">
        <Loading />
      </div>
    );
  if (state.error)
    return (
      <ErrorState error={state.error} retry={() => setRevision((v) => v + 1)} />
    );
  const d = state.data,
    doc = d.document,
    summary = { ...serviceSummary(d), actions: d.actions },
    canEdit = d.actions.includes("edit");
  const decision =
    dialog?.kind === "action" &&
    ["approve", "reject", "suspend", "activate", "deactivate"].includes(
      dialog.action,
    );
  return (
    <div className="asm-page">
      <Link className="asm-back" to="/admin/services">
        <ArrowLeft size={16} />
        All Services
      </Link>
      <header className="asm-detail-header">
        <div className="asm-identity">
          {d.images[0] ? (
            <img src={d.images[0].url} alt={d.ServiceName} />
          ) : (
            <span className="asm-image-placeholder">
              <ImageIcon />
            </span>
          )}
          <div>
            <span className="ad-eyebrow">SERVICE DETAILS</span>
            <h1>{d.ServiceName}</h1>
            <p>
              <Link to={`/admin/vendors/${d.VendorId}`}>{d.BusinessName}</Link>{" "}
              · {d.CategoryName}{" "}
              {d.SubCategoryName && ` / ${d.SubCategoryName}`}
            </p>
            <Status status={d.ApprovalStatus} active={!!d.IsActive} />
            <small>
              Created {date(d.CreatedAt)} · Updated {date(d.UpdatedAt)}
            </small>
          </div>
        </div>
        <ServiceActions row={summary} action={action} inline />
        {["Draft", "Rejected"].includes(d.ApprovalStatus) && (
          <button
            className="ad-button ad-primary"
            onClick={() => action(summary, "submit")}
          >
            Submit for approval
          </button>
        )}
        <Link className="ad-button" to={`/admin/services/${serviceId}/review`}>
          Open approval review
        </Link>
      </header>
      {error && (
        <p role="alert" className="asm-alert">
          {error}
        </p>
      )}
      {d.RejectionReason && (
        <aside className="asm-alert">
          <strong>Rejection reason: </strong>
          {d.RejectionReason}
          {d.AdminNote && <p>Admin note: {d.AdminNote}</p>}
        </aside>
      )}
      <nav className="asm-detail-tabs" aria-label="Service details">
        {tabs.map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setParams({ tab: t })}
          >
            {t}
          </button>
        ))}
      </nav>
      <section className="asm-panel">
        <h2>{tab === "Overview" ? "Service performance" : tab}</h2>
        {tab === "Overview" && (
          <>
            <p className="asm-lead">{doc.shortDescription || d.Description}</p>
            <Performance id={serviceId} revision={revision} />
          </>
        )}
        {tab === "Service Information" && (
          <>
            <Definition
              values={{
                "Service ID": d.ServiceId,
                "Service name": d.ServiceName,
                Category: d.CategoryName,
                Subcategory: d.SubCategoryName,
                Description: d.Description,
                "Short description": doc.shortDescription,
                "Service type": doc.serviceType,
                Vendor: d.BusinessName,
                Location: [doc.location?.city, doc.location?.state]
                  .filter(Boolean)
                  .join(", "),
                "Duration (minutes)": doc.policies?.duration,
                "Minimum quantity": doc.pricing?.minimumQuantity,
                "Maximum quantity": doc.pricing?.maximumQuantity,
              }}
            />
            <h3>Category information</h3>
            <Definition values={d.attributes} />
            <h3>Policies</h3>
            <Definition values={doc.policies || {}} />
          </>
        )}
        {tab === "Pricing" && (
          <>
            <Definition
              values={{
                "Base price": money(d.calculation.basePrice),
                "Unit price": money(d.calculation.unitPrice),
                "Minimum quantity": d.calculation.quantity,
                "Unit subtotal": money(d.calculation.unitSubtotal),
                "Discount %": d.calculation.discountPercent,
                "Discount amount": money(d.calculation.discountAmount),
                "Additional charges": money(d.calculation.additionalCharges),
                "Subtotal before tax": money(d.calculation.subtotal),
                "Tax %": d.calculation.taxRate,
                Tax: money(d.calculation.tax),
                "Final price": money(d.calculation.finalPrice),
                "Pricing unit": d.calculation.unit,
              }}
            />
            <p className="asm-calculation">
              Base price + (unit price × quantity) − discount + additional
              charges + tax = <strong>{money(d.calculation.finalPrice)}</strong>
            </p>
            <p className="asm-muted">
              Calculated and validated by the server. Seasonal and weekend rates
              apply when a customer selects an event date.
            </p>
            <h3>Additional pricing rules</h3>
            <Definition
              values={{
                "Weekend price": doc.pricing?.weekendPrice,
                "Special price": doc.pricing?.specialPrice,
                "Seasonal price": doc.pricing?.seasonalPrice,
                "Season starts": doc.pricing?.seasonalFrom,
                "Season ends": doc.pricing?.seasonalTo,
              }}
            />
          </>
        )}
        {tab === "Items" && (
          <>
            {canEdit && (
              <button
                className="ad-button ad-primary"
                onClick={() => setDialog({ kind: "item" })}
              >
                <Plus size={15} />
                Add Item
              </button>
            )}
            {d.items.length ? (
              <div className="asm-table-wrap">
                <table className="asm-table">
                  <thead>
                    <tr>
                      {[
                        "Item",
                        "Description",
                        "Quantity",
                        "Unit",
                        "Price",
                        "Included",
                        "Status",
                        "Actions",
                      ].map((x) => (
                        <th key={x}>{x}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.items.map((i) => (
                      <tr key={i.ServiceItemId}>
                        <td>{i.ItemName}</td>
                        <td>{i.Description}</td>
                        <td>{i.Quantity}</td>
                        <td>{i.Unit}</td>
                        <td>{money(i.UnitPrice)}</td>
                        <td>{i.IsIncluded ? "Yes" : "No"}</td>
                        <td>{i.IsActive ? "Active" : "Inactive"}</td>
                        <td>
                          <button
                            className="ad-button"
                            onClick={() =>
                              setDialog({ kind: "view-item", record: i })
                            }
                          >
                            View
                          </button>
                          {canEdit && (
                            <div className="flex gap-2">
                              <button
                                className="ad-button"
                                onClick={() =>
                                  setDialog({ kind: "item", record: i })
                                }
                              >
                                Edit
                              </button>
                              <button
                                className="ad-button asm-danger-text"
                                onClick={() =>
                                  setDialog({ kind: "remove-item", record: i })
                                }
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="No service items"
                description="Add the items included with this service."
              />
            )}
          </>
        )}
        {tab === "Packages" && (
          <div className="asm-packages">
            {d.packages.length ? (
              d.packages.map((p) => (
                <article key={p.PackageId}>
                  <header>
                    <h3>{p.PackageName}</h3>
                    <span className={`asm-active ${p.IsActive ? "on" : ""}`}>
                      {p.IsActive ? "Active" : "Inactive"}
                    </span>
                  </header>
                  <p>{p.Description}</p>
                  <p>
                    <del>{money(p.Price)}</del> · {p.DiscountPercentage}% off
                  </p>
                  <strong>{money(p.FinalPrice)}</strong>
                  <p>
                    Guest range: {p.MinimumGuests ?? "No minimum"} –{" "}
                    {p.MaximumGuests ?? "No maximum"}
                  </p>
                  <details>
                    <summary>View package</summary>
                    <Definition
                      values={{
                        Duration: p.DurationMinutes,
                        ...JSON.parse(p.DetailsJson || "{}"),
                      }}
                    />
                    <ul>
                      {p.items.map((i) => (
                        <li key={i.PackageItemId}>
                          {i.ItemName} · {i.Quantity} {i.Unit} · {i.Description}
                        </li>
                      ))}
                    </ul>
                  </details>
                  {canEdit && (
                    <div className="flex gap-2 mt-3">
                      <button
                        className="ad-button"
                        onClick={() =>
                          setDialog({ kind: "package", record: p })
                        }
                      >
                        Edit package
                      </button>
                      <button
                        className="ad-button"
                        onClick={() =>
                          setDialog({
                            kind: "package",
                            record: { ...p, IsActive: !p.IsActive },
                          })
                        }
                      >
                        {p.IsActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <Empty
                title="No packages"
                description="Packages created by the vendor will appear here."
              />
            )}
          </div>
        )}
        {tab === "Images" && (
          <>
            {canEdit && (
              <label className="ad-button asm-upload">
                <Upload size={16} />
                {busy ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  disabled={busy}
                  onChange={upload}
                />
              </label>
            )}
            <div className="asm-gallery">
              {d.images.map((img, i) => (
                <article key={img.id}>
                  <a href={img.url} target="_blank" rel="noreferrer">
                    <img
                      src={img.url}
                      alt={`${d.ServiceName}, image ${i + 1}`}
                    />
                  </a>
                  <footer>
                    <span>
                      {img.primary ? "Primary image" : "Service image"}
                    </span>
                    <div className="flex gap-2">
                      {!img.primary && (
                        <button
                          className="ad-button"
                          title="Set primary image"
                          onClick={() =>
                            setDialog({
                              kind: "image",
                              record: img,
                              action: "primary",
                            })
                          }
                        >
                          <Star size={16} />
                        </button>
                      )}
                      <button
                        className="ad-button asm-danger-text"
                        title="Delete image"
                        onClick={() =>
                          setDialog({
                            kind: "image",
                            record: img,
                            action: "delete",
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
            {!d.images.length && (
              <Empty
                title="No service images"
                description="Add images before submitting for approval."
              />
            )}
          </>
        )}
        {tab === "Location" && <Definition values={doc.location || {}} />}
        {tab === "Availability" && (
          <>
            <Definition
              values={{
                "Working days": (doc.availability?.days || [])
                  .map(
                    (n) =>
                      [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ][n],
                  )
                  .join(", "),
                "Opening time": doc.availability?.start,
                "Closing time": doc.availability?.end,
                "Advance booking (days)": doc.availability?.advanceDays,
                "Minimum notice (hours)": doc.availability?.noticeHours,
              }}
            />
            <h3>Date overrides</h3>
            <div className="asm-records">
              {d.availability.map((a) => (
                <article key={a.AvailabilityId}>
                  <strong>{date(a.AvailableDate)}</strong>
                  <p>
                    {a.Status} ·{" "}
                    {a.ServiceId ? "This service" : "All vendor services"}
                  </p>
                  <p>{a.Notes}</p>
                </article>
              ))}
            </div>
            {!d.availability.length && <p>No date overrides.</p>}
          </>
        )}
        {["Bookings", "Reviews"].includes(tab) && (
          <Records
            key={`${serviceId}:${tab}`}
            id={serviceId}
            kind={tab.toLowerCase()}
            revision={revision}
          />
        )}
        {tab === "Audit History" && <ApprovalTimeline rows={d.history} />}
      </section>
      {dialog?.kind === "view-item" && (
        <AdminDialog
          title={dialog.record.ItemName}
          close={() => setDialog(null)}
        >
          <div className="ad-form">
            <Definition
              values={{
                Description: dialog.record.Description,
                Quantity: dialog.record.Quantity,
                Unit: dialog.record.Unit,
                Price: money(dialog.record.UnitPrice),
                Included: !!dialog.record.IsIncluded,
                Active: !!dialog.record.IsActive,
              }}
            />
            <button className="ad-button" onClick={() => setDialog(null)}>
              Close
            </button>
          </div>
        </AdminDialog>
      )}
      {decision && (
        <ServiceDecisionDialog
          {...dialog}
          close={() => setDialog(null)}
          saved={refresh}
        />
      )}
      {dialog && ["item", "package"].includes(dialog.kind) && (
        <ChildEditor
          key={`${dialog.kind}:${dialog.record?.ServiceItemId || dialog.record?.PackageId || "new"}`}
          dialog={dialog}
          data={d}
          close={() => setDialog(null)}
          saved={refresh}
        />
      )}
      {dialog &&
        !decision &&
        !["item", "package", "view-item"].includes(dialog.kind) && (
          <AdminDialog
            title="Confirm service change"
            close={() => setDialog(null)}
            busy={busy}
          >
            <div className="ad-form">
              <p>
                {dialog.kind === "image"
                  ? dialog.action === "delete"
                    ? "Delete this image from the service? Approved content will require review again."
                    : "Set this as the primary image?"
                  : dialog.kind === "remove-item"
                    ? `Remove “${dialog.record.ItemName}” from this service?`
                    : dialog.action === "delete"
                      ? "Permanently delete this service? Its audit history will remain available."
                      : dialog.action === "submit"
                        ? "Submit this service for approval? Vendor approval and complete listing information are required."
                        : "Duplicate this service, its items, packages and images as an inactive draft?"}
              </p>
              {error && (
                <p role="alert" className="asm-alert">
                  {error}
                </p>
              )}
              <footer className="flex justify-end gap-2">
                <button
                  className="ad-button"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                <button
                  className="ad-button ad-primary"
                  disabled={busy}
                  onClick={confirm}
                >
                  {busy ? "Saving…" : "Confirm"}
                </button>
              </footer>
            </div>
          </AdminDialog>
        )}
    </div>
  );
}
