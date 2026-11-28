import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("review workspaces keep published feedback, separate rating targets and reply actions", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{
      name: "review-workspace-fixtures", enforce: "pre",
      resolveId(id) { if (id === "virtual:review-workspace") return "\0review-workspace"; },
      load(id) {
        if (id.endsWith("/reviews/api.js")) return `
          export const useReviews = path => globalThis.__reviewWorkspaceData(path);
          export const reviewSave = () => {}; export const reviewRequest = () => {};
          export const imageUrl = id => '/review-images/' + id;
        `;
        if (id.endsWith("/communication/useCommunicationSocket.js")) return "export const useCommunicationSocket = () => null;";
        if (id === "\0review-workspace") return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { MemoryRouter } from 'react-router-dom';
          import ReviewsWorkspace, { ReviewForm } from '/src/modules/reviews/Reviews.jsx';
          export function render(data, route = '/admin/reviews', role = 'Admin') {
            globalThis.__reviewWorkspaceData = path => {
              if (!path) return {};
              if (path === '/admin/review-analytics') return { data: data.analytics };
              if (path === '/vendor/rating-summary') return { data: data.summary };
              if (path === '/admin/reviews/filters') return { data: { vendors: [], services: [], categories: [] } };
              if (path.startsWith('/admin/review-reports')) return { data: { rows: [], total: 0, pageSize: 10 } };
              return { data: { rows: data.rows, total: data.rows.length, pageSize: 10 } };
            };
            return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(ReviewsWorkspace, { role })));
          }
          export function renderForm(review) {
            globalThis.__reviewWorkspaceData = () => ({ data: [] });
            return renderToStaticMarkup(React.createElement(ReviewForm, { review, close() {}, done() {} }));
          }
        `;
      },
    }],
  });
  try {
    const { render, renderForm } = await server.ssrLoadModule("virtual:review-workspace");
    const analytics = { counts: [{ status: "Approved", count: 12 }], totalApproved: 12, averageRating: 4.25, pendingReports: 2, vendors: [{ id: "vendor-1", name: "Garden Events", rating: 4.5, count: 8 }], trends: [{ month: "2026-11", count: 12, rating: 4.25 }] };
    const row = { id: "review-1", customer: "A Customer", vendor: "Garden Events", rating: 5, title: "A lovely day", text: "Wonderful service", status: "Approved", verified: true };
    const html = render({ analytics, rows: [row] }, "/admin/reviews?status=Pending");
    for (const text of ["Reviews &amp; ratings", "Published reviews", "4.25", "Garden Events", "A lovely day", "Clear filters", "Reported content"]) assert.ok(html.includes(text), text);
    assert.doesNotMatch(html, /ADMIN WORKSPACE|COMMUNITY &amp; TRUST|Manage customer feedback|No approval required|Reviews publish instantly/);
    assert.doesNotMatch(html, />Approve<|>Reject<|Review moderation|<option[^>]*value="Pending"/);
    assert.match(html, /aria-pressed="true"[^>]*>All reviews</);
    assert.match(html, />Hide</);
    assert.match(html, />Flag</);
    const empty = render({ analytics: { counts: [], totalApproved: 0, pendingReports: 0, vendors: [], trends: [] }, rows: [] });
    assert.ok(empty.includes("No reviews here yet"));
    assert.ok(empty.includes("Vendor rankings appear after their first published review."));
    const form = renderForm({ id: "review-1", rating: 4, title: "My review", text: "Our celebration" });
    assert.ok(form.includes("Save changes") && form.includes("Published immediately"));
    assert.doesNotMatch(form, /Submit for moderation|Save for moderation|Reviewed before publication/);
    const summary = { averageRating: 4, totalReviews: 1, verifiedReviews: 1, responseRate: 0, distribution: [{ rating: 4, count: 1 }], trends: [{ month: "2026-11", count: 1, rating: 4 }], services: [{ id: "service-1", name: "Wedding decor", rating: 3, count: 2 }] };
    const vendor = render({ summary, rows: [{ ...row, bookingId: "booking-1" }] }, "/vendor/reviews", "Vendor");
    assert.ok(vendor.includes("Customer experiences") && vendor.includes("Based on 1 review"));
    assert.ok(vendor.includes("Wedding decor") && vendor.includes("2 reviews"));
    assert.match(vendor, /href="\/vendor\/bookings\/booking-1"/);
    assert.ok(vendor.includes("Write a response") && vendor.includes("Report review"));
    const replied = render({ summary: { ...summary, responseRate: 100 }, rows: [{ ...row, response: { id: "reply-1", text: "Thank you for celebrating with us!" } }] }, "/vendor/reviews", "Vendor");
    assert.ok(replied.includes("Thank you for celebrating with us!") && replied.includes("Edit response") && replied.includes("Delete response"));
    const emptyVendor = render({ summary: { services: [], trends: [], totalReviews: 0 }, rows: [] }, "/vendor/reviews", "Vendor");
    assert.ok(emptyVendor.includes("Based on 0 reviews") && emptyVendor.includes("No reviews here yet"));
  } finally {
    delete globalThis.__reviewWorkspaceData;
    await server.close();
  }
});
