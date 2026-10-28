import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import { repo, owned, fail, audit, assertVersion } from "./workspace.common.js";
import { serviceTemplates } from "./service-templates.js";
import {
  validateAttributes,
  availabilityInput,
} from "./workspace.validation.js";
import {
  serviceSchema,
  listSchema,
  calculatePrice,
  actionsFor,
  validateServiceSubmission,
} from "./service-management.validation.js";
import { uploadAsset } from "../media/cloudinary.service.js";

export function serviceScope(ctx) {
  const user = requireRole(ctx, "VENDOR");
  if (!user.vendor?.id) fail("Vendor profile required.", 403);
  return {
    id: user.vendor.id,
    user,
    approved:
      user.vendor.verificationStatus === "Approved" && !!user.vendor.active,
  };
}
const parse = (value) => (value ? JSON.parse(value) : {});
const version = (row, expected) => {
  if (!expected) fail("Refresh the service before making changes.", 409);
  assertVersion(row, expected);
};
const lock = (serviceId, ctx, tx, write = true) =>
  owned("services", serviceId, serviceScope(ctx).id, tx, write);
const editable = (row) => {
  if (!actionsFor(row).edit)
    fail("This service cannot be edited during review or suspension.", 409);
};
const update = (id, values, tx) =>
  repo.update(
    { table: "Services", id: "ServiceId" },
    id,
    { ...values, UpdatedAt: new Date() },
    tx,
  );
async function reapprove(row, ctx, tx) {
  if (row.ApprovalStatus === "Approved") {
    await update(row.ServiceId, { ApprovalStatus: "Draft", IsActive: 0 }, tx);
    await audit(
      ctx,
      "SERVICE_REAPPROVAL_REQUIRED",
      "Services",
      row.ServiceId,
      { status: "Approved" },
      { status: "Draft" },
      tx,
    );
  } else await update(row.ServiceId, {}, tx);
}
export async function metadata(ctx) {
  const { approved, user } = serviceScope(ctx);
  const categories = (
    await repo.select(
      "SELECT c.CategoryId AS id,c.CategoryName AS name FROM dbo.Categories c JOIN dbo.VendorCategories vc ON vc.CategoryId=c.CategoryId AND vc.VendorId=:id WHERE c.IsActive=1 ORDER BY c.SortOrder,c.CategoryId",
      { id: user.vendor.id },
    )
  ).filter((c) => Object.hasOwn(serviceTemplates, c.name));
  const subcategories = await repo.select(
    "SELECT SubCategoryId AS id,CategoryId AS categoryId,SubCategoryName AS name FROM dbo.SubCategories WHERE IsActive=1 ORDER BY SortOrder,SubCategoryId",
  );
  return {
    categories,
    subcategories,
    templates: serviceTemplates,
    canSubmit: approved,
    vendorName: user.vendor.businessName,
  };
}
const joins = `FROM dbo.Services s JOIN dbo.Categories c ON c.CategoryId=s.CategoryId LEFT JOIN dbo.SubCategories sc ON sc.SubCategoryId=s.SubCategoryId
 OUTER APPLY(SELECT COUNT(DISTINCT bi.BookingId) AS bookings FROM dbo.BookingItems bi WHERE bi.ServiceId=s.ServiceId) b
 OUTER APPLY(SELECT AVG(CAST(r.Rating AS decimal(6,2))) AS rating,COUNT_BIG(*) AS reviewCount FROM dbo.Reviews r WHERE r.IsPublished=1 AND EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.BookingId=r.BookingId AND bi.ServiceId=s.ServiceId)) r`;
