const dayCounts = [7, 15, 30, 45, 60];

export const vendorDateOptions = [
  ["", "All dates"],
  ...dayCounts.map(days => [String(days), `Last ${days} days`]),
  ["custom", "Custom date"],
];

// Registration filters use Indian calendar days, including today.
export function vendorDateRange(period, now = new Date()) {
  if (period === "") return { from: "", to: "" };
  if (period === "custom") return null;
  const days = Number(period);
  if (!dayCounts.includes(days)) throw new RangeError("Unsupported vendor date range.");

  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const to = `${parts.year}-${parts.month}-${parts.day}`;
  const start = new Date(`${to}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to };
}
