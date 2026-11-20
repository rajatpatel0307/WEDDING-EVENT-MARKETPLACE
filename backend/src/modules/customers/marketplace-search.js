export function marketplaceSearch(query, fields) {
  const normalized = query.trim().replace(/^wedding\s+/i, "")
    .replace(/\bphotographers?\b/gi, "photography")
    .replace(/\b(?:videographers?|cinematographers?)\b/gi, "videography")
    .replace(/\bcaterers?\b/gi, "catering")
    .replace(/\bdecorators?\b/gi, "decoration")
    .replace(/\bmake\s*up\s+artists?\b/gi, "makeup")
    .replace(/\bvenues\b/gi, "venue")
    .replace(/\bjewelry\b/gi, "jewellery");
  const terms = [...new Set(normalized.split(/\s+/).filter(Boolean))];
  const params = {};
  const sql = terms.map((term, index) => {
    const key = `search${index}`;
    params[key] = `%${term.replace(/[\[\]%_]/g, character => `[${character}]`)}%`;
    return `(${fields.map(field => `${field} LIKE :${key}`).join(" OR ")})`;
  }).join(" AND ") || "1=1";
  return { sql, params };
}
