import test from "node:test";
import assert from "node:assert/strict";
import { resetNavigationScroll } from "../src/components/common/navigation-scroll.js";

function createViewport() {
  const frames = new Map(), listeners = new Map();
  return {
    history: { scrollRestoration: "auto" },
    scrollY: 900,
    scrollCalls: [],
    scrollTo(options) {
      this.scrollY = options.top;
      this.scrollCalls.push(options);
    },
    requestAnimationFrame(callback) { frames.set(1, callback); return 1; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) {
      if (listeners.get(name) === callback) listeners.delete(name);
    },
    runFrame() { for (const callback of frames.values()) callback(); frames.clear(); },
    showPage() { listeners.get("pageshow")?.(); },
  };
}

const navbarServices = { pathname: "/services", state: { fromNavbarServices: true } };

test("navigation resets the previous page's scroll immediately and after the drawer closes", () => {
  const viewport = createViewport();
  const cleanup = resetNavigationScroll(navbarServices, viewport);
  assert.equal(viewport.scrollY, 0);
  assert.equal(viewport.history.scrollRestoration, "manual");
  viewport.scrollY = 400;
  viewport.runFrame();
  assert.equal(viewport.scrollY, 0);
  assert.deepEqual(viewport.scrollCalls[0], { top: 0, left: 0, behavior: "instant" });
  cleanup();
});

test("refreshing a page starts at the top", () => {
  const viewport = createViewport();
  const location = JSON.parse(JSON.stringify(navbarServices));
  const cleanup = resetNavigationScroll(location, viewport);
  viewport.scrollY = 700;
  viewport.showPage();
  assert.equal(viewport.scrollY, 0);
  cleanup();
});

test("public, auth, customer, vendor and admin routes reset without special link state", () => {
  for (const location of [
    { pathname: "/services", state: null },
    { pathname: "/services", state: { fromNavbarServices: false } },
    { pathname: "/venues", state: { fromNavbarServices: true } },
    { pathname: "/services/example", state: { fromNavbarServices: true } },
    ...["/", "/about", "/contact", "/terms-and-conditions", "/privacy-policy",
      "/auth/login", "/auth/signup", "/customer/dashboard", "/customer/orders/1",
      "/vendor/services", "/vendor/services/1", "/admin/dashboard", "/admin/services/1",
    ].map((pathname) => ({ pathname })),
    { pathname: "/services", search: "?page=2" },
  ]) {
    const viewport = createViewport();
    const cleanup = resetNavigationScroll(location, viewport);
    assert.equal(viewport.scrollY, 0, location.pathname);
    assert.equal(viewport.history.scrollRestoration, "manual");
    viewport.scrollY = 400;
    viewport.runFrame();
    assert.equal(viewport.scrollY, 0);
    viewport.scrollY = 700;
    viewport.showPage();
    assert.equal(viewport.scrollY, 0);
    cleanup();
  }
});

test("section links preserve their anchor scrolling", () => {
  for (const hash of ["#main-content", "#listing-booking", "#listing-reviews"]) {
    const viewport = createViewport();
    assert.equal(resetNavigationScroll({ pathname: "/services/example", hash }, viewport), undefined);
    viewport.runFrame();
    viewport.showPage();
    assert.equal(viewport.scrollY, 900);
    assert.equal(viewport.history.scrollRestoration, "auto");
    assert.equal(viewport.scrollCalls.length, 0);
  }
});

test("leaving a route restores browser settings and cancels any pending reset", () => {
  const viewport = createViewport();
  const cleanup = resetNavigationScroll(navbarServices, viewport);
  cleanup();
  viewport.scrollY = 600;
  viewport.runFrame();
  viewport.showPage();
  assert.equal(viewport.scrollY, 600);
  assert.equal(viewport.history.scrollRestoration, "auto");
});

test("new visits, same-page clicks and back/forward navigation reset to the top", () => {
  const viewport = createViewport();
  for (const key of ["first-visit", "same-page-click", "return-visit"]) {
    viewport.scrollY = 900;
    const cleanup = resetNavigationScroll({ pathname: "/contact", key }, viewport);
    assert.equal(viewport.scrollY, 0);
    cleanup();
  }
});
