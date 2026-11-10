import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import {
  scope,
  repo,
  owned,
  notify,
  notifyBusiness,
} from "../customers/workspace.common.js";
import {
  requireRole,
  requireApprovedVendor,
} from "../../middleware/auth.middleware.js";
import {
  gateway,
  configured,
  validSignature,
} from "../customers/workspace.payments.js";
import { assertQuantity, sellingTotals, fail } from "./commerce.policy.js";

const itemInput = z
  .object({ serviceId: z.guid(), quantity: z.number().int().min(1).max(999) })
  .strict();
export const purchaseInput = z
  .object({
    addressId: z.guid(),
    idempotencyKey: z.guid(),
    reviewToken: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    termsAccepted: z.boolean().default(false),
  })
  .strict();
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const lock = (key, tx) =>
  repo.select(
    "DECLARE @r int; EXEC @r=sp_getapplock @Resource=:key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Cart is busy. Retry.',1;",
    { key },
    tx,
  );
const eligible =
  "s.IsActive=1 AND s.ApprovalStatus='Approved' AND c.IsActive=1 AND c.AllowBuyOnline=1 AND p.IsActive=1 AND p.IsPublished=1 AND v.IsActive=1 AND v.VerificationStatus='Approved' AND u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1";
async function product(serviceId, tx) {
  const [p] = await repo.select(
    `SELECT p.*,s.DetailsJson,s.ServiceName,v.BusinessName FROM dbo.Products p WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Services s ON s.ServiceId=p.ServiceId JOIN dbo.Categories c ON c.CategoryId=s.CategoryId JOIN dbo.Vendors v ON v.VendorId=p.VendorId JOIN dbo.Users u ON u.UserId=v.UserId WHERE s.ServiceId=:serviceId AND ${eligible}`,
    { serviceId },
    tx,
  );
  const offer = JSON.parse(p?.DetailsJson || "{}").offer;
  if (!p || !offer?.sell || offer.type === "Book" || !offer.sell.available)
    fail("This listing is no longer available for purchase.", 409);
  const [held] = await repo.select(
    "SELECT COALESCE(SUM(i.Quantity),0) AS quantity FROM dbo.OrderLineItems i JOIN dbo.Orders o ON o.OrderId=i.OrderId WHERE i.ProductId=:id AND o.StockReserved=1 AND o.PaymentStatus<>'Paid'",
    { id: p.ProductId },
    tx,
  );
  return {
    ...p,
    offer,
    available: Math.max(0, Number(p.Stock) - Number(held.quantity)),
    shippingRequired: offer.sell.shippingRequired,
  };
}
async function cartId(customerId, tx) {
  await lock(`ShoppingCart:${customerId}`, tx);
  const [old] = await repo.select(
    "SELECT CartId FROM dbo.Cart WHERE CustomerId=:customerId",
    { customerId },
    tx,
  );
  if (old) return old.CartId;
  const id = randomUUID();
  await repo.insert(
    { table: "Cart", id: "CartId" },
    { CartId: id, CustomerId: customerId },
    tx,
  );
  return id;
}
export async function setCartItem(input, ctx) {
  const { id } = scope(ctx),
    body = itemInput.parse(input);
  return repo.transaction(async (tx) => {
    const cart = await cartId(id, tx),
      p = await product(body.serviceId, tx);
    assertQuantity(body.quantity, p.offer.sell, p.available);
    const [old] = await repo.select(
      "SELECT ItemId FROM dbo.CartAndProducts WHERE CartId=:cart AND ProductId=:product",
      { cart, product: p.ProductId },
      tx,
    );
    if (old)
      await repo.update(
        { table: "CartAndProducts", id: "ItemId" },
        old.ItemId,
        { Quantity: body.quantity, UpdatedAt: new Date() },
        tx,
      );
    else
      await repo.insert(
        { table: "CartAndProducts", id: "ItemId" },
        {
          ItemId: randomUUID(),
          CartId: cart,
          ProductId: p.ProductId,
          Quantity: body.quantity,
        },
        tx,
      );
    return { message: "Added to your cart." };
  });
}
export async function removeCartItem(serviceId, ctx) {
  z.guid().parse(serviceId);
  const { id } = scope(ctx);
  return repo.transaction(async (tx) => {
    const cart = await cartId(id, tx);
    await repo.select(
      "DELETE i FROM dbo.CartAndProducts i JOIN dbo.Products p ON p.ProductId=i.ProductId WHERE i.CartId=:cart AND p.ServiceId=:serviceId",
      { cart, serviceId },
      tx,
    );
    return { message: "Removed from cart." };
  });
}
async function cartLines(id, tx, strict = true) {
  const rows = await repo.select(
    "SELECT i.Quantity,p.ServiceId FROM dbo.CartAndProducts i JOIN dbo.Cart c ON c.CartId=i.CartId JOIN dbo.Products p ON p.ProductId=i.ProductId WHERE c.CustomerId=:id ORDER BY p.ProductId",
    { id },
    tx,
  );
  const lines = [];
  for (const row of rows) {
    try {
      const p = await product(row.ServiceId, tx);
      assertQuantity(row.Quantity, p.offer.sell, p.available);
      lines.push({ ...p, Quantity: row.Quantity });
    } catch (e) {
      if (strict || ![400, 409].includes(e.status)) throw e;
      const [p] = await repo.select(
        "SELECT ProductId,ServiceId,ProductName,UnitPrice FROM dbo.Products WHERE ServiceId=:service",
        { service: row.ServiceId },
        tx,
      );
      lines.push({ ...p, Quantity: row.Quantity, unavailable: e.message });
    }
  }
  return lines;
}
const safeLine = (r) => ({
  id: r.ServiceId,
  productId: r.ProductId,
  name: r.ProductName,
  price: Number(r.UnitPrice),
  quantity: r.Quantity,
  stock: r.available,
  minimum: r.offer?.sell.minimum,
  maximum: r.offer?.sell.maximum,
  tax: r.tax,
  shipping: r.shipping,
  total: r.total,
  vendor: r.BusinessName,
  unavailable: r.unavailable,
});
export async function cart(ctx) {
  const { id } = scope(ctx);
  return repo.transaction(async (tx) => {
    await cartId(id, tx);
    const lines = await cartLines(id, tx, false),
      valid = lines.length && lines.every((r) => !r.unavailable);
    if (!valid) return { lines: lines.map(safeLine) };
    try {
      const totals = sellingTotals(lines);
      return { ...totals, lines: totals.lines.map(safeLine) };
    } catch (error) {
      if (error.status !== 400) throw error;
      return { lines: lines.map(safeLine), checkoutError: error.message };
    }
  });
}
async function quote(body, id, tx) {
  await cartId(id, tx);
  const lines = await cartLines(id, tx),
    address = await owned("addresses", body.addressId, id, tx);
  if (!lines.length) fail("Your cart is empty.");
  const totals = sellingTotals(lines);
  const addressSnapshot = {
    fullName: address.FullName,
    phone: address.Phone,
    line1: address.AddressLine1,
    line2: address.AddressLine2,
    city: address.City,
    state: address.State,
    country: address.Country,
    postalCode: address.PostalCode,
  };
  const reviewToken = hash({
    lines: totals.lines.map((r) => ({
      id: r.ProductId,
      price: Number(r.UnitPrice),
      quantity: r.Quantity,
      tax: r.tax,
      shipping: r.shipping,
    })),
    address: addressSnapshot,
    total: totals.total,
  });
  return { ...totals, address: addressSnapshot, reviewToken };
}
export async function purchasePreview(input, ctx) {
  const { id } = scope(ctx),
    body = purchaseInput.parse(input);
  return repo.transaction(async (tx) => {
    const q = await quote(body, id, tx);
    return { ...q, lines: q.lines.map(safeLine) };
  });
}
export async function purchase(input, ctx) {
  const { id } = scope(ctx),
    body = purchaseInput.parse(input);
  if (!configured()) fail("Online payments are not configured.", 503);
  return repo.transaction(async (tx) => {
    await lock(`ShoppingCheckout:${id}:${body.idempotencyKey}`, tx);
    const requestHash = hash({
      addressId: body.addressId,
      reviewToken: body.reviewToken,
    });
    const [prior] = await repo.select(
      "SELECT * FROM dbo.Orders WHERE CustomerId=:id AND CheckoutKey=:key",
      { id, key: body.idempotencyKey },
      tx,
    );
    if (prior) {
      if (prior.RequestHash !== requestHash)
        fail("Checkout key was already used with different details.", 409);
      return { id: prior.OrderId, message: "Continue your saved order." };
    }
    const q = await quote(body, id, tx);
    if (!body.termsAccepted || body.reviewToken !== q.reviewToken)
      fail("Review your current order total and accept the terms.", 409);
    const orderId = randomUUID(),
      number = `ORD-${Date.now().toString(36).toUpperCase()}-${orderId.slice(0, 8).toUpperCase()}`;
    await repo.insert(
      { table: "Orders", id: "OrderId" },
      {
        OrderId: orderId,
        OrderNumber: number,
        CustomerId: id,
        CheckoutKey: body.idempotencyKey,
        RequestHash: requestHash,
        AddressSnapshot: JSON.stringify(q.address),
        Subtotal: q.subtotal,
        ShippingAmount: q.shipping,
        TaxAmount: q.tax,
        DiscountAmount: 0,
        TotalAmount: q.total,
        StockReserved: 1,
      },
      tx,
    );
    for (const r of q.lines)
      await repo.insert(
        { table: "OrderLineItems", id: "ItemId" },
        {
          ItemId: randomUUID(),
          OrderId: orderId,
          ProductId: r.ProductId,
          VendorId: r.VendorId,
          ProductNameSnapshot: r.ProductName,
          SKUSnapshot: r.SKU,
          ImageSnapshot: r.ImageUrl,
          UnitPrice: r.UnitPrice,
          Quantity: r.Quantity,
          TaxAmount: r.tax,
          ShippingAmount: r.shipping,
          LineTotal: r.total,
        },
        tx,
      );
    await repo.select(
      "DELETE i FROM dbo.CartAndProducts i JOIN dbo.Cart c ON c.CartId=i.CartId WHERE c.CustomerId=:id",
      { id },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "PRODUCT_ORDER_CREATED",
      "Orders",
      orderId,
      null,
      { number, total: q.total },
      tx,
    );
    return {
      id: orderId,
      number,
      message: "Order reserved. Complete payment to confirm your purchase.",
    };
  });
}
async function ownedOrder(id, ctx, tx) {
  z.guid().parse(id);
  const { id: customer } = scope(ctx);
  const [row] = await repo.select(
    "SELECT * FROM dbo.Orders WITH(UPDLOCK,HOLDLOCK) WHERE OrderId=:id AND CustomerId=:customer",
    { id, customer },
    tx,
  );
  if (!row) fail("Order not found.", 404);
  return row;
}
export async function paymentOrder(id, ctx) {
  return repo.transaction(async (tx) => {
    const order = await ownedOrder(id, ctx, tx);
    if (order.PaymentStatus === "Paid") return { alreadyPaid: true, id };
    if (!order.StockReserved)
      fail("This order no longer has reserved stock.", 409);
    let [p] = await repo.select(
      "SELECT * FROM dbo.ProductPaymentOrders WHERE OrderId=:id",
      { id },
      tx,
    );
    if (!p) {
      const remote = await gateway("/orders", {
        amount: Math.round(Number(order.TotalAmount) * 100),
        currency: "INR",
        receipt: order.OrderNumber,
        notes: { productOrderId: id },
      });
      if (
        !remote.id ||
        remote.amount !== Math.round(Number(order.TotalAmount) * 100) ||
        remote.currency !== "INR"
      )
        fail("Invalid payment provider order.", 502);
      p = {
        OrderId: id,
        GatewayOrderId: remote.id,
        AmountMinor: remote.amount,
        Currency: "INR",
      };
      await repo.insert(
        { table: "ProductPaymentOrders", id: "OrderId" },
        p,
        tx,
      );
    }
    return {
      id,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: p.GatewayOrderId,
      amount: Number(p.AmountMinor),
      currency: p.Currency,
      number: order.OrderNumber,
    };
  });
}
export function assertCaptured(payment, p) {
  if (
    payment.order_id !== p.GatewayOrderId ||
    payment.status !== "captured" ||
    payment.currency !== p.Currency ||
    payment.amount !== Number(p.AmountMinor)
  )
    fail("Payment has not been captured for this order.", 409);
}
export async function settleProductPayment(paymentId, gatewayOrderId) {
  const [p] = await repo.select(
    "SELECT * FROM dbo.ProductPaymentOrders WHERE GatewayOrderId=:gatewayOrderId",
    { gatewayOrderId },
  );
  if (!p) return false;
  const payment = await gateway(`/payments/${encodeURIComponent(paymentId)}`);
  if (payment.id !== paymentId)
    fail("The payment provider returned a different payment identifier.", 409);
  assertCaptured(payment, p);
  await repo.transaction(async (tx) => {
    const [order] = await repo.select(
      "SELECT * FROM dbo.Orders WITH(UPDLOCK,HOLDLOCK) WHERE OrderId=:id",
      { id: p.OrderId },
      tx,
    );
    const [locked] = await repo.select(
      "SELECT * FROM dbo.ProductPaymentOrders WITH(UPDLOCK,HOLDLOCK) WHERE OrderId=:id",
      { id: p.OrderId },
      tx,
    );
    if (order.PaymentStatus === "Paid") {
      if (locked.GatewayPaymentId !== paymentId)
        fail("A different payment already confirmed this order.", 409);
      return;
    }
    if (!order.StockReserved) fail("Order stock requires reconciliation.", 409);
    const rows = await repo.select(
      "SELECT * FROM dbo.OrderLineItems WHERE OrderId=:id ORDER BY ProductId",
      { id: p.OrderId },
      tx,
    );
    for (const r of rows) {
      const [stock] = await repo.select(
        "UPDATE dbo.Products WITH(UPDLOCK,HOLDLOCK) SET Stock = Stock - :quantity,UpdatedAt=SYSUTCDATETIME() OUTPUT inserted.Stock WHERE ProductId=:id AND Stock >= :quantity",
        { id: r.ProductId, quantity: r.Quantity },
        tx,
      );
      if (!stock) fail("Reserved inventory requires reconciliation.", 409);
      await repo.select(
        "UPDATE s SET UpdatedAt=SYSUTCDATETIME() FROM dbo.Services s JOIN dbo.Products p ON p.ServiceId=s.ServiceId WHERE p.ProductId=:id",
        { id: r.ProductId },
        tx,
      );
    }
    await repo.update(
      { table: "ProductPaymentOrders", id: "OrderId" },
      p.OrderId,
      {
        Status: "Paid",
        GatewayPaymentId: paymentId,
        LastCheckedAt: new Date(),
        UpdatedAt: new Date(),
      },
      tx,
    );
    await repo.update(
      { table: "Orders", id: "OrderId" },
      p.OrderId,
      {
        PaymentStatus: "Paid",
        OrderStatus: "Confirmed",
        StockReserved: 0,
        UpdatedAt: new Date(),
      },
      tx,
    );
    await repo.insert(
      { table: "ProductOrderHistory", id: "HistoryId" },
      {
        HistoryId: randomUUID(),
        OrderId: p.OrderId,
        Status: "Confirmed",
        Note: "Captured payment verified with Razorpay.",
      },
      tx,
    );
    await notify(
      order.CustomerId,
      "Order confirmed",
      `${order.OrderNumber} is paid and confirmed.`,
      "Order",
      p.OrderId,
      tx,
    );
    for (const vendor of new Set(rows.map((r) => r.VendorId)))
      await notifyBusiness(
        vendor,
        "New paid order",
        `${order.OrderNumber} is ready to fulfil.`,
        "Order",
        p.OrderId,
        tx,
      );
  });
  return true;
}
export async function verifyPurchase(input, ctx) {
  const body = z
    .object({
      razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
      razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
      razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
    })
    .strict()
    .parse(input);
  const { id } = scope(ctx);
  const [p] = await repo.select(
    "SELECT p.* FROM dbo.ProductPaymentOrders p JOIN dbo.Orders o ON o.OrderId=p.OrderId WHERE p.GatewayOrderId=:gateway AND o.CustomerId=:id",
    { gateway: body.razorpay_order_id, id },
  );
  if (!p) fail("Payment order not found.", 404);
  if (
    !validSignature(
      `${body.razorpay_order_id}|${body.razorpay_payment_id}`,
      body.razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET,
    )
  )
    fail("Invalid payment signature.");
  await settleProductPayment(body.razorpay_payment_id, body.razorpay_order_id);
  return {
    id: p.OrderId,
    message: "Payment verified. Your order is confirmed.",
  };
}
export async function refreshPurchase(id, ctx) {
  const order = await ownedOrder(id, ctx);
  const [p] = await repo.select(
    "SELECT * FROM dbo.ProductPaymentOrders WHERE OrderId=:id",
    { id },
  );
  if (p && order.PaymentStatus !== "Paid") {
    const response = await gateway(
      `/orders/${encodeURIComponent(p.GatewayOrderId)}/payments`,
    );
    if (!Array.isArray(response.items))
      fail("Could not check payment status.", 502);
    const captured = response.items.find((r) => r.status === "captured");
    if (captured) await settleProductPayment(captured.id, p.GatewayOrderId);
  }
  return { message: "Payment status checked." };
}
export async function orders(ctx, role = "Customer") {
  const user =
    role === "Customer"
      ? scope(ctx).user
      : role === "Vendor"
        ? requireApprovedVendor(ctx)
        : requireRole(ctx, "ADMIN");
  const owner = role === "Vendor" ? user.vendor.id : user.id;
  const where =
    role === "Customer"
      ? "o.CustomerId=:owner"
      : role === "Vendor"
        ? "EXISTS(SELECT 1 FROM dbo.OrderLineItems i WHERE i.OrderId=o.OrderId AND i.VendorId=:owner)"
        : "1=1";
  return repo.select(
    `SELECT TOP(200) o.OrderId AS id,o.OrderNumber AS number,o.TotalAmount AS total,o.OrderStatus AS status,o.PaymentStatus AS paymentStatus,o.CreatedAt AS createdAt FROM dbo.Orders o WHERE ${where} ORDER BY o.CreatedAt DESC`,
    { owner },
  );
}
export async function orderDetails(id, ctx) {
  const o = await ownedOrder(id, ctx);
  const lines = await repo.select(
    "SELECT ProductNameSnapshot AS name,Quantity AS quantity,UnitPrice AS price,TaxAmount AS tax,ShippingAmount AS shipping,LineTotal AS total FROM dbo.OrderLineItems WHERE OrderId=:id",
    { id },
  );
  return {
    id: o.OrderId,
    number: o.OrderNumber,
    status: o.OrderStatus,
    paymentStatus: o.PaymentStatus,
    subtotal: Number(o.Subtotal),
    tax: Number(o.TaxAmount),
    shipping: Number(o.ShippingAmount),
    total: Number(o.TotalAmount),
    address: JSON.parse(o.AddressSnapshot),
    lines,
  };
}
