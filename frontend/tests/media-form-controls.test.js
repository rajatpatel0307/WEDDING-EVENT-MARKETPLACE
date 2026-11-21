import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

test("embedded service galleries expose image uploads without submitting the service form", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "media-form-test-data",
      enforce: "pre",
      load(id) {
        if (id.endsWith("/src/context/AuthContext.jsx")) {
          return 'export const useAuth = () => ({ user: { id: "vendor" } });';
        }
        if (id.endsWith("/src/modules/media/api.js")) {
          return `
            let rows = [];
            export const setRows = value => { rows = value; };
            export const useMedia = () => ({ data: {
              rows, total: rows.length, pageSize: 24, maxMb: 5,
              categories: [], vendors: [], services: [], packages: [], reviews: []
            }});
            export const mediaContent = id => id;
            export const mediaRequest = () => {};
            export const mediaSave = () => {};
            export const uploadMedia = () => {};
          `;
        }
      },
    }],
  });
  try {
    const { default: MediaLibrary, MediaUploader } = await server.ssrLoadModule(
      "/src/modules/media/MediaLibrary.jsx",
    );
    for (const entityType of ["Service", "Package"]) {
      for (const disabled of [false, true]) {
        const html = renderToStaticMarkup(createElement(
          MemoryRouter,
          null,
          createElement("form", null, createElement(MediaLibrary, {
            embedded: true,
            fixedTarget: { entityType, entityId: "saved-record" },
            disabled,
          })),
        ));
        const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
        const addImages = buttons.filter(([, , body]) => body.includes("Add images"));
        assert.equal(addImages.length, 2, "uploads are available in the header and empty gallery");
        for (const [, attributes] of buttons) {
          assert.match(attributes, /type="button"/, "gallery actions must not submit the surrounding form");
        }
        for (const [, attributes] of addImages) {
          assert.equal(attributes.includes("disabled="), disabled, "locked services retain upload restrictions");
        }
        assert.doesNotMatch(html, /Moderation|Approved|Rejected|Hidden|>Approve</);
      }
    }
    const uploader = renderToStaticMarkup(createElement("form", null,
      createElement(MediaUploader, {
        target: { entityType: "Service", entityId: "saved-record" },
      }),
    ));
    assert.match(uploader, /type="file"/);
    assert.match(uploader, /<button type="button"[^>]*>[\s\S]*Upload selected images/);
    const { setRows } = await server.ssrLoadModule("/src/modules/media/api.js");
    for (const role of ["Vendor", "Admin"]) {
      for (const status of ["Pending", "Approved", "Rejected", "Hidden"]) {
        setRows([{ id: "logo", entityId: "vendor", entityType: "Vendor", purpose: "Logo",
          status, uploadStatus: "Ready", fileName: "Business logo", thumbnail: "/logo.png" }]);
        const html = renderToStaticMarkup(createElement(MemoryRouter, null,
          createElement(MediaLibrary, { role }),
        ));
        assert.match(html, /Business logo/);
        assert.match(html, /Set primary/);
        assert.match(html, /Delete/);
        assert.doesNotMatch(html, /Moderation|Approved|Rejected|Hidden|>Approve<|>Reject<|>Hide<|>Restore</);
      }
    }
  } finally {
    await server.close();
  }
});
