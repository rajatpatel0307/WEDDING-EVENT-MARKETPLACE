import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("vendor toolbar presents filters, date limits and a clear action only when needed", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    cacheDir: fileURLToPath(new URL("../node_modules/.vite-vendor-filter-tests/", import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "vendor-filter-fixtures", enforce: "pre",
      resolveId(id) {
        if (id === "virtual:vendor-filter-test") return "\0vendor-filter-test";
        if (id.endsWith("/admin/api") || id === "../api") return "\0vendor-filter-api";
      },
      load(id) {
        if (id === "\0vendor-filter-api") return "export const adminRequest = async () => ({ rows: [] });";
        if (id === "\0vendor-filter-test") return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import VendorFilters from '/src/modules/admin/components/VendorFilters.jsx';
          import RecordPicker from '/src/modules/admin/components/RecordPicker.jsx';
          export const render = props => renderToStaticMarkup(React.createElement(VendorFilters, {
            query: '', location: '', category: '', status: '', from: '', to: '', cityOptions: ['Jaipur', 'Pune'],
            statuses: ['Pending', 'UnderReview', 'Approved', 'Rejected', 'Suspended'],
            onQueryChange() {}, onLocationChange() {}, onStatusChange() {},
            onCategoryChange() {}, onFromChange() {}, onToChange() {}, onClear() {}, ...props,
          }, React.createElement('button', { type: 'button' }, 'Columns'), React.createElement('button', { type: 'button' }, 'Export')));
          export const renderPicker = value => renderToStaticMarkup(React.createElement(RecordPicker, {
            resource: 'categories', name: 'category', initialValue: '3', initialLabel: 'Photography',
            required: false, showSearch: false, value,
          }));
        `;
      },
    }],
  });
  try {
    const { render, renderPicker } = await server.ssrLoadModule("virtual:vendor-filter-test");
    const clean = render({});
    for (const label of ["Search vendors", "Select categories", "Filter vendor location", "Filter by status", "Created from", "Created until"])
      assert.ok(clean.includes(`aria-label="${label}"`));
    assert.ok(clean.includes("Columns"));
    assert.ok(clean.includes("Export"));
    assert.ok(clean.includes('placeholder="Search records..."'));
    assert.ok(clean.includes("All categories"));
    assert.match(clean, /<select[^>]*aria-label="Filter vendor location"/);
    assert.ok(clean.includes("All cities"));
    assert.ok(clean.includes('<option value="Pune">Pune</option>'));
    assert.match(render({ location: "Jaipur" }), /value="Jaipur" selected="">Jaipur/);
    assert.ok(!clean.includes("Clear filters"));
    assert.match(render({ category: "3" }), /aria-label="Clear vendor filters"/);
    assert.match(render({ location: "Jaipur" }), /aria-label="Clear vendor filters"/);
    const filtered = render({ query: "Garden", location: "Jaipur", status: "UnderReview", from: "2026-11-01", to: "2026-11-18" });
    assert.match(filtered, /aria-label="Clear vendor filters"/);
    assert.match(filtered, /value="UnderReview" selected="">Under Review/);
    assert.match(filtered, /aria-label="Created from"[^>]*max="2026-11-18"/);
    assert.match(filtered, /aria-label="Created until"[^>]*min="2026-11-01"/);
    assert.match(renderPicker("3"), /value="3" selected="">Photography/);
    assert.match(renderPicker(""), /value="" selected="">All categories/);
    assert.doesNotMatch(renderPicker(""), /value="3" selected=""/);
  } finally {
    await server.close();
  }
});
