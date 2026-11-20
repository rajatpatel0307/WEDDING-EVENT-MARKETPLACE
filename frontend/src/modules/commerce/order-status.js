export const orderStatusLabels = { Pending: "Pending", Processing: "Processing", Shipped: "Shipped", OutForDelivery: "Out for delivery", Delivered: "Delivered", Cancelled: "Cancelled", Confirmed: "Payment confirmed", AwaitingPayment: "Pending" };
export const orderStages = ["Pending", "Processing", "Shipped", "OutForDelivery", "Delivered"];
export function orderStatusOptions(statuses, paid, override = false) {
  return [...orderStages, "Cancelled"].filter(next => statuses.every(status => {
    if (next === status) return true;
    if (next !== "Cancelled" && !paid && !(override && next === "Pending")) return false;
    if (override) return true;
    return { Pending: ["Processing", "Cancelled"], Processing: ["Shipped", "Cancelled"], Shipped: ["OutForDelivery", "Cancelled"], OutForDelivery: ["Delivered", "Cancelled"] }[status]?.includes(next);
  }));
}
export const orderTime = value => value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—";
