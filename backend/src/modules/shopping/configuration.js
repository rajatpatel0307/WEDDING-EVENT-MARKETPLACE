import * as repo from "../admin/admin.repository.js";
import { z } from "zod";
import { offerSchema, assertAllowed, fail } from "./commerce.policy.js";
import { assignProductSku } from "./product-sku.js";
export async function categoryOptions(categoryId, tx) {
  categoryId = z.coerce.number().int().positive().parse(categoryId);
  const [category] = await repo.select(
    "SELECT CategoryId,AllowBuyOnline,AllowBooking FROM dbo.Categories WITH(HOLDLOCK) WHERE CategoryId=:categoryId AND IsActive=1",
    { categoryId },
    tx,
  );
  if (!category) fail("Choose an active category.");
  return category;
}
export async function validateOffer(offer, categoryId, tx) {
  if (offer) offer = offerSchema.parse(offer);
  assertAllowed(offer, await categoryOptions(categoryId, tx));
  return offer;
}
// Products is the existing selling inventory. Services remains the catalog and
// approval authority; both records are saved in the same transaction.
export async function syncProduct(id, body, vendorId, tx) {
  const [existing] = await repo.select(
    "SELECT ProductId,Stock,SKU FROM dbo.Products WITH(UPDLOCK,HOLDLOCK) WHERE ServiceId=:id",
    { id },
    tx,
  );
  const sell = body.offer?.sell;
  if (!sell) {
    if (existing)
      await repo.update(
        { table: "Products", id: "ProductId" },
        existing.ProductId,
        { IsActive: 0, IsPublished: 0, UpdatedAt: new Date() },
        tx,
      );
    return;
  }
  sell.sku = await assignProductSku(id, body, vendorId, existing, tx);
  const [held] = await repo.select(
    "SELECT COALESCE(SUM(i.Quantity),0) AS quantity FROM dbo.OrderLineItems i JOIN dbo.Orders o ON o.OrderId=i.OrderId WHERE i.ProductId=:id AND o.PaymentStatus<>'Paid' AND o.StockReserved=1",
    { id: existing?.ProductId || id },
    tx,
  );
  if (sell.stock < Number(held.quantity))
    fail(
      "Stock cannot be lower than quantities reserved by unpaid orders.",
      409,
    );
  const values = {
    CategoryId: body.categoryId,
    VendorId: vendorId,
    ProductName: body.name,
    Description: body.description,
    SKU: sell.sku,
    UnitPrice: sell.price,
    Stock: sell.stock,
    TaxRate: body.pricing.taxRate,
    ShippingAmount: sell.shippingRequired ? sell.shippingAmount : 0,
    IsActive: 1,
    IsPublished: 1,
    UpdatedAt: new Date(),
  };
  if (existing)
    await repo.update(
      { table: "Products", id: "ProductId" },
      existing.ProductId,
      values,
      tx,
    );
  else
    await repo.insert(
      { table: "Products", id: "ProductId" },
      { ...values, ProductId: id, ServiceId: id },
      tx,
    );
  await repo.select(
    "UPDATE dbo.Services SET DetailsJson=JSON_MODIFY(DetailsJson,'$.offer.sell.sku',:sku) WHERE ServiceId=:id",
    { id, sku: sell.sku },
    tx,
  );
}
export async function currentOffer(id, document, tx) {
  if (!document.offer?.sell) return document.offer || null;
  const [p] = await repo.select(
    "SELECT Stock,SKU FROM dbo.Products WHERE ServiceId=:id",
    { id },
    tx,
  );
  return {
    ...document.offer,
    sell: {
      ...document.offer.sell,
      stock: p ? Number(p.Stock) : document.offer.sell.stock,
      sku: p?.SKU || document.offer.sell.sku || "",
    },
  };
}
export async function removeProduct(serviceId, tx) {
  const [history] = await repo.select(
    "SELECT TOP(1) i.ItemId FROM dbo.OrderLineItems i JOIN dbo.Products p ON p.ProductId=i.ProductId WHERE p.ServiceId=:serviceId",
    { serviceId },
    tx,
  );
  if (history)
    fail("This listing has purchase history. Deactivate it instead.", 409);
  await repo.select(
    "DELETE i FROM dbo.CartAndProducts i JOIN dbo.Products p ON p.ProductId=i.ProductId WHERE p.ServiceId=:serviceId; DELETE FROM dbo.Products WHERE ServiceId=:serviceId",
    { serviceId },
    tx,
  );
}
