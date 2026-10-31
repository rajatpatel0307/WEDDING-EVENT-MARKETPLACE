import test from "node:test";
import assert from "node:assert/strict";
import { createCheckoutLoader } from "../src/modules/customer/services/checkout-loader.js";

function harness() {
  const scripts = [], timers = new Map(), events = new Map();
  const window = {};
  let timerId = 0;
  const document = {
    createElement: () => ({ remove() { this.removed = true; } }),
    head: { appendChild: (script) => scripts.push(script) },
    addEventListener: (name, handler) => events.set(name, handler),
    removeEventListener: (name) => events.delete(name),
  };
  const load = createCheckoutLoader({ window, document,
    setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  return { scripts, timers, events, window, load };
}

test("concurrent checkout attempts share one official script and clean up on success", async () => {
  const h = harness();
  const first = h.load(), second = h.load();
  assert.equal(first, second);
  assert.equal(h.scripts.length, 1);
  assert.equal(h.scripts[0].src, "https://checkout.razorpay.com/v1/checkout.js");
  h.window.Razorpay = function () {};
  h.scripts[0].onload();
  await first;
  await h.load();
  assert.equal(h.scripts.length, 1);
  assert.equal(h.timers.size, 0);
  assert.equal(h.events.size, 0);
});

test("a transient script network failure is removed and retried automatically", async () => {
  const h = harness(), promise = h.load();
  h.scripts[0].onerror();
  await Promise.resolve();
  assert.equal(h.scripts[0].removed, true);
  assert.equal(h.scripts.length, 2);
  h.window.Razorpay = function () {};
  h.scripts[1].onload();
  await promise;
  assert.equal(h.timers.size, 0);
});

test("missing checkout initialization does not poison later retries", async () => {
  const h = harness(), promise = h.load();
  h.scripts[0].onload();
  await Promise.resolve();
  h.scripts[1].onload();
  await assert.rejects(promise, /did not initialize/);
  const retry = h.load();
  assert.equal(h.scripts.length, 3);
  h.window.Razorpay = function () {};
  h.scripts[2].onload();
  await retry;
});

test("a stalled checkout times out, retries once and releases the loader", async () => {
  const h = harness(), promise = h.load();
  [...h.timers.values()][0]();
  await Promise.resolve();
  [...h.timers.values()][0]();
  await assert.rejects(promise, /too long/);
  assert.equal(h.scripts.length, 2);
  assert.ok(h.scripts.every((script) => script.removed));
  assert.equal(h.timers.size, 0);
  assert.equal(h.events.size, 0);
});

test("persistent network failures give a useful message and permit a fresh attempt", async () => {
  const h = harness(), promise = h.load();
  h.scripts[0].onerror();
  await Promise.resolve();
  h.scripts[1].onerror();
  await assert.rejects(promise, /allow checkout.razorpay.com/);
  const retry = h.load();
  h.window.Razorpay = function () {};
  h.scripts[2].onload();
  await retry;
});

test("a Razorpay script policy violation stops retries and identifies the configuration problem", async () => {
  const h = harness(), promise = h.load();
  h.events.get("securitypolicyviolation")({ blockedURI: "https://checkout.razorpay.com/v1/checkout.js", effectiveDirective: "script-src-elem" });
  await assert.rejects(promise, /security policy blocked/);
  assert.equal(h.scripts.length, 1);
  assert.equal(h.events.size, 0);
  assert.equal(h.timers.size, 0);
});
