import { useEffect, useRef } from "react";
export default function Popover({
  name,
  label,
  open,
  setOpen,
  children,
  className = "",
  buttonClass = "",
}) {
  const ref = useRef(null);
  const active = open === name;
  useEffect(() => {
    if (!active) return;
    function outside(e) {
      if (!ref.current?.contains(e.target)) setOpen(null);
    }
    function keyboard(e) {
      if (e.key === "Escape") {
        setOpen(null);
        ref.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
    };
  }, [active, setOpen]);
  return (
    <div
      ref={ref}
      className={`mn-popover ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(null);
      }}
    >
      <button
        type="button"
        className={buttonClass}
        aria-expanded={active}
        aria-controls={`mn-${name}`}
        onClick={() => setOpen(active ? null : name)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(name);
            requestAnimationFrame(() =>
              ref.current
                ?.querySelector(
                  "[data-panel] a, [data-panel] input, [data-panel] button",
                )
                ?.focus(),
            );
          }
        }}
      >
        {label}
      </button>
      {active && (
        <div data-panel id={`mn-${name}`} className="mn-panel">
          {children}
        </div>
      )}
    </div>
  );
}
