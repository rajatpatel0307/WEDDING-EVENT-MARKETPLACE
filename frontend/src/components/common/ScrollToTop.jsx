import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { resetNavigationScroll } from "./navigation-scroll";

export default function ScrollToTop() {
  const location = useLocation();

  useLayoutEffect(() => resetNavigationScroll(location, window), [location]);

  return null;
}
