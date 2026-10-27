import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import { email, phone } from "../auth/auth.validation.js";
import * as repo from "./admin.repository.js";

const notFound = () => {
  throw Object.assign(new Error("Customer not found."), { status: 404 });
};
const conflict = () => {
  throw Object.assign(
    new Error("This customer changed. Refresh the page before saving."),
    { status: 409 },
  );
};
export const customerEdit = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100),
    email,
    phone: z.union([phone, z.literal("")]),
    dateOfBirth: z.iso.date().nullable(),
    expectedUpdatedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (v) =>
      !v.dateOfBirth || v.dateOfBirth <= new Date().toISOString().slice(0, 10),
    { message: "Date of birth cannot be in the future." },
  );
export const customerAction = z
  .object({
    action: z.enum(["Activate", "Deactivate", "Block", "Unblock"]),
    expectedActive: z.boolean(),
    expectedBlocked: z.boolean(),
    note: z.string().trim().min(3).max(2000),
  })
  .strict();
export const customerNotification = z
  .object({
    title: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(2000),
  })
  .strict();
const customerWhere = `EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=u.UserId AND r.RoleCode='CUSTOMER')`;
export async function findCustomer(id, tx, lock = false) {
  z.uuid().parse(id);
  const [customer] = await repo.select(
    `SELECT u.UserId AS id,u.FirstName AS firstName,u.LastName AS lastName,u.Email AS email,u.PhoneNumber AS phone,COALESCE(u.ProfilePhotoUrl,u.ProfileImageUrl) AS profilePhotoUrl,u.DateOfBirth AS dateOfBirth,u.IsActive AS active,u.IsBlocked AS blocked,u.IsEmailVerified AS emailVerified,u.IsPhoneVerified AS phoneVerified,u.CreatedAt AS createdAt,u.UpdatedAt AS updatedAt,COALESCE((SELECT MAX(a.CreatedAt) FROM dbo.AuditLogs a WHERE a.UserId=u.UserId AND a.ActionType='LOGIN'),u.LastLoginAt) AS lastLoginAt FROM dbo.Users u ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE u.UserId=:id AND ${customerWhere}`,
    { id },
    tx,
  );
  if (!customer) notFound();
  return customer;
}
export async function customerDetails(id, ctx) {
  requireRole(ctx, "ADMIN");
  const customer = await findCustomer(id);
  const [summary] = await repo.select(
    `SELECT
    (SELECT COUNT(*) FROM dbo.Events WHERE CustomerId=:id) AS events,
    (SELECT COUNT(*) FROM dbo.Booking WHERE CustomerId=:id) AS bookings,
    (SELECT COUNT(*) FROM dbo.Booking WHERE CustomerId=:id AND BookingStatus='Completed') AS completed,
    (SELECT COUNT(*) FROM dbo.Booking WHERE CustomerId=:id AND BookingStatus='Cancelled') AS cancelled,
    (SELECT COALESCE(SUM(p.Amount),0) FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId WHERE b.CustomerId=:id AND p.PaymentStatus='Success' AND p.Currency='INR') AS spending,
    (SELECT COALESCE(SUM(CASE WHEN RemainingAmount>0 THEN RemainingAmount ELSE 0 END),0) FROM dbo.Booking WHERE CustomerId=:id AND BookingStatus NOT IN ('Cancelled','Rejected','Refunded')) AS pending,
    (SELECT COUNT(*) FROM dbo.Wishlists WHERE CustomerId=:id) AS wishlist,
    (SELECT COUNT(*) FROM dbo.Reviews WHERE CustomerId=:id) AS reviews,
    (SELECT COUNT(*) FROM dbo.Quotations WHERE CustomerId=:id) AS quotations`,
    { id },
  );
  const timeline = await repo.select(
    `SELECT TOP(30) * FROM (
    SELECT CONVERT(varchar(100),UserId) AS id,'account' AS type,'Account created' AS title,'Joined MarryNest' AS detail,CreatedAt AS createdAt FROM dbo.Users WHERE UserId=:id
    UNION ALL SELECT CONVERT(varchar(100),EventId),'event','Event created',EventName,CreatedAt FROM dbo.Events WHERE CustomerId=:id
    UNION ALL SELECT CONVERT(varchar(100),QuotationId),'quotation','Quotation requested',QuotationNumber,CreatedAt FROM dbo.Quotations WHERE CustomerId=:id
    UNION ALL SELECT CONVERT(varchar(100),BookingId),'booking','Booking created',BookingNumber,CreatedAt FROM dbo.Booking WHERE CustomerId=:id
    UNION ALL SELECT CONVERT(varchar(100),p.PaymentId),'payment','Payment completed',CONCAT(p.PaymentReference,' · ',p.Currency,' ',p.Amount),COALESCE(p.PaidAt,p.CreatedAt) FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId WHERE b.CustomerId=:id AND p.PaymentStatus='Success'
    UNION ALL SELECT CONVERT(varchar(100),ReviewId),'review','Review submitted',CONCAT(Rating,' / 5 · ',ReviewTitle),CreatedAt FROM dbo.Reviews WHERE CustomerId=:id
  ) activity ORDER BY createdAt DESC,id`,
    { id },
  );
  return { customer, summary, timeline };
}

