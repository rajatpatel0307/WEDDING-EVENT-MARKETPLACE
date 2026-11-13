export function resetNavbarServicesScroll(location, viewport) {
  if (location.pathname !== "/services" || !location.state?.fromNavbarServices) {
    return;
  }

  const previousRestoration = viewport.history.scrollRestoration;
  viewport.history.scrollRestoration = "manual";
  const scrollToTop = () => viewport.scrollTo({ top: 0, left: 0, behavior: "instant" });
  scrollToTop();
  // Repeat after the mobile drawer closes and restores focus.
  const frame = viewport.requestAnimationFrame(scrollToTop);
  viewport.addEventListener("pageshow", scrollToTop);

  return () => {
    viewport.cancelAnimationFrame(frame);
    viewport.removeEventListener("pageshow", scrollToTop);
    viewport.history.scrollRestoration = previousRestoration;
  };
}
