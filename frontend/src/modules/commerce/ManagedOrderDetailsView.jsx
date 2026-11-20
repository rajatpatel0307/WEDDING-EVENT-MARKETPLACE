import { Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, CreditCard, Mail, MapPin, Package,
  Phone, ReceiptText, RefreshCw, ShoppingBag, UserRound,
} from "lucide-react";
import { safeImage } from "../../services/public";
import OrderTracking, { OrderStatusBadge } from "./OrderTracking";
import { orderTime } from "./order-status";

const panel = "overflow-hidden rounded-xl border border-[#e1e8e1] bg-white shadow-[0_3px_12px_#2d493503]";
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
const action = "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#dde6df] bg-white px-3 text-[11px] font-medium text-[#64816c] transition-colors hover:border-[#a8c5b0] hover:bg-[#f5f9f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60]";

function SectionHeading({ icon: Icon, title, children }) {
  return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ecf0e8] px-5 py-3.5">
    <div className="flex items-center gap-2.5"><span className="grid size-7 place-items-center rounded-lg bg-[#f1f5ed] text-[#88a17e]"><Icon size={14} strokeWidth={1.6} aria-hidden="true" /></span><h2 className="m-0! font-sans! text-[13px]! font-semibold! text-[#4a684c]!">{title}</h2></div>{children}
  </header>;
}