export async function list(input, ctx) {
  const { id, approved } = serviceScope(ctx),
    q = listSchema.parse(input);
  const p = {
    ...q,
    id,
    offset: (q.page - 1) * q.pageSize,
    size: q.pageSize,
    search: `%${q.q.replace(/[\[\]%_]/g, (x) => `[${x}]`)}%`,
    city: `%${q.location.replace(/[\[\]%_]/g, (x) => `[${x}]`)}%`,
  };
  const where = [`s.VendorId=:id`];
  if (q.q)
    where.push(
      "(s.ServiceName LIKE :search OR CONVERT(varchar(36),s.ServiceId) LIKE :search OR c.CategoryName LIKE :search OR sc.SubCategoryName LIKE :search)",
    );
  if (q.category) where.push("s.CategoryId=:category");
  if (q.subcategory) where.push("s.SubCategoryId=:subcategory");
  if (q.approval) where.push("s.ApprovalStatus=:approval");
  if (q.active) {
    p.isActive = q.active === "true" ? 1 : 0;
    where.push("s.IsActive=:isActive");
  }
  where.push(
    "COALESCE(s.BasePrice,0) BETWEEN :minPrice AND :maxPrice",
    "COALESCE(r.rating,0)>=:rating",
  );
  if (q.location)
    where.push("JSON_VALUE(s.DetailsJson,'$.location.city') LIKE :city");
  if (q.from)
    where.push("s.CreatedAt>=DATEADD(minute,-330,CAST(:from AS datetime2))");
  if (q.to)
    where.push(
      "s.CreatedAt<DATEADD(minute,-330,DATEADD(day,1,CAST(:to AS datetime2)))",
    );
  const sort = {
    newest: "s.CreatedAt DESC",
    oldest: "s.CreatedAt ASC",
    priceAsc: "s.BasePrice ASC",
    priceDesc: "s.BasePrice DESC",
    bookings: "b.bookings DESC",
    rating: "r.rating DESC",
    updated: "s.UpdatedAt DESC",
  }[q.sort];
  const source = `${joins} WHERE ${where.join(" AND ")}`;
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total ${source}`,
    p,
  );
  const rows = await repo.select(
    `SELECT s.ServiceId AS id,s.ServiceName AS name,s.CategoryId AS categoryId,c.CategoryName AS category,sc.SubCategoryName AS subcategory,s.BasePrice AS price,s.ApprovalStatus AS status,s.IsActive AS active,s.UpdatedAt AS updatedAt,JSON_VALUE(s.DetailsJson,'$.location.city') AS location,b.bookings,r.rating,CASE WHEN EXISTS(SELECT 1 FROM dbo.QuotationItems qi WHERE qi.ServiceId=s.ServiceId) OR EXISTS(SELECT 1 FROM dbo.QuotationRequests qr WHERE qr.ServiceId=s.ServiceId) OR EXISTS(SELECT 1 FROM dbo.Offers o WHERE o.ServiceId=s.ServiceId) THEN 1 ELSE 0 END AS hasHistory,(SELECT TOP(1) MediaUrl FROM dbo.Media WHERE EntityType='Service' AND EntityId=s.ServiceId AND MediaType='Image' ORDER BY IsPrimary DESC,SortOrder,MediaId) AS image ${source} ORDER BY ${sort},s.ServiceId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    p,
  );
  const [stats] = await repo.select(
    `SELECT COUNT_BIG(*) AS totalServices,SUM(CASE WHEN s.IsActive=1 AND s.ApprovalStatus='Approved' THEN 1 ELSE 0 END) AS activeServices,SUM(CASE WHEN s.ApprovalStatus='Draft' THEN 1 ELSE 0 END) AS draftServices,SUM(CASE WHEN s.ApprovalStatus='Pending' THEN 1 ELSE 0 END) AS pendingApproval,SUM(CASE WHEN s.ApprovalStatus='Approved' THEN 1 ELSE 0 END) AS approvedServices,SUM(CASE WHEN s.ApprovalStatus='Rejected' THEN 1 ELSE 0 END) AS rejectedServices,(SELECT COUNT(DISTINCT bi.BookingId) FROM dbo.BookingItems bi JOIN dbo.Services bs ON bs.ServiceId=bi.ServiceId WHERE bs.VendorId=:id) AS totalBookings FROM dbo.Services s OUTER APPLY(SELECT COUNT(DISTINCT bi.BookingId) AS bookings FROM dbo.BookingItems bi WHERE bi.ServiceId=s.ServiceId) b WHERE s.VendorId=:id`,
    { id },
  );
  const [rating] = await repo.select(
    "SELECT AVG(CAST(Rating AS decimal(6,2))) AS averageRating FROM dbo.Reviews WHERE VendorId=:id AND IsPublished=1",
    { id },
  );
  return {
    rows: rows.map((row) => ({ ...row, actions: actionsFor(row, approved) })),
    total: Number(count.total),
    page: q.page,
    pageSize: q.pageSize,
    stats: { ...stats, ...rating },
    canSubmit: approved,
  };
}
export async function details(serviceId, ctx) {
  const row = await lock(serviceId, ctx, undefined, false);
  const items = await repo.select(
    "SELECT ServiceItemId AS id,ItemName AS name,Description AS description,Quantity AS quantity,Unit AS unit,UnitPrice AS price,IsIncluded AS included FROM dbo.ServiceItems WHERE ServiceId=:serviceId ORDER BY SortOrder,ServiceItemId",
    { serviceId },
  );
  const images = await repo.select(
    "SELECT MediaId AS id,MediaUrl AS url,IsPrimary AS [primary],SortOrder AS sortOrder FROM dbo.Media WHERE EntityType='Service' AND EntityId=:serviceId AND MediaType='Image' ORDER BY IsPrimary DESC,SortOrder,MediaId",
    { serviceId },
  );
  const [history] = await repo.select(
    "SELECT CASE WHEN EXISTS(SELECT 1 FROM dbo.BookingItems WHERE ServiceId=:serviceId) OR EXISTS(SELECT 1 FROM dbo.QuotationItems WHERE ServiceId=:serviceId) OR EXISTS(SELECT 1 FROM dbo.QuotationRequests WHERE ServiceId=:serviceId) OR EXISTS(SELECT 1 FROM dbo.Offers WHERE ServiceId=:serviceId) THEN 1 ELSE 0 END AS hasHistory",
    { serviceId },
  );
  return {
    ...parse(row.DetailsJson),
    pricing: parse(row.DetailsJson).pricing || {
      basePrice: Number(row.BasePrice || 0),
      unitPrice: 0,
      minimumQuantity: 1,
      maximumQuantity: 1,
      unit:
        {
          PerPerson: "Per Person",
          PerHour: "Per Hour",
          PerDay: "Per Day",
          PerItem: "Per Item",
          CustomQuote: "Custom",
        }[row.PricingType] || "Per Event",
    },
    id: row.ServiceId,
    name: row.ServiceName,
    categoryId: row.CategoryId,
    subcategoryId: row.SubCategoryId,
    description: row.Description || "",
    attributes: parse(row.AttributesJson),
    status: row.ApprovalStatus,
    active: !!row.IsActive,
    updatedAt: row.UpdatedAt,
    slug: row.ServiceSlug,
    price: row.BasePrice,
    items,
    images,
    rejectionReason: row.RejectionReason,
    adminNote: row.AdminNote,
    rejectedAt: row.RejectedAt,
    approvalCycle: row.ApprovalCycle,
    actions: actionsFor(
      { ...row, hasHistory: history?.hasHistory },
      serviceScope(ctx).approved,
    ),
  };
}
async function replaceItems(serviceId, items, tx) {
  await repo.select(
    "DELETE FROM dbo.ServiceItems WHERE ServiceId=:serviceId",
    { serviceId },
    tx,
  );
  for (const [sort, item] of items.entries())
    await repo.insert(
      { table: "ServiceItems", id: "ServiceItemId" },
      {
        ServiceId: serviceId,
        ItemName: item.name,
        Description: item.description,
        Quantity: item.quantity,
        Unit: item.unit,
        UnitPrice: item.price,
        IsIncluded: item.included ? 1 : 0,
        SortOrder: sort,
      },
      tx,
    );
}
export async function saveService(serviceId, input, ctx) {
  const { id } = serviceScope(ctx),
    body = serviceSchema.parse(input);
  return repo.transaction(async (tx) => {
    const old = serviceId ? await lock(serviceId, ctx, tx) : null;
    if (old) {
      editable(old);
      version(old, body.expectedUpdatedAt);
    }
    const [category] = await repo.select(
      "SELECT CategoryName AS name FROM dbo.Categories WHERE CategoryId=:category AND IsActive=1",
      { category: body.categoryId },
      tx,
    );
    if (!category) fail("Choose an active category.");
    const attributes = validateAttributes(category.name, body.attributes);
    const [assigned] = await repo.select(
      "SELECT CategoryId FROM dbo.VendorCategories WHERE VendorId=:id AND CategoryId=:category",
      { id, category: body.categoryId },
      tx,
    );
    if (!assigned)
      fail("Add this category to your business profile before using it.", 403);
    if (body.subcategoryId) {
      const [sub] = await repo.select(
        "SELECT SubCategoryId FROM dbo.SubCategories WHERE SubCategoryId=:sub AND CategoryId=:category AND IsActive=1",
        { sub: body.subcategoryId, category: body.categoryId },
        tx,
      );
      if (!sub) fail("Subcategory does not belong to this category.");
    }
    const next = old?.ServiceId || randomUUID();
    const [duplicate] = await repo.select(
      "SELECT ServiceId FROM dbo.Services WITH(UPDLOCK,HOLDLOCK) WHERE ServiceSlug=:slug AND ServiceId<>:next",
      { slug: body.seo.slug, next },
      tx,
    );
    if (duplicate) fail("This URL slug is already used. Choose another.", 409);
    const { expectedUpdatedAt, items, ...document } = body;
    const price = calculatePrice(body.pricing);
    // All customer-visible edits create a new review cycle. Live content is withdrawn atomically.
    const status =
      old?.ApprovalStatus === "Approved"
        ? "Draft"
        : old?.ApprovalStatus || "Draft";
    const values = {
      ServiceName: body.name,
      ServiceSlug: body.seo.slug,
      CategoryId: body.categoryId,
      SubCategoryId: body.subcategoryId,
      Description: body.description,
      AttributesJson: JSON.stringify(attributes),
      DetailsJson: JSON.stringify(document),
      BasePrice: price,
      PricingType:
        {
          "Per Hour": "PerHour",
          "Per Day": "PerDay",
          "Per Item": "PerItem",
          "Per Person": "PerPerson",
          "Per Plate": "PerPerson",
          Custom: "CustomQuote",
        }[body.pricing.unit] || "Fixed",
      ApprovalStatus: status,
      IsActive: 0,
      UpdatedAt: new Date(),
    };
    if (old)
      await repo.update(
        { table: "Services", id: "ServiceId" },
        next,
        values,
        tx,
      );
    else
      await repo.insert(
        { table: "Services", id: "ServiceId" },
        { ...values, ServiceId: next, VendorId: id },
        tx,
      );
    await replaceItems(next, items, tx);
    await audit(
      ctx,
      old ? "SERVICE_UPDATED" : "SERVICE_CREATED",
      "Services",
      next,
      old ? { status: old.ApprovalStatus } : null,
      { status, price },
      tx,
    );
    return {
      id: next,
      message:
        old?.ApprovalStatus === "Approved"
          ? "Changes saved as draft. Changes require admin approval."
          : "Draft saved.",
    };
  });
}
export async function submit(serviceId, input, ctx) {
  const { approved, id } = serviceScope(ctx);
  if (!approved)
    fail(
      "Your business must be approved and active before submitting services.",
      403,
    );
  const body = z
    .object({ expectedUpdatedAt: z.iso.datetime() })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await lock(serviceId, ctx, tx);
    version(row, body.expectedUpdatedAt);
    if (!actionsFor(row).submit)
      fail("Only drafts and rejected services can be submitted.", 409);
    const document = serviceSchema.parse({
      ...parse(row.DetailsJson),
      name: row.ServiceName,
      description: row.Description,
      categoryId: row.CategoryId,
      subcategoryId: row.SubCategoryId,
      attributes: parse(row.AttributesJson),
      items: [],
    });
    const [media] = await repo.select(
      "SELECT TOP(1) MediaId FROM dbo.Media WHERE EntityType='Service' AND EntityId=:serviceId AND MediaType='Image'",
      { serviceId },
      tx,
    );
    validateServiceSubmission(document, media ? 1 : 0);
    // Lock vendor too: approval withdrawal cannot race with submission.
    const [vendor] = await repo.select(
      "SELECT VerificationStatus,IsActive FROM dbo.Vendors WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:id",
      { id },
      tx,
    );
    if (vendor?.VerificationStatus !== "Approved" || !vendor.IsActive)
      fail("Vendor approval required.", 403);
    await update(
      serviceId,
      {
        ApprovalStatus: "Pending",
        IsActive: 0,
        SubmittedAt: new Date(),
        ApprovalCycle: (row.ApprovalCycle || 0) + 1,
        RejectionReason: null,
        AdminNote: null,
        RejectedAt: null,
      },
      tx,
    );
    await audit(
      ctx,
      "SERVICE_SUBMITTED",
      "Services",
      serviceId,
      { status: row.ApprovalStatus },
      { status: "Pending", cycle: (row.ApprovalCycle || 0) + 1 },
      tx,
    );
    return { message: "Service submitted for admin approval." };
  });
}
export async function active(serviceId, input, ctx) {
  const body = z
    .object({ active: z.boolean(), expectedUpdatedAt: z.iso.datetime() })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await lock(serviceId, ctx, tx);
    version(row, body.expectedUpdatedAt);
    if (
      body.active &&
      (!serviceScope(ctx).approved || row.ApprovalStatus !== "Approved")
    )
      fail("Both vendor and service approval are required to activate.", 409);
    if (body.active) {
      const [vendor] = await repo.select(
        "SELECT VerificationStatus,IsActive FROM dbo.Vendors WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:id",
        { id: row.VendorId },
        tx,
      );
      if (vendor?.VerificationStatus !== "Approved" || !vendor.IsActive)
        fail("Vendor approval required.", 403);
    }
    if (row.ApprovalStatus === "Suspended")
      fail("A suspended service cannot change its listing status.", 409);
    await update(serviceId, { IsActive: body.active ? 1 : 0 }, tx);
    await audit(
      ctx,
      "SERVICE_ACTIVE_CHANGED",
      "Services",
      serviceId,
      { active: row.IsActive },
      { active: body.active },
      tx,
    );
    return {
      message: body.active ? "Service activated." : "Service deactivated.",
    };
  });
}
export async function duplicate(serviceId, ctx) {
  serviceScope(ctx);
  return repo.transaction(async (tx) => {
    const row = await lock(serviceId, ctx, tx),
      next = randomUUID(),
      doc = parse(row.DetailsJson),
      slug = `${row.ServiceSlug.slice(0, 150)}-copy-${next}`;
    if (doc.seo) doc.seo.slug = slug;
    await repo.insert(
      { table: "Services", id: "ServiceId" },
      {
        ServiceId: next,
        VendorId: row.VendorId,
        CategoryId: row.CategoryId,
        SubCategoryId: row.SubCategoryId,
        ServiceName: `${row.ServiceName.slice(0, 190)} (copy)`,
        ServiceSlug: slug,
        Description: row.Description,
        PricingType: row.PricingType,
        BasePrice: row.BasePrice,
        AttributesJson: row.AttributesJson,
        DetailsJson: JSON.stringify(doc),
        ApprovalStatus: "Draft",
        IsActive: 0,
      },
      tx,
    );
    await repo.select(
      "INSERT INTO dbo.ServiceItems(ServiceId,ItemName,Description,Quantity,Unit,UnitPrice,IsIncluded,SortOrder) SELECT :next,ItemName,Description,Quantity,Unit,UnitPrice,IsIncluded,SortOrder FROM dbo.ServiceItems WHERE ServiceId=:serviceId",
      { next, serviceId },
      tx,
    );
    const sourceImages = await repo.select(
        "SELECT MediaId,MediaUrl,IsPrimary,SortOrder FROM dbo.Media WHERE EntityType='Service' AND EntityId=:serviceId AND MediaType='Image'",
        { serviceId },
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
      "SELECT * FROM dbo.ServicePackages WHERE ServiceId=:serviceId",
      { serviceId },
      tx,
    );
    for (const pack of packages) {
      const nextPackage = randomUUID(),
        extra = parse(pack.DetailsJson);
      if (extra.images)
        extra.images = extra.images
          .map((image) => imageMap.get(image.toLowerCase()))
          .filter(Boolean);
      await repo.insert(
        { table: "ServicePackages", id: "PackageId" },
        {
          PackageId: nextPackage,
          ServiceId: next,
          PackageName: pack.PackageName,
          Description: pack.Description,
          Price: pack.Price,
          DiscountPercentage: pack.DiscountPercentage,
          MinimumGuests: pack.MinimumGuests,
          MaximumGuests: pack.MaximumGuests,
          DurationMinutes: pack.DurationMinutes,
          IsFeatured: pack.IsFeatured,
          IsActive: pack.IsActive,
          DetailsJson: JSON.stringify(extra),
        },
        tx,
      );
      await repo.select(
        "INSERT INTO dbo.PackageItems(PackageId,ItemName,Description,Quantity,Unit,SortOrder) SELECT :nextPackage,ItemName,Description,Quantity,Unit,SortOrder FROM dbo.PackageItems WHERE PackageId=:previous",
        { nextPackage, previous: pack.PackageId },
        tx,
      );
    }
    await repo.select(
      "INSERT INTO dbo.VendorAvailability(VendorId,ServiceId,AvailableDate,StartTime,EndTime,Status,Notes) SELECT VendorId,:next,AvailableDate,StartTime,EndTime,Status,Notes FROM dbo.VendorAvailability WHERE ServiceId=:serviceId AND VendorId=:vendor AND Status<>'Booked' AND AvailableDate>=CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME()))",
      { next, serviceId, vendor: row.VendorId },
      tx,
    );
    await audit(
      ctx,
      "SERVICE_DUPLICATED",
      "Services",
      next,
      null,
      { source: serviceId },
      tx,
    );
    return { id: next, message: "Service duplicated as a draft." };
  });
}
export async function remove(serviceId, input, ctx) {
  const body = z
    .object({ expectedUpdatedAt: z.iso.datetime() })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await lock(serviceId, ctx, tx);
    version(row, body.expectedUpdatedAt);
    if (!actionsFor(row).delete)
      fail("Only unbooked draft or rejected services can be deleted.", 409);
    const [used] = await repo.select(
      "SELECT TOP(1) ServiceId FROM dbo.BookingItems WHERE ServiceId=:serviceId UNION ALL SELECT ServiceId FROM dbo.QuotationItems WHERE ServiceId=:serviceId UNION ALL SELECT ServiceId FROM dbo.QuotationRequests WHERE ServiceId=:serviceId UNION ALL SELECT ServiceId FROM dbo.Offers WHERE ServiceId=:serviceId",
      { serviceId },
      tx,
    );
    if (used)
      fail(
        "This service has booking, quotation or offer history. Deactivate it instead.",
        409,
      );
    await repo.select(
      "DELETE FROM dbo.PackageItems WHERE PackageId IN(SELECT PackageId FROM dbo.ServicePackages WHERE ServiceId=:serviceId); DELETE FROM dbo.Wishlists WHERE ServiceId=:serviceId OR PackageId IN(SELECT PackageId FROM dbo.ServicePackages WHERE ServiceId=:serviceId); DELETE FROM dbo.ServicePackages WHERE ServiceId=:serviceId; DELETE FROM dbo.ServiceItems WHERE ServiceId=:serviceId; DELETE FROM dbo.VendorAvailability WHERE ServiceId=:serviceId; DELETE FROM dbo.ServiceDailyMetrics WHERE ServiceId=:serviceId; DELETE FROM dbo.Media WHERE EntityType='Service' AND EntityId=:serviceId; DELETE FROM dbo.Services WHERE ServiceId=:serviceId",
      { serviceId },
      tx,
    );
    await audit(
      ctx,
      "SERVICE_DELETED",
      "Services",
      serviceId,
      { name: row.ServiceName },
      null,
      tx,
    );
    return { message: "Service deleted." };
  });
}
export async function images(serviceId, input, ctx, removeId = null) {
  const body = removeId
    ? z.object({ expectedUpdatedAt: z.iso.datetime() }).strict().parse(input)
    : z
        .object({
          expectedUpdatedAt: z.iso.datetime(),
          base64: z
            .string()
            .max(7 * 1024 * 1024)
            .optional(),
          order: z.array(z.guid()).min(1).max(30).optional(),
          primaryId: z.guid().optional(),
        })
        .strict()
        .parse(input);
  // Verify ownership before sending any bytes to the external media provider.
  const initial = await lock(serviceId, ctx, undefined, false);
  editable(initial);
  version(initial, body.expectedUpdatedAt);
  const asset = body.base64 ? await uploadAsset(body.base64, true) : null;
  return repo.transaction(async (tx) => {
    const row = await lock(serviceId, ctx, tx);
    editable(row);
    version(row, body.expectedUpdatedAt);
    const all = await repo.select(
      "SELECT MediaId FROM dbo.Media WHERE EntityType='Service' AND EntityId=:serviceId AND MediaType='Image' ORDER BY SortOrder,MediaId",
      { serviceId },
      tx,
    );
    if (removeId) {
      z.guid().parse(removeId);
      if (!all.some((x) => x.MediaId.toLowerCase() === removeId.toLowerCase()))
        fail("Image not found.", 404);
      await repo.select(
        "DELETE FROM dbo.Media WHERE MediaId=:removeId AND EntityType='Service' AND EntityId=:serviceId",
        { removeId, serviceId },
        tx,
      );
    } else if (asset) {
      if (all.length >= 30) fail("A service can contain up to 30 images.");
      await repo.insert(
        { table: "Media", id: "MediaId" },
        {
          MediaId: randomUUID(),
          EntityType: "Service",
          EntityId: serviceId,
          MediaType: "Image",
          MediaUrl: asset.url.replace(
            "/upload/",
            "/upload/f_auto,q_auto,w_1600,c_limit/",
          ),
          IsPrimary: all.length ? 0 : 1,
          SortOrder: all.length,
        },
        tx,
      );
    } else if (body.order) {
      if (
        body.order.length !== all.length ||
        new Set(body.order.map((x) => x.toLowerCase())).size !== all.length ||
        body.order.some(
          (x) => !all.some((a) => a.MediaId.toLowerCase() === x.toLowerCase()),
        )
      )
        fail("Reordering must include every service image exactly once.");
      for (const [sort, imageId] of body.order.entries())
        await repo.select(
          "UPDATE dbo.Media SET SortOrder=:sort WHERE MediaId=:imageId AND EntityType='Service' AND EntityId=:serviceId",
          { sort, imageId, serviceId },
          tx,
        );
    } else if (body.primaryId) {
      if (
        !all.some(
          (x) => x.MediaId.toLowerCase() === body.primaryId.toLowerCase(),
        )
      )
        fail("Image not found.", 404);
      await repo.select(
        "UPDATE dbo.Media SET IsPrimary=CASE WHEN MediaId=:primary THEN 1 ELSE 0 END WHERE EntityType='Service' AND EntityId=:serviceId AND MediaType='Image'",
        { primary: body.primaryId, serviceId },
        tx,
      );
    } else
      fail("Upload an image, select a primary image, or provide its order.");
    await repo.select(
      "IF NOT EXISTS(SELECT 1 FROM dbo.Media WHERE EntityType='Service' AND EntityId=:serviceId AND MediaType='Image' AND IsPrimary=1) UPDATE dbo.Media SET IsPrimary=1 WHERE MediaId=(SELECT TOP(1) MediaId FROM dbo.Media WHERE EntityType='Service' AND EntityId=:serviceId AND MediaType='Image' ORDER BY SortOrder,MediaId)",
      { serviceId },
      tx,
    );
    await reapprove(row, ctx, tx);
    await audit(
      ctx,
      "SERVICE_IMAGES_UPDATED",
      "Services",
      serviceId,
      null,
      { removed: removeId, uploaded: !!asset },
      tx,
    );
    return {
      message: "Images updated. Approved listings require re-approval.",
    };
  });
}
export async function availability(serviceId, ctx) {
  await lock(serviceId, ctx, undefined, false);
  return repo.select(
    "SELECT AvailabilityId AS id,AvailableDate AS date,StartTime AS startTime,EndTime AS endTime,Status AS status,Notes AS notes FROM dbo.VendorAvailability WHERE ServiceId=:serviceId AND VendorId=:id ORDER BY AvailableDate",
    { serviceId, id: serviceScope(ctx).id },
  );
}
export async function saveAvailability(
  serviceId,
  input,
  ctx,
  availabilityId = null,
  del = false,
) {
  const { id } = serviceScope(ctx);
  return repo.transaction(async (tx) => {
    await lock(serviceId, ctx, tx);
    let existing;
    if (availabilityId) {
      z.coerce.number().int().positive().parse(availabilityId);
      [existing] = await repo.select(
        "SELECT * FROM dbo.VendorAvailability WITH(UPDLOCK,HOLDLOCK) WHERE AvailabilityId=:availabilityId AND ServiceId=:serviceId AND VendorId=:id",
        { availabilityId, serviceId, id },
        tx,
      );
      if (!existing) fail("Availability not found.", 404);
      if (existing.Status === "Booked")
        fail("Booked dates cannot be changed.", 409);
    }
    if (del) {
      await repo.select(
        "DELETE FROM dbo.VendorAvailability WHERE AvailabilityId=:availabilityId AND ServiceId=:serviceId AND VendorId=:id",
        { availabilityId, serviceId, id },
        tx,
      );
      await audit(
        ctx,
        "SERVICE_AVAILABILITY_REMOVED",
        "Services",
        serviceId,
        { availabilityId },
        null,
        tx,
      );
      return { message: "Date unblocked." };
    }
    const body = availabilityInput.parse({ ...input, serviceId });
    const [booked] = await repo.select(
      "SELECT TOP(1) b.BookingId FROM dbo.Booking b JOIN dbo.BookingItems bi ON bi.BookingId=b.BookingId WHERE bi.ServiceId=:serviceId AND b.VendorId=:id AND b.BookingDate BETWEEN :from AND :to AND b.BookingStatus IN ('Accepted','PaymentPending','Confirmed','InProgress')",
      { serviceId, id, from: body.from, to: body.to },
      tx,
    );
    if (booked)
      fail("Resolve existing bookings before changing these dates.", 409);
    if (availabilityId)
      await repo.select(
        "DELETE FROM dbo.VendorAvailability WHERE AvailabilityId=:availabilityId AND ServiceId=:serviceId AND VendorId=:id",
        { availabilityId, serviceId, id },
        tx,
      );
    for (
      let d = new Date(`${body.from}T12:00:00Z`);
      d <= new Date(`${body.to}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const date = d.toISOString().slice(0, 10);
      const [dateRow] = await repo.select(
        "SELECT AvailabilityId,Status FROM dbo.VendorAvailability WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:id AND ServiceId=:serviceId AND AvailableDate=:date",
        { id, serviceId, date },
        tx,
      );
      if (dateRow?.Status === "Booked")
        fail("Booked dates cannot be overwritten.", 409);
      if (dateRow)
        await repo.select(
          "DELETE FROM dbo.VendorAvailability WHERE AvailabilityId=:record",
          { record: dateRow.AvailabilityId },
          tx,
        );
      await repo.insert(
        { table: "VendorAvailability", id: "AvailabilityId" },
        {
          VendorId: id,
          ServiceId: serviceId,
          AvailableDate: date,
          StartTime: body.startTime,
          EndTime: body.endTime,
          Status: body.status,
          Notes: body.notes,
        },
        tx,
      );
    }
    await audit(
      ctx,
      "SERVICE_AVAILABILITY_UPDATED",
      "Services",
      serviceId,
      null,
      body,
      tx,
    );
    return { message: "Availability updated." };
  });
}
export async function performance(serviceId, ctx) {
  await lock(serviceId, ctx, undefined, false);
  const metrics = await repo.select(
    "SELECT MetricDate AS date,Views AS views,Enquiries AS enquiries FROM dbo.ServiceDailyMetrics WHERE ServiceId=:serviceId AND MetricDate>=DATEADD(day,-89,CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME()))) ORDER BY MetricDate",
    { serviceId },
  );
  const [totals] = await repo.select(
    "SELECT COALESCE(SUM(Views),0) AS views,COALESCE(SUM(Enquiries),0) AS enquiries FROM dbo.ServiceDailyMetrics WHERE ServiceId=:serviceId",
    { serviceId },
  );
  const [bookings] = await repo.select(
    "SELECT COUNT(DISTINCT b.BookingId) AS bookings,COALESCE(SUM(CASE WHEN b.BookingStatus='Completed' THEN bi.LineTotal ELSE 0 END),0) AS revenue FROM dbo.BookingItems bi JOIN dbo.Booking b ON b.BookingId=bi.BookingId WHERE bi.ServiceId=:serviceId",
    { serviceId },
  );
  const [quotes] = await repo.select(
    "SELECT COUNT(DISTINCT QuotationId) AS quotations FROM dbo.QuotationItems WHERE ServiceId=:serviceId",
    { serviceId },
  );
  const [reviews] = await repo.select(
    "SELECT AVG(CAST(r.Rating AS decimal(6,2))) AS averageRating,COUNT_BIG(*) AS reviewCount FROM dbo.Reviews r WHERE r.IsPublished=1 AND EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.BookingId=r.BookingId AND bi.ServiceId=:serviceId)",
    { serviceId },
  );
  const series = await repo.select(
    "SELECT CONVERT(date,DATEADD(minute,330,b.CreatedAt)) AS date,COUNT(DISTINCT b.BookingId) AS bookings,SUM(CASE WHEN b.BookingStatus='Completed' THEN bi.LineTotal ELSE 0 END) AS revenue FROM dbo.BookingItems bi JOIN dbo.Booking b ON b.BookingId=bi.BookingId WHERE bi.ServiceId=:serviceId AND b.CreatedAt>=DATEADD(day,-89,CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME()))) GROUP BY CONVERT(date,DATEADD(minute,330,b.CreatedAt)) ORDER BY date",
    { serviceId },
  );
  return {
    ...totals,
    ...bookings,
    ...quotes,
    ...reviews,
    conversionRate: Number(totals.views)
      ? Math.round((Number(bookings.bookings) / Number(totals.views)) * 10000) /
        100
      : 0,
    metrics: fillDays(metrics, ["views", "enquiries"]),
    series: fillDays(series, ["bookings", "revenue"]),
  };
}
function fillDays(rows, keys) {
  if (!rows.length) return [];
  const end = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    }),
    start = new Date(`${end}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 89);
  const map = new Map(
    rows.map((row) => [
      row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date).slice(0, 10),
      row,
    ]),
  );
  return Array.from({ length: 90 }, (_, i) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + i);
    const date = day.toISOString().slice(0, 10);
    return {
      ...Object.fromEntries(
        keys.map((key) => [key, Number(map.get(date)?.[key] || 0)]),
      ),
      date,
    };
  });
}
export async function history(serviceId, kind, ctx) {
  await lock(serviceId, ctx, undefined, false);
  const rows =
    kind === "bookings"
      ? await repo.select(
          "SELECT TOP(50) b.BookingId AS id,b.BookingNumber AS name,b.BookingStatus AS status,b.CreatedAt AS createdAt FROM dbo.Booking b WHERE EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.ServiceId=:serviceId AND bi.BookingId=b.BookingId) ORDER BY b.CreatedAt DESC,b.BookingId",
          { serviceId },
        )
      : await repo.select(
          "SELECT TOP(50) r.ReviewId AS id,r.Rating AS rating,r.ReviewText AS comment,r.CreatedAt AS createdAt FROM dbo.Reviews r WHERE r.IsPublished=1 AND EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.ServiceId=:serviceId AND bi.BookingId=r.BookingId) ORDER BY r.CreatedAt DESC,r.ReviewId",
          { serviceId },
        );
  return { rows };
}
