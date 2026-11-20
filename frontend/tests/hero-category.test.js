import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("homepage category dropdown renders live categories and handles loading, empty and error states", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    cacheDir: fileURLToPath(new URL("../node_modules/.vite-hero-category-tests/", import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "hero-category-fixtures", enforce: "pre",
      resolveId(id) {
        if (id === "virtual:hero-category-test") return "\0hero-category-test";
        if (id === "virtual:hero-category-api" || id.endsWith("/modules/marketplace/api")) return "\0hero-category-api";
        if (id.endsWith("/modules/marketplace/location-selection")) return "\0hero-locations";
      },
      load(id) {
        if (id === "\0hero-category-api") return `
          let state;
          export const setCategoryState = next => { state = next; };
          export const useMarketplace = path => {
            if (path !== '/catalog') throw new Error('Unexpected catalog endpoint');
            return state;
          };
        `;
        if (id === "\0hero-locations") return `
          export const useCustomerLocations = () => ({ data: [] });
          export const useSelectedLocation = () => '';
          export const setSelectedLocation = () => {};
        `;
        if (id === "\0hero-category-test") return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { MemoryRouter } from 'react-router-dom';
          import { setCategoryState } from 'virtual:hero-category-api';
          import Hero from '/src/components/home/Hero.jsx';
          export function render(state) {
            setCategoryState(state);
            return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Hero)));
          }
        `;
      },
    }],
  });
  try {
    const { render } = await server.ssrLoadModule("virtual:hero-category-test");
    const html = render({ data: { categories: [{ id: 42, name: "New marketplace category" }, { id: 7, name: "Photography" }] } });
    assert.match(html, /<select aria-label="Search category"/);
    assert.ok(html.includes('<option value="42">New marketplace category</option>'));
    assert.ok(html.includes('<option value="7">Photography</option>'));
    assert.ok(html.includes("All categories"));
    assert.ok(!html.includes("wedding-search-suggestions"));
    assert.ok(render({ loading: true }).includes("Loading categories..."));
    const error = render({ error: new Error("Unavailable"), retry() {} });
    assert.ok(error.includes("Categories unavailable"));
    assert.ok(error.includes("Try again"));
    assert.ok(render({ data: { categories: [] } }).includes("All categories"));
  } finally {
    await server.close();
  }
});
