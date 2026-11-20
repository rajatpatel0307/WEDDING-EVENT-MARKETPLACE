import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("vendor signup collects account details and defers location to business profile setup", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    cacheDir: fileURLToPath(new URL("../node_modules/.vite-registration-tests/", import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "registration-test-context", enforce: "pre",
      resolveId(id) {
        if (id === "virtual:registration-test") return "\0registration-test";
        if (id === "../../content/api") return "\0registration-content";
        if (id.endsWith("/context/AuthContext")) return "\0registration-auth";
        if (id.endsWith("/services/apollo")) return "\0registration-api";
        if (id === "../components/AuthLayout") return "\0registration-layout";
      },
      load(id) {
        if (id === "\0registration-content") return "export const useContent = () => ({ data: [] });";
        if (id === "\0registration-auth") return "export const useAuth = () => ({ notify() {} });";
        if (id === "\0registration-api") return "export const mutate = () => { throw new Error('Unexpected request during render'); };";
        if (id === "\0registration-layout") return "export default function Layout({ children }) { return children; }";
        if (id === "\0registration-test") return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { MemoryRouter } from 'react-router-dom';
          import RegisterPage from '/src/modules/auth/pages/RegisterPage.jsx';
          export const render = role => renderToStaticMarkup(React.createElement(MemoryRouter, {
            initialEntries: ['/auth/signup?role=' + role],
          }, React.createElement(RegisterPage)));
        `;
      },
    }],
  });
  try {
    const { render } = await server.ssrLoadModule("virtual:registration-test");
    const vendor = render("vendor");
    assert.ok(vendor.includes("Grow with MarryNest."));
    assert.ok(vendor.includes("complete your business profile from your dashboard"));
    for (const name of ["firstName", "lastName", "email", "phone", "password", "confirmPassword"])
      assert.ok(vendor.includes(`name="${name}"`));
    assert.ok(vendor.includes("Create account"));
    assert.doesNotMatch(vendor, /Registered business|Select location|adminLocationId/);
    const customer = render("customer");
    assert.ok(customer.includes("Your story begins here."));
    assert.doesNotMatch(customer, /Registered business|Select location|adminLocationId/);
  } finally {
    await server.close();
  }
});
