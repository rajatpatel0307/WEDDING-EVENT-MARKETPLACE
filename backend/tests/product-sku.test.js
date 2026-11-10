import test from "node:test";
import assert from "node:assert/strict";
import {
  generateProductSku,
  assignProductSku,
} from "../src/modules/shopping/product-sku.js";
import { offerSchema } from "../src/modules/shopping/commerce.policy.js";
import { sequelize } from "../src/config/database.js";

const serviceId = "734b9588-c47c-40eb-8c17-1797d65a2800";
const source = {
  productName: "Wedding Dress",
  location: "Lucknow",
  vendorName: "Royal Events",
  serviceId,
};

test("SKUs use product, location and vendor names with a stable unique suffix", () => {
  const sku = generateProductSku(source);
  assert.match(sku, /^WEDDING-DRESS-LUCKNOW-ROYAL-EVENTS-[A-F0-9]{12}$/);
  assert.equal(
    generateProductSku({ ...source, serviceId: serviceId.toUpperCase() }),
    sku,
  );
  assert.notEqual(
    generateProductSku({
      ...source,
      serviceId: "734b9588-c47c-40eb-8c17-1797d65a2801",
    }),
    sku,
  );
  assert.notEqual(generateProductSku({ ...source, attempt: 1 }), sku);
});

test("SKU names are normalized, length-bounded and safe when details are blank", () => {
  const sku = generateProductSku({
    ...source,
    productName: "  René's Dress / Special  ",
    location: "New Delhi",
    vendorName: "Royal & Co.",
  });
  assert.match(sku, /^RENE-S-DRESS-SPECIAL-NEW-DELHI-ROYAL-CO-/);
  assert(
    generateProductSku({
      ...source,
      productName: "Long name ".repeat(50),
      location: "City ".repeat(50),
      vendorName: "Vendor ".repeat(50),
    }).length <= 100,
  );
  assert.match(generateProductSku({ serviceId }), /^PRODUCT-ONLINE-VENDOR-/);
});

test("selling configuration no longer requires manual SKU entry", () => {
  assert.equal(
    offerSchema.parse({ type: "Sell", sell: { price: 100, stock: 5 } }).sell
      .sku,
    "",
  );
});

test("existing inventory SKUs survive name, location and vendor edits", async (t) => {
  const query = t.mock.method(sequelize, "query", () => {
    throw new Error("Unexpected SQL");
  });
  assert.equal(
    await assignProductSku(
      serviceId,
      { name: "Changed name", location: { city: "Delhi" } },
      serviceId,
      { SKU: "LEGACY-42" },
      {},
    ),
    "LEGACY-42",
  );
  assert.equal(query.mock.callCount(), 0);
});

test("SKU assignment uses the stored vendor name and retries collisions under transaction locks", async (t) => {
  const tx = { fixture: true };
  let candidates = 0;
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.startsWith("SELECT BusinessName"))
      return [{ BusinessName: "Royal Events" }];
    if (sql.startsWith("SELECT ProductId"))
      return ++candidates === 1 ? [{ ProductId: "occupied" }] : [];
    throw new Error("Unexpected query");
  });
  const sku = await assignProductSku(
    serviceId,
    {
      name: source.productName,
      location: { city: source.location },
      offer: { sell: { sku: "FORGED-CLIENT-CODE" } },
    },
    serviceId,
    null,
    tx,
  );
  assert.equal(sku, generateProductSku({ ...source, attempt: 1 }));
  assert.equal(candidates, 2);
  assert(
    query.mock.calls.every((call) => call.arguments[1].transaction === tx),
  );
  assert(
    query.mock.calls
      .filter((call) => call.arguments[0].startsWith("SELECT ProductId"))
      .every((call) => call.arguments[0].includes("WITH(UPDLOCK,HOLDLOCK)")),
  );
  await assert.rejects(
    () => assignProductSku(serviceId, {}, serviceId, null),
    /transaction/,
  );
});
