import test from "node:test";
import assert from "node:assert/strict";
import { resetNavbarServicesScroll } from "../src/components/layout/navbar-services-scroll.js";

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

test("Services navigation resets the previous page's scroll immediately and after the drawer closes", () => {
  const viewport = createViewport();
  const cleanup = resetNavbarServicesScroll(navbarServices, viewport);
  assert.equal(viewport.scrollY, 0);
  assert.equal(viewport.history.scrollRestoration, "manual");
  viewport.scrollY = 400;
  viewport.runFrame();
  assert.equal(viewport.scrollY, 0);
  assert.deepEqual(viewport.scrollCalls[0], { top: 0, left: 0, behavior: "instant" });
  cleanup();
});

test("refreshing a Services entry opened from the navbar starts at the top", () => {
  const viewport = createViewport();
  const location = JSON.parse(JSON.stringify(navbarServices));
  const cleanup = resetNavbarServicesScroll(location, viewport);
  viewport.scrollY = 700;
  viewport.showPage();
  assert.equal(viewport.scrollY, 0);
  cleanup();
});

test("other pages and Services links outside the navbar preserve their scroll behavior", () => {
  for (const location of [
    { pathname: "/services", state: null },
    { pathname: "/services", state: { fromNavbarServices: false } },
    { pathname: "/venues", state: { fromNavbarServices: true } },
    { pathname: "/services/example", state: { fromNavbarServices: true } },
  ]) {
    const viewport = createViewport();
    assert.equal(resetNavbarServicesScroll(location, viewport), undefined);
    viewport.runFrame();
    viewport.showPage();
    assert.equal(viewport.scrollY, 900);
    assert.equal(viewport.history.scrollRestoration, "auto");
    assert.equal(viewport.scrollCalls.length, 0);
  }
});

test("leaving Services restores normal scrolling and cancels any pending reset", () => {
  const viewport = createViewport();
  const cleanup = resetNavbarServicesScroll(navbarServices, viewport);
  cleanup();
  viewport.scrollY = 600;
  viewport.runFrame();
  viewport.showPage();
  assert.equal(viewport.scrollY, 600);
  assert.equal(viewport.history.scrollRestoration, "auto");
});

test("each new navbar visit to Services resets to the top", () => {
  const viewport = createViewport();
  for (const key of ["first-visit", "same-page-click", "return-visit"]) {
    viewport.scrollY = 900;
    const cleanup = resetNavbarServicesScroll({ ...navbarServices, key }, viewport);
    assert.equal(viewport.scrollY, 0);
    cleanup();
  }
});
