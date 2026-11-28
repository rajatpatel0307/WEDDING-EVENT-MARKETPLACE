import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("booking details show the customer's actual vendor and service ratings without combining them", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    plugins: [{
      name: "customer-booking-rating-fixtures",
      resolveId(id) { if (id === "virtual:booking-ratings") return "\0booking-ratings"; },
      load(id) {
        if (id === "\0booking-ratings") return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { MemoryRouter } from 'react-router-dom';
          import CustomerBookingDetails from '/src/modules/customer/pages/CustomerBookingDetails.jsx';
          export function render(data) {
            return renderToStaticMarkup(React.createElement(MemoryRouter, null,
              React.createElement(CustomerBookingDetails, { id: 'booking-1', data,
                config: { data: { enabled: true } }, refresh() {}, message() {}, onReview() {},
              })));
          }
        `;
      },
    }],
  });
  const previousWindow = globalThis.window;
  globalThis.window = { location: { origin: "http://localhost:5173" } };
  try {
    const { render } = await server.ssrLoadModule("virtual:booking-ratings");
    const booking = {
      booking: { BookingNumber: "MNBK2600006", BookingStatus: "Completed", PaymentStatus: "Paid", TotalAmount: 100, PaidAmount: 100, RemainingAmount: 0 },
      checkout: { vendor: "Wedding vendor" },
      items: [{ id: 42, name: "Wedding venue", quantity: 1, price: 100, total: 100 }],
      history: [], requests: [], refunds: [], actions: {}, policy: [],
    };
    const service = { id: "review-service", bookingItemId: 42, rating: 3, text: "The venue was fine", status: "Approved", communicationRating: 4 };
    const html = render({ ...booking, reviews: [
      { id: "review-vendor", bookingItemId: null, rating: 5, text: "Excellent vendor", status: "Approved" },
      service,
    ] });
    assert.ok(html.includes("Your ratings &amp; reviews"));
    assert.ok(html.includes("Your overall vendor rating: 5 out of 5 stars"));
    assert.ok(html.includes("Your rating for Wedding venue: 3 out of 5 stars"));
    assert.ok(html.includes("Excellent vendor") && html.includes("The venue was fine"));
    assert.ok(html.includes("Communication") && html.includes("4 / 5"));
    assert.ok(html.indexOf("Payments processed through secure checkout") < html.indexOf('id="bd-ratings-title"'), "ratings belong in a separate card after the payment summary");
    assert.equal((html.match(/aria-label="Your overall vendor rating: 5 out of 5 stars"/g) || []).length, 1);
    const feedbackCard = (markup) => markup.slice(markup.indexOf('id="bd-feedback-title"'), markup.indexOf("bd-review "));
    assert.ok(feedbackCard(html).includes("Your overall vendor rating: 5 out of 5 stars"));
    assert.ok(feedbackCard(html).includes("Excellent vendor") && feedbackCard(html).includes("The venue was fine"));
    const serviceOnly = render({ ...booking, reviews: [service] });
    assert.ok(serviceOnly.includes("Your rating for Wedding venue: 3 out of 5 stars"));
    assert.ok(!serviceOnly.includes("Your overall vendor rating:"));
    assert.ok(feedbackCard(serviceOnly).includes("Your rating for Wedding venue: 3 out of 5 stars"));
    assert.ok(feedbackCard(serviceOnly).includes("The venue was fine"));
    const unrated = render({ ...booking, reviews: [] });
    assert.ok(!unrated.includes('id="bd-feedback-title"'));
    assert.ok(unrated.includes("Write a review"));
    assert.ok(!unrated.includes("0 out of 5 stars"));
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    await server.close();
  }
});
