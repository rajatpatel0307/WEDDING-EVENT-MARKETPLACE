import test from "node:test";
import assert from "node:assert/strict";
import { safeImage } from "../src/services/public.js";

const mediaPath = "/api/media/77ebc820-06d0-4255-bd51-5d249444b614/content?variant=gallery";

test("public cards accept media delivered by the local API", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const url = `http://${host}:5000${mediaPath}`;
    assert.equal(safeImage(url), url);
  }
});

test("public cards still accept HTTPS and relative images", () => {
  for (const url of ["https://res.cloudinary.com/example/image.jpg", mediaPath]) {
    assert.equal(safeImage(url), url);
  }
});

test("public cards reject unsafe URLs and unrelated HTTP images", () => {
  for (const url of [
    null,
    "javascript:alert(1)",
    "data:image/svg+xml,<svg/>",
    "//example.com/image.jpg",
    "http://example.com/image.jpg",
    `http://localhost.example.com:5000${mediaPath}`,
    `http://user:password@localhost:5000${mediaPath}`,
    "http://localhost:5000/unrelated/image.jpg",
  ]) {
    assert.equal(safeImage(url), null);
  }
});
