// Quote every cell and prevent user content from becoming spreadsheet formulas.
export function csvCell(value) {
  const s = String(value ?? "");
  return `"${(/^[\s]*[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""')}"`;
}
