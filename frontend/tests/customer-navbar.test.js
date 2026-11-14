import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("customer workspace reuses the site navbar without changing its links or dropdowns", async () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  let collapsed = false;
  globalThis.localStorage = { getItem: () => String(collapsed) };
  globalThis.window = { scrollY: 0, location: { origin: "http://localhost:5173" } };
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "customer-navbar-test-context",
      enforce: "pre",
      resolveId(id) { if (id === "virtual:customer-navbar-check.jsx") return "\0customer-navbar-check.jsx"; },
      load(id) {
        if (id.endsWith("/src/context/AuthContext.jsx")) {
          return `export const useAuth = () => ({ loading: false, user: {
            id: "customer", role: "Customer", accountStatus: "Active",
            firstName: "Test", wishlistCount: 3, unreadMessageCount: 2,
            unreadNotificationCount: 7
          } });`;
        }
        if (id.endsWith("/src/hooks/useCommunicationCounts.js")) {
          return "export const useCommunicationCounts = () => {};";
        }
        if (id === "\0customer-navbar-check.jsx") {
          return `
            import React from "react";
            import { renderToStaticMarkup } from "react-dom/server";
            import { MemoryRouter, Routes, Route } from "react-router-dom";
            import Navbar from "/src/components/layout/Navbar.jsx";
            import CustomerLayout from "/src/modules/customer/CustomerLayout.jsx";
            export function render(workspace = false) {
              const element = React.createElement;
              const content = workspace ? element(Routes, null,
                element(Route, { path: "/customer", element: element(CustomerLayout) },
                  element(Route, { path: "dashboard", element: element("p", null, "Customer dashboard content") })
                )
              ) : element(Navbar);
              return renderToStaticMarkup(element(MemoryRouter, {
                initialEntries: [workspace ? "/customer/dashboard" : "/services"]
              }, content));
            }
          `;
        }
      },
    }],
  });
  try {
    const { render } = await server.ssrLoadModule("virtual:customer-navbar-check.jsx");
    const marketplace = render();
    const workspace = render(true);
    const mainNavigation = (html) => {
      const match = html.match(/<nav[^>]*aria-label="Main navigation"[^>]*>([\s\S]*?)<\/nav>/);
      assert.ok(match, "shared main navigation is present");
      return match[1];
    };
    const links = (html) => [...mainNavigation(html).matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
      .map((match) => [match[1], match[2].replace(/<[^>]+>/g, "").trim()]);
    assert.deepEqual(links(workspace), links(marketplace));
    assert.ok(links(workspace).some(([href, label]) => href === "/customer/bookings" && label === "Bookings"));
    assert.match(mainNavigation(workspace), /Services <svg/);
    assert.match(mainNavigation(workspace), /More <svg/);
    assert.equal((workspace.match(/aria-label="Main navigation"/g) || []).length, 1);
    assert.ok(!workspace.includes('aria-label="Marketplace navigation"'));
    assert.ok(workspace.indexOf("mn-header") < workspace.indexOf("cw-app customer-workspace"));
    assert.ok(workspace.includes('id="main-content"'));
    assert.ok(workspace.includes("Customer dashboard content"));
    assert.ok(workspace.includes('aria-label="Toggle dashboard navigation"'));
    assert.ok(workspace.includes("top-[var(--customer-header-height)]"));
    collapsed = true;
    assert.ok(render(true).includes("cw-sidebar-collapsed"));
  } finally {
    await server.close();
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  }
});
