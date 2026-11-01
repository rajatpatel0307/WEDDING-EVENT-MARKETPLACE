import { useEffect, useRef, useId } from "react";
import { X } from "lucide-react";
export default function AdminDialog({ title, close, children, busy = false }) {
  const ref = useRef(null);
  const titleId = useId();
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
      ref={ref}
      className="ad-dialog [&_h2]:[font-family:Inter,_'Segoe_UI',_sans-serif] [&_h2]:tracking-[-0.5px] [&_h2]:font-[600] [&_h2]:text-[#253d36] [&_h2]:text-[15px] [&_h2]:leading-[1.5] [&_h2]:m-[0] [&_button]:font-[500] [&_input]:[font:inherit] [&_input]:text-[#354a43] [&_input]:[background:white] [&_input]:[border-top-width:1px] [&_input]:[border-top-style:solid] [&_input]:[border-top-color:#e0e8e3] [&_input]:[border-right-width:1px] [&_input]:[border-right-style:solid] [&_input]:[border-right-color:#e0e8e3] [&_input]:[border-bottom-width:1px] [&_input]:[border-bottom-style:solid] [&_input]:[border-bottom-color:#e0e8e3] [&_input]:[border-left-width:1px] [&_input]:[border-left-style:solid] [&_input]:[border-left-color:#e0e8e3] [&_input]:rounded-[7px] [&_input]:[padding:9px_11px] [&_input]:min-w-0 [&_input]:[box-shadow:none] [&_input]:m-[0] [&_input]:w-auto [&_select]:[font:inherit] [&_select]:text-[#354a43] [&_select]:[background:white] [&_select]:[border-top-width:1px] [&_select]:[border-top-style:solid] [&_select]:[border-top-color:#e0e8e3] [&_select]:[border-right-width:1px] [&_select]:[border-right-style:solid] [&_select]:[border-right-color:#e0e8e3] [&_select]:[border-bottom-width:1px] [&_select]:[border-bottom-style:solid] [&_select]:[border-bottom-color:#e0e8e3] [&_select]:[border-left-width:1px] [&_select]:[border-left-style:solid] [&_select]:[border-left-color:#e0e8e3] [&_select]:rounded-[7px] [&_select]:[padding:9px_11px] [&_select]:min-w-0 [&_select]:[box-shadow:none] [&_select]:m-[0] [&_select]:w-auto [&_textarea]:[font:inherit] [&_textarea]:text-[#354a43] [&_textarea]:[background:white] [&_textarea]:[border-top-width:1px] [&_textarea]:[border-top-style:solid] [&_textarea]:[border-top-color:#e0e8e3] [&_textarea]:[border-right-width:1px] [&_textarea]:[border-right-style:solid] [&_textarea]:[border-right-color:#e0e8e3] [&_textarea]:[border-bottom-width:1px] [&_textarea]:[border-bottom-style:solid] [&_textarea]:[border-bottom-color:#e0e8e3] [&_textarea]:[border-left-width:1px] [&_textarea]:[border-left-style:solid] [&_textarea]:[border-left-color:#e0e8e3] [&_textarea]:rounded-[7px] [&_textarea]:[padding:9px_11px] [&_textarea]:min-w-0 [&_textarea]:[box-shadow:none] [&_textarea]:m-[0] [&_textarea]:w-auto [&_input:focus]:[outline:2px_solid_#a7c5bd] [&_input:focus]:[outline-offset:1px] [&_input:focus]:[border-top-color:#a7c5bd] [&_input:focus]:[border-right-color:#a7c5bd] [&_input:focus]:[border-bottom-color:#a7c5bd] [&_input:focus]:[border-left-color:#a7c5bd] [&_textarea:focus]:[outline:2px_solid_#a7c5bd] [&_textarea:focus]:[outline-offset:1px] [&_textarea:focus]:[border-top-color:#a7c5bd] [&_textarea:focus]:[border-right-color:#a7c5bd] [&_textarea:focus]:[border-bottom-color:#a7c5bd] [&_textarea:focus]:[border-left-color:#a7c5bd] [&_:focus-visible]:[outline:2px_solid_#70a99b] [&_:focus-visible]:[outline-offset:3px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe8dc] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe8dc] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe8dc] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe8dc] rounded-[14px] p-[0] max-w-[620px] w-[calc(100vw_-_32px)] max-h-[85dvh] overflow-y-auto text-[#3c5343] [box-shadow:0_25px_90px_#163d2c33] [font:13px_Inter,_'Segoe_UI',_sans-serif] m-[auto] [background:#fff] [&::backdrop]:[background:#203b3566] [&::backdrop]:[backdrop-filter:blur(3px)] [&_>_div]:p-[24px] [&_header]:flex [&_header]:items-center [&_header]:justify-between [&_header]:gap-[15px] [&_header]:pb-[15px] [&_header]:[border-bottom-width:1px] [&_header]:[border-bottom-style:solid] [&_header]:[border-bottom-color:#edf1e8] [&_header]:mb-[18px] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <div>
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="ad-icon inline-flex justify-center items-center w-[29px] h-[29px] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] [background:none] text-[#84958a] rounded-[6px] shrink-0 [&:hover]:[background:#eef3ee] [&:hover]:text-[#176b60] [&.ad-approve]:[background:#edf6ee] [&.ad-approve]:text-[#5d9270] [&.ad-reject]:[background:#fcf1ee] [&.ad-reject]:text-[#bc7f70]"
            aria-label="Close dialog"
            disabled={busy}
            onClick={close}
          >
            <X size={19} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