// Fixed projections and ownership predicates; no request-controlled SQL identifiers.
const collections = {
  events: {
    from: "dbo.Events t",
    where: "t.CustomerId=:id",
    fields:
      "t.EventId AS id,t.EventName AS name,t.EventType AS type,t.EventDate AS eventDate,CONCAT_WS(', ',t.City,t.State) AS location,t.GuestCount AS guests,t.Budget AS budget,t.Status AS status,t.CreatedAt AS createdAt",
  },
  bookings: {
    from: "dbo.Booking t JOIN dbo.Vendors v ON v.VendorId=t.VendorId JOIN dbo.Events e ON e.EventId=t.EventId",
    where: "t.CustomerId=:id",
    fields:
      "t.BookingId AS id,t.BookingNumber AS number,v.BusinessName AS vendor,(SELECT STRING_AGG(CONVERT(nvarchar(max),bi.ItemName),', ') FROM dbo.BookingItems bi WHERE bi.BookingId=t.BookingId) AS services,e.EventName AS event,t.TotalAmount AS amount,t.PaymentStatus AS paymentStatus,t.BookingStatus AS status,t.CreatedAt AS createdAt",
  },
  quotations: {
    from: "dbo.Quotations t JOIN dbo.Vendors v ON v.VendorId=t.VendorId",
    where: "t.CustomerId=:id",
    fields:
      "t.QuotationId AS id,t.QuotationNumber AS number,v.BusinessName AS vendor,t.TotalAmount AS amount,t.Status AS status,t.ValidUntil AS validUntil,t.CreatedAt AS createdAt",
  },
  payments: {
    from: "dbo.Payments t JOIN dbo.Booking b ON b.BookingId=t.BookingId",
    where: "b.CustomerId=:id",
    fields:
      "t.PaymentId AS id,t.PaymentReference AS reference,b.BookingNumber AS booking,t.Amount AS amount,t.Currency AS currency,t.PaymentMethod AS method,t.GatewayName AS gateway,t.PaymentStatus AS status,t.PaidAt AS paidAt,t.CreatedAt AS createdAt",
  },
  reviews: {
    from: "dbo.Reviews t JOIN dbo.Vendors v ON v.VendorId=t.VendorId",
    where: "t.CustomerId=:id",
    fields:
      "t.ReviewId AS id,v.BusinessName AS vendor,t.Rating AS rating,t.ReviewTitle AS title,t.ReviewText AS review,CASE WHEN t.IsPublished=1 THEN 'Published' ELSE 'Hidden' END AS status,t.CreatedAt AS createdAt",
  },
  wishlist: {
    from: "dbo.Wishlists t LEFT JOIN dbo.Vendors v ON v.VendorId=t.VendorId LEFT JOIN dbo.Services s ON s.ServiceId=t.ServiceId LEFT JOIN dbo.ServicePackages p ON p.PackageId=t.PackageId LEFT JOIN dbo.Services ps ON ps.ServiceId=p.ServiceId LEFT JOIN dbo.Vendors sv ON sv.VendorId=COALESCE(s.VendorId,ps.VendorId)",
    where: "t.CustomerId=:id",
    fields:
      "t.WishlistId AS id,COALESCE(p.PackageName,s.ServiceName,v.BusinessName) AS name,CASE WHEN t.PackageId IS NOT NULL THEN 'Package' WHEN t.ServiceId IS NOT NULL THEN 'Service' ELSE 'Vendor' END AS type,COALESCE(v.BusinessName,sv.BusinessName) AS vendor,t.CreatedAt AS createdAt",
  },
  messages: {
    from: "dbo.Messages t JOIN dbo.Conversations c ON c.ConversationId=t.ConversationId JOIN dbo.Users u ON u.UserId=t.SenderUserId JOIN dbo.Vendors v ON v.VendorId=c.VendorId",
    where: "c.CustomerId=:id",
    fields:
      "t.MessageId AS id,CONCAT(u.FirstName,' ',u.LastName) AS sender,v.BusinessName AS vendor,t.MessageText AS message,t.MessageType AS type,CASE WHEN t.IsRead=1 THEN 'Read' ELSE 'Unread' END AS status,t.CreatedAt AS createdAt",
  },
  addresses: {
    from: "dbo.Addresses t",
    where: "t.UserId=:id",
    fields:
      "t.AddressId AS id,t.AddressType AS type,t.AddressLine1 AS line1,t.AddressLine2 AS line2,t.Landmark AS landmark,t.City AS city,t.State AS state,t.PostalCode AS postalCode,t.Country AS country,t.IsDefault AS isDefault,t.CreatedAt AS createdAt",
  },
  audit: {
    from: "dbo.AuditLogs t LEFT JOIN dbo.Users u ON u.UserId=t.UserId",
    where: `(t.UserId=:id OR (t.EntityType IN ('Users','Customer','customers') AND t.EntityId=CONVERT(varchar(100),:id))
    OR (t.EntityType='Booking' AND EXISTS(SELECT 1 FROM dbo.Booking b WHERE b.CustomerId=:id AND CONVERT(varchar(100),b.BookingId)=t.EntityId))
    OR (t.EntityType='Events' AND EXISTS(SELECT 1 FROM dbo.Events e WHERE e.CustomerId=:id AND CONVERT(varchar(100),e.EventId)=t.EntityId))
    OR (t.EntityType='Quotations' AND EXISTS(SELECT 1 FROM dbo.Quotations q WHERE q.CustomerId=:id AND CONVERT(varchar(100),q.QuotationId)=t.EntityId))
    OR (t.EntityType='Reviews' AND EXISTS(SELECT 1 FROM dbo.Reviews r WHERE r.CustomerId=:id AND CONVERT(varchar(100),r.ReviewId)=t.EntityId))
    OR (t.EntityType='Payments' AND EXISTS(SELECT 1 FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId WHERE b.CustomerId=:id AND CONVERT(varchar(100),p.PaymentId)=t.EntityId))
    OR (t.EntityType='Addresses' AND EXISTS(SELECT 1 FROM dbo.Addresses a WHERE a.UserId=:id AND CONVERT(varchar(100),a.AddressId)=t.EntityId)))`,
    fields:
      "t.AuditLogId AS id,t.ActionType AS action,CONCAT(u.FirstName,' ',u.LastName) AS actor,t.EntityType AS entity,t.EntityId AS entityId,t.IPAddress AS ipAddress,CASE WHEN ISJSON(t.NewValue)=1 THEN JSON_VALUE(t.NewValue,'$.note') END AS note,t.CreatedAt AS createdAt",
  },
};
export const customerPageQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export async function customerRecords(id, section, input, ctx) {
  requireRole(ctx, "ADMIN");
  if (!Object.hasOwn(collections, section))
    throw Object.assign(new Error("Customer section not found."), {
      status: 404,
    });
  const query = customerPageQuery.parse(input);
  await findCustomer(id);
  const c = collections[section];
  const params = {
    id,
    offset: (query.page - 1) * query.pageSize,
    size: query.pageSize,
  };
  const [count] = await repo.select(
    `SELECT COUNT_BIG(*) AS total FROM ${c.from} WHERE ${c.where}`,
    params,
  );
  const rows = await repo.select(
    `SELECT ${c.fields} FROM ${c.from} WHERE ${c.where} ORDER BY t.CreatedAt DESC, [id] OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    params,
  );
  return { rows, total: Number(count.total), ...query };
}
async function preventAdmin(id, ctx, tx) {
  const [row] = await repo.select(
    "SELECT COUNT(*) AS total FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=:id AND r.RoleCode='ADMIN'",
    { id },
    tx,
  );
  if (row.total || id === ctx.auth.user.id)
    throw Object.assign(
      new Error(
        "Manage administrator accounts through administrator settings.",
      ),
      { status: 403 },
    );
}
export async function editCustomer(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  const body = customerEdit.parse(input);
  return repo.transaction(async (tx) => {
    const old = await findCustomer(id, tx, true);
    await preventAdmin(id, ctx, tx);
    if (
      new Date(old.updatedAt).getTime() !==
      new Date(body.expectedUpdatedAt).getTime()
    )
      conflict();
    const emailChanged = old.email.toLowerCase() !== body.email;
    const phoneChanged = (old.phone || "") !== body.phone;
    await repo.update(
      { table: "Users", id: "UserId" },
      id,
      {
        FirstName: body.firstName,
        LastName: body.lastName || null,
        Email: body.email,
        PhoneNumber: body.phone || null,
        DateOfBirth: body.dateOfBirth,
        ...(emailChanged ? { IsEmailVerified: 0 } : {}),
        ...(phoneChanged ? { IsPhoneVerified: 0 } : {}),
        UpdatedAt: new Date(),
      },
      tx,
    );
    if (emailChanged)
      await repo.select(
        "UPDATE dbo.AuthSessions SET revokedAt=SYSUTCDATETIME() WHERE userId=:id",
        { id },
        tx,
      );
    await repo.auditAdmin(
      ctx,
      "ADMIN_CUSTOMER_UPDATED",
      "Users",
      id,
      {
        firstName: old.firstName,
        lastName: old.lastName,
        email: old.email,
        phone: old.phone,
        dateOfBirth: old.dateOfBirth,
      },
      { ...body, expectedUpdatedAt: undefined },
      tx,
    );
    return {
      message: emailChanged
        ? "Customer updated. The new email must be verified before sign-in."
        : "Customer details updated.",
    };
  });
}
export async function changeCustomerStatus(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  const body = customerAction.parse(input);
  return repo.transaction(async (tx) => {
    const old = await findCustomer(id, tx, true);
    await preventAdmin(id, ctx, tx);
    if (
      !!old.active !== body.expectedActive ||
      !!old.blocked !== body.expectedBlocked
    )
      conflict();
    const values = { UpdatedAt: new Date() };
    if (["Activate", "Deactivate"].includes(body.action))
      values.IsActive = body.action === "Activate" ? 1 : 0;
    else values.IsBlocked = body.action === "Block" ? 1 : 0;
    await repo.update({ table: "Users", id: "UserId" }, id, values, tx);
    if (["Block", "Deactivate"].includes(body.action))
      await repo.select(
        "UPDATE dbo.AuthSessions SET revokedAt=SYSUTCDATETIME() WHERE userId=:id AND revokedAt IS NULL",
        { id },
        tx,
      );
    await repo.auditAdmin(
      ctx,
      `ADMIN_CUSTOMER_${body.action.toUpperCase()}`,
      "Users",
      id,
      { active: old.active, blocked: old.blocked },
      { ...values, note: body.note },
      tx,
    );
    return { message: "Customer account updated." };
  });
}
export async function notifyCustomer(id, input, ctx) {
  requireRole(ctx, "ADMIN");
  const body = customerNotification.parse(input);
  return repo.transaction(async (tx) => {
    await findCustomer(id, tx);
    await repo.select(
      "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) VALUES(:id,'System',:title,:message,'Customer',:id)",
      { id, ...body },
      tx,
    );
    await repo.auditAdmin(
      ctx,
      "ADMIN_CUSTOMER_NOTIFIED",
      "Users",
      id,
      null,
      body,
      tx,
    );
    return { message: "In-app notification sent." };
  });
}
