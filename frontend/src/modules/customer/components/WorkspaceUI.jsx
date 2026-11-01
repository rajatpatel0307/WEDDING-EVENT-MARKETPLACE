import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Inbox, LoaderCircle, X } from "lucide-react";
import { customerRequest } from "../services/workspace.api";
export function useCustomerData(path, version = 0) {
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    customerRequest(path, { signal: abort.signal })
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
      className={`cw-badge inline-flex items-center pt-[3px] pr-[7px] pb-[3px] pl-[7px] rounded-[5px] text-[8px] font-[500] leading-[1.5] text-[#96a486] [background:#f0f4e9] [white-space:normal] [&.cw-badge-approved]:[background:#edf5e4] [&.cw-badge-approved]:text-[#7a9b5b] [&.cw-badge-active]:[background:#edf5e4] [&.cw-badge-active]:text-[#7a9b5b] [&.cw-badge-confirmed]:[background:#edf5e4] [&.cw-badge-confirmed]:text-[#7a9b5b] [&.cw-badge-completed]:[background:#edf5e4] [&.cw-badge-completed]:text-[#7a9b5b] [&.cw-badge-paid]:[background:#edf5e4] [&.cw-badge-paid]:text-[#7a9b5b] [&.cw-badge-success]:[background:#edf5e4] [&.cw-badge-success]:text-[#7a9b5b] [&.cw-badge-accepted]:[background:#edf5e4] [&.cw-badge-accepted]:text-[#7a9b5b] [&.cw-badge-available]:[background:#edf5e4] [&.cw-badge-available]:text-[#7a9b5b] [&.cw-badge-published]:[background:#edf5e4] [&.cw-badge-published]:text-[#7a9b5b] [&.cw-badge-pending]:text-[#b2a06a] [&.cw-badge-pending]:[background:#fbf6e8] [&.cw-badge-processing]:text-[#b2a06a] [&.cw-badge-processing]:[background:#fbf6e8] [&.cw-badge-draft]:text-[#b2a06a] [&.cw-badge-draft]:[background:#fbf6e8] [&.cw-badge-paymentpending]:text-[#b2a06a] [&.cw-badge-paymentpending]:[background:#fbf6e8] [&.cw-badge-underreview]:text-[#b2a06a] [&.cw-badge-underreview]:[background:#fbf6e8] [&.cw-badge-rejected]:text-[#c08d78] [&.cw-badge-rejected]:[background:#fcf1e9] [&.cw-badge-cancelled]:text-[#c08d78] [&.cw-badge-cancelled]:[background:#fcf1e9] [&.cw-badge-failed]:text-[#c08d78] [&.cw-badge-failed]:[background:#fcf1e9] [&.cw-badge-suspended]:text-[#c08d78] [&.cw-badge-suspended]:[background:#fcf1e9] [&.cw-badge-blocked]:text-[#c08d78] [&.cw-badge-blocked]:[background:#fcf1e9] [&.cw-badge-sent]:text-[#79a399] [&.cw-badge-sent]:[background:#ebf4ef] [&.cw-badge-viewed]:text-[#79a399] [&.cw-badge-viewed]:[background:#ebf4ef] [&.cw-badge-inprogress]:text-[#79a399] [&.cw-badge-inprogress]:[background:#ebf4ef] cw-badge-${value.toLowerCase().replace(/\s/g, "")}`}
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
    <div className="cw-loading flex items-center justify-center gap-[11px] text-[#94a585] min-h-[180px] pt-[35px] pr-[35px] pb-[35px] pl-[35px] text-[11px]" role="status">
      <LoaderCircle className="animate-spin" size={20} /> Loading your
      workspace…
    </div>
  );
}
export function ErrorView({ error, retry }) {
  return (
    <div className="cw-error flex items-start gap-[12px] mt-[15px] mr-[15px] mb-[15px] ml-[15px] pt-[19px] pr-[19px] pb-[19px] pl-[19px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#efdcd0] [border-right-width:1px] [border-right-style:solid] [border-right-color:#efdcd0] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#efdcd0] [border-left-width:1px] [border-left-style:solid] [border-left-color:#efdcd0] rounded-[8px] [background:#fff9f5] text-[#b78270] text-[12px] [&_>_div]:grid [&_>_div]:gap-[12px] [&_>_div]:[justify-items:start] [&_strong]:font-[500] [&_a]:flex [&_a]:items-center [&_a]:gap-[5px]" role="alert">
      <AlertCircle size={19} />
      <div>
        <strong>{error.message}</strong>
        {error.status === 401 ? (
          <Link to="/auth/login">
            Sign in again <ArrowRight size={13} />
          </Link>
        ) : (
          <button onClick={retry} className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "Your records will appear here as you plan your celebration.",
  action,
}) {
  return (
    <div className="cw-empty flex items-center justify-center flex-col gap-[10px] pt-[38px] pr-[25px] pb-[38px] pl-[25px] text-center min-h-[220px] [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:w-[53px] [&_>_span]:h-[53px] [&_>_span]:[background:#f3f6ed] [&_>_span]:rounded-[14px] [&_>_span]:text-[#b5c2a4] [&_>_span]:mb-[3px] [&_h3]:text-[13px] [&_h3]:font-[500] [&_p]:max-w-[350px]">
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
  eyebrow = "YOUR CELEBRATION, BEAUTIFULLY PLANNED",
  title,
  description,
  children,
}) {
  return (
    <div className="cw-page-heading flex items-center [@media(width<=767px)]:items-start justify-between gap-[20px] [@media(width<=767px)]:gap-[12px] [&_h1]:mt-[6px] [&_h1]:mr-[0] [&_h1]:mb-[6px] [&_h1]:ml-[0] [&_p]:mt-[3px] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [@media(width<=520px)]:flex-col">
      <div>
        <span className="cw-eyebrow text-[#9aa890] text-[8px] tracking-[1.6px] font-[500]">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="cw-heading-actions flex items-center gap-[14px] shrink-0 [@media(width<=520px)]:pt-[0] [@media(520px<width<=767px)]:pt-[8px] [@media(width<=767px)]:[&_>_.cw-button]:pt-[8px] [@media(width<=767px)]:[&_>_.cw-button]:pr-[10px] [@media(width<=767px)]:[&_>_.cw-button]:pb-[8px] [@media(width<=767px)]:[&_>_.cw-button]:pl-[10px] [@media(width<=520px)]:[align-self:stretch] [@media(width<=520px)]:justify-end">{children}</div>
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
    <section className={`cw-panel [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden ${className}`}>
      <header className="cw-panel-heading flex items-center justify-between gap-[14px] pt-[20px] [@media(width<=767px)]:pt-[17px] pr-[23px] [@media(width<=767px)]:pr-[17px] pb-[20px] [@media(width<=767px)]:pb-[17px] pl-[23px] [@media(width<=767px)]:pl-[17px] [&_p]:mt-[4px] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [@media(width<=520px)]:flex-wrap">
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
      className={`cw-modal [&_:where(h2)]:tracking-[-0.4px] [&_:where(h2)]:mt-[0] [&_:where(h2)]:mr-[0] [&_:where(h2)]:mb-[0] [&_:where(h2)]:ml-[0] [&_button]:cursor-pointer [&_:where(input)]:[font:inherit] [&_:where(input)]:[border-top-width:1px] [&_:where(input)]:[border-top-style:solid] [&_:where(input)]:[border-right-width:1px] [&_:where(input)]:[border-right-style:solid] [&_:where(input)]:[border-bottom-width:1px] [&_:where(input)]:[border-bottom-style:solid] [&_:where(input)]:[border-left-width:1px] [&_:where(input)]:[border-left-style:solid] [&_:where(input)]:[background:#fff] [&_:where(input)]:rounded-[7px] [&_:where(input)]:pt-[10px] [&_:where(input)]:pr-[12px] [&_:where(input)]:pb-[10px] [&_:where(input)]:pl-[12px] [&_:where(input)]:min-w-0 [&_:where(input)]:[box-shadow:none] [&_:where(input)]:leading-[1.6] [&_:where(select)]:[font:inherit] [&_:where(select)]:[border-top-width:1px] [&_:where(select)]:[border-top-style:solid] [&_:where(select)]:[border-right-width:1px] [&_:where(select)]:[border-right-style:solid] [&_:where(select)]:[border-bottom-width:1px] [&_:where(select)]:[border-bottom-style:solid] [&_:where(select)]:[border-left-width:1px] [&_:where(select)]:[border-left-style:solid] [&_:where(select)]:[background:#fff] [&_:where(select)]:rounded-[7px] [&_:where(select)]:pt-[10px] [&_:where(select)]:pr-[12px] [&_:where(select)]:pb-[10px] [&_:where(select)]:pl-[12px] [&_:where(select)]:min-w-0 [&_:where(select)]:[box-shadow:none] [&_:where(select)]:leading-[1.6] [&_:where(textarea)]:[font:inherit] [&_:where(textarea)]:[border-top-width:1px] [&_:where(textarea)]:[border-top-style:solid] [&_:where(textarea)]:[border-right-width:1px] [&_:where(textarea)]:[border-right-style:solid] [&_:where(textarea)]:[border-bottom-width:1px] [&_:where(textarea)]:[border-bottom-style:solid] [&_:where(textarea)]:[border-left-width:1px] [&_:where(textarea)]:[border-left-style:solid] [&_:where(textarea)]:[background:#fff] [&_:where(textarea)]:rounded-[7px] [&_:where(textarea)]:pt-[10px] [&_:where(textarea)]:pr-[12px] [&_:where(textarea)]:pb-[10px] [&_:where(textarea)]:pl-[12px] [&_:where(textarea)]:min-w-0 [&_:where(textarea)]:[box-shadow:none] [&_:where(textarea)]:leading-[1.6] [&_:focus-visible]:[outline:2px_solid_#8aaf94] [&_:focus-visible]:[outline-offset:3px] [&_:where(input):focus]:[outline:2px_solid_#b8ceb9] [&_:where(input):focus]:[outline-offset:1px] [&_:where(textarea):focus]:[outline:2px_solid_#b8ceb9] [&_:where(textarea):focus]:[outline-offset:1px] [&_:where(select):focus]:[outline:2px_solid_#b8ceb9] [&_:where(select):focus]:[outline-offset:1px] text-[#6c5456] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe9d5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe9d5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe9d5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe9d5] rounded-[12px] pt-[0] pr-[0] pb-[0] pl-[0] max-h-[90dvh] w-[calc(100vw_-_32px)] max-w-[590px] [background:white] [box-shadow:0_25px_100px_#18321c25] mt-[auto] mr-[auto] mb-[auto] ml-[auto] overflow-y-auto [&.cw-modal-wide]:max-w-[850px] [&::backdrop]:[background:#243d2f66] [&::backdrop]:[backdrop-filter:blur(3px)] [&_>_header]:sticky [&_>_header]:top-[0] [&_>_header]:flex [&_>_header]:items-center [&_>_header]:justify-between [&_>_header]:gap-[15px] [&_>_header]:pt-[18px] [&_>_header]:pr-[23px] [&_>_header]:pb-[18px] [&_>_header]:pl-[23px] [&_>_header]:[border-bottom-width:1px] [&_>_header]:[border-bottom-style:solid] [&_>_header]:[border-bottom-color:#e8eedf] [&_>_header]:[background:white] [&_>_header]:z-[1] [font-family:Inter,_'Segoe_UI',_sans-serif] [&_h2]:[font-family:Georgia,_serif] [&_h2]:text-[#684e56] [&_h2]:font-[400] [&_h2]:text-[26px] [&_.cw-primary]:[background:#925469] [&_.cw-primary]:[border-top-color:#925469] [&_.cw-primary]:[border-right-color:#925469] [&_.cw-primary]:[border-bottom-color:#925469] [&_.cw-primary]:[border-left-color:#925469] [&_input]:[border-top-color:#e6dcd5] [&_input]:[border-right-color:#e6dcd5] [&_input]:[border-bottom-color:#e6dcd5] [&_input]:[border-left-color:#e6dcd5] [&_input]:text-[#795e63] [&_select]:[border-top-color:#e6dcd5] [&_select]:[border-right-color:#e6dcd5] [&_select]:[border-bottom-color:#e6dcd5] [&_select]:[border-left-color:#e6dcd5] [&_select]:text-[#795e63] [&_textarea]:[border-top-color:#e6dcd5] [&_textarea]:[border-right-color:#e6dcd5] [&_textarea]:[border-bottom-color:#e6dcd5] [&_textarea]:[border-left-color:#e6dcd5] [&_textarea]:text-[#795e63] [&_.cw-form]:mt-[20px] [&_.cw-field_>_span]:text-[#9b7f7f] [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-[#9e8b83] [&_.cw-form-error]:text-[#b63751] [@media(width<=520px)]:[&_.cw-form-grid]:grid-cols-[1fr] ${wide ? "cw-modal-wide" : ""}`}
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
          className="cw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e] [background:none] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] rounded-[5px] pt-[0] pr-[0] pb-[0] pl-[0] [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]"
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
    <label className="cw-field grid gap-[7px] min-w-0 text-[#6f845e] text-[10px] font-[500] [&_>_span:first-child]:block [&_input]:w-full [&_input]:text-[11px] [&_input]:font-[400] [&_select]:w-full [&_select]:text-[11px] [&_select]:font-[400] [&_textarea]:w-full [&_textarea]:text-[11px] [&_textarea]:font-[400] [&_small]:text-[#aebc9e] [&_small]:text-[8px] [&_small]:font-[400]">
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
    <div className={`${className} cw-image-placeholder grid place-items-center [background:linear-gradient(125deg,_#e8efde,_#f5f7f0)] text-[#b2c29c] [&_>_span]:[font-family:Georgia,_serif] [&_>_span]:text-[45px] [&_>_span]:font-[400]`}>
      <span>{alt?.[0] || "M"}</span>
    </div>
  );
}
