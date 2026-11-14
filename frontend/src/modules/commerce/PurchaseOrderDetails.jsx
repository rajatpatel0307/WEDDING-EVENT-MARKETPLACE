import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, CheckCheck, Clock3, Heart, LoaderCircle,
  LockKeyhole, MapPin, Package, Phone, ReceiptText, RefreshCw, ShieldCheck, ShoppingBag,
} from "lucide-react";
import { money } from "../customer/services/workspace.api";

function Status({ value, payment = false, compact = false, className = "" }) {
  const labels = { AwaitingPayment: "Awaiting payment", PaymentPending: "Payment pending", PartiallyPaid: "Partially paid", InProgress: "In progress" };
  const positive = ["Paid", "Confirmed", "Completed", "Delivered", "Success"].includes(value);
  const closed = ["Cancelled", "Refunded", "Failed", "Rejected", "Expired"].includes(value);
  const Icon = positive ? Check : Clock3;
  const label = labels[value] || value || "Not available";
  return <span className={`inline-flex items-center gap-[5px] rounded-md border font-medium leading-[1.4] ${compact ? "mt-[5px] px-[7px] py-[3px] text-[9px]" : "px-[9px] py-[5px] text-[10px]"} ${positive ? "border-[#dbe5d0] bg-[#eff5e9] text-[#718b55]" : closed ? "border-[#e8d8d1] bg-[#fbf1ec] text-[#a17d6b]" : "border-[#e8d9b5] bg-[#fff7e6] text-[#9a7b33]"} ${className}`} aria-label={`${payment ? "Payment" : "Order"} status: ${label}`}><Icon size={12} aria-hidden="true" />{label}</span>;
}

function CardHeading({ id, eyebrow, title, children }) {
  return <header className="flex items-center justify-between gap-[15px] border-b border-[#eee5dd] px-[25px] py-[23px] text-[#b29682] max-[1150px]:p-[21px] max-[600px]:p-5">
    <div><p className="text-[8px]! font-medium tracking-[1.4px] text-[#a18066]! max-[600px]:text-[7px]! max-[600px]:tracking-[1.1px]">{eyebrow}</p><h2 id={id} className="mt-[5px]! font-serif! text-[25px]! font-normal! leading-[1.3]! tracking-[-.5px]! text-[#49363e]! max-[600px]:text-[24px]!">{title}</h2></div>{children}
  </header>;
}

