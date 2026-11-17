import test from "node:test";
import assert from "node:assert/strict";
import { marketplaceDestination } from "../src/routes/marketplaceNavigation.js";

test("legacy customer browsing opens the main marketplace and preserves filters", () => {
  assert.equal(marketplaceDestination({ pathname: "/customer/discover" }), "/services");
  for (const [query, expected] of [
    ["type=vendors", "/vendors"], ["type=packages", "/packages"],
    ["type=offers", "/offers"], ["type=services", "/services"], ["venue=1", "/venues"],
  ]) assert.equal(marketplaceDestination({ pathname: "/customer/discover", search: `?${query}` }), expected);
  assert.equal(marketplaceDestination({ pathname: "/customer/discover/", search: "?category=venue-1&city=Noida&q=wedding&page=2", hash: "#results" }), "/services?category=venue-1&city=Noida&q=wedding&page=2#results");
  assert.equal(marketplaceDestination({ pathname: "/customer/discover", search: "?type=vendors&city=Noida" }), "/vendors?city=Noida");
});

test("legacy service and vendor links retain their IDs and request/package parameters", () => {
  assert.equal(marketplaceDestination({ pathname: "/customer/services" }), "/services");
  assert.equal(marketplaceDestination({ pathname: "/customer/vendors" }), "/vendors");
  assert.equal(marketplaceDestination({ pathname: "/customer/services/service-1", search: "?package=package-1&action=quote" }), "/services/service-1?package=package-1&action=quote");
  assert.equal(marketplaceDestination({ pathname: "/customer/vendors/vendor-1/", hash: "#vendor-services" }), "/vendors/vendor-1#vendor-services");
});

test("legacy browsing type cannot select an external destination or inherited object property", () => {
  for (const type of ["https://example.com", "//example.com", "constructor", "__proto__", "toString"])
    assert.equal(marketplaceDestination({ pathname: "/customer/discover", search: `?type=${encodeURIComponent(type)}` }), "/services");
});
