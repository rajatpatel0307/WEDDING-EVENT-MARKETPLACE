import { QueryTypes } from "sequelize";
import { GraphQLError } from "graphql";
import { sequelize } from "../../config/database.js";
import { limit } from "../auth/security.service.js";
import { ContactMessage } from "./contact.model.js";
import { contactInput, listingInput } from "./public.validation.js";

export const eligibleVendor = `v.IsActive = 1 AND v.VerificationStatus = 'Approved'
  AND u.IsActive = 1 AND u.IsBlocked = 0 AND u.IsEmailVerified = 1`;
const locationSql = `OUTER APPLY (SELECT TOP (1) l.City, l.State FROM dbo.VendorLocations l
  WHERE l.VendorId = v.VendorId AND l.IsActive = 1 ORDER BY l.IsPrimary DESC, l.CreatedAt, l.VendorLocationId) loc`;
const imageSql = (
  entity,
) => `OUTER APPLY (SELECT TOP (1) MediaUrl FROM dbo.Media m
  WHERE m.EntityId = ${entity} AND m.MediaType = 'Image' AND LOWER(m.EntityType) = 'service'
  ORDER BY m.IsPrimary DESC, m.SortOrder, m.MediaId) img`;
const select = (sql, replacements = {}) =>
  sequelize.query(sql, { type: QueryTypes.SELECT, replacements });
