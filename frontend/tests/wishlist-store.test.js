import test from "node:test";
import assert from "node:assert/strict";
import { createWishlistStore } from "../src/modules/customer/services/wishlist-store.js";
const fixture = { id: 1, type: "Service", savedServiceId: "service-a" };
test("many cards share one load and mounting more cards does not refetch indefinitely", async () => {
  let calls = 0;
  const store = createWishlistStore({
    list: async () => {
      calls++;
      return [fixture];
    },
  });
  await Promise.all(
    Array.from({ length: 20 }, () => store.activate("customer-a")),
  );
  await store.activate("customer-a");
  assert.equal(calls, 1);
  assert.equal(store.find("Service", "SERVICE-A").id, 1);
});
test("late responses cannot leak the previous customer wishlist after account switching", async () => {
  let release;
  const store = createWishlistStore({
    list: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  const previous = store.activate("customer-a");
  await Promise.resolve();
  await store.activate(null);
  release([fixture]);
  await previous;
  assert.equal(store.getSnapshot().owner, null);
  assert.deepEqual(store.getSnapshot().rows, []);
});
test("failed mutations preserve saved state and successful removal reloads backend truth", async () => {
  let rows = [fixture],
    fail = true;
  const store = createWishlistStore({
    list: async () => rows,
    remove: async () => {
      if (fail) throw new Error("Offline");
      rows = [];
      return { message: "Removed" };
    },
  });
  await store.activate("customer-a");
  await assert.rejects(
    () => store.toggle("customer-a", "Service", "service-a"),
    /Offline/,
  );
  assert.equal(store.getSnapshot().rows.length, 1);
  fail = false;
  await store.toggle("customer-a", "Service", "service-a");
  assert.deepEqual(store.getSnapshot().rows, []);
  await assert.rejects(
    () => store.toggle("another-customer", "Service", "service-a"),
    /Sign in/,
  );
});
