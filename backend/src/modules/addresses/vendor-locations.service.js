import { z } from "zod";
import {
  scope,
  repo,
  owned,
  audit,
  fail,
} from "../vendors/workspace.common.js";
export async function list(ctx) {
  const { id } = scope(ctx);
  return repo.select(
    "SELECT VendorLocationId AS id,LocationName AS name,LocationType AS type,AddressLine1 AS address,AddressLine2 AS line2,City AS city,State AS state,Country AS country,PostalCode AS postalCode,Latitude AS latitude,Longitude AS longitude,IsPrimary AS [primary],IsActive AS active,UpdatedAt AS updatedAt FROM dbo.VendorLocations WHERE VendorId=:id ORDER BY IsPrimary DESC,CreatedAt DESC,VendorLocationId",
    { id },
  );
}
export async function action(recordId, input, ctx, remove = false) {
  const { id } = scope(ctx);
  z.guid().parse(recordId);
  z.object({}).strict().parse(input);
  return repo.transaction(async (tx) => {
    await repo.select(
      "SELECT VendorId FROM dbo.Vendors WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:id",
      { id },
      tx,
    );
    const old = await owned("locations", recordId, id, tx);
    if (remove) {
      const [reference] = await repo.select(
        "SELECT TOP(1) ServiceId FROM dbo.Services s WHERE s.VendorId=:id AND s.IsActive=1 AND EXISTS(SELECT 1 FROM OPENJSON(s.DetailsJson,'$.location.vendorLocationIds') WHERE LOWER(value)=LOWER(CONVERT(varchar(36),:recordId)))",
        { id, recordId },
        tx,
      );
      if (reference)
        fail(
          "Reassign active services before archiving this business location.",
          409,
        );
      await repo.update(
        { table: "VendorLocations", id: "VendorLocationId" },
        recordId,
        { IsActive: 0, IsPrimary: 0, UpdatedAt: new Date() },
        tx,
      );
    } else {
      if (!old.IsActive)
        fail("Activate the location before making it primary.", 409);
      await repo.select(
        "UPDATE dbo.VendorLocations SET IsPrimary=0,UpdatedAt=SYSUTCDATETIME() WHERE VendorId=:id",
        { id },
        tx,
      );
      await repo.update(
        { table: "VendorLocations", id: "VendorLocationId" },
        recordId,
        { IsPrimary: 1, UpdatedAt: new Date() },
        tx,
      );
    }
    await audit(
      ctx,
      remove ? "LOCATION_ARCHIVED" : "PRIMARY_LOCATION_CHANGED",
      "VendorLocations",
      recordId,
      null,
      null,
      tx,
    );
    return {
      message: remove
        ? "Business location archived; historical records are preserved."
        : "Primary location updated.",
    };
  });
}
