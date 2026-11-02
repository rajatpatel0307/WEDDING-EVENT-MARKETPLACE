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
      className={`mn-modal-overlay fixed inset-0 z-[80] bg-[#2d1d2866] backdrop-blur-[4px] flex justify-center items-start pt-[140px] px-[20px] pb-[20px] animate-mn-overlay motion-reduce:animate-none! motion-reduce:transition-none! ${drawer ? "mn-drawer-overlay [&.mn-drawer-overlay]:p-0 [&.mn-drawer-overlay]:justify-start" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className={drawer ? "mn-drawer h-full w-[min(380px,_92vw)] bg-[#fffdfa] overflow-y-auto overscroll-contain animate-mn-slide [&_nav_>_a]:flex [&_nav_>_a]:items-center [&_nav_>_a]:justify-between [&_nav_>_a]:py-[13px] [&_nav_>_a]:px-0 [&_nav_>_a]:border-b [&_nav_>_a]:border-b-[#eee5df] [&_nav_>_a]:text-[14px] [&_nav_>_a]:cursor-pointer [&_summary]:flex [&_summary]:items-center [&_summary]:justify-between [&_summary]:py-[13px] [&_summary]:px-0 [&_summary]:border-b [&_summary]:border-b-[#eee5df] [&_summary]:text-[14px] [&_summary]:cursor-pointer [&_nav_>_a.active]:text-[#8c414e] [&_details_>_a]:block [&_details_>_a]:text-[12px] [&_details_>_a]:p-[7px] motion-reduce:animate-none! motion-reduce:transition-none!" : "mn-search-dialog max-w-[600px] w-full bg-[#fffdfa] rounded-[10px] p-[28px] shadow-[0_25px_90px_#22151f33] [&_h2]:text-[28px] max-[768px]:p-[20px] max-[768px]:[&_h2]:text-[23px]"}
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
