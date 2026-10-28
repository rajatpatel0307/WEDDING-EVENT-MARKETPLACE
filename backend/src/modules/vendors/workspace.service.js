import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sign, verify } from "../../config/jwt.js";
import { uploadAsset } from "../media/cloudinary.service.js";
import { downloadDocument } from "./documents.service.js";
import {
  loadVendorDetails,
  vendorReadCollections,
} from "../admin/vendor-details.service.js";
import {
  scope,
  repo,
  owned,
  targets,
  fail,
  audit,
  assertVersion,
} from "./workspace.common.js";
import { serviceTemplates } from "./service-templates.js";
import {
  serviceInput,
  validateAttributes,
  packageInput,
  itemInput,
  locationInput,
  promotionInput,
} from "./workspace.validation.js";

const listInput = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).default(""),
  status: z.string().max(30).default(""),
});
const extra = {
  requests: {
    from: "dbo.QuotationRequests t JOIN dbo.Events e ON e.EventId=t.EventId JOIN dbo.Services s ON s.ServiceId=t.ServiceId JOIN dbo.Users u ON u.UserId=t.CustomerId",
    where: "t.VendorId=:id",
    fields:
      "t.RequestId AS id,t.EventId AS eventId,e.EventName AS event,CONCAT(u.FirstName,' ',u.LastName) AS customer,s.ServiceName AS service,t.Message AS message,t.Status AS status,t.CreatedAt AS createdAt",
  },
  items: {
    from: "dbo.ServiceItems t JOIN dbo.Services s ON s.ServiceId=t.ServiceId",
    where: "s.VendorId=:id",
    fields:
      "t.ServiceItemId AS id,t.ServiceId AS serviceId,s.ServiceName AS service,t.ItemName AS name,t.Description AS description,t.Quantity AS quantity,t.Unit AS unit,t.UnitPrice AS price,t.IsIncluded AS included,t.CreatedAt AS createdAt",
  },
  coupons: {
    from: "dbo.Coupons t",
    where: "t.VendorId=:id",
    fields:
      "t.CouponId AS id,t.CouponCode AS name,t.Description AS description,t.DiscountType AS discountType,t.DiscountValue AS discountValue,t.UsageLimit AS usageLimit,t.UsedCount AS used,t.StartDate AS startDate,t.EndDate AS endDate,t.IsActive AS active,t.CreatedAt AS createdAt",
  },
  transactions: {
    from: "dbo.Payments t JOIN dbo.Booking b ON b.BookingId=t.BookingId",
    where: "b.VendorId=:id",
    fields:
      "t.PaymentId AS id,t.PaymentReference AS reference,b.BookingNumber AS booking,t.Amount AS amount,t.Currency AS currency,t.PaymentMethod AS method,t.GatewayName AS gateway,t.PaymentStatus AS status,t.PaidAt AS paidAt,t.CreatedAt AS createdAt",
  },
  notifications: {
    from: "dbo.Notifications t",
    where: "t.UserId=:ownerId",
    fields:
      "t.NotificationId AS id,t.Title AS title,t.Message AS message,t.IsRead AS isRead,t.CreatedAt AS createdAt",
  },
};
const allowed = new Set([
  "requests",
  "services",
  "packages",
  "items",
  "locations",
  "documents",
  "availability",
  "bookings",
  "quotations",
  "customers",
  "revenue",
  "payouts",
  "transactions",
  "reviews",
  "offers",
  "coupons",
  "notifications",
]);
export async function records(section, input, ctx) {
  const { id, user } = scope(ctx);
  if (!allowed.has(section)) fail("Vendor section not found.", 404);
  const q = listInput.parse(input),
    c = extra[section] || vendorReadCollections[section];
  const params = {
    id,
    ownerId: user.id,
    size: q.pageSize,
    offset: (q.page - 1) * q.pageSize,
    search: `%${q.q.replace(/[\[\]%_]/g, (x) => `[${x}]`)}%`,
  };
  let condition = c.where;
  const filters = {
    bookings: {
      requests: "t.BookingStatus='Pending'",
      upcoming:
        "t.BookingStatus IN ('Accepted','PaymentPending','Confirmed') AND t.BookingDate>=CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME()))",
      active:
        "t.BookingStatus IN ('Accepted','PaymentPending','Confirmed','InProgress')",
      completed: "t.BookingStatus='Completed'",
      cancelled: "t.BookingStatus IN ('Cancelled','Rejected','Refunded')",
    },
    quotations: {
      sent: "t.Status IN ('Sent','Viewed')",
      accepted: "t.Status='Accepted'",
      rejected: "t.Status IN ('Rejected','Expired','Cancelled')",
      drafts: "t.Status='Draft'",
    },
    availability: {
      blocked: "t.Status='Blocked'",
      available: "t.Status='Available'",
    },
  };
  if (q.status) {
    const filter = filters[section]?.[q.status];
    if (!filter) fail("Unsupported status filter.");
    condition += ` AND (${filter})`;
  }
  const searchable = {
    services: "t.ServiceName",
    packages: "t.PackageName",
    bookings: "t.BookingNumber",
    quotations: "t.QuotationNumber",
    customers: "CONCAT(t.FirstName,' ',t.LastName)",
    offers: "t.OfferName",
    coupons: "t.CouponCode",
    documents: "t.DocumentType",
  }[section];
  if (q.q && searchable) condition += ` AND ${searchable} LIKE :search`;
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total FROM ${c.from} WHERE ${condition}`,
    params,
  );
  let fields = c.fields;
  if (section === "bookings") fields += ",t.EventId AS eventId";
  if (section === "services")
    fields +=
      ",t.UpdatedAt AS updatedAt,(SELECT AVG(CAST(r.Rating AS decimal(6,2))) FROM dbo.Reviews r WHERE r.IsPublished=1 AND r.VendorId=:id AND EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.BookingId=r.BookingId AND bi.ServiceId=t.ServiceId)) AS rating";
  if (
    section === "packages" ||
    section === "locations" ||
    section === "bookings" ||
    section === "quotations"
  )
    fields += ",t.UpdatedAt AS updatedAt";
  const rows = await repo.select(
    `SELECT ${fields} FROM ${c.from} WHERE ${condition} ORDER BY ${section === "bookings" && q.status === "upcoming" ? "t.BookingDate ASC,t.BookingId" : c.order || "t.CreatedAt DESC,[id]"} OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    params,
  );
  return {
    rows,
    total: Number(count.total),
    page: q.page,
    pageSize: q.pageSize,
  };
}
export async function catalog(ctx) {
  const { id } = scope(ctx);
  const categories = (
    await repo.select(
      "SELECT CategoryId AS id,CategoryName AS name FROM dbo.Categories WHERE IsActive=1 ORDER BY SortOrder,CategoryId",
    )
  ).filter((c) => serviceTemplates[c.name]);
  const services = await repo.select(
    "SELECT ServiceId AS id,ServiceName AS name,BasePrice AS price,CategoryId AS categoryId,ApprovalStatus AS status FROM dbo.Services WHERE VendorId=:id ORDER BY ServiceName",
    { id },
  );
  return { categories, services, templates: serviceTemplates };
}
export async function business(ctx) {
  const { id } = scope(ctx);
  return loadVendorDetails(id);
}
export async function imageUpload(input, ctx) {
  const { id } = scope(ctx);
  const body = z
    .object({
      kind: z.enum(["service", "logo", "cover"]),
      base64: z.string().max(7 * 1024 * 1024),
    })
    .strict()
    .parse(input);
  const asset = await uploadAsset(body.base64, true);
  return {
    url: asset.url,
    token: sign(
      {
        purpose: "vendor-image",
        vendorId: id,
        kind: body.kind,
        url: asset.url,
      },
      "24h",
    ),
  };
}
function imageUrl(token, id, kind) {
  try {
    const claims = verify(token);
    if (
      claims.purpose !== "vendor-image" ||
      claims.vendorId !== id ||
      claims.kind !== kind ||
      !claims.url?.startsWith("https://res.cloudinary.com/")
    )
      throw Error();
    return claims.url;
  } catch {
    fail("Image upload expired. Upload the image again.");
  }
}
export async function saveBusiness(input, ctx) {
  const { id } = scope(ctx);
  const body = z
    .object({
      name: z.string().trim().min(2).max(200),
      description: z.string().trim().min(10).max(10000),
      email: z.string().email().max(320),
      phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
      gst: z.string().trim().max(50),
      pan: z.string().trim().max(20),
      logoToken: z.string().max(4000).optional(),
      coverToken: z.string().max(4000).optional(),
      expectedUpdatedAt: z.iso.datetime(),
    })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const [row] = await repo.select(
      "SELECT * FROM dbo.Vendors WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:id",
      { id },
      tx,
    );
    assertVersion(row, body.expectedUpdatedAt);
    const values = {
      BusinessName: body.name,
      BusinessDescription: body.description,
      ContactEmail: body.email,
      ContactPhone: body.phone,
      GSTNumber: body.gst || null,
      PANNumber: body.pan || null,
      UpdatedAt: new Date(),
      ...(body.logoToken
        ? { LogoUrl: imageUrl(body.logoToken, id, "logo") }
        : {}),
      ...(body.coverToken
        ? { CoverImageUrl: imageUrl(body.coverToken, id, "cover") }
        : {}),
    };
    await repo.update({ table: "Vendors", id: "VendorId" }, id, values, tx);
    await audit(
      ctx,
      "BUSINESS_UPDATED",
      "Vendors",
      id,
      { name: row.BusinessName },
      { name: body.name },
      tx,
    );
    return { message: "Business profile updated." };
  });
}
export async function serviceDetails(recordId, ctx) {
  const { id } = scope(ctx),
    row = await owned("services", recordId, id, undefined, false);
  const [media] = await repo.select(
    "SELECT TOP(1) MediaUrl AS url FROM dbo.Media WHERE EntityType='Service' AND EntityId=:service ORDER BY IsPrimary DESC,SortOrder",
    { service: row.ServiceId },
  );
  return {
    id: row.ServiceId,
    name: row.ServiceName,
    description: row.Description,
    categoryId: row.CategoryId,
    price: row.BasePrice,
    pricingType: row.PricingType,
    minimumPrice: row.MinimumPrice,
    maximumPrice: row.MaximumPrice,
    minimumGuests: row.MinimumGuests,
    maximumGuests: row.MaximumGuests,
    duration: row.DurationMinutes,
    attributes: row.AttributesJson ? JSON.parse(row.AttributesJson) : {},
    updatedAt: row.UpdatedAt,
    image: media?.url,
    status: row.ApprovalStatus,
    active: row.IsActive,
  };
}
export async function saveService(recordId, input, ctx) {
  const { id } = scope(ctx),
    body = serviceInput.parse(input);
  return repo.transaction(async (tx) => {
    const old = recordId ? await owned("services", recordId, id, tx) : null;
    if (old) assertVersion(old, body.expectedUpdatedAt);
    const [category] = await repo.select(
      "SELECT CategoryName AS name FROM dbo.Categories WHERE CategoryId=:category AND IsActive=1",
      { category: body.categoryId },
      tx,
    );
    if (!category) fail("Service category is unavailable.");
    const attributes = validateAttributes(category.name, body.attributes);
    await repo.select(
      "INSERT INTO dbo.VendorCategories(VendorId,CategoryId,IsPrimary) SELECT :vendor,:category,0 WHERE NOT EXISTS(SELECT 1 FROM dbo.VendorCategories WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:vendor AND CategoryId=:category)",
      { vendor: id, category: body.categoryId },
      tx,
    );
    const serviceId = old?.ServiceId || randomUUID();
    const values = {
      ServiceName: body.name,
      Description: body.description,
      CategoryId: body.categoryId,
      BasePrice: body.price,
      PricingType: body.pricingType,
      MinimumPrice: body.minimumPrice ?? null,
      MaximumPrice: body.maximumPrice ?? null,
      MinimumGuests: body.minimumGuests ?? null,
      MaximumGuests: body.maximumGuests ?? null,
      DurationMinutes: body.duration ?? null,
      AttributesJson: JSON.stringify(attributes),
      ApprovalStatus: "Pending",
      UpdatedAt: new Date(),
    };
    if (old)
      await repo.update(
        { table: "Services", id: "ServiceId" },
        serviceId,
        values,
        tx,
      );
    else
      await repo.insert(
        { table: "Services", id: "ServiceId" },
        {
          ...values,
          ServiceId: serviceId,
          VendorId: id,
          ServiceSlug: `${body.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 100)}-${serviceId}`,
          IsActive: 1,
        },
        tx,
      );
    if (body.imageToken) {
      const url = imageUrl(body.imageToken, id, "service");
      await repo.select(
        "UPDATE dbo.Media SET IsPrimary=0 WHERE EntityType='Service' AND EntityId=:service",
        { service: serviceId },
        tx,
      );
      await repo.insert(
        { table: "Media", id: "MediaId" },
        {
          EntityType: "Service",
          EntityId: serviceId,
          MediaType: "Image",
          MediaUrl: url,
          IsPrimary: 1,
        },
        tx,
      );
    }
    await audit(
      ctx,
      old ? "SERVICE_UPDATED" : "SERVICE_CREATED",
      "Services",
      serviceId,
      old ? { name: old.ServiceName, status: old.ApprovalStatus } : null,
      { name: body.name, status: "Pending", category: category.name },
      tx,
    );
    return {
      id: serviceId,
      message: "Service saved and submitted for admin approval.",
    };
  });
}
export async function duplicateService(recordId, ctx) {
  const { id } = scope(ctx);
  return repo.transaction(async (tx) => {
    const old = await owned("services", recordId, id, tx),
      next = randomUUID();
    await repo.select(
      "INSERT INTO dbo.Services(ServiceId,VendorId,CategoryId,ServiceName,ServiceSlug,Description,PricingType,BasePrice,MinimumPrice,MaximumPrice,MinimumGuests,MaximumGuests,DurationMinutes,AttributesJson,ApprovalStatus,IsActive) SELECT :next,VendorId,CategoryId,LEFT(ServiceName,190)+' (copy)',:next,Description,PricingType,BasePrice,MinimumPrice,MaximumPrice,MinimumGuests,MaximumGuests,DurationMinutes,AttributesJson,'Pending',0 FROM dbo.Services WHERE ServiceId=:previous AND VendorId=:vendor",
      { next, previous: old.ServiceId, vendor: id },
      tx,
    );
    await repo.select(
      "INSERT INTO dbo.ServiceItems(ServiceId,ItemName,Description,Quantity,Unit,UnitPrice,IsIncluded,SortOrder) SELECT :next,ItemName,Description,Quantity,Unit,UnitPrice,IsIncluded,SortOrder FROM dbo.ServiceItems WHERE ServiceId=:previous",
      { next, previous: old.ServiceId },
      tx,
    );
    await repo.select(
      "INSERT INTO dbo.Media(EntityType,EntityId,MediaType,MediaUrl,IsPrimary) SELECT TOP(1) 'Service',:next,'Image',MediaUrl,1 FROM dbo.Media WHERE EntityType='Service' AND EntityId=:previous ORDER BY IsPrimary DESC,SortOrder",
      { next, previous: old.ServiceId },
      tx,
    );
    await audit(
      ctx,
      "SERVICE_DUPLICATED",
      "Services",
      next,
      null,
      { source: old.ServiceId, status: "Pending", active: false },
      tx,
    );
    return {
      id: next,
      message: "Service duplicated as an inactive copy awaiting approval.",
    };
  });
}
export async function packageDetails(recordId, ctx) {
  const { id } = scope(ctx),
    row = await owned("packages", recordId, id, undefined, false);
  const items = await repo.select(
    "SELECT ItemName AS name,Description AS description,Quantity AS quantity,Unit AS unit FROM dbo.PackageItems WHERE PackageId=:id ORDER BY SortOrder,PackageItemId",
    { id: row.PackageId },
  );
  return {
    id: row.PackageId,
    serviceId: row.ServiceId,
    name: row.PackageName,
    description: row.Description || "",
    price: row.Price,
    discount: row.DiscountPercentage,
    minimumGuests: row.MinimumGuests,
    maximumGuests: row.MaximumGuests,
    duration: row.DurationMinutes,
    featured: !!row.IsFeatured,
    active: !!row.IsActive,
    items,
    updatedAt: row.UpdatedAt,
  };
}
export async function savePackage(recordId, input, ctx) {
  const { id } = scope(ctx),
    body = packageInput.parse(input);
  return repo.transaction(async (tx) => {
    const old = recordId ? await owned("packages", recordId, id, tx) : null;
    if (old) assertVersion(old, body.expectedUpdatedAt);
    await owned("services", body.serviceId, id, tx);
    const packageId = old?.PackageId || randomUUID(),
      values = {
        ServiceId: body.serviceId,
        PackageName: body.name,
        Description: body.description,
        Price: body.price,
        DiscountPercentage: body.discount,
        MinimumGuests: body.minimumGuests ?? null,
        MaximumGuests: body.maximumGuests ?? null,
        DurationMinutes: body.duration ?? null,
        IsFeatured: body.featured ? 1 : 0,
        IsActive: body.active ? 1 : 0,
        UpdatedAt: new Date(),
      };
    if (old)
      await repo.update(
        { table: "ServicePackages", id: "PackageId" },
        packageId,
        values,
        tx,
      );
    else
      await repo.insert(
        { table: "ServicePackages", id: "PackageId" },
        { ...values, PackageId: packageId },
        tx,
      );
    await repo.select(
      "DELETE FROM dbo.PackageItems WHERE PackageId=:id",
      { id: packageId },
      tx,
    );
    for (const [i, item] of body.items.entries())
      await repo.insert(
        { table: "PackageItems", id: "PackageItemId" },
        {
          PackageId: packageId,
          ItemName: item.name,
          Description: item.description,
          Quantity: item.quantity ?? null,
          Unit: item.unit,
          SortOrder: i,
        },
        tx,
      );
    await audit(
      ctx,
      "PACKAGE_SAVED",
      "ServicePackages",
      packageId,
      old ? { price: old.Price } : null,
      {
        name: body.name,
        price: body.price,
        discount: body.discount,
        featured: body.featured,
      },
      tx,
    );
    return { id: packageId, message: "Package saved." };
  });
}
export async function setActive(kind, recordId, input, ctx) {
  const { id } = scope(ctx);
  if (
    !["services", "packages", "locations", "offers", "coupons"].includes(kind)
  )
    fail("Unsupported action.");
  const body = z
    .object({
      active: z.boolean(),
      expectedUpdatedAt: z.iso.datetime().optional(),
    })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const old = await owned(kind, recordId, id, tx);
    assertVersion(old, body.expectedUpdatedAt);
    const r = targets[kind];
    await repo.update(
      { table: r.table, id: r.pk },
      recordId,
      {
        IsActive: body.active ? 1 : 0,
        ...(!r.noDate ? { UpdatedAt: new Date() } : {}),
      },
      tx,
    );
    await audit(
      ctx,
      "ACTIVE_CHANGED",
      r.table,
      recordId,
      { active: !!old.IsActive },
      { active: body.active },
      tx,
    );
    return {
      message: body.active ? "Record activated." : "Record deactivated.",
    };
  });
}
export async function saveSimple(kind, recordId, input, ctx) {
  const { id } = scope(ctx);
  if (!["locations", "offers", "coupons", "items"].includes(kind))
    fail("Unsupported resource.");
  const body = (
    kind === "locations"
      ? locationInput
      : kind === "items"
        ? itemInput
        : promotionInput
  ).parse(input);
  return repo.transaction(async (tx) => {
    const old = recordId ? await owned(kind, recordId, id, tx) : null;
    if (old) assertVersion(old, body.expectedUpdatedAt);
    if (body.serviceId) await owned("services", body.serviceId, id, tx);
    const r = targets[kind];
    let values;
    if (kind === "locations") {
      if (body.primary)
        await repo.select(
          "UPDATE dbo.VendorLocations SET IsPrimary=0,UpdatedAt=SYSUTCDATETIME() WHERE VendorId=:id",
          { id },
          tx,
        );
      values = {
        VendorId: id,
        AddressLine1: body.address,
        AddressLine2: body.line2,
        City: body.city,
        State: body.state,
        Country: body.country,
        PostalCode: body.postalCode,
        IsPrimary: body.primary ? 1 : 0,
        IsActive: body.active ? 1 : 0,
        UpdatedAt: new Date(),
      };
    } else if (kind === "items")
      values = {
        ServiceId: body.serviceId,
        ItemName: body.name,
        Description: body.description,
        Quantity: body.quantity ?? null,
        Unit: body.unit,
        UnitPrice: body.price ?? null,
        IsIncluded: body.included ? 1 : 0,
      };
    else {
      if (kind === "coupons" && !/^[A-Za-z0-9_-]{2,50}$/.test(body.name))
        fail("Coupon codes need 2–50 letters, digits, dashes or underscores.");
      values = {
        VendorId: id,
        [kind === "coupons" ? "CouponCode" : "OfferName"]:
          kind === "coupons" ? body.name.toUpperCase() : body.name,
        Description: body.description,
        DiscountType: body.discountType,
        DiscountValue: body.discountValue,
        [kind === "coupons" ? "MinimumBookingAmount" : "MinimumAmount"]:
          body.minimumAmount ?? null,
        MaximumDiscountAmount: body.maximumDiscount ?? null,
        StartDate: new Date(`${body.startDate}T00:00:00+05:30`),
        EndDate: new Date(`${body.endDate}T23:59:59.999+05:30`),
        IsActive: body.active ? 1 : 0,
        ...(kind === "coupons"
          ? { UsageLimit: body.usageLimit ?? null }
          : { ServiceId: body.serviceId || null }),
      };
    }
    let next = recordId;
    if (old) await repo.update({ table: r.table, id: r.pk }, next, values, tx);
    else {
      const [created] = await repo.insert(
        { table: r.table, id: r.pk },
        values,
        tx,
      );
      next = created.id;
    }
    await audit(
      ctx,
      "RECORD_SAVED",
      r.table,
      next,
      null,
      { name: body.name || body.city },
      tx,
    );
    return { id: next, message: "Changes saved." };
  });
}
export async function simpleDetails(kind, recordId, ctx) {
  const { id } = scope(ctx);
  if (!["locations", "items", "offers", "coupons"].includes(kind))
    fail("Unsupported resource.", 404);
  const r = await owned(kind, recordId, id, undefined, false);
  if (kind === "locations")
    return {
      address: r.AddressLine1,
      line2: r.AddressLine2 || "",
      city: r.City,
      state: r.State,
      country: r.Country,
      postalCode: r.PostalCode || "",
      primary: !!r.IsPrimary,
      active: !!r.IsActive,
      updatedAt: r.UpdatedAt,
    };
  if (kind === "items")
    return {
      serviceId: r.ServiceId,
      name: r.ItemName,
      description: r.Description || "",
      quantity: r.Quantity,
      unit: r.Unit || "",
      price: r.UnitPrice,
      included: !!r.IsIncluded,
    };
  return {
    name: kind === "offers" ? r.OfferName : r.CouponCode,
    description: r.Description || "",
    serviceId: r.ServiceId || null,
    discountType: r.DiscountType,
    discountValue: r.DiscountValue,
    minimumAmount: r.MinimumAmount ?? r.MinimumBookingAmount ?? null,
    maximumDiscount: r.MaximumDiscountAmount,
    startDate: new Date(r.StartDate).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    }),
    endDate: new Date(r.EndDate).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    }),
    active: !!r.IsActive,
    ...(kind === "coupons" ? { usageLimit: r.UsageLimit } : {}),
  };
}
export async function documentUpload(input, ctx) {
  const { id } = scope(ctx);
  const body = z
    .object({
      type: z.enum([
        "Business Registration",
        "GST",
        "PAN",
        "Identity Proof",
        "Address Proof",
        "Other Supporting Document",
      ]),
      number: z.string().trim().max(100).default(""),
      base64: z.string().max(7 * 1024 * 1024),
    })
    .strict()
    .parse(input);
  const asset = await uploadAsset(body.base64);
  return repo.transaction(async (tx) => {
    const [doc] = await repo.insert(
      { table: "VendorDocuments", id: "VendorDocumentId" },
      {
        VendorId: id,
        DocumentType: body.type,
        DocumentNumber: body.number || null,
        DocumentUrl: asset.key,
        VerificationStatus: "Pending",
      },
      tx,
    );
    await audit(
      ctx,
      "DOCUMENT_UPLOADED",
      "VendorDocuments",
      doc.id,
      null,
      { type: body.type },
      tx,
    );
    return { message: "Document submitted for verification." };
  });
}
export async function documentFile(recordId, ctx) {
  const { id } = scope(ctx),
    doc = await owned("documents", recordId, id, undefined, false);
  const file = await downloadDocument({ key: doc.DocumentUrl });
  await audit(
    ctx,
    "DOCUMENT_VIEWED",
    "VendorDocuments",
    doc.VendorDocumentId,
    null,
    null,
  );
  return file;
}
export async function readNotification(recordId, ctx) {
  const { user } = scope(ctx);
  z.guid().parse(recordId);
  const [row] = await repo.select(
    "SELECT NotificationId FROM dbo.Notifications WHERE NotificationId=:id AND UserId=:user",
    { id: recordId, user: user.id },
  );
  if (!row) fail("Notification not found.", 404);
  await repo.select(
    "UPDATE dbo.Notifications SET IsRead=1,ReadAt=SYSUTCDATETIME() WHERE NotificationId=:id AND UserId=:user",
    { id: recordId, user: user.id },
  );
  return { message: "Notification marked as read." };
}
