import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("service details preserve review permissions and accurately summarize listing data", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    plugins: [
      {
        name: "service-details-test-fixtures",
        enforce: "pre",
        resolveId(id) {
          if (id === "virtual:service-details-test")
            return "\0service-details-test";
          if (id.endsWith("/context/AuthContext")) return "\0details-test-auth";
        },
        load(id) {
          if (id === "\0details-test-auth")
            return "export const useAuth = () => ({ notify() {} });";
          if (id === "\0service-details-test")
            return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { createMemoryRouter, RouterProvider } from 'react-router-dom';
          import ServiceDetails from '/src/modules/vendor/service-management/ServiceDetails.jsx';
          export function render(service, response = {}) {
            globalThis.__serviceDetailsTestData = path => path === '/services/metadata'
              ? { data: { categories: [{ id: 1, name: 'Venue & Location' }], subcategories: [], templates: { 'Venue & Location': [{ key: 'parking', label: 'Guest parking' }] }, vendorName: 'Celebrations' } }
              : { data: service, loading: false, retry() {}, ...response };
            const router = createMemoryRouter([{ path: '/vendor/services/:id', element: React.createElement(ServiceDetails) }], { initialEntries: ['/vendor/services/venue-1'] });
            return renderToStaticMarkup(React.createElement(RouterProvider, { router }));
          }
        `;
        },
        transform(code, id) {
          if (
            !id
              .replaceAll("\\", "/")
              .endsWith("/vendor/components/WorkspaceUI.jsx")
          )
            return;
          const start = code.indexOf("export function useVendorData(");
          const end = code.indexOf("export function Badge(", start);
          return (
            code.slice(0, start) +
            "export function useVendorData(path) { return globalThis.__serviceDetailsTestData(path); }\n" +
            code.slice(end)
          );
        },
      },
    ],
  });
  const hadWindow = "window" in globalThis;
  const previousWindow = globalThis.window;
  globalThis.window = { location: { origin: "http://localhost:5173" } };
  try {
    const { render } = await server.ssrLoadModule(
      "virtual:service-details-test",
    );
    const service = {
      id: "venue-1",
      name: "Wedding Hall",
      categoryId: 1,
      status: "UnderReview",
      active: true,
      price: 125000,
      serviceType: "On site",
      updatedAt: "2026-11-16T08:00:00Z",
      pricing: { unit: "Per Event" },
      location: { city: "Jaipur", state: "Rajasthan" },
      availability: {
        days: [1, 2, 3, 4, 5],
        start: "09:00",
        end: "20:00",
        noticeHours: 24,
      },
      attributes: { capacity: 300, parking: false, ac: true, rooms: 0 },
      actions: { edit: false, duplicate: true },
      images: [{ id: "photo-1", url: "/venue.jpg", primary: true }],
      items: [
        { name: "Tables", quantity: 20, unit: "tables", included: true },
        { name: "Decor", included: false },
      ],
      policies: { advanceRequired: true, advancePercentage: 25 },
    };
    let html = render(service);
    assert.ok(html.includes("Your service is under review"));
    assert.ok(html.includes("Awaiting approval"));
    assert.ok(
      !html.includes("Active listing"),
      "unapproved active flag must not imply an active listing",
    );
    assert.ok(html.includes("Editing unavailable for Wedding Hall"));
    assert.ok(
      !html.includes('href="/vendor/services/venue-1/edit'),
      "review locks must retain edit restrictions",
    );
    assert.equal((html.match(/role="tab"/g) || []).length, 13);
    assert.match(
      html,
      /id="service-tab-Overview" aria-selected="true" aria-controls="service-details-panel"/,
    );
    assert.match(
      html,
      /role="tabpanel" aria-labelledby="service-tab-Overview"/,
    );
    assert.ok(html.includes("₹1,25,000"));
    assert.ok(html.includes("5 days a week"));
    assert.ok(html.includes("Up to 300"));
    assert.match(html, /<dt>Guest parking<\/dt><dd>Not available<\/dd>/);
    assert.match(
      html,
      /<dt>rooms<\/dt><dd>0<\/dd>/,
      "zero values must not disappear",
    );
    assert.ok(html.includes("Tables"));
    assert.ok(
      !html.includes("Decor"),
      "optional items must not be shown as included",
    );
    assert.ok(html.includes("25% required"));
    assert.ok(html.includes("Open photo gallery for Wedding Hall"));

    html = render({ ...service, status: "Pending" });
    assert.ok(html.includes("Your service is awaiting approval"));
    assert.ok(!html.includes("Your service is under review"));
    html = render({ ...service, status: "Approved" });
    assert.ok(html.includes("Active listing"));
    assert.ok(!html.includes("Track progress"));
    html = render({ ...service, status: "Approved", active: false });
    assert.ok(html.includes("Inactive listing"));
    assert.ok(!html.includes("Active listing"));

    html = render({
      ...service,
      status: "Draft",
      images: [],
      items: [],
      actions: { edit: true },
      price: 0,
      pricing: { unit: "Custom" },
      availability: {},
    });
    assert.ok(html.includes("Add service photos"));
    assert.ok(html.includes("On request"));
    assert.ok(
      !html.includes("₹0"),
      "an unpriced custom quote must not appear free",
    );
    assert.ok(!html.includes("Open photo gallery"));
    assert.ok(html.includes("Working hours not set"));
    html = render({ ...service, images: [] });
    assert.ok(
      !html.includes("Add service photos"),
      "locked services must not offer uploading",
    );
    assert.ok(html.includes("Service photos will appear here once added."));

    html = render(service, { loading: true });
    assert.ok(
      !html.includes("Wedding Hall"),
      "stale service data must not render while loading",
    );
    html = render(service, { error: new Error("Service unavailable") });
    assert.ok(html.includes("Service unavailable"));
    assert.ok(!html.includes("Wedding Hall"));
  } finally {
    delete globalThis.__serviceDetailsTestData;
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
    await server.close();
  }
});
