import { Field } from "./WorkspaceUI";
export const addressKeys = [
  "line1",
  "line2",
  "landmark",
  "city",
  "district",
  "state",
  "country",
  "postalCode",
  "latitude",
  "longitude",
];
export function LocationFields({ value = {} }) {
  return (
    <>
      {[
        ["line1", "Address line 1", true, 300],
        ["line2", "Address line 2", false, 300],
        ["landmark", "Landmark", false, 200],
        ["city", "City", true, 100],
        ["district", "District", false, 100],
        ["state", "State", true, 100],
        ["country", "Country", true, 100],
        ["postalCode", "Postal code", true, 20],
      ].map(([key, label, required, maxLength]) => (
        <Field key={key} label={label}>
          <input
            name={key}
            defaultValue={value[key] ?? (key === "country" ? "India" : "")}
            required={required}
            maxLength={maxLength}
          />
        </Field>
      ))}
      {["latitude", "longitude"].map((key, i) => (
        <Field key={key} label={`${i ? "Longitude" : "Latitude"} (optional)`}>
          <input
            type="number"
            step="any"
            min={i ? -180 : -90}
            max={i ? 180 : 90}
            name={key}
            defaultValue={value[key] ?? ""}
          />
        </Field>
      ))}
      <p>
        Enter the address manually. Coordinates are optional; autocomplete is
        not configured.
      </p>
    </>
  );
}
export function MapLink({ value }) {
  if (
    value?.latitude == null ||
    value?.longitude == null ||
    value.latitude === "" ||
    value.longitude === ""
  )
    return null;
  return (
    <a
      className="cw-button"
      target="_blank"
      rel="noopener noreferrer"
      href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(value.latitude)}&mlon=${encodeURIComponent(value.longitude)}#map=16/${encodeURIComponent(value.latitude)}/${encodeURIComponent(value.longitude)}`}
    >
      View coordinates on map
    </a>
  );
}
