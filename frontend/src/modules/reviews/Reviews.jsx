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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCommunicationSocket } from "../communication/useCommunicationSocket";
import { reviewRequest, reviewSave, imageUrl, useReviews } from "./api";
import "./reviews.css";
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
  return (
    <div>
      <div
        className="rr-stars"
        role={onChange ? "radiogroup" : "img"}
        aria-label={`${label}: ${value || 0} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((n) =>
          onChange ? (
            <button
              className="rr-star"
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} ${n === 1 ? "star" : "stars"}: ${ratingLabels[n - 1]}`}
              key={n}
              onClick={() => onChange(n)}
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  onChange(
                    Math.max(
                      1,
                      Math.min(
                        5,
                        (value || 1) +
                          (["ArrowLeft", "ArrowDown"].includes(e.key) ? -1 : 1),
                      ),
                    ),
                  );
                }
              }}
            >
              <Star fill={n <= value ? "currentColor" : "none"} />
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
        <span className="rr-muted">
          {value ? ratingLabels[value - 1] : "Choose a star rating"}
        </span>
      )}
    </div>
  );
}
function Dialog({ title, close, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <div className="rr-overlay">
      <dialog
        ref={ref}
        className="rr-dialog rr-module"
        aria-labelledby={titleId}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="rr-row rr-between">
          <h2 id={titleId}>{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={close}>
            <X size={18} />
          </button>
        </div>
        {children}
      </dialog>
    </div>
  );
}
function State({ state }) {
  return state.loading ? (
    <p role="status" className="rr-panel rr-muted">
      Loading reviews…
    </p>
  ) : state.error ? (
    <p role="alert" className="rr-error">
      {state.error}
    </p>
  ) : null;
}
export function RatingSummary({ data }) {
  if (!data) return null;
  return (
    <section className="rr-panel" aria-label="Rating overview">
      <div className="rr-row" style={{ gap: 32 }}>
        <div>
          <div className="rr-score">
            {Number(data.averageRating || 0).toFixed(1)}
            <span className="rr-muted"> / 5</span>
          </div>
          <Stars value={data.averageRating} />
          <p className="rr-muted">
            {data.totalReviews || 0} reviews · {data.verifiedReviews || 0}{" "}
            verified bookings
          </p>
        </div>
        <div className="rr-distribution">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = Number(
              data.distribution?.find((d) => Number(d.rating) === n)?.count ||
                0,
            );
            return (
              <div className="rr-bar" key={n}>
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
      <div className="rr-images">
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
            className="rr-lightbox"
            src={imageUrl(selected.id)}
            alt={selected.name || "Customer review photo"}
          />
          <div className="rr-row">
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
    <article className="rr-panel">
      <div className="rr-row rr-between">
        <div className="rr-row">
          <span className="rr-avatar" aria-hidden="true">
            {r.customer?.[0] || "C"}
          </span>
          <div>
            <strong>{r.customer}</strong>
            <div className="rr-muted">
              {date(r.createdAt)} · {r.vendor}
              {r.service ? ` / ${r.service}` : ""}
              {r.package ? ` / ${r.package}` : ""}
            </div>
          </div>
        </div>
        {r.status && (
          <span className="rr-badge" data-status={r.status}>
            {r.deleted ? "Deleted" : r.status}
          </span>
        )}
      </div>
      <div className="rr-row" style={{ marginTop: 14 }}>
        <Stars value={r.rating} />
        {r.verified && (
          <span className="rr-badge">
            <ShieldCheck size={12} />
            Verified booking
          </span>
        )}
      </div>
      <h3>{r.title}</h3>
      <p className="rr-break">{r.text}</p>
      <div className="rr-row rr-muted">
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
      {r.reason && <p className="rr-muted">Moderation: {r.reason}</p>}
      {r.response && (
        <div className="rr-response">
          <strong>
            <MessageSquare size={14} style={{ display: "inline" }} /> Response
            from {r.vendor}
          </strong>
          <p className="rr-break">{r.response.text}</p>
          <div className="rr-muted">
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
      <div className="rr-row rr-between">
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
function Pagination({ data, page, setPage }) {
  return data && data.total > data.pageSize ? (
    <nav aria-label="Review pages" className="rr-row">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
        Previous
      </button>
      <span className="rr-muted">
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
      <p className="rr-muted">
        A moderator will review your report. Reporting does not automatically
        remove content.
      </p>
      <form
        className="rr-stack"
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
          <p role="alert" className="rr-error">
            {error}
          </p>
        )}
        <button className="rr-primary" disabled={busy}>
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
    <section className="rr-module" aria-label="Customer reviews">
      <h2>Customer experiences</h2>
      <State state={summary} />
      <RatingSummary data={summary.data} />
      <label style={{ maxWidth: 220, marginBottom: 16 }}>
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
        <p className="rr-notice" role="status">
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
        <div className="rr-panel">
          <Star size={26} />
          <h3>Every celebration has a story</h3>
          <p className="rr-muted">
            No approved reviews match this selection yet.
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
      close={() => {
        if (!busy) close();
      }}
    >
      <p className="rr-muted">
        Reviews are verified against your completed booking and checked before
        publication.
      </p>
      <State state={eligible} />
      <form
        className="rr-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!rating) {
            setError("Choose an overall rating.");
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
            Completed booking and review target
            <select name="target" required defaultValue="">
              <option value="" disabled>
                Choose a vendor or booked service
              </option>
              {targets.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
            {eligible.data && !targets.length && (
              <span className="rr-muted">
                Complete a booking to share your experience.
              </span>
            )}
          </label>
        )}
        <label>
          Overall rating
          <Stars value={rating} onChange={setRating} />
        </label>
        <label>
          Review title (optional)
          <input
            name="title"
            maxLength={200}
            defaultValue={review?.title || ""}
          />
        </label>
        <label>
          Your experience
          <textarea
            name="text"
            required
            minLength={5}
            maxLength={5000}
            rows={5}
            defaultValue={review?.text || ""}
          />
        </label>
        <details>
          <summary>Rate the details (optional)</summary>
          <div className="rr-grid">
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
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} · {ratingLabels[n - 1]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </details>
        <label>
          <span className="rr-row">
            <ImagePlus size={18} />
            Add photos (up to five, 2 MB each)
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <div className="rr-images">
          {keep.map((i) => (
            <div key={i.id}>
              <img src={imageUrl(i.id)} alt="Existing review" />
              <button
                type="button"
                onClick={() => setKeep((k) => k.filter((x) => x.id !== i.id))}
              >
                Remove
              </button>
            </div>
          ))}
          {images.map((i, index) => (
            <div key={index}>
              <img src={i.preview} alt={i.name} />
              <button
                type="button"
                onClick={() =>
                  setImages((old) => old.filter((_, n) => n !== index))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {error && (
          <p className="rr-error" role="alert">
            {error}
          </p>
        )}
        <div className="rr-row">
          <button
            className="rr-primary"
            disabled={busy || (!review && !targets.length)}
          >
            {busy
              ? "Submitting…"
              : review
                ? "Save for moderation"
                : "Submit for moderation"}
          </button>
          <button type="button" disabled={busy} onClick={close}>
            Cancel
          </button>
        </div>
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
        className="rr-stack"
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
          <p className="rr-error" role="alert">
            {error}
          </p>
        )}
        <div className="rr-row">
          <button className="rr-primary" disabled={busy}>
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
function Trends({ trends = [], services = [] }) {
  return (
    <details className="rr-panel">
      <summary>Rating analytics</summary>
      {trends.length ? (
        <div className="rr-table">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Reviews</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((t) => (
                <tr key={t.month}>
                  <td>{t.month}</td>
                  <td>{t.count}</td>
                  <td>{Number(t.rating).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rr-muted">No approved review trends yet.</p>
      )}
      {services.length > 0 && (
        <>
          <h3>Service ratings</h3>
          {services.map((s) => (
            <p key={s.id}>
              {s.name} · {Number(s.rating).toFixed(1)} / 5 · {s.count} reviews
            </p>
          ))}
        </>
      )}
    </details>
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
      status: params.get("status") || "",
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
  return (
    <main className="rr-module">
      {role === "Customer" && (
        <Link className="rr-link" to="/customer/media">
          Manage review photos
        </Link>
      )}
      <div className="rr-row rr-between" style={{ marginBottom: 24 }}>
        <div>
          <p className="rr-muted">{role.toUpperCase()} / REVIEWS & RATINGS</p>
          <h1>
            {role === "Customer"
              ? "Your celebrations, your stories"
              : role === "Vendor"
                ? "Customer experiences"
                : "Review moderation"}
          </h1>
          <p className="rr-muted">
            {role === "Customer"
              ? "Share the details that help another celebration find its perfect match."
              : role === "Vendor"
                ? "Listen, respond, and build trust with every celebration."
                : "Keep customer experiences helpful, fair, and verified."}
          </p>
        </div>
        {role === "Customer" && (
          <button className="rr-primary" onClick={() => setEditing({})}>
            <Plus size={16} />
            Write a review
          </button>
        )}
      </div>
      {notice && (
        <p className="rr-notice" role="status">
          {notice}
        </p>
      )}
      {role === "Admin" && <State state={summary} />}
      {role === "Vendor" && (
        <>
          <State state={summary} />
          <RatingSummary data={summary.data} />
          {summary.data && (
            <p className="rr-muted">
              Response rate: {Number(summary.data.responseRate).toFixed(0)}% ·
              Vendor overall ratings shown above. Service ratings below.
            </p>
          )}
          <Trends
            trends={summary.data?.trends}
            services={summary.data?.services}
          />
        </>
      )}
      {role === "Admin" && summary.data && (
        <>
          <div className="rr-grid">
            {summary.data.counts.map((c) => (
              <button
                className="rr-panel"
                key={c.status}
                onClick={() => choose("status", c.status)}
              >
                {c.status}: {c.count}
              </button>
            ))}
          </div>
          <p className="rr-panel">
            Approved average:{" "}
            {Number(summary.data.averageRating || 0).toFixed(2)} / 5 · Reports
            awaiting review: {summary.data.pendingReports}
          </p>
          <Trends trends={summary.data.trends} />
          <details className="rr-panel">
            <summary>Vendor rankings</summary>
            <h3>Highest rated</h3>
            {summary.data.vendors.slice(0, 5).map((v) => (
              <p key={v.id}>
                {v.name} · {Number(v.rating).toFixed(1)} · {v.count} reviews
              </p>
            ))}
            <h3>Lowest rated</h3>
            {summary.data.vendors
              .slice(-5)
              .reverse()
              .map((v) => (
                <p key={v.id}>
                  {v.name} · {Number(v.rating).toFixed(1)} · {v.count} reviews
                </p>
              ))}
          </details>
        </>
      )}
      <section className="rr-panel">
        <div className="rr-grid">
          <label>
            <span className="rr-row">
              <Search size={14} />
              Search experiences
            </span>
            <input
              value={filters.q}
              maxLength={200}
              onChange={(e) => choose("q", e.target.value)}
              placeholder="Review, title or vendor"
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
                {["Pending", "Approved", "Rejected", "Hidden", "Flagged"].map(
                  (s) => (
                    <option key={s}>{s}</option>
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
        {role === "Admin" && (
          <details style={{ marginTop: 16 }}>
            <summary>Vendor, service and report filters</summary>
            <div className="rr-grid">
              {[
                ["vendorId", "Vendor", "vendors"],
                ["serviceId", "Service", "services"],
                ["categoryId", "Category", "categories"],
              ].map(([key, label, collection]) => (
                <label key={key}>
                  {label}
                  <select
                    value={filters[key]}
                    onChange={(e) => choose(key, e.target.value)}
                  >
                    <option value="">All {label.toLowerCase()}s</option>
                    {metadata.data?.[collection]
                      .filter(
                        (option) =>
                          collection !== "services" ||
                          !filters.vendorId ||
                          option.vendorId.toLowerCase() ===
                            filters.vendorId.toLowerCase(),
                      )
                      .map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
              <label>
                Reports
                <select
                  value={filters.reported}
                  onChange={(e) => choose("reported", e.target.value)}
                >
                  <option value="">All content</option>
                  <option value="true">With pending reports</option>
                </select>
              </label>
            </div>
          </details>
        )}
      </section>
      <State state={state} />
      {state.data?.rows.map((r) => (
        <ReviewCard
          key={r.id}
          review={r}
          report={
            role !== "Admin"
              ? (review, responseId) => setTarget({ review, responseId })
              : null
          }
        >
          <div className="rr-row">
            {role === "Customer" && (
              <>
                {r.canEdit && (
                  <button onClick={() => setEditing(r)}>Edit review</button>
                )}
                <button
                  className="rr-danger"
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
            {role === "Vendor" && (
              <>
                <Link
                  className="rr-link"
                  to={`/vendor/bookings/${r.bookingId}`}
                >
                  View booking
                </Link>
                <button
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
                  {r.response ? "Edit response" : "Write a response"}
                </button>
                {r.response && (
                  <button
                    className="rr-danger"
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
              </>
            )}
            {role === "Admin" && (
              <>
                {["approve", "reject", "hide", "restore", "flag"].map(
                  (name) => (
                    <button
                      key={name}
                      disabled={r.deleted}
                      onClick={() => moderation(r, name)}
                    >
                      {name[0].toUpperCase() + name.slice(1)}
                    </button>
                  ),
                )}
                {r.response && (
                  <button
                    onClick={() =>
                      setAction({
                        title: "Hide vendor response",
                        path: `/admin/reviews/${r.id}/response/hide`,
                        method: "PATCH",
                        reason: true,
                        required: true,
                      })
                    }
                  >
                    Hide response
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      setHistory(await reviewRequest(`/admin/reviews/${r.id}`));
                    } catch (err) {
                      setNotice(err.message);
                    }
                  }}
                >
                  Details & history
                </button>
                <button
                  onClick={() =>
                    setAction({
                      title: "Add internal moderation note",
                      path: `/admin/reviews/${r.id}/notes`,
                      method: "PATCH",
                      notes: true,
                      notesRequired: true,
                    })
                  }
                >
                  Add note
                </button>
              </>
            )}
          </div>
        </ReviewCard>
      ))}
      {state.data && !state.data.rows.length && (
        <div className="rr-panel">
          <Star size={28} />
          <h3>No reviews here yet</h3>
          <p className="rr-muted">
            {role === "Customer"
              ? "Complete a booking to tell your story."
              : "Reviews matching your filters will appear here."}
          </p>
        </div>
      )}
      <Pagination data={state.data} page={page} setPage={setPage} />
      {role === "Admin" && (
        <section className="rr-panel">
          <h2>Reported content</h2>
          <State state={reports} />
          {reports.data?.rows.length === 0 && (
            <p className="rr-muted">No reported content.</p>
          )}
          {reports.data?.rows.map((r) => (
            <article
              key={r.ReportId}
              style={{ borderBottom: "1px solid #e2e8dd", padding: "16px 0" }}
            >
              <div className="rr-row rr-between">
                <strong>
                  {r.vendor} ·{" "}
                  {r.ResponseId ? "Vendor response" : "Customer review"}
                </strong>
                <span className="rr-badge">{r.ReportStatus}</span>
              </div>
              <p>
                {r.ReportReason}: {r.ReportDescription}
              </p>
              <p className="rr-muted">
                Reported by {r.reporter} · {date(r.CreatedAt)}
              </p>
              <p className="rr-break">
                {r.ResponseId ? r.ResponseText : r.ReviewText}
              </p>
              {r.AdminNotes && <p>Decision notes: {r.AdminNotes}</p>}
              {r.ReportStatus === "Pending" && (
                <div className="rr-row">
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
                <span className="rr-response">
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
              <pre className="rr-break">{a.OldValue}</pre>
              <pre className="rr-break">{a.NewValue}</pre>
            </details>
          ))}
        </Dialog>
      )}
    </main>
  );
}
