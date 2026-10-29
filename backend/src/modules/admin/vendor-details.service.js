import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import { downloadDocument } from "../vendors/documents.service.js";
import * as repo from "./admin.repository.js";

const error = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
export const vendorPageQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const vendorAccountInput = z
  .object({
    active: z.boolean(),
    expectedActive: z.boolean(),
    note: z.string().trim().min(3).max(2000),
  })
  .strict();
export const documentReviewInput = z
  .object({
    status: z.enum(["Approved", "Rejected"]),
    expectedStatus: z.enum(["Pending", "Approved", "Rejected"]),
    reason: z.string().trim().max(1000).default(""),
    note: z.string().trim().max(2000).default(""),
  })
  .strict()
  .refine((v) => v.status !== "Rejected" || v.reason.length > 0, {
    message: "A document rejection reason is required.",
  });

async function findVendor(id, tx, lock = false) {
  z.guid().parse(id);
  const [vendor] = await repo.select(
    `SELECT v.VendorId AS id,v.UserId AS ownerId,v.BusinessName AS businessName,v.BusinessDescription AS description,v.ContactEmail AS businessEmail,v.ContactPhone AS businessPhone,COALESCE(v.ContactEmail,u.Email) AS email,COALESCE(v.ContactPhone,u.PhoneNumber) AS phone,v.LogoUrl AS logoUrl,v.CoverImageUrl AS coverUrl,v.GSTNumber AS gst,v.PANNumber AS pan,v.VerifiedAt AS verifiedAt,v.VerificationCycle AS cycle,v.VerificationStatus AS status,v.VerificationRemarks AS remarks,v.IsActive AS active,v.CreatedAt AS createdAt,v.UpdatedAt AS updatedAt,CONCAT(u.FirstName,' ',u.LastName) AS owner,u.Email AS ownerEmail,u.PhoneNumber AS ownerPhone,u.IsActive AS ownerActive,u.IsBlocked AS ownerBlocked,u.IsEmailVerified AS emailVerified FROM dbo.Vendors v ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""} JOIN dbo.Users u ON u.UserId=v.UserId WHERE v.VendorId=:id`,
    { id },
    tx,
  );
  if (!vendor) error("Vendor not found.", 404);
  return vendor;
}

export async function vendorDetails(id, ctx) {
  requireRole(ctx, "ADMIN");
  return loadVendorDetails(id);
}
export async function addNote(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  const body = z
    .object({ note: z.string().trim().min(3).max(2000) })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    await findVendor(id, tx, true);
    await repo.auditAdmin(
      ctx,
      "ADMIN_VENDOR_NOTE_ADDED",
      "Vendors",
      id,
      null,
      body,
      tx,
    );
    return { message: "Internal vendor note recorded." };
  });
}
export async function loadVendorDetails(id) {
  const vendor = await findVendor(id);
  const categories = await repo.select(
    "SELECT c.CategoryId AS id,c.CategoryName AS name,vc.IsPrimary AS isPrimary FROM dbo.VendorCategories vc JOIN dbo.Categories c ON c.CategoryId=vc.CategoryId WHERE vc.VendorId=:id ORDER BY vc.IsPrimary DESC,c.CategoryName",
    { id },
  );
  const locations = await repo.select(
    "SELECT VendorLocationId AS id,AddressLine1 AS address,AddressLine2 AS line2,Landmark AS landmark,City AS city,State AS state,Country AS country,PostalCode AS postalCode,IsPrimary AS isPrimary,IsActive AS active,CreatedAt AS createdAt FROM dbo.VendorLocations WHERE VendorId=:id ORDER BY IsPrimary DESC,CreatedAt DESC",
    { id },
  );
  const [summary] = await repo.select(
    `SELECT
    (SELECT COUNT(*) FROM dbo.Services WHERE VendorId=:id) AS services,
    (SELECT COUNT(*) FROM dbo.Services WHERE VendorId=:id AND IsActive=1) AS activeServices,
    (SELECT COUNT(*) FROM dbo.ServicePackages p JOIN dbo.Services s ON s.ServiceId=p.ServiceId WHERE s.VendorId=:id) AS packages,
    (SELECT COUNT(*) FROM dbo.Booking WHERE VendorId=:id) AS bookings,
    (SELECT COUNT(*) FROM dbo.Booking WHERE VendorId=:id AND BookingStatus='Completed') AS completed,
    (SELECT COUNT(*) FROM dbo.Booking WHERE VendorId=:id AND BookingStatus='Cancelled') AS cancelled,
    (SELECT COUNT(*) FROM dbo.Reviews WHERE VendorId=:id) AS reviews,
    (SELECT AVG(CAST(Rating AS decimal(6,2))) FROM dbo.Reviews WHERE VendorId=:id AND IsPublished=1) AS rating,
    (SELECT COUNT(*) FROM dbo.VendorDocuments WHERE VendorId=:id AND VerificationStatus='Pending') AS pendingDocuments,
    (SELECT COUNT(*) FROM dbo.VendorDocuments WHERE VendorId=:id AND VerificationStatus='Rejected') AS rejectedDocuments,
    (SELECT COUNT(*) FROM dbo.VendorDocuments WHERE VendorId=:id) AS documents,
    (SELECT COUNT(*) FROM dbo.VendorDocuments WHERE VendorId=:id AND VerificationStatus='Approved') AS approvedDocuments,
    (SELECT COUNT(*) FROM dbo.Quotations WHERE VendorId=:id) AS quotations`,
    { id },
  );
  const [revenue] = await repo.select(
    `SELECT COALESCE(SUM(GrossAmount),0) AS gross,COALESCE(SUM(PlatformCommission),0) AS commission,COALESCE(SUM(TaxDeduction),0) AS tax,COALESCE(SUM(NetAmount),0) AS net,COALESCE(SUM(CASE WHEN PayoutStatus='Paid' THEN NetAmount ELSE 0 END),0) AS paid,COALESCE(SUM(CASE WHEN PayoutStatus IN ('Pending','Processing') THEN NetAmount ELSE 0 END),0) AS pending FROM dbo.VendorPayouts WHERE VendorId=:id`,
    { id },
  );
  const [collections] = await repo.select(
    "SELECT COALESCE(SUM(p.Amount),0) AS collected FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId WHERE b.VendorId=:id AND p.PaymentStatus='Success' AND p.Currency='INR'",
    { id },
  );
  return {
    vendor,
    categories,
    locations,
    summary,
    revenue: { ...revenue, ...collections },
  };
}

