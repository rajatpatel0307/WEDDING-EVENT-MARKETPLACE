import { useMarketplace } from "../../modules/marketplace/api";
export default function RegisteredLocationField({
  value,
  onChange,
  disabled = false,
}) {
  const locations = useMarketplace("/registration-locations");
  return (
    <label className="field block mb-[18px] text-[11px] font-medium text-[#55494d]">
      <span className="block mb-[7px]">
        Registered business / service location *
      </span>
      <select
        name="adminLocationId"
        required
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || locations.loading || !!locations.error}
        className="block w-full border border-[#e8dfe0] bg-white rounded-[6px] min-h-[45px] px-[13px] py-[11px] text-[12px] text-[#453438]"
      >
        <option value="">
          {locations.loading ? "Loading locations…" : "Select location"}
        </option>
        {(locations.data || []).map((l) => (
          <option key={l.id} value={l.id}>
            {l.city}, {l.state}, {l.country}
          </option>
        ))}
      </select>
      {locations.error && (
        <span role="alert">
          {locations.error.message}{" "}
          <button type="button" onClick={locations.retry}>
            Retry
          </button>
        </span>
      )}
      {locations.data?.length === 0 && (
        <small>
          No locations are currently available. Please contact support.
        </small>
      )}
      {value &&
        locations.data &&
        !locations.data.some(
          (l) => l.id.toLowerCase() === value.toLowerCase(),
        ) && (
          <small>
            Select an available location; your previous selection is
            unavailable.
          </small>
        )}
    </label>
  );
}
