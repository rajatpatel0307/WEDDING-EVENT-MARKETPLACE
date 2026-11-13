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
            export const useMedia = () => ({ data: {
              rows: [], total: 0, pageSize: 24, maxMb: 5,
              categories: [], statuses: []
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
      }
    }
    const uploader = renderToStaticMarkup(createElement("form", null,
      createElement(MediaUploader, {
        target: { entityType: "Service", entityId: "saved-record" },
      }),
    ));
    assert.match(uploader, /type="file"/);
    assert.match(uploader, /<button type="button"[^>]*>[\s\S]*Upload selected images/);
  } finally {
    await server.close();
  }
});
