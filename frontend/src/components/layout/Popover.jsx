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
      className={`mn-popover relative [&_>_button]:flex [&_>_button]:items-center [&_>_button]:gap-[7px] ${className}`}
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
        <div data-panel id={`mn-${name}`} className="mn-panel absolute top-full right-0 min-w-[195px] bg-[#fffdfa] border border-[#e8dfdb] rounded-[7px] shadow-[0_18px_55px_#3c26331c] p-[9px] animate-mn-fade z-[45] [&_>_a]:flex [&_>_a]:items-center [&_>_a]:justify-between [&_>_a]:gap-[10px] [&_>_a]:w-full [&_>_a]:py-[10px] [&_>_a]:px-[12px] [&_>_a]:rounded-[4px] [&_>_a]:text-[12px] [&_>_a:hover]:bg-[#f6eeeb] motion-reduce:animate-none! motion-reduce:transition-none!">
          {children}
        </div>
      )}
    </div>
  );
}