export default function ManagedOrderDetailsView({ role, data, error, onRefresh, statusControl }) {
  const address = data.address || {};
  const customer = data.customer || {};
  const lines = data.lines || [];
  const quantity = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const paid = data.paymentStatus === "Paid";
  const info = [
    ["Order ID", <span key="reference" className="font-medium tracking-[.2px] text-[#377864]">{data.number}</span>],
    ["Order date", orderTime(data.createdAt)],
    ["Payment method", data.paymentMethod || "Not paid"],
    ["Payment status", <OrderStatusBadge key="payment" status={data.paymentStatus} />],
    ["Last status update", orderTime(data.statusUpdatedAt)],
    [data.vendorScoped ? "Your order total" : "Total order amount", <span key="total" className="text-[15px] font-semibold tabular-nums text-[#476f44]">{money(data.total)}</span>],
  ];

  return <div className="min-w-0 text-[#45634e]">
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-[10px] text-[#9ca99a]">
      <Link className="inline-flex items-center gap-1.5 text-[#6d8b70] hover:text-[#176b60]" to={`/${role.toLowerCase()}/orders`}><ArrowLeft size={12} aria-hidden="true" />All orders</Link><ChevronRight size={11} aria-hidden="true" /><span>Order details</span>
    </nav>
    <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#d7e6d9] bg-[#edf4e9] text-[#699363]"><ShoppingBag size={22} strokeWidth={1.5} aria-hidden="true" /></span>
        <div><p className="m-0! mb-1! text-[9px]! font-medium! tracking-[1.4px]! text-[#7b8e70]!">ORDER DETAILS</p><h1 className="m-0! font-sans! text-[25px]! leading-tight! font-semibold! tracking-[-.5px]! text-[#355b3c]!">{data.number}</h1><p className="m-0! mt-1.5! text-[10px]! text-[#7e8e73]!">Placed {orderTime(data.createdAt)}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-3"><OrderStatusBadge status={data.status} /><button type="button" className={action} onClick={onRefresh}><RefreshCw size={13} aria-hidden="true" />Refresh</button></div>
    </header>

    {error && <div role="alert" className="mb-4 rounded-lg border border-[#edd7d1] bg-[#fff8f4] p-4 text-[12px] text-[#a66e60]">{error.message}<button type="button" className="ml-3 underline" onClick={onRefresh}>Try again</button></div>}

    <div className="grid min-w-0 items-start gap-5 [@media(width>=1100px)]:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 gap-5">
        <section className={panel}>
          <SectionHeading icon={ReceiptText} title="Order information"><span className="text-[9px] text-[#9aaa94]">{quantity} {quantity === 1 ? "item" : "items"}</span></SectionHeading>
          <dl className="m-0! grid grid-cols-2 gap-x-5 gap-y-5 px-5 py-5 sm:grid-cols-3">{info.map(([label, value]) => <div key={label} className="min-w-0"><dt className="mb-1.5 text-[10px] text-[#7b8e70]">{label}</dt><dd className="m-0! text-[11px] leading-relaxed text-[#648263] [overflow-wrap:anywhere]">{value}</dd></div>)}</dl>
        </section>

        <section className={panel}>
          <SectionHeading icon={UserRound} title="Customer & delivery" />
          <div className="grid gap-5 p-5 [@media(width>=650px)]:grid-cols-2">
            <div className="min-w-0">
              <p className="m-0! mb-3! text-[9px]! font-medium! tracking-[.8px]! text-[#809474]! uppercase">Customer details</p>
              <div className="mb-4 flex items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e0e8d7] bg-[#f2f6ea] text-[13px] font-medium text-[#91a779]" aria-hidden="true">{customer.name?.trim().charAt(0).toUpperCase() || "C"}</span><p className="m-0! font-sans! text-[13px]! font-medium! text-[#617e57]!">{customer.name || "Customer"}</p></div>
              <div className="grid gap-2.5 text-[11px] text-[#708960]">
                {customer.phone && <a href={`tel:${customer.phone}`} className="inline-flex w-fit items-center gap-2.5 hover:text-[#397343]"><Phone size={13} className="shrink-0 text-[#a0b291]" aria-hidden="true" />{customer.phone}</a>}
                {customer.email && <a href={`mailto:${customer.email}`} className="inline-flex min-w-0 items-start gap-2.5 hover:text-[#397343]"><Mail size={13} className="mt-0.5 shrink-0 text-[#a0b291]" aria-hidden="true" /><span className="break-all">{customer.email}</span></a>}
              </div>
            </div>
            <div className="min-w-0 border-t border-[#edf0e5] pt-4 [@media(width>=650px)]:border-t-0 [@media(width>=650px)]:border-l [@media(width>=650px)]:pt-0 [@media(width>=650px)]:pl-5">
              <p className="m-0! mb-3! inline-flex items-center gap-1.5 text-[9px]! font-medium! tracking-[.8px]! text-[#809474]! uppercase"><MapPin size={12} aria-hidden="true" />Delivery address</p>
              <address className="text-[11px] leading-[1.9] text-[#6a805c] not-italic [overflow-wrap:anywhere]">
                {address.fullName && <span className="mb-1 block font-medium text-[#627e54]">{address.fullName}</span>}
                {address.line1 && <span className="block">{address.line1}</span>}{address.line2 && <span className="block">{address.line2}</span>}
                <span className="block">{[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}</span>{address.country && <span className="block">{address.country}</span>}
                {address.phone && <a className="mt-2 inline-flex items-center gap-2 hover:text-[#397343]" href={`tel:${address.phone}`}><Phone size={11} aria-hidden="true" />Delivery contact: {address.phone}</a>}
              </address>
            </div>
          </div>
        </section>

        <section className={panel}>
          <SectionHeading icon={Package} title="Products & services"><span className="rounded-md border border-[#e3e9db] bg-[#f6f9f1] px-2 py-1 text-[9px] text-[#90a27e]">{lines.length} {lines.length === 1 ? "product" : "products"}</span></SectionHeading>
          <div className="divide-y divide-[#ecf0e6] px-5">{lines.map(line => <article key={line.id} className="flex flex-wrap gap-4 py-5">
            <div className="relative grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-xl border border-[#e0e8d8] bg-[#f5f8ef]"><Package size={26} className="absolute text-[#a8ba95]" strokeWidth={1.4} aria-hidden="true" />{safeImage(line.image) && <img src={safeImage(line.image)} alt={line.name} className="relative size-full bg-[#f5f8ef] object-cover" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />}</div>
            <div className="min-w-[140px] flex-1"><h3 className="m-0! font-sans! text-[13px]! font-medium! text-[#59764e]!">{line.name}</h3><p className="m-0! mt-1! text-[10px]! text-[#859a75]!">{line.vendor}</p><p className="m-0! mt-2! text-[11px]! leading-relaxed! text-[#75886a]!">{line.description || "Description unavailable for this item."}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-[#7d916d]"><span>Quantity <strong className="ml-1 font-medium text-[#789366]">{line.quantity}</strong></span><span>Unit price <strong className="ml-1 font-medium text-[#789366]">{money(line.price)}</strong></span><span>Subtotal <strong className="ml-1 font-medium text-[#789366]">{money(line.price * line.quantity)}</strong></span></div>
            </div>
            <div className="ml-auto text-right"><strong className="mb-2.5 block text-[14px] font-semibold tabular-nums text-[#547c45]">{money(line.total)}</strong><OrderStatusBadge status={line.status} /></div>
          </article>)}</div>
        </section>

        <div className="[&>section]:m-0! [&>section]:border-[#e1e8e1]! [&>section]:p-5! [&_h2]:font-sans! [&_h2]:text-[13px]! [&_h2]:font-semibold!"><OrderTracking data={data} /></div>
      </div>

      <aside className="grid min-w-0 gap-5 [@media(width>=1100px)]:sticky [@media(width>=1100px)]:top-[110px]" aria-label="Order actions and totals">
        {statusControl}
        <section className={panel}>
          <SectionHeading icon={CreditCard} title="Price summary" />
          <dl className="m-0! grid gap-3.5 px-5 py-5 text-[11px]">{[["Products / services", data.subtotal], ["Delivery charges", data.shipping], ["Tax", data.tax], ["Discount", -Number(data.discount || 0)]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3"><dt className="text-[#7b8e70]">{label}</dt><dd className="m-0! tabular-nums text-[#769266]">{money(value)}</dd></div>)}</dl>
          <div className="mx-4 mb-4 rounded-lg border border-[#dce8d4] bg-[#f0f6e9] px-3.5 py-3.5"><div className="flex items-center justify-between gap-3"><span className="text-[11px] font-medium text-[#6d885d]">Final total</span><strong className="text-[20px] font-semibold tracking-[-.5px] tabular-nums text-[#4e773e]">{money(data.total)}</strong></div><p className="m-0! mt-1.5! text-[9px]! text-[#7e9866]!">{paid ? "Payment received" : "Payment has not been received"}</p></div>
          {data.vendorScoped && <p className="m-0! border-t border-[#ecf0e6] px-5 py-3 text-[9px]! leading-relaxed! text-[#889a76]!">Amounts shown cover only the items fulfilled by your business.</p>}
        </section>
      </aside>
    </div>
  </div>;
}
