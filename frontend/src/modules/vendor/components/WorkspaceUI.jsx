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
      className={`vw-badge inline-flex items-center [padding:3px_7px] rounded-[5px] text-[8px] font-medium leading-[1.5]
        text-[#96a486] [background:#f0f4e9] whitespace-normal [&.vw-badge-approved]:[background:#edf5e4]
        [&.vw-badge-approved]:text-[#7a9b5b] [&.vw-badge-active]:[background:#edf5e4]
        [&.vw-badge-active]:text-[#7a9b5b] [&.vw-badge-confirmed]:[background:#edf5e4]
        [&.vw-badge-confirmed]:text-[#7a9b5b] [&.vw-badge-completed]:[background:#edf5e4]
        [&.vw-badge-completed]:text-[#7a9b5b] [&.vw-badge-paid]:[background:#edf5e4]
        [&.vw-badge-paid]:text-[#7a9b5b] [&.vw-badge-success]:[background:#edf5e4]
        [&.vw-badge-success]:text-[#7a9b5b] [&.vw-badge-accepted]:[background:#edf5e4]
        [&.vw-badge-accepted]:text-[#7a9b5b] [&.vw-badge-available]:[background:#edf5e4]
        [&.vw-badge-available]:text-[#7a9b5b] [&.vw-badge-published]:[background:#edf5e4]
        [&.vw-badge-published]:text-[#7a9b5b] [&.vw-badge-pending]:text-[#b2a06a]
        [&.vw-badge-pending]:[background:#fbf6e8] [&.vw-badge-processing]:text-[#b2a06a]
        [&.vw-badge-processing]:[background:#fbf6e8] [&.vw-badge-draft]:text-[#718070]
        [&.vw-badge-draft]:[background:#f0f2ed] [&.vw-badge-paymentpending]:text-[#b2a06a]
        [&.vw-badge-paymentpending]:[background:#fbf6e8] [&.vw-badge-underreview]:text-[#b2a06a]
        [&.vw-badge-underreview]:[background:#fbf6e8] [&.vw-badge-rejected]:text-[#c08d78]
        [&.vw-badge-rejected]:[background:#fcf1e9] [&.vw-badge-cancelled]:text-[#c08d78]
        [&.vw-badge-cancelled]:[background:#fcf1e9] [&.vw-badge-failed]:text-[#c08d78]
        [&.vw-badge-failed]:[background:#fcf1e9] [&.vw-badge-suspended]:text-[#8c628e]
        [&.vw-badge-suspended]:[background:#f6edf6] [&.vw-badge-blocked]:text-[#c08d78]
        [&.vw-badge-blocked]:[background:#fcf1e9] [&.vw-badge-sent]:text-[#79a399]
        [&.vw-badge-sent]:[background:#ebf4ef] [&.vw-badge-viewed]:text-[#79a399]
        [&.vw-badge-viewed]:[background:#ebf4ef] [&.vw-badge-inprogress]:text-[#79a399]
        [&.vw-badge-inprogress]:[background:#ebf4ef] [&.vw-badge-pendingapproval]:text-[#ab8a3c]
        [&.vw-badge-pendingapproval]:[background:#fcf6e5] vw-badge-${value.toLowerCase().replace(/\s/g, "")}`}
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
    <section className={`vw-panel [background:#fff] [border-top:1px_solid_#e4eade] [border-right:1px_solid_#e4eade]
      [border-bottom:1px_solid_#e4eade] [border-left:1px_solid_#e4eade] rounded-[10px] min-w-[0]
      overflow-hidden ${className}`}>
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
      className={`[&_h2]:[font-family:Inter,_'Segoe_UI',_Arial,_sans-serif] [&_h2]:text-[#2b4638] [&_h2]:font-semibold
        [&_h2]:tracking-[-0.4px] [&_h2]:m-[0] [&_h2]:text-[15px] [&_button]:cursor-pointer
        [&_:where(input)]:[font:inherit] [&_:where(input)]:[border-top:1px_solid_#e0e7dd]
        [&_:where(input)]:[border-right:1px_solid_#e0e7dd]
        [&_:where(input)]:[border-bottom:1px_solid_#e0e7dd]
        [&_:where(input)]:[border-left:1px_solid_#e0e7dd] [&_:where(input)]:[background:#fff]
        [&_:where(input)]:text-[#42573f] [&_:where(input)]:rounded-[7px]
        [&_:where(input)]:[padding:10px_12px] [&_:where(input)]:min-w-[0]
        [&_:where(input)]:[box-shadow:none] [&_:where(input)]:leading-[1.6]
        [&_:where(select)]:[font:inherit] [&_:where(select)]:[border-top:1px_solid_#e0e7dd]
        [&_:where(select)]:[border-right:1px_solid_#e0e7dd]
        [&_:where(select)]:[border-bottom:1px_solid_#e0e7dd]
        [&_:where(select)]:[border-left:1px_solid_#e0e7dd] [&_:where(select)]:[background:#fff]
        [&_:where(select)]:text-[#42573f] [&_:where(select)]:rounded-[7px]
        [&_:where(select)]:[padding:10px_12px] [&_:where(select)]:min-w-[0]
        [&_:where(select)]:[box-shadow:none] [&_:where(select)]:leading-[1.6]
        [&_:where(textarea)]:[font:inherit] [&_:where(textarea)]:[border-top:1px_solid_#e0e7dd]
        [&_:where(textarea)]:[border-right:1px_solid_#e0e7dd]
        [&_:where(textarea)]:[border-bottom:1px_solid_#e0e7dd]
        [&_:where(textarea)]:[border-left:1px_solid_#e0e7dd] [&_:where(textarea)]:[background:#fff]
        [&_:where(textarea)]:text-[#42573f] [&_:where(textarea)]:rounded-[7px]
        [&_:where(textarea)]:[padding:10px_12px] [&_:where(textarea)]:min-w-[0]
        [&_:where(textarea)]:[box-shadow:none] [&_:where(textarea)]:leading-[1.6]
        [&_:focus-visible]:[outline:2px_solid_#8aaf94] [&_:focus-visible]:[outline-offset:3px]
        [&_input:focus]:[outline:2px_solid_#b8ceb9] [&_input:focus]:[outline-offset:1px]
        [&_textarea:focus]:[outline:2px_solid_#b8ceb9] [&_textarea:focus]:[outline-offset:1px]
        [&_select:focus]:[outline:2px_solid_#b8ceb9] [&_select:focus]:[outline-offset:1px] text-[#5d7651]
        [border-top:1px_solid_#dfe9d5] [border-right:1px_solid_#dfe9d5] [border-bottom:1px_solid_#dfe9d5]
        [border-left:1px_solid_#dfe9d5] rounded-[12px] p-[0] max-h-[90dvh] w-[calc(100vw_-_32px)]
        max-w-[590px] [background:white] [box-shadow:0_25px_100px_#18321c25] m-[auto] overflow-y-auto
        [&.vw-modal-wide]:max-w-[850px] [&::backdrop]:[background:#243d2f66]
        [&::backdrop]:[backdrop-filter:blur(3px)] [&_>_header]:sticky [&_>_header]:top-[0]
        [&_>_header]:flex [&_>_header]:items-center [&_>_header]:justify-between [&_>_header]:gap-[15px]
        [&_>_header]:[padding:18px_23px] [&_>_header]:[border-bottom:1px_solid_#e8eedf]
        [&_>_header]:[background:white] [&_>_header]:z-[1] ${wide ? "vw-modal-wide" : ""}`}
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
    <div className={`${className} grid place-items-center [background:linear-gradient(125deg,_#e8efde,_#f5f7f0)] text-[#b2c29c]
      [&_>_span]:[font-family:Georgia,_serif] [&_>_span]:text-[45px] [&_>_span]:font-normal`}>
      <span>{alt?.[0] || "M"}</span>
    </div>
  );
}
