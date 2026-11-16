export function resetNavigationScroll(location, viewport) {
  // Preserve section links, including the accessible skip-to-content link.
  if (location.hash) {
    return;
  }

  const previousRestoration = viewport.history.scrollRestoration;
  viewport.history.scrollRestoration = "manual";
  const scrollToTop = () => viewport.scrollTo({ top: 0, left: 0, behavior: "instant" });
  scrollToTop();
  // Repeat after navigation closes mobile menus and restores focus.
  const frame = viewport.requestAnimationFrame(scrollToTop);
  viewport.addEventListener("pageshow", scrollToTop);

  return () => {
    viewport.cancelAnimationFrame(frame);
    viewport.removeEventListener("pageshow", scrollToTop);
    viewport.history.scrollRestoration = previousRestoration;
  };
}
