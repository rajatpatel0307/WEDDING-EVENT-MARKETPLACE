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
    <div role="alert" className="asm-empty">
      <AlertCircle size={30} />
      <h2>Unable to load services</h2>
      <p>{error.message}</p>
      <button className="ad-button" onClick={retry}>
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
    <div className="asm-empty">
      <Inbox size={34} />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
export function Pager({ data, page, change }) {
  return (
    <footer className="asm-pager">
      <span>
        {data.total
          ? `${(page - 1) * data.pageSize + 1}–${Math.min(page * data.pageSize, data.total)} of ${data.total}`
          : "0 results"}
      </span>
      <div className="flex items-center gap-3">
        <button
          className="ad-button"
          disabled={page <= 1}
          onClick={() => change(page - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="ad-button"
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
      <span className={`ad-badge ad-badge-${status?.toLowerCase()}`}>
        {status === "Pending"
          ? "Pending Approval"
          : status === "UnderReview"
            ? "Admin Review"
            : status}
      </span>
      {active !== undefined && (
        <span
          className={`ad-badge ${active ? "ad-badge-approved" : "ad-badge-draft"}`}
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
export function ServiceActions({ row, action, inline = false }) {
  const buttons = (row.actions || []).map((key) => {
    const Icon = icons[key] || MoreHorizontal,
      label = key[0].toUpperCase() + key.slice(1);
    if (key === "view" || key === "edit")
      return (
        <Link
          key={key}
          className="ad-button"
          to={`/admin/services/${row.id}${key === "edit" ? "/edit" : ""}`}
        >
          <Icon size={14} />
          {label}
        </Link>
      );
    return (
      <button
        key={key}
        className={`ad-button ${key === "delete" || key === "reject" ? "asm-danger-text" : ""}`}
        onClick={(e) => {
          e.currentTarget.closest("details")?.removeAttribute("open");
          action(row, key);
        }}
      >
        <Icon size={14} />
        {label}
      </button>
    );
  });
  return inline ? (
    <div className="flex flex-wrap gap-2">{buttons}</div>
  ) : (
    <details
      className="asm-menu"
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
  return (
    <label className="asm-field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Definition({ values }) {
  return (
    <dl className="asm-definition">
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
