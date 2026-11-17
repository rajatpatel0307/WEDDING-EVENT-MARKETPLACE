import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("customer workspace renders its customer header, sidebar, counts and nested pages", async () => {
  const previousWindow = globalThis.window;
  let collapsed = false;
  globalThis.window = {
    localStorage: { getItem: () => String(collapsed) },
    location: { origin: "http://localhost:5173" },
  };
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
            import CustomerLayout from "/src/modules/customer/layouts/CustomerLayout.jsx";
            export function render() {
              const element = React.createElement;
              const content = element(Routes, null,
                element(Route, { path: "/customer", element: element(CustomerLayout) },
                  element(Route, { path: "dashboard", element: element("p", null, "Customer dashboard content") })
                )
              );
              return renderToStaticMarkup(element(MemoryRouter, {
                initialEntries: ["/customer/dashboard"]
              }, content));
            }
          `;
        }
      },
    }],
  });
  try {
    const { render } = await server.ssrLoadModule("virtual:customer-navbar-check.jsx");
    const workspace = render();
    assert.equal((workspace.match(/<header\b/g) || []).length, 1);
    assert.ok(workspace.includes('aria-label="Marketplace navigation"'));
    assert.ok(workspace.includes('aria-label="Customer profile menu"'));
    assert.ok(workspace.includes('aria-label="Search customer pages"'));
    assert.ok(workspace.includes('aria-label="Open search"'));
    assert.ok(workspace.includes('id="customer-sidebar"'));
    assert.ok(workspace.includes('aria-label="Customer pages"'));
    for (const path of ["dashboard", "profile", "events", "discover", "bookings", "quotations", "wishlist", "messages", "notifications", "payments", "reviews", "addresses", "settings", "cart", "orders", "legal"]) {
      assert.ok(workspace.includes(`href="/customer/${path}"`), `${path} is reachable`);
    }
    assert.ok(workspace.includes('aria-label="Wishlist, 3 items"'));
    assert.ok(workspace.includes('aria-label="Messages, 2 items"'));
    assert.ok(workspace.includes('aria-label="Notifications, 7 items"'));
    assert.ok(workspace.includes('id="main-content"'));
    assert.ok(workspace.includes("Customer dashboard content"));
    assert.ok(workspace.includes('aria-label="Open dashboard navigation"'));
    assert.ok(workspace.includes('aria-label="Collapse sidebar"'));
    assert.ok(workspace.includes("md:ml-[218px] xl:ml-[244px]"));
    assert.ok(workspace.indexOf('id="customer-sidebar"') < workspace.indexOf("<header"));
    assert.ok(workspace.indexOf("<header") < workspace.indexOf('id="main-content"'));
    const sidebarMarkup = workspace.match(/<aside\b[^>]*>/)?.[0];
    assert.match(sidebarMarkup, /top-0/);
    assert.doesNotMatch(sidebarMarkup, /top-\[76px\]/);
    collapsed = true;
    const collapsedWorkspace = render();
    assert.ok(collapsedWorkspace.includes('aria-label="Expand sidebar"'));
    assert.ok(collapsedWorkspace.includes("md:ml-[76px]"));
    globalThis.window.localStorage.getItem = () => { throw new Error("Storage unavailable"); };
    assert.ok(render().includes('aria-label="Collapse sidebar"'));
  } finally {
    await server.close();
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
});
