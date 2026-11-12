import test from "node:test";
import assert from "node:assert/strict";
import {
  selectedLocation,
  setSelectedLocation,
  subscribeToLocation,
} from "../src/modules/marketplace/location-store.js";

function storage(t, unavailable = false) {
  const originalWindow = globalThis.window,
    originalStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.window = new EventTarget();
  globalThis.localStorage = {
    getItem: (key) => {
      if (unavailable) throw Error("Storage disabled");
      return values.get(key) || null;
    },
    setItem: (key, value) => {
      if (unavailable) throw Error("Storage disabled");
      values.set(key, value);
    },
    removeItem: (key) => {
      if (unavailable) throw Error("Storage disabled");
      values.delete(key);
    },
  };
  t.after(() => {
    setSelectedLocation("");
    globalThis.window = originalWindow;
    globalThis.localStorage = originalStorage;
  });
  return values;
}
test("header, hero and browsing subscribers share the selected location and clear it together", (t) => {
  const values = storage(t),
    header = [],
    hero = [];
  const unsubscribeHeader = subscribeToLocation(() =>
    header.push(selectedLocation()),
  );
  const unsubscribeHero = subscribeToLocation(() =>
    hero.push(selectedLocation()),
  );
  setSelectedLocation("location-one");
  assert.equal(values.get("marketplace-location"), "location-one");
  setSelectedLocation("location-two");
  setSelectedLocation("");
  assert.deepEqual(header, ["location-one", "location-two", ""]);
  assert.deepEqual(hero, header);
  assert.equal(values.has("marketplace-location"), false);
  unsubscribeHeader();
  unsubscribeHero();
  setSelectedLocation("location-three");
  assert.equal(header.length, 3);
});
test("a location change in another tab refreshes subscribed customer controls", (t) => {
  const values = storage(t),
    seen = [];
  const unsubscribe = subscribeToLocation(() => seen.push(selectedLocation()));
  values.set("marketplace-location", "another-tab-location");
  window.dispatchEvent(new Event("storage"));
  assert.deepEqual(seen, ["another-tab-location"]);
  unsubscribe();
});
test("location filtering still works when the browser disables persistent storage", (t) => {
  storage(t, true);
  setSelectedLocation("location-without-storage");
  assert.equal(selectedLocation(), "location-without-storage");
  setSelectedLocation("");
  assert.equal(selectedLocation(), "");
});
