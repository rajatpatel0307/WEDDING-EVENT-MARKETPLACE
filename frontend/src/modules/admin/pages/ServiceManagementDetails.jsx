import { OfferReview } from "../../commerce/OfferEditor";
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
    <article className="asm-chart p-[16px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4ece5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4ece5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4ece5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4ece5] rounded-[10px] [&_h3]:[margin:0_0_20px] [&_small]:block [&_small]:text-[#91a092] [&_small]:text-[11px] [&_small]:font-[400] [&_small]:mt-[4px] [&_svg]:w-full [&_svg]:h-auto [&_p]:text-[11px] [&_p]:text-[#7f9584] [&_p]:mt-[10px]">
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
      <div className="asm-stats grid grid-cols-[repeat(5,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(767px<width<=1200px)]:grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[12px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e1e9e4] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e1e9e4] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e1e9e4] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e1e9e4] [&_article]:rounded-[12px] [&_article]:[background:#fff] [&_article]:p-[18px] [@media(width<=767px)]:[&_article]:p-[13px] [&_article]:min-w-0 [&_article_>_div]:flex [&_article_>_div]:justify-between [&_article_>_div]:items-center [&_article_>_div]:gap-[10px] [&_span]:text-[12px] [&_span]:text-[#71827a] [&_strong]:block [&_strong]:text-[25px] [@media(width<=767px)]:[&_strong]:text-[21px] [&_strong]:font-[650] [&_strong]:mt-[9px] [&_strong]:tracking-[-0.6px] [&_strong]:[overflow-wrap:anywhere] [&_svg]:text-[#73978b]">
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
      <p className="asm-muted text-[12px] text-[#87958d] [margin:12px_0] leading-[1.7]">
        Revenue is the completed service booking line value. Charts group
        activity by date in India.
      </p>
      <div className="asm-charts grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=1200px)]:grid-cols-[1fr] gap-[16px] [margin:24px_0]">
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
      <div className="asm-records grid gap-[12px] [margin:18px_0] [&_article]:p-[18px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e4ebe4] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e4ebe4] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e4ebe4] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e4ebe4] [&_article]:rounded-[10px] [&_article]:grid [&_article]:gap-[10px] [&_article]:text-[13px] [&_small]:text-[#8b9b90]">
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
      <form className="service-form ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]" onSubmit={submit}>
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
        <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
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
          <label className="asm-checkbox flex gap-[9px] items-center text-[12px] [margin:10px_0] [&_input]:w-[15px] [&_input]:h-[15px] [&_input]:[accent-color:#226e56]">
            <input
              type="checkbox"
              checked={values.included}
              onChange={(e) => change("included", e.target.checked)}
            />
            Included in service
          </label>
        )}
        <label className="asm-checkbox flex gap-[9px] items-center text-[12px] [margin:10px_0] [&_input]:w-[15px] [&_input]:h-[15px] [&_input]:[accent-color:#226e56]">
          <input
            type="checkbox"
            checked={values.active}
            onChange={(e) => change("active", e.target.checked)}
          />
          Active
        </label>
        <p className="asm-muted text-[12px] text-[#87958d] [margin:12px_0] leading-[1.7]">
          Changes to approved content require a new review before the listing is
          published.
        </p>
        {error && (
          <p role="alert" className="asm-alert [padding:15px_18px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edd3d5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#edd3d5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edd3d5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#edd3d5] [background:#fff5f4] rounded-[9px] text-[#a8555b] text-[13px]">
            {error}
          </p>
        )}
        <footer className="flex justify-end gap-2">
          <button
            type="button"
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" disabled={busy}>
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
      <div className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
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
    <div className="asm-page grid gap-[24px] text-[#253f3a] [&_select]:[padding:9px_12px] [&_select]:text-[12px] [&_select]:[border-top-width:1px] [&_select]:[border-top-style:solid] [&_select]:[border-top-color:#dce5df] [&_select]:[border-right-width:1px] [&_select]:[border-right-style:solid] [&_select]:[border-right-color:#dce5df] [&_select]:[border-bottom-width:1px] [&_select]:[border-bottom-style:solid] [&_select]:[border-bottom-color:#dce5df] [&_select]:[border-left-width:1px] [&_select]:[border-left-style:solid] [&_select]:[border-left-color:#dce5df] [&_select]:rounded-[7px] [&_select]:[background:#fff]">
      <Link className="asm-back flex items-center gap-[8px] text-[13px] text-[#698c7d]" to="/admin/services">
        <ArrowLeft size={16} />
        All Services
      </Link>
      <header className="asm-detail-header [&_h1]:text-[30px] [@media(width<=767px)]:[&_h1]:text-[25px] [&_h1]:leading-[1.2] [&_h1]:[margin:8px_0_10px] [&_h1]:font-[650] [&_h1]:tracking-[-0.7px] [&_p]:text-[14px] [&_p]:text-[#7b8a83] flex gap-[18px] items-center flex-wrap [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7e1] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7e1] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7e1] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7e1] [background:#fff] rounded-[14px] p-[26px] [@media(width<=767px)]:p-[18px] [&_>_.asm-identity]:flex-1 [&_>_.asm-identity]:min-w-[280px] [@media(width<=767px)]:[&_>_.asm-identity]:min-w-0 [&_.asm-identity_>_img]:w-[100px] [@media(width<=767px)]:[&_.asm-identity_>_img]:w-[70px] [&_.asm-identity_>_img]:h-[100px] [@media(width<=767px)]:[&_.asm-identity_>_img]:h-[70px] [&_.asm-image-placeholder]:w-[100px] [@media(width<=767px)]:[&_.asm-image-placeholder]:w-[70px] [&_.asm-image-placeholder]:h-[100px] [@media(width<=767px)]:[&_.asm-image-placeholder]:h-[70px] [&_small]:text-[11px] [&_small]:text-[#87978d] [&_small]:block [&_small]:mt-[10px] [&_small]:max-w-[none] [&_.asm-identity_p]:mb-[10px] [@media(width<=767px)]:[&_>_.asm-identity]:[flex-basis:100%]">
        <div className="asm-identity flex gap-[11px] items-center min-w-[180px] [&_img]:w-[48px] [&_img]:h-[48px] [&_img]:object-cover [&_img]:shrink-0 [&_img]:rounded-[9px] [&_img]:[background:#edf3ed] [&_img]:grid [&_img]:place-items-center [&_img]:text-[#77988b] [&_strong]:block [&_strong]:font-[600] [&_strong]:text-[13px] [&_small]:block [&_small]:text-[11px] [&_small]:text-[#88938c] [&_small]:mt-[4px] [&_small]:max-w-[190px] [&_small]:[overflow-x:hidden] [&_small]:[overflow-y:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:whitespace-nowrap">
          {d.images[0] ? (
            <img src={d.images[0].url} alt={d.ServiceName} />
          ) : (
            <span className="asm-image-placeholder w-[48px] h-[48px] object-cover shrink-0 rounded-[9px] [background:#edf3ed] grid place-items-center text-[#77988b]">
              <ImageIcon />
            </span>
          )}
          <div>
            <span className="ad-eyebrow text-[8px] [@media(width<=767px)]:text-[7px] tracking-[1.7px] text-[#7d9183] flex items-center gap-[6px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:[background:#bfa471] [&_>_span]:rounded-[50%]">SERVICE DETAILS</span>
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
            className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            onClick={() => action(summary, "submit")}
          >
            Submit for approval
          </button>
        )}
        <Link className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" to={`/admin/services/${serviceId}/review`}>
          Open approval review
        </Link>
      </header>
      {error && (
        <p role="alert" className="asm-alert [padding:15px_18px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edd3d5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#edd3d5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edd3d5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#edd3d5] [background:#fff5f4] rounded-[9px] text-[#a8555b] text-[13px]">
          {error}
        </p>
      )}
      {d.RejectionReason && (
        <aside className="asm-alert [padding:15px_18px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edd3d5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#edd3d5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edd3d5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#edd3d5] [background:#fff5f4] rounded-[9px] text-[#a8555b] text-[13px]">
          <strong>Rejection reason: </strong>
          {d.RejectionReason}
          {d.AdminNote && <p>Admin note: {d.AdminNote}</p>}
        </aside>
      )}
      <nav className="asm-detail-tabs flex gap-[7px] [overflow-x:auto] pb-[3px] [&_button]:text-[13px] [&_button]:[padding:10px_16px] [&_button]:rounded-[8px] [&_button]:whitespace-nowrap [&_button]:text-[#74817c] [&_button[aria-current]]:[background:#e5efea] [&_button[aria-current]]:text-[#185b4d] [&_button[aria-current]]:font-[650]" aria-label="Service details">
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
      <section className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
        <h2>{tab === "Overview" ? "Service performance" : tab}</h2>
        {tab === "Overview" && (
          <>
            <p className="asm-lead text-[14px] mb-[24px] text-[#6c8374]">{doc.shortDescription || d.Description}</p>
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
            <OfferReview offer={doc.offer}/>
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
            <p className="asm-calculation [margin:22px_0] p-[18px] [background:#eef6ef] text-[13px] rounded-[9px]">
              Base price + (unit price × quantity) − discount + additional
              charges + tax = <strong>{money(d.calculation.finalPrice)}</strong>
            </p>
            <p className="asm-muted text-[12px] text-[#87958d] [margin:12px_0] leading-[1.7]">
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
                className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                onClick={() => setDialog({ kind: "item" })}
              >
                <Plus size={15} />
                Add Item
              </button>
            )}
            {d.items.length ? (
              <div className="asm-table-wrap [overflow-x:auto] overflow-y-auto pb-[8px]">
                <table className="asm-table w-full border-collapse text-left text-[12px] [&_th]:font-[600] [&_th]:text-[10px] [&_th]:tracking-[0.6px] [&_th]:uppercase [&_th]:whitespace-nowrap [&_th]:[padding:13px_14px] [&_th]:[background:#f6f9f6] [&_th]:text-[#7b8b80] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#e5ebe6] [&_td]:[border-bottom-width:1px] [&_td]:[border-bottom-style:solid] [&_td]:[border-bottom-color:#edf1ed] [&_td]:[padding:16px_14px] [&_td]:[vertical-align:middle] [&_tbody_tr:hover]:[background:#fbfcfa] [@media(width<=1200px)]:[&_.asm-id]:max-w-[75px]">
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
                            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                            onClick={() =>
                              setDialog({ kind: "view-item", record: i })
                            }
                          >
                            View
                          </button>
                          {canEdit && (
                            <div className="flex gap-2">
                              <button
                                className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                                onClick={() =>
                                  setDialog({ kind: "item", record: i })
                                }
                              >
                                Edit
                              </button>
                              <button
                                className="ad-button asm-danger-text inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] [&.asm-danger-text]:text-[#b14b52]!"
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
          <div className="asm-packages grid grid-cols-[repeat(auto-fit,_minmax(240px,_1fr))] gap-[18px] mt-[18px] [&_article]:p-[22px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e2ebe3] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e2ebe3] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e2ebe3] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e2ebe3] [&_article]:rounded-[12px] [&_article]:text-[13px] [&_article]:leading-[1.8] [&_header]:flex [&_header]:justify-between [&_header]:gap-[10px] [&_h3]:mt-[0] [&_article_>_strong]:text-[24px] [&_del]:text-[#9da79f] [&_summary]:cursor-pointer [&_summary]:text-[#32765a]">
            {d.packages.length ? (
              d.packages.map((p) => (
                <article key={p.PackageId}>
                  <header>
                    <h3>{p.PackageName}</h3>
                    <span className={`asm-active whitespace-nowrap text-[11px] text-[#8a938e] [&:before]:[content:''] [&:before]:inline-block [&:before]:w-[6px] [&:before]:h-[6px] [&:before]:rounded-[50%] [&:before]:[background:#a6ada8] [&:before]:mr-[7px] [&.on]:text-[#2a7a58] [&.on:before]:[background:#4f976a] ${p.IsActive ? "on" : ""}`}>
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
                        className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                        onClick={() =>
                          setDialog({ kind: "package", record: p })
                        }
                      >
                        Edit package
                      </button>
                      <button
                        className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
              <label className="ad-button asm-upload inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] w-[max-content] cursor-pointer [&_input]:hidden">
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
            <div className="asm-gallery grid grid-cols-[repeat(auto-fit,_minmax(240px,_1fr))] gap-[18px] mt-[18px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e5ebe5] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e5ebe5] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e5ebe5] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e5ebe5] [&_article]:rounded-[10px] [&_article]:[overflow-x:hidden] [&_article]:[overflow-y:hidden] [&_img]:w-full [&_img]:h-[230px] [&_img]:object-cover [&_footer]:flex [&_footer]:justify-between [&_footer]:items-center [&_footer]:p-[12px] [&_footer]:gap-[12px] [&_footer]:text-[12px]">
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
                          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
                        className="ad-button asm-danger-text inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] [&.asm-danger-text]:text-[#b14b52]!"
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
            <div className="asm-records grid gap-[12px] [margin:18px_0] [&_article]:p-[18px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e4ebe4] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e4ebe4] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e4ebe4] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e4ebe4] [&_article]:rounded-[10px] [&_article]:grid [&_article]:gap-[10px] [&_article]:text-[13px] [&_small]:text-[#8b9b90]">
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
          <div className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]">
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
            <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={() => setDialog(null)}>
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
            <div className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]">
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
                <p role="alert" className="asm-alert [padding:15px_18px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edd3d5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#edd3d5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edd3d5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#edd3d5] [background:#fff5f4] rounded-[9px] text-[#a8555b] text-[13px]">
                  {error}
                </p>
              )}
              <footer className="flex justify-end gap-2">
                <button
                  className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                <button
                  className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
