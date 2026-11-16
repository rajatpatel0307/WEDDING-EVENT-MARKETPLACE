import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("availability page loads saved hours, protects booked days and respects schedule editing access", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    plugins: [
      {
        name: "availability-test-fixtures",
        enforce: "pre",
        resolveId(id) {
          if (id === "virtual:availability-test") return "\0availability-test";
          if (id.endsWith("/context/AuthContext"))
            return "\0availability-test-auth";
        },
        load(id) {
          if (id === "\0availability-test-auth")
            return "export const useAuth = () => ({ notify() {} });";
          if (id === "\0availability-test")
            return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { MemoryRouter, Routes, Route } from 'react-router-dom';
          import ServiceAvailability from '/src/modules/vendor/service-management/ServiceAvailability.jsx';
          export function render(service, rows, response = {}) {
            globalThis.__availabilityTestData = path => path.endsWith('/availability')
              ? { data: rows, loading: false, retry() {}, ...response }
              : { data: service, loading: false, retry() {} };
            return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/vendor/services/venue-1/availability'] },
              React.createElement(Routes, null, React.createElement(Route, { path: '/vendor/services/:id/availability', element: React.createElement(ServiceAvailability) }))));
          }
        `;
        },
        transform(code, id) {
          const path = id.replaceAll("\\", "/");
          if (path.endsWith("/vendor/components/WorkspaceUI.jsx")) {
            const start = code.indexOf("export function useVendorData(");
            const end = code.indexOf("export function Badge(", start);
            return (
              code.slice(0, start) +
              "export function useVendorData(path) { return globalThis.__availabilityTestData(path); }\n" +
              code.slice(end)
            );
          }
          if (path.endsWith("/vendor/services/workspace.api.js")) {
            const start = code.indexOf("export const today =");
            const end = code.indexOf("export async function readFile", start);
            return (
              code.slice(0, start) +
              "export const today = () => '2026-11-16';\n" +
              code.slice(end)
            );
          }
        },
      },
    ],
  });
  const hadWindow = "window" in globalThis;
  const previousWindow = globalThis.window;
  globalThis.window = { location: { origin: "http://localhost:5173" } };
  try {
    const { render } = await server.ssrLoadModule("virtual:availability-test");
    const service = {
      id: "venue-1",
      name: "Wedding Hall",
      actions: { edit: true },
      availability: { start: "11:00", end: "20:00", noticeHours: 10 },
    };
    const rows = [
      {
        id: 1,
        date: "2026-11-16",
        status: "Available",
        startTime: "1970-01-01T12:30:00.000Z",
        endTime: "18:00:00",
        notes: "Extended hours",
      },
      { id: 2, date: "2026-11-18T00:00:00.000Z", status: "Booked" },
      {
        id: 3,
        date: "2026-11-19",
        status: "Blocked",
        notes: "Venue maintenance",
      },
    ];
    let html = render(service, rows);
    assert.ok(html.includes("November 2026"));
    assert.ok(html.includes("Wedding Hall"));
    assert.ok(html.includes("11:00 – 20:00"));
    assert.ok(html.includes("10 hours"));
    assert.match(html, /href="\/vendor\/services\/venue-1\/edit\?step=6"/);
    assert.ok(html.includes("Edit date override"));
    assert.match(html, /type="time"[^>]*value="12:30"/);
    assert.match(html, /type="time"[^>]*value="18:00"/);
    assert.ok(html.includes("Extended hours"));
    assert.ok(html.includes("Venue maintenance"));
    assert.ok(html.includes("Remove date override"));
    assert.match(
      html,
      /<button(?=[^>]*disabled="")(?=[^>]*aria-label="18 Nov 2026: Booked")[^>]*>/,
    );
    assert.match(
      html,
      /<button(?=[^>]*aria-current="date")(?=[^>]*aria-pressed="true")[^>]*>/,
    );
    assert.ok(
      !/aria-label="[^"]*: Closed/.test(html),
      "closed days must not be inferred from a weekly schedule",
    );

    html = render({ ...service, actions: { edit: false } }, rows);
    assert.ok(!html.includes("/edit?step=6"));
    assert.ok(html.includes("Regular schedule editing unavailable"));
    assert.ok(
      html.includes("Update availability"),
      "date overrides remain independent of listing edit locks",
    );

    html = render(service, [{ id: 8, date: "2026-11-16", status: "Booked" }]);
    assert.ok(html.includes("This selection includes a booked date"));
    assert.match(
      html,
      /<button(?=[^>]*type="submit")(?=[^>]*disabled="")[^>]*>/,
    );
    assert.ok(!html.includes("Remove date override"));

    html = render({ ...service, availability: {} }, []);
    assert.ok(html.includes("No date overrides this month"));
    assert.ok(html.includes("Not set"));
    assert.ok(
      !html.includes('type="time"'),
      "whole-day blocks must not expose irrelevant time fields",
    );
    assert.ok(!html.includes("Remove date override"));
    html = render(service, [], { loading: true, data: null });
    assert.ok(!html.includes("Your service calendar"));
    html = render(service, [], { error: new Error("Calendar unavailable") });
    assert.ok(html.includes("Calendar unavailable"));
    assert.ok(!html.includes("Your service calendar"));
    html = render(service, rows, { loading: true });
    assert.ok(html.includes("Refreshing calendar"));
    assert.match(html, /<fieldset disabled="">/);
  } finally {
    delete globalThis.__availabilityTestData;
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
    await server.close();
  }
});
