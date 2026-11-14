import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { validateService } from "../src/modules/vendor/service-management/service-validation.js";

test("loaded services without a subcategory remain valid when edited and saved", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "service-document-test-dependencies",
      enforce: "pre",
      load(id) {
        if (id.endsWith("/src/context/AuthContext.jsx")) {
          return "export const useAuth = () => ({});";
        }
        if (id.endsWith("/src/modules/vendor/services/workspace.api.js")) {
          return "export const save = () => {}; export const vendorRequest = () => {};";
        }
      },
    }],
  });
  try {
    const { blank, editableDocument } = await server.ssrLoadModule(
      "/src/modules/vendor/service-management/shared.jsx",
    );
    for (const subcategoryId of [null, undefined, 12]) {
      const loaded = {
        ...blank(),
        name: "Wedding Venue",
        categoryId: 1,
        subcategoryId,
        slug: "wedding-venue",
        pricing: { basePrice: 5000 },
        status: "Approved",
        id: "service-id",
      };
      const document = editableDocument(loaded);
      document.name = "Updated Wedding Venue";
      const payload = JSON.parse(JSON.stringify(document));
      assert.equal(payload.subcategoryId, subcategoryId ?? null);
      assert.equal(payload.pricing.basePrice, 5000);
      assert.equal(payload.pricing.discount, 0);
      assert.equal(payload.offer, null);
      assert.equal(payload.status, undefined);
      assert.equal(payload.id, undefined);
      assert.equal(validateService(payload), null);
    }
  } finally {
    await server.close();
  }
});
