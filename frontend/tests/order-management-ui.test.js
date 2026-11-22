import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("order pages render references, scope totals, complete details, tracking and closed-order controls", async () => {
  const key = "__orderManagementUiFixture";
  const previous = globalThis[key];
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    cacheDir: fileURLToPath(new URL("../node_modules/.vite-order-management-tests/", import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "order-page-fixtures", enforce: "pre",
      resolveId(id) {
        if (id === "virtual:order-pages") return "\0order-pages";
        if (id.endsWith("/context/AuthContext")) return "\0order-auth";
        if (["../admin/api", "../vendor/services/workspace.api"].includes(id)) return "\0order-api";
        if (id === "../customer/services/workspace.api") return "\0order-customer-api";
        if (id === "./order-live") return "\0order-live";
      },
      load(id) {
        if (id === "\0order-auth") return "export const useAuth = () => ({ notify() {} });";
        if (id === "\0order-api") return "export const adminRequest = async () => ({}); export const vendorRequest = adminRequest; export const saveBlob = () => {};";
        if (id === "\0order-customer-api") return "export const money = value => 'INR ' + value;";
        if (id === "\0order-live") return "export const useOrderUpdates = () => {};";
        if (id === "\0order-pages") return `
          import React from 'react';
          import {renderToStaticMarkup} from 'react-dom/server';
          import {MemoryRouter,Routes,Route} from 'react-router-dom';
          import OrderManagement,{ManagedOrderDetails} from '/src/modules/commerce/OrderManagement.jsx';
          import PurchaseOrderDetails from '/src/modules/commerce/PurchaseOrderDetails.jsx';
          import ManagedOrderDetailsView from '/src/modules/commerce/ManagedOrderDetailsView.jsx';
          export function render(role, data, details=false) {
            globalThis.${key}={data,loading:false,refresh() {}};
            return renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/'+role.toLowerCase()+'/orders/order-id']},
              React.createElement(Routes,null,React.createElement(Route,{path:'/:role/orders/:id',element:React.createElement(details?ManagedOrderDetails:OrderManagement,{role})}))));
          }
          export const customer = (data, props = {}) => renderToStaticMarkup(React.createElement(MemoryRouter,null,
            React.createElement(PurchaseOrderDetails,{data,busy:false,onPay() {},onRefresh() {},...props})));
          export const managedView = (role, data, props = {}) => renderToStaticMarkup(React.createElement(MemoryRouter,null,
            React.createElement(ManagedOrderDetailsView,{role,data,onRefresh() {},onViewInvoice() {},onCloseInvoice() {},onDownloadInvoice() {},...props})));
        `;
      },
      transform(code, id) {
        if (!id.replaceAll("\\", "/").endsWith("/commerce/OrderManagement.jsx")) return;
        const start = code.indexOf("function useOrdersData(");
        const end = code.indexOf("function ErrorState(", start);
        return code.slice(0, start) + `function useOrdersData() { return globalThis.${key}; }\n` + code.slice(end);
      },
    }],
  });
  try {
    const { render, customer, managedView } = await server.ssrLoadModule("virtual:order-pages");
    const list = { summary: { total: 1, pending: 1 }, rows: [{ id: "internal-id", number: "MNOR2600001", customer: "Example Customer", items: "Wedding clothes", vendor: "Wedding Studio", createdAt: "2026-11-20T10:00:00Z", quantity: 2, total: 500, status: "Pending", paymentStatus: "Paid" }], total: 1, page: 1, pageSize: 20, vendors: [] };
    const admin = render("Admin", list);
    for (const text of ["MNOR2600001", "Example Customer", "Wedding clothes", "Wedding Studio", "Payment status", "Order status", "View MNOR2600001"]) assert.ok(admin.includes(text), text);
    assert.ok(admin.includes("/admin/orders/internal-id"));
    assert.ok(render("Vendor", list).includes("/vendor/orders/internal-id"));
    assert.ok(render("Vendor", { ...list, rows: [], total: 0 }).includes("No orders found"));
    const data = { id: "order-id", number: "MNOR2600001", version: 1, status: "Delivered", paymentStatus: "Paid", paymentMethod: "upi", createdAt: "2026-11-20T10:00:00Z", statusUpdatedAt: "2026-11-20T11:00:00Z", customer: { name: "Example Customer", phone: "+919999999999", email: "customer@example.test" }, address: { line1: "Test address", city: "Lucknow", state: "Uttar Pradesh", postalCode: "226001", country: "India" }, lines: [{ id: "item", name: "Wedding clothes", image: "https://example.test/product.jpg", description: "Made for your celebration", vendor: "Wedding Studio", vendorId: "vendor", price: 250, quantity: 2, total: 500, status: "Delivered" }], subtotal: 500, shipping: 0, tax: 0, discount: 0, total: 500, fulfillments: [{ vendor: "Wedding Studio", vendorId: "vendor", status: "Delivered" }], history: [{ id: "history", vendorId: "vendor", status: "Delivered", createdAt: "2026-11-20T11:00:00Z", note: "Delivered safely" }] };
    const detail = render("Vendor", data, true);
    for (const text of ["MNOR2600001", "Order information", "Customer &amp; delivery", "Test address", "226001", "Made for your celebration", "Price summary", "Order tracking", "Delivered safely"]) assert.ok(detail.includes(text), text);
    const statusControl = detail.match(/<select aria-label="Next order status"[\s\S]*?<\/select>/)?.[0];
    assert.ok(statusControl.includes("Delivered"));
    assert.ok(!statusControl.includes("Processing"));
    const shipped = render("Vendor", { ...data, status: "Shipped", fulfillments: data.fulfillments.map(group => ({ ...group, status: "Shipped" })) }, true);
    assert.match(shipped, /<option value="OutForDelivery" selected="">Out for delivery<\/option>/);
    assert.ok(shipped.includes("Update to Out for delivery"));
    assert.ok(render("Admin", data, true).includes("Explicitly override"));
    for (const role of ["Admin", "Vendor"]) {
      const ready = render(role, { ...data, invoiceNumber: "NESTIN2600001", invoiceAvailable: true }, true);
      assert.ok(ready.includes("Download invoice (PDF)"), role);
      assert.ok(ready.includes("View invoice"), role);
      assert.ok(ready.includes('aria-haspopup="dialog"'), role);
      assert.ok(ready.includes('aria-expanded="false"'), role);
      assert.ok(ready.includes("NESTIN2600001"), role);
      assert.ok(ready.indexOf("Download invoice (PDF)") < ready.indexOf("Order information"), `${role} invoice is near the top`);
      const unavailable = render(role, { ...data, invoiceAvailable: false }, true);
      assert.ok(!unavailable.includes("Download invoice (PDF)"), `${role} must wait for the complete order`);
      assert.ok(!unavailable.includes("View invoice"), `${role} preview must wait for the complete order`);
      assert.ok(unavailable.includes("complete order is delivered"));
      const preview = managedView(role, { ...data, invoiceAvailable: true }, { invoicePreview: { url: `blob:invoice-${role}`, name: "NESTIN2600001.pdf" } });
      assert.ok(preview.includes('id="managed-invoice-preview"'));
      assert.match(preview, /<dialog[^>]*id="managed-invoice-preview"[^>]*aria-modal="true"/);
      assert.ok(preview.includes('aria-labelledby="managed-invoice-preview-title"'));
      assert.ok(!preview.includes('<section id="managed-invoice-preview"'));
      assert.ok(preview.includes('aria-expanded="true"'));
      assert.ok(preview.includes(`<object data="blob:invoice-${role}" type="application/pdf"`));
      assert.ok(preview.includes('download="NESTIN2600001.pdf"'));
      assert.ok(preview.includes("Close preview"));
      assert.ok(preview.includes("Your browser cannot display this PDF."));
      const opening = managedView(role, { ...data, invoiceAvailable: true }, { invoiceBusy: true, invoiceViewBusy: true });
      assert.match(opening, /<button[^>]*disabled=""[^>]*>[\s\S]*?Opening invoice/);
      assert.ok(!opening.includes("Downloading invoice"));
      assert.ok(managedView(role, data, { invoiceError: "Invoice preview failed. Retry." }).includes('role="alert">Invoice preview failed. Retry.'));
      assert.ok(!managedView(role, { ...data, invoiceAvailable: false }, { invoicePreview: { url: "blob:old-invoice", name: "old.pdf" } }).includes("<object"));
    }
    const tracking = customer({ ...data, invoiceNumber: "NESTIN2600001" });
    assert.ok(tracking.includes("Order tracking"));
    assert.ok(tracking.includes("Delivered safely"));
    assert.ok(tracking.includes("Download invoice (PDF)"));
    assert.ok(tracking.includes("NESTIN2600001"));
    const firstInvoice = customer({ ...data, number: "MNOR2600003", invoiceNumber: "NESTIN2600001" });
    assert.ok(firstInvoice.includes("NESTIN2600001"));
    assert.ok(!firstInvoice.includes("NESTIN2600003"));
    assert.ok(!customer({ ...data, number: "MNOR2600003", invoiceNumber: null }).includes("NESTIN"), "Never invent an invoice number before first download");
    assert.ok(!tracking.includes("INV-MNOR"));
    assert.ok(tracking.indexOf("Download invoice (PDF)") < tracking.indexOf('id="pod-reference-title"'), "The invoice download appears above the order summary and delivery timeline");
    for (const status of ["Pending", "Processing", "Shipped", "OutForDelivery", "Cancelled"]) {
      const page = customer({ ...data, status });
      assert.ok(!page.includes("Download invoice (PDF)"), status);
      assert.ok(page.includes("after payment is verified and your order is delivered"), status);
    }
    assert.ok(!customer({ ...data, paymentStatus: "Pending" }).includes("Download invoice (PDF)"));
    const downloading = customer(data, { invoiceBusy: true });
    assert.match(downloading, /<button[^>]*disabled=""[^>]*>[\s\S]*?Downloading invoice/);
    assert.ok(customer(data, { invoiceError: "Invoice download failed. Retry." }).includes('role="alert">Invoice download failed. Retry.'));
    const cancelled = customer({ ...data, status: "Cancelled", paymentStatus: "Pending" });
    assert.ok(cancelled.includes("This order has been cancelled."));
    assert.ok(!cancelled.includes("Pay INR"));
  } finally {
    await server.close();
    if (previous === undefined) delete globalThis[key]; else globalThis[key] = previous;
  }
});

