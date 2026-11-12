// Explicit, admin-authorized repair for approved vendors predating migration 031.
// Preview rolls back all writes. Pass --apply to commit the specified vendors only.
// node scripts/link-approved-vendor-locations.js ADMIN_ID VENDOR_ID ... [--apply]
import { z } from "zod";
import { sequelize } from "../src/config/database.js";
import { loadUser } from "../src/modules/auth/token.service.js";
import { requireRole } from "../src/middleware/auth.middleware.js";
import * as repo from "../src/modules/admin/admin.repository.js";
import { locationInput } from "../src/modules/addresses/admin-locations.service.js";
import { approvedVendor } from "../src/modules/addresses/location-policy.js";

const args = process.argv.slice(2),
  apply = args.includes("--apply");
const [adminId, ...vendorIds] = args.filter((arg) => arg !== "--apply");
let preview;
try {
  z.guid().parse(adminId);
  z.array(z.guid()).min(1).max(100).parse(vendorIds);
  const user = await loadUser(adminId);
  const ctx = {
    auth: { user },
    req: {
      ip: "127.0.0.1",
      get: () => "Explicit approved-vendor location backfill",
    },
  };
  requireRole(ctx, "ADMIN");
  const rows = await repo.transaction(async (tx) => {
    const results = [];
    for (const id of [...new Set(vendorIds)]) {
      const [vendor] = await repo.select(
        `SELECT v.VendorId,v.AdminLocationId,v.BusinessName
        FROM dbo.Vendors v WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Users u ON u.UserId=v.UserId
        WHERE v.VendorId=:id AND ${approvedVendor}`,
        { id },
        tx,
      );
      if (!vendor)
        throw Error(
          "Each selected vendor must be approved, active and have an eligible owner account.",
        );
      if (vendor.AdminLocationId) {
        results.push({
          vendor: vendor.BusinessName,
          result: "Already linked; preserved existing assignment.",
        });
        continue;
      }
      const [address] = await repo.select(
        `SELECT TOP(1) City,State,Country FROM dbo.VendorLocations WITH(HOLDLOCK)
        WHERE VendorId=:id AND IsActive=1 ORDER BY IsPrimary DESC,CreatedAt,VendorLocationId`,
        { id },
        tx,
      );
      if (!address)
        throw Error("A selected vendor has no active saved business address.");
      const location = locationInput.parse({
        city: address.City,
        state: address.State,
        country: address.Country,
        active: true,
      });
      const [existing] = await repo.select(
        `SELECT LocationId,IsActive,DeletedAt FROM dbo.AdminLocations WITH(UPDLOCK,HOLDLOCK)
        WHERE City=:city AND State=:state AND Country=:country ORDER BY CASE WHEN DeletedAt IS NULL THEN 0 ELSE 1 END,CreatedAt DESC`,
        location,
        tx,
      );
      if (existing && (!existing.IsActive || existing.DeletedAt))
        throw Error(
          "A matching location was disabled or deleted by an administrator; it must be reviewed manually.",
        );
      let locationId = existing?.LocationId;
      if (!locationId) {
        const [created] = await repo.insert(
          { table: "AdminLocations", id: "LocationId" },
          {
            City: location.city,
            State: location.state,
            Country: location.country,
            IsActive: 1,
            CreatedBy: user.id,
          },
          tx,
        );
        locationId = created.id;
        await repo.auditAdmin(
          ctx,
          "LOCATION_CREATED",
          "AdminLocations",
          locationId,
          null,
          {
            ...location,
            source: "Explicit approved-vendor backfill",
            vendorId: id,
          },
          tx,
        );
      }
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
        { locationId: null },
        { locationId, source: "Explicit approved-vendor backfill" },
        tx,
      );
      results.push({
        vendor: vendor.BusinessName,
        city: location.city,
        state: location.state,
        result: "Linked saved approved location.",
      });
    }
    if (!apply) {
      preview = results;
      throw new Error("LOCATION_BACKFILL_PREVIEW_ROLLBACK");
    }
    return results;
  });
  console.log(JSON.stringify({ applied: true, records: rows }, null, 2));
} catch (error) {
  if (error.message === "LOCATION_BACKFILL_PREVIEW_ROLLBACK" && preview)
    console.log(
      JSON.stringify(
        {
          applied: false,
          records: preview,
          message:
            "Preview only; all changes rolled back. Use --apply to commit.",
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
