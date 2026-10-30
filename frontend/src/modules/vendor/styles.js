import "../../vendor-tailwind.css";

// Tailwind utilities for runtime statuses and reusable component className props.
// Retained vw-/sm- tokens only identify descendants and states; they have no CSS.
const styles = {
  "vw-modal": "[&_h2]:[font-family:Inter,_'Segoe_UI',_Arial,_sans-serif] [&_h2]:text-[#2b4638] [&_h2]:font-semibold [&_h2]:tracking-[-0.4px] [&_h2]:m-[0] [&_h2]:text-[15px] [&_button]:cursor-pointer [&_:where(input)]:[font:inherit] [&_:where(input)]:[border-top:1px_solid_#e0e7dd] [&_:where(input)]:[border-right:1px_solid_#e0e7dd] [&_:where(input)]:[border-bottom:1px_solid_#e0e7dd] [&_:where(input)]:[border-left:1px_solid_#e0e7dd] [&_:where(input)]:[background:#fff] [&_:where(input)]:text-[#42573f] [&_:where(input)]:rounded-[7px] [&_:where(input)]:[padding:10px_12px] [&_:where(input)]:min-w-[0] [&_:where(input)]:[box-shadow:none] [&_:where(input)]:leading-[1.6] [&_:where(select)]:[font:inherit] [&_:where(select)]:[border-top:1px_solid_#e0e7dd] [&_:where(select)]:[border-right:1px_solid_#e0e7dd] [&_:where(select)]:[border-bottom:1px_solid_#e0e7dd] [&_:where(select)]:[border-left:1px_solid_#e0e7dd] [&_:where(select)]:[background:#fff] [&_:where(select)]:text-[#42573f] [&_:where(select)]:rounded-[7px] [&_:where(select)]:[padding:10px_12px] [&_:where(select)]:min-w-[0] [&_:where(select)]:[box-shadow:none] [&_:where(select)]:leading-[1.6] [&_:where(textarea)]:[font:inherit] [&_:where(textarea)]:[border-top:1px_solid_#e0e7dd] [&_:where(textarea)]:[border-right:1px_solid_#e0e7dd] [&_:where(textarea)]:[border-bottom:1px_solid_#e0e7dd] [&_:where(textarea)]:[border-left:1px_solid_#e0e7dd] [&_:where(textarea)]:[background:#fff] [&_:where(textarea)]:text-[#42573f] [&_:where(textarea)]:rounded-[7px] [&_:where(textarea)]:[padding:10px_12px] [&_:where(textarea)]:min-w-[0] [&_:where(textarea)]:[box-shadow:none] [&_:where(textarea)]:leading-[1.6] [&_:focus-visible]:[outline:2px_solid_#8aaf94] [&_:focus-visible]:[outline-offset:3px] [&_input:focus]:[outline:2px_solid_#b8ceb9] [&_input:focus]:[outline-offset:1px] [&_textarea:focus]:[outline:2px_solid_#b8ceb9] [&_textarea:focus]:[outline-offset:1px] [&_select:focus]:[outline:2px_solid_#b8ceb9] [&_select:focus]:[outline-offset:1px] text-[#5d7651] [border-top:1px_solid_#dfe9d5] [border-right:1px_solid_#dfe9d5] [border-bottom:1px_solid_#dfe9d5] [border-left:1px_solid_#dfe9d5] rounded-[12px] p-[0] max-h-[90dvh] w-[calc(100vw_-_32px)] max-w-[590px] [background:white] [box-shadow:0_25px_100px_#18321c25] m-[auto] overflow-y-auto [&.vw-modal-wide]:max-w-[850px] [&::backdrop]:[background:#243d2f66] [&::backdrop]:[backdrop-filter:blur(3px)] [&_>_header]:sticky [&_>_header]:top-[0] [&_>_header]:flex [&_>_header]:items-center [&_>_header]:justify-between [&_>_header]:gap-[15px] [&_>_header]:[padding:18px_23px] [&_>_header]:[border-bottom:1px_solid_#e8eedf] [&_>_header]:[background:white] [&_>_header]:z-[1]",
  "vw-panel": "[background:#fff] [border-top:1px_solid_#e4eade] [border-right:1px_solid_#e4eade] [border-bottom:1px_solid_#e4eade] [border-left:1px_solid_#e4eade] rounded-[10px] min-w-[0] overflow-hidden",
  "vw-badge": "inline-flex items-center [padding:3px_7px] rounded-[5px] text-[8px] font-medium leading-[1.5] text-[#96a486] [background:#f0f4e9] whitespace-normal",
  "vw-badge-approved": "[&.vw-badge-approved]:[background:#edf5e4] [&.vw-badge-approved]:text-[#7a9b5b]",
  "vw-badge-active": "[&.vw-badge-active]:[background:#edf5e4] [&.vw-badge-active]:text-[#7a9b5b]",
  "vw-badge-confirmed": "[&.vw-badge-confirmed]:[background:#edf5e4] [&.vw-badge-confirmed]:text-[#7a9b5b]",
  "vw-badge-completed": "[&.vw-badge-completed]:[background:#edf5e4] [&.vw-badge-completed]:text-[#7a9b5b]",
  "vw-badge-paid": "[&.vw-badge-paid]:[background:#edf5e4] [&.vw-badge-paid]:text-[#7a9b5b]",
  "vw-badge-success": "[&.vw-badge-success]:[background:#edf5e4] [&.vw-badge-success]:text-[#7a9b5b]",
  "vw-badge-accepted": "[&.vw-badge-accepted]:[background:#edf5e4] [&.vw-badge-accepted]:text-[#7a9b5b]",
  "vw-badge-available": "[&.vw-badge-available]:[background:#edf5e4] [&.vw-badge-available]:text-[#7a9b5b]",
  "vw-badge-published": "[&.vw-badge-published]:[background:#edf5e4] [&.vw-badge-published]:text-[#7a9b5b]",
  "vw-badge-pending": "[&.vw-badge-pending]:text-[#b2a06a] [&.vw-badge-pending]:[background:#fbf6e8]",
  "vw-badge-processing": "[&.vw-badge-processing]:text-[#b2a06a] [&.vw-badge-processing]:[background:#fbf6e8]",
  "vw-badge-draft": "[&.vw-badge-draft]:text-[#718070] [&.vw-badge-draft]:[background:#f0f2ed]",
  "vw-badge-paymentpending": "[&.vw-badge-paymentpending]:text-[#b2a06a] [&.vw-badge-paymentpending]:[background:#fbf6e8]",
  "vw-badge-underreview": "[&.vw-badge-underreview]:text-[#b2a06a] [&.vw-badge-underreview]:[background:#fbf6e8]",
  "vw-badge-rejected": "[&.vw-badge-rejected]:text-[#c08d78] [&.vw-badge-rejected]:[background:#fcf1e9]",
  "vw-badge-cancelled": "[&.vw-badge-cancelled]:text-[#c08d78] [&.vw-badge-cancelled]:[background:#fcf1e9]",
  "vw-badge-failed": "[&.vw-badge-failed]:text-[#c08d78] [&.vw-badge-failed]:[background:#fcf1e9]",
  "vw-badge-suspended": "[&.vw-badge-suspended]:text-[#8c628e] [&.vw-badge-suspended]:[background:#f6edf6]",
  "vw-badge-blocked": "[&.vw-badge-blocked]:text-[#c08d78] [&.vw-badge-blocked]:[background:#fcf1e9]",
  "vw-badge-sent": "[&.vw-badge-sent]:text-[#79a399] [&.vw-badge-sent]:[background:#ebf4ef]",
  "vw-badge-viewed": "[&.vw-badge-viewed]:text-[#79a399] [&.vw-badge-viewed]:[background:#ebf4ef]",
  "vw-badge-inprogress": "[&.vw-badge-inprogress]:text-[#79a399] [&.vw-badge-inprogress]:[background:#ebf4ef]",
  "vw-image-placeholder": "grid place-items-center [background:linear-gradient(125deg,_#e8efde,_#f5f7f0)] text-[#b2c29c] [&_>_span]:[font-family:Georgia,_serif] [&_>_span]:text-[45px] [&_>_span]:font-normal",
  "vw-long-text": "block min-w-[130px] max-w-[270px] whitespace-pre-wrap [overflow-wrap:anywhere] vendor-phone:min-w-[0] vendor-phone:max-w-[none]",
  "vw-calendar-day": "min-h-[115px] [border-top:0] [border-right:1px_solid_#edf2e4] [border-bottom:1px_solid_#edf2e4] [border-left:0] [background:#fff] [padding:10px_8px] min-w-[0] text-left [vertical-align:top] flex flex-col gap-[8px] [&:hover]:[background:#f8fcf1] [&_>_strong]:text-[11px] [&_>_strong]:text-[#a1b28d] [&_>_strong]:w-[23px] [&_>_strong]:h-[23px] [&_>_strong]:grid [&_>_strong]:place-items-center [&_>_strong]:font-normal [&.today_>_strong]:[background:#99b57b] [&.today_>_strong]:text-[white] [&.today_>_strong]:rounded-[50%] [&_>_div]:grid [&_>_div]:gap-[4px] [&_>_div]:w-[100%] [&_>_div]:min-w-[0] [&_small]:text-[7px] [&_small]:text-[#a3b38f] vendor-mobile:min-h-[85px] vendor-mobile:[padding:7px_3px] vendor-mobile:[&_>_strong]:text-[10px] vendor-phone:min-h-[75px]",
  "vw-calendar-entry": "block [padding:3px_5px] rounded-[3px] text-[7px] whitespace-nowrap overflow-hidden text-ellipsis [&.available]:[background:#edf6e3] [&.available]:text-[#94b16e] [&.blocked]:[background:#fff2e9] [&.blocked]:text-[#c99c81] [&.pending]:[background:#fcf6e7] [&.pending]:text-[#bba66c] [&.booked]:[background:#eaf5ef] [&.booked]:text-[#81aa93] vendor-mobile:text-[6px] vendor-mobile:p-[2px]",
  "vw-chat-bubble": "max-w-[78%] [padding:11px_14px] [background:#fff] [border-top:1px_solid_#eaf1df] [border-right:1px_solid_#eaf1df] [border-bottom:1px_solid_#eaf1df] [border-left:1px_solid_#eaf1df] [border-radius:0_10px_10px_10px] [align-self:flex-start] min-w-[90px] [&.mine]:[align-self:flex-end] [&.mine]:[background:#eef6e4] [&.mine]:[border-color:#e2edd6] [&.mine]:[border-radius:10px_0_10px_10px] [&_p]:text-[#637f4e] [&_p]:text-[11px] [&_p]:whitespace-pre-wrap [&_p]:[overflow-wrap:anywhere] [&_>_small]:flex [&_>_small]:items-center [&_>_small]:justify-end [&_>_small]:gap-[5px] [&_>_small]:text-[#bdcdae] [&_>_small]:text-[6px] [&_>_small]:mt-[7px] [&_.read]:text-[#9bbb7d] vendor-phone:max-w-[88%]",
  "sm-stat-icon": "w-[42px] h-[42px] rounded-[12px] inline-flex items-center justify-center text-[#42775b] [background:#edf4eb] [&.tone-1]:text-[#658078] [&.tone-1]:[background:#eff4f1] [&.tone-2]:text-[#a68b55] [&.tone-2]:[background:#faf5e9] [&.tone-3]:text-[#9082a3] [&.tone-3]:[background:#f3f0f7] service-wide:w-[34px] service-wide:h-[34px] service-mobile:w-[32px] service-mobile:h-[32px]",
  "vw-badge-pendingapproval": "[&.vw-badge-pendingapproval]:text-[#ab8a3c] [&.vw-badge-pendingapproval]:[background:#fcf6e5]",
  "sm-dot": "inline-block w-[5px] h-[5px] [background:#91a28c] rounded-[100%] mr-[6px]",
  "sm-dot-approved": "[&.sm-dot-approved]:[background:#5d946b]",
  "sm-dot-pending": "[&.sm-dot-pending]:[background:#d0ad5b]",
  "sm-dot-rejected": "[&.sm-dot-rejected]:[background:#c98b83]",
  "sm-dropzone": "flex flex-col items-center gap-[10px] [padding:45px_20px] [border-top:1px_dashed_#b9c8ae] [border-right:1px_dashed_#b9c8ae] [border-bottom:1px_dashed_#b9c8ae] [border-left:1px_dashed_#b9c8ae] rounded-[12px] [background:#f9fbf6] relative text-center text-[#7f9571] cursor-pointer [&.dragging]:[background:#eaf4e4] [&.dragging]:[border-color:#3d714a] [&_span]:text-[11px] [&_small]:text-[10px] [&_small]:text-[#a1ac96] [&_input]:absolute [&_input]:[inset:0] [&_input]:opacity-[0] [&_input]:w-[100%] [&_input]:cursor-pointer",
  "sm-day": "[border-top:1px_solid_#e5ebde] [border-right:1px_solid_#e5ebde] [border-bottom:1px_solid_#e5ebde] [border-left:1px_solid_#e5ebde] [background:#f3f8ee] min-h-[72px] rounded-[7px] [padding:10px_5px] text-[#6f8d5b] text-left [&_small]:block [&_small]:text-[8px] [&_small]:overflow-hidden [&.selected]:[outline:2px_solid_#578345] service-mobile:min-h-[55px] service-mobile:[padding:7px_3px] service-mobile:[&_small]:text-[7px]",
  "sm-day-blocked": "[&.sm-day-blocked]:[background:#fcf0eb] [&.sm-day-blocked]:text-[#b98c7d] [&.sm-day-blocked]:[border-color:#f0ddd5]",
  "sm-day-booked": "[&.sm-day-booked]:[background:#f2edf8] [&.sm-day-booked]:text-[#9a83af]",
  "sm-day-closed": "[&.sm-day-closed]:[background:#f6f7f4] [&.sm-day-closed]:text-[#adb5a2]"
};

const selectorHooks = new Set(["vw-badge","vw-panel","vw-badge-approved","vw-badge-active","vw-badge-confirmed","vw-badge-completed","vw-badge-paid","vw-badge-success","vw-badge-accepted","vw-badge-available","vw-badge-published","vw-badge-pending","vw-badge-processing","vw-badge-draft","vw-badge-paymentpending","vw-badge-underreview","vw-badge-rejected","vw-badge-cancelled","vw-badge-failed","vw-badge-suspended","vw-badge-blocked","vw-badge-sent","vw-badge-viewed","vw-badge-inprogress","vw-badge-pendingapproval","sm-dot-approved","sm-dot-pending","sm-dot-rejected","sm-day-blocked","sm-day-booked","sm-day-closed"]);

export function vendorClasses(value = "") {
  const tokens = String(value).trim().split(/\s+/).filter(Boolean);
  return [...new Set(tokens.flatMap(token => [
    ...(!styles[token] || selectorHooks.has(token) ? [token] : []),
    ...(styles[token]?.split(" ") || []),
  ]))].join(" ");
}