export default function PurchaseOrderDetails({ data, busy, error, notice, onPay, onRefresh }) {
  const paid = data.paymentStatus === "Paid";
  const address = data.address || {};
  const lines = data.lines || [];
  const addressLines = [address.line1, address.line2, [address.city, address.state, address.postalCode].filter(Boolean).join(", "), address.country].filter(Boolean);
  const quantity = lines.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return <div className="mx-auto w-full min-w-0 max-w-[1360px] font-[Inter,'Segoe_UI',sans-serif] text-[13px] leading-[1.7] text-[#49363e] [&_svg]:shrink-0 [&_button]:cursor-pointer [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-55 [&_a]:no-underline">
    <nav className="mb-[25px] flex flex-wrap items-center gap-3 text-[11px] text-[#a08d8c] max-[600px]:mb-[23px] max-[600px]:text-[10px]" aria-label="Breadcrumb"><Link className="inline-flex items-center gap-2 text-[#916173] hover:text-[#873f52] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52]" to="/customer/orders"><ArrowLeft size={15} aria-hidden="true" /> My Orders</Link><span className="text-[#c5b6ac]" aria-hidden="true">/</span><span>Order details</span></nav>
    <header className="mb-7 flex items-center justify-between gap-5 max-[600px]:items-start max-[600px]:gap-[13px]">
      <div><p className="flex items-center gap-2 text-[9px]! font-medium tracking-[1.6px] text-[#a18066]! max-[600px]:text-[7px]! max-[600px]:tracking-[1.1px]"><span className="size-[5px] rounded-full bg-[#b48b62]" /> YOUR CELEBRATION, THOUGHTFULLY CURATED</p><h1 className="mt-[7px]! mb-[10px]! font-serif! text-[42px]! font-normal! leading-[1.2]! tracking-[-1.5px]! text-[#49363e]! max-[600px]:text-[35px]!">Order details<span className="text-[#b89573]">.</span></h1><p className="text-[12px]! text-[#8b7880]! max-[600px]:text-[11px]!">Your selections, payment, and delivery details in one place.</p></div>
      <Link className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-[9px] rounded-[7px] border border-[#e3d2d8] bg-white px-4 py-[11px] text-[11px] font-medium leading-[1.5] text-[#996377] transition-colors hover:border-[#cda8b6] hover:bg-[#fcf4f6] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52] motion-reduce:transition-none max-[600px]:min-h-9 max-[600px]:px-[9px] max-[600px]:py-2 max-[600px]:text-[9px] max-[600px]:[&_svg]:w-3" to="/customer/orders">All orders <ArrowRight size={15} aria-hidden="true" /></Link>
    </header>

    <section className="mb-[25px] overflow-hidden rounded-[13px] border border-[#e9ded3] bg-[linear-gradient(110deg,#fffdfa,#f7f0e7)]" aria-labelledby="pod-reference-title">
      <div className="flex items-center justify-between gap-5 px-7 py-[25px] max-[600px]:flex-wrap max-[600px]:gap-[15px] max-[600px]:p-5">
        <div className="flex min-w-0 items-center gap-[15px] max-[600px]:gap-[11px]"><span className="grid h-14 w-[52px] shrink-0 place-items-center rounded-[11px] border border-[#e5d2ba] bg-[#f2e6d5] text-[#aa8760] max-[600px]:h-[45px] max-[600px]:w-10 max-[600px]:rounded-[9px] max-[600px]:[&_svg]:w-[21px]"><ShoppingBag size={25} strokeWidth={1.3} aria-hidden="true" /></span><div><p className="text-[9px]! font-medium tracking-[1.1px] text-[#a18a7c]! max-[600px]:text-[8px]!">ORDER REFERENCE</p><h2 id="pod-reference-title" className="mt-[5px]! font-serif! text-[clamp(20px,2vw,28px)]! font-normal! leading-[1.3]! tracking-[-.5px]! wrap-anywhere text-[#71534f]! max-[600px]:text-[19px]!">{data.number}</h2></div></div>
        <Status value={data.status} className="shrink-0 max-[600px]:ml-[51px]" />
      </div>
      <div className="grid grid-cols-3 gap-[22px] border-t border-[#eadfd3] bg-[#ffffff80] px-7 py-[21px] max-[600px]:grid-cols-2 max-[600px]:gap-x-3 max-[600px]:gap-y-[19px] max-[600px]:p-5">
        <div className="flex items-center gap-[11px] text-[#b19477] max-[600px]:gap-2"><Package size={18} strokeWidth={1.4} aria-hidden="true" /><div><span className="block text-[9px] font-medium tracking-[1.1px] text-[#a18a7c] max-[600px]:text-[8px]">YOUR SELECTION</span><strong className="mt-[5px] block text-[12px] font-medium text-[#7b605e] max-[600px]:text-[11px]">{quantity} {quantity === 1 ? "item" : "items"} · {lines.length} {lines.length === 1 ? "product" : "products"}</strong></div></div>
        <div className="flex items-center gap-[11px] border-l border-[#e7dbcf] pl-[26px] text-[#b19477] max-[600px]:gap-2 max-[600px]:pl-[14px]"><ReceiptText size={18} strokeWidth={1.4} aria-hidden="true" /><div><span className="block text-[9px] font-medium tracking-[1.1px] text-[#a18a7c] max-[600px]:text-[8px]">ORDER TOTAL</span><strong className="mt-[5px] block text-[12px] font-medium text-[#7b605e] max-[600px]:text-[11px]">{money(data.total)}</strong></div></div>
        <div className="flex items-center gap-[11px] border-l border-[#e7dbcf] pl-[26px] text-[#b19477] max-[600px]:col-span-full max-[600px]:gap-2 max-[600px]:border-t max-[600px]:border-l-0 max-[600px]:pt-[15px] max-[600px]:pl-0"><ShieldCheck size={18} strokeWidth={1.4} aria-hidden="true" /><div><span className="block text-[9px] font-medium tracking-[1.1px] text-[#a18a7c] max-[600px]:text-[8px]">PAYMENT STATUS</span><Status value={data.paymentStatus} payment compact /></div></div>
      </div>
    </section>

    {paid && <div className="mb-[22px] flex items-start gap-[11px] rounded-[9px] border border-[#dce6d3] bg-[#f4f8ee] px-[19px] py-4 text-[12px] text-[#80976b]" role="status"><CheckCheck size={18} aria-hidden="true" /><div><strong className="text-[12px] font-medium">Payment received</strong><p className="mt-[3px] text-[11px]! text-[#97a78a]!">Payment verified. Your purchase is confirmed.</p></div></div>}
    {error && <div className="mb-[22px] flex items-start gap-[11px] rounded-[9px] border border-[#eacbd0] bg-[#fff4f4] px-[19px] py-4 text-[12px] text-[#a14a5c]" role="alert">{error}</div>}
    {notice && <div className="mb-[22px] flex items-start gap-[11px] rounded-[9px] border border-[#e8dcd0] bg-[#fffbf3] px-[19px] py-4 text-[12px] text-[#a18c63]" role="status"><Clock3 size={17} aria-hidden="true" /><p className="text-[#a18c63]!">{notice}</p></div>}

    <div className="grid grid-cols-[minmax(0,1fr)_350px] items-start gap-6 min-[1450px]:grid-cols-[minmax(0,1fr)_375px] min-[1450px]:gap-7 max-[1150px]:grid-cols-[minmax(0,1fr)_310px] max-[1150px]:gap-[19px] [@media(801px<=width<=1050px)]:grid-cols-[minmax(0,1fr)] max-[750px]:grid-cols-[minmax(0,1fr)]">
      <div className="grid min-w-0 gap-[22px] [@media(801px<=width<=1050px)]:contents max-[750px]:contents">
        <section className="min-w-0 overflow-hidden rounded-xl border border-[#ece2dc] bg-white shadow-[0_4px_18px_#593f3503] [@media(801px<=width<=1050px)]:order-1 max-[750px]:order-1" aria-labelledby="pod-items-title">
          <CardHeading id="pod-items-title" eyebrow="CHOSEN WITH LOVE" title="Your order items"><span className="rounded-[5px] border border-[#e9ded2] bg-[#faf6f0] px-2 py-1 text-[9px] whitespace-nowrap text-[#a08772]">{lines.length} {lines.length === 1 ? "product" : "products"}</span></CardHeading>
          <div className="max-w-full overflow-x-auto [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-3 focus-visible:outline-[#873f52]" role="region" aria-label="Order items" tabIndex={0}>
            <table className="w-full min-w-[510px] border-collapse text-left [&_thead_th]:bg-[#fcf9f5]! [&_thead_th]:px-[23px]! [&_thead_th]:py-[13px]! [&_thead_th]:text-[9px]! [&_thead_th]:font-medium! [&_thead_th]:tracking-[.7px]! [&_thead_th]:whitespace-nowrap [&_thead_th]:text-[#ac9382]! [&_tbody_th]:bg-white! [&_tbody_th]:tracking-normal! [&_tbody_th]:whitespace-normal! [&_tbody_th]:font-normal! [&_tbody_th]:text-left! [&_tbody_:is(th,td)]:max-w-none! [&_tbody_:is(th,td)]:border-t! [&_tbody_:is(th,td)]:border-[#eee5dd]! [&_tbody_:is(th,td)]:px-[23px]! [&_tbody_:is(th,td)]:py-6! [&_tbody_:is(th,td)]:align-middle! [&_tbody_:is(th,td)]:text-[12px]! [&_tbody_td]:text-right! [&_tbody_td]:whitespace-nowrap [&_tbody_td]:text-[#8c717b]! max-[1150px]:[&_thead_th]:px-[17px]! max-[1150px]:[&_tbody_:is(th,td)]:px-[17px]!">
              <caption className="sr-only">Products, quantities, unit prices and totals for this order</caption>
              <thead><tr><th scope="col" className="text-left!">Product</th><th scope="col" className="text-center!">Quantity</th><th scope="col" className="text-right!">Unit price</th><th scope="col" className="text-right!">Total</th></tr></thead>
              <tbody>{lines.map((item, index) => <tr key={index}>
                <th scope="row"><div className="flex min-w-[145px] items-center gap-[11px]"><span className="grid h-[43px] w-[39px] shrink-0 place-items-center rounded-lg border border-[#ead6de] bg-[#faedf2] text-[#b08496]"><Package size={21} strokeWidth={1.3} aria-hidden="true" /></span><div className="text-[13px] font-medium wrap-anywhere text-[#7e5667]">{item.name}</div></div></th>
                <td className="[&&]:text-center!"><span className="inline-flex min-w-7 items-center justify-center rounded-[5px] border border-[#e9ded6] bg-[#fcf8f4] px-[7px] py-[3px] text-[11px] text-[#a08370]">{Number(item.quantity)}</span></td>
                <td>{money(item.price)}</td><td className="font-medium [&&]:text-[#92566d]!">{money(item.total)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <footer className="flex items-center gap-[7px] border-t border-[#eee5dd] bg-[#fdfbf8] px-6 py-[13px] text-[9px] text-[#ae9787]"><ReceiptText size={14} aria-hidden="true" /> A complete breakdown of your selected products</footer>
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-[#ece2dc] bg-white shadow-[0_4px_18px_#593f3503] [@media(801px<=width<=1050px)]:order-3 max-[750px]:order-3" aria-labelledby="pod-address-title">
          <CardHeading id="pod-address-title" eyebrow="THE DETAILS THAT BRING IT HOME" title="Delivery address"><MapPin size={20} strokeWidth={1.4} aria-hidden="true" /></CardHeading>
          <div className="flex items-start gap-4 px-[26px] py-6 max-[600px]:gap-[13px] max-[600px]:px-5 max-[600px]:py-[22px]"><span className="grid h-11 w-[42px] shrink-0 place-items-center rounded-[9px] border border-[#e2e6d8] bg-[#f4f6ee] text-[#9aa782]"><MapPin size={22} strokeWidth={1.3} aria-hidden="true" /></span><address className="min-w-0 text-[12px] leading-[1.9] wrap-anywhere text-[#998389] not-italic">
            {address.fullName && <strong className="mb-[7px] block text-[14px] font-medium text-[#7c5665]">{address.fullName}</strong>}
            {addressLines.length ? addressLines.map((line, index) => <span className="block" key={index}>{line}</span>) : <span className="block">No delivery address is available for this order.</span>}
            {address.phone && <span className="mt-3 flex items-center gap-[7px] text-[11px] text-[#9a7e87]"><Phone size={13} aria-hidden="true" />{address.phone}</span>}
          </address></div>
          <footer className="mx-[25px] border-t border-dashed border-[#ebe0d6] py-[13px] text-[9px] text-[#b09a89] max-[600px]:mx-5">Address saved with this order</footer>
        </section>
      </div>

      <aside className="grid min-w-0 gap-[22px] [@media(801px<=width<=1050px)]:order-2 max-[750px]:order-2" aria-label="Order payment summary">
        <section className="min-w-0 overflow-hidden rounded-xl border border-[#ece2dc] bg-white shadow-[0_4px_18px_#593f3503]">
          <header className="flex items-center gap-[9px] border-b border-[#eaded9] bg-[#fbf3f1] px-[23px] py-[18px] text-[#ad817d]"><ReceiptText size={18} aria-hidden="true" /><h2 className="m-0! flex-1 font-serif! text-[22px]! font-normal! leading-[1.4]! tracking-[-.3px]! text-[#815160]!">Order summary</h2><LockKeyhole size={14} className="text-[#baa59b]" aria-hidden="true" /></header>
          <div className="p-6 max-[1150px]:p-[22px]">
            <p className="text-[8px]! font-medium tracking-[1.5px] text-[#a18a7c]!">TOTAL ORDER VALUE</p><p className="mt-[5px] mb-[14px] font-serif text-[39px]! leading-[1.25]! tracking-[-1.2px] wrap-anywhere text-[#8b4c62]!">{money(data.total)}</p>
            <div className="flex items-center justify-between gap-3 text-[10px] text-[#a08790]"><span>Payment status</span><Status value={data.paymentStatus} payment /></div>
            <dl className="mt-[22px]! mb-0! grid grid-cols-[minmax(0,1fr)]! gap-[15px]! border-t border-[#eee4dc] pt-[21px] text-[12px]! [&_>_div]:flex [&_>_div]:items-baseline [&_>_div]:justify-between [&_>_div]:gap-[14px] [&_dt]:text-[#a0878c]! [&_dd]:m-0! [&_dd]:text-right [&_dd]:text-[#866572]! [&_dd]:tabular-nums">
              <div><dt>Subtotal</dt><dd>{money(data.subtotal)}</dd></div>{data.shipping != null && <div><dt>Delivery charges</dt><dd>{money(data.shipping)}</dd></div>}<div><dt>Tax</dt><dd>{money(data.tax)}</dd></div><div className="mt-[3px] border-t border-dashed border-[#e7d9d2] pt-4 font-semibold [&&_dt]:text-[#78525f]! [&&_dd]:text-[#78525f]!"><dt>Total amount</dt><dd>{money(data.total)}</dd></div>
            </dl>
            {paid ? <div className="mt-6 flex items-start gap-[10px] rounded-lg border border-[#dfe8d5] bg-[#f5f9ef] p-[15px] text-[#8b9f76]"><CheckCheck size={18} aria-hidden="true" /><div><strong className="block text-[12px] font-medium text-[#78915f]">Paid in full</strong><p className="mt-[3px] text-[10px]! text-[#8b9f76]!">Your payment has been verified.</p></div></div> : <div className="mt-6 grid gap-[11px]">
              <button type="button" className="inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-[7px] border border-[#873f52] bg-[#873f52] px-4 py-[11px] text-center text-[11px] font-medium leading-[1.5] text-white shadow-[0_4px_12px_#74314712] transition-[background,box-shadow] duration-180 enabled:hover:border-[#723247] enabled:hover:bg-[#723247] enabled:hover:shadow-[0_5px_18px_#74314722] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52] motion-reduce:transition-none" disabled={busy} onClick={onPay}>{busy ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}{busy ? "Please wait…" : `Pay ${money(data.total)}`}<ArrowRight size={16} aria-hidden="true" /></button>
              <button type="button" className="inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-[7px] border border-[#e3d2d8] bg-white px-4 py-[11px] text-center text-[11px] font-medium leading-[1.5] text-[#996377] transition-[background,box-shadow] duration-180 enabled:hover:border-[#cda8b6] enabled:hover:bg-[#fcf4f6] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52] motion-reduce:transition-none" disabled={busy} onClick={onRefresh}><RefreshCw size={14} aria-hidden="true" /> Refresh payment status</button>
              <p className="text-center text-[9px]! leading-[1.8]! text-[#ad9295]!">Already paid? Refresh your payment status to check for confirmation.</p>
            </div>}
          </div>
          <footer className="flex items-center justify-center gap-[7px] border-t border-[#eee5dc] bg-[#fdfaf6] px-[18px] py-[13px] text-[9px] text-[#aa9684]"><ShieldCheck size={15} aria-hidden="true" /> Checkout powered by Razorpay</footer>
        </section>
        <div className="flex items-start gap-3 rounded-[10px] border border-[#e9dfcf] bg-[#f9f3e9] p-[19px]"><span className="text-[#b59b72]"><ShieldCheck size={19} strokeWidth={1.4} aria-hidden="true" /></span><div><strong className="text-[11px] font-medium text-[#a08260]">{paid ? "One more detail taken care of" : "A little closer to your celebration"}</strong><p className="mt-[6px] text-[10px]! leading-[1.9]! text-[#ad9784]!">{paid ? "Keep your order reference handy for any questions about your purchase." : "Review your order details, then continue to checkout when you’re ready."}</p></div></div>
      </aside>
    </div>
    <footer className="mt-[30px] flex items-center justify-between gap-[15px] border-t border-[#e8ded5] pt-5 pb-[6px] text-[#b29c8d] max-[600px]:flex-wrap max-[600px]:justify-center"><span className="font-serif text-[22px] leading-[1.4] tracking-[-.7px] text-[#96726c]">MarryNest<span className="text-[#c3a27a]">.</span></span><p className="text-[9px]! text-[#b29c8d]!">For the day. For the memories. For you.</p><Heart size={14} strokeWidth={1.4} aria-hidden="true" /></footer>
  </div>;
}
