const text = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
const identity = (location) => {
  const rawCountry = text(location.country);
  const country = ["india", "in", "ind"].includes(rawCountry)
    ? "india"
    : rawCountry;
  const rawState = text(location.state);
  const state =
    country === "india" &&
    ["up", "uttarpradesh"].includes(rawState.replace(/[.\s]/g, ""))
      ? "uttar pradesh"
      : rawState;
  return [text(location.city), state, country];
};
export function findExistingLocation(locations, input) {
  const expected = identity(input);
  return locations.find((location) =>
    identity(location).every((value, index) => value === expected[index]),
  );
}
