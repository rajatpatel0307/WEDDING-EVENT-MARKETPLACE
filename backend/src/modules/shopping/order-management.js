import { randomUUID } from "node:crypto";
import { z } from "zod";
import * as repo from "../admin/admin.repository.js";
import { dateBounds } from "../admin/admin.validation.js";
import { requireRole, requireApprovedVendor } from "../../middleware/auth.middleware.js";
import { notify, notifyBusiness } from "../customers/workspace.common.js";
import { afterCommit, emitUser } from "../messaging/realtime-bus.js";
import { orderStatuses, aggregateOrderStatus, assertOrderTransition } from "./order-policy.js";
import { queueLifecycleEmail } from "../notifications/email.service.js";

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const currency = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const literal = value => `%${value.replace(/[\[\]%_]/g, character => `[${character}]`)}%`;
export const orderQuery = z.object({
  q: z.string().trim().max(200).default(""),
  vendor: z.guid().optional(),
  status: z.enum(["", ...orderStatuses]).default(""),
  paymentStatus: z.enum(["", "Pending", "Paid", "Failed"]).default(""),
  from: z.iso.date().optional(), to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).refine(value => !value.from || !value.to || value.from <= value.to, "Start date must precede end date.");
export const statusInput = z.object({
  status: z.enum(orderStatuses), expectedVersion: z.number().int().min(0),
  vendorId: z.guid().optional(), override: z.boolean().default(false),
  note: z.string().trim().max(1000).default(""),
}).strict();
function access(ctx, role) {
  const user = role === "Vendor" ? requireApprovedVendor(ctx) : role === "Admin" ? requireRole(ctx, "ADMIN") : role === "Customer" ? requireRole(ctx, "CUSTOMER") : null;
  if (!user) fail("Order access is forbidden.", 403);
  return { user, owner: role === "Vendor" ? user.vendor.id : user.id };
}
const scopeWhere = role => role === "Vendor" ? "EXISTS(SELECT 1 FROM dbo.OrderLineItems own WHERE own.OrderId=o.OrderId AND own.VendorId=:owner)" : role === "Customer" ? "o.CustomerId=:owner" : "1=1";
const groupStatus = `CASE WHEN SUM(CASE WHEN i.FulfillmentStatus='Cancelled' THEN 1 ELSE 0 END)=COUNT(*) THEN 'Cancelled'
  WHEN SUM(CASE WHEN i.FulfillmentStatus='Pending' THEN 1 ELSE 0 END)>0 THEN 'Pending'
  WHEN SUM(CASE WHEN i.FulfillmentStatus='Processing' THEN 1 ELSE 0 END)>0 THEN 'Processing'
  WHEN SUM(CASE WHEN i.FulfillmentStatus='Shipped' THEN 1 ELSE 0 END)>0 THEN 'Shipped'
  WHEN SUM(CASE WHEN i.FulfillmentStatus='OutForDelivery' THEN 1 ELSE 0 END)>0 THEN 'OutForDelivery' ELSE 'Delivered' END`;
function listSource(role) {
  return `FROM dbo.Orders o JOIN dbo.Users customer ON customer.UserId=o.CustomerId
    OUTER APPLY(SELECT STRING_AGG(CONVERT(nvarchar(max),i.ProductNameSnapshot),', ') AS items,SUM(i.Quantity) AS quantity,
      SUM(i.UnitPrice*i.Quantity) AS subtotal,SUM(i.LineTotal) AS total,${groupStatus} AS status
      FROM dbo.OrderLineItems i WHERE i.OrderId=o.OrderId ${role === "Vendor" ? "AND i.VendorId=:owner" : ""}) item
    OUTER APPLY(SELECT STRING_AGG(CONVERT(nvarchar(max),v.BusinessName),', ') AS names FROM dbo.Vendors v
      WHERE EXISTS(SELECT 1 FROM dbo.OrderLineItems names WHERE names.OrderId=o.OrderId AND names.VendorId=v.VendorId)
      ${role === "Vendor" ? "AND v.VendorId=:owner" : ""}) vendors`;
}
export async function listOrders(input, ctx, role) {
  const { owner } = access(ctx, role), query = orderQuery.parse(input);
  const params = { owner, q: literal(query.q), status: query.status, paymentStatus: query.paymentStatus,
    vendor: role === "Admin" ? query.vendor || null : null, ...dateBounds(query.from, query.to), offset: (query.page - 1) * query.pageSize, size: query.pageSize };
  const scope = `${scopeWhere(role)} AND item.quantity IS NOT NULL`;
  const where = `${scope} AND (:q = '%%' OR o.OrderNumber LIKE :q OR CONCAT(customer.FirstName,' ',customer.LastName) LIKE :q)
    AND (:status = '' OR item.status=:status) AND (:paymentStatus = '' OR o.PaymentStatus=:paymentStatus)
    AND (:from IS NULL OR o.CreatedAt>=:from) AND (:to IS NULL OR o.CreatedAt< :to)
    AND (:vendor IS NULL OR EXISTS(SELECT 1 FROM dbo.OrderLineItems vf WHERE vf.OrderId=o.OrderId AND vf.VendorId=:vendor))`;
  const source = listSource(role);
  const [count] = await repo.select(`SELECT COUNT_BIG(*) AS total ${source} WHERE ${where}`, params);
  const rows = await repo.select(`SELECT o.OrderId AS id,o.OrderNumber AS number,CONCAT(customer.FirstName,' ',customer.LastName) AS customer,
    item.items,item.quantity,vendors.names AS vendor,o.CreatedAt AS createdAt,item.status,o.PaymentStatus AS paymentStatus,
    ${role === "Vendor" ? "item.total-ROUND(o.DiscountAmount*item.subtotal/NULLIF(o.Subtotal,0),2)" : "o.TotalAmount"} AS total,
    o.StatusVersion AS version,o.StatusUpdatedAt AS statusUpdatedAt ${source} WHERE ${where}
    ORDER BY o.CreatedAt DESC,o.OrderId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`, params);
  const [summary] = await repo.select(`SELECT COUNT_BIG(*) AS total,${orderStatuses.map(status => `COALESCE(SUM(CASE WHEN item.status='${status}' THEN 1 ELSE 0 END),0) AS [${status.toLowerCase()}]`).join(",")}
    ${source} WHERE ${scope}`, { owner });
  const vendors = role === "Admin" ? await repo.select("SELECT v.VendorId AS id,v.BusinessName AS name FROM dbo.Vendors v WHERE EXISTS(SELECT 1 FROM dbo.OrderLineItems i WHERE i.VendorId=v.VendorId) ORDER BY v.BusinessName,v.VendorId") : [];
  return { rows: rows.map(row => ({ ...row, total: Number(row.total), quantity: Number(row.quantity) })),
    total: Number(count.total), page: query.page, pageSize: query.pageSize, vendors,
    summary: Object.fromEntries(Object.entries(summary || {}).map(([key, value]) => [key, Number(value)])), statuses: orderStatuses };
}
async function readOrder(id, ctx, role, tx) {
  const { owner, user } = access(ctx, role);
  z.guid().parse(id);
  const [order] = await repo.select(`SELECT o.*,CONCAT(customer.FirstName,' ',customer.LastName) AS CustomerName,
    customer.Email AS CustomerEmail,customer.PhoneNumber AS CustomerPhone FROM dbo.Orders o ${tx ? "WITH(UPDLOCK,HOLDLOCK)" : ""}
    JOIN dbo.Users customer ON customer.UserId=o.CustomerId WHERE o.OrderId=:id AND ${scopeWhere(role)}`, { id, owner }, tx);
  if (!order) fail("Order not found in your account.", 404);
  return { order, owner, user };
}
export async function orderDetails(id, ctx, role = "Customer") {
  const { order: o, owner } = await readOrder(id, ctx, role);
  const lines = await repo.select(`SELECT i.ItemId AS id,i.ProductNameSnapshot AS name,i.ImageSnapshot AS image,
    COALESCE(i.DescriptionSnapshot,p.Description) AS description,i.Quantity AS quantity,i.UnitPrice AS price,i.TaxAmount AS tax,
    i.ShippingAmount AS shipping,i.LineTotal AS total,i.FulfillmentStatus AS status,i.VendorId AS vendorId,v.BusinessName AS vendor,
    p.ServiceId AS serviceId FROM dbo.OrderLineItems i JOIN dbo.Products p ON p.ProductId=i.ProductId JOIN dbo.Vendors v ON v.VendorId=i.VendorId
    WHERE i.OrderId=:id ${role === "Vendor" ? "AND i.VendorId=:owner" : ""} ORDER BY i.CreatedAt,i.ItemId`, { id, owner });
  const history = await repo.select(`SELECT h.HistoryId AS id,h.Status AS status,h.PreviousStatus AS previousStatus,h.Note AS note,
    h.CreatedAt AS createdAt,h.IsOverride AS override,h.VendorId AS vendorId,v.BusinessName AS vendor,
    CONCAT(actor.FirstName,' ',actor.LastName) AS actor FROM dbo.ProductOrderHistory h LEFT JOIN dbo.Vendors v ON v.VendorId=h.VendorId
    LEFT JOIN dbo.Users actor ON actor.UserId=h.ActorId WHERE h.OrderId=:id ${role === "Vendor" ? "AND (h.VendorId=:owner OR h.VendorId IS NULL)" : ""}
    ORDER BY h.CreatedAt,h.HistoryId`, { id, owner });
  const total = key => currency(lines.reduce((sum, line) => sum + Number(line[key] || 0), 0));
  const subtotal = role === "Vendor" ? currency(lines.reduce((sum, line) => sum + Number(line.price) * Number(line.quantity), 0)) : Number(o.Subtotal);
  const discount = role === "Vendor" ? currency(Number(o.DiscountAmount) * subtotal / (Number(o.Subtotal) || 1)) : Number(o.DiscountAmount);
  const fulfillments = [...new Set(lines.map(line => line.vendorId))].map(vendorId => {
    const items = lines.filter(line => line.vendorId === vendorId);
    return { vendorId, vendor: items[0].vendor, status: aggregateOrderStatus(items.map(line => line.status)) };
  });
  return { id: o.OrderId, number: o.OrderNumber, status: aggregateOrderStatus(lines.map(line => line.status)),
    paymentStatus: o.PaymentStatus, paymentMethod: o.PaymentMethod || (o.PaymentStatus === "Paid" ? "Razorpay" : "Not paid"),
    createdAt: o.CreatedAt, updatedAt: o.UpdatedAt, statusUpdatedAt: o.StatusUpdatedAt || o.UpdatedAt, version: o.StatusVersion,
    subtotal, shipping: role === "Vendor" ? total("shipping") : Number(o.ShippingAmount), tax: role === "Vendor" ? total("tax") : Number(o.TaxAmount),
    discount, total: role === "Vendor" ? currency(total("total") - discount) : Number(o.TotalAmount),
    address: JSON.parse(o.AddressSnapshot), customer: { name: o.CustomerName, email: o.CustomerEmail, phone: o.CustomerPhone },
    lines: lines.map(line => ({ ...line, quantity: Number(line.quantity), price: Number(line.price), total: Number(line.total) })), history, fulfillments,
    statuses: orderStatuses, vendorScoped: role === "Vendor" };
}
export async function publishOrderChange(order, tx) {
  const recipients = await repo.select(`SELECT DISTINCT v.UserId AS id FROM dbo.OrderLineItems i JOIN dbo.Vendors v ON v.VendorId=i.VendorId WHERE i.OrderId=:id
    UNION SELECT UserId FROM dbo.Users WHERE IsActive=1 AND EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=dbo.Users.UserId AND r.RoleCode='ADMIN' AND r.IsActive=1)`, { id: order.OrderId }, tx);
  const send = () => {
    for (const id of new Set([order.CustomerId, ...recipients.map(row => row.id)]))
      emitUser(id, "order_updated", { id: order.OrderId, number: order.OrderNumber, version: Number(order.StatusVersion || 0) });
  };
  if (!tx || typeof tx.afterCommit === "function") afterCommit(tx, send);
}
export async function updateOrderStatus(id, input, ctx, role) {
  if (!["Vendor", "Admin"].includes(role)) fail("Only a vendor or administrator can update orders.", 403);
  access(ctx, role);
  const body = statusInput.parse(input);
  if (role === "Vendor" && (body.override || body.vendorId)) fail("Vendors can manage only their own fulfillment.", 403);
  return repo.transaction(async tx => {
    const { order: o, owner, user } = await readOrder(id, ctx, role, tx);
    if (Number(o.StatusVersion) !== body.expectedVersion) fail("This order changed. Refresh before updating its status.", 409);
    const lines = await repo.select("SELECT * FROM dbo.OrderLineItems WITH(UPDLOCK,HOLDLOCK) WHERE OrderId=:id ORDER BY VendorId,ItemId", { id }, tx);
    const vendor = role === "Vendor" ? owner : body.vendorId || null;
    const selected = lines.filter(line => !vendor || line.VendorId.toLowerCase() === vendor.toLowerCase());
    if (!selected.length) fail("No order items belong to the selected vendor.", 404);
    for (const line of selected) assertOrderTransition(line.FulfillmentStatus, body.status, { role, override: body.override, note: body.note, paid: o.PaymentStatus === "Paid" });
    if (selected.every(line => line.FulfillmentStatus === body.status)) return { message: "Order status is already up to date." };
    if (body.status === "Cancelled" && o.PaymentStatus !== "Paid" && selected.length !== lines.length)
      fail("Before payment, only the complete order can be cancelled. Ask an administrator to cancel all vendors together.", 409);
    if (body.status === "Cancelled" && o.PaymentStatus !== "Paid") {
      const [checkout] = await repo.select("SELECT GatewayOrderId FROM dbo.ProductPaymentOrders WHERE OrderId=:id", { id }, tx);
      if (checkout) fail("Reconcile the active payment checkout before cancelling this unpaid order.", 409);
    }
    const reopening = body.override && body.status === "Pending" && o.PaymentStatus !== "Paid" && o.OrderStatus === "Cancelled";
    if (reopening) {
      if (selected.length !== lines.length) fail("Reopen the complete unpaid order so its total and reserved inventory remain consistent.", 409);
      for (const productId of [...new Set(lines.map(line => line.ProductId))].sort()) {
        const [product] = await repo.select("SELECT Stock FROM dbo.Products WITH(UPDLOCK,HOLDLOCK) WHERE ProductId=:productId", { productId }, tx);
        const [held] = await repo.select("SELECT COALESCE(SUM(i.Quantity),0) AS quantity FROM dbo.OrderLineItems i JOIN dbo.Orders o ON o.OrderId=i.OrderId WHERE i.ProductId=:productId AND o.StockReserved=1 AND o.PaymentStatus<>'Paid' AND o.OrderId<>:id", { productId, id }, tx);
        const quantity = lines.filter(line => line.ProductId === productId).reduce((sum, line) => sum + Number(line.Quantity), 0);
        if (!product || Number(product.Stock) - Number(held.quantity) < quantity) fail("This order cannot be reopened because the required inventory is no longer available.", 409);
      }
    }
    await repo.select("UPDATE dbo.OrderLineItems SET FulfillmentStatus=:status WHERE OrderId=:id AND (:vendor IS NULL OR VendorId=:vendor)", { status: body.status, id, vendor }, tx);
    for (const vendorId of new Set(selected.map(line => line.VendorId))) {
      const previous = aggregateOrderStatus(selected.filter(line => line.VendorId === vendorId).map(line => line.FulfillmentStatus));
      if (previous !== body.status) await repo.insert({ table: "ProductOrderHistory", id: "HistoryId" }, {
        HistoryId: randomUUID(), OrderId: id, VendorId: vendorId, ActorId: user.id, PreviousStatus: previous,
        Status: body.status, Note: body.note || `Order ${body.status.toLowerCase()}.`, IsOverride: body.override ? 1 : 0,
      }, tx);
    }
    const affected = new Set(selected.map(line => line.ItemId));
    const status = aggregateOrderStatus(lines.map(line => affected.has(line.ItemId) ? body.status : line.FulfillmentStatus));
    await repo.update({ table: "Orders", id: "OrderId" }, id, {
      OrderStatus: status, StatusVersion: Number(o.StatusVersion) + 1, StatusUpdatedAt: new Date(), UpdatedAt: new Date(),
      ...(status === "Cancelled" && o.PaymentStatus !== "Paid" ? { StockReserved: 0 } : {}),
      ...(reopening ? { StockReserved: 1 } : {}),
    }, tx);
    await repo.auditAdmin(ctx, "ORDER_STATUS_UPDATED", "Orders", id, { status: o.OrderStatus, version: o.StatusVersion },
      { status, vendorId: vendor, fulfillmentStatus: body.status, override: body.override, note: body.note }, tx);
    if (status === "Delivered" && o.OrderStatus !== "Delivered")
      await queueLifecycleEmail("order.delivered", id, tx);
    const statusLabel = body.status === "OutForDelivery" ? "Out for delivery" : body.status;
    await notify(o.CustomerId, "Order status updated", `${o.OrderNumber}: ${statusLabel.toLowerCase()}.`, "Order", id, tx);
    for (const vendorId of new Set(selected.map(line => line.VendorId)))
      await notifyBusiness(vendorId, "Order status updated", `${o.OrderNumber}: ${statusLabel}.`, "Order", id, tx);
    await publishOrderChange({ ...o, StatusVersion: Number(o.StatusVersion) + 1 }, tx);
    return { message: `Order updated to ${statusLabel}.`, status: role === "Vendor" ? body.status : status, version: Number(o.StatusVersion) + 1 };
  });
}
