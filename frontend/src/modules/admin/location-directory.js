export function filterLocations(locations, query = "", status = "all") {
  const search = query.trim().toLowerCase();
  return locations.filter(
    (location) =>
      [location.city, location.state, location.country]
        .join(" ")
        .toLowerCase()
        .includes(search) &&
      (status === "all" || Boolean(location.active) === (status === "active")),
  );
}

export function isLocationAvailable(locations, id) {
  return (
    Boolean(id) &&
    locations.some(
      (location) =>
        location.id === id &&
        location.managed !== false &&
        Boolean(location.active),
    )
  );
}

export function isCustomerVisible(location) {
  return (
    location.customerVisible ??
    (Boolean(location.active) && Number(location.approvedVendors) > 0)
  );
}
