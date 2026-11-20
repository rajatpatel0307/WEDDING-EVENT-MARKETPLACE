export function marketplaceSearchPath(query, city = "", category = "") {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (city) params.set("city", city);
  if (category) params.set("category", String(category));
  const search = params.toString();
  return `/search${search ? `?${search}` : ""}`;
}
