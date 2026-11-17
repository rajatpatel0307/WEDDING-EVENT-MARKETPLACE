export function marketplaceDestination({ pathname = "", search = "", hash = "" }) {
  const params = new URLSearchParams(search);
  let target = "/services";
  if (/^\/customer\/discover\/?$/.test(pathname)) {
    const sections = { services: "/services", vendors: "/vendors", packages: "/packages", offers: "/offers" };
    const type = params.get("type");
    target = Object.hasOwn(sections, type) ? sections[type] : params.get("venue") === "1" ? "/venues" : "/services";
    params.delete("type");
    params.delete("venue");
  } else {
    const match = pathname.match(/^\/customer\/(services|vendors)(\/[^/]+)?\/?$/);
    if (match) target = `/${match[1]}${match[2] || ""}`;
  }
  const query = params.toString();
  return `${target}${query ? `?${query}` : ""}${hash}`;
}
