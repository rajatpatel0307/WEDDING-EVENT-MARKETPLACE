import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("cart and checkout separate item editing from address collection and order review", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "cart-checkout-fixtures", enforce: "pre",
      resolveId(id) {
        if (id === "virtual:cart-checkout-test") return "\0cart-checkout-test";
        if (id.endsWith("/context/AuthContext")) return "\0cart-checkout-auth";
      },
      load(id) {
        if (id === "\0cart-checkout-auth") return `export const useAuth = () => ({ user: { firstName: 'Example', lastName: 'Customer', email: 'customer@example.test', phone: '0123456789' }, notify() {} });`;
        if (id === "\0cart-checkout-test") return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { createMemoryRouter, RouterProvider } from 'react-router-dom';
          import { CartPage, CartCheckout } from '/src/modules/commerce/CheckoutPages.jsx';
          export function render(fixture, checkout = false) {
            globalThis.__cartCheckoutFixture = fixture;
            globalThis.__cartCheckoutPaths = [];
            const router = createMemoryRouter([
              { path: '/customer/cart', element: React.createElement(CartPage) },
              { path: '/customer/checkout', element: React.createElement(CartCheckout) },
            ], { initialEntries: [checkout ? '/customer/checkout' : '/customer/cart'] });
            const html = renderToStaticMarkup(React.createElement(RouterProvider, { router }));
            return { html, paths: globalThis.__cartCheckoutPaths };
          }
        `;
      },
      transform(code, id) {
        if (!id.replaceAll("\\", "/").endsWith("/customer/components/WorkspaceUI.jsx")) return;
        const start = code.indexOf("export function useCustomerData(");
        const end = code.indexOf("\nexport ", start + 1);
        assert.ok(start >= 0 && end > start);
        return code.slice(0, start) + `export function useCustomerData(path) {
          globalThis.__cartCheckoutPaths.push(path);
          const fixture = globalThis.__cartCheckoutFixture;
          if (path === '/cart') return { data: fixture.cart, loading: fixture.loading || false, error: fixture.error, retry() {} };
          return { data: { rows: fixture.addresses || [] }, loading: false, retry() {} };
        }\n` + code.slice(end);
      },
    }],
  });
  const previousWindow = globalThis.window;
  globalThis.window = { location: { origin: "http://localhost:5173" } };
  try {
    const { render } = await server.ssrLoadModule("virtual:cart-checkout-test");
    const fixture = {
      cart: { lines: [{ id: "product-1", name: "Celebration product", vendor: "Vendor", price: 1000, quantity: 2, stock: 10, minimum: 1, maximum: 10 }], subtotal: 2000 },
      addresses: [{ id: "address-1", fullName: "Example Customer", line1: "10 Example Street", city: "Noida" }],
    };
    const cart = render(fixture);
    assert.ok(cart.html.includes("Your cart"));
    assert.ok(cart.html.includes("Proceed to checkout"));
    assert.ok(cart.html.includes('aria-label="Quantity for Celebration product"'));
    assert.ok(cart.html.includes('aria-label="Remove Celebration product from cart"'));
    assert.ok(!cart.html.includes("Shipping / billing address"));
    assert.ok(!cart.html.includes("Customer details"));
    assert.ok(!cart.html.includes("Review order"));
    assert.ok(!cart.html.includes("Continue to payment"));
    assert.ok(!cart.html.includes('aria-label="Checkout progress"'));
    assert.deepEqual(cart.paths, ["/cart"], "cart must not load addresses");
    const proceed = (html) => html.match(/<button[^>]*>\s*(?:Updating\.\.\.|Proceed to checkout)[\s\S]*?<\/button>/)?.[0];
    assert.ok(proceed(cart.html) && !proceed(cart.html).includes('disabled=""'));

    const checkout = render(fixture, true);
    assert.ok(checkout.html.includes("Checkout"));
    assert.ok(checkout.html.includes("Shipping / billing address"));
    assert.ok(checkout.html.includes("10 Example Street"));
    assert.ok(checkout.html.includes("Customer details"));
    assert.ok(checkout.html.includes("Add new address"));
    assert.ok(checkout.html.includes("Review order"));
    assert.ok(checkout.html.includes('href="/customer/cart"'));
    assert.ok(!checkout.html.includes('aria-label="Quantity for Celebration product"'));
    assert.ok(!checkout.html.includes("Proceed to checkout"));
    assert.ok(!checkout.html.includes("Continue to payment"), "confirmation only appears after server review");
    assert.deepEqual(checkout.paths, ["/cart", "/addresses?pageSize=50"]);
    assert.match(checkout.html, /<button[^>]*disabled=""[^>]*>\s*Review order/);

    const unavailable = render({ ...fixture, cart: { lines: [{ ...fixture.cart.lines[0], unavailable: "Out of stock" }] } });
    assert.ok(proceed(unavailable.html).includes('disabled=""'));
    const refreshing = render({ ...fixture, loading: true });
    assert.ok(proceed(refreshing.html).includes('disabled=""'));
    for (const checkout of [false, true]) {
      const empty = render({ cart: { lines: [] } }, checkout);
      assert.ok(empty.html.includes("Your cart is empty"));
      assert.ok(!empty.html.includes("Proceed to checkout"));
      assert.ok(!empty.html.includes("Review order"));
      assert.ok(!empty.html.includes("Shipping / billing address"));
    }
    const failed = render({ error: new Error("Unable to load cart") });
    assert.ok(failed.html.includes("Unable to load cart"));
  } finally {
    delete globalThis.__cartCheckoutFixture;
    delete globalThis.__cartCheckoutPaths;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    await server.close();
  }
});
