import { readFileSync } from "node:fs";
const configuration = JSON.parse(
  readFileSync(
    new URL("../../config/public-site.json", import.meta.url),
    "utf8",
  ),
);
export function publicCompany() {
  const { mapAddress, ...company } = configuration;
  const hasPublicAddress = !company.contactIsPlaceholder && mapAddress;
  return {
    ...company,
    mapUrl: hasPublicAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapAddress)}`
      : null,
    directionsUrl: hasPublicAddress
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapAddress)}`
      : null,
  };
}
