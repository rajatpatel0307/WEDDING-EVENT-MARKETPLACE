// Every identifier and projection is owned by the server; request input is bound.
const resource = (table, id, fields, options = {}) => ({
  table,
  id,
  fields,
  ...options,
});
const active = { Active: 1, Inactive: 0 };
const vendors = resource(
  "Vendors",
  "VendorId",
  {
    name: "t.BusinessName",
    owner: "CONCAT(u.FirstName,' ',u.LastName)",
    email: "COALESCE(t.ContactEmail,u.Email)",
    phone: "COALESCE(t.ContactPhone,u.PhoneNumber)",
    status: "t.VerificationStatus",
    city: "(SELECT TOP (1) City FROM dbo.VendorLocations WHERE VendorId=t.VendorId ORDER BY CreatedAt)",
    categories:
      "(SELECT STRING_AGG(c.CategoryName, ', ') FROM dbo.VendorCategories vc JOIN dbo.Categories c ON c.CategoryId=vc.CategoryId WHERE vc.VendorId=t.VendorId)",
    documents:
      "(SELECT COUNT(*) FROM dbo.VendorDocuments d WHERE d.VendorId=t.VendorId)",
    emailVerified: "u.IsEmailVerified",
    description: "t.BusinessDescription",
    remarks: "t.VerificationRemarks",
  },
  {
    joins: "JOIN dbo.Users u ON u.UserId=t.UserId",
    statuses: ["Pending", "UnderReview", "Approved", "Rejected", "Suspended"],
    statusColumn: "VerificationStatus",
    actions: ["Approved", "Rejected", "Suspended"],
  },
);
export const resources = {
  customers: resource(
    "Users",
    "UserId",
    {
      name: "CONCAT(t.FirstName,' ',t.LastName)",
      email: "t.Email",
      phone: "t.PhoneNumber",
      status:
        "CASE WHEN t.IsBlocked=1 THEN 'Blocked' WHEN t.IsActive=0 THEN 'Inactive' ELSE 'Active' END",
      emailVerified: "t.IsEmailVerified",
    },
    {
      where:
        "EXISTS (SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=t.UserId AND r.RoleCode='CUSTOMER')",
      statuses: ["Active", "Inactive", "Blocked"],
      actions: ["Block", "Unblock"],
    },
  ),
  vendors,
  applications: {
    ...vendors,
    where: "t.VerificationStatus IN ('Pending','UnderReview')",
  },
  documents: resource(
    "VendorDocuments",
    "VendorDocumentId",
    {
      name: "t.DocumentType",
      vendor: "v.BusinessName",
      status: "t.VerificationStatus",
    },
    {
      joins: "JOIN dbo.Vendors v ON v.VendorId=t.VendorId",
      statusColumn: "VerificationStatus",
      statuses: ["Pending", "Approved", "Rejected"],
      actions: ["Approved", "Rejected"],
    },
  ),
  categories: resource(
    "Categories",
    "CategoryId",
    {
      name: "t.CategoryName",
      code: "t.CategoryCode",
      description: "t.Description",
      status: "CASE WHEN t.IsActive=1 THEN 'Active' ELSE 'Inactive' END",
    },
    {
      statusColumn: "IsActive",
      statuses: Object.keys(active),
      statusValues: active,
      actions: Object.keys(active),
      editable: {
        name: "CategoryName",
        code: "CategoryCode",
        description: "Description",
      },
    },
  ),
  "sub-categories": resource(
    "SubCategories",
    "SubCategoryId",
    {
      name: "t.SubCategoryName",
      category: "c.CategoryName",
      categoryId: "t.CategoryId",
      code: "t.SubCategoryCode",
      description: "t.Description",
      status: "CASE WHEN t.IsActive=1 THEN 'Active' ELSE 'Inactive' END",
    },
    {
      joins: "JOIN dbo.Categories c ON c.CategoryId=t.CategoryId",
      statusColumn: "IsActive",
      statuses: Object.keys(active),
      statusValues: active,
      actions: Object.keys(active),
      editable: {
        name: "SubCategoryName",
        categoryId: "CategoryId",
        code: "SubCategoryCode",
        description: "Description",
      },
    },
  ),
  services: resource(
    "Services",
    "ServiceId",
    {
      name: "t.ServiceName",
      vendor: "v.BusinessName",
      category: "c.CategoryName",
      amount: "t.BasePrice",
      status: "t.ApprovalStatus",
      description: "t.Description",
    },
    {
      joins:
        "JOIN dbo.Vendors v ON v.VendorId=t.VendorId JOIN dbo.Categories c ON c.CategoryId=t.CategoryId",
      statusColumn: "ApprovalStatus",
      statuses: ["Draft", "Pending", "Approved", "Rejected", "Suspended"],
      actions: ["Approved", "Rejected", "Suspended"],
    },
  ),
  bookings: resource(
    "Booking",
    "BookingId",
    {
      name: "t.BookingNumber",
      customer: "CONCAT(u.FirstName,' ',u.LastName)",
      vendor: "v.BusinessName",
      amount: "t.TotalAmount",
      paid: "t.PaidAmount",
      status: "t.BookingStatus",
      paymentStatus: "t.PaymentStatus",
      eventDate: "t.BookingDate",
    },
    {
      joins:
        "JOIN dbo.Users u ON u.UserId=t.CustomerId JOIN dbo.Vendors v ON v.VendorId=t.VendorId",
      statusColumn: "BookingStatus",
      statuses: [
        "Pending",
        "Accepted",
        "Rejected",
        "PaymentPending",
        "Confirmed",
        "InProgress",
        "Completed",
        "Cancelled",
        "Disputed",
        "Refunded",
      ],
      actions: ["Confirmed", "Completed", "Cancelled", "Disputed"],
    },
  ),
  quotations: resource(
    "Quotations",
    "QuotationId",
    {
      name: "t.QuotationNumber",
      vendor: "v.BusinessName",
      amount: "t.TotalAmount",
      status: "t.Status",
      validUntil: "t.ValidUntil",
    },
    {
      joins: "JOIN dbo.Vendors v ON v.VendorId=t.VendorId",
      statuses: [
        "Draft",
        "Sent",
        "Viewed",
        "Accepted",
        "Rejected",
        "Expired",
        "Cancelled",
      ],
    },
  ),
  payments: resource(
    "Payments",
    "PaymentId",
    {
      name: "t.PaymentReference",
      booking: "b.BookingNumber",
      amount: "t.Amount",
      currency: "t.Currency",
      method: "t.PaymentMethod",
      status: "t.PaymentStatus",
    },
    {
      joins: "JOIN dbo.Booking b ON b.BookingId=t.BookingId",
      statuses: ["Pending", "Processing", "Success", "Failed", "Refunded"],
    },
  ),
  refunds: resource(
    "Refunds",
    "RefundId",
    {
      name: "t.RefundReference",
      booking: "b.BookingNumber",
      amount: "t.RefundAmount",
      reason: "t.Reason",
      status: "t.RefundStatus",
    },
    {
      joins: "JOIN dbo.Booking b ON b.BookingId=t.BookingId",
      statuses: ["Pending", "Processing", "Completed", "Rejected", "Failed"],
    },
  ),
  payouts: resource(
    "VendorPayouts",
    "PayoutId",
    {
      name: "v.BusinessName",
      booking: "b.BookingNumber",
      amount: "t.NetAmount",
      gross: "t.GrossAmount",
      commission: "t.PlatformCommission",
      status: "t.PayoutStatus",
    },
    {
      joins:
        "JOIN dbo.Vendors v ON v.VendorId=t.VendorId JOIN dbo.Booking b ON b.BookingId=t.BookingId",
      statuses: ["Pending", "Processing", "Paid", "Failed"],
    },
  ),
  commission: resource(
    "PlatformCommission",
    "CommissionId",
    {
      name: "v.BusinessName",
      booking: "b.BookingNumber",
      amount: "t.CommissionAmount",
      rate: "t.CommissionRate",
      bookingAmount: "t.BookingAmount",
    },
    {
      joins:
        "JOIN dbo.Vendors v ON v.VendorId=t.VendorId JOIN dbo.Booking b ON b.BookingId=t.BookingId",
    },
  ),
  reviews: resource(
    "Reviews",
    "ReviewId",
    {
      name: "t.ReviewTitle",
      vendor: "v.BusinessName",
      rating: "t.Rating",
      description: "t.ReviewText",
      status: "CASE WHEN t.IsPublished=1 THEN 'Published' ELSE 'Hidden' END",
    },
    {
      joins: "JOIN dbo.Vendors v ON v.VendorId=t.VendorId",
      statusColumn: "IsPublished",
      statuses: ["Published", "Hidden"],
      statusValues: { Published: 1, Hidden: 0 },
      actions: ["Published", "Hidden"],
    },
  ),
  wishlists: resource(
    "Wishlists",
    "WishlistId",
    {
      name: "CONCAT(u.FirstName,' ',u.LastName)",
      vendor: "v.BusinessName",
      service: "s.ServiceName",
    },
    {
      joins:
        "JOIN dbo.Users u ON u.UserId=t.CustomerId LEFT JOIN dbo.Vendors v ON v.VendorId=t.VendorId LEFT JOIN dbo.Services s ON s.ServiceId=t.ServiceId",
    },
  ),
  messages: resource(
    "Messages",
    "MessageId",
    {
      name: "CONCAT(u.FirstName,' ',u.LastName)",
      description: "t.MessageText",
      type: "t.MessageType",
      status: "CASE WHEN t.IsRead=1 THEN 'Read' ELSE 'Unread' END",
    },
    {
      joins: "JOIN dbo.Users u ON u.UserId=t.SenderUserId",
      statuses: ["Read", "Unread"],
    },
  ),
  notifications: resource(
    "Notifications",
    "NotificationId",
    {
      name: "t.Title",
      description: "t.Message",
      recipient: "u.Email",
      type: "t.NotificationType",
      status: "CASE WHEN t.IsRead=1 THEN 'Read' ELSE 'Unread' END",
    },
    {
      joins: "JOIN dbo.Users u ON u.UserId=t.UserId",
      statuses: ["Read", "Unread"],
    },
  ),
  coupons: resource(
    "Coupons",
    "CouponId",
    {
      name: "t.CouponCode",
      description: "t.Description",
      discountType: "t.DiscountType",
      discountValue: "t.DiscountValue",
      used: "t.UsedCount",
      usageLimit: "t.UsageLimit",
      startDate: "t.StartDate",
      endDate: "t.EndDate",
      status: "CASE WHEN t.IsActive=1 THEN 'Active' ELSE 'Inactive' END",
    },
    {
      statusColumn: "IsActive",
      statuses: Object.keys(active),
      statusValues: active,
      actions: Object.keys(active),
      editable: {
        name: "CouponCode",
        description: "Description",
        discountType: "DiscountType",
        discountValue: "DiscountValue",
        usageLimit: "UsageLimit",
        startDate: "StartDate",
        endDate: "EndDate",
      },
    },
  ),
  offers: resource(
    "Offers",
    "OfferId",
    {
      name: "t.OfferName",
      description: "t.Description",
      discountType: "t.DiscountType",
      discountValue: "t.DiscountValue",
      startDate: "t.StartDate",
      endDate: "t.EndDate",
      status: "CASE WHEN t.IsActive=1 THEN 'Active' ELSE 'Inactive' END",
    },
    {
      statusColumn: "IsActive",
      statuses: Object.keys(active),
      statusValues: active,
      actions: Object.keys(active),
      editable: {
        name: "OfferName",
        description: "Description",
        discountType: "DiscountType",
        discountValue: "DiscountValue",
        startDate: "StartDate",
        endDate: "EndDate",
      },
    },
  ),
  events: resource(
    "Events",
    "EventId",
    {
      name: "t.EventName",
      customer: "CONCAT(u.FirstName,' ',u.LastName)",
      type: "t.EventType",
      eventDate: "t.EventDate",
      city: "t.City",
      guests: "t.GuestCount",
      amount: "t.Budget",
      status: "t.Status",
    },
    {
      joins: "JOIN dbo.Users u ON u.UserId=t.CustomerId",
      statuses: ["Planning", "Confirmed", "Completed", "Cancelled"],
    },
  ),
  guests: resource(
    "EventGuests",
    "GuestId",
    {
      name: "t.GuestName",
      event: "e.EventName",
      email: "t.Email",
      phone: "t.Phone",
      status: "t.RsvpStatus",
    },
    {
      joins: "JOIN dbo.Events e ON e.EventId=t.EventId",
      statuses: ["Invited", "Accepted", "Declined", "Attended"],
    },
  ),
  media: resource("Media", "MediaId", {
    name: "t.FileName",
    type: "t.MediaType",
    mimeType: "t.MimeType",
    size: "t.FileSize",
    entity: "t.EntityType",
  }),
  "audit-logs": resource(
    "AuditLogs",
    "AuditLogId",
    {
      name: "t.ActionType",
      actor: "u.Email",
      entity: "t.EntityType",
      entityId: "t.EntityId",
    },
    { joins: "LEFT JOIN dbo.Users u ON u.UserId=t.UserId" },
  ),
};
export function getResource(name) {
  if (!Object.hasOwn(resources, name))
    throw Object.assign(new Error("Resource not found."), { status: 404 });
  return resources[name];
}
