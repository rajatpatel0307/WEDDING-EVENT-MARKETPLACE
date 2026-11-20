import { Check, Clock3, Package, Truck, XCircle } from "lucide-react";
import { orderStages, orderStatusLabels, orderTime } from "./order-status";

export function OrderStatusBadge({ status }) {
  const tone = ["Delivered", "Paid"].includes(status) ? "border-[#cfe3d7] bg-[#eef8f1] text-[#36745a]" : ["Cancelled", "Failed"].includes(status) ? "border-[#eed1d1] bg-[#fff3f2] text-[#a65353]" : ["Shipped", "OutForDelivery"].includes(status) ? "border-[#cfdfee] bg-[#f0f6fc] text-[#4c729b]" : "border-[#eadfbd] bg-[#fcf8ec] text-[#977b37]";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium ${tone}`}>{orderStatusLabels[status] || status}</span>;
}

export default function OrderTracking({ data }) {
  const history = data.history || [];
  const fulfillments = data.fulfillments?.length ? data.fulfillments : [{ vendorId: null, vendor: "Order progress", status: data.status }];
  const captions = { Pending: "Order received", Processing: "Vendor is preparing your order", Shipped: "Your order has been dispatched", OutForDelivery: "Your order is on its way to your address", Delivered: "Order successfully delivered" };
  return <section className="my-6 rounded-xl border border-[#e6e3dc] bg-white p-5 sm:p-6" aria-label="Order tracking">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0! text-[18px]! font-semibold!">Order tracking</h2><p className="mt-1 text-[11px]! text-[#839086]!">Latest update: {orderTime(data.statusUpdatedAt)}</p></div><OrderStatusBadge status={data.status} /></div>
    <div className="grid gap-5">{fulfillments.map(group => {
      const stage = orderStages.indexOf(group.status);
      return <div key={group.vendorId || "order"}>
        <p className="mb-3 text-[12px]! font-medium text-[#5e7468]!">{group.vendor}</p>
        {group.status === "Cancelled" ? <div className="flex items-center gap-3 rounded-lg bg-[#fff4f2] p-4 text-sm text-[#a65353]"><XCircle size={19} />This fulfillment has been cancelled.</div> : <ol className="grid gap-4 sm:grid-cols-5">{orderStages.map((status, index) => {
          const completed = index <= stage;
          const entry = history.filter(item => item.status === status && (!group.vendorId || item.vendorId === group.vendorId)).at(-1);
          const Icon = status === "Pending" ? Package : ["Shipped", "OutForDelivery"].includes(status) ? Truck : status === "Delivered" ? Check : Clock3;
          return <li key={status} aria-current={index === stage ? "step" : undefined} className={`border-t-2 pt-3 ${completed ? "border-[#568c73]" : "border-[#e5eae6]"}`}>
            <div className={`mb-2 flex items-center gap-2 text-[12px] font-medium ${completed ? "text-[#36745a]" : "text-[#98a69d]"}`}><Icon size={16} />{orderStatusLabels[status]}</div>
            <p className="text-[11px]! text-[#839086]!">{captions[status]}</p>{entry && <time className="mt-1 block text-[10px] text-[#8c9b91]">{orderTime(entry.createdAt)}</time>}
          </li>;
        })}</ol>}
      </div>;
    })}</div>
    <details className="mt-5 border-t border-[#edf0e9] pt-4"><summary className="cursor-pointer text-[12px] font-medium text-[#62796b]">Complete status history ({history.length})</summary><ol className="mt-4 grid gap-3">{history.map(item => <li key={item.id} className="border-l-2 border-[#dbe6de] pl-3 text-[12px]"><div className="flex flex-wrap justify-between gap-2"><strong className="font-medium">{orderStatusLabels[item.status] || item.status}{item.vendor ? ` · ${item.vendor}` : ""}{item.override ? " · Admin override" : ""}</strong><time className="text-[10px] text-[#8a9b90]">{orderTime(item.createdAt)}</time></div><p className="mt-1 text-[11px]! text-[#839086]!">{item.note}</p></li>)}</ol></details>
  </section>;
}
