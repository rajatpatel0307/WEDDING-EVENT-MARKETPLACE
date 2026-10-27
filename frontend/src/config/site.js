// This is the same whitelisted public configuration used by the backend.
// Keep private credentials and private addresses out of public-site.json.
import site from "../../../backend/src/config/public-site.json";
export const publicSite = {
  ...site,
  mapUrl:
    !site.contactIsPlaceholder && site.mapAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapAddress)}`
      : null,
  directionsUrl:
    !site.contactIsPlaceholder && site.mapAddress
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.mapAddress)}`
      : null,
};