test("invoice downloads use the server's filename and preserve existing Blob downloads", async t => {
  const originalWindow = globalThis.window;
  globalThis.window = { location: { origin: "http://localhost:5173" } };
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    cacheDir: fileURLToPath(new URL("../node_modules/.vite-invoice-download-tests/", import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    plugins: [{ name: "invoice-api-auth", enforce: "pre",
      resolveId(id) { if (id.endsWith("services/apollo")) return "\0invoice-auth"; },
      load(id) { if (id === "\0invoice-auth") return "export const mutate = async () => {};"; },
    }],
  });
  try {
    const { customerRequest } = await server.ssrLoadModule("/src/modules/customer/services/workspace.api.js");
    const { adminRequest } = await server.ssrLoadModule("/src/modules/admin/api.js");
    const { vendorRequest } = await server.ssrLoadModule("/src/modules/vendor/services/workspace.api.js");
    t.mock.method(globalThis, "fetch", async () => new Response("%PDF-sample", { headers: {
      "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="NESTIN2600001.pdf"',
    } }));
    for (const request of [customerRequest, adminRequest, vendorRequest]) {
      const file = await request("/orders/order-three/invoice", { download: true, includeFilename: true });
      assert.equal(file.name, "NESTIN2600001.pdf");
      assert.equal(await file.blob.text(), "%PDF-sample");
      const legacy = await request("/payments/payment/receipt", { download: true });
      assert.ok(legacy instanceof Blob);
      assert.equal(await legacy.text(), "%PDF-sample");
    }
  } finally {
    await server.close();
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  }
});
