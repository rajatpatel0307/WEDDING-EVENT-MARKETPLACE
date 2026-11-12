import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as repo from "../admin/admin.repository.js";
import { approvedVendor } from "./location-policy.js";

export function normalizeLocation(value) {
  const country = /^(india|in|ind)$/i.test(value.country.trim())
    ? "India"
    : value.country.trim();
  const state =
    country === "India" &&
    /^(up|uttarpradesh)$/i.test(value.state.replace(/[.\s]/g, ""))
      ? "Uttar Pradesh"
      : value.state.trim();
  return {
    ...value,
    city: value.city.trim().replace(/\s+/g, " "),
    state,
    country,
  };
}
export const locationInput = z
  .object({
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    country: z.string().trim().min(2).max(100).default("India"),
    active: z.boolean().default(true),
  })
  .strict()
  .transform(normalizeLocation);
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const fields =
  "LocationId AS id,City AS city,State AS state,Country AS country,IsActive AS active";
export async function availableLocations() {
  return repo.select(
    `SELECT ${fields} FROM dbo.AdminLocations WHERE IsActive=1 AND DeletedAt IS NULL ORDER BY City,State,Country,LocationId`,
  );
}
export async function customerLocations() {
  return repo.select(`SELECT ${fields} FROM dbo.AdminLocations al WHERE al.IsActive=1 AND al.DeletedAt IS NULL
    AND EXISTS(SELECT 1 FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId
      WHERE v.AdminLocationId=al.LocationId AND ${approvedVendor}) ORDER BY City,State,Country,LocationId`);
}
export async function assertActiveLocation(id, tx) {
  z.guid().parse(id);
  const [row] = await repo.select(
    `SELECT LocationId,City,State,Country FROM dbo.AdminLocations WITH(HOLDLOCK)
    WHERE LocationId=:id AND IsActive=1 AND DeletedAt IS NULL`,
    { id },
    tx,
  );
  if (!row) fail("Select an active location created by the administrator.");
  return row;
}
export async function list(ctx) {
  requireRole(ctx, "ADMIN");
  return repo.select(`SELECT ${fields},UpdatedAt AS updatedAt,
    (SELECT COUNT(*) FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId WHERE v.AdminLocationId=al.LocationId AND ${approvedVendor}) AS approvedVendors
    FROM dbo.AdminLocations al WHERE DeletedAt IS NULL ORDER BY City,State,Country,LocationId`);
}
export async function save(id, input, ctx, remove = false) {
  const user = requireRole(ctx, "ADMIN");
  if (id) z.guid().parse(id);
  const body = remove
    ? z.object({}).strict().parse(input)
    : locationInput.parse(input);
  return repo.transaction(async (tx) => {
    let old;
    if (id) {
      [old] = await repo.select(
        "SELECT * FROM dbo.AdminLocations WITH(UPDLOCK,HOLDLOCK) WHERE LocationId=:id AND DeletedAt IS NULL",
        { id },
        tx,
      );
      if (!old) fail("Location not found.", 404);
    }
    if (!remove) {
      const [existing] = await repo.select(
        `SELECT ${fields} FROM dbo.AdminLocations WITH(UPDLOCK,HOLDLOCK)
          WHERE City=:city AND State=:state AND Country=:country AND DeletedAt IS NULL`,
        { city: body.city, state: body.state, country: body.country },
        tx,
      );
      if (existing && existing.id.toLowerCase() !== id?.toLowerCase()) {
        if (id)
          fail(
            "This location already exists. Edit the existing location instead.",
            409,
          );
        // A repeated create must neither duplicate nor change an existing location.
        return {
          success: true,
          id: existing.id,
          existingLocation: existing,
          message: `${existing.city} already exists.`,
        };
      }
    }
    const values = remove
      ? { IsActive: 0, DeletedAt: new Date(), UpdatedAt: new Date() }
      : {
          City: body.city,
          State: body.state,
          Country: body.country,
          IsActive: body.active ? 1 : 0,
          UpdatedAt: new Date(),
        };
    if (id)
      await repo.update(
        { table: "AdminLocations", id: "LocationId" },
        id,
        values,
        tx,
      );
    else {
      const [row] = await repo.insert(
        { table: "AdminLocations", id: "LocationId" },
        { ...values, CreatedBy: user.id },
        tx,
      );
      id = row.id;
    }
    await repo.auditAdmin(
      ctx,
      remove
        ? "LOCATION_DELETED"
        : old
          ? "LOCATION_UPDATED"
          : "LOCATION_CREATED",
      "AdminLocations",
      id,
      old || null,
      values,
      tx,
    );
    return {
      success: true,
      message: remove ? "Location deleted." : "Location saved.",
      id,
    };
  });
}
export async function assignVendor(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const { locationId } = z
    .object({ locationId: z.guid() })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const [vendor] = await repo.select(
      "SELECT VendorId,AdminLocationId FROM dbo.Vendors WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:id",
      { id },
      tx,
    );
    if (!vendor) fail("Vendor not found.", 404);
    await assertActiveLocation(locationId, tx);
    await repo.update(
      { table: "Vendors", id: "VendorId" },
      id,
      { AdminLocationId: locationId, UpdatedAt: new Date() },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "VENDOR_LOCATION_ASSIGNED",
      "Vendors",
      id,
      { locationId: vendor.AdminLocationId },
      { locationId },
      tx,
    );
    return { success: true, message: "Registered location updated." };
  });
}
