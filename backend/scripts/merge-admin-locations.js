// Consolidate explicitly selected equivalent locations; preview rolls back.
// node scripts/merge-admin-locations.js ADMIN_ID KEEP_ID DUPLICATE_ID [--apply]
import { z } from "zod";
import { sequelize } from "../src/config/database.js";
import { loadUser } from "../src/modules/auth/token.service.js";
import { requireRole } from "../src/middleware/auth.middleware.js";
import * as repo from "../src/modules/admin/admin.repository.js";
import { locationInput } from "../src/modules/addresses/admin-locations.service.js";
const args = process.argv.slice(2),
  apply = args.includes("--apply");
let preview;
try {
  const [adminId, keepId, duplicateId] = z
    .array(z.guid())
    .length(3)
    .parse(args.filter((arg) => arg !== "--apply"));
  if (keepId.toLowerCase() === duplicateId.toLowerCase())
    throw Error("Choose two different locations.");
  const ctx = {
    auth: { user: await loadUser(adminId) },
    req: {
      ip: "127.0.0.1",
      get: () => "Explicit duplicate admin location correction",
    },
  };
  requireRole(ctx, "ADMIN");
  const result = await repo.transaction(async (tx) => {
    const rows = await repo.select(
      "SELECT * FROM dbo.AdminLocations WITH(UPDLOCK,HOLDLOCK) WHERE LocationId IN (:ids) ORDER BY LocationId",
      { ids: [keepId, duplicateId] },
      tx,
    );
    const keep = rows.find(
      (row) => row.LocationId.toLowerCase() === keepId.toLowerCase(),
    );
    const duplicate = rows.find(
      (row) => row.LocationId.toLowerCase() === duplicateId.toLowerCase(),
    );
    if (!keep || !duplicate || keep.DeletedAt || duplicate.DeletedAt)
      throw Error("Both locations must exist and be undeleted.");
    const normalized = (row) =>
      locationInput.parse({
        city: row.City,
        state: row.State,
        country: row.Country,
        active: Boolean(row.IsActive),
      });
    const canonical = normalized(keep),
      other = normalized(duplicate);
    for (const field of ["city", "state", "country"])
      if (canonical[field].toLowerCase() !== other[field].toLowerCase())
        throw Error("Only equivalent locations can be consolidated.");
    if (canonical.active !== other.active)
      throw Error(
        "Resolve different location activation states before merging.",
      );
    // Preserve the surviving ID so existing customer selections keep working.
    const linked = await repo.select(
      "SELECT VendorId FROM dbo.Vendors WITH(UPDLOCK,HOLDLOCK) WHERE AdminLocationId=:duplicateId ORDER BY VendorId",
      { duplicateId },
      tx,
    );
    for (const vendor of linked) {
      await repo.update(
        { table: "Vendors", id: "VendorId" },
        vendor.VendorId,
        { AdminLocationId: keepId, UpdatedAt: new Date() },
        tx,
      );
      await repo.auditAdmin(
        ctx,
        "VENDOR_LOCATION_ASSIGNED",
        "Vendors",
        vendor.VendorId,
        { locationId: duplicateId },
        { locationId: keepId, source: "Duplicate location correction" },
        tx,
      );
    }
    // Preserve any saved onboarding selection as well as the foreign key.
    await repo.select(
      "UPDATE dbo.Vendors SET ProfileDraftJson=JSON_MODIFY(ProfileDraftJson,'$.adminLocationId',:keepId),UpdatedAt=SYSUTCDATETIME() WHERE ISJSON(ProfileDraftJson)=1 AND LOWER(JSON_VALUE(CASE WHEN ISJSON(ProfileDraftJson)=1 THEN ProfileDraftJson ELSE '{}' END,'$.adminLocationId'))=LOWER(:duplicateId)",
      { keepId, duplicateId },
      tx,
    );
    await repo.update(
      { table: "AdminLocations", id: "LocationId" },
      duplicateId,
      { IsActive: 0, DeletedAt: new Date(), UpdatedAt: new Date() },
      tx,
    );
    await repo.update(
      { table: "AdminLocations", id: "LocationId" },
      keepId,
      {
        City: canonical.city,
        State: canonical.state,
        Country: canonical.country,
        UpdatedAt: new Date(),
      },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "LOCATION_MERGED",
      "AdminLocations",
      keepId,
      { kept: keep, duplicate },
      {
        ...canonical,
        mergedLocationId: duplicateId,
        movedVendors: linked.length,
      },
      tx,
    );
    const summary = {
      city: canonical.city,
      state: canonical.state,
      retainedLocationId: keepId,
      archivedLocationId: duplicateId,
      movedVendors: linked.length,
    };
    if (!apply) {
      preview = summary;
      throw Error("LOCATION_MERGE_PREVIEW_ROLLBACK");
    }
    return summary;
  });
  console.log(JSON.stringify({ applied: true, ...result }, null, 2));
} catch (error) {
  if (error.message === "LOCATION_MERGE_PREVIEW_ROLLBACK" && preview)
    console.log(
      JSON.stringify(
        {
          applied: false,
          ...preview,
          message: "Preview only; all changes rolled back.",
        },
        null,
        2,
      ),
    );
  else {
    console.error(error.message);
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
