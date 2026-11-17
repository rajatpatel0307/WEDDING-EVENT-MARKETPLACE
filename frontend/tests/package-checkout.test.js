import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("checkout displays the selected package price and blocks missing packages", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "package-checkout-fixtures", enforce: "pre",
      resolveId(id) {
        if (id === "virtual:package-checkout-test") return "\0package-checkout-test";
        if (id.endsWith("/context/AuthContext")) return "\0package-auth";
        if (id.endsWith("/components/WishlistButton")) return "\0package-wishlist";
      },
      load(id) {
        if (id === "\0package-auth") return "export const useAuth = () => ({ user: { firstName: 'Customer' }, notify() {} });";
        if (id === "\0package-wishlist") return "export default function WishlistButton() { return null; }";
        if (id === "\0package-checkout-test") return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { createMemoryRouter, RouterProvider } from 'react-router-dom';
          import { BookingCheckout } from '/src/modules/commerce/CheckoutPages.jsx';
          import DetailPage from '/src/modules/marketplace/DetailPage.jsx';
          export function render(data, query = '') {
            globalThis.__packageCheckoutData = data;
            const router = createMemoryRouter([{ path: '/customer/booking-checkout/:id', element: React.createElement(BookingCheckout) }], { initialEntries: ['/customer/booking-checkout/service-1' + query] });
            return renderToStaticMarkup(React.createElement(RouterProvider, { router }));
          }
          export function listing(data) {
            globalThis.__packageCheckoutData = data;
            const router = createMemoryRouter([{ path: '/packages/:id', element: React.createElement(DetailPage) }], { initialEntries: ['/packages/package-1'] });
            return renderToStaticMarkup(React.createElement(RouterProvider, { router }));
          }
        `;
      },
      transform(code, id) {
        if (id.replaceAll('\\', '/').endsWith('/marketplace/api.js')) {
          const start = code.indexOf('export function useMarketplace(');
          const end = code.indexOf('export const money', start);
          return code.slice(0, start) + `export function useMarketplace(path) {
            return { data: path?.startsWith('/packages/') ? { serviceId: 'service-1' } : globalThis.__packageCheckoutData, loading: false };
          }\n` + code.slice(end);
        }
        if (!id.replaceAll('\\', '/').endsWith('/customer/components/WorkspaceUI.jsx')) return;
        const start = code.indexOf('export function useCustomerData(');
        const end = code.indexOf('\nexport ', start + 1);
        assert.ok(start >= 0 && end > start);
        return code.slice(0, start) + `export function useCustomerData(path) {
          return { data: path.startsWith('/services/') ? globalThis.__packageCheckoutData : { rows: [] }, loading: false };
        }\n` + code.slice(end);
      },
    }],
  });
  const previousWindow = globalThis.window;
  globalThis.window = { location: { origin: "http://localhost:5173" } };
  try {
    const { render, listing } = await server.ssrLoadModule("virtual:package-checkout-test");
    const data = {
      service: { id: "service-1", name: "Wedding venue", vendor: "Wedding vendor",
        bookingAccessStatus: "Approved", bookEnabled: true,
        offer: { type: "Book", book: { price: 1, available: true, minimum: 1, maximum: 1,
          duration: "Daily", mode: "Scheduled", slots: [] } } },
      packages: [{ id: "package-1", name: "Wedding full plan", price: 150000 }],
      coverage: {}, policies: {}, items: [], gallery: [],
    };
    let html = render(data, "?package=PACKAGE-1");
    assert.ok(html.includes("Wedding full plan"));
    assert.ok(html.includes("₹1,50,000"));
    assert.ok(!html.includes("Booking unavailable"));
    html = render(data);
    assert.ok(html.includes("Wedding venue"));
    assert.ok(!html.includes("₹1,50,000"));
    html = render(data, "?package=missing");
    assert.ok(html.includes("Booking unavailable"));
    html = render({ ...data, service: { ...data.service, bookingAccessStatus: "Suspended" } }, "?package=package-1");
    assert.ok(html.includes("Booking unavailable"));
    const packageButton = (html) => html.match(/<button[^>]*>Choose package[\s\S]*?<\/button>/)?.[0];
    html = listing(data);
    assert.ok(packageButton(html), "package must have a choose action");
    assert.ok(!packageButton(html).includes('disabled=""'), "an approved booking offer must allow choosing a package");
    html = listing({ ...data, service: { ...data.service, bookingAccessStatus: "Suspended" } });
    assert.ok(packageButton(html).includes('disabled=""'), "suspended vendor booking access must still block package selection");
  } finally {
    delete globalThis.__packageCheckoutData;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    await server.close();
  }
});
