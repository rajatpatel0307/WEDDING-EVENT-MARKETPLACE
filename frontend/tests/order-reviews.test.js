import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const orderId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";

test("delivered order details collect and display item ratings on the same page", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    plugins: [{
      name: "order-review-fixtures", enforce: "pre",
      resolveId(id) { if (id === "virtual:order-reviews") return "\0order-reviews"; },
      load(id) {
        if (id.endsWith("/reviews/api.js")) return `
          export const useReviews = path => ({ data: path === '/reviews/eligible-orders' ? globalThis.__orderReviewTargets : [] });
          export const reviewRequest = () => {}; export const reviewSave = () => {}; export const imageUrl = () => '';
        `;
        if (id === "\0order-reviews") return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { MemoryRouter } from 'react-router-dom';
          import PurchaseOrderDetails from '/src/modules/commerce/PurchaseOrderDetails.jsx';
          import { ReviewForm } from '/src/modules/reviews/Reviews.jsx';
          export const render = data => renderToStaticMarkup(React.createElement(MemoryRouter, null,
            React.createElement(PurchaseOrderDetails, { data, onReview() {}, onPay() {}, onRefresh() {} })));
          export const form = (orderId, orderItemId, items) => {
            globalThis.__orderReviewTargets = items;
            return renderToStaticMarkup(React.createElement(ReviewForm, { orderId, orderItemId, close() {}, done() {} }));
          };
        `;
      },
    }],
  });
  const previousWindow = globalThis.window;
  globalThis.window = { location: { origin: "http://localhost:5173" } };
  try {
    const { render, form } = await server.ssrLoadModule("virtual:order-reviews");
    const line = { id: itemId, name: "Wedding decor", vendor: "Decor studio", status: "Delivered", quantity: 1, price: 100, total: 100, canReview: true };
    const data = { id: orderId, number: "MNOR2600001", status: "Delivered", paymentStatus: "Paid", total: 100, subtotal: 100, address: {}, lines: [line], history: [] };
    const delivered = render(data);
    assert.ok(delivered.includes("Ratings &amp; reviews"));
    assert.ok(delivered.includes('aria-label="Write a review for Wedding decor"'));
    for (const status of ["Pending", "Processing", "Shipped", "OutForDelivery", "Cancelled"]) {
      assert.ok(!render({ ...data, status }).includes('aria-label="Write a review for Wedding decor"'));
    }
    assert.ok(!render({ ...data, paymentStatus: "Pending" }).includes('aria-label="Write a review for Wedding decor"'));
    const reviewed = render({ ...data, lines: [{ ...line, canReview: false, review: { rating: 4, text: "Arrived on time and looked beautiful" } }] });
    assert.ok(reviewed.includes("Your rating for Wedding decor: 4 out of 5 stars"));
    assert.ok(reviewed.includes("Arrived on time and looked beautiful"));
    assert.ok(!reviewed.includes('aria-label="Write a review for Wedding decor"'));
    const modal = form(orderId.toUpperCase(), itemId.toUpperCase(), [
      { orderId, orderItemId: itemId, number: "MNOR2600001", service: "Wedding decor", vendor: "Decor studio" },
      { orderId: "33333333-3333-4333-8333-333333333333", orderItemId: itemId, number: "FOREIGN-ORDER", service: "Other item", vendor: "Other vendor" },
    ]);
    assert.ok(modal.includes("MNOR2600001") && modal.includes("Wedding decor"));
    assert.ok(!modal.includes("FOREIGN-ORDER"));
    assert.match(modal, new RegExp(`value="order:${orderId}:${itemId}" selected=""`));
    assert.ok(modal.includes("Publish review"));
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    delete globalThis.__orderReviewTargets;
    await server.close();
  }
});
