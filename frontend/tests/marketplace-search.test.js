import test from "node:test";
import assert from "node:assert/strict";
import { marketplaceSearchPath } from "../src/modules/marketplace/search-path.js";

test("homepage and navbar searches open results with the query and selected city", () => {
  const city = "38062D1933C17D2EEBC8671B7B185AE3F6C712F0220BA39076934CBC0FC5C70A";
  const url = new URL(marketplaceSearchPath("  wedding photography  ", city), "http://localhost:5173");
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("q"), "wedding photography");
  assert.equal(url.searchParams.get("city"), city);
});

test("All locations searches have no city filter and empty searches show all services", () => {
  assert.equal(marketplaceSearchPath("Photography", ""), "/search?q=Photography");
  assert.equal(marketplaceSearchPath(" ", ""), "/search");
  assert.equal(marketplaceSearchPath("", "city-one"), "/search?city=city-one");
});

test("search URLs preserve special characters as query text", () => {
  const query = "DJ & Lighting? #1 + 50%";
  const url = new URL(marketplaceSearchPath(query), "http://localhost:5173");
  assert.equal(url.searchParams.get("q"), query);
  assert.equal(url.hash, "");
  assert.equal(url.searchParams.size, 1);
});

test("homepage category selection filters by its catalog ID and preserves the selected city", () => {
  const url = new URL(marketplaceSearchPath("", "city-one", "17"), "http://localhost:5173");
  assert.equal(url.searchParams.get("category"), "17");
  assert.equal(url.searchParams.get("city"), "city-one");
  assert.equal(url.searchParams.has("q"), false);
  assert.equal(marketplaceSearchPath("", "", "17"), "/search?category=17");
  assert.equal(marketplaceSearchPath("", "", ""), "/search");
});
