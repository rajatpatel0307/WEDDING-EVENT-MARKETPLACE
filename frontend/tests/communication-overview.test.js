import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("communication overview renders participant identities, profile links, context, counts and safe fallbacks", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    plugins: [
      {
        name: "communication-overview-render",
        enforce: "pre",
        resolveId(id) {
          if (id === "virtual:communication-check.jsx")
            return "\0communication-check.jsx";
        },
        load(id) {
          if (id.endsWith("/src/modules/communication/api.js"))
            return "export async function communicationRequest() { throw Error('No requests during static rendering'); }";
          if (id === "\0communication-check.jsx")
            return `
          import React from "react";
          import { renderToStaticMarkup } from "react-dom/server";
          import { MemoryRouter } from "react-router-dom";
          import Overview, { ConversationTable, CommunicationActivityTable } from "/src/modules/communication/CommunicationOverview.jsx";
          const render = element => renderToStaticMarkup(React.createElement(MemoryRouter, null, element));
          export const participants = rows => render(React.createElement(ConversationTable, { rows }));
          export const metrics = data => render(React.createElement(CommunicationActivityTable, { data }));
          export const initial = () => render(React.createElement(Overview));
        `;
        },
      },
    ],
  });
  try {
    const render = await server.ssrLoadModule(
      "virtual:communication-check.jsx",
    );
    const row = {
      id: "conversation",
      customerId: "customer-id",
      vendorId: "vendor-id",
      customerName: "Asha Shah",
      vendorName: "Lotus Events",
      eventName: "Wedding celebration",
      bookingNumber: "BK-100",
      messageCount: 0,
      updatedAt: "2026-11-22T10:00:00Z",
    };
    const html = render.participants([row]);
    for (const value of [
      "Asha Shah",
      "Lotus Events",
      "Wedding celebration",
      "BK-100",
      'href="/admin/customers/customer-id"',
      'href="/admin/vendors/vendor-id"',
      "22 Nov 2026",
      "03:30 pm",
      "IST",
    ])
      assert.ok(html.includes(value), value);
    assert.match(html, />0<\/span>/);
    const fallback = render.participants([
      {
        ...row,
        customerName: "",
        vendorName: "<script>unsafe</script>",
        eventName: null,
        bookingNumber: null,
        updatedAt: "invalid",
      },
    ]);
    for (const value of [
      "Unnamed customer",
      "General enquiry",
      "Unavailable",
      "&lt;script&gt;unsafe&lt;/script&gt;",
    ])
      assert.ok(fallback.includes(value), value);
    assert.doesNotMatch(fallback, /<script>|Invalid Date/);
    const metrics = render.metrics({
      conversations: 3,
      messagesToday: 0,
      awaitingDelivery: 0,
      unreadNotifications: 72,
    });
    assert.ok(metrics.includes("Last 24 hours"));
    assert.match(metrics, />0<\/td>/);
    const loading = render.initial();
    assert.ok(loading.includes("Communication overview"));
    assert.ok(loading.includes("Loading conversations"));
    assert.ok(loading.includes("Refreshing…"));
    assert.ok(
      loading.includes(
        'aria-label="Search conversations by customer, vendor, event or booking"',
      ) ||
        loading.includes(
          "Search conversations by customer, vendor, event or booking</span>",
        ),
    );
  } finally {
    await server.close();
  }
});
