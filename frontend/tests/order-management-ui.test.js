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
        if (id === "\0order-api") return "export const adminRequest = async () => ({}); export const vendorRequest = adminRequest;";
        if (id === "\0order-customer-api") return "export const money = value => 'INR ' + value;";
        if (id === "\0order-live") return "export const useOrderUpdates = () => {};";
        if (id === "\0order-pages") return `
          import React from 'react';
          import {renderToStaticMarkup} from 'react-dom/server';
          import {MemoryRouter,Routes,Route} from 'react-router-dom';
          import OrderManagement,{ManagedOrderDetails} from '/src/modules/commerce/OrderManagement.jsx';
          import PurchaseOrderDetails from '/src/modules/commerce/PurchaseOrderDetails.jsx';
          export function render(role, data, details=false) {
            globalThis.${key}={data,loading:false,refresh() {}};
            return renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/'+role.toLowerCase()+'/orders/order-id']},
              React.createElement(Routes,null,React.createElement(Route,{path:'/:role/orders/:id',element:React.createElement(details?ManagedOrderDetails:OrderManagement,{role})}))));
          }
          export const customer = data => renderToStaticMarkup(React.createElement(MemoryRouter,null,
            React.createElement(PurchaseOrderDetails,{data,busy:false,onPay() {},onRefresh() {}})));
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
    const { render, customer } = await server.ssrLoadModule("virtual:order-pages");
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
    const tracking = customer(data);
    assert.ok(tracking.includes("Order tracking"));
    assert.ok(tracking.includes("Delivered safely"));
    const cancelled = customer({ ...data, status: "Cancelled", paymentStatus: "Pending" });
    assert.ok(cancelled.includes("This order has been cancelled."));
    assert.ok(!cancelled.includes("Pay INR"));
  } finally {
    await server.close();
    if (previous === undefined) delete globalThis[key]; else globalThis[key] = previous;
  }
});
