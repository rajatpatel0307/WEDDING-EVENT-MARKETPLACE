import { vendorClasses } from "../styles";
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
      className={vendorClasses(`vw-badge vw-badge-${value.toLowerCase().replace(/\s/g, "")}`)}
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
    <div className="flex items-center justify-center gap-[11px] text-[#94a585] min-h-[180px] p-[35px] text-[11px]" role="status">
      <LoaderCircle className="animate-spin" size={20} /> Loading your
      workspace…
    </div>
  );
}
export function ErrorView({ error, retry }) {
  return (
    <div className="
      flex items-start gap-[12px] m-[15px] p-[19px] [border-top:1px_solid_#efdcd0]
      [border-right:1px_solid_#efdcd0] [border-bottom:1px_solid_#efdcd0] [border-left:1px_solid_#efdcd0]
      rounded-[8px] [background:#fff9f5] text-[#b78270] text-[12px] [&_>_div]:grid [&_>_div]:gap-[12px]
      [&_>_div]:[justify-items:start] [&_strong]:font-medium [&_a]:flex [&_a]:items-center [&_a]:gap-[5px]
    " role="alert">
      <AlertCircle size={19} />
      <div>
        <strong>{error.message}</strong>
        {error.status === 401 ? (
          <Link to="/auth/login">
            Sign in again <ArrowRight size={13} />
          </Link>
        ) : (
          <button onClick={retry} className="
            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
          ">
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
    <div className="
      vw-empty flex items-center justify-center flex-col gap-[10px] [padding:38px_25px] text-center
      min-h-[220px] [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:w-[53px] [&_>_span]:h-[53px]
      [&_>_span]:[background:#f3f6ed] [&_>_span]:rounded-[14px] [&_>_span]:text-[#b5c2a4]
      [&_>_span]:mb-[3px] [&_h3]:text-[13px] [&_h3]:font-medium [&_h3]:text-[#91a27e] [&_p]:text-[10px]
      [&_p]:max-w-[350px] [&_p]:leading-[1.9] [&_p]:text-[#b0ba9e]
    ">
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
    <div className="
      flex items-center justify-between gap-[20px] [&_h1]:text-[27px] [&_h1]:[margin:6px_0]
      [&_h1]:leading-[1.3] [&_p]:text-[11px] [&_p]:[margin:3px_0_0] vendor-tablet:[&_h1]:text-[24px]
      vendor-mobile:items-start vendor-mobile:gap-[12px] vendor-mobile:[&_h1]:text-[23px]
      vendor-mobile:[&_p]:text-[10px] vendor-phone:flex-col
    ">
      <div>
        <span className="text-[#9aa890] text-[8px] tracking-[1.6px] font-medium">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="
        flex items-center gap-[14px] shrink-0 vendor-mobile:pt-[8px]
        vendor-mobile:[&_>_.vw-button]:text-[8px] vendor-mobile:[&_>_.vw-button]:[padding:8px_10px]
        vendor-phone:[align-self:stretch] vendor-phone:justify-end vendor-phone:pt-[0]
      ">{children}</div>
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
    <section className={vendorClasses(`vw-panel ${className}`)}>
      <header className="
        flex items-center justify-between gap-[14px] [padding:20px_23px] [&_h2]:text-[13px]
        [&_h2]:font-semibold [&_p]:[margin:4px_0_0] [&_p]:text-[9px] [&_p]:text-[#a0ad94]
        vendor-mobile:p-[17px] vendor-mobile:[&_p]:text-[8px] vendor-phone:flex-wrap
      ">
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
      className={vendorClasses(`vw-modal ${wide ? "vw-modal-wide" : ""}`)}
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
          type="button"
          className="
            vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
            [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
            [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
            [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
          "
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
    <label className="
      vw-field grid gap-[7px] min-w-[0] text-[#6f845e] text-[10px] font-medium [&_>_span:first-child]:block
      [&_input]:w-[100%] [&_input]:text-[11px] [&_input]:font-normal [&_input]:text-[#536d43]
      [&_select]:w-[100%] [&_select]:text-[11px] [&_select]:font-normal [&_select]:text-[#536d43]
      [&_textarea]:w-[100%] [&_textarea]:text-[11px] [&_textarea]:font-normal [&_textarea]:text-[#536d43]
      [&_small]:text-[#aebc9e] [&_small]:text-[8px] [&_small]:font-normal
    ">
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
    <div className={vendorClasses(`${className} vw-image-placeholder`)}>
      <span>{alt?.[0] || "M"}</span>
    </div>
  );
}
