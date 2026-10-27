import { useEffect, useRef } from "react";
export default function Modal({ children, close, label, drawer = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector("button, input, a")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  function keyboard(e) {
    if (e.key === "Escape") close();
    if (e.key !== "Tab") return;
    const items = [
      ...ref.current.querySelectorAll(
        'a[href], button:not(:disabled), input, select, summary, [tabindex="0"]',
      ),
    ].filter((el) => el.getClientRects().length);
    const first = items[0],
      last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
  return (
    <div
      className={`mn-modal-overlay ${drawer ? "mn-drawer-overlay" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className={drawer ? "mn-drawer" : "mn-search-dialog"}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onKeyDown={keyboard}
      >
        {children}
      </div>
    </div>
  );
}