const collections = {
  payments: {
    from: "dbo.Payments t JOIN dbo.Booking b ON b.BookingId=t.BookingId",
    where: "b.VendorId=:id",
    fields:
      "t.PaymentId AS id,t.PaymentReference AS reference,b.BookingNumber AS booking,t.Amount AS amount,t.Currency AS currency,t.PaymentMethod AS method,t.GatewayName AS gateway,t.PaymentStatus AS status,t.PaidAt AS paidAt,t.CreatedAt AS createdAt",
  },
  coupons: {
    from: "dbo.Coupons t",
    where: "t.VendorId=:id",
    fields:
      "t.CouponId AS id,t.CouponCode AS name,t.Description AS description,t.DiscountType AS discountType,t.DiscountValue AS discountValue,t.UsageLimit AS usageLimit,t.UsedCount AS used,t.StartDate AS startDate,t.EndDate AS endDate,t.IsActive AS active,t.CreatedAt AS createdAt",
  },
  history: {
    order: "t.CreatedAt DESC,t.HistoryId DESC",
    from: "dbo.VendorVerificationHistory t JOIN dbo.Users u ON u.UserId=t.AdminId",
    where: "t.VendorId=:id",
    fields:
      "t.HistoryId AS id,t.CycleNumber AS cycle,t.FromStatus AS fromStatus,t.ToStatus AS status,t.Reason AS reason,t.Notes AS notes,CONCAT(u.FirstName,' ',u.LastName) AS actor,t.CreatedAt AS createdAt",
  },
  documents: {
    from: "dbo.VendorDocuments t LEFT JOIN dbo.Users u ON u.UserId=t.VerifiedBy",
    where: "t.VendorId=:id",
    fields:
      "t.VendorDocumentId AS id,t.DocumentType AS type,t.DocumentNumber AS number,t.VerificationStatus AS status,t.RejectionReason AS reason,t.VerifiedAt AS verifiedAt,CONCAT(u.FirstName,' ',u.LastName) AS verifiedBy,t.CreatedAt AS createdAt",
  },
  services: {
    from: "dbo.Services t JOIN dbo.Categories c ON c.CategoryId=t.CategoryId",
    where: "t.VendorId=:id",
    fields:
      "t.ServiceId AS id,t.ServiceName AS name,c.CategoryName AS category,t.PricingType AS pricingType,t.BasePrice AS price,t.MinimumPrice AS minimumPrice,t.MaximumPrice AS maximumPrice,t.ApprovalStatus AS status,t.IsActive AS active,(SELECT TOP(1) m.MediaUrl FROM dbo.Media m WHERE m.EntityType='Service' AND m.EntityId=t.ServiceId AND m.MediaType='Image' ORDER BY m.IsPrimary DESC,m.SortOrder,m.CreatedAt) AS image,t.CreatedAt AS createdAt",
  },
  packages: {
    from: "dbo.ServicePackages t JOIN dbo.Services s ON s.ServiceId=t.ServiceId",
    where: "s.VendorId=:id",
    fields:
      "t.PackageId AS id,t.PackageName AS name,s.ServiceName AS service,t.Price AS price,t.DiscountPercentage AS discount,t.FinalPrice AS finalPrice,t.MinimumGuests AS minimumGuests,t.MaximumGuests AS maximumGuests,t.IsActive AS active,t.CreatedAt AS createdAt",
  },
  locations: {
    from: "dbo.VendorLocations t",
    where: "t.VendorId=:id",
    fields:
      "t.VendorLocationId AS id,t.AddressLine1 AS address,t.AddressLine2 AS line2,t.Landmark AS landmark,t.City AS city,t.State AS state,t.Country AS country,t.PostalCode AS postalCode,t.IsPrimary AS isPrimary,t.IsActive AS active,t.CreatedAt AS createdAt",
  },
  availability: {
    from: "dbo.VendorAvailability t LEFT JOIN dbo.Services s ON s.ServiceId=t.ServiceId",
    where: "t.VendorId=:id",
    fields:
      "t.AvailabilityId AS id,COALESCE(s.ServiceName,'All services') AS service,t.AvailableDate AS availableDate,CONVERT(varchar(5),t.StartTime,108) AS startTime,CONVERT(varchar(5),t.EndTime,108) AS endTime,t.Status AS status,t.Notes AS notes,t.CreatedAt AS createdAt",
    order: "t.AvailableDate DESC,t.AvailabilityId DESC",
  },
  bookings: {
    from: "dbo.Booking t JOIN dbo.Users u ON u.UserId=t.CustomerId JOIN dbo.Events e ON e.EventId=t.EventId",
    where: "t.VendorId=:id",
    fields:
      "t.BookingId AS id,t.BookingNumber AS number,CONCAT(u.FirstName,' ',u.LastName) AS customer,t.CustomerId AS customerId,e.EventName AS event,t.BookingDate AS eventDate,(SELECT STRING_AGG(CONVERT(nvarchar(max),bi.ItemName),', ') FROM dbo.BookingItems bi WHERE bi.BookingId=t.BookingId) AS services,t.TotalAmount AS amount,t.PaidAmount AS paid,t.RemainingAmount AS remaining,t.PaymentStatus AS paymentStatus,t.BookingStatus AS status,t.CustomerNotes AS customerNotes,t.VendorNotes AS vendorNotes,t.CreatedAt AS createdAt",
  },
  quotations: {
    from: "dbo.Quotations t JOIN dbo.Users u ON u.UserId=t.CustomerId JOIN dbo.Events e ON e.EventId=t.EventId",
    where: "t.VendorId=:id",
    fields:
      "t.QuotationId AS id,t.QuotationNumber AS number,CONCAT(u.FirstName,' ',u.LastName) AS customer,t.CustomerId AS customerId,e.EventName AS event,t.TotalAmount AS amount,t.Status AS status,t.ValidUntil AS validUntil,t.CustomerMessage AS customerMessage,t.VendorMessage AS vendorMessage,t.CreatedAt AS createdAt",
  },
  customers: {
    from: "dbo.Users t JOIN (SELECT CustomerId,MAX(CreatedAt) AS lastInteractionAt FROM (SELECT CustomerId,CreatedAt FROM dbo.Booking WHERE VendorId=:id UNION ALL SELECT CustomerId,CreatedAt FROM dbo.Quotations WHERE VendorId=:id UNION ALL SELECT CustomerId,CreatedAt FROM dbo.Conversations WHERE VendorId=:id) interactions GROUP BY CustomerId) c ON c.CustomerId=t.UserId LEFT JOIN (SELECT CustomerId,COUNT(*) AS bookings,SUM(TotalAmount) AS amount,MAX(CreatedAt) AS lastBookingAt FROM dbo.Booking WHERE VendorId=:id GROUP BY CustomerId) b ON b.CustomerId=t.UserId",
    where: "1=1",
    fields:
      "t.UserId AS id,CONCAT(t.FirstName,' ',t.LastName) AS name,t.Email AS email,t.PhoneNumber AS phone,COALESCE(b.bookings,0) AS bookings,COALESCE(b.amount,0) AS amount,b.lastBookingAt,c.lastInteractionAt,CASE WHEN t.IsBlocked=1 THEN 'Blocked' WHEN t.IsActive=0 THEN 'Inactive' ELSE 'Active' END AS status,t.CreatedAt AS createdAt",
    order: "c.lastInteractionAt DESC,t.UserId",
  },
  revenue: {
    from: "dbo.VendorPayouts t JOIN dbo.Booking b ON b.BookingId=t.BookingId",
    where: "t.VendorId=:id",
    fields:
      "t.PayoutId AS id,b.BookingNumber AS booking,t.GrossAmount AS gross,t.PlatformCommission AS commission,t.TaxDeduction AS tax,t.NetAmount AS net,t.PayoutStatus AS status,t.CreatedAt AS createdAt",
  },
  payouts: {
    from: "dbo.VendorPayouts t JOIN dbo.Booking b ON b.BookingId=t.BookingId",
    where: "t.VendorId=:id",
    fields:
      "t.PayoutId AS id,b.BookingNumber AS booking,t.GrossAmount AS gross,t.PlatformCommission AS commission,t.TaxDeduction AS tax,t.NetAmount AS net,t.PayoutStatus AS status,t.PaidAt AS paidAt,t.CreatedAt AS createdAt",
  },
  reviews: {
    from: "dbo.Reviews t JOIN dbo.Users u ON u.UserId=t.CustomerId",
    where: "t.VendorId=:id",
    fields:
      "t.ReviewId AS id,CONCAT(u.FirstName,' ',u.LastName) AS customer,t.CustomerId AS customerId,t.Rating AS rating,t.ReviewTitle AS title,t.ReviewText AS review,CASE WHEN t.IsPublished=1 THEN 'Published' ELSE 'Hidden' END AS status,t.CreatedAt AS createdAt",
  },
  offers: {
    from: "dbo.Offers t LEFT JOIN dbo.Services s ON s.ServiceId=t.ServiceId",
    where: "(t.VendorId=:id OR s.VendorId=:id)",
    fields:
      "t.OfferId AS id,t.OfferName AS name,t.Description AS description,COALESCE(s.ServiceName,'Vendor-wide offer') AS service,t.DiscountType AS discountType,t.DiscountValue AS discountValue,t.StartDate AS startDate,t.EndDate AS endDate,t.IsActive AS active,t.CreatedAt AS createdAt",
  },
  messages: {
    from: "dbo.Messages t JOIN dbo.Conversations c ON c.ConversationId=t.ConversationId JOIN dbo.Users u ON u.UserId=t.SenderUserId JOIN dbo.Users cu ON cu.UserId=c.CustomerId",
    where: "c.VendorId=:id",
    fields:
      "t.MessageId AS id,CONCAT(u.FirstName,' ',u.LastName) AS sender,CONCAT(cu.FirstName,' ',cu.LastName) AS customer,c.CustomerId AS customerId,t.MessageType AS type,t.MessageText AS message,CASE WHEN t.IsRead=1 THEN 'Read' ELSE 'Unread' END AS status,t.CreatedAt AS createdAt",
  },
  audit: {
    from: "dbo.AuditLogs t LEFT JOIN dbo.Users u ON u.UserId=t.UserId",
    where: `(t.UserId=:ownerId OR t.EntityId=CONVERT(varchar(100),:id)
    OR (t.EntityType IN ('Users','User') AND t.EntityId=CONVERT(varchar(100),:ownerId))
    OR (t.EntityType='VendorAvailability' AND EXISTS(SELECT 1 FROM dbo.VendorAvailability a WHERE a.VendorId=:id AND CONVERT(varchar(100),a.AvailabilityId)=t.EntityId))
    OR (t.EntityType='VendorCategories' AND EXISTS(SELECT 1 FROM dbo.VendorCategories c WHERE c.VendorId=:id AND CONVERT(varchar(100),c.VendorCategoryId)=t.EntityId))
    OR (t.EntityType='Payments' AND EXISTS(SELECT 1 FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId WHERE b.VendorId=:id AND CONVERT(varchar(100),p.PaymentId)=t.EntityId))
    OR (t.EntityType='PlatformCommission' AND EXISTS(SELECT 1 FROM dbo.PlatformCommission c WHERE c.VendorId=:id AND CONVERT(varchar(100),c.CommissionId)=t.EntityId))
    OR (t.EntityType='Conversations' AND EXISTS(SELECT 1 FROM dbo.Conversations c WHERE c.VendorId=:id AND CONVERT(varchar(100),c.ConversationId)=t.EntityId))
    OR (t.EntityType='Messages' AND EXISTS(SELECT 1 FROM dbo.Messages m JOIN dbo.Conversations c ON c.ConversationId=m.ConversationId WHERE c.VendorId=:id AND CONVERT(varchar(100),m.MessageId)=t.EntityId))
    OR (t.EntityType='VendorDocuments' AND EXISTS(SELECT 1 FROM dbo.VendorDocuments d WHERE d.VendorId=:id AND CONVERT(varchar(100),d.VendorDocumentId)=t.EntityId))
    OR (t.EntityType='Services' AND EXISTS(SELECT 1 FROM dbo.Services s WHERE s.VendorId=:id AND CONVERT(varchar(100),s.ServiceId)=t.EntityId))
    OR (t.EntityType='ServicePackages' AND EXISTS(SELECT 1 FROM dbo.ServicePackages p JOIN dbo.Services s ON s.ServiceId=p.ServiceId WHERE s.VendorId=:id AND CONVERT(varchar(100),p.PackageId)=t.EntityId))
    OR (t.EntityType='Booking' AND EXISTS(SELECT 1 FROM dbo.Booking b WHERE b.VendorId=:id AND CONVERT(varchar(100),b.BookingId)=t.EntityId))
    OR (t.EntityType='Quotations' AND EXISTS(SELECT 1 FROM dbo.Quotations q WHERE q.VendorId=:id AND CONVERT(varchar(100),q.QuotationId)=t.EntityId))
    OR (t.EntityType='VendorLocations' AND EXISTS(SELECT 1 FROM dbo.VendorLocations l WHERE l.VendorId=:id AND CONVERT(varchar(100),l.VendorLocationId)=t.EntityId))
    OR (t.EntityType='VendorPayouts' AND EXISTS(SELECT 1 FROM dbo.VendorPayouts p WHERE p.VendorId=:id AND CONVERT(varchar(100),p.PayoutId)=t.EntityId))
    OR (t.EntityType='Reviews' AND EXISTS(SELECT 1 FROM dbo.Reviews r WHERE r.VendorId=:id AND CONVERT(varchar(100),r.ReviewId)=t.EntityId))
    OR (t.EntityType='Offers' AND EXISTS(SELECT 1 FROM dbo.Offers o LEFT JOIN dbo.Services s ON s.ServiceId=o.ServiceId WHERE (o.VendorId=:id OR s.VendorId=:id) AND CONVERT(varchar(100),o.OfferId)=t.EntityId)))`,
    fields:
      "t.AuditLogId AS id,COALESCE(NULLIF(TRIM(CONCAT(u.FirstName,' ',u.LastName)),''),'System') AS actor,t.ActionType AS action,t.EntityType AS entity,t.EntityId AS entityId,t.OldValue AS oldValue,t.NewValue AS newValue,t.IPAddress AS ip,t.CreatedAt AS createdAt",
  },
};

