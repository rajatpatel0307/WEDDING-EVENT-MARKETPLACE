import { createHash } from "node:crypto";
import * as repo from "../admin/admin.repository.js";
import { fail } from "./commerce.policy.js";

const part = (value, fallback) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20)
    .replace(/-+$/g, "") || fallback;

export function generateProductSku({
  productName,
  location,
  vendorName,
  serviceId,
  attempt = 0,
}) {
  const suffix = createHash("sha256")
    .update(`${serviceId.toLowerCase()}:${attempt}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `${part(productName, "PRODUCT")}-${part(location, "ONLINE")}-${part(vendorName, "VENDOR")}-${suffix}`;
}

export async function assignProductSku(
  serviceId,
  body,
  vendorId,
  existing,
  tx,
) {
  if (!tx) throw new Error("SKU assignment requires a transaction.");
  // SKU is an inventory identifier. Renaming a listing or editing its address
  // must not change an identifier already used in carts, orders or integrations.
  if (existing?.SKU?.trim()) return existing.SKU;
  const [vendor] = await repo.select(
    "SELECT BusinessName FROM dbo.Vendors WHERE VendorId=:vendorId",
    { vendorId },
    tx,
  );
  if (!vendor) fail("Vendor not found.", 404);
  for (let attempt = 0; attempt < 20; attempt++) {
    const sku = generateProductSku({
      productName: body.name,
      location:
        body.location?.city || body.location?.state || body.location?.address,
      vendorName: vendor.BusinessName,
      serviceId,
      attempt,
    });
    const [conflict] = await repo.select(
      "SELECT ProductId FROM dbo.Products WITH(UPDLOCK,HOLDLOCK) WHERE SKU=:sku AND (ServiceId IS NULL OR ServiceId<>:serviceId)",
      { sku, serviceId },
      tx,
    );
    if (!conflict) return sku;
  }
  fail("Unable to assign a product code. Please save again.", 409);
}
