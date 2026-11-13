import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ShieldCheck, ShoppingBag, CalendarDays, ArrowLeft, ArrowRight, Check, MapPin, Package, ReceiptText, UserRound, Clock3, Sparkles, LockKeyhole, CheckCircle2, Heart, ArrowUpRight, Minus, Plus, LoaderCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useCustomerData,
  Loading,
  ErrorView,
} from "../customer/components/WorkspaceUI";
import {
  customerRequest,
  save,
  money,
  date,
} from "../customer/services/workspace.api";
import { loadCheckout } from "../customer/services/checkout-loader";
import { offerState } from "./offer-state";
import { bookingQuantityState } from "./booking-quantity";
import CartItem from "./CartItem";
import { categoryImages } from "../../components/home/categoryImages";
import "./commerce.css";

function AddressPicker({ value, onChange, optional = false, disabled = false, className = "", selectClassName = "", linkClassName = "" }) {
  const state = useCustomerData("/addresses?pageSize=50");
  return (
    <label className={className}>
      {optional ? "Booking address (optional)" : "Shipping / billing address"}
      {state.loading ? (
        <span role="status">Loading addresses…</span>
      ) : state.error ? (
        <ErrorView error={state.error} retry={state.retry} />
      ) : (
        <select
          className={selectClassName}
          disabled={disabled}
          required={!optional}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {optional ? "No address required" : "Choose your address"}
          </option>
          {(state.data?.rows || state.data || []).map((a) => (
            <option key={a.id || a.AddressId} value={a.id || a.AddressId}>
              {a.fullName || a.name || a.FullName} ·{" "}
              {a.line1 || a.addressLine1 || a.address || a.AddressLine1} ·{" "}
              {a.city || a.City}
            </option>
          ))}
        </select>
      )}
      <Link className={linkClassName} to="/customer/addresses">Manage addresses</Link>
    </label>
  );
}
function CustomerLabel({ className = "" }) {
  const { user } = useAuth();
  return (
    <p className={className}>
      {[user.firstName, user.lastName].filter(Boolean).join(" ")} · {user.email}{" "}
      · {user.phone || ""}
    </p>
  );
}
function Totals({ data }) {
  return (
    <>
      <div className="commerce-line">
        <span>Subtotal</span>
        <span>{money(data.subtotal)}</span>
      </div>
      {data.shipping != null && (
        <div className="commerce-line">
          <span>Delivery charges</span>
          <span>{money(data.shipping)}</span>
        </div>
      )}
      <div className="commerce-line">
        <span>Tax</span>
        <span>{money(data.tax)}</span>
      </div>
      <p className="commerce-total">Total {money(data.total)}</p>
    </>
  );
}
export function BookingCheckout() {
  const { id } = useParams();
  return <BookingForm key={id} id={id} />;
}
function BookingForm({ id }) {
  const service = useCustomerData(`/services/${id}`),
    [body, setBody] = useState({
      serviceId: id,
      quantity: 1,
      instructions: "",
      idempotencyKey: crypto.randomUUID(),
    }),
    [preview, setPreview] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState(false),
    [success, setSuccess] = useState(null),
    [imageFailed, setImageFailed] = useState(false);
  const set = (key, value) => {
    setBody((b) => ({ ...b, [key]: value || undefined }));
    setPreview(null);
    setAccepted(false);
    setError("");
  };
  useEffect(() => {
    if (service.data?.service.offer?.book)
      setBody((b) => ({
        ...b,
        quantity: Number(service.data.service.offer.book.minimum),
      }));
  }, [service.data]);
  if (service.loading) return <Loading />;
  if (service.error)
    return <ErrorView error={service.error} retry={service.retry} />;
  const item = service.data.service,
    book = item.offer?.book;
  if (!book || !offerState(item).canBook)
    return (
      <div className="mx-auto max-w-[1160px] p-6 [&_h1]:mb-5 [&_h1]:text-3xl">
        <h1>Booking unavailable</h1>
        <Link to={`/services/${id}`}>Return to listing</Link>
      </div>
    );
  const quantityState = bookingQuantityState(body.quantity, book);
  const validQuantity = quantityState.valid;
  const estimatedSubtotal = validQuantity
    ? Math.round(Number(book.price) * 100) * body.quantity / 100
    : null;
  const bookingImage = (!imageFailed && item.image) || categoryImages[item.category] || categoryImages["Religious & Ceremony Services"];
  const bookingDuration = book.duration === "Custom" ? `${book.durationMinutes} minutes` : book.duration;
  const currentStep = success ? 2 : preview ? 1 : 0;
  async function review(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setPreview(await save("/booking-checkout/preview", "POST", body));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      setSuccess(
        await save("/booking-checkout", "POST", {
          ...body,
          reviewToken: preview.reviewToken,
          termsAccepted: accepted,
        }),
      );
    } catch (e) {
      setError(e.message);
      setPreview(null);
      setAccepted(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto min-w-0 max-w-[1240px] px-7 pt-7 pb-8 text-[#422d36] max-[900px]:px-5 max-[600px]:px-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#b98979] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#b98979]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link className="group inline-flex min-w-0 items-center gap-2 text-xs text-[#88767d] transition-colors hover:text-[#8c414e]" to={`/services/${id}`}>
          <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1" aria-hidden="true" />
          <span className="truncate">Back to {item.name}</span>
        </Link>
        <span className="inline-flex items-center gap-[6px] text-[10px] tracking-wide text-[#98877e]"><LockKeyhole size={12} aria-hidden="true" /> PRIVATE & SECURE</span>
      </div>

      <header className="relative isolate mb-7 overflow-hidden rounded-[24px] bg-[#482632] shadow-[0_18px_45px_-24px_#48263280] max-[600px]:rounded-[18px]">
        <div aria-hidden="true" className="pointer-events-none absolute -left-36 -top-52 size-[500px] rounded-full border border-[#c49b7f]/15" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-40 size-[500px] rounded-full border border-[#c49b7f]/10" />
        <div className="relative grid grid-cols-[minmax(0,1.6fr)_minmax(240px,1fr)] max-[700px]:grid-cols-1">
          <div className="relative z-10 px-9 py-9 max-[900px]:px-7 max-[600px]:px-6 max-[600px]:py-7">
            <span className="mb-5 inline-flex items-center gap-2 text-[9px] font-medium tracking-[2.5px] text-[#dbb899]"><span className="h-px w-6 bg-[#dbb899]" /> THE MARRYNEST EXPERIENCE</span>
            <h1 className="m-0 text-[clamp(36px,4.2vw,55px)] leading-[1.08] tracking-[-1.8px] text-[#fff9ef]">Beautiful moments<br />begin <em className="font-normal text-[#dfb99b]">here.</em></h1>
            <p className="mt-4 max-w-[340px] text-xs leading-[1.8] text-[#e1ced3]!">Your vision, your details. Let’s bring your celebration one step closer.</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-[#e2cbd0]"><span className="inline-flex items-center gap-[6px]"><ShieldCheck size={14} className="text-[#d8b497]" aria-hidden="true" /> Review before you reserve</span><span className="inline-flex items-center gap-[6px]"><Heart size={13} className="text-[#d8b497]" aria-hidden="true" /> Planned around you</span></div>
          </div>
          <div className="relative min-h-[260px] overflow-hidden max-[700px]:hidden">
            <img src={bookingImage} onError={imageFailed ? undefined : () => setImageFailed(true)} alt="" className="absolute inset-0 size-full object-cover opacity-75" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#482632,transparent_55%),linear-gradient(0deg,#482632bb,transparent_70%)]" />
            <div className="absolute right-7 bottom-7 rounded-xl border border-white/20 bg-[#fff8ee]/10 px-5 py-4 backdrop-blur-md">
              <Sparkles size={17} className="mb-2 text-[#e5c8ac]" aria-hidden="true" />
              <p className="font-[Georgia,serif] text-xl leading-[1.25] text-[#fff8ee]!">A celebration.<br />Entirely yours.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-7 flex items-center justify-between gap-4 max-[600px]:flex-col max-[600px]:items-start">
        <div><span className="text-[9px] font-semibold tracking-[2px] text-[#ac8a75]">YOUR RESERVATION</span><h2 className="mt-1 text-[29px] tracking-[-0.8px]">Booking checkout</h2></div>
        <ol className="m-0 flex list-none items-center gap-0 p-0" aria-label="Booking progress">
          {["Details", "Review", "Request sent"].map((label, index) => (
            <li key={label} aria-current={index === currentStep ? "step" : undefined} className="flex items-center text-[11px]">
              {index > 0 && <span aria-hidden="true" className={`mx-3 h-px w-7 max-[400px]:mx-2 max-[400px]:w-4 ${index <= currentStep ? "bg-[#b9848d]" : "bg-[#e5dcd6]"}`} />}
              <span className={`mr-2 grid size-7 shrink-0 place-items-center rounded-full text-[10px] transition-colors ${index < currentStep ? "bg-[#f1e5e6] text-[#8c414e]" : index === currentStep ? "bg-[#8c414e] text-white shadow-[0_0_0_4px_#8c414e0d]" : "border border-[#e5dcd6] text-[#aa979d]"}`}>{index < currentStep ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
              <span className={index === currentStep ? "font-medium text-[#7b3946]" : "text-[#9b8990]"}>{label}</span>
            </li>
          ))}
        </ol>
      </div>

      {error && <p className="mb-5 whitespace-pre-wrap rounded-xl border border-[#edc6bc] bg-[#fff1ed] p-4 text-xs leading-relaxed text-[#994a42]!" role="alert">{error}</p>}
      {success ? (
        <section className="relative overflow-hidden rounded-[22px] border border-[#e8dfd8] bg-white px-7 py-14 text-center shadow-[0_10px_40px_-20px_#48263230]" role="status">
          <span className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-[#f2f5ed] text-[#71835a] shadow-[0_0_0_10px_#f7f8f3]"><CheckCircle2 size={35} strokeWidth={1.3} aria-hidden="true" /></span>
          <span className="text-[10px] font-medium tracking-[2px] text-[#b18b74]">THE NEXT CHAPTER IS ON ITS WAY</span>
          <h2 className="mt-3 text-[clamp(30px,4vw,42px)] tracking-[-1px]">Your request, beautifully received.</h2>
          <p className="mx-auto mt-4 max-w-[410px] text-[13px] leading-[1.9] text-[#8c7981]!">Your availability is reserved. Your vendor will review your request before you make a payment.</p>
          <span className="mt-5 inline-block rounded-lg border border-dashed border-[#ded0c6] bg-[#fcf9f5] px-5 py-3 text-xs tracking-wide text-[#806571]">{success.number}</span>
          <div><Link className="group mt-7 inline-flex min-h-[50px] items-center gap-5 rounded-xl bg-[#8c414e] px-7 py-3 text-xs font-medium text-white! shadow-[0_8px_20px_#8c414e25] hover:bg-[#74333f]" to={`/customer/bookings/${success.id}`}>View your booking <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" /></Link></div>
        </section>
      ) : (
        <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)] items-start gap-7 max-[1000px]:gap-5 max-[800px]:grid-cols-1">
          <div className="min-w-0 space-y-5">
            <section aria-label="Selected service" className="overflow-hidden rounded-[18px] border border-[#e8dfd8] bg-white shadow-[0_5px_24px_-12px_#694b3b12]">
              <div className="flex gap-5 p-5 max-[450px]:gap-4 max-[450px]:p-4">
                <div className="relative h-[124px] w-[108px] shrink-0 overflow-hidden rounded-xl bg-[#eee5dc] max-[450px]:h-[110px] max-[450px]:w-[85px]">
                  <img src={bookingImage} onError={imageFailed ? undefined : () => setImageFailed(true)} alt={item.image && !imageFailed ? item.name : `${item.category || "Wedding"} inspiration`} className="size-full object-cover" />
                  <span className="absolute right-2 bottom-2 grid size-7 place-items-center rounded-full border border-white/30 bg-white/90 text-[#8c414e] backdrop-blur-sm"><Heart size={12} strokeWidth={1.5} aria-hidden="true" /></span>
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <span className="mb-2 inline-flex rounded-md bg-[#f8f1e9] px-2 py-1 text-[8px] font-semibold tracking-[1.3px] text-[#a47c5e]">{item.category || "YOUR SELECTED SERVICE"}</span>
                  <h3 className="m-0! font-[Georgia,serif] text-[27px]! leading-tight font-normal! tracking-[-0.6px] [overflow-wrap:anywhere] max-[450px]:text-[23px]!">{item.name}</h3>
                  <p className="mt-[5px] text-xs text-[#8c7981]!">by <span className="font-medium text-[#66505b]">{item.vendor}</span></p>
                  <div className="mt-3 flex flex-wrap items-baseline gap-[6px]"><strong className="text-lg font-semibold tracking-[-0.6px] text-[#8c414e]">{money(book.price)}</strong><span className="text-[10px] text-[#a18e96]">/ unit · {book.duration.toLowerCase()}</span></div>
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-[#efe8e2] bg-[#fcfaf7] px-5 py-[14px]">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#e9ded3] bg-white text-[#a48068]"><UserRound size={15} aria-hidden="true" /></span>
                <div className="min-w-0"><span className="text-[9px] font-medium uppercase tracking-[1px] text-[#a08d82]">Reserved for you</span><CustomerLabel className="mt-[2px] text-[11px] leading-[1.8] text-[#7f6a74]! [overflow-wrap:anywhere]" /></div>
              </div>
            </section>

            <form id="booking-details-form" onSubmit={review} className="overflow-hidden rounded-[18px] border border-[#e8dfd8] bg-white shadow-[0_5px_24px_-12px_#694b3b12]">
              <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
                <section className="p-7 max-[600px]:p-5" aria-labelledby="booking-schedule-heading">
                  <div className="mb-6 flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#ead8d9] bg-[#faf0f0] font-[Georgia,serif] text-[17px] text-[#9a5a66]">01</span><div><h3 id="booking-schedule-heading" className="m-0! text-[15px]! font-semibold">The when & how many</h3><p className="mt-1 text-[11px] text-[#9b8790]!">A date to look forward to. Details made for you.</p></div></div>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-5 max-[450px]:grid-cols-1">
                    <label className="flex min-w-0 flex-col gap-[9px] text-[11px] font-medium text-[#6e5661]">
                      Booking quantity
                      {quantityState.min === quantityState.max ? (
                        <span className="flex min-h-[50px] items-center gap-3 rounded-xl border border-[#e8ded8] bg-[#f6f3ee] px-[14px]">
                          <LockKeyhole size={15} className="shrink-0 text-[#a18b78]" aria-hidden="true" />
                          <input readOnly value={`${quantityState.min} ${quantityState.min === 1 ? "unit" : "units"}`} aria-label="Booking quantity" aria-describedby="booking-quantity-help" className="w-full min-w-0 border-0 bg-transparent p-0 text-xs font-medium text-[#6e5661] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4aeb5]" />
                          <span className="shrink-0 rounded-md border border-[#e5d9ce] bg-white/70 px-2 py-1 text-[9px] font-normal text-[#9a8270]">Fixed quantity</span>
                        </span>
                      ) : (
                      <span className="flex min-h-[50px] items-center rounded-xl border border-[#e8ded8] bg-[#fdfbf9] p-[5px] focus-within:border-[#b47f87] focus-within:ring-[3px] focus-within:ring-[#8c414e0a]">
                        <button type="button" disabled={busy || quantityState.decrease === null} onClick={() => set("quantity", quantityState.decrease)} aria-label="Decrease booking quantity" className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#8c414e] shadow-[0_2px_7px_#5740330a] transition-colors hover:bg-[#f5e9e9] disabled:cursor-not-allowed disabled:opacity-30"><Minus size={14} aria-hidden="true" /></button>
                        <input type="number" required min={quantityState.min} max={quantityState.max} step={1} value={body.quantity ?? ""} onChange={(e) => set("quantity", Number(e.target.value))} aria-label="Booking quantity" aria-invalid={!validQuantity} aria-describedby="booking-quantity-help" className="h-9 w-full min-w-0 appearance-none border-0 bg-transparent px-1 text-center text-sm font-semibold text-[#654650] outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]" />
                        <button type="button" disabled={busy || quantityState.increase === null} onClick={() => set("quantity", quantityState.increase)} aria-label="Increase booking quantity" className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#8c414e] shadow-[0_2px_7px_#5740330a] transition-colors hover:bg-[#f5e9e9] disabled:cursor-not-allowed disabled:opacity-30"><Plus size={14} aria-hidden="true" /></button>
                      </span>
                      )}
                      <span id="booking-quantity-help" className={`text-[10px] leading-relaxed font-normal ${validQuantity ? "text-[#a18b94]" : "text-[#a44545]"}`}>
                        {quantityState.min === quantityState.max
                          ? `This service allows ${quantityState.min} ${quantityState.min === 1 ? "unit" : "units"} per booking.`
                          : `Choose a whole number from ${quantityState.min} to ${quantityState.max}.`}
                      </span>
                    </label>
                    {book.mode === "Scheduled" && (
                      <>
                        <label className="flex min-w-0 flex-col gap-[9px] text-[11px] font-medium text-[#6e5661]">Booking date
                          <input type="date" required min={book.startDate > new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) ? book.startDate : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })} max={book.endDate || undefined} value={body.date || ""} onChange={(e) => set("date", e.target.value)} className="min-h-[50px] w-full min-w-0 rounded-xl border border-[#e8ded8] bg-[#fdfbf9] px-[14px] py-3 text-xs font-normal text-[#6e5661] transition-[border-color,box-shadow] hover:border-[#c6a4a7] focus-visible:border-[#b47f87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4aeb5] disabled:opacity-60" />
                        </label>
                        {book.slots.length ? (
                          <label className="flex min-w-0 flex-col gap-[9px] text-[11px] font-medium text-[#6e5661]">Booking time slot
                            <select required value={body.start || ""} onChange={(e) => set("start", e.target.value)} className="min-h-[50px] w-full min-w-0 rounded-xl border border-[#e8ded8] bg-[#fdfbf9] px-[14px] py-3 text-xs font-normal text-[#6e5661] hover:border-[#c6a4a7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4aeb5]">
                              <option value="">Choose a time slot</option>{book.slots.map((slot) => <option key={slot.start} value={slot.start}>{slot.start}–{slot.end}</option>)}
                            </select>
                          </label>
                        ) : book.duration === "Hourly" || book.duration === "Custom" ? (
                          <label className="flex min-w-0 flex-col gap-[9px] text-[11px] font-medium text-[#6e5661]">Start time
                            <input required type="time" value={body.start || ""} onChange={(e) => set("start", e.target.value)} className="min-h-[50px] w-full min-w-0 rounded-xl border border-[#e8ded8] bg-[#fdfbf9] px-[14px] py-3 text-xs font-normal text-[#6e5661] hover:border-[#c6a4a7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4aeb5]" />
                          </label>
                        ) : null}
                      </>
                    )}
                    <label className="flex min-w-0 flex-col gap-[9px] text-[11px] font-medium text-[#6e5661]">Booking duration
                      <span className="flex min-h-[50px] items-center gap-[10px] rounded-xl border border-[#ece5df] bg-[#f6f3ee] px-[14px]"><Clock3 size={16} className="shrink-0 text-[#a18b78]" aria-hidden="true" /><input readOnly value={bookingDuration} aria-label="Booking duration" className="w-full min-w-0 border-0 bg-transparent p-0 text-xs font-normal text-[#897669] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4aeb5]" /></span>
                    </label>
                  </div>
                  {book.instructions && <p className="mt-5 whitespace-pre-wrap rounded-xl border border-[#ece3d7] bg-[#fcf8f0] px-4 py-3 text-[11px] leading-[1.8] text-[#97816b]! [overflow-wrap:anywhere]">{book.instructions}</p>}
                </section>
                <section className="border-t border-[#f0e7e1] p-7 max-[600px]:p-5" aria-labelledby="booking-personalize-heading">
                  <div className="mb-6 flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#e9dfd2] bg-[#f8f3ea] font-[Georgia,serif] text-[17px] text-[#a88a68]">02</span><div><h3 id="booking-personalize-heading" className="m-0! text-[15px]! font-semibold">A few personal touches</h3><p className="mt-1 text-[11px] text-[#9b8790]!">The little things that make a celebration yours.</p></div></div>
                  <AddressPicker optional value={body.addressId || ""} onChange={(v) => set("addressId", v)} className="flex flex-col gap-[9px] text-[11px] font-medium text-[#6e5661]" selectClassName="min-h-[50px] w-full min-w-0 rounded-xl border border-[#e8ded8] bg-[#fdfbf9] px-[14px] py-3 text-xs font-normal text-[#6e5661] hover:border-[#c6a4a7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4aeb5]" linkClassName="mt-px self-end text-[10px] font-normal text-[#9a5b68] underline decoration-[#dcc3c6] underline-offset-4 hover:decoration-[#9a5b68]" />
                  <label className="mt-5 flex flex-col gap-[9px] text-[11px] font-medium text-[#6e5661]"><span>Note to your vendor <span className="font-normal text-[#b29ea6]">(optional)</span></span>
                    <textarea rows={3} maxLength={2000} value={body.instructions || ""} onChange={(e) => set("instructions", e.target.value)} placeholder="A special request, a preference, a little detail…" className="min-h-[110px] w-full min-w-0 resize-y rounded-xl border border-[#e8ded8] bg-[#fdfbf9] px-[14px] py-3 text-xs leading-[1.8] font-normal text-[#6e5661] transition-[border-color,box-shadow] placeholder:text-[#b8a6ac] hover:border-[#c6a4a7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4aeb5] disabled:opacity-60" />
                  </label>
                  <div className="mt-[6px] flex justify-between gap-3 text-[9px] text-[#b6a49f]"><span>Shared with your vendor for this booking.</span><span>{(body.instructions || "").length}/2000</span></div>
                </section>
              </fieldset>
            </form>
          </div>

          <aside className="sticky top-6 min-w-0 max-[800px]:static" aria-label="Booking summary">
            <section className="overflow-hidden rounded-[20px] border border-[#e6d8cf] bg-white shadow-[0_16px_45px_-22px_#683f4580]">
              <div className="relative overflow-hidden bg-[#f2e8dc] px-7 pt-7 pb-6 max-[600px]:px-5">
                <ReceiptText size={76} strokeWidth={0.7} className="pointer-events-none absolute -right-2 top-2 -rotate-12 text-[#b39670]/15" aria-hidden="true" />
                <span className="relative text-[9px] font-semibold tracking-[2px] text-[#9f805e]">A LITTLE SOMETHING TO LOOK FORWARD TO</span>
                <h2 className="relative mt-2 text-[28px] tracking-[-0.8px]">Your booking, at a glance.</h2>
                <div className="mt-5 flex items-end justify-between gap-3"><div><span className="text-[10px] text-[#9b7e68]">{preview ? "Your booking total" : "Estimated subtotal"}</span><div className="mt-[3px] font-[Georgia,serif] text-[42px] leading-[1.1] tracking-[-1.5px] text-[#724150] [overflow-wrap:anywhere]">{preview ? money(preview.total) : estimatedSubtotal === null ? "—" : money(estimatedSubtotal)}</div></div><span className="mb-1 rounded-md border border-[#d9c8b3] px-2 py-1 text-[9px] tracking-[1px] text-[#9c8069]">INR</span></div>
                <p className="mt-3 text-[10px] leading-[1.7] text-[#a08977]!">{preview ? "Current price checked. Review the details below." : "Final pricing and applicable taxes are shown after review."}</p>
              </div>
              <div className="relative mx-0 border-t border-dashed border-[#d9c9bd] before:absolute before:-left-[7px] before:-top-[7px] before:size-[14px] before:rounded-full before:border before:border-[#e6d8cf] before:bg-[#faf8f5] after:absolute after:-right-[7px] after:-top-[7px] after:size-[14px] after:rounded-full after:border after:border-[#e6d8cf] after:bg-[#faf8f5]" aria-hidden="true" />
              <div className="px-7 pt-6 pb-7 max-[600px]:px-5">
                <div className="mb-5 border-b border-[#f0e7e1] pb-5"><span className="text-[9px] uppercase tracking-[1.4px] text-[#af9789]">The experience</span><h3 className="mt-[5px] mb-0! text-[14px]! font-semibold [overflow-wrap:anywhere]">{item.name}</h3><p className="mt-1 text-[11px] text-[#a18b94]!">by {item.vendor}</p></div>
                <dl className="m-0 space-y-4 text-[11px] [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-4 [&_dt]:flex [&_dt]:items-center [&_dt]:gap-2 [&_dt]:text-[#a38b94] [&_dt>svg]:text-[#ba9b89] [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-medium [&_dd]:text-[#71545f]">
                  {book.mode === "Scheduled" && <div><dt><CalendarDays size={14} aria-hidden="true" /> Date</dt><dd>{body.date ? date(body.date) : <span className="font-normal text-[#b8a9ac]">Not selected yet</span>}</dd></div>}
                  <div><dt><ShoppingBag size={14} aria-hidden="true" /> Quantity</dt><dd>{body.quantity || "—"} {Number(body.quantity) === 1 ? "unit" : "units"}</dd></div>
                  <div><dt><Clock3 size={14} aria-hidden="true" /> Duration</dt><dd>{bookingDuration}</dd></div>
                  {body.start && <div><dt><Clock3 size={14} aria-hidden="true" /> Start time</dt><dd>{body.start} IST</dd></div>}
                  <div><dt><MapPin size={14} aria-hidden="true" /> Address</dt><dd>{body.addressId ? "Address selected" : "Not required"}</dd></div>
                </dl>
                {preview ? (
                  <>
                    <p className="mt-6 mb-4 inline-flex w-full items-center gap-2 rounded-lg border border-[#dce7d6] bg-[#f3f7f0] px-3 py-[10px] text-[10px] text-[#738860]!" role="status"><CheckCircle2 size={14} aria-hidden="true" /> Price & availability checked</p>
                    {preview.startsAt && <p className="mb-3 text-[10px] leading-[1.8] text-[#a18b94]! [overflow-wrap:anywhere]">Reservation window: {preview.startsAt.replace("T", " ")} to {preview.endsAt.replace("T", " ")} (India time).</p>}
                    <p className="mb-4 text-[10px] text-[#a18b94]!">{preview.remaining} available before this request</p>
                    <dl className="m-0 border-t border-[#eee5de] pt-4 text-[11px] [&>div]:mb-3 [&>div]:flex [&>div]:justify-between [&>div]:gap-4 [&_dt]:text-[#a18b94] [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-medium">
                      <div><dt>Subtotal</dt><dd>{money(preview.subtotal)}</dd></div>{preview.shipping != null && <div><dt>Delivery charges</dt><dd>{money(preview.shipping)}</dd></div>}<div><dt>Tax</dt><dd>{money(preview.tax)}</dd></div>
                      <div className="border-t border-[#eee5de] pt-3 text-sm"><dt className="font-semibold text-[#71545f]!">Booking total</dt><dd className="text-[#8c414e]">{money(preview.total)}</dd></div>
                    </dl>
                    <p className="mt-3 rounded-lg bg-[#faf6f0] px-3 py-[10px] text-[10px] leading-[1.8] text-[#9a8270]!">Advance available: <strong>{money(preview.advance)}</strong>. Track your remaining balance in My Bookings.</p>
                    <div className="mt-5 space-y-3 rounded-xl border border-[#eee5de] p-[14px]"><div><h3 className="mb-1! text-[10px]! font-semibold">Cancellation policy</h3><p className="whitespace-pre-wrap text-[10px] leading-[1.8] text-[#a18b94]! [overflow-wrap:anywhere]">{preview.terms.cancellation}</p></div><div><h3 className="mb-1! text-[10px]! font-semibold">Refund policy</h3><p className="whitespace-pre-wrap text-[10px] leading-[1.8] text-[#a18b94]! [overflow-wrap:anywhere]">{preview.terms.refund}</p></div></div>
                    <label className="my-5 flex items-start gap-[10px] text-[11px] leading-[1.8] text-[#957c87]"><input type="checkbox" checked={accepted} disabled={busy} onChange={(e) => setAccepted(e.target.checked)} className="mt-[3px] size-4 shrink-0 accent-[#8c414e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4aeb5]" />I accept the cancellation and refund policies.</label>
                    <button disabled={busy || !accepted} onClick={confirm} className="group flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-[#8c414e] bg-[linear-gradient(110deg,#8c414e,#713447)] px-5 py-[14px] text-xs font-medium text-white shadow-[0_8px_18px_#8c414e25] transition-[box-shadow,transform] enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_12px_24px_#8c414e35] disabled:cursor-not-allowed disabled:opacity-45">{busy ? "Sending your request…" : "Confirm booking request"}{busy ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />}</button>
                  </>
                ) : (
                  <div className="mt-6 border-t border-[#eee5de] pt-5"><button type="submit" form="booking-details-form" disabled={busy} className="group flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-[#8c414e] bg-[linear-gradient(110deg,#8c414e,#713447)] px-5 py-[14px] text-xs font-medium text-white shadow-[0_8px_18px_#8c414e25] transition-[box-shadow,transform] enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_12px_24px_#8c414e35] disabled:cursor-not-allowed disabled:opacity-45">{busy ? "Checking availability…" : "Check availability & review"}{busy ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />}</button></div>
                )}
                <p className="mt-[14px] flex items-center justify-center gap-[5px] text-[9px] text-[#ad989e]!"><LockKeyhole size={11} aria-hidden="true" /> No payment needed just yet</p>
                <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#faf8f4] p-[14px]"><ShieldCheck size={21} strokeWidth={1.4} className="mt-[2px] text-[#a99074]" aria-hidden="true" /><div><strong className="text-[11px] font-medium text-[#846954]">Thoughtfully booked. Peacefully planned.</strong><p className="mt-1 text-[10px] leading-[1.8] text-[#a38f81]!">{preview ? "Your vendor reviews your request before you choose an advance or full payment." : "Review current pricing, availability and policies before confirming your request."}</p></div></div>
              </div>
            </section>
            <div className="mt-5 px-[6px]"><span className="text-[9px] font-medium tracking-[1.6px] text-[#b29b8d]">YOUR NEXT CHAPTER, IN THREE STEPS</span><div className="mt-[14px] space-y-3">{["Review the details & policies", "Send your request to the vendor", "Pay after vendor confirmation"].map((step, index) => <div key={step} className="flex items-center gap-[10px] text-[10px] text-[#a18b94]"><span className="grid size-[21px] place-items-center rounded-full border border-[#e4d8cc] bg-[#f6f0e7] text-[8px] text-[#ac8b6e]">0{index + 1}</span>{step}</div>)}</div></div>
          </aside>
        </div>
      )}
      <footer className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[#e9dfd6] pt-5 max-[600px]:justify-center max-[600px]:text-center"><span className="font-[Georgia,serif] text-[22px] tracking-[-0.7px] text-[#936b65]">MarryNest<span className="text-[#c6a384]">.</span></span><span className="text-[10px] tracking-wide text-[#b29e99]">For the day. For the memories. For you.</span><span className="inline-flex items-center gap-[6px] text-[10px] text-[#b29e99]"><ShieldCheck size={13} aria-hidden="true" /> Your celebration is in good company</span></footer>
    </main>
  );
}

export function CartCheckout() {
  const navigate = useNavigate(),
    [params, setParams] = useSearchParams(),
    [version, setVersion] = useState(0),
    state = useCustomerData("/cart", version),
    [addressId, setAddress] = useState(""),
    [preview, setPreview] = useState(null),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    changing = useRef(false),
    key = useRef(crypto.randomUUID()),
    adding = useRef(null);
  useEffect(() => {
    const serviceId = params.get("service");
    if (!serviceId || adding.current === serviceId) return;
    adding.current = serviceId;
    setBusy(true);
    customerRequest(`/services/${serviceId}`)
      .then((d) =>
        save("/cart/items", "PUT", {
          serviceId,
          quantity: d.service.offer?.sell?.minimum || 1,
        }),
      )
      .then(() => {
        setParams({}, { replace: true });
        setVersion((v) => v + 1);
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [params, setParams]);
  function reset() {
    setPreview(null);
    setAccepted(false);
    key.current = crypto.randomUUID();
  }
  async function mutate(path, method, body) {
    if (changing.current) return;
    changing.current = true;
    setBusy(true);
    setError("");
    reset();
    try {
      await save(path, method, body);
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      changing.current = false;
      setBusy(false);
    }
  }
  async function review(e) {
    e.preventDefault();
    if (changing.current || busy || state.loading || !addressId || blocked) return;
    setBusy(true);
    setError("");
    setPreview(null);
    setAccepted(false);
    try {
      setPreview(
        await save("/cart/preview", "POST", {
          addressId,
          idempotencyKey: key.current,
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!preview || !accepted || busy || state.loading) return;
    setBusy(true);
    setError("");
    try {
      const r = await save("/orders", "POST", {
        addressId,
        idempotencyKey: key.current,
        reviewToken: preview.reviewToken,
        termsAccepted: accepted,
      });
      navigate(`/customer/orders/${r.id}`);
    } catch (e) {
      setError(e.message);
      setPreview(null);
      setAccepted(false);
    } finally {
      setBusy(false);
    }
  }
  if (state.loading && !state.data) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  const lines = state.data.lines || [];
  const pending = busy || state.loading;
  const quantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
  const subtotal = state.data.subtotal ?? lines.reduce(
    (sum, line) => sum + Math.round(Number(line.price) * 100) * Number(line.quantity), 0,
  ) / 100;
  const blocked = lines.some((line) => line.unavailable) || !!state.data.checkoutError;
  return (
    <div className="mx-auto min-w-0 max-w-[1240px] pt-[6px] pb-9 text-[#463b3d] max-[520px]:pt-0 max-[520px]:pb-6 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#a67687] [&_:focus-visible]:outline-offset-[3px]">
      <Link className="inline-flex items-center gap-[7px] text-xs text-[#827477] hover:text-[#8c414e]!" to="/services">
        <ArrowLeft size={14} /> Continue shopping
      </Link>
      <header className="mt-[29px] mb-[25px] flex items-center justify-between gap-5 max-[520px]:mt-[22px] max-[520px]:flex-col max-[520px]:items-start max-[520px]:gap-4">
        <div>
          <span className="text-[9px] font-semibold tracking-[1.8px] text-[#a17c69] max-[520px]:text-[8px] max-[520px]:tracking-[1.2px]">A LITTLE CLOSER TO YOUR CELEBRATION</span>
          <h1 className="mt-[6px] mb-2 flex items-center gap-[13px] text-[38px]! max-[520px]:text-[32px]!">
            Your cart <span className="inline-grid h-7 min-w-7 place-items-center rounded-full border border-[#ead8db] bg-[#f7edef] px-[7px] font-[Inter,'Segoe_UI',sans-serif] text-xs leading-none font-medium tracking-normal text-[#8c414e]">{quantity}</span>
          </h1>
          <p className="m-0 text-[13px] text-[#827477]!">Everything you love, ready for your big day.</p>
        </div>
        <Link className="inline-flex shrink-0 items-center justify-center gap-[9px] rounded-[7px] border border-[#eae2de] bg-[#fffdfa] px-[15px] py-[10px] text-xs text-[#463b3d] hover:text-[#8c414e]!" to="/customer/orders">
          <ReceiptText size={16} /> My Orders <ArrowRight size={14} />
        </Link>
      </header>
      {!!lines.length && (
        <ol className="m-0 mb-[26px] flex list-none items-center justify-center gap-[30px] rounded-[9px] border border-[#eae2de] bg-[#f4eeeb] px-5 py-[17px] max-[520px]:justify-between max-[520px]:gap-2 max-[520px]:px-3 max-[520px]:py-[14px]" aria-label="Checkout progress">
          <li className="flex items-center gap-[9px] text-[11px] whitespace-nowrap text-[#8c414e] max-[520px]:flex-col max-[520px]:gap-[6px] max-[520px]:text-[9px]">
            <span className="grid size-[25px] place-items-center rounded-full border border-[#8c414e] bg-[#8c414e] text-[10px] text-white"><Check size={14} /></span>Your cart
          </li>
          <li className="flex items-center gap-[9px] text-[11px] whitespace-nowrap text-[#8c414e] before:mr-5 before:h-px before:w-12 before:bg-[#d9cbc8] before:content-[''] max-[520px]:flex-col max-[520px]:gap-[6px] max-[520px]:text-[9px] max-[520px]:before:hidden" aria-current={!addressId ? "step" : undefined}>
            <span className={`grid size-[25px] place-items-center rounded-full border border-[#8c414e] text-[10px] ${addressId ? "bg-[#8c414e] text-white" : "bg-[#fffdfa]"}`}>{addressId ? <Check size={14} /> : "2"}</span>Delivery details
          </li>
          <li className={`flex items-center gap-[9px] text-[11px] whitespace-nowrap before:mr-5 before:h-px before:w-12 before:bg-[#d9cbc8] before:content-[''] max-[520px]:flex-col max-[520px]:gap-[6px] max-[520px]:text-[9px] max-[520px]:before:hidden ${addressId ? "text-[#8c414e]" : "text-[#827477]"}`} aria-current={addressId ? "step" : undefined}>
            <span className={`grid size-[25px] place-items-center rounded-full border text-[10px] ${addressId ? "border-[#8c414e] bg-[#fffdfa]" : "border-[#d9cbc8]"}`}>3</span>Review & pay
          </li>
        </ol>
      )}
      {error && <p role="alert" className="my-3 rounded-lg bg-[#fff0eb] p-[13px] text-[13px] whitespace-pre-wrap text-[#994a42]!">{error}</p>}
      {state.data.checkoutError && <p role="alert" className="my-3 rounded-lg bg-[#fff0eb] p-[13px] text-[13px] whitespace-pre-wrap text-[#994a42]!">{state.data.checkoutError}</p>}
      {!lines.length ? (
        <section className="flex flex-col items-center gap-[15px] rounded-xl border border-[#eae2de] bg-[#fffdfa] px-6 py-16 text-center max-[520px]:px-[18px] max-[520px]:py-11">
          <span className="mb-[10px] grid size-[85px] place-items-center rounded-full bg-[#f6eaec] text-[#b2838d]"><ShoppingBag size={36} strokeWidth={1.3} /></span>
          <span className="text-[9px] font-semibold tracking-[1.8px] text-[#a17c69] max-[520px]:text-[8px] max-[520px]:tracking-[1.2px]">MAKE IT A CELEBRATION</span>
          <h2 className="m-0 text-[30px]!">Your cart is empty</h2>
          <p className="m-0 mb-2 max-w-[340px] text-[13px] text-[#827477]!">Discover the finishing touches for your celebration and keep your favourites here.</p>
          <Link className="inline-flex items-center justify-center gap-[7px] rounded-[7px] border border-[#8c414e] bg-[#8c414e] px-[18px] py-[11px] text-[13px] text-white hover:border-[#74333f] hover:bg-[#74333f] hover:text-white!" to="/services">Explore the marketplace <ArrowRight size={16} /></Link>
          <Link className="inline-flex items-center gap-[7px] text-xs text-[#827477] hover:text-[#8c414e]!" to="/customer/orders">Looking for a purchase? View your orders</Link>
        </section>
      ) : (
        <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(290px,1fr)] items-start gap-6 max-[1100px]:grid-cols-[minmax(0,1fr)]" aria-busy={pending}>
          <form id="cart-checkout" className="grid min-w-0 gap-[22px]" onSubmit={review}>
            <section className="min-w-0 rounded-xl border border-[#eae2de] bg-white shadow-[0_3px_18px_#51363e04]" aria-labelledby="cart-items-title">
              <header className="flex items-center justify-between gap-3 border-b border-[#f0e9e4] px-6 py-[21px] max-[520px]:gap-2 max-[520px]:px-4 max-[520px]:py-[18px]">
                <div className="flex min-w-0 items-center gap-[10px]"><ShoppingBag size={18} className="shrink-0 text-[#a57c85]" /><h2 id="cart-items-title" className="m-0 text-[22px]! tracking-[-.5px] max-[520px]:text-xl!">Your selection</h2></div>
                <span className="shrink-0 text-[10px] text-[#827477] max-[520px]:text-[9px]">{lines.length} {lines.length === 1 ? "product" : "products"}</span>
              </header>
              <ul className="m-0 list-none px-6 max-[520px]:px-4">
                {lines.map((line) => <CartItem key={line.id} line={line} disabled={pending}
                  onEdit={reset}
                  onUpdate={(quantity) => mutate("/cart/items", "PUT", { serviceId: line.id, quantity })}
                  onRemove={() => {
                    if (window.confirm(`Remove ${line.name} from your cart?`)) mutate(`/cart/items/${line.id}`, "DELETE");
                  }} />)}
              </ul>
              <footer className="flex items-center gap-2 rounded-b-xl border-t border-[#f0e9e4] bg-[#fdfaf7] px-6 py-[13px] text-[10px] text-[#827477] max-[520px]:px-4 max-[520px]:py-3"><Package size={15} className="shrink-0 text-[#b1967a]" /> Buying for your celebration? Check quantities before you review.</footer>
            </section>
            <section className="min-w-0 rounded-xl border border-[#eae2de] bg-white shadow-[0_3px_18px_#51363e04]" aria-labelledby="cart-delivery-title">
              <header className="flex items-center justify-between gap-3 border-b border-[#f0e9e4] px-6 py-[21px] max-[520px]:gap-2 max-[520px]:px-4 max-[520px]:py-[18px]">
                <div className="flex min-w-0 items-center gap-[10px]"><MapPin size={18} className="shrink-0 text-[#a57c85]" /><h2 id="cart-delivery-title" className="m-0 text-[22px]! tracking-[-.5px] max-[520px]:text-xl!">Delivery details</h2></div>
                <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] max-[520px]:text-[9px] ${addressId ? "text-[#55745c]" : "text-[#827477]"}`}>{addressId ? <><Check size={12} /> Address selected</> : "Required"}</span>
              </header>
              <div className="px-6 py-[23px] max-[520px]:px-4 max-[520px]:py-[19px]">
                <div className="mb-5 flex items-start gap-[11px] rounded-lg border border-[#f0e9e4] bg-[#fdfaf8] p-[14px]">
                  <UserRound size={18} className="mt-[3px] shrink-0 text-[#a57c85]" />
                  <div className="min-w-0"><span className="text-[10px] font-semibold">Customer details</span><CustomerLabel className="mt-1 mb-0 text-[11px]! text-[#827477]! [overflow-wrap:anywhere]" /></div>
                </div>
                <AddressPicker disabled={pending} className="flex flex-col gap-[10px] text-[11px]"
                  selectClassName="min-h-[45px] w-full min-w-0 rounded-[7px] border border-[#e5d9d9]! bg-white px-3 py-[11px] text-xs font-[inherit]"
                  linkClassName="self-start text-[11px] text-[#8c414e] underline underline-offset-[3px] hover:text-[#8c414e]!"
                  value={addressId} onChange={(v) => { setAddress(v); reset(); setError(""); }} />
                <p className="mt-[9px] mb-0 text-[10px]! text-[#827477]!">Choose a saved address, or add a new one in Manage addresses.</p>
              </div>
            </section>
          </form>
          <aside className="sticky top-[106px] min-w-0 rounded-xl border border-[#eae2de] bg-white shadow-[0_3px_18px_#51363e04] max-[1100px]:static" aria-labelledby="cart-summary-title">
            <header className="flex items-center gap-3 border-b border-[#f0e9e4] px-6 py-[21px] max-[520px]:gap-2 max-[520px]:px-4 max-[520px]:py-[18px]">
              <ReceiptText size={18} className="shrink-0 text-[#a57c85]" /><h2 id="cart-summary-title" className="m-0 text-[22px]! tracking-[-.5px] max-[520px]:text-xl!">Purchase summary</h2>
            </header>
            <div className="px-6 py-[23px] max-[520px]:px-4 max-[520px]:py-[19px]">
              <p className="m-0 mb-[17px] text-[11px]! text-[#827477]!">{quantity} {quantity === 1 ? "item" : "items"} for your celebration</p>
              <dl className="m-0">
                <div className="mb-[14px] flex items-baseline justify-between gap-[14px] text-xs"><dt className="text-[#78696e]">Items subtotal</dt><dd className="m-0 text-right font-medium whitespace-nowrap tabular-nums">{money(preview ? preview.subtotal : subtotal)}</dd></div>
                <div className="mb-[14px] flex items-baseline justify-between gap-[14px] text-xs"><dt className="text-[#78696e]">Delivery charges</dt><dd className="m-0 text-right font-medium whitespace-nowrap tabular-nums">{preview ? Number(preview.shipping) === 0 ? <span className="text-[#55745c]">Free</span> : money(preview.shipping) : <span className="text-[10px] font-normal text-[#827477]">At review</span>}</dd></div>
                <div className="mb-[14px] flex items-baseline justify-between gap-[14px] text-xs"><dt className="text-[#78696e]">Tax</dt><dd className="m-0 text-right font-medium whitespace-nowrap tabular-nums">{preview ? money(preview.tax) : <span className="text-[10px] font-normal text-[#827477]">At review</span>}</dd></div>
                {Number(preview?.discount) > 0 && <div className="mb-[14px] flex items-baseline justify-between gap-[14px] text-xs"><dt className="text-[#78696e]">Discount</dt><dd className="m-0 text-right font-medium whitespace-nowrap text-[#55745c] tabular-nums">-{money(preview.discount)}</dd></div>}
                <div className="mt-[22px] flex items-baseline justify-between gap-[14px] border-t border-[#eae2de] pt-[18px]"><dt className="text-sm font-semibold">{preview ? "Total to pay" : "Items total"}</dt><dd className="m-0 text-right text-[23px] font-semibold whitespace-nowrap text-[#8c414e] tabular-nums">{money(preview ? preview.total : subtotal)}</dd></div>
              </dl>
              {preview ? (
                <>
                  <div className="mt-5 flex gap-[10px] rounded-lg bg-[#faf4f2] p-[13px]">
                    <MapPin size={16} className="mt-[3px] shrink-0 text-[#8c414e]" />
                    <div><strong className="text-[11px] font-medium">Delivering to {preview.address.fullName}</strong><p className="mt-1 mb-0 text-[11px]! text-[#827477]! [overflow-wrap:anywhere]">{[preview.address.line1, preview.address.line2, preview.address.city, preview.address.state, preview.address.postalCode].filter(Boolean).join(", ")}</p></div>
                  </div>
                  <label className="my-5 flex items-start gap-2 text-[11px]">
                    <input type="checkbox" className="mt-[2px] size-4 shrink-0 accent-[#8c414e]" disabled={pending} checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                    I have reviewed the order and delivery details.
                  </label>
                  <button type="button" className="flex min-h-[46px] w-full items-center justify-center gap-[10px] rounded-[7px] border border-[#8c414e] bg-[#8c414e] px-[18px] py-[11px] text-xs font-medium text-white enabled:hover:border-[#74333f] enabled:hover:bg-[#74333f] disabled:cursor-not-allowed disabled:opacity-45" disabled={pending || !accepted || blocked} onClick={confirm}>
                    {busy ? "Creating order..." : "Continue to payment"} <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-3 mb-5 text-[10px]! text-[#827477]!">Delivery charges and tax will be confirmed when you review your order.</p>
                  <button className="flex min-h-[46px] w-full items-center justify-center gap-[10px] rounded-[7px] border border-[#8c414e] bg-[#8c414e] px-[18px] py-[11px] text-xs font-medium text-white enabled:hover:border-[#74333f] enabled:hover:bg-[#74333f] disabled:cursor-not-allowed disabled:opacity-45" type="submit" form="cart-checkout" disabled={pending || !addressId || blocked}>
                    {pending ? "Updating..." : "Review order"} <ArrowRight size={16} />
                  </button>
                  <p className="mt-[10px] mb-0 text-center text-[10px]! text-[#827477]!" role="status">{blocked ? "Update unavailable quantities or remove items to continue." : !addressId ? "Select a delivery address to continue." : "Ready to review your order and delivery details."}</p>
                </>
              )}
              <div className="mt-[22px] flex items-start gap-[10px] border-t border-[#f0e9e4] pt-4">
                <ShieldCheck size={18} className="mt-[2px] shrink-0 text-[#a17c69]" /><div><strong className="text-[11px] font-medium">Review before you pay</strong><p className="mt-1 mb-0 text-[10px]! text-[#827477]!">You can check your final total before continuing to payment.</p></div>
              </div>
              <p className="mt-[15px] mb-0 text-[10px]! text-[#827477]!">Service bookings are managed separately in <Link className="text-[#8c414e] underline underline-offset-2 hover:text-[#8c414e]!" to="/customer/bookings">My Bookings</Link>.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

async function payOrder(id, user) {
  await loadCheckout();
  const order = await save(`/orders/${id}/payment-order`, "POST", {});
  if (order.alreadyPaid) return order;
  return new Promise((resolve, reject) => {
    let verifying = false;
    const instance = new window.Razorpay({
      key: order.key,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "MarryNest",
      description: order.number,
      prefill: {
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        email: user.email,
        contact: user.phone || "",
      },
      theme: { color: "#355d43" },
      handler: async (result) => {
        verifying = true;
        try {
          resolve(
            await save("/order-payments/verify", "POST", {
              razorpay_order_id: result.razorpay_order_id,
              razorpay_payment_id: result.razorpay_payment_id,
              razorpay_signature: result.razorpay_signature,
            }),
          );
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () => {
          if (!verifying) resolve({ closed: true });
        },
      },
    });
    instance.on("payment.failed", () =>
      reject(
        new Error("Payment did not complete. Retry or check server status."),
      ),
    );
    instance.open();
  });
}
export function PurchaseOrder() {
  const { id } = useParams(),
    { user, notify } = useAuth(),
    navigate = useNavigate(),
    [version, setVersion] = useState(0),
    state = useCustomerData(`/orders/${id}`, version),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function action(pay) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = pay
        ? await payOrder(id, user)
        : await save(`/orders/${id}/payment-refresh`, "POST", {});
      const currentOrder = await customerRequest(`/orders/${id}`);
      if (currentOrder.paymentStatus === "Paid") {
        notify("Payment verified. Your purchase is confirmed.");
        navigate("/customer/orders", { replace: true });
        return;
      }
      setNotice(
        r.closed
          ? "Checkout closed. Check server status if money was deducted."
          : r.message || "Payment status checked.",
      );
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  const d = state.data;
  return (
    <main className="commerce commerce-page">
      <Link to="/customer/orders">← My Orders</Link>
      <h1>{d.number}</h1>
      {d.paymentStatus === "Paid" && (
        <p className="commerce-success" role="status">
          Payment verified. Your purchase is confirmed.
        </p>
      )}
      <p>
        {d.status} · Payment {d.paymentStatus}
      </p>
      <section className="commerce-panel">
        {d.lines.map((l, i) => (
          <div className="commerce-line" key={i}>
            <span>
              {l.name} × {l.quantity} · Selling Price {money(l.price)}
            </span>
            <span>{money(l.total)}</span>
          </div>
        ))}
        <Totals data={d} />
        <p>
          {d.address.fullName} · {d.address.line1} · {d.address.city}{" "}
          {d.address.postalCode}
        </p>
      </section>
      {error && (
        <p role="alert" className="commerce-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {d.paymentStatus !== "Paid" && (
        <div className="commerce-actions">
          <button
            className="primary"
            disabled={busy}
            onClick={() => action(true)}
          >
            Pay {money(d.total)}
          </button>
          <button disabled={busy} onClick={() => action(false)}>
            Check server status
          </button>
        </div>
      )}
    </main>
  );
}
export function MyOrders() {
  const state = useCustomerData("/orders");
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  return (
    <main className="commerce commerce-page">
      <h1>My Orders</h1>
      <Link to="/customer/cart">View cart</Link>
      {state.data.length ? (
        <section className="commerce-panel">
          {state.data.map((o) => (
            <div className="commerce-line" key={o.id}>
              <Link to={`/customer/orders/${o.id}`}>{o.number}</Link>
              <span>
                {o.status} · {o.paymentStatus} · {money(o.total)}
              </span>
            </div>
          ))}
        </section>
      ) : (
        <section className="commerce-panel">
          <p>No purchases yet.</p>
          <Link to="/services">Explore products</Link>
        </section>
      )}
    </main>
  );
}
