import { z } from "zod";
import {
  scope,
  repo,
  owned,
  fail,
  audit,
} from "../customers/workspace.common.js";
import { eventLocationInput } from "./location.validation.js";
export async function eventLocation(eventId, ctx) {
  const { id } = scope(ctx);
  const e = await owned("events", eventId, id, undefined, false);
  return e.LocationJson ? JSON.parse(e.LocationJson) : null;
}
export async function saveEventLocation(eventId, input, ctx, remove = false) {
  const { id } = scope(ctx);
  return repo.transaction(async (tx) => {
    const e = await owned("events", eventId, id, tx);
    if (["Cancelled", "Completed"].includes(e.Status))
      fail("This event is read-only.", 409);
    const [booking] = await repo.select(
      "SELECT TOP(1) BookingId FROM dbo.Booking WITH(UPDLOCK,HOLDLOCK) WHERE EventId=:eventId AND BookingStatus NOT IN('Cancelled','Rejected','Refunded')",
      { eventId },
      tx,
    );
    if (booking)
      fail(
        "Use the booking change workflow with your vendor before changing this event location.",
        409,
      );
    let data = input;
    if (!remove && input.addressId) {
      z.object({ addressId: z.guid() }).strict().parse(input);
      const a = await owned("addresses", input.addressId, id, tx);
      data = {
        line1: a.AddressLine1,
        line2: a.AddressLine2 || "",
        landmark: a.Landmark || "",
        city: a.City,
        state: a.State,
        country: a.Country,
        postalCode: a.PostalCode,
        district: a.District || "",
        latitude: a.Latitude,
        longitude: a.Longitude,
        contactName: a.FullName || "",
        contactPhone: a.Phone || "",
      };
    }
    const next = remove ? null : eventLocationInput.parse(data);
    await repo.update(
      { table: "Events", id: "EventId" },
      eventId,
      {
        LocationJson: next ? JSON.stringify(next) : null,
        ...(next ? { City: next.city, State: next.state } : {}),
        UpdatedAt: new Date(),
      },
      tx,
    );
    await audit(
      ctx,
      "EVENT_LOCATION_UPDATED",
      "Events",
      eventId,
      null,
      { removed: remove },
      tx,
    );
    return {
      message: remove ? "Event location removed." : "Event location saved.",
      data: next,
    };
  });
}
export function validateCoverage(
  location,
  eventLocation,
  orderValue = Infinity,
) {
  if (!location) return { travel: 0 };
  if (location.active === false)
    fail("This service location is inactive.", 409);
  const destination = eventLocation;
  if (location.mode !== "Vendor location" && destination) {
    const cities = location.cities?.length
      ? location.cities
      : location.city
        ? [location.city]
        : [];
    if (
      cities.length &&
      !cities.some((c) => c.toLowerCase() === destination.city.toLowerCase())
    )
      fail("The event city is outside the service coverage.", 409);
    if (
      location.postalCodes?.length &&
      !location.postalCodes.includes(destination.postalCode)
    )
      fail("The event postal code is outside the service coverage.", 409);
    if (
      location.country &&
      destination.country &&
      location.country.toLowerCase() !== destination.country.toLowerCase()
    )
      fail("The event country is outside the service coverage.", 409);
    if (location.radiusKm != null) {
      if (
        [
          location.latitude,
          location.longitude,
          destination.latitude,
          destination.longitude,
        ].some((v) => v == null)
      )
        fail("Coordinates are required to validate this service radius.", 409);
      const rad = (n) => (n * Math.PI) / 180,
        deltaLat = rad(destination.latitude - location.latitude),
        deltaLon = rad(destination.longitude - location.longitude);
      const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(rad(location.latitude)) *
          Math.cos(rad(destination.latitude)) *
          Math.sin(deltaLon / 2) ** 2;
      if (
        6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))) >
        location.radiusKm
      )
        fail("The event venue is outside the service radius.", 409);
    }
  }
  if (orderValue < Number(location.minimumOrderValue || 0))
    fail("The booking does not meet the service location minimum value.", 409);
  return {
    travel:
      location.mode === "Vendor location"
        ? 0
        : Number(location.travelCharge || 0),
  };
}
