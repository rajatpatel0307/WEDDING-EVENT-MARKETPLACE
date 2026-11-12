const key = "marketplace-location";
const event = "marketplace-location-changed";
let remembered = "";
export const subscribeToLocation = (callback) => {
  window.addEventListener(event, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(event, callback);
    window.removeEventListener("storage", callback);
  };
};
export const selectedLocation = () => {
  try {
    remembered = localStorage.getItem(key) || "";
  } catch {
    /* Keep the current selection when storage is unavailable. */
  }
  return remembered;
};
export const setSelectedLocation = (value) => {
  remembered = value || "";
  try {
    if (remembered) localStorage.setItem(key, remembered);
    else localStorage.removeItem(key);
  } catch {
    /* Browsing still works when persistent storage is unavailable. */
  }
  window.dispatchEvent(new Event(event));
};