function filters(args) {
  const parsed = listingInput.parse(args);
  // Escape LIKE wildcards as literal user text, in addition to binding parameters.
  const normalizedQuery = parsed.q
    ?.replace(/^wedding\s+/i, "")
    .replace(/photographers?/gi, "photography")
    .replace(/makeup artist/gi, "makeup");
  const literal = (value) =>
    value?.replace(/[\[\]%_]/g, (character) => `[${character}]`);
  return {
    ...parsed,
    limit: parsed.limit ?? 6,
    category: parsed.category || null,
    city: parsed.city || null,
    id: parsed.id || null,
    q: normalizedQuery ? `%${literal(normalizedQuery)}%` : null,
  };
}
export async function popularServices() {
  return select(`SELECT c.CategoryId AS id, c.CategoryName AS name, c.Description AS description, c.IconName AS icon,
    CAST(NULL AS nvarchar(1000)) AS image
    FROM dbo.Categories c WHERE c.IsActive = 1 ORDER BY c.SortOrder, c.CategoryId`);
}
export async function featuredVenues(args = {}) {
  return select(
    `SELECT TOP (:limit) s.ServiceId AS id, s.ServiceName AS name, s.Description AS description,
    c.CategoryName AS category, CONCAT(loc.City, CASE WHEN loc.State IS NOT NULL THEN ', ' + loc.State ELSE '' END) AS location,
    COALESCE(img.MediaUrl, v.CoverImageUrl) AS image, v.AverageRating AS rating, v.TotalReviews AS reviewCount,
    COALESCE(s.MinimumPrice, s.BasePrice) AS startingPrice, s.PricingType AS pricingType, s.MaximumGuests AS capacity,
    CAST(1 AS bit) AS verified, CAST(0 AS bit) AS featured, v.VendorId AS vendorId, v.BusinessName AS vendorName
    FROM dbo.Services s JOIN dbo.Categories c ON c.CategoryId = s.CategoryId
    JOIN dbo.Vendors v ON v.VendorId = s.VendorId JOIN dbo.Users u ON u.UserId = v.UserId
    ${locationSql} ${imageSql("s.ServiceId")}
    WHERE ${eligibleVendor} AND s.IsActive = 1 AND s.ApprovalStatus = 'Approved' AND c.IsActive = 1 AND c.CategoryName = 'Venue & Location'
    AND (:city IS NULL OR loc.City = :city) AND (:id IS NULL OR s.ServiceId = :id)
    AND (:q IS NULL OR s.ServiceName LIKE :q OR v.BusinessName LIKE :q OR c.CategoryName LIKE :q OR loc.City LIKE :q)
    ORDER BY v.AverageRating DESC, v.TotalReviews DESC, s.ServiceId`,
    filters(args),
  );
}
export async function featuredVendors(args = {}) {
  return select(
    `SELECT TOP (:limit) v.VendorId AS id, v.BusinessName AS name, v.BusinessDescription AS description,
    cat.CategoryName AS category, CONCAT(loc.City, CASE WHEN loc.State IS NOT NULL THEN ', ' + loc.State ELSE '' END) AS location,
    v.CoverImageUrl AS image, v.AverageRating AS rating, v.TotalReviews AS reviewCount,
    CAST(1 AS bit) AS verified, CAST(0 AS bit) AS featured,
    price.StartingPrice AS startingPrice, price.PricingType AS pricingType
    FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId = v.UserId ${locationSql}
    OUTER APPLY (SELECT TOP (1) c.CategoryName FROM dbo.VendorCategories vc JOIN dbo.Categories c ON c.CategoryId = vc.CategoryId
      WHERE vc.VendorId = v.VendorId AND c.IsActive = 1 ORDER BY vc.IsPrimary DESC, c.SortOrder, c.CategoryId) cat
    OUTER APPLY (SELECT TOP (1) COALESCE(s.MinimumPrice, s.BasePrice) AS StartingPrice, s.PricingType
      FROM dbo.Services s JOIN dbo.Categories sc ON sc.CategoryId = s.CategoryId
      WHERE s.VendorId = v.VendorId AND s.IsActive = 1 AND s.ApprovalStatus = 'Approved' AND sc.IsActive = 1
      AND COALESCE(s.MinimumPrice, s.BasePrice) IS NOT NULL ORDER BY COALESCE(s.MinimumPrice, s.BasePrice), s.ServiceId) price
    WHERE ${eligibleVendor} AND (:city IS NULL OR loc.City = :city) AND (:id IS NULL OR v.VendorId = :id)
    AND (:category IS NULL OR EXISTS (SELECT 1 FROM dbo.VendorCategories vc JOIN dbo.Categories c ON c.CategoryId = vc.CategoryId
      WHERE vc.VendorId = v.VendorId AND c.IsActive = 1 AND c.CategoryName = :category))
    AND (:q IS NULL OR v.BusinessName LIKE :q OR cat.CategoryName LIKE :q OR loc.City LIKE :q)
    ORDER BY v.AverageRating DESC, v.TotalReviews DESC, v.VendorId`,
    filters(args),
  );
}
export async function featuredPackages(args = {}) {
  const rows = await select(
    `SELECT TOP (:limit) p.PackageId AS id, p.PackageName AS name, p.Description AS description,
    p.FinalPrice AS price, COALESCE(img.MediaUrl, v.CoverImageUrl) AS image, loc.City AS location, v.BusinessName AS vendorName
    FROM dbo.ServicePackages p JOIN dbo.Services s ON s.ServiceId = p.ServiceId JOIN dbo.Categories c ON c.CategoryId = s.CategoryId
    JOIN dbo.Vendors v ON v.VendorId = s.VendorId JOIN dbo.Users u ON u.UserId = v.UserId ${locationSql} ${imageSql("s.ServiceId")}
    WHERE ${eligibleVendor} AND s.IsActive = 1 AND s.ApprovalStatus = 'Approved' AND c.IsActive = 1 AND p.IsActive = 1
    AND (:id IS NOT NULL OR p.IsFeatured = 1) AND (:id IS NULL OR p.PackageId = :id)
    AND (:city IS NULL OR loc.City = :city) AND (:q IS NULL OR p.PackageName LIKE :q OR v.BusinessName LIKE :q OR loc.City LIKE :q)
    ORDER BY p.CreatedAt DESC, p.PackageId`,
    filters(args),
  );
  if (!rows.length) return [];
  const items = await select(
    "SELECT PackageId AS packageId, ItemName AS name FROM dbo.PackageItems WHERE PackageId IN (:ids) ORDER BY SortOrder, PackageItemId",
    { ids: rows.map((p) => p.id) },
  );
  return rows.map((row) => ({
    ...row,
    items: items.filter((i) => i.packageId === row.id).map((i) => i.name),
  }));
}
export async function testimonials() {
  return select(`SELECT TOP (8) r.ReviewId AS id, customer.FirstName AS customerName, loc.City AS location,
    r.Rating AS rating, r.ReviewText AS review, CONVERT(varchar(10), b.BookingDate, 23) AS weddingDate
    FROM dbo.Reviews r JOIN dbo.Booking b ON b.BookingId = r.BookingId AND b.CustomerId = r.CustomerId AND b.VendorId = r.VendorId
    JOIN dbo.Users customer ON customer.UserId = r.CustomerId
    JOIN dbo.Vendors v ON v.VendorId = r.VendorId JOIN dbo.Users u ON u.UserId = v.UserId ${locationSql}
    WHERE ${eligibleVendor} AND r.IsPublished = 1 AND r.IsVerified = 1 AND b.BookingStatus = 'Completed'
    AND LEN(r.ReviewText) > 0 AND customer.IsActive = 1 AND customer.IsBlocked = 0
    ORDER BY r.CreatedAt DESC, r.ReviewId`);
}
export async function activeOffers() {
  return select(`SELECT TOP (6) o.OfferId AS id, o.OfferName AS name, o.Description AS description,
    o.DiscountType AS discountType, o.DiscountValue AS discountValue, CONVERT(varchar(10), o.EndDate, 23) AS endDate
    FROM dbo.Offers o LEFT JOIN dbo.Services s ON s.ServiceId = o.ServiceId
    LEFT JOIN dbo.Vendors v ON v.VendorId = COALESCE(s.VendorId, o.VendorId)
    LEFT JOIN dbo.Users u ON u.UserId = v.UserId
    WHERE o.IsActive = 1 AND o.StartDate <= SYSUTCDATETIME() AND o.EndDate > SYSUTCDATETIME()
    AND (o.ServiceId IS NULL OR (s.IsActive = 1 AND s.ApprovalStatus = 'Approved'))
    AND (o.VendorId IS NULL OR o.ServiceId IS NULL OR o.VendorId = s.VendorId)
    AND ((o.VendorId IS NULL AND o.ServiceId IS NULL) OR (${eligibleVendor})) ORDER BY o.EndDate, o.OfferId`);
}
export async function marketplaceStatistics() {
  const [row] = await select(`SELECT
    (SELECT COUNT(*) FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId = v.UserId WHERE ${eligibleVendor}) AS verifiedVendors,
    (SELECT COUNT(*) FROM dbo.Categories WHERE IsActive = 1) AS services,
    (SELECT COUNT(*) FROM dbo.Booking WHERE BookingStatus = 'Completed') AS successfulBookings,
    (SELECT COUNT(DISTINCT l.City) FROM dbo.VendorLocations l JOIN dbo.Vendors v ON v.VendorId = l.VendorId
      JOIN dbo.Users u ON u.UserId = v.UserId WHERE l.IsActive = 1 AND ${eligibleVendor}) AS cities`);
  return row;
}
export async function submitContactMessage(_, { input }, ctx) {
  const parsed = contactInput.safeParse(input);
  if (!parsed.success)
    throw new GraphQLError("Please check the highlighted fields.", {
      extensions: {
        code: "BAD_USER_INPUT",
        fields: Object.fromEntries(
          parsed.error.issues.map((i) => [i.path[0], i.message]),
        ),
      },
    });
  await limit(`contact:${ctx.req.ip}`, 5, 3600);
  const { consent, ...fields } = parsed.data;
  const result = await ContactMessage.create({
    ...fields,
    phone: fields.phone || null,
    consentedAt: new Date(),
  });
  return {
    success: true,
    reference: result.id,
    message:
      "Your message has been received. Keep your reference number for follow-up.",
  };
}
