import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import * as repo from "./admin.repository.js";
import { review } from "./service-approval.service.js";
import {
  serviceSchema,
  itemSchema,
  calculatePrice,
  pricingTypeFor,
  pricingSchema,
} from "../vendors/service-management.validation.js";
import { amount, validateAttributes } from "../vendors/workspace.validation.js";
import { templateFor, templatesFor } from "../vendors/service-templates.js";
import { uploadAsset } from "../media/cloudinary.service.js";
import { assertVersion } from "../vendors/workspace.common.js";
import { dateBounds } from "./admin.validation.js";

const resource = { table: "Services", id: "ServiceId" };
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const text = z.string().trim().max(200).default("");
const number = z.coerce.number().finite().nonnegative();
export const querySchema = z
  .object({
    q: text,
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    category: number.int().default(0),
    subcategory: number.int().default(0),
    vendor: z.union([z.guid(), z.literal("")]).default(""),
    status: z
      .enum([
        "",
        "Draft",
        "Pending",
        "UnderReview",
        "Approved",
        "Rejected",
        "Suspended",
        "Inactive",
        "Active",
      ])
      .default(""),
    active: z.enum(["", "true", "false"]).default(""),
    minPrice: number.max(100000000).default(0),
    maxPrice: number.max(100000000).default(100000000),
    rating: number.max(5).default(0),
    location: text,
    createdFrom: z.iso.date().optional(),
    createdTo: z.iso.date().optional(),
    updatedFrom: z.iso.date().optional(),
    updatedTo: z.iso.date().optional(),
    sort: z
      .enum([
        "name",
        "vendor",
        "category",
        "price",
        "bookings",
        "rating",
        "createdAt",
        "updatedAt",
      ])
      .default("createdAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
  .refine(
    (q) =>
      q.maxPrice >= q.minPrice &&
      (!q.createdFrom || !q.createdTo || q.createdFrom <= q.createdTo) &&
      (!q.updatedFrom || !q.updatedTo || q.updatedFrom <= q.updatedTo),
    { message: "Choose a valid price and date range." },
  );
const joins = `FROM dbo.Services s JOIN dbo.Vendors v ON v.VendorId=s.VendorId JOIN dbo.Categories c ON c.CategoryId=s.CategoryId LEFT JOIN dbo.SubCategories sc ON sc.SubCategoryId=s.SubCategoryId
 OUTER APPLY(SELECT COUNT(DISTINCT bi.BookingId) AS bookings,COALESCE(SUM(CASE WHEN bk.BookingStatus='Completed' THEN bi.LineTotal ELSE 0 END),0) AS revenue FROM dbo.BookingItems bi JOIN dbo.Booking bk ON bk.BookingId=bi.BookingId WHERE bi.ServiceId=s.ServiceId) b
 OUTER APPLY(SELECT AVG(CAST(r.Rating AS decimal(6,2))) AS rating,COUNT_BIG(*) AS reviews FROM dbo.Reviews r WHERE r.IsPublished=1 AND EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.BookingId=r.BookingId AND bi.ServiceId=s.ServiceId)) r`;
const like = (s) => `%${s.replace(/[\[\]%_]/g, (x) => `[${x}]`)}%`;
export function listFilter(q) {
  const p = {
    ...q,
    search: like(q.q),
    city: like(q.location),
    offset: (q.page - 1) * q.pageSize,
    size: q.pageSize,
  };
  const where = [
    "COALESCE(s.BasePrice,0) BETWEEN :minPrice AND :maxPrice",
    "COALESCE(r.rating,0)>=:rating",
  ];
  if (q.q)
    where.push(
      "(s.ServiceName LIKE :search OR CONVERT(varchar(36),s.ServiceId) LIKE :search OR v.BusinessName LIKE :search OR CONVERT(varchar(36),v.VendorId) LIKE :search OR c.CategoryName LIKE :search OR JSON_VALUE(s.DetailsJson,'$.location.city') LIKE :search)",
    );
  if (q.category) where.push("s.CategoryId=:category");
  if (q.subcategory) where.push("s.SubCategoryId=:subcategory");
  if (q.vendor) where.push("s.VendorId=:vendor");
  if (q.location)
    where.push("JSON_VALUE(s.DetailsJson,'$.location.city') LIKE :city");
  if (q.status === "Pending")
    where.push("s.ApprovalStatus IN ('Pending','UnderReview')");
  else if (["Active", "Inactive"].includes(q.status))
    where.push(
      q.status === "Active"
        ? "s.ApprovalStatus='Approved' AND s.IsActive=1"
        : "s.IsActive=0",
    );
  else if (q.status) where.push("s.ApprovalStatus=:status");
  if (q.active) {
    p.isActive = q.active === "true" ? 1 : 0;
    where.push("s.IsActive=:isActive");
  }
  for (const [prefix, column] of [
    ["created", "s.CreatedAt"],
    ["updated", "s.UpdatedAt"],
  ]) {
    const bounds = dateBounds(q[`${prefix}From`], q[`${prefix}To`]);
    if (bounds.from) {
      p[`${prefix}Start`] = bounds.from;
      where.push(`${column}>=:${prefix}Start`);
    }
    if (bounds.to) {
      p[`${prefix}End`] = bounds.to;
      where.push(`${column}<:${prefix}End`);
    }
  }
  return { p, where: where.join(" AND ") };
}
export function actionsFor(row) {
  const status = row.status ?? row.ApprovalStatus,
    active = row.active ?? row.IsActive;
  return [
    "view",
    ...(["Draft", "Rejected", "Approved"].includes(status) ? ["edit"] : []),
    ...(["Pending", "UnderReview"].includes(status)
      ? ["approve", "reject"]
      : []),
    ...(status === "Approved"
      ? ["suspend", active ? "deactivate" : "activate"]
      : []),
    "duplicate",
    ...(["Draft", "Rejected"].includes(status) && !row.hasHistory
      ? ["delete"]
      : []),
  ];
}
export async function list(input, ctx) {
  requireRole(ctx, "ADMIN");
  const q = querySchema.parse(input),
    { p, where } = listFilter(q);
  const source = `${joins} WHERE ${where}`;
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total ${source}`,
    p,
  );
  const sort = {
    name: "s.ServiceName",
    vendor: "v.BusinessName",
    category: "c.CategoryName",
    price: "s.BasePrice",
    bookings: "b.bookings",
    rating: "r.rating",
    createdAt: "s.CreatedAt",
    updatedAt: "s.UpdatedAt",
  }[q.sort];
  const rows = await repo.select(
    `SELECT s.ServiceId AS id,s.ServiceName AS name,JSON_VALUE(s.DetailsJson,'$.shortDescription') AS shortDescription,s.VendorId AS vendorId,v.BusinessName AS vendor,v.LogoUrl AS vendorLogo,c.CategoryName AS category,sc.SubCategoryName AS subcategory,s.BasePrice AS price,JSON_VALUE(s.DetailsJson,'$.location.city') AS location,s.ApprovalStatus AS status,s.IsActive AS active,b.bookings,r.rating,s.CreatedAt AS createdAt,s.UpdatedAt AS updatedAt,
   CASE WHEN EXISTS(SELECT 1 FROM dbo.BookingItems WHERE ServiceId=s.ServiceId) OR EXISTS(SELECT 1 FROM dbo.QuotationItems WHERE ServiceId=s.ServiceId OR PackageId IN(SELECT PackageId FROM dbo.ServicePackages WHERE ServiceId=s.ServiceId)) OR EXISTS(SELECT 1 FROM dbo.QuotationRequests WHERE ServiceId=s.ServiceId) OR EXISTS(SELECT 1 FROM dbo.Offers WHERE ServiceId=s.ServiceId) THEN 1 ELSE 0 END AS hasHistory,
   (SELECT TOP(1) MediaUrl FROM dbo.Media WHERE EntityType='Service' AND EntityId=s.ServiceId AND MediaType='Image' ORDER BY IsPrimary DESC,SortOrder,MediaId) AS image ${source} ORDER BY ${sort} ${q.direction === "asc" ? "ASC" : "DESC"},s.ServiceId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    p,
  );
  return {
    rows: rows.map((r) => ({ ...r, actions: actionsFor(r) })),
    total: Number(count.total),
    page: q.page,
    pageSize: q.pageSize,
  };
}
export async function statistics(ctx) {
  requireRole(ctx, "ADMIN");
  const [stats] = await repo.select(
    `SELECT COUNT_BIG(*) AS total,SUM(CASE WHEN s.ApprovalStatus='Approved' AND s.IsActive=1 THEN 1 ELSE 0 END) AS active,SUM(CASE WHEN s.ApprovalStatus IN ('Pending','UnderReview') THEN 1 ELSE 0 END) AS pending,SUM(CASE WHEN s.ApprovalStatus='Approved' THEN 1 ELSE 0 END) AS approved,SUM(CASE WHEN s.ApprovalStatus='Rejected' THEN 1 ELSE 0 END) AS rejected,SUM(CASE WHEN s.ApprovalStatus='Suspended' THEN 1 ELSE 0 END) AS suspended,SUM(CASE WHEN s.ApprovalStatus='Draft' THEN 1 ELSE 0 END) AS draft,(SELECT COUNT(DISTINCT BookingId) FROM dbo.BookingItems) AS bookings,(SELECT COALESCE(SUM(bi.LineTotal),0) FROM dbo.BookingItems bi JOIN dbo.Booking b ON b.BookingId=bi.BookingId WHERE b.BookingStatus='Completed') AS revenue FROM dbo.Services s`,
  );
  return stats;
}
export async function metadata(ctx, input = {}) {
  requireRole(ctx, "ADMIN");
  const q = z
    .object({ q: text, vendorId: z.guid().optional() })
    .strict()
    .parse(input);
  const [categories, subcategories, vendors] = await Promise.all([
    repo.select(
      "SELECT CategoryId AS id,CategoryName AS name,CategoryCode AS code FROM dbo.Categories WHERE IsActive=1 ORDER BY SortOrder,CategoryId",
    ),
    repo.select(
      "SELECT SubCategoryId AS id,CategoryId AS categoryId,SubCategoryName AS name FROM dbo.SubCategories WHERE IsActive=1 ORDER BY SortOrder,SubCategoryId",
    ),
    repo.select(
      `SELECT VendorId AS id,BusinessName AS name,VerificationStatus AS status FROM dbo.Vendors WHERE VendorId IN(SELECT TOP(30) VendorId FROM dbo.Vendors WHERE BusinessName LIKE :q ORDER BY BusinessName,VendorId) ${q.vendorId ? "OR VendorId=:vendorId" : ""} ORDER BY BusinessName,VendorId`,
      { q: like(q.q), ...(q.vendorId ? { vendorId: q.vendorId } : {}) },
    ),
  ]);
  return {
    categories,
    subcategories,
    vendors,
    templates: templatesFor(categories),
  };
}
export function priceCalculation(input) {
  const p = pricingSchema.parse(input),
    base = Math.round((p.specialPrice ?? p.basePrice) * 100),
    units = Math.round(Math.round(p.unitPrice * 100) * p.minimumQuantity),
    discount = Math.round(
      ((base + units) * Math.round(p.discount * 100)) / 10000,
    ),
    charges = Math.round(p.additionalCharges * 100),
    net = base + units - discount + charges;
  const finalPrice = calculatePrice(p);
  return {
    basePrice: base / 100,
    unitPrice: p.unitPrice,
    quantity: p.minimumQuantity,
    unitSubtotal: units / 100,
    discountPercent: p.discount,
    discountAmount: discount / 100,
    additionalCharges: charges / 100,
    subtotal: net / 100,
    taxRate: p.taxRate,
    tax: Math.round((net * Math.round(p.taxRate * 100)) / 10000) / 100,
    finalPrice,
    unit: p.unit,
  };
}
export async function details(id, ctx) {
  const data = await review(id, ctx);
  const [used] = await repo.select(
    "SELECT CASE WHEN EXISTS(SELECT 1 FROM dbo.BookingItems WHERE ServiceId=:id) OR EXISTS(SELECT 1 FROM dbo.QuotationItems WHERE ServiceId=:id OR PackageId IN(SELECT PackageId FROM dbo.ServicePackages WHERE ServiceId=:id)) OR EXISTS(SELECT 1 FROM dbo.QuotationRequests WHERE ServiceId=:id) OR EXISTS(SELECT 1 FROM dbo.Offers WHERE ServiceId=:id) THEN 1 ELSE 0 END AS hasHistory",
    { id },
  );
  const [sub] = data.SubCategoryId
    ? await repo.select(
        "SELECT SubCategoryName AS name FROM dbo.SubCategories WHERE SubCategoryId=:id",
        { id: data.SubCategoryId },
      )
    : [];
  return {
    ...data,
    SubCategoryName: sub?.name,
    actions: actionsFor({ ...data, hasHistory: used?.hasHistory }),
    calculation: priceCalculation(
      data.document.pricing || { basePrice: Number(data.BasePrice || 0) },
    ),
  };
}
const versionInput = z.object({ expectedUpdatedAt: z.iso.datetime() }).strict();
async function lock(id, input, ctx, tx) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const row = await repo.lockRecord(resource, id, tx);
  const expected = versionInput.parse(input);
  assertVersion(row, expected.expectedUpdatedAt);
  return row;
}
function editable(row) {
  if (!["Draft", "Rejected", "Approved"].includes(row.ApprovalStatus))
    fail("Finish or resolve the review before editing this service.", 409);
}
export async function touch(row, ctx, action, changes, tx, withdraw = true) {
  await repo.update(
    resource,
    row.ServiceId,
    {
      UpdatedAt: new Date(),
      ...(withdraw && row.ApprovalStatus === "Approved"
        ? {
            ApprovalStatus: "Draft",
            IsActive: 0,
            ApprovedAt: null,
            ApprovedBy: null,
          }
        : {}),
    },
    tx,
  );
  await repo.auditAdmin(
    ctx,
    action,
    "Services",
    row.ServiceId,
    { status: row.ApprovalStatus },
    changes,
    tx,
  );
}
const saveSchema = serviceSchema.extend({ vendorId: z.guid() });
export async function save(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  if (id) z.guid().parse(id);
  const { vendorId, ...body } = saveSchema.parse(input);
  return repo.transaction(async (tx) => {
    const old = id
      ? await lock(id, { expectedUpdatedAt: body.expectedUpdatedAt }, ctx, tx)
      : null;
    if (old) {
      editable(old);
      if (old.VendorId.toLowerCase() !== vendorId.toLowerCase())
        fail("Service ownership cannot be transferred.", 409);
    }
    const [vendor] = await repo.select(
      "SELECT VendorId FROM dbo.Vendors WHERE VendorId=:vendorId",
      { vendorId },
      tx,
    );
    if (!vendor) fail("Vendor not found.", 404);
    const [category] = await repo.select(
      "SELECT CategoryName AS name,CategoryCode AS code FROM dbo.Categories WHERE CategoryId=:id AND IsActive=1",
      { id: body.categoryId },
      tx,
    );
    if (!category) fail("Choose an active category.");
    if (body.subcategoryId) {
      const [sub] = await repo.select(
        "SELECT SubCategoryId FROM dbo.SubCategories WHERE SubCategoryId=:id AND CategoryId=:category AND IsActive=1",
        { id: body.subcategoryId, category: body.categoryId },
        tx,
      );
      if (!sub) fail("Subcategory does not belong to the category.");
    }
    const attributes = validateAttributes(
        category.name,
        body.attributes,
        templateFor(category),
      ),
      next = id || randomUUID();
    const [duplicate] = await repo.select(
      "SELECT ServiceId FROM dbo.Services WITH(UPDLOCK,HOLDLOCK) WHERE ServiceSlug=:slug AND ServiceId<>:id",
      { slug: body.seo.slug, id: next },
      tx,
    );
    if (duplicate) fail("This service URL slug is already used.", 409);
    const { expectedUpdatedAt, items, ...document } = body;
    const values = {
      VendorId: vendorId,
      CategoryId: body.categoryId,
      SubCategoryId: body.subcategoryId,
      ServiceName: body.name,
      ServiceSlug: body.seo.slug,
      Description: body.description,
      AttributesJson: JSON.stringify(attributes),
      DetailsJson: JSON.stringify(document),
      BasePrice: calculatePrice(body.pricing),
      PricingType: pricingTypeFor(body.pricing),
      MinimumPrice: body.pricing.minimumPrice,
      MaximumPrice: body.pricing.maximumPrice,
      IsCustomQuoteAvailable:
        body.pricing.customQuote ||
        pricingTypeFor(body.pricing) === "CustomQuote"
          ? 1
          : 0,
      MinimumGuests:
        attributes.minimumGuests ?? attributes.minimumCapacity ?? null,
      MaximumGuests:
        attributes.maximumGuests ??
        attributes.maximumCapacity ??
        attributes.capacity ??
        null,
      DurationMinutes: body.policies.duration || null,
      ApprovalStatus: old?.ApprovalStatus === "Rejected" ? "Rejected" : "Draft",
      IsActive: 0,
      ApprovedAt: null,
      ApprovedBy: null,
      UpdatedAt: new Date(),
    };
    if (old) await repo.update(resource, next, values, tx);
    else await repo.insert(resource, { ServiceId: next, ...values }, tx);
    // Items have dedicated endpoints so editing information cannot replace their identities.
    if (!old)
      for (const [sort, i] of items.entries())
        await repo.insert(
          { table: "ServiceItems", id: "ServiceItemId" },
          {
            ServiceId: next,
            ItemName: i.name,
            Description: i.description,
            Quantity: i.quantity,
            Unit: i.unit,
            UnitPrice: i.price,
            IsIncluded: i.included ? 1 : 0,
            SortOrder: sort,
          },
          tx,
        );
    await repo.auditAdmin(
      ctx,
      old ? "ADMIN_SERVICE_EDITED" : "ADMIN_SERVICE_CREATED",
      "Services",
      next,
      old
        ? {
            name: old.ServiceName,
            details: old.DetailsJson,
            attributes: old.AttributesJson,
          }
        : null,
      { ...document, vendorId, status: values.ApprovalStatus },
      tx,
    );
    return {
      id: next,
      message:
        "Service saved. Submit the completed draft for review before publishing.",
    };
  });
}
export async function submit(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  return repo.transaction(async (tx) => {
    const row = await lock(id, input, ctx, tx);
    if (!["Draft", "Rejected"].includes(row.ApprovalStatus))
      fail("Only drafts and rejected services can be submitted.", 409);
    const [vendor] = await repo.select(
      "SELECT VerificationStatus,IsActive FROM dbo.Vendors WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:id",
      { id: row.VendorId },
      tx,
    );
    if (vendor.VerificationStatus !== "Approved" || !vendor.IsActive)
      fail("Vendor approval is required before submission.", 409);
    const { validateServiceSubmission } =
      await import("../vendors/service-management.validation.js");
    const doc = serviceSchema.parse({
      ...JSON.parse(row.DetailsJson || "{}"),
      name: row.ServiceName,
      categoryId: row.CategoryId,
      subcategoryId: row.SubCategoryId,
      description: row.Description || "",
      attributes: JSON.parse(row.AttributesJson || "{}"),
      items: [],
    });
    const [media] = await repo.select(
      "SELECT COUNT(*) AS total FROM dbo.Media WHERE EntityType='Service' AND EntityId=:id AND MediaType='Image'",
      { id },
      tx,
    );
    validateServiceSubmission(doc, Number(media.total));
    await repo.update(
      resource,
      id,
      {
        ApprovalStatus: "Pending",
        IsActive: 0,
        SubmittedAt: new Date(),
        UpdatedAt: new Date(),
        ApprovalCycle: (row.ApprovalCycle || 0) + 1,
        RejectionReason: null,
        AdminNote: null,
        RejectedAt: null,
        RejectedBy: null,
      },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "ADMIN_SERVICE_SUBMITTED",
      "Services",
      id,
      { status: row.ApprovalStatus },
      { status: "Pending", cycle: (row.ApprovalCycle || 0) + 1 },
      tx,
    );
    return { message: "Service submitted for approval." };
  });
}
export async function duplicate(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  return repo.transaction(async (tx) => {
    const row = await lock(id, input, ctx, tx),
      next = randomUUID(),
      doc = JSON.parse(row.DetailsJson || "{}");
    const slug = `${row.ServiceSlug.slice(0, 150)}-copy-${next}`;
    if (doc.seo) doc.seo.slug = slug;
    await repo.insert(
      resource,
      {
        ServiceId: next,
        VendorId: row.VendorId,
        CategoryId: row.CategoryId,
        SubCategoryId: row.SubCategoryId,
        ServiceName: `${row.ServiceName.slice(0, 190)} (copy)`,
        ServiceSlug: slug,
        Description: row.Description,
        BasePrice: row.BasePrice,
        MinimumPrice: row.MinimumPrice,
        MaximumPrice: row.MaximumPrice,
        MinimumGuests: row.MinimumGuests,
        MaximumGuests: row.MaximumGuests,
        DurationMinutes: row.DurationMinutes,
        IsCustomQuoteAvailable: row.IsCustomQuoteAvailable,
        PricingType: row.PricingType,
        AttributesJson: row.AttributesJson,
        DetailsJson: JSON.stringify(doc),
        ApprovalStatus: "Draft",
        IsActive: 0,
      },
      tx,
    );
    await repo.select(
      "INSERT INTO dbo.ServiceItems(ServiceId,ItemName,Description,Quantity,Unit,UnitPrice,IsIncluded,SortOrder,IsActive) SELECT :next,ItemName,Description,Quantity,Unit,UnitPrice,IsIncluded,SortOrder,IsActive FROM dbo.ServiceItems WHERE ServiceId=:id",
      { next, id },
      tx,
    );
    const sourceImages = await repo.select(
        "SELECT * FROM dbo.Media WHERE EntityType='Service' AND EntityId=:id AND MediaType='Image'",
        { id },
        tx,
      ),
      imageMap = new Map();
    for (const image of sourceImages) {
      const nextImage = randomUUID();
      imageMap.set(image.MediaId.toLowerCase(), nextImage);
      await repo.insert(
        { table: "Media", id: "MediaId" },
        {
          MediaId: nextImage,
          EntityType: "Service",
          EntityId: next,
          MediaType: "Image",
          MediaUrl: image.MediaUrl,
          IsPrimary: image.IsPrimary,
          SortOrder: image.SortOrder,
        },
        tx,
      );
    }
    const packages = await repo.select(
      "SELECT * FROM dbo.ServicePackages WHERE ServiceId=:id",
      { id },
      tx,
    );
    for (const p of packages) {
      const packageId = randomUUID(),
        packageDetails = JSON.parse(p.DetailsJson || "{}");
      if (Array.isArray(packageDetails.images))
        packageDetails.images = packageDetails.images
          .map((imageId) => imageMap.get(String(imageId).toLowerCase()))
          .filter(Boolean);
      await repo.select(
        "INSERT INTO dbo.ServicePackages(PackageId,ServiceId,PackageName,Description,Price,DiscountPercentage,MinimumGuests,MaximumGuests,DurationMinutes,IsFeatured,IsActive,DetailsJson) SELECT :next,:service,PackageName,Description,Price,DiscountPercentage,MinimumGuests,MaximumGuests,DurationMinutes,IsFeatured,IsActive,:details FROM dbo.ServicePackages WHERE PackageId=:id; INSERT INTO dbo.PackageItems(PackageId,ItemName,Description,Quantity,Unit,SortOrder) SELECT :next,ItemName,Description,Quantity,Unit,SortOrder FROM dbo.PackageItems WHERE PackageId=:id",
        {
          next: packageId,
          service: next,
          id: p.PackageId,
          details: JSON.stringify(packageDetails),
        },
        tx,
      );
    }
    await repo.auditAdmin(
      ctx,
      "ADMIN_SERVICE_DUPLICATED",
      "Services",
      next,
      { sourceId: id },
      { status: "Draft" },
      tx,
    );
    return { id: next, message: "Service duplicated as an inactive draft." };
  });
}
export async function remove(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  return repo.transaction(async (tx) => {
    const row = await lock(id, input, ctx, tx);
    if (!["Draft", "Rejected"].includes(row.ApprovalStatus))
      fail(
        "Only draft and rejected services can be deleted. Deactivate this service instead.",
        409,
      );
    const [used] = await repo.select(
      "SELECT TOP(1) ServiceId FROM dbo.BookingItems WITH(UPDLOCK,HOLDLOCK) WHERE ServiceId=:id UNION ALL SELECT ServiceId FROM dbo.QuotationItems WHERE ServiceId=:id OR PackageId IN(SELECT PackageId FROM dbo.ServicePackages WHERE ServiceId=:id) UNION ALL SELECT ServiceId FROM dbo.QuotationRequests WHERE ServiceId=:id UNION ALL SELECT ServiceId FROM dbo.Offers WHERE ServiceId=:id",
      { id },
      tx,
    );
    if (used)
      fail(
        "Service has booking, quotation or offer history. Deactivate it instead.",
        409,
      );
    await repo.select(
      "DELETE FROM dbo.Wishlists WHERE ServiceId=:id OR PackageId IN(SELECT PackageId FROM dbo.ServicePackages WHERE ServiceId=:id); DELETE FROM dbo.PackageItems WHERE PackageId IN(SELECT PackageId FROM dbo.ServicePackages WHERE ServiceId=:id); DELETE FROM dbo.ServicePackages WHERE ServiceId=:id; DELETE FROM dbo.ServiceItems WHERE ServiceId=:id; DELETE FROM dbo.VendorAvailability WHERE ServiceId=:id; DELETE FROM dbo.ServiceDailyMetrics WHERE ServiceId=:id; DELETE FROM dbo.Media WHERE EntityType='Service' AND EntityId=:id; DELETE FROM dbo.Services WHERE ServiceId=:id",
      { id },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "ADMIN_SERVICE_DELETED",
      "Services",
      id,
      { name: row.ServiceName, status: row.ApprovalStatus },
      null,
      tx,
    );
    return { message: "Service deleted. Audit history has been preserved." };
  });
}
export async function itemMutation(id, itemId, input, ctx, remove = false) {
  requireRole(ctx, "ADMIN");
  const schema = z
    .object({
      expectedUpdatedAt: z.iso.datetime(),
      item: itemSchema.extend({ active: z.boolean().default(true) }).optional(),
    })
    .strict();
  const body = schema.parse(input);
  if (itemId) z.coerce.number().int().positive().parse(itemId);
  if (!remove && !body.item) fail("Item details required.");
  return repo.transaction(async (tx) => {
    const row = await lock(
      id,
      { expectedUpdatedAt: body.expectedUpdatedAt },
      ctx,
      tx,
    );
    editable(row);
    const [old] = itemId
      ? await repo.select(
          "SELECT * FROM dbo.ServiceItems WITH(UPDLOCK,HOLDLOCK) WHERE ServiceItemId=:itemId AND ServiceId=:id",
          { itemId, id },
          tx,
        )
      : [];
    if (itemId && !old) fail("Item not found in this service.", 404);
    if (remove)
      await repo.select(
        "DELETE FROM dbo.ServiceItems WHERE ServiceItemId=:itemId AND ServiceId=:id",
        { itemId, id },
        tx,
      );
    else {
      const i = body.item,
        values = {
          ItemName: i.name,
          Description: i.description,
          Quantity: i.quantity,
          Unit: i.unit,
          UnitPrice: i.price,
          IsIncluded: i.included ? 1 : 0,
          IsActive: i.active ? 1 : 0,
        };
      if (old)
        await repo.update(
          { table: "ServiceItems", id: "ServiceItemId" },
          itemId,
          values,
          tx,
        );
      else {
        const [count] = await repo.select(
          "SELECT COUNT(*) AS total FROM dbo.ServiceItems WHERE ServiceId=:id",
          { id },
          tx,
        );
        if (count.total >= 100) fail("Limit of 100 service items.");
        await repo.insert(
          { table: "ServiceItems", id: "ServiceItemId" },
          { ServiceId: id, ...values, SortOrder: count.total },
          tx,
        );
      }
    }
    await touch(
      row,
      ctx,
      "ADMIN_SERVICE_ITEM_CHANGED",
      { previous: old || null, item: body.item || null, removed: remove },
      tx,
    );
    return {
      message: "Service item saved. Approved content requires review again.",
    };
  });
}
export async function packageMutation(id, packageId, input, ctx) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(packageId);
  const body = z
    .object({
      expectedUpdatedAt: z.iso.datetime(),
      name: z.string().trim().min(2).max(200),
      description: z.string().trim().max(5000),
      price: amount,
      discount: amount.max(100),
      minimumGuests: z.number().int().nonnegative().nullable(),
      maximumGuests: z.number().int().nonnegative().nullable(),
      active: z.boolean(),
    })
    .strict()
    .refine(
      (v) =>
        v.minimumGuests == null ||
        v.maximumGuests == null ||
        v.maximumGuests >= v.minimumGuests,
      { message: "Guest range is invalid." },
    )
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await lock(
      id,
      { expectedUpdatedAt: body.expectedUpdatedAt },
      ctx,
      tx,
    );
    editable(row);
    const [old] = await repo.select(
      "SELECT * FROM dbo.ServicePackages WITH(UPDLOCK,HOLDLOCK) WHERE PackageId=:packageId AND ServiceId=:id",
      { packageId, id },
      tx,
    );
    if (!old) fail("Package not found in this service.", 404);
    await repo.update(
      { table: "ServicePackages", id: "PackageId" },
      packageId,
      {
        PackageName: body.name,
        Description: body.description,
        Price: body.price,
        DiscountPercentage: body.discount,
        MinimumGuests: body.minimumGuests,
        MaximumGuests: body.maximumGuests,
        IsActive: body.active ? 1 : 0,
        UpdatedAt: new Date(),
      },
      tx,
    );
    await touch(
      row,
      ctx,
      "ADMIN_SERVICE_PACKAGE_CHANGED",
      { packageId, previous: old, ...body },
      tx,
    );
    return {
      message:
        "Package saved. Prices are calculated by the database; approved content requires review again.",
    };
  });
}
export async function imageMutation(id, imageId, input, ctx) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(imageId);
  const body = z
    .object({
      expectedUpdatedAt: z.iso.datetime(),
      action: z.enum(["primary", "delete"]),
    })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await lock(
      id,
      { expectedUpdatedAt: body.expectedUpdatedAt },
      ctx,
      tx,
    );
    const [old] = await repo.select(
      "SELECT * FROM dbo.Media WITH(UPDLOCK,HOLDLOCK) WHERE MediaId=:imageId AND EntityId=:id AND EntityType='Service' AND MediaType='Image'",
      { imageId, id },
      tx,
    );
    if (!old) fail("Image not found in this service.", 404);
    const affectedPackages = [];
    if (body.action === "delete") {
      await repo.select(
        "DELETE FROM dbo.Media WHERE MediaId=:imageId AND EntityId=:id AND EntityType='Service'",
        { imageId, id },
        tx,
      );
      const packages = await repo.select(
        "SELECT PackageId,DetailsJson FROM dbo.ServicePackages WHERE ServiceId=:id",
        { id },
        tx,
      );
      for (const pack of packages) {
        const details = JSON.parse(pack.DetailsJson || "{}");
        if (
          !Array.isArray(details.images) ||
          !details.images.some(
            (value) => String(value).toLowerCase() === imageId.toLowerCase(),
          )
        )
          continue;
        affectedPackages.push({
          id: pack.PackageId,
          previousImages: details.images,
        });
        details.images = details.images.filter(
          (value) => String(value).toLowerCase() !== imageId.toLowerCase(),
        );
        await repo.update(
          { table: "ServicePackages", id: "PackageId" },
          pack.PackageId,
          { DetailsJson: JSON.stringify(details), UpdatedAt: new Date() },
          tx,
        );
      }
    } else
      await repo.select(
        "UPDATE dbo.Media SET IsPrimary=CASE WHEN MediaId=:imageId THEN 1 ELSE 0 END WHERE EntityId=:id AND EntityType='Service' AND MediaType='Image'",
        { imageId, id },
        tx,
      );
    await repo.select(
      "IF NOT EXISTS(SELECT 1 FROM dbo.Media WHERE EntityId=:id AND EntityType='Service' AND MediaType='Image' AND IsPrimary=1) UPDATE dbo.Media SET IsPrimary=1 WHERE MediaId=(SELECT TOP(1) MediaId FROM dbo.Media WHERE EntityId=:id AND EntityType='Service' AND MediaType='Image' ORDER BY SortOrder,MediaId)",
      { id },
      tx,
    );
    // Moderating inappropriate media can only reduce exposure, including listings under review or suspension.
    await touch(
      row,
      ctx,
      "ADMIN_SERVICE_IMAGE_CHANGED",
      {
        imageId,
        action: body.action,
        previous: { url: old.MediaUrl, primary: old.IsPrimary },
        affectedPackages,
      },
      tx,
      true,
    );
    return {
      message: "Image updated. Approved listings require review again.",
    };
  });
}
export async function uploadImage(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const body = z
    .object({
      expectedUpdatedAt: z.iso.datetime(),
      base64: z.string().max(7 * 1024 * 1024),
    })
    .strict()
    .parse(input);
  const [initial] = await repo.select(
    "SELECT * FROM dbo.Services WHERE ServiceId=:id",
    { id },
  );
  if (!initial) fail("Service not found.", 404);
  assertVersion(initial, body.expectedUpdatedAt);
  editable(initial);
  const asset = await uploadAsset(body.base64, true);
  return repo.transaction(async (tx) => {
    const row = await lock(
      id,
      { expectedUpdatedAt: body.expectedUpdatedAt },
      ctx,
      tx,
    );
    editable(row);
    const [count] = await repo.select(
      "SELECT COUNT(*) AS total FROM dbo.Media WHERE EntityId=:id AND EntityType='Service' AND MediaType='Image'",
      { id },
      tx,
    );
    if (count.total >= 30) fail("A service can have at most 30 images.");
    await repo.insert(
      { table: "Media", id: "MediaId" },
      {
        MediaId: randomUUID(),
        EntityType: "Service",
        EntityId: id,
        MediaType: "Image",
        MediaUrl: asset.url,
        IsPrimary: count.total ? 0 : 1,
        SortOrder: count.total,
      },
      tx,
    );
    await touch(
      row,
      ctx,
      "ADMIN_SERVICE_IMAGE_UPLOADED",
      { url: asset.url },
      tx,
    );
    return {
      message: "Image uploaded. Approved content requires review again.",
    };
  });
}
export async function records(id, kind, input, ctx) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const q = z
    .object({
      page: z.coerce.number().int().min(1).max(100000).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict()
    .parse(input);
  if (!["bookings", "reviews"].includes(kind))
    fail("Unknown service record type.", 404);
  const [service] = await repo.select(
    "SELECT ServiceId FROM dbo.Services WHERE ServiceId=:id",
    { id },
  );
  if (!service) fail("Service not found.", 404);
  const source =
    kind === "bookings"
      ? "FROM dbo.Booking t WHERE EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.BookingId=t.BookingId AND bi.ServiceId=:id)"
      : "FROM dbo.Reviews t WHERE EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.BookingId=t.BookingId AND bi.ServiceId=:id)";
  const fields =
    kind === "bookings"
      ? "t.BookingId AS id,t.BookingNumber AS name,t.BookingStatus AS status,t.BookingDate AS date,(SELECT SUM(LineTotal) FROM dbo.BookingItems bi WHERE bi.BookingId=t.BookingId AND bi.ServiceId=:id) AS amount"
      : "t.ReviewId AS id,t.Rating AS rating,t.ReviewText AS comment,t.IsPublished AS published,t.CreatedAt AS date";
  const p = { id, offset: (q.page - 1) * q.pageSize, size: q.pageSize };
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total ${source}`,
    p,
  );
  const rows = await repo.select(
    `SELECT ${fields} ${source} ORDER BY t.CreatedAt DESC,t.${kind === "bookings" ? "BookingId" : "ReviewId"} OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    p,
  );
  return { rows, total: Number(count.total), ...q };
}
export async function performance(id, ctx) {
  requireRole(ctx, "ADMIN");
  z.guid().parse(id);
  const [service] = await repo.select(
    "SELECT ServiceId FROM dbo.Services WHERE ServiceId=:id",
    { id },
  );
  if (!service) fail("Service not found.", 404);
  const [totals] = await repo.select(
    "SELECT COALESCE(SUM(Views),0) AS views,COALESCE(SUM(Enquiries),0) AS enquiries FROM dbo.ServiceDailyMetrics WHERE ServiceId=:id",
    { id },
  );
  const [bookings] = await repo.select(
    "SELECT COUNT(DISTINCT b.BookingId) AS bookings,COUNT(DISTINCT CASE WHEN b.BookingStatus='Completed' THEN b.BookingId END) AS completed,COUNT(DISTINCT CASE WHEN b.BookingStatus='Cancelled' THEN b.BookingId END) AS cancelled,COALESCE(SUM(CASE WHEN b.BookingStatus='Completed' THEN bi.LineTotal ELSE 0 END),0) AS revenue FROM dbo.BookingItems bi JOIN dbo.Booking b ON b.BookingId=bi.BookingId WHERE bi.ServiceId=:id",
    { id },
  );
  const [quotes] = await repo.select(
    "SELECT COUNT(DISTINCT QuotationId) AS quotations FROM dbo.QuotationItems WHERE ServiceId=:id",
    { id },
  );
  const [rating] = await repo.select(
    "SELECT AVG(CAST(r.Rating AS decimal(6,2))) AS rating,COUNT_BIG(*) AS reviews FROM dbo.Reviews r WHERE r.IsPublished=1 AND EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.BookingId=r.BookingId AND bi.ServiceId=:id)",
    { id },
  );
  const series = await repo.select(
    `WITH days AS(SELECT CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME())) AS day UNION ALL SELECT DATEADD(day,-1,day) FROM days WHERE day>DATEADD(day,-89,CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME())))) SELECT d.day AS date,COALESCE(m.Views,0) AS views,COALESCE(b.bookings,0) AS bookings,COALESCE(b.revenue,0) AS revenue FROM days d LEFT JOIN dbo.ServiceDailyMetrics m ON m.ServiceId=:id AND m.MetricDate=d.day OUTER APPLY(SELECT COUNT(DISTINCT bk.BookingId) AS bookings,SUM(CASE WHEN bk.BookingStatus='Completed' THEN bi.LineTotal ELSE 0 END) AS revenue FROM dbo.BookingItems bi JOIN dbo.Booking bk ON bk.BookingId=bi.BookingId WHERE bi.ServiceId=:id AND CONVERT(date,DATEADD(minute,330,bk.CreatedAt))=d.day) b ORDER BY d.day OPTION(MAXRECURSION 90)`,
    { id },
  );
  return { ...totals, ...bookings, ...quotes, ...rating, series };
}
export async function childrenIndex(kind, input, ctx) {
  requireRole(ctx, "ADMIN");
  if (!["items", "packages"].includes(kind)) fail("Resource not found.", 404);
  const q = z
    .object({
      q: text,
      page: z.coerce.number().int().min(1).max(100000).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict()
    .parse(input);
  const item = kind === "items",
    table = item ? "ServiceItems" : "ServicePackages",
    name = item ? "ItemName" : "PackageName",
    pk = item ? "ServiceItemId" : "PackageId";
  const source = `FROM dbo.${table} t JOIN dbo.Services s ON s.ServiceId=t.ServiceId JOIN dbo.Vendors v ON v.VendorId=s.VendorId WHERE t.${name} LIKE :q OR s.ServiceName LIKE :q OR v.BusinessName LIKE :q`;
  const p = {
    q: like(q.q),
    offset: (q.page - 1) * q.pageSize,
    size: q.pageSize,
  };
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total ${source}`,
    p,
  );
  const rows = await repo.select(
    `SELECT t.${pk} AS id,t.${name} AS name,s.ServiceId AS serviceId,s.ServiceName AS service,v.BusinessName AS vendor,t.${item ? "UnitPrice" : "FinalPrice"} AS price,t.IsActive AS active ${source} ORDER BY t.CreatedAt DESC,t.${pk} OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    p,
  );
  return { rows, total: Number(count.total), ...q };
}
export { csvCell } from "../../utils/csv.js";
