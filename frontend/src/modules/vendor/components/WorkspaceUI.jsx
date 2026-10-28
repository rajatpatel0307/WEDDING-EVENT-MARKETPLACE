import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Inbox, LoaderCircle, X } from "lucide-react";
import { vendorRequest } from "../services/workspace.api";
export function useVendorData(path, version = 0) {
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    vendorRequest(path, { signal: abort.signal })
      .then(setData)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [path, version, retry]);
  return { data, setData, error, loading, retry: () => setRetry((v) => v + 1) };
}
export function Badge({ children }) {
  const value = String(children || "Unknown");
  return (
    <span
      className={`vw-badge vw-badge-${value.toLowerCase().replace(/\s/g, "")}`}
    >
      {value === "UnderReview"
        ? "Under review"
        : value === "InProgress"
          ? "In progress"
          : value}
    </span>
  );
}
export function Loading() {
  return (
    <div className="vw-loading" role="status">
      <LoaderCircle className="animate-spin" size={20} /> Loading your
      workspace…
    </div>
  );
}
export function ErrorView({ error, retry }) {
  return (
    <div className="vw-error" role="alert">
      <AlertCircle size={19} />
      <div>
        <strong>{error.message}</strong>
        {error.status === 401 ? (
          <Link to="/auth/login">
            Sign in again <ArrowRight size={13} />
          </Link>
        ) : (
          <button onClick={retry} className="vw-button">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "Your records will appear here as your business grows.",
  action,
}) {
  return (
    <div className="vw-empty">
      <span>
        <Inbox size={26} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Heading({
  eyebrow = "YOUR BUSINESS, BEAUTIFULLY CONNECTED",
  title,
  description,
  children,
}) {
  return (
    <div className="vw-page-heading">
      <div>
        <span className="vw-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="vw-heading-actions">{children}</div>
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}) {
  return (
    <section className={`vw-panel ${className}`}>
      <header className="vw-panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function Modal({ title, close, busy, children, wide = false }) {
  const ref = useRef(null),
    label = useId();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className={`vw-modal ${wide ? "vw-modal-wide" : ""}`}
      ref={ref}
      aria-labelledby={label}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <header>
        <h2 id={label}>{title}</h2>
        <button
          className="vw-icon"
          onClick={close}
          disabled={busy}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Field({ label, hint, children, ...props }) {
  return (
    <label className="vw-field">
      <span>{label}</span>
      {children || <input {...props} />}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Image({ src, alt = "", className = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`${className} vw-image-placeholder`}>
      <span>{alt?.[0] || "M"}</span>
    </div>
  );
}
