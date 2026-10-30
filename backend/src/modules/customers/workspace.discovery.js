import { z } from "zod";
import { recordServiceMetric } from "../vendors/service-metrics.js";
import {
  scope,
  repo,
  eligibleVendor,
  fail,
  pageInput,
  insert,
  audit,
} from "./workspace.common.js";
export const discoveryInput = pageInput
  .extend({
    q: z.string().trim().max(150).default(""),
    category: z.coerce.number().int().nonnegative().default(0),
    city: z.string().trim().max(100).default(""),
    min: z.coerce.number().min(0).max(1e8).default(0),
    max: z.coerce.number().min(0).max(1e8).default(1e8),
    rating: z.coerce.number().min(0).max(5).default(0),
    type: z
      .enum(["services", "packages", "vendors", "offers"])
      .default("services"),
  })
  .refine((v) => v.max >= v.min, {
    message: "Maximum price must exceed minimum price.",
  });
const location =
  "OUTER APPLY(SELECT TOP(1) City,State FROM dbo.VendorLocations WHERE VendorId=v.VendorId AND IsActive=1 ORDER BY IsPrimary DESC,CreatedAt) l";
const source = `dbo.Services s JOIN dbo.Vendors v ON v.VendorId=s.VendorId JOIN dbo.Users u ON u.UserId=v.UserId JOIN dbo.Categories c ON c.CategoryId=s.CategoryId ${location}`;
const image = `OUTER APPLY(SELECT TOP(1) MediaUrl FROM dbo.Media WHERE EntityId=s.ServiceId AND LOWER(EntityType)='service' AND MediaType='Image' ORDER BY IsPrimary DESC,SortOrder,CreatedAt) m`;
const fields = `s.ServiceId AS serviceId,v.VendorId AS vendorId,v.BusinessName AS vendor,c.CategoryName AS category,c.CategoryId AS categoryId,l.City AS city,v.AverageRating AS rating,v.TotalReviews AS reviews,m.MediaUrl AS image`;
export async function catalog(ctx) {
  scope(ctx);
  return {
    categories: await repo.select(
      "SELECT CategoryId AS id,CategoryName AS name FROM dbo.Categories WHERE IsActive=1 ORDER BY SortOrder,CategoryName",
    ),
    cities: await repo.select(
      `SELECT DISTINCT l.City AS name FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId ${location} WHERE ${eligibleVendor} AND l.City IS NOT NULL ORDER BY name`,
    ),
  };
}
export async function discover(input, ctx) {
  scope(ctx);
  const q = discoveryInput.parse(input);
  const p = {
    ...q,
    q: `%${q.q.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`,
    city: `%${q.city.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`,
    offset: (q.page - 1) * q.pageSize,
    size: q.pageSize,
  };
  const packages = q.type === "packages";
  if (q.type === "vendors") {
    const where = `${eligibleVendor} AND (v.BusinessName LIKE :q) AND (:category = 0 OR EXISTS(SELECT 1 FROM dbo.VendorCategories vc WHERE vc.VendorId=v.VendorId AND vc.CategoryId=:category)) AND COALESCE(l.City,'') LIKE :city AND v.AverageRating>=:rating`;
    const from = `dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId ${location}`;
    const [count] = await repo.select(
      `SELECT COUNT(*) AS total FROM ${from} WHERE ${where}`,
      p,
    );
    return {
      ...q,
      total: count.total,
      rows: await repo.select(
        `SELECT v.VendorId AS id,v.VendorId AS vendorId,v.BusinessName AS name,v.BusinessName AS vendor,l.City AS city,v.LogoUrl AS image,v.AverageRating AS rating,v.TotalReviews AS reviews,'Vendor' AS type FROM ${from} WHERE ${where} ORDER BY v.AverageRating DESC,v.VendorId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
        p,
      ),
    };
  }
  const price = packages
    ? "p.FinalPrice"
    : "COALESCE(s.BasePrice,s.MinimumPrice)";
  const offer =
    q.type === "offers"
      ? `AND EXISTS(SELECT 1 FROM dbo.Offers o WHERE o.VendorId=v.VendorId AND o.IsActive=1 AND o.StartDate<=SYSUTCDATETIME() AND o.EndDate>=SYSUTCDATETIME())`
      : "";
  const where = `${eligibleVendor} AND s.IsActive=1 AND s.ApprovalStatus='Approved' AND c.IsActive=1 ${packages ? "AND p.IsActive=1" : ""} AND (:category = 0 OR s.CategoryId=:category) AND (s.ServiceName LIKE :q OR v.BusinessName LIKE :q ${packages ? "OR p.PackageName LIKE :q" : ""}) AND COALESCE(l.City,'') LIKE :city AND (${price} BETWEEN :min AND :max OR (${price} IS NULL AND :min = 0)) AND v.AverageRating>=:rating ${offer}`;
  const from = `${source} ${packages ? "JOIN dbo.ServicePackages p ON p.ServiceId=s.ServiceId" : ""}`;
  const [count] = await repo.select(
    `SELECT COUNT(*) AS total FROM ${from} WHERE ${where}`,
    p,
  );
  return {
    ...q,
    total: count.total,
    rows: await repo.select(
      `SELECT ${packages ? "p.PackageId" : "s.ServiceId"} AS id,${packages ? "p.PackageName" : "s.ServiceName"} AS name,${price} AS price,s.PricingType AS pricingType,'${packages ? "Package" : "Service"}' AS type,${fields} FROM ${from} ${image} WHERE ${where} ORDER BY v.AverageRating DESC,s.CreatedAt DESC,s.ServiceId ${packages ? ",p.PackageId" : ""} OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
      p,
    ),
  };
}
export async function serviceDetails(id, ctx, track = true) {
  scope(ctx);
  z.guid().parse(id);
  const [service] = await repo.select(
    `SELECT s.ServiceId AS id,s.ServiceName AS name,s.Description AS description,s.PricingType AS pricingType,s.BasePrice AS price,s.MinimumPrice AS minimumPrice,s.MaximumPrice AS maximumPrice,s.MinimumGuests AS minGuests,s.MaximumGuests AS maxGuests,s.AttributesJson AS attributes,${fields} FROM ${source} ${image} WHERE s.ServiceId=:id AND c.IsActive=1 AND s.IsActive=1 AND s.ApprovalStatus='Approved' AND ${eligibleVendor}`,
    { id },
  );
  if (!service) fail("This service is no longer available.", 404);
  if (track) await recordServiceMetric(id, "Views");
  return {
    service,
    items: await repo.select(
      "SELECT ServiceItemId AS id,ItemName AS name,Description AS description,UnitPrice AS price,IsIncluded AS included FROM dbo.ServiceItems WHERE ServiceId=:id ORDER BY SortOrder,ServiceItemId",
      { id },
    ),
    packages: await repo.select(
      "SELECT PackageId AS id,PackageName AS name,Description AS description,Price AS originalPrice,DiscountPercentage AS discount,FinalPrice AS price,MinimumGuests AS minGuests,MaximumGuests AS maxGuests FROM dbo.ServicePackages WHERE ServiceId=:id AND IsActive=1 ORDER BY FinalPrice",
      { id },
    ),
    reviews: await repo.select(
      "SELECT TOP(10) CONCAT(u.FirstName,' ',LEFT(u.LastName,1)) AS customer,r.Rating AS rating,r.ReviewText AS text,r.CreatedAt AS createdAt FROM dbo.Reviews r JOIN dbo.Users u ON u.UserId=r.CustomerId WHERE r.VendorId=:vendor AND r.IsPublished=1 ORDER BY r.CreatedAt DESC",
      { vendor: service.vendorId },
    ),
  };
}
export async function vendorDetails(id, ctx) {
  scope(ctx);
  z.guid().parse(id);
  const [vendor] = await repo.select(
    `SELECT v.VendorId AS id,v.BusinessName AS name,v.BusinessDescription AS description,v.ContactEmail AS email,v.ContactPhone AS phone,l.City AS city,l.State AS state,v.LogoUrl AS image,v.CoverImageUrl AS cover,v.AverageRating AS rating,v.TotalReviews AS reviews FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId ${location} WHERE v.VendorId=:id AND ${eligibleVendor}`,
    { id },
  );
  if (!vendor) fail("Vendor unavailable.", 404);
  return {
    vendor,
    services: await repo.select(
      `SELECT s.ServiceId AS id,s.ServiceId AS serviceId,s.ServiceName AS name,s.BasePrice AS price,s.PricingType AS pricingType,'Service' AS type,${fields} FROM ${source} ${image} WHERE v.VendorId=:id AND ${eligibleVendor} AND s.IsActive=1 AND s.ApprovalStatus='Approved' ORDER BY s.CreatedAt DESC`,
      { id },
    ),
  };
}
export async function wishlist(ctx) {
  const { id } = scope(ctx);
  return repo.select(
    `SELECT w.WishlistId AS id,w.ServiceId AS savedServiceId,w.PackageId AS packageId,COALESCE(s.ServiceId,ps.ServiceId) AS serviceId,v.VendorId AS vendorId,COALESCE(p.PackageName,s.ServiceName,v.BusinessName) AS name,v.BusinessName AS vendor,l.City AS city,v.AverageRating AS rating,COALESCE(p.FinalPrice,s.BasePrice) AS price,COALESCE(m.MediaUrl,v.LogoUrl) AS image,CASE WHEN w.PackageId IS NOT NULL THEN 'Package' WHEN w.ServiceId IS NOT NULL THEN 'Service' ELSE 'Vendor' END AS type,CASE WHEN ${eligibleVendor} AND (COALESCE(s.IsActive,ps.IsActive,1)=1) AND COALESCE(s.ApprovalStatus,ps.ApprovalStatus,'Approved')='Approved' AND COALESCE(p.IsActive,1)=1 AND (COALESCE(s.CategoryId,ps.CategoryId) IS NULL OR EXISTS(SELECT 1 FROM dbo.Categories ac WHERE ac.CategoryId=COALESCE(s.CategoryId,ps.CategoryId) AND ac.IsActive=1)) THEN 1 ELSE 0 END AS available FROM dbo.Wishlists w LEFT JOIN dbo.Services s ON s.ServiceId=w.ServiceId LEFT JOIN dbo.ServicePackages p ON p.PackageId=w.PackageId LEFT JOIN dbo.Services ps ON ps.ServiceId=p.ServiceId JOIN dbo.Vendors v ON v.VendorId=COALESCE(w.VendorId,s.VendorId,ps.VendorId) JOIN dbo.Users u ON u.UserId=v.UserId ${location} OUTER APPLY(SELECT TOP(1) MediaUrl FROM dbo.Media WHERE EntityId=COALESCE(s.ServiceId,ps.ServiceId) AND LOWER(EntityType)='service' AND MediaType='Image' ORDER BY IsPrimary DESC,SortOrder) m WHERE w.CustomerId=:id ORDER BY w.CreatedAt DESC`,
    { id },
  );
}
export async function saveWishlist(input, ctx) {
  const { id } = scope(ctx);
  const b = z
    .object({ type: z.enum(["Service", "Package", "Vendor"]), id: z.guid() })
    .strict()
    .parse(input);
  const column = {
    Service: "ServiceId",
    Package: "PackageId",
    Vendor: "VendorId",
  }[b.type];
  if (b.type === "Vendor") await vendorDetails(b.id, ctx);
  else if (b.type === "Service") await serviceDetails(b.id, ctx, false);
  else {
    const [p] = await repo.select(
      "SELECT ServiceId FROM dbo.ServicePackages WHERE PackageId=:id AND IsActive=1",
      { id: b.id },
    );
    if (!p) fail("Package unavailable.", 404);
    await serviceDetails(p.ServiceId, ctx, false);
  }
  return repo.transaction(async (tx) => {
    const [old] = await repo.select(
      `SELECT WishlistId AS id FROM dbo.Wishlists WITH(UPDLOCK,HOLDLOCK) WHERE CustomerId=:id AND [${column}]=:target`,
      { id, target: b.id },
      tx,
    );
    if (old) return { ...old, message: "Already in your wishlist." };
    const row = await insert(
      "Wishlists",
      "WishlistId",
      { CustomerId: id, [column]: b.id },
      tx,
    );
    await audit(ctx, "WISHLIST_ADDED", "Wishlists", row.id, null, b, tx);
    return { ...row, message: "Saved to your wishlist." };
  });
}
export async function removeWishlist(recordId, ctx) {
  const { id } = scope(ctx);
  z.coerce.number().int().positive().parse(recordId);
  await repo.select(
    "DELETE FROM dbo.Wishlists WHERE WishlistId=:recordId AND CustomerId=:id",
    { recordId, id },
  );
  return { message: "Removed from wishlist." };
}
