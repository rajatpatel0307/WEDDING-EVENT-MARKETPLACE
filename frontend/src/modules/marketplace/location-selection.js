import { useEffect, useSyncExternalStore } from "react";
import { useMarketplace } from "./api";
import {
  subscribeToLocation,
  selectedLocation,
  setSelectedLocation,
} from "./location-store.js";
export { setSelectedLocation };
export function useSelectedLocation() {
  return useSyncExternalStore(subscribeToLocation, selectedLocation, () => "");
}
export function useCustomerLocations() {
  const state = useMarketplace("/locations"),
    selected = useSelectedLocation();
  const { retry } = state;
  useEffect(() => {
    if (
      state.data &&
      selected &&
      !state.data.some((l) => l.id.toLowerCase() === selected.toLowerCase())
    )
      setSelectedLocation("");
  }, [state.data, selected]);
  // Refresh while browsing and when returning after an admin decision.
  useEffect(() => {
    const refresh = () => retry();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [retry]);
  return state;
}
