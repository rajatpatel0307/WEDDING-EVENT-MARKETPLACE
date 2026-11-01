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
      className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
      target="_blank"
      rel="noopener noreferrer"
      href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(value.latitude)}&mlon=${encodeURIComponent(value.longitude)}#map=16/${encodeURIComponent(value.latitude)}/${encodeURIComponent(value.longitude)}`}
    >
      View coordinates on map
    </a>
  );
}
