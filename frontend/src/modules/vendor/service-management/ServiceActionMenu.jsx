import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Copy,
  Eye,
  ImagePlus,
  ListChecks,
  MoreHorizontal,
  Package,
  Pencil,
  Power,
  Send,
  Trash2,
} from "lucide-react";

export default function ServiceActionMenu({ service, onAction }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef(null);
  const menu = useRef(null);
  const menuId = useId();
  const base = `/vendor/services/${service.id}`;
  const actions = service.actions || {};
  const iconClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#dfe7df] bg-white text-[#5c7463] transition-colors hover:border-[#a9c2b0] hover:bg-[#edf5ef] hover:text-[#28563d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#397455] disabled:cursor-not-allowed disabled:opacity-35";
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    const rect = trigger.current.getBoundingClientRect();
    const height = menu.current.getBoundingClientRect().height;
    setPosition({
      left: Math.max(8, Math.min(rect.right - 224, window.innerWidth - 232)),
      top: Math.max(
        8,
        rect.bottom + height + 8 > window.innerHeight
          ? rect.top - height - 6
          : rect.bottom + 6,
      ),
    });
    menu.current.querySelector('[role="menuitem"]:not(:disabled)')?.focus();
    const outside = (event) => {
      if (
        !menu.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      )
        close();
    };
    const dismiss = (event) => {
      if (event.type === "resize" || !menu.current?.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);

  useEffect(() => setOpen(false), [service.id]);

  const keyboard = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      event.preventDefault();
      close(true);
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const items = [
        ...menu.current.querySelectorAll('[role="menuitem"]:not(:disabled)'),
      ];
      const index = items.indexOf(document.activeElement);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[next]?.focus();
    }
  };
  const itemClass =
    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-xs text-[#435e4b] hover:bg-[#eff5f0] focus:bg-[#eff5f0] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40";
  const item = (label, Icon, target, action, disabled = false) =>
    target ? (
      <Link
        key={label}
        role="menuitem"
        className={itemClass}
        to={`${base}/${target}`}
        onClick={() => close()}
      >
        <Icon size={16} />
        {label}
      </Link>
    ) : (
      <button
        key={label}
        type="button"
        role="menuitem"
        className={`${itemClass} ${action === "delete" ? "text-[#ad493e]! hover:bg-[#fff1ef]!" : ""}`}
        disabled={disabled}
        onClick={() => {
          close(true);
          onAction(action);
        }}
      >
        <Icon size={16} />
        {label}
      </button>
    );

  return (
    <div
      className="flex flex-nowrap items-center justify-end gap-1.5"
      role="group"
      aria-label={`Actions for ${service.name}`}
    >
      <Link
        className={iconClass}
        to={base}
        title="View service"
        aria-label={`View ${service.name}`}
      >
        <Eye size={16} />
      </Link>
      {actions.edit ? (
        <Link
          className={iconClass}
          to={`${base}/edit`}
          title="Edit service"
          aria-label={`Edit ${service.name}`}
        >
          <Pencil size={16} />
        </Link>
      ) : (
        <span title="Editing is unavailable for this approval status">
          <button
            type="button"
            className={iconClass}
            disabled
            aria-label={`Editing unavailable for ${service.name}`}
          >
            <Pencil size={16} />
          </button>
        </span>
      )}
      <button
        ref={trigger}
        type="button"
        className={iconClass}
        title="More actions"
        aria-label={`More actions for ${service.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <MoreHorizontal size={18} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label={`Manage ${service.name}`}
            onKeyDown={keyboard}
            style={position}
            className="fixed z-[100] w-56 max-h-[calc(100dvh-16px)] overflow-y-auto rounded-xl border border-[#dfe7df] bg-white p-1.5 font-sans shadow-[0_12px_40px_#163b2426]"
          >
            <p className="px-3 pb-2 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7a8c7d]">
              Manage service
            </p>
            {actions.edit && (
              <>
                {item("Manage images", ImagePlus, "edit?step=4")}
                {item("Manage items", ListChecks, "edit?step=3")}
                {item("Manage packages", Package, "packages")}
              </>
            )}
            {item("Availability", CalendarDays, "availability")}
            {item(
              "Duplicate service",
              Copy,
              null,
              "duplicate",
              actions.duplicate === false,
            )}
            {(actions.activate || actions.submit || actions.delete) && (
              <div
                role="separator"
                className="my-1 border-t border-[#e8eee8]"
              />
            )}
            {actions.activate &&
              item(
                service.active ? "Deactivate listing" : "Activate listing",
                Power,
                null,
                "active",
              )}
            {actions.submit &&
              item("Submit for approval", Send, null, "submit")}
            {actions.delete && item("Delete service", Trash2, null, "delete")}
          </div>,
          document.body,
        )}
    </div>
  );
}
