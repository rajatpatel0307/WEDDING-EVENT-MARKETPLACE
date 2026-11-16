import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("service collection renders the requested approval view, actions, loading and empty states", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    plugins: [
      {
        name: "service-list-test-fixtures",
        enforce: "pre",
        resolveId(id) {
          if (id === "virtual:service-list-test") return "\0service-list-test";
          if (id.endsWith("/context/AuthContext")) return "\0service-test-auth";
        },
        load(id) {
          if (id === "\0service-test-auth")
            return "export const useAuth = () => ({ notify() {} });";
          if (id === "\0service-list-test")
            return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { MemoryRouter } from 'react-router-dom';
          import ServiceList from '/src/modules/vendor/service-management/ServiceList.jsx';
          export function render(url, response) {
            const paths = [];
            globalThis.__serviceListTestData = path => {
              paths.push(path);
              if (path === '/services/metadata') return { data: { categories: [], subcategories: [] } };
              if (path === '/access-status') return { data: { serviceStatus: 'Approved' } };
              return { loading: false, retry() {}, ...response };
            };
            const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(ServiceList)));
            return { html, paths };
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
            "export function useVendorData(path) { return globalThis.__serviceListTestData(path); }\n" +
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
    const { render } = await server.ssrLoadModule("virtual:service-list-test");
    const data = {
      rows: [],
      total: 0,
      canSubmit: true,
      stats: { totalServices: 3 },
      approvalCounts: { Pending: 1, Approved: 1, Suspended: 1 },
    };
    const views = [
      ["Draft", "No draft services"],
      ["Pending", "No services waiting for approval"],
      ["UnderReview", "No services under review"],
      ["Approved", "No approved services yet"],
      ["Rejected", "No rejected services"],
      ["Suspended", "No suspended services"],
    ];
    for (const [status, empty] of views) {
      const url = `/vendor/services?approval=${status}&page=1`;
      const { html, paths } = render(url, { data });
      assert.ok(paths.includes(`/services?approval=${status}&page=1`));
      assert.ok(html.includes(empty), status);
      const dropdown = html.match(/<select aria-label="Filter by status"[^>]*>[\s\S]*?<\/select>/)?.[0];
      assert.ok(dropdown, "status filter is always visible above the table");
      assert.match(dropdown, new RegExp(`<option(?=[^>]*value="${status}")(?=[^>]*selected="")[^>]*>`));
      assert.equal((dropdown.match(/<option /g) || []).length, 7);
      assert.ok(!html.includes('aria-label="Filter by approval"'), "status tabs are removed");
      assert.ok(html.includes("View all services"));
    }

    let result = render("/vendor/services?page=1&sort=updated&pageSize=12", {
      data,
    });
    assert.ok(result.html.includes("Your next great service starts here"));
    assert.ok(!result.html.includes("Your service collection"));
    assert.ok(!result.html.includes("All your listings, from first draft to fully booked."));
    assert.ok(!result.html.includes("Filtered by"));
    assert.match(result.html, /<option value="" selected="">All statuses \(3\)<\/option>/);
    assert.ok(result.html.includes("Pending Approval (1)"));
    assert.ok(result.html.includes("Drafts (0)"));
    result = render("/vendor/services?approval=Approved&q=missing", { data });
    assert.ok(result.html.includes("No matching services found"));
    assert.ok(result.html.includes("Remove Search: missing filter"));
    result = render("/vendor/services?approval=Approved&page=4", { data });
    assert.ok(result.html.includes("Back to first page"));

    const row = {
      id: "dc1c0a6-example",
      name: "Clothing",
      category: "Wedding Clothing",
      price: 999.99,
      status: "Approved",
      active: true,
      bookings: 1,
      actions: { edit: true, activate: true, duplicate: true },
    };
    const populated = { ...data, rows: [row], total: 1 };
    result = render("/vendor/services?approval=Approved", { data: populated });
    assert.ok(result.html.includes('aria-label="Services"'));
    assert.ok(result.html.includes("View Clothing"));
    assert.ok(result.html.includes("Edit Clothing"));
    assert.ok(result.html.includes("More actions for Clothing"));
    assert.ok(!result.html.includes("Manage…"));
    assert.ok(result.html.includes("No ratings yet"));

    result = render("/vendor/services?approval=Pending", {
      data: {
        ...populated,
        rows: [
          {
            ...row,
            name: "Wedding Hall",
            status: "Pending",
            actions: { duplicate: true },
          },
        ],
      },
    });
    assert.ok(result.html.includes("Editing unavailable for Wedding Hall"));
    assert.ok(
      !result.html.includes('href="/vendor/services/dc1c0a6-example/edit"'),
    );
    result = render("/vendor/services?approval=Pending", {
      data: populated,
      loading: true,
    });
    assert.ok(result.html.includes('aria-label="Loading services"'));
    assert.ok(
      !result.html.includes("View Clothing"),
      "previous filter rows must not appear while loading",
    );
    result = render("/vendor/services?approval=Pending", {
      data: populated,
      error: new Error("Cannot load services"),
    });
    assert.ok(result.html.includes("Cannot load services"));
    assert.ok(!result.html.includes("View Clothing"));
  } finally {
    delete globalThis.__serviceListTestData;
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
    await server.close();
  }
});
