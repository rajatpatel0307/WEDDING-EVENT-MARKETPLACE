import { z } from "zod";
import { assertServiceSchedule } from "../vendors/service-schedule.js";
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
    subcategory: z.coerce.number().int().nonnegative().default(0),
    city: z.string().trim().max(100).default(""),
    min: z.coerce.number().min(0).max(1e8).default(0),
    max: z.coerce.number().min(0).max(1e8).default(1e8),
    rating: z.coerce.number().min(0).max(5).default(0),
    date: z.iso.date().optional(),
    guests: z.coerce.number().int().min(1).max(100000).optional(),
    serviceType: z
      .enum(["", "On site", "Rental", "Sale", "Digital", "Hybrid"])
      .default(""),
    sort: z
      .enum(["relevance", "priceAsc", "priceDesc", "rating", "newest"])
      .default("relevance"),
    type: z
      .enum(["services", "packages", "vendors", "offers"])
      .default("services"),
  })
  .refine((v) => v.max >= v.min, {
    message: "Maximum price must exceed minimum price.",
  });
const location =
  "OUTER APPLY(SELECT TOP(1) City,State FROM dbo.VendorLocations WHERE VendorId=v.VendorId AND IsActive=1 ORDER BY IsPrimary DESC,CreatedAt) l";
const serviceRatings =
  "OUTER APPLY(SELECT AVG(CAST(r.Rating AS decimal(6,2))) AS rating,COUNT_BIG(*) AS reviews FROM dbo.Reviews r WHERE r.IsPublished=1 AND EXISTS(SELECT 1 FROM dbo.BookingItems ri WHERE ri.BookingId=r.BookingId AND ri.ServiceId=s.ServiceId)) sr";
const source = `dbo.Services s JOIN dbo.Vendors v ON v.VendorId=s.VendorId JOIN dbo.Users u ON u.UserId=v.UserId JOIN dbo.Categories c ON c.CategoryId=s.CategoryId LEFT JOIN dbo.SubCategories sc ON sc.SubCategoryId=s.SubCategoryId ${location} ${serviceRatings}`;
const image = `OUTER APPLY(SELECT TOP(1) MediaUrl FROM dbo.Media WHERE EntityId=s.ServiceId AND LOWER(EntityType)='service' AND MediaType='Image' ORDER BY IsPrimary DESC,SortOrder,CreatedAt) m`;
const fields = `s.ServiceId AS serviceId,v.VendorId AS vendorId,v.BusinessName AS vendor,c.CategoryName AS category,c.CategoryId AS categoryId,sc.SubCategoryName AS subcategory,l.City AS city,COALESCE(sr.rating,0) AS rating,COALESCE(sr.reviews,0) AS reviews,m.MediaUrl AS image`;
const escapeLike = (value) =>
  `%${value.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`;