export function redactAudit(value) {
  if (value == null) return null;
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return String(value).slice(0, 4000);
  }
  function clean(v, depth = 0) {
    if (depth > 8) return "[truncated]";
    if (Array.isArray(v))
      return v.slice(0, 100).map((item) => clean(item, depth + 1));
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .slice(0, 100)
          .map(([key, item]) => [
            key,
            /password|token|secret|cookie|authorization|documenturl|storagekey|gatewayresponse|bankaccount|accountnumber|routingnumber|apikey|signature|publicid|^key$/i.test(
              key.replace(/[^a-z0-9]/gi, ""),
            )
              ? "[redacted]"
              : clean(item, depth + 1),
          ]),
      );
    return typeof v === "string" && v.length > 4000
      ? v.slice(0, 4000) + " [truncated]"
      : v;
  }
  return clean(parsed);
}
export async function vendorRecords(id, section, input, ctx) {
  requireRole(ctx, "ADMIN");
  return loadVendorRecords(id, section, input);
}
export async function loadVendorRecords(id, section, input) {
  if (!Object.hasOwn(collections, section))
    error("Vendor section not found.", 404);
  const query = vendorPageQuery.parse(input);
  const vendor = await findVendor(id);
  const c = collections[section];
  const params = {
    id,
    ownerId: vendor.ownerId,
    offset: (query.page - 1) * query.pageSize,
    size: query.pageSize,
  };
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total FROM ${c.from} WHERE ${c.where}`,
    params,
  );
  let rows = await repo.select(
    `SELECT ${c.fields} FROM ${c.from} WHERE ${c.where} ORDER BY ${c.order || "t.CreatedAt DESC,[id]"} OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    params,
  );
  if (section === "audit")
    rows = rows.map((row) => ({
      ...row,
      oldValue: redactAudit(row.oldValue),
      newValue: redactAudit(row.newValue),
    }));
  return { rows, total: Number(count.total), ...query };
}
export async function setVendorActive(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  const body = vendorAccountInput.parse(input);
  return repo.transaction(async (tx) => {
    const vendor = await findVendor(id, tx, true);
    if (body.active && vendor.status !== "Approved")
      error("Approve the vendor before activating their account.", 409);
    if (!!vendor.active !== body.expectedActive)
      error("Vendor account changed. Refresh before continuing.", 409);
    if (!!vendor.active === body.active)
      error("The vendor already has this account status.", 409);
    await repo.update(
      { table: "Vendors", id: "VendorId" },
      id,
      { IsActive: body.active ? 1 : 0, UpdatedAt: new Date() },
      tx,
    );
    if (!body.active)
      await repo.select(
        "UPDATE dbo.AuthSessions SET revokedAt=SYSUTCDATETIME() WHERE userId=:ownerId AND revokedAt IS NULL",
        { ownerId: vendor.ownerId },
        tx,
      );
    await repo.auditAdmin(
      ctx,
      "ADMIN_VENDOR_ACCOUNT_CHANGED",
      "Vendors",
      id,
      { active: !!vendor.active },
      { active: body.active, note: body.note },
      tx,
    );
    await repo.select(
      "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) VALUES(:ownerId,'VendorAccount',:title,:message,'Vendor',:id)",
      {
        id,
        ownerId: vendor.ownerId,
        title: body.active
          ? "Vendor account activated"
          : "Vendor account deactivated",
        message: body.active
          ? "Your vendor account has been activated. Verification requirements still apply."
          : "Your vendor account has been deactivated. Contact support for assistance.",
      },
      tx,
    );
    return {
      message: `Vendor ${body.active ? "activated" : "deactivated"}. The owner has been notified.`,
    };
  });
}
async function findDocument(id, documentId, tx, lock = false) {
  z.guid().parse(id);
  z.guid().parse(documentId);
  const [doc] = await repo.select(
    `SELECT VendorDocumentId AS id,DocumentUrl AS [key],DocumentType AS type,VerificationStatus AS status,RejectionReason AS reason FROM dbo.VendorDocuments ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE VendorId=:id AND VendorDocumentId=:documentId`,
    { id, documentId },
    tx,
  );
  if (!doc) error("Vendor document not found.", 404);
  return doc;
}
export async function reviewVendorDocument(id, documentId, input, ctx) {
  const admin = requireRole(ctx, "ADMIN");
  const body = documentReviewInput.parse(input);
  return repo.transaction(async (tx) => {
    const doc = await findDocument(id, documentId, tx, true);
    if (doc.status !== body.expectedStatus || doc.status === body.status)
      error("Document status changed. Refresh before continuing.", 409);
    await repo.update(
      { table: "VendorDocuments", id: "VendorDocumentId" },
      documentId,
      {
        VerificationStatus: body.status,
        VerifiedBy: admin.id,
        VerifiedAt: new Date(),
        RejectionReason: body.status === "Rejected" ? body.reason : null,
        UpdatedAt: new Date(),
      },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      `ADMIN_DOCUMENT_${body.status.toUpperCase()}`,
      "VendorDocuments",
      documentId,
      { status: doc.status, reason: doc.reason },
      { status: body.status, reason: body.reason, note: body.note },
      tx,
    );
    return { message: `Document ${body.status.toLowerCase()}.` };
  });
}
export async function vendorDocumentFile(id, documentId, ctx) {
  requireRole(ctx, "ADMIN");
  const doc = await findDocument(id, documentId);
  const file = await downloadDocument(doc);
  await repo.auditAdmin(
    ctx,
    "ADMIN_DOCUMENT_VIEWED",
    "VendorDocuments",
    documentId,
    null,
    null,
  );
  return file;
}

export { collections as vendorReadCollections };
