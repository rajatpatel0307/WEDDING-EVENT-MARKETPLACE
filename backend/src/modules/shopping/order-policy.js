export const orderStatuses = ["Pending", "Processing", "Shipped", "OutForDelivery", "Delivered", "Cancelled"];
export const normalizeOrderStatus = status => ["Confirmed", "AwaitingPayment"].includes(status) ? "Pending" : status;
export function aggregateOrderStatus(statuses) {
  const active = statuses.map(normalizeOrderStatus).filter(status => status !== "Cancelled");
  if (!active.length) return "Cancelled";
  return ["Pending", "Processing", "Shipped", "OutForDelivery", "Delivered"].find(status => active.includes(status)) || "Pending";
}
export function assertOrderTransition(from, to, { role, override = false, note = "", paid = false } = {}) {
  const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };
  from = normalizeOrderStatus(from);
  if (!orderStatuses.includes(to)) fail("Unknown order status.");
  if (override && role !== "Admin") throw Object.assign(new Error("Only administrators can override an order status."), { status: 403 });
  if (override && note.trim().length < 3) fail("Explain the administrator override.");
  if (from === to) return;
  if (to !== "Cancelled" && !paid && !(override && role === "Admin" && to === "Pending")) fail("Payment must be received before preparing or dispatching an order.");
  if (override) return;
  if (["Delivered", "Cancelled"].includes(from)) fail("Delivered or cancelled orders require an explicit administrator override.");
  const allowed = { Pending: ["Processing", "Cancelled"], Processing: ["Shipped", "Cancelled"], Shipped: ["OutForDelivery", "Cancelled"], OutForDelivery: ["Delivered", "Cancelled"] };
  if (!allowed[from]?.includes(to)) fail(`Cannot change ${from} directly to ${to}.`);
}