export async function catalog(ctx) {
  scope(ctx);
  return publicCatalog();
}
export async function publicCatalog() {
  const [categories, subcategories, cities] = await Promise.all([
    repo.select(
      "SELECT CategoryId AS id,CategoryName AS name FROM dbo.Categories WHERE IsActive=1 ORDER BY SortOrder,CategoryName",
    ),
    repo.select(
      "SELECT sc.SubCategoryId AS id,sc.CategoryId AS categoryId,sc.SubCategoryName AS name FROM dbo.SubCategories sc JOIN dbo.Categories c ON c.CategoryId=sc.CategoryId WHERE sc.IsActive=1 AND c.IsActive=1 ORDER BY sc.SubCategoryName",
    ),
    repo.select(
      `SELECT DISTINCT vl.City AS name FROM dbo.VendorLocations vl JOIN dbo.Vendors v ON v.VendorId=vl.VendorId JOIN dbo.Users u ON u.UserId=v.UserId WHERE vl.IsActive=1 AND ${eligibleVendor} ORDER BY name`,
    ),
  ]);
  return { categories, subcategories, cities };
}
export async function discover(input, ctx) {
  scope(ctx);
  return publicDiscover(input);
}
export async function publicDiscover(input) {
  const q = discoveryInput.parse(input),
    p = {
      ...q,
      q: escapeLike(q.q),
      city: escapeLike(q.city),
      date: q.date || null,
      guests: q.guests || null,
      offset: (q.page - 1) * q.pageSize,
      size: q.pageSize,
    };
  const city = `(:city ='%%' OR EXISTS(SELECT 1 FROM dbo.VendorLocations vl WHERE vl.VendorId=v.VendorId AND vl.IsActive=1 AND vl.City LIKE :city))`;
  if (q.type === "vendors") {
    const where = `${eligibleVendor} AND v.BusinessName LIKE :q AND (:category =0 OR EXISTS(SELECT 1 FROM dbo.VendorCategories vc JOIN dbo.Categories ac ON ac.CategoryId=vc.CategoryId WHERE vc.VendorId=v.VendorId AND vc.CategoryId=:category AND ac.IsActive=1)) AND ${city} AND v.AverageRating>=:rating`;
    const from = `dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId ${location}`;
    const [count] = await repo.select(
      `SELECT COUNT(*) AS total FROM ${from} WHERE ${where}`,
      p,
    );
    const order =
      q.sort === "newest"
        ? "v.CreatedAt DESC"
        : "v.AverageRating DESC,v.TotalReviews DESC";
    return {
      ...q,
      total: Number(count.total),
      rows: await repo.select(
        `SELECT v.VendorId AS id,v.VendorId AS vendorId,v.BusinessName AS name,v.BusinessName AS vendor,v.BusinessDescription AS description,l.City AS city,v.LogoUrl AS image,v.AverageRating AS rating,v.TotalReviews AS reviews,'Vendor' AS type,(SELECT COUNT(*) FROM dbo.Services vs JOIN dbo.Categories ac ON ac.CategoryId=vs.CategoryId WHERE vs.VendorId=v.VendorId AND vs.IsActive=1 AND vs.ApprovalStatus='Approved' AND ac.IsActive=1) AS serviceCount,(SELECT STRING_AGG(CONVERT(nvarchar(max),c.CategoryName),', ') FROM dbo.VendorCategories vc JOIN dbo.Categories c ON c.CategoryId=vc.CategoryId WHERE vc.VendorId=v.VendorId AND c.IsActive=1) AS category FROM ${from} WHERE ${where} ORDER BY ${order},v.VendorId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
        p,
      ),
    };
  }
  const packages = q.type === "packages",
    price = packages ? "p.FinalPrice" : "COALESCE(s.BasePrice,s.MinimumPrice)";
  const conditions = [
    eligibleVendor,
    "s.IsActive=1 AND s.ApprovalStatus='Approved' AND c.IsActive=1",
    packages ? "p.IsActive=1" : "1=1",
    "(:category =0 OR s.CategoryId=:category)",
    "(:subcategory =0 OR s.SubCategoryId=:subcategory)",
    `(s.ServiceName LIKE :q OR v.BusinessName LIKE :q ${packages ? "OR p.PackageName LIKE :q" : ""})`,
    city,
    `(${price} BETWEEN :min AND :max OR (${price} IS NULL AND :min =0))`,
    "COALESCE(sr.rating,0)>=:rating",
  ];
  if (q.serviceType)
    conditions.push("JSON_VALUE(s.DetailsJson,'$.serviceType')=:serviceType");
  if (q.guests)
    conditions.push(
      "(COALESCE(s.MinimumGuests,0)<=:guests AND (s.MaximumGuests IS NULL OR s.MaximumGuests=0 OR s.MaximumGuests>=:guests))",
      ...(packages
        ? [
            "(COALESCE(p.MinimumGuests,0)<=:guests AND (p.MaximumGuests IS NULL OR p.MaximumGuests=0 OR p.MaximumGuests>=:guests))",
          ]
        : []),
    );
  if (q.date)
    conditions.push(
      "CONVERT(date,:date)>=CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME()))",
      "NOT EXISTS(SELECT 1 FROM dbo.VendorAvailability va WHERE va.VendorId=v.VendorId AND va.AvailableDate=:date AND va.Status IN('Blocked','Booked') AND (va.ServiceId IS NULL OR va.ServiceId=s.ServiceId))",
      "NOT EXISTS(SELECT 1 FROM dbo.Booking b JOIN dbo.BookingItems bi ON bi.BookingId=b.BookingId WHERE b.VendorId=v.VendorId AND bi.ServiceId=s.ServiceId AND b.BookingDate=:date AND b.BookingStatus IN('Pending','Accepted','PaymentPending','Confirmed','InProgress','Disputed'))",
    );
  if (q.type === "offers")
    conditions.push(
      "EXISTS(SELECT 1 FROM dbo.Offers o WHERE o.VendorId=v.VendorId AND o.IsActive=1 AND o.StartDate<=SYSUTCDATETIME() AND o.EndDate>=SYSUTCDATETIME())",
    );
  const where = conditions.join(" AND "),
    from = `${source} ${packages ? "JOIN dbo.ServicePackages p ON p.ServiceId=s.ServiceId" : ""}`;
  const [count] = await repo.select(
    `SELECT COUNT(*) AS total FROM ${from} WHERE ${where}`,
    p,
  );
  const order = {
    relevance: "COALESCE(sr.rating,0) DESC,s.CreatedAt DESC",
    rating: "COALESCE(sr.rating,0) DESC,COALESCE(sr.reviews,0) DESC",
    priceAsc: `${price} ASC`,
    priceDesc: `${price} DESC`,
    newest: "s.CreatedAt DESC",
  }[q.sort];
  return {
    ...q,
    total: Number(count.total),
    rows: await repo.select(
      `SELECT ${packages ? "p.PackageId" : "s.ServiceId"} AS id,${packages ? "p.PackageName" : "s.ServiceName"} AS name,${price} AS price,s.PricingType AS pricingType,s.MinimumGuests AS minGuests,s.MaximumGuests AS maxGuests,'${packages ? "Package" : "Service"}' AS type,${fields} FROM ${from} ${image} WHERE ${where} ORDER BY ${order},s.ServiceId ${packages ? ",p.PackageId" : ""} OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
      p,
    ),
  };
}
export async function serviceDetails(id, ctx, track = true, query = {}) {
  scope(ctx);
  return publicServiceDetails(id, track, query);
}
export async function publicServiceDetails(id, track = true, query = {}) {
  z.guid().parse(id);
  const sort = z
    .enum(["newest", "highest", "lowest"])
    .parse(query.reviewSort || "newest");
  const [row] = await repo.select(
    `SELECT s.ServiceId AS id,s.ServiceName AS name,s.Description AS description,s.PricingType AS pricingType,s.IsCustomQuoteAvailable AS customQuote,s.BasePrice AS price,s.MinimumPrice AS minimumPrice,s.MaximumPrice AS maximumPrice,s.MinimumGuests AS minGuests,s.MaximumGuests AS maxGuests,s.AttributesJson AS attributes,s.DetailsJson,${fields} FROM ${source} ${image} WHERE s.ServiceId=:id AND c.IsActive=1 AND s.IsActive=1 AND s.ApprovalStatus='Approved' AND ${eligibleVendor}`,
    { id },
  );
  if (!row) fail("This service is no longer available.", 404);
  const { DetailsJson, ...service } = row,
    document = JSON.parse(DetailsJson || "{}");
  if (track) await recordServiceMetric(id, "Views");
  const [items, packages, gallery, reviews] = await Promise.all([
    repo.select(
      "SELECT ServiceItemId AS id,ItemName AS name,Description AS description,UnitPrice AS price,IsIncluded AS included FROM dbo.ServiceItems WHERE ServiceId=:id ORDER BY SortOrder,ServiceItemId",
      { id },
    ),
    repo.select(
      "SELECT PackageId AS id,PackageName AS name,Description AS description,Price AS originalPrice,DiscountPercentage AS discount,FinalPrice AS price,MinimumGuests AS minGuests,MaximumGuests AS maxGuests FROM dbo.ServicePackages WHERE ServiceId=:id AND IsActive=1 ORDER BY FinalPrice",
      { id },
    ),
    repo.select(
      "SELECT MediaId AS id,MediaUrl AS url FROM dbo.Media WHERE EntityId=:id AND LOWER(EntityType)='service' AND MediaType='Image' ORDER BY IsPrimary DESC,SortOrder,MediaId",
      { id },
    ),
    repo.select(
      `SELECT TOP(20) r.ReviewId AS id,CONCAT(u.FirstName,' ',LEFT(u.LastName,1)) AS customer,r.Rating AS rating,r.ReviewTitle AS title,r.ReviewText AS text,r.IsVerified AS verified,r.CreatedAt AS createdAt FROM dbo.Reviews r JOIN dbo.Users u ON u.UserId=r.CustomerId WHERE r.IsPublished=1 AND EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.BookingId=r.BookingId AND bi.ServiceId=:id) ORDER BY ${sort === "highest" ? "r.Rating DESC," : sort === "lowest" ? "r.Rating ASC," : ""}r.CreatedAt DESC,r.ReviewId`,
      { id },
    ),
  ]);
  return {
    service,
    items,
    packages,
    gallery,
    reviews,
    policies: document.policies || {},
    coverage: document.location || {},
    schedule: document.availability || null,
  };
}
export async function vendorDetails(id, ctx) {
  scope(ctx);
  return publicVendorDetails(id);
}
export async function publicVendorDetails(id) {
  z.guid().parse(id);
  const [vendor] = await repo.select(
    `SELECT v.VendorId AS id,v.BusinessName AS name,v.BusinessDescription AS description,l.City AS city,l.State AS state,v.LogoUrl AS image,v.CoverImageUrl AS cover,v.AverageRating AS rating,v.TotalReviews AS reviews FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId ${location} WHERE v.VendorId=:id AND ${eligibleVendor}`,
    { id },
  );
  if (!vendor) fail("Vendor unavailable.", 404);
  const [services, categories, locations, reviews] = await Promise.all([
    repo.select(
      `SELECT s.ServiceId AS id,s.ServiceId AS serviceId,s.ServiceName AS name,s.BasePrice AS price,s.PricingType AS pricingType,s.IsCustomQuoteAvailable AS customQuote,'Service' AS type,${fields} FROM ${source} ${image} WHERE v.VendorId=:id AND ${eligibleVendor} AND s.IsActive=1 AND s.ApprovalStatus='Approved' AND c.IsActive=1 ORDER BY s.CreatedAt DESC`,
      { id },
    ),
    repo.select(
      "SELECT c.CategoryName AS name FROM dbo.VendorCategories vc JOIN dbo.Categories c ON c.CategoryId=vc.CategoryId WHERE vc.VendorId=:id AND c.IsActive=1 ORDER BY c.CategoryName",
      { id },
    ),
    repo.select(
      "SELECT DISTINCT City AS city,State AS state FROM dbo.VendorLocations WHERE VendorId=:id AND IsActive=1",
      { id },
    ),
    repo.select(
      "SELECT TOP(20) r.ReviewId AS id,CONCAT(u.FirstName,' ',LEFT(u.LastName,1)) AS customer,r.Rating AS rating,r.ReviewText AS text,r.IsVerified AS verified FROM dbo.Reviews r JOIN dbo.Users u ON u.UserId=r.CustomerId WHERE r.VendorId=:id AND r.IsPublished=1 ORDER BY r.CreatedAt DESC,r.ReviewId",
      { id },
    ),
  ]);
  return { vendor, services, categories, locations, reviews };
}
export async function publicAvailability(id, input) {
  const { from } = z.object({ from: z.iso.date() }).parse(input),
    { service, schedule } = await publicServiceDetails(id, false);
  const end = new Date(`${from}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 30);
  const to = end.toISOString().slice(0, 10);
  const [blocks, bookings] = await Promise.all([
    repo.select(
      "SELECT CONVERT(char(10),AvailableDate,120) AS date,Status AS status,StartTime,EndTime FROM dbo.VendorAvailability WHERE VendorId=:vendor AND AvailableDate BETWEEN :from AND :to AND (ServiceId IS NULL OR ServiceId=:id) ORDER BY CASE WHEN ServiceId IS NULL THEN 1 ELSE 0 END,AvailabilityId DESC",
      { vendor: service.vendorId, id, from, to },
    ),
    repo.select(
      "SELECT DISTINCT CONVERT(char(10),b.BookingDate,120) AS date FROM dbo.Booking b JOIN dbo.BookingItems bi ON bi.BookingId=b.BookingId WHERE bi.ServiceId=:id AND b.BookingDate BETWEEN :from AND :to AND b.BookingStatus IN('Pending','Accepted','PaymentPending','Confirmed','InProgress','Disputed')",
      { id, from, to },
    ),
  ]);
  const days = Array.from({ length: 31 }, (_, i) => {
    const d = new Date(`${from}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    let reason = null;
    try {
      assertServiceSchedule(
        schedule ? { availability: schedule } : null,
        date,
        null,
        blocks.find((b) => b.date === date && b.status === "Available"),
      );
      if (
        date <
        new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
      )
        reason = "Past date";
    } catch (e) {
      reason = e.message;
    }
    if (
      blocks.some(
        (b) => b.date === date && ["Blocked", "Booked"].includes(b.status),
      ) ||
      bookings.some((b) => b.date === date)
    )
      reason = "Unavailable";
    return { date, available: !reason, reason };
  });
  return { days };
}
export async function publicPackage(id) {
  z.guid().parse(id);
  const [p] = await repo.select(
    "SELECT ServiceId AS serviceId FROM dbo.ServicePackages WHERE PackageId=:id AND IsActive=1",
    { id },
  );
  if (!p) fail("Package unavailable.", 404);
  await publicServiceDetails(p.serviceId, false);
  return p;
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
