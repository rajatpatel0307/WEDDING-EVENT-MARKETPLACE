import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { publicCompany } from "../public/company.service.js";
import { renderLifecycleEmail, siteOrigin, validEmail } from "./email.templates.js";

export const emailQuery = (sql, replacements = {}, transaction) => sequelize.query(sql, {
  replacements, type: QueryTypes.SELECT, transaction,
});
let warnedMissingSchema = false;
export async function emailSchemaReady(transaction) {
  const [row] = await emailQuery("SELECT OBJECT_ID('dbo.TransactionalEmailOutbox','U') AS outboxId", {}, transaction);
  if (row?.outboxId) return true;
  if (!warnedMissingSchema) {
    console.error("Automated lifecycle emails unavailable: review and apply 035-transactional-email.sql. Existing actions remain available.");
    warnedMissingSchema = true;
  }
  return false;
}
const json = value => value ? JSON.parse(value) : {};
const cleanAddress = value => {
  const address = json(value);
  return Object.fromEntries(["fullName", "line1", "line2", "city", "state", "postalCode", "country"].map(key => [key, address[key]]));
};
async function branding(tx) {
  const [published] = await emailQuery("SELECT ContentJson FROM dbo.CMSPageVersions WHERE PageKey='contact' AND Status='Published'", {}, tx);
  const contact = json(published?.ContentJson).contact || {};
  const company = publicCompany();
  return {
    name: company.name,
    origin: siteOrigin(process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL),
    supportEmail: process.env.EMAIL_SUPPORT_EMAIL || contact.supportEmail || (!company.contactIsPlaceholder ? company.email : null),
    phone: contact.phone || (!company.contactIsPlaceholder ? company.phone : null),
  };
}
async function eventData(type, id, tx) {
  if (type === "vendor.approved" || type === "service.approved") {
    const service = type === "service.approved";
    const [row] = await emailQuery(`SELECT u.UserId AS userId,u.Email AS email,CONCAT(u.FirstName,' ',u.LastName) AS name,
      v.BusinessName AS vendor,${service ? "s.ServiceName AS service,s.ApprovalCycle AS cycle,s.ApprovalStatus AS status" : "v.VerificationCycle AS cycle,v.VerificationStatus AS status"}
      FROM dbo.Vendors v JOIN dbo.Users u ON u.UserId=v.UserId ${service ? "JOIN dbo.Services s ON s.VendorId=v.VendorId" : ""}
      WHERE ${service ? "s.ServiceId" : "v.VendorId"}=:id`, { id }, tx);
    if (!row || row.status !== "Approved") throw new Error("Email approval event does not match the saved record.");
    return { ...row, id };
  }
  if (type === "order.placed" || type === "order.delivered") {
    const [row] = await emailQuery(`SELECT o.OrderId AS id,o.OrderNumber AS reference,u.UserId AS userId,u.Email AS email,
      CONCAT(u.FirstName,' ',u.LastName) AS name,o.PaymentStatus AS paymentStatus,o.OrderStatus AS status,
      o.TotalAmount AS total,o.Subtotal AS subtotal,o.TaxAmount AS tax,o.ShippingAmount AS shipping,o.DiscountAmount AS discount,
      o.AddressSnapshot AS addressJson,SYSUTCDATETIME() AS occurredAt
      FROM dbo.Orders o JOIN dbo.Users u ON u.UserId=o.CustomerId WHERE o.OrderId=:id`, { id }, tx);
    if (!row || (type === "order.placed" && row.paymentStatus !== "Paid") || (type === "order.delivered" && row.status !== "Delivered"))
      throw new Error("Email order event does not match the saved record.");
    const items = await emailQuery(`SELECT ProductNameSnapshot AS name,Quantity AS quantity,UnitPrice AS price,LineTotal AS total,
      FulfillmentStatus AS status FROM dbo.OrderLineItems WHERE OrderId=:id ORDER BY CreatedAt,ItemId`, { id }, tx);
    // occurredAt is UTC, while the delivery date shown to the customer is IST.
    const deliveryDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(row.occurredAt));
    return { ...row, deliveryDate, address: cleanAddress(row.addressJson), items };
  }
  if (type === "booking.placed" || type === "booking.accepted") {
    const [row] = await emailQuery(`SELECT b.BookingId AS id,b.BookingNumber AS reference,u.UserId AS userId,u.Email AS email,
      CONCAT(u.FirstName,' ',u.LastName) AS name,b.BookingDate AS bookingDate,b.StartTime AS startTime,b.EndTime AS endTime,
      b.TotalAmount AS total,b.SubTotal AS subtotal,b.TaxAmount AS tax,b.DiscountAmount AS discount,b.PlatformFee AS platformFee,
      b.AdvanceAmount AS advance,b.PaidAmount AS paid,b.PaymentStatus AS paymentStatus,b.BookingStatus AS status,
      v.BusinessName AS vendor,v.ContactEmail AS vendorEmail,v.ContactPhone AS vendorPhone,b.EventSnapshotJson AS eventJson
      FROM dbo.Booking b JOIN dbo.Users u ON u.UserId=b.CustomerId JOIN dbo.Vendors v ON v.VendorId=b.VendorId WHERE b.BookingId=:id`, { id }, tx);
    if (!row || (type === "booking.placed" && row.status !== "Pending") || (type === "booking.accepted" && !["Accepted", "Confirmed"].includes(row.status)))
      throw new Error("Email booking event does not match the saved record.");
    const items = await emailQuery(`SELECT ItemName AS name,Quantity AS quantity,UnitPrice AS price,
      (Quantity*UnitPrice-DiscountAmount+TaxAmount) AS total FROM dbo.BookingItems WHERE BookingId=:id ORDER BY BookingItemId`, { id }, tx);
    return { ...row, services: items.map(item => item.name).join(", "), items, address: json(row.eventJson).location };
  }
  throw new Error("Unsupported email event.");
}

// The outbox write participates in the business transaction. Workers can only
// claim it once that transaction commits; a rollback removes both together.
export async function queueLifecycleEmail(type, id, tx) {
  if (!tx || tx.finished) throw new Error("An active transaction is required to queue lifecycle email.");
  if (!await emailSchemaReady(tx)) return;
  const data = await eventData(type, id, tx);
  const key = `${type}:${id.toLowerCase()}${data.cycle !== undefined ? `:${data.cycle}` : ""}`;
  const brand = await branding(tx);
  const mail = renderLifecycleEmail(type, data, brand);
  await emailQuery(`IF NOT EXISTS (SELECT 1 FROM dbo.TransactionalEmailOutbox WITH(UPDLOCK,HOLDLOCK) WHERE EventKey=:key)
    INSERT dbo.TransactionalEmailOutbox(EventKey,EventType,EntityId,RecipientUserId,RecipientEmail,Subject,TextBody,HtmlBody,ReplyTo,DeliveryStatus,ErrorCode)
    VALUES(:key,:type,:id,:user,:email,:subject,:text,:html,:replyTo,:status,:error)`, {
    key, type, id, user: data.userId, email: data.email || "", ...mail, replyTo: mail.replyTo || null,
    status: validEmail(data.email) ? "Pending" : "Failed", error: validEmail(data.email) ? null : "INVALID_REGISTERED_EMAIL",
  }, tx);
}
