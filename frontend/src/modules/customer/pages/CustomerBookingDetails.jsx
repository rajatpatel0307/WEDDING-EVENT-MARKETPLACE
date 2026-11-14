import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, CheckCheck, Clock3,
  Heart, LockKeyhole, MessagesSquare, ReceiptText, ShieldCheck,
  ShoppingBag, Sparkles, Star,
} from "lucide-react";
import BookingChanges from "../../bookings/BookingChanges";
import BookingItemDetails from "../../bookings/BookingItemDetails";
import { Badge, ErrorView } from "../components/WorkspaceUI";
import { customerRequest, date, money, save, timestamp } from "../services/workspace.api";


const steps = [
  { label: "Request sent", description: "Your plans are on their way", icon: Check },
  { label: "Vendor acceptance", description: "Your vendor reviews the details", icon: Clock3 },
  { label: "Booking confirmed", description: "Everything comes together", icon: CalendarDays },
  { label: "Celebration complete", description: "Time to make memories", icon: Heart },
];

export default function CustomerBookingDetails({
  id, data, config, busy, setBusy, error, setError, message, refresh, onReview,
}) {
  const b = data.booking;
  const status = b.BookingStatus;
  const terminal = ["Cancelled", "Rejected", "Expired"].includes(status);
  const stage = status === "Completed" ? 4
    : status === "InProgress" ? 3
      : ["Accepted", "PaymentPending", "Confirmed"].includes(status) ? 2 : 1;
  const canPay = Number(b.RemainingAmount) > 0
    && ["Accepted", "PaymentPending", "Confirmed", "InProgress"].includes(status);
  const total = Number(b.TotalAmount || 0);
  const paid = Number(b.PaidAmount || 0);
  const paidPercent = total > 0 ? Math.max(0, Math.min(100, paid / total * 100)) : 0;
  const statusCopy = status === "Pending"
    ? ["A beautiful beginning", "Your vendor is reviewing your request. Payment opens once they accept your booking."]
    : terminal
      ? [`Booking ${status.toLowerCase()}`, "You can find the latest details in your booking journey below."]
      : status === "Completed"
        ? ["Here’s to the memories", "Your booking is complete. Share your experience with a review."]
        : status === "InProgress"
          ? ["Your celebration is underway", "Keep your booking details and your vendor just a message away."]
          : ["Your plans are coming together", canPay ? "Your vendor has accepted. Review your payment terms to take the next step." : "Keep all the details of your celebration close at hand."];

  async function updateItem(item, method, body = {}) {
    setBusy(true);
    setError("");
    try {
      await save(`/bookings/${id}/items/${item.id}`, method, body);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="booking-detail [&]:w-full [&]:max-w-[1360px] [&]:my-0 [&]:mx-auto [&]:text-[#45343b] [&]:[font-family:Inter,_'Segoe_UI',_sans-serif] [&]:text-[13px] [&]:leading-[1.6] [&_*]:box-border [&_*::before]:box-border [&_*::after]:box-border [&_p]:m-0 [&_button]:[-webkit-tap-highlight-color:transparent] [&_button]:[font:inherit] [&_button]:cursor-pointer [&_a]:[-webkit-tap-highlight-color:transparent] [&_button:disabled]:[cursor:wait] [&_button:disabled]:opacity-55 [&_:is(a,_button,_input,_summary):focus-visible]:outline-2 [&_:is(a,_button,_input,_summary):focus-visible]:outline-[#873f52] [&_:is(a,_button,_input,_summary):focus-visible]:outline-offset-[4px] [&_svg]:shrink-0 [&_.cw-badge]:gap-[6px] [&_.cw-badge]:py-[5px] [&_.cw-badge]:px-[10px] [&_.cw-badge]:border [&_.cw-badge]:border-[#dce7db] [&_.cw-badge]:rounded-[20px] [&_.cw-badge]:bg-[#eef4ed] [&_.cw-badge]:text-[#526d52] [&_.cw-badge]:text-[10px] [&_.cw-badge]:font-medium [&_.cw-badge]:leading-[1.4] [&_.cw-badge::before]:content-[''] [&_.cw-badge::before]:w-[5px] [&_.cw-badge::before]:h-[5px] [&_.cw-badge::before]:rounded-[50%] [&_.cw-badge::before]:bg-current [&_.cw-badge::before]:shrink-0 [&_:is(.cw-badge-pending,_.cw-badge-paymentpending,_.cw-badge-processing)]:border-[#ead9b7] [&_:is(.cw-badge-pending,_.cw-badge-paymentpending,_.cw-badge-processing)]:bg-[#fff6e5] [&_:is(.cw-badge-pending,_.cw-badge-paymentpending,_.cw-badge-processing)]:text-[#947020] [&_:is(.cw-badge-cancelled,_.cw-badge-rejected,_.cw-badge-failed,_.cw-badge-expired)]:border-[#ecd5d5] [&_:is(.cw-badge-cancelled,_.cw-badge-rejected,_.cw-badge-failed,_.cw-badge-expired)]:bg-[#fcf0ef] [&_:is(.cw-badge-cancelled,_.cw-badge-rejected,_.cw-badge-failed,_.cw-badge-expired)]:text-[#a04d4d] motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:[scroll-behavior:auto] motion-reduce:[&_*::before]:transition-none motion-reduce:[&_*::before]:[scroll-behavior:auto] motion-reduce:[&_*::after]:transition-none motion-reduce:[&_*::after]:[scroll-behavior:auto]">
      <nav className="bd-breadcrumb [&&]:flex [&&]:items-center [&&]:flex-wrap [&&]:gap-[12px] [&&]:mb-[28px] [&&]:text-[#96878c] [&&]:text-[11px] [&&_a]:inline-flex [&&_a]:items-center [&&_a]:gap-[8px] [&&_a]:text-[#735662] [&&_a]:no-underline [&&_a:hover]:text-[#873f52] [&&_>_span:first-of-type]:text-[#cbbfb9] max-[600.001px]:[&&]:mb-[23px] max-[600.001px]:[&&]:text-[10px]" aria-label="Breadcrumb">
        <Link to="/customer/bookings"><ArrowLeft size={15} aria-hidden="true" /> My bookings</Link>
        <span aria-hidden="true">/</span><span>Booking details</span>
      </nav>

      <header className="bd-header [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[24px] [&&]:mb-[30px] [&&_h1]:mt-[9px] [&&_h1]:mx-0 [&&_h1]:mb-[10px] [&&_h1]:text-[#45343b] [&&_h1]:[font:400_clamp(29px,_2.8vw,_40px)/1.2_Georgia,_serif] [&&_h1]:tracking-[-1.3px] [&&_h1_em]:text-[#873f52] [&&_h1_em]:font-normal [&&_>_.bd-button]:shrink-0 max-[600.001px]:[&&]:flex-col max-[600.001px]:[&&]:items-start max-[600.001px]:[&&]:gap-[17px] max-[600.001px]:[&&]:mb-[22px] max-[600.001px]:[&&_.bd-eyebrow]:text-[7px] max-[600.001px]:[&&_.bd-eyebrow]:tracking-[1.5px] max-[600.001px]:[&&_h1]:max-w-[330px] max-[600.001px]:[&&_h1]:text-[32px] max-[600.001px]:[&&_h1_em]:block max-[600.001px]:[&&_>_.bd-button]:min-h-[41px] max-[600.001px]:[&&_>_.bd-button]:text-[10px]">
        <div>
          <p className="bd-eyebrow [&&]:flex [&&]:items-center [&&]:gap-[8px] [&&]:text-[#a37c60] [&&]:text-[9px] [&&]:font-semibold [&&]:tracking-[1.9px] [&&]:leading-[1.7] [&&_>_span]:w-[5px] [&&_>_span]:h-[5px] [&&_>_span]:rounded-[50%] [&&_>_span]:bg-[#b6956d]"><span /> YOUR CELEBRATION, BEAUTIFULLY PLANNED</p>
          <h1>Your plans. <em>One beautiful place.</em></h1>
          <p className="bd-subtitle [&&]:text-[#81757a] [&&]:text-[12px] max-[600.001px]:[&&]:text-[11px]">Every detail, from the first request to the memories that last.</p>
        </div>
        <button className="bd-button [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:gap-[9px] [&&]:min-h-[43px] [&&]:py-[11px] [&&]:px-[17px] [&&]:border [&&]:border-[transparent] [&&]:rounded-[8px] [&&]:text-[11px] [&&]:font-medium [&&]:leading-[1.5] [&&]:text-center [&&]:no-underline [&&]:transition-[background,box-shadow] [&&]:duration-180 [&&]:ease-[ease] bd-button-primary [&&&]:bg-[#873f52] [&&&]:border-[#873f52] [&&&]:text-[#fff] [&&&]:shadow-[0_4px_10px_#74314713] [&&&:hover]:bg-[#713347] [&&&:hover]:border-[#713347] [&&&:hover]:shadow-[0_5px_16px_#74314722]" onClick={message} disabled={busy}>
          <MessagesSquare size={17} aria-hidden="true" /> {busy ? "Please wait…" : "Message vendor"}
        </button>
      </header>

      <section className="bd-overview [&&]:overflow-hidden [&&]:mb-[26px] [&&]:border [&&]:border-[#e9dfd6] [&&]:rounded-[14px] [&&]:bg-[linear-gradient(110deg,_#fffefa,_#f9f3ec)] [&&]:shadow-[0_5px_22px_#62402f04]" aria-labelledby="bd-overview-title">
        <div className="bd-overview-top [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[20px] [&&]:pt-[25px] [&&]:px-[28px] [&&]:pb-[22px] max-[600.001px]:[&&]:items-start max-[600.001px]:[&&]:gap-[12px] max-[600.001px]:[&&]:py-[20px] max-[600.001px]:[&&]:px-[18px]">
          <div className="bd-reference [&&]:flex [&&]:items-center [&&]:gap-[15px] [&&]:min-w-0 [&&_h2]:mt-[5px] [&&_h2]:mx-0 [&&_h2]:mb-0 [&&_h2]:text-[#45343b] [&&_h2]:[font:400_clamp(19px,_2vw,_26px)/1.3_Georgia,_serif] [&&_h2]:tracking-[-.5px] [&&_h2]:wrap-anywhere max-[600.001px]:[&&]:gap-[10px] max-[600.001px]:[&&_h2]:text-[17px] max-[600.001px]:[&&_.bd-label]:text-[7px] max-[600.001px]:[&&_.bd-label]:tracking-[.8px]">
            <span className="bd-icon-tile [&&]:grid [&&]:[place-items:center] [&&]:w-[52px] [&&]:h-[56px] [&&]:shrink-0 [&&]:border [&&]:border-[#e9d9c9] [&&]:rounded-[11px] [&&]:bg-[#f3e8db] [&&]:text-[#9b7852] max-[600.001px]:[&&]:w-[37px] max-[600.001px]:[&&]:h-[42px] max-[600.001px]:[&&]:rounded-[8px] max-[600.001px]:[&&_svg]:w-[19px]"><ShoppingBag size={23} strokeWidth={1.4} aria-hidden="true" /></span>
            <div><p className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">BOOKING REFERENCE</p><h2 id="bd-overview-title">{b.BookingNumber}</h2></div>
          </div>
          <div className="bd-status [&&]:grid [&&]:[justify-items:end] [&&]:gap-[8px] [&&]:shrink-0 max-[600.001px]:[&&_.bd-label]:text-[7px] max-[600.001px]:[&&_.bd-label]:tracking-[.8px] max-[600.001px]:[&&]:gap-[6px] max-[600.001px]:[&&_.cw-badge]:py-[4px] max-[600.001px]:[&&_.cw-badge]:px-[7px] max-[600.001px]:[&&_.cw-badge]:text-[8px]"><span className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">BOOKING STATUS</span><Badge>{status}</Badge></div>
        </div>
        <div className="bd-facts [&&]:grid [&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&]:pt-0 [&&]:px-[28px] [&&]:pb-[24px] [&&]:gap-[20px] [&&_>_div]:flex [&&_>_div]:items-center [&&_>_div]:gap-[12px] [&&_>_div]:border-l [&&_>_div]:border-l-[#e8dcd0] [&&_>_div]:pl-[22px] [&&_>_div]:text-[#ad8d6f] [&&_>_div:first-child]:pl-0 [&&_>_div:first-child]:border-l-0 [&&_strong]:block [&&_strong]:mt-[5px] [&&_strong]:text-[#59454a] [&&_strong]:text-[12px] [&&_strong]:font-medium max-[600.001px]:[&&]:grid-cols-[1fr_1fr] max-[600.001px]:[&&]:pt-0 max-[600.001px]:[&&]:px-[18px] max-[600.001px]:[&&]:pb-[20px] max-[600.001px]:[&&]:gap-[18px_12px] max-[600.001px]:[&&_>_div]:gap-[8px] max-[600.001px]:[&&_>_div]:pl-[12px] max-[600.001px]:[&&_>_div:last-child]:col-span-full max-[600.001px]:[&&_>_div:last-child]:pt-[14px] max-[600.001px]:[&&_>_div:last-child]:pl-0 max-[600.001px]:[&&_>_div:last-child]:border-t max-[600.001px]:[&&_>_div:last-child]:border-t-[#e8dcd0] max-[600.001px]:[&&_>_div:last-child]:border-l-0 max-[600.001px]:[&&_.bd-label]:text-[7px] max-[600.001px]:[&&_strong]:text-[11px]">
          <div><CalendarDays size={18} aria-hidden="true" /><div><p className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">EVENT DATE</p><strong>{b.BookingDate ? date(b.BookingDate) : "To be confirmed"}</strong></div></div>
          <div><ShoppingBag size={18} aria-hidden="true" /><div><p className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">YOUR SELECTION</p><strong>{data.items.length} {data.items.length === 1 ? "service / package" : "services / packages"}</strong></div></div>
          <div><ReceiptText size={18} aria-hidden="true" /><div><p className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">BOOKING TOTAL</p><strong>{money(b.TotalAmount)}</strong></div></div>
        </div>
        {!terminal && <ol className="bd-steps [&&]:grid [&&]:grid-cols-[repeat(4,_minmax(0,_1fr))] [&&]:gap-[16px] [&&]:m-0 [&&]:py-[22px] [&&]:px-[28px] [&&]:border-t [&&]:border-t-[#e9dfd5] [&&]:[list-style:none] [&&]:bg-[#ffffff9c] [&&_li]:flex [&&_li]:items-start [&&_li]:gap-[10px] [&&_li]:text-[#968b8b] [&&_li]:relative [&&_strong]:block [&&_strong]:pt-[2px] [&&_strong]:text-[10px] [&&_strong]:font-medium [&&_p]:mt-[3px] [&&_p]:text-[9px] [&&_p]:text-[#9c8f8b] [&&_.is-done_.bd-step-icon]:text-[#fff] [&&_.is-done_.bd-step-icon]:border-[#778d76] [&&_.is-done_.bd-step-icon]:bg-[#778d76] [&&_.is-done_strong]:text-[#586c53] [&&_.is-current_.bd-step-icon]:text-[#a3793e] [&&_.is-current_.bd-step-icon]:border-[#d9bc91] [&&_.is-current_.bd-step-icon]:bg-[#fff9ed] [&&_.is-current_.bd-step-icon]:shadow-[0_0_0_4px_#c5a57612] [&&_.is-current_strong]:text-[#876538] max-[1100.001px]:[&&]:gap-[12px] max-[1100.001px]:[&&]:p-[20px] max-[1100.001px]:[&&_p]:hidden max-[1100.001px]:[&&_strong]:text-[9px] max-[600.001px]:[&&]:grid-cols-[1fr_1fr] max-[600.001px]:[&&]:gap-[18px_12px] max-[600.001px]:[&&]:py-[19px] max-[600.001px]:[&&]:px-[18px] max-[600.001px]:[&&_li]:gap-[8px] max-[600.001px]:[&&_li]:items-center max-[600.001px]:[&&_strong]:p-0 max-[600.001px]:[&&_strong]:text-[9px]" aria-label="Booking progress">
          {steps.map((step, index) => {
            const done = index < stage;
            const current = stage < 4 && index === stage;
            const Icon = done ? Check : step.icon;
            return <li key={step.label} className={`${done ? "is-done" : ""} ${current ? "is-current" : ""}`} aria-current={current ? "step" : undefined}>
              <span className="bd-step-icon [&&]:grid [&&]:[place-items:center] [&&]:relative [&&]:shrink-0 [&&]:w-[30px] [&&]:h-[30px] [&&]:border [&&]:border-[#e7e1de] [&&]:rounded-[50%] [&&]:bg-[#f9f7f5] [&&]:text-[#a69b98] max-[600.001px]:[&&]:w-[27px] max-[600.001px]:[&&]:h-[27px]"><Icon size={16} aria-hidden="true" /></span>
              <div><strong>{step.label}</strong><p>{step.description}</p></div>
            </li>;
          })}
        </ol>}
      </section>

      {error && <p className="bd-error [&&]:mb-[20px] [&&]:py-[14px] [&&]:px-[18px] [&&]:border [&&]:border-[#e9c9cb] [&&]:rounded-[8px] [&&]:bg-[#fff4f3] [&&]:text-[#9a424b] [&&]:text-[12px]" role="alert">{error}</p>}

      <div className="bd-content-grid [&&]:grid [&&]:grid-cols-[minmax(0,_1fr)_340px] [&&]:[align-items:start] [&&]:gap-[24px] min-[1400px]:[&&]:grid-cols-[minmax(0,_1fr)_370px] min-[1400px]:[&&]:gap-[28px] max-[1100.001px]:[&&]:grid-cols-[minmax(0,_1fr)_305px] max-[1100.001px]:[&&]:gap-[18px] [@media(min-width:_801px)_and_(max-width:_1000px),_(max-width:_700px)]:[&&]:grid-cols-[minmax(0,_1fr)]">
        <div className="bd-main-column [&&]:grid [&&]:min-w-0 [&&]:gap-[22px] [@media(min-width:_801px)_and_(max-width:_1000px),_(max-width:_700px)]:[&&]:[display:contents]">
          <section className="bd-card [&&]:overflow-hidden [&&]:border [&&]:border-[#eee5df] [&&]:rounded-[12px] [&&]:bg-[#fff] [&&]:shadow-[0_3px_15px_#51383d03] bd-services [@media(min-width:_801px)_and_(max-width:_1000px),_(max-width:_700px)]:[&&]:[order:1]" aria-labelledby="bd-services-title">
            <header className="bd-card-heading [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[16px] [&&]:pt-[23px] [&&]:px-[25px] [&&]:pb-[20px] [&&]:border-b [&&]:border-b-[#f0e9e3] [&&]:text-[#a48b78] [&&_.bd-eyebrow]:text-[8px] [&&_.bd-eyebrow]:tracking-[1.5px] [&&_h2]:mt-[5px] [&&_h2]:mx-0 [&&_h2]:mb-0 [&&_h2]:text-[#45343b] [&&_h2]:[font:400_24px/1.3_Georgia,_serif] [&&_h2]:tracking-[-.5px] [&&_.bd-vendor-name]:mt-[7px] [&&_.bd-vendor-name]:text-[#9a878c] [&&_.bd-vendor-name]:text-[10px] max-[1100.001px]:[&&]:p-[21px] max-[600.001px]:[&&]:p-[20px] max-[600.001px]:[&&_h2]:text-[23px]"><div><p className="bd-eyebrow [&&]:flex [&&]:items-center [&&]:gap-[8px] [&&]:text-[#a37c60] [&&]:text-[9px] [&&]:font-semibold [&&]:tracking-[1.9px] [&&]:leading-[1.7] [&&_>_span]:w-[5px] [&&_>_span]:h-[5px] [&&_>_span]:rounded-[50%] [&&_>_span]:bg-[#b6956d]">THE DETAILS THAT MATTER</p><h2 id="bd-services-title">Your selected services</h2>{data.checkout?.vendor && <p className="bd-vendor-name [&&_strong]:text-[#81616e] [&&_strong]:font-medium">Provided by <strong>{data.checkout.vendor}</strong></p>}</div><span className="bd-count [&&]:py-[4px] [&&]:px-[9px] [&&]:border [&&]:border-[#eee5de] [&&]:rounded-[5px] [&&]:bg-[#faf7f3] [&&]:text-[#9a8170] [&&]:text-[9px] [&&]:whitespace-nowrap">{data.items.length} {data.items.length === 1 ? "item" : "items"}</span></header>
            <div className="bd-service-list [&&]:py-0 [&&]:px-[25px] max-[1100.001px]:[&&]:py-0 max-[1100.001px]:[&&]:px-[21px] max-[600.001px]:[&&]:py-0 max-[600.001px]:[&&]:px-[20px]">
              {data.items.map((item, index) => <article className="bd-service [&&]:py-[24px] [&&]:px-0 [&&_+_.bd-service]:border-t [&&_+_.bd-service]:border-t-[#eee5df] [&&_h3]:mt-[3px] [&&_h3]:mx-0 [&&_h3]:mb-0 [&&_h3]:[font:500_15px/1.5_Inter,_'Segoe_UI',_sans-serif] [&&_h3]:tracking-[-.2px] [&&_h3]:text-[#553f48]" key={item.id || index}>
                <div className="bd-service-heading [&&]:flex [&&]:items-center [&&]:gap-[13px] [&&_.bd-label]:text-[8px]"><span className="bd-service-icon [&&]:grid [&&]:[place-items:center] [&&]:shrink-0 [&&]:w-[49px] [&&]:h-[49px] [&&]:border [&&]:border-[#eddde1] [&&]:rounded-[10px] [&&]:bg-[#f9eff1] [&&]:text-[#a37582]"><ShoppingBag size={23} strokeWidth={1.3} aria-hidden="true" /></span><div><span className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">SERVICE / PACKAGE {String(index + 1).padStart(2, "0")}</span><h3>{item.name}</h3></div></div>
                <div className="bd-item-description [&&]:mt-[16px] [&&]:mx-0 [&&]:mb-[20px] [&&]:wrap-anywhere [&&_>_div]:text-[#81757a] [&&_>_div]:text-[12px] [&&_>_div]:leading-[1.8] [&&_>_p]:text-[#81757a] [&&_>_p]:text-[12px] [&&_>_p]:leading-[1.8] [&&_summary]:mt-[7px] [&&_summary]:text-[#873f52] [&&_summary]:cursor-pointer"><BookingItemDetails description={item.description} /></div>
                <div className="bd-item-pricing [&&]:grid [&&]:grid-cols-[.8fr_1fr_1.1fr] [&&]:gap-[16px] [&&]:py-[16px] [&&]:px-[18px] [&&]:border [&&]:border-[#eee8e3] [&&]:rounded-[8px] [&&]:bg-[#fcfaf8] [&&_>_div_+_div]:pl-[18px] [&&_>_div_+_div]:border-l [&&_>_div_+_div]:border-l-[#ebe3dc] [&&_.bd-label]:text-[8px] [&&_strong]:block [&&_strong]:mt-[6px] [&&_strong]:text-[#5b464d] [&&_strong]:text-[13px] [&&_strong]:font-medium [&&_strong]:tabular-nums [&&_>_div:last-child_strong]:text-[#873f52] max-[600.001px]:[&&]:py-[14px] max-[600.001px]:[&&]:px-[12px] max-[600.001px]:[&&]:gap-[10px] max-[600.001px]:[&&_>_div_+_div]:pl-[10px] max-[600.001px]:[&&_.bd-label]:text-[7px] max-[600.001px]:[&&_.bd-label]:tracking-[.7px] max-[600.001px]:[&&_strong]:text-[12px] max-[600.001px]:[&&_strong]:wrap-anywhere">
                  <div><span className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">QUANTITY</span><strong>{Number(item.quantity)}</strong></div>
                  <div><span className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">UNIT PRICE</span><strong>{money(item.price)}</strong></div>
                  <div><span className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">ITEM TOTAL</span><strong>{money(item.total)}</strong></div>
                </div>
                {status === "Pending" && item.serviceItemId && <form className="bd-quantity-form [&&]:flex [&&]:flex-wrap [&&]:[align-items:end] [&&]:gap-[10px] [&&]:mt-[18px] [&&_label]:grid [&&_label]:gap-[5px] [&&_label]:text-[10px] [&&_label]:text-[#817079] [&&_input]:w-[100px] [&&_input]:min-h-[39px] [&&_input]:py-[8px] [&&_input]:px-[10px] [&&_input]:border [&&_input]:border-[#ddccd2] [&&_input]:rounded-[6px] [&&_input]:text-[12px] [&&_.bd-button]:min-h-[39px] [&&_.bd-button]:py-[8px] [&&_.bd-button]:px-[14px]" onSubmit={(event) => {
                  event.preventDefault();
                  updateItem(item, "PATCH", { quantity: Number(new FormData(event.currentTarget).get("quantity")) });
                }}>
                  <label>Adjust quantity<input aria-label={`${item.name} quantity`} type="number" name="quantity" defaultValue={Number(item.quantity)} min={1} max={100000} required disabled={busy} /></label>
                  <button className="bd-button [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:gap-[9px] [&&]:min-h-[43px] [&&]:py-[11px] [&&]:px-[17px] [&&]:border [&&]:border-[transparent] [&&]:rounded-[8px] [&&]:text-[11px] [&&]:font-medium [&&]:leading-[1.5] [&&]:text-center [&&]:no-underline [&&]:transition-[background,box-shadow] [&&]:duration-180 [&&]:ease-[ease] bd-button-secondary [&&&]:bg-[#fff] [&&&]:text-[#873f52] [&&&]:border-[#e3d4d8] [&&&:hover]:bg-[#fbf5f5]" disabled={busy}>Update</button>
                  <button className="bd-text-button [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:gap-[8px] [&&]:p-0 [&&]:border-0 [&&]:bg-transparent [&&]:text-[#873f52] [&&]:text-[11px] [&&]:font-medium [&&:hover]:underline [&&:hover]:[text-underline-offset:4px] bd-remove [&&&]:min-h-[39px] [&&&]:ml-auto [&&&]:text-[#a27575] [&&&]:text-[10px]" type="button" disabled={busy} onClick={() => updateItem(item, "DELETE")}>Remove item</button>
                </form>}
              </article>)}
            </div>
            {(b.VendorMessage || b.CustomerMessage) && <div className="bd-notes [&&]:grid [&&]:gap-[16px] [&&]:mt-0 [&&]:mx-[25px] [&&]:mb-[24px] [&&]:py-[17px] [&&]:px-[18px] [&&]:border-l-2 [&&]:border-l-[#ceae91] [&&]:rounded-[0_6px_6px_0] [&&]:bg-[#fcf9f5] [&&_p]:mt-[6px] [&&_p]:text-[#7d6e72] [&&_p]:text-[12px] [&&_p]:whitespace-pre-wrap [&&_p]:wrap-anywhere max-[600.001px]:[&&]:mr-[20px] max-[600.001px]:[&&]:ml-[20px]">
              {b.VendorMessage && <div><span className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">FROM YOUR VENDOR</span><p>{b.VendorMessage}</p></div>}
              {b.CustomerMessage && <div><span className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">YOUR NOTE</span><p>{b.CustomerMessage}</p></div>}
            </div>}
          </section>

          <section className="bd-card [&&]:overflow-hidden [&&]:border [&&]:border-[#eee5df] [&&]:rounded-[12px] [&&]:bg-[#fff] [&&]:shadow-[0_3px_15px_#51383d03] bd-journey [@media(min-width:_801px)_and_(max-width:_1000px),_(max-width:_700px)]:[&&]:[order:3]" aria-labelledby="bd-journey-title">
            <header className="bd-card-heading [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[16px] [&&]:pt-[23px] [&&]:px-[25px] [&&]:pb-[20px] [&&]:border-b [&&]:border-b-[#f0e9e3] [&&]:text-[#a48b78] [&&_.bd-eyebrow]:text-[8px] [&&_.bd-eyebrow]:tracking-[1.5px] [&&_h2]:mt-[5px] [&&_h2]:mx-0 [&&_h2]:mb-0 [&&_h2]:text-[#45343b] [&&_h2]:[font:400_24px/1.3_Georgia,_serif] [&&_h2]:tracking-[-.5px] [&&_.bd-vendor-name]:mt-[7px] [&&_.bd-vendor-name]:text-[#9a878c] [&&_.bd-vendor-name]:text-[10px] max-[1100.001px]:[&&]:p-[21px] max-[600.001px]:[&&]:p-[20px] max-[600.001px]:[&&_h2]:text-[23px]"><div><p className="bd-eyebrow [&&]:flex [&&]:items-center [&&]:gap-[8px] [&&]:text-[#a37c60] [&&]:text-[9px] [&&]:font-semibold [&&]:tracking-[1.9px] [&&]:leading-[1.7] [&&_>_span]:w-[5px] [&&_>_span]:h-[5px] [&&_>_span]:rounded-[50%] [&&_>_span]:bg-[#b6956d]">EVERY STEP, TOGETHER</p><h2 id="bd-journey-title">Your booking journey</h2></div><Clock3 size={20} strokeWidth={1.4} aria-hidden="true" /></header>
            {data.history.length ? <ol className="bd-history [&&]:m-0 [&&]:py-[24px] [&&]:px-[25px] [&&]:[list-style:none] [&&_li]:relative [&&_li]:flex [&&_li]:gap-[18px] [&&_li]:pb-[25px] [&&_li:last-child]:pb-0 [&&_li:not(:last-child)::before]:content-[''] [&&_li:not(:last-child)::before]:absolute [&&_li:not(:last-child)::before]:left-[4px] [&&_li:not(:last-child)::before]:top-[12px] [&&_li:not(:last-child)::before]:bottom-0 [&&_li:not(:last-child)::before]:w-[1px] [&&_li:not(:last-child)::before]:bg-[#e9ded8] [&&_li:first-child_.bd-history-dot]:bg-[#7f9971] [&&_li:first-child_.bd-history-dot]:shadow-[0_0_0_1px_#b3c6a7] max-[600.001px]:[&&]:p-[22px]">
              {data.history.map((entry, index) => <li key={index}>
                <span className="bd-history-dot [&&]:relative [&&]:shrink-0 [&&]:w-[9px] [&&]:h-[9px] [&&]:mt-[7px] [&&]:border-2 [&&]:border-[#fff] [&&]:rounded-[50%] [&&]:bg-[#ac8b95] [&&]:shadow-[0_0_0_1px_#d4b8c0]" aria-hidden="true" />
                <div className="bd-history-entry [&&]:min-w-0 [&&]:flex-1 [&&_>_div]:flex [&&_>_div]:items-center [&&_>_div]:flex-wrap [&&_>_div]:gap-[10px] [&&_strong]:text-[#5d4650] [&&_strong]:text-[12px] [&&_strong]:font-medium [&&_.cw-badge]:py-[3px] [&&_.cw-badge]:px-[8px] [&&_.cw-badge]:text-[8px] [&&_p]:mt-[5px] [&&_p]:text-[#9a878c] [&&_p]:text-[10px] [&&_p]:wrap-anywhere [&&_.bd-history-note]:text-[#7f7275] [&&_.bd-history-note]:text-[11px] [&&_time]:block [&&_time]:mt-[6px] [&&_time]:text-[#a28f8b] [&&_time]:text-[9px]"><div><strong>{entry.action || "Booking updated"}</strong><Badge>{entry.status}</Badge></div>
                  <p>{entry.role || "System"}{entry.previous ? ` · ${entry.previous} → ${entry.status}` : ""}</p>
                  {entry.note && <p className="bd-history-note">{entry.note}</p>}
                  <time dateTime={entry.createdAt || undefined}>{timestamp(entry.createdAt)}</time>
                </div>
              </li>)}
            </ol> : <p className="bd-empty-history [&&]:p-[25px] [&&]:text-[#81757a] [&&]:text-[12px]">Your booking updates will appear here.</p>}
          </section>

          <div className="bd-manage [&&_>_section]:m-0 [&&_>_section]:py-[23px] [&&_>_section]:px-[25px] [&&_>_section]:border [&&_>_section]:border-[#eee5df] [&&_>_section]:rounded-[12px] [&&_>_section]:text-[#79686d] [&&_>_section]:bg-[#fff] [&&_h2]:mt-0 [&&_h2]:mx-0 [&&_h2]:mb-[15px] [&&_h2]:text-[#45343b] [&&_h2]:[font:400_24px/1.3_Georgia,_serif] [&&_h2]:tracking-[-.5px] [&&_:is(p,_strong,_button)]:text-[11px] [&&_strong]:text-[#69525c] [&&_strong]:font-medium [&&_button]:min-h-[40px] [&&_button]:border-[#e1d5d9] [&&_button]:rounded-[7px] [&&_button]:text-[#875d6b] [&&_button:disabled]:[cursor:not-allowed] [&&_button:enabled:hover]:bg-[#fbf4f5] [&&_p]:leading-[1.8] [@media(min-width:_801px)_and_(max-width:_1000px),_(max-width:_700px)]:[&&]:[order:4] max-[600.001px]:[&&_>_section]:p-[21px]"><BookingChanges id={id} data={data} request={customerRequest} saved={refresh} /></div>
        </div>

        <aside className="bd-sidebar [&&]:grid [&&]:min-w-0 [&&]:gap-[22px] [@media(min-width:_801px)_and_(max-width:_1000px),_(max-width:_700px)]:[&&]:[order:2]" aria-label="Payment summary">
          <section className="bd-card [&&]:overflow-hidden [&&]:border [&&]:border-[#eee5df] [&&]:rounded-[12px] [&&]:bg-[#fff] [&&]:shadow-[0_3px_15px_#51383d03] bd-summary">
            <header className="bd-summary-header [&&]:flex [&&]:items-center [&&]:gap-[9px] [&&]:py-[18px] [&&]:px-[22px] [&&]:border-b [&&]:border-b-[#eee1dc] [&&]:bg-[#fbf5f2] [&&]:text-[#9e7a6c] [&&_h2]:flex-1 [&&_h2]:m-0 [&&_h2]:text-[#6b4550] [&&_h2]:[font:400_20px/1.5_Georgia,_serif] [&&_h2]:tracking-[-.4px] [&&_>_svg:last-child]:text-[#aa9691]"><ReceiptText size={18} aria-hidden="true" /><h2>Payment summary</h2><LockKeyhole size={14} aria-hidden="true" /></header>
            <div className="bd-summary-body [&&]:pt-[23px] [&&]:px-[22px] [&&]:pb-[22px] [&&_>_.bd-label]:text-[8px] [&&_>_.bd-label]:tracking-[1.5px] min-[1400px]:[&&]:p-[26px] max-[1100.001px]:[&&]:py-[21px] max-[1100.001px]:[&&]:px-[18px] max-[600.001px]:[&&]:p-[23px]">
              <p className="bd-label [&&]:block [&&]:text-[#8d7b76] [&&]:text-[9px] [&&]:font-medium [&&]:tracking-[1.15px] [&&]:leading-[1.5]">TOTAL BOOKING VALUE</p><p className="bd-grand-total [&&]:mt-[6px] [&&]:mx-0 [&&]:mb-[14px] [&&]:text-[#873f52] [&&]:[font:400_36px/1.3_Georgia,_serif] [&&]:tracking-[-1px] [&&]:wrap-anywhere">{money(b.TotalAmount)}</p>
              <div className="bd-payment-status [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[12px] [&&]:text-[10px] [&&]:text-[#8b7b80]"><span>Payment status</span><Badge>{b.PaymentStatus}</Badge></div>
              <dl className="bd-breakdown [&&]:grid [&&]:grid-cols-[1fr] [&&]:gap-[13px] [&&]:mt-[20px] [&&]:mx-0 [&&]:mb-0 [&&]:pt-[20px] [&&]:px-0 [&&]:pb-0 [&&]:border-t [&&]:border-t-[#eee6df] [&&]:text-[11px] [&&_>_div]:flex [&&_>_div]:[align-items:baseline] [&&_>_div]:justify-between [&&_>_div]:gap-[14px] [&&_dt]:text-[#88777e] [&&_dd]:m-0 [&&_dd]:text-[#5c4850] [&&_dd]:text-right [&&_dd]:tabular-nums [&&_.bd-breakdown-total]:mt-[3px] [&&_.bd-breakdown-total]:pt-[15px] [&&_.bd-breakdown-total]:border-t [&&_.bd-breakdown-total]:border-dashed [&&_.bd-breakdown-total]:border-t-[#e8ddd5] [&&_.bd-breakdown-total]:text-[12px] [&&_.bd-breakdown-total]:font-semibold">
                <div><dt>Subtotal</dt><dd>{money(b.SubTotal)}</dd></div>
                <div><dt>Discount</dt><dd>{Number(b.DiscountAmount) > 0 ? "−" : ""}{money(b.DiscountAmount)}</dd></div>
                <div><dt>Tax</dt><dd>{money(b.TaxAmount)}</dd></div>
                <div><dt>Platform fee</dt><dd>{money(b.PlatformFee)}</dd></div>
                <div className="bd-breakdown-total [&&_dt]:text-[#563d47] [&&_dd]:text-[#563d47]"><dt>Total amount</dt><dd>{money(b.TotalAmount)}</dd></div>
              </dl>
              <div className="bd-balance [&&]:mt-[20px] [&&]:p-[16px] [&&]:border [&&]:border-[#e6e9e0] [&&]:rounded-[8px] [&&]:bg-[#f7f9f3] [&&_>_div:not(.bd-payment-track)]:flex [&&_>_div:not(.bd-payment-track)]:[align-items:baseline] [&&_>_div:not(.bd-payment-track)]:justify-between [&&_>_div:not(.bd-payment-track)]:gap-[10px] [&&_>_div:not(.bd-payment-track)]:text-[10px] [&&_>_div:first-child]:text-[#6c8061] [&&_span]:inline-flex [&&_span]:items-center [&&_span]:gap-[5px] [&&_strong]:font-medium [&&_strong]:tabular-nums [&&_>_div:last-child]:text-[#5d5d4f]">
                <div><span><CheckCheck size={15} aria-hidden="true" /> Amount paid</span><strong>{money(b.PaidAmount)}</strong></div>
                <div className="bd-payment-track [&&]:h-[4px] [&&]:my-[11px] [&&]:mx-0 [&&]:overflow-hidden [&&]:rounded-[4px] [&&]:bg-[#e5e9dc] [&&_>_span]:block [&&_>_span]:h-full [&&_>_span]:rounded-[inherit] [&&_>_span]:bg-[#879c74]" role="progressbar" aria-label="Booking amount paid" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(paidPercent)}><span style={{ width: `${paidPercent}%` }} /></div>
                <div><span>Remaining balance</span><strong>{money(b.RemainingAmount)}</strong></div>
              </div>
              {canPay && <div className="bd-payment-actions [&&]:grid [&&]:gap-[13px] [&&]:mt-[20px] [&&_>_.bd-button]:w-full [&&_>_.bd-button]:flex-wrap">
                <Link className={`bd-button [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:gap-[9px] [&&]:min-h-[43px] [&&]:py-[11px] [&&]:px-[17px] [&&]:border [&&]:border-[transparent] [&&]:rounded-[8px] [&&]:text-[11px] [&&]:font-medium [&&]:leading-[1.5] [&&]:text-center [&&]:no-underline [&&]:transition-[background,box-shadow] [&&]:duration-180 [&&]:ease-[ease] bd-button-primary [&&&]:bg-[#873f52] [&&&]:border-[#873f52] [&&&]:text-[#fff] [&&&]:shadow-[0_4px_10px_#74314713] [&&&:hover]:bg-[#713347] [&&&:hover]:border-[#713347] [&&&:hover]:shadow-[0_5px_16px_#74314722]${busy || !config.data?.enabled ? " bd-unavailable [&&]:opacity-50 [&&]:cursor-default" : ""}`} aria-disabled={busy || !config.data?.enabled} to={`/customer/bookings/${id}/checkout`} onClick={(event) => { if (busy || !config.data?.enabled) event.preventDefault(); }}><LockKeyhole size={16} aria-hidden="true" /> Pay {money(b.RemainingAmount)}<ArrowRight size={16} aria-hidden="true" /></Link>
                <Link className="bd-terms [&&]:flex [&&]:items-center [&&]:justify-center [&&]:gap-[5px] [&&]:text-[#8a6672] [&&]:text-[10px] [&&]:underline [&&]:[text-underline-offset:3px]" to={`/customer/bookings/${id}/checkout`}>Review checkout & payment terms <ArrowRight size={13} aria-hidden="true" /></Link>
                {!config.loading && !config.data?.enabled && <p className="bd-payment-unavailable [&&]:text-[#9b6a56] [&&]:text-[11px]">Online payment is currently unavailable. Please contact support.</p>}
                {config.error && <ErrorView error={config.error} retry={config.retry} />}
              </div>}
              {status === "Pending" && <div className="bd-awaiting [&&]:flex [&&]:items-start [&&]:gap-[9px] [&&]:mt-[20px] [&&]:p-[13px] [&&]:border [&&]:border-[#eee3cf] [&&]:rounded-[7px] [&&]:bg-[#fffbf3] [&&]:text-[#a4854f] [&&_>_svg]:mt-[2px] [&&_strong]:text-[#8b7046] [&&_strong]:text-[10px] [&&_strong]:font-medium [&&_p]:mt-[4px] [&&_p]:text-[#8e7b61] [&&_p]:text-[10px] [&&_p]:leading-[1.7]"><Clock3 size={17} aria-hidden="true" /><div><strong>Awaiting vendor acceptance</strong><p>Payment will be available after your vendor accepts this request.</p></div></div>}
              {status === "Completed" && <button className="bd-button [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:gap-[9px] [&&]:min-h-[43px] [&&]:py-[11px] [&&]:px-[17px] [&&]:border [&&]:border-[transparent] [&&]:rounded-[8px] [&&]:text-[11px] [&&]:font-medium [&&]:leading-[1.5] [&&]:text-center [&&]:no-underline [&&]:transition-[background,box-shadow] [&&]:duration-180 [&&]:ease-[ease] bd-button-primary [&&&]:bg-[#873f52] [&&&]:border-[#873f52] [&&&]:text-[#fff] [&&&]:shadow-[0_4px_10px_#74314713] [&&&:hover]:bg-[#713347] [&&&:hover]:border-[#713347] [&&&:hover]:shadow-[0_5px_16px_#74314722] bd-review [&&]:w-full [&&]:mt-[20px]" onClick={onReview}><Star size={16} aria-hidden="true" /> Write a review</button>}
            </div>
            <footer className="bd-summary-footer [&&]:flex [&&]:items-center [&&]:justify-center [&&]:gap-[7px] [&&]:py-[13px] [&&]:px-[15px] [&&]:border-t [&&]:border-t-[#f0e9e1] [&&]:bg-[#fdfbf8] [&&]:text-[#928575] [&&]:text-[9px]"><ShieldCheck size={15} aria-hidden="true" /><span>Payments processed through secure checkout</span></footer>
          </section>

          <section className="bd-next-step [&&]:py-[24px] [&&]:px-[22px] [&&]:border [&&]:border-[#eadfd5] [&&]:rounded-[12px] [&&]:bg-[linear-gradient(135deg,_#f5ece3,_#fbf7f1)] [&&_.bd-eyebrow]:text-[8px] [&&_.bd-eyebrow]:tracking-[1.4px] [&&_h2]:mt-[8px] [&&_h2]:mx-0 [&&_h2]:mb-[10px] [&&_h2]:text-[#745745] [&&_h2]:[font:italic_400_24px/1.3_Georgia,_serif] [&&_h2]:tracking-[-.4px] [&&_>_p:last-of-type]:text-[#8c796b] [&&_>_p:last-of-type]:text-[11px] [&&_>_p:last-of-type]:leading-[1.9] [&&_.bd-text-button]:mt-[18px] [&&_.bd-text-button]:text-[10px] [@media(min-width:_801px)_and_(max-width:_1000px),_(max-width:_700px)]:[&&]:hidden"><span className="bd-next-icon [&&]:grid [&&]:[place-items:center] [&&]:w-[37px] [&&]:h-[37px] [&&]:mb-[15px] [&&]:border [&&]:border-[#dfcdb5] [&&]:rounded-[50%] [&&]:text-[#ad8956]"><Sparkles size={20} strokeWidth={1.3} aria-hidden="true" /></span><p className="bd-eyebrow [&&]:flex [&&]:items-center [&&]:gap-[8px] [&&]:text-[#a37c60] [&&]:text-[9px] [&&]:font-semibold [&&]:tracking-[1.9px] [&&]:leading-[1.7] [&&_>_span]:w-[5px] [&&_>_span]:h-[5px] [&&_>_span]:rounded-[50%] [&&_>_span]:bg-[#b6956d]">A NOTE FOR YOUR JOURNEY</p><h2>{statusCopy[0]}</h2><p>{statusCopy[1]}</p><button className="bd-text-button [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:gap-[8px] [&&]:p-0 [&&]:border-0 [&&]:bg-transparent [&&]:text-[#873f52] [&&]:text-[11px] [&&]:font-medium [&&:hover]:underline [&&:hover]:[text-underline-offset:4px]" onClick={message} disabled={busy}>Connect with your vendor <ArrowRight size={14} aria-hidden="true" /></button></section>
        </aside>
      </div>

      <footer className="bd-footer [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[15px] [&&]:mt-[30px] [&&]:pt-[20px] [&&]:px-0 [&&]:pb-[5px] [&&]:border-t [&&]:border-t-[#e9ded6] [&&]:text-[#ad9a92] [&&_p]:text-[9px] max-[600.001px]:[&&]:flex-wrap max-[600.001px]:[&&]:justify-center max-[600.001px]:[&&]:[column-gap:18px]"><span className="bd-footer-brand [&&]:text-[#96726c] [&&]:[font:400_22px/1.4_Georgia,_serif] [&&]:tracking-[-.7px] [&&_span]:text-[#ba9972]">MarryNest<span>.</span></span><p>For the day. For the memories. For you.</p><Heart size={14} strokeWidth={1.4} aria-hidden="true" /></footer>
    </div>
  );
}
