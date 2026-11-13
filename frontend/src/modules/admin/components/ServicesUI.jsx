import { Children, isValidElement } from "react";
import RequiredMark from "../../../components/ui/RequiredMark";
import {
  AlertCircle,
  Inbox,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Check,
  X,
  Power,
  ShieldOff,
} from "lucide-react";
import { Link } from "react-router-dom";
export function Loading() {
  return (
    <div
      className="space-y-4 animate-pulse"
      role="status"
      aria-label="Loading services"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-16 rounded-xl bg-stone-100" />
      ))}
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div role="alert" className="asm-empty flex flex-col items-center gap-[14px] text-center [padding:55px_20px] text-[#839286] [&_h2]:text-[18px] [&_h2]:text-[#345b4a] [&_h2]:m-[0] [&_p]:text-[13px] [&_p]:max-w-[400px]">
      <AlertCircle size={30} />
      <h2>Unable to load services</h2>
      <p>{error.message}</p>
      <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={retry}>
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  );
}
export function Empty({
  title = "No services found",
  description = "Try a different search or adjust your filters.",
}) {
  return (
    <div className="asm-empty flex flex-col items-center gap-[14px] text-center [padding:55px_20px] text-[#839286] [&_h2]:text-[18px] [&_h2]:text-[#345b4a] [&_h2]:m-[0] [&_p]:text-[13px] [&_p]:max-w-[400px]">
      <Inbox size={34} />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
export function Pager({ data, page, change }) {
  return (
    <footer className="asm-pager pt-[22px] flex justify-between gap-[14px] items-center [@media(width<=767px)]:items-start text-[12px] text-[#7c8981] [@media(width<=767px)]:flex-col">
      <span>
        {data.total
          ? `${(page - 1) * data.pageSize + 1}–${Math.min(page * data.pageSize, data.total)} of ${data.total}`
          : "0 results"}
      </span>
      <div className="flex items-center gap-3">
        <button
          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
          disabled={page <= 1}
          onClick={() => change(page - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
          disabled={page * data.pageSize >= data.total}
          onClick={() => change(page + 1)}
        >
          Next
        </button>
      </div>
    </footer>
  );
}
export function Status({ status, active }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`ad-badge rounded-[5px] inline-flex text-[8px] [padding:3px_7px] [background:#f1f4ed] text-[#85927b] [white-space:normal] [&.ad-badge-approved]:[background:#edf5e9] [&.ad-badge-approved]:text-[#65905d] [&.ad-badge-active]:[background:#edf5e9] [&.ad-badge-active]:text-[#65905d] [&.ad-badge-confirmed]:[background:#edf5e9] [&.ad-badge-confirmed]:text-[#65905d] [&.ad-badge-success]:[background:#edf5e9] [&.ad-badge-success]:text-[#65905d] [&.ad-badge-paid]:[background:#edf5e9] [&.ad-badge-paid]:text-[#65905d] [&.ad-badge-published]:[background:#edf5e9] [&.ad-badge-published]:text-[#65905d] [&.ad-badge-completed]:[background:#edf5e9] [&.ad-badge-completed]:text-[#65905d] [&.ad-badge-pending]:[background:#fbf5e7] [&.ad-badge-pending]:text-[#b09454] [&.ad-badge-underreview]:[background:#fbf5e7] [&.ad-badge-underreview]:text-[#b09454] [&.ad-badge-processing]:[background:#fbf5e7] [&.ad-badge-processing]:text-[#b09454] [&.ad-badge-invited]:[background:#fbf5e7] [&.ad-badge-invited]:text-[#b09454] [&.ad-badge-rejected]:[background:#fcf0eb] [&.ad-badge-rejected]:text-[#bc7c68] [&.ad-badge-cancelled]:[background:#fcf0eb] [&.ad-badge-cancelled]:text-[#bc7c68] [&.ad-badge-failed]:[background:#fcf0eb] [&.ad-badge-failed]:text-[#bc7c68] [&.ad-badge-blocked]:[background:#fcf0eb] [&.ad-badge-blocked]:text-[#bc7c68] [&.ad-badge-suspended]:[background:#fcf0eb] [&.ad-badge-suspended]:text-[#bc7c68] [&.ad-badge-disputed]:[background:#fcf0eb] [&.ad-badge-disputed]:text-[#bc7c68] ad-badge-${status?.toLowerCase()}`}>
        {status === "Pending"
          ? "Pending Approval"
          : status === "UnderReview"
            ? "Admin Review"
            : status}
      </span>
      {active !== undefined && (
        <span
          className={`ad-badge rounded-[5px] inline-flex text-[8px] [padding:3px_7px] [background:#f1f4ed] text-[#85927b] [white-space:normal] [&.ad-badge-approved]:[background:#edf5e9] [&.ad-badge-approved]:text-[#65905d] [&.ad-badge-active]:[background:#edf5e9] [&.ad-badge-active]:text-[#65905d] [&.ad-badge-confirmed]:[background:#edf5e9] [&.ad-badge-confirmed]:text-[#65905d] [&.ad-badge-success]:[background:#edf5e9] [&.ad-badge-success]:text-[#65905d] [&.ad-badge-paid]:[background:#edf5e9] [&.ad-badge-paid]:text-[#65905d] [&.ad-badge-published]:[background:#edf5e9] [&.ad-badge-published]:text-[#65905d] [&.ad-badge-completed]:[background:#edf5e9] [&.ad-badge-completed]:text-[#65905d] [&.ad-badge-pending]:[background:#fbf5e7] [&.ad-badge-pending]:text-[#b09454] [&.ad-badge-underreview]:[background:#fbf5e7] [&.ad-badge-underreview]:text-[#b09454] [&.ad-badge-processing]:[background:#fbf5e7] [&.ad-badge-processing]:text-[#b09454] [&.ad-badge-invited]:[background:#fbf5e7] [&.ad-badge-invited]:text-[#b09454] [&.ad-badge-rejected]:[background:#fcf0eb] [&.ad-badge-rejected]:text-[#bc7c68] [&.ad-badge-cancelled]:[background:#fcf0eb] [&.ad-badge-cancelled]:text-[#bc7c68] [&.ad-badge-failed]:[background:#fcf0eb] [&.ad-badge-failed]:text-[#bc7c68] [&.ad-badge-blocked]:[background:#fcf0eb] [&.ad-badge-blocked]:text-[#bc7c68] [&.ad-badge-suspended]:[background:#fcf0eb] [&.ad-badge-suspended]:text-[#bc7c68] [&.ad-badge-disputed]:[background:#fcf0eb] [&.ad-badge-disputed]:text-[#bc7c68] ${active ? "ad-badge-approved [&.ad-badge-approved]:[background:#edf5e9] [&.ad-badge-approved]:text-[#65905d]" : "ad-badge-draft"}`}
        >
          {active ? "Active" : "Inactive"}
        </span>
      )}
    </div>
  );
}
const icons = {
  view: Eye,
  edit: Pencil,
  approve: Check,
  reject: X,
  suspend: ShieldOff,
  activate: Power,
  deactivate: Power,
  duplicate: Copy,
  delete: Trash2,
};
export function ServiceActions({ row, action, inline = false, iconsOnly = false }) {
  const iconButtonClass = "inline-flex size-[30px] shrink-0 items-center justify-center rounded-[7px] border border-[#e2e9e3] bg-white text-[#6a8372] transition-colors hover:border-[#b8cebf] hover:bg-[#f1f6f1] hover:text-[#176b60] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60]";
  const buttons = (row.actions || []).map((key) => {
    const Icon = icons[key] || MoreHorizontal,
      label = key[0].toUpperCase() + key.slice(1);
    if (key === "view" || key === "edit")
      return (
        <Link
          key={key}
          title={iconsOnly ? label : undefined}
          aria-label={`${label} ${row.name || "service"}`}
          className={iconsOnly ? iconButtonClass : "ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"}
          to={`/admin/services/${row.id}${key === "edit" ? "/edit" : ""}`}
        >
          <Icon size={14} aria-hidden="true" />
          {iconsOnly ? <span className="sr-only">{label}</span> : label}
        </Link>
      );
    return (
      <button
        key={key}
        type="button"
        title={iconsOnly ? label : undefined}
        aria-label={`${label} ${row.name || "service"}`}
        className={iconsOnly ? `${iconButtonClass} ${key === "delete" || key === "reject" ? "text-[#b14b52] hover:bg-[#fff3ef] hover:text-[#a23f47]" : ""}` : `ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] ${key === "delete" || key === "reject" ? "asm-danger-text [&.asm-danger-text]:text-[#b14b52]!" : ""}`}
        onClick={(e) => {
          e.currentTarget.closest("details")?.removeAttribute("open");
          action(row, key);
        }}
      >
        <Icon size={14} aria-hidden="true" />
        {iconsOnly ? <span className="sr-only">{label}</span> : label}
      </button>
    );
  });
  return inline || iconsOnly ? (
    <div className={iconsOnly ? "flex flex-wrap items-center gap-[4px]" : "flex flex-wrap gap-2"} role="group" aria-label={`Actions for ${row.name || "service"}`}>{buttons}</div>
  ) : (
    <details
      className="asm-menu relative [&_summary]:[list-style:none] [&_summary]:cursor-pointer [&_summary]:p-[7px] [&_summary]:[border-top-width:1px] [&_summary]:[border-top-style:solid] [&_summary]:[border-top-color:#e0e7e1] [&_summary]:[border-right-width:1px] [&_summary]:[border-right-style:solid] [&_summary]:[border-right-color:#e0e7e1] [&_summary]:[border-bottom-width:1px] [&_summary]:[border-bottom-style:solid] [&_summary]:[border-bottom-color:#e0e7e1] [&_summary]:[border-left-width:1px] [&_summary]:[border-left-style:solid] [&_summary]:[border-left-color:#e0e7e1] [&_summary]:rounded-[7px] [&_summary]:w-[max-content] [&_summary::-webkit-details-marker]:hidden [&[open]_>_div]:fixed [&[open]_>_div]:right-[auto] [&[open]_>_div]:bottom-[auto] [&[open]_>_div]:z-[40] [&[open]_>_div]:min-w-[175px] [&[open]_>_div]:p-[7px] [&[open]_>_div]:grid [&[open]_>_div]:gap-[4px] [&[open]_>_div]:[background:#fff] [&[open]_>_div]:[border-top-width:1px] [&[open]_>_div]:[border-top-style:solid] [&[open]_>_div]:[border-top-color:#e0e7e1] [&[open]_>_div]:[border-right-width:1px] [&[open]_>_div]:[border-right-style:solid] [&[open]_>_div]:[border-right-color:#e0e7e1] [&[open]_>_div]:[border-bottom-width:1px] [&[open]_>_div]:[border-bottom-style:solid] [&[open]_>_div]:[border-bottom-color:#e0e7e1] [&[open]_>_div]:[border-left-width:1px] [&[open]_>_div]:[border-left-style:solid] [&[open]_>_div]:[border-left-color:#e0e7e1] [&[open]_>_div]:[box-shadow:0_10px_35px_#153f2724] [&[open]_>_div]:rounded-[10px] [&_.ad-button]:[border-top-width:0] [&_.ad-button]:[border-top-style:none] [&_.ad-button]:[border-top-color:currentColor] [&_.ad-button]:[border-right-width:0] [&_.ad-button]:[border-right-style:none] [&_.ad-button]:[border-right-color:currentColor] [&_.ad-button]:[border-bottom-width:0] [&_.ad-button]:[border-bottom-style:none] [&_.ad-button]:[border-bottom-color:currentColor] [&_.ad-button]:[border-left-width:0] [&_.ad-button]:[border-left-style:none] [&_.ad-button]:[border-left-color:currentColor] [&_.ad-button]:justify-start [&[open]_>_div]:max-h-[70vh] [&[open]_>_div]:[overflow-x:auto] [&[open]_>_div]:overflow-y-auto"
      onKeyDown={(e) => {
        if (e.key === "Escape") e.currentTarget.removeAttribute("open");
      }}
      onToggle={(e) => {
        if (!e.currentTarget.open) return;
        const rect = e.currentTarget.getBoundingClientRect(),
          menu = e.currentTarget.querySelector(":scope > div");
        menu.style.left = `${Math.max(8, Math.min(rect.right - 175, window.innerWidth - 190))}px`;
        menu.style.top = `${Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - menu.scrollHeight - 16))}px`;
      }}
    >
      <summary aria-label={`Actions for ${row.name}`}>
        <MoreHorizontal size={21} />
      </summary>
      <div>{buttons}</div>
    </details>
  );
}
export function Field({ label, children, ...props }) {
  const required = props.required || Children.toArray(children).some(
    (child) => isValidElement(child) && child.props.required,
  );
  return (
    <label className="asm-field flex flex-col gap-[8px] [margin:0_0_16px] text-[12px] text-[#587466] [&_>_span]:font-[550] [&_input]:w-full [&_input]:[padding:11px_12px] [&_input]:[border-top-width:1px] [&_input]:[border-top-style:solid] [&_input]:[border-top-color:#dce5df] [&_input]:[border-right-width:1px] [&_input]:[border-right-style:solid] [&_input]:[border-right-color:#dce5df] [&_input]:[border-bottom-width:1px] [&_input]:[border-bottom-style:solid] [&_input]:[border-bottom-color:#dce5df] [&_input]:[border-left-width:1px] [&_input]:[border-left-style:solid] [&_input]:[border-left-color:#dce5df] [&_input]:rounded-[7px] [&_input]:text-[#2d4b3b] [&_input]:[background:#fff] [&_input]:text-[13px] [&_select]:w-full [&_select]:[padding:11px_12px] [&_select]:[border-top-width:1px] [&_select]:[border-top-style:solid] [&_select]:[border-top-color:#dce5df] [&_select]:[border-right-width:1px] [&_select]:[border-right-style:solid] [&_select]:[border-right-color:#dce5df] [&_select]:[border-bottom-width:1px] [&_select]:[border-bottom-style:solid] [&_select]:[border-bottom-color:#dce5df] [&_select]:[border-left-width:1px] [&_select]:[border-left-style:solid] [&_select]:[border-left-color:#dce5df] [&_select]:rounded-[7px] [&_select]:text-[#2d4b3b] [&_select]:[background:#fff] [&_select]:text-[13px] [&_textarea]:w-full [&_textarea]:[padding:11px_12px] [&_textarea]:[border-top-width:1px] [&_textarea]:[border-top-style:solid] [&_textarea]:[border-top-color:#dce5df] [&_textarea]:[border-right-width:1px] [&_textarea]:[border-right-style:solid] [&_textarea]:[border-right-color:#dce5df] [&_textarea]:[border-bottom-width:1px] [&_textarea]:[border-bottom-style:solid] [&_textarea]:[border-bottom-color:#dce5df] [&_textarea]:[border-left-width:1px] [&_textarea]:[border-left-style:solid] [&_textarea]:[border-left-color:#dce5df] [&_textarea]:rounded-[7px] [&_textarea]:text-[#2d4b3b] [&_textarea]:[background:#fff] [&_textarea]:text-[13px] [&_textarea]:[resize:vertical] [&_textarea]:min-h-[85px] [&_input:focus]:[outline:2px_solid_#a7c3b6] [&_input:focus]:[outline-offset:2px] [&_textarea:focus]:[outline:2px_solid_#a7c3b6] [&_textarea:focus]:[outline-offset:2px] [&_select:focus]:[outline:2px_solid_#a7c3b6] [&_select:focus]:[outline-offset:2px]">
      <span>{label}{required && <RequiredMark />}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Definition({ values }) {
  return (
    <dl className="asm-definition grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[4px_28px] [&_>_div]:[padding:13px_0] [&_>_div]:[border-bottom-width:1px] [&_>_div]:[border-bottom-style:solid] [&_>_div]:[border-bottom-color:#edf1ed] [&_>_div]:min-w-0 [&_dt]:text-[11px] [&_dt]:text-[#83968b] [&_dt]:mb-[5px] [&_dt]:capitalize [&_dd]:text-[13px] [&_dd]:whitespace-pre-wrap [&_dd]:[overflow-wrap:anywhere]">
      {Object.entries(values).map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {value === null || value === undefined || value === ""
              ? "Not provided"
              : typeof value === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
