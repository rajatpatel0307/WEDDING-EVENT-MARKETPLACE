import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  scope,
  repo,
  owned,
  fail,
  audit,
  insert,
  notifyBusiness,
  eligibleVendor,
} from "./workspace.common.js";
export async function availableService(serviceId, packageId, tx) {
  z.guid().parse(serviceId);
  if (packageId) z.guid().parse(packageId);
  const [s] = await repo.select(
    `SELECT s.*,v.BusinessName FROM dbo.Services s JOIN dbo.Vendors v ON v.VendorId=s.VendorId JOIN dbo.Users u ON u.UserId=v.UserId WHERE s.ServiceId=:serviceId AND s.IsActive=1 AND s.ApprovalStatus='Approved' AND ${eligibleVendor}`,
    { serviceId },
    tx,
  );
  if (!s) fail("Service unavailable. Choose another service.", 409);
  let pack;
  if (packageId) {
    [pack] = await repo.select(
      "SELECT * FROM dbo.ServicePackages WHERE PackageId=:packageId AND ServiceId=:serviceId AND IsActive=1",
      { packageId, serviceId },
      tx,
    );
    if (!pack) fail("Package unavailable.", 409);
  }
  return { s, pack };
}
async function futureEvent(eventId, id, tx) {
  const e = await owned("events", eventId, id, tx);
  if (
    !["Planning", "Confirmed"].includes(e.Status) ||
    String(e.EventDate).slice(0, 10) <
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  )
    fail("Select an upcoming active event.", 409);
  return e;
}
async function checkDate(vendorId, event, services, tx) {
  const [blocked] = await repo.select(
    `SELECT TOP(1) AvailabilityId FROM dbo.VendorAvailability WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:vendorId AND AvailableDate=:day AND Status IN('Blocked','Booked') AND (ServiceId IS NULL OR ServiceId IN(:services))`,
    { vendorId, day: event.EventDate, services },
    tx,
  );
  if (blocked) fail("This service is unavailable on your event date.", 409);
}
async function createBooking(
  event,
  vendorId,
  items,
  ctx,
  tx,
  quotationId = null,
) {
  const { id } = scope(ctx);
  await checkDate(
    vendorId,
    event,
    items.map((i) => i.ServiceId),
    tx,
  );
  const bookingId = randomUUID(),
    number = `BK-${Date.now().toString(36).toUpperCase()}-${bookingId.slice(0, 6).toUpperCase()}`;
  const total = items.reduce(
    (n, i) =>
      n +
      Number(i.Quantity) * Number(i.UnitPrice) -
      Number(i.DiscountAmount || 0) +
      Number(i.TaxAmount || 0),
    0,
  );
  if (total <= 0 || total > 1e8)
    fail("This booking requires a vendor quotation with a valid total.");
  await insert(
    "Booking",
    "BookingId",
    {
      BookingId: bookingId,
      BookingNumber: number,
      EventId: event.EventId,
      CustomerId: id,
      VendorId: vendorId,
      BookingDate: event.EventDate,
      QuotationId: quotationId,
      SubTotal: items.reduce(
        (n, i) => n + Number(i.Quantity) * Number(i.UnitPrice),
        0,
      ),
      DiscountAmount: items.reduce(
        (n, i) => n + Number(i.DiscountAmount || 0),
        0,
      ),
      TaxAmount: items.reduce((n, i) => n + Number(i.TaxAmount || 0), 0),
      PlatformFee: 0,
      AdvanceAmount: 0,
      PaidAmount: 0,
      BookingStatus: "Pending",
      PaymentStatus: "Pending",
    },
    tx,
  );
  for (const i of items)
    await insert(
      "BookingItems",
      "BookingItemId",
      {
        BookingId: bookingId,
        ServiceId: i.ServiceId,
        PackageId: i.PackageId || null,
        ItemName: i.ItemName,
        Quantity: i.Quantity,
        UnitPrice: i.UnitPrice,
        DiscountAmount: i.DiscountAmount || 0,
        TaxAmount: i.TaxAmount || 0,
      },
      tx,
    );
  await insert(
    "BookingStatusHistory",
    "BookingStatusHistoryId",
    {
      BookingId: bookingId,
      OldStatus: null,
      NewStatus: "Pending",
      ChangedBy: id,
      Remarks: "Customer requested a booking.",
    },
    tx,
  );
  await notifyBusiness(
    vendorId,
    "New booking request",
    `${number} is ready for your review.`,
    "Booking",
    bookingId,
    tx,
  );
  await audit(
    ctx,
    "BOOKING_CREATED",
    "Booking",
    bookingId,
    null,
    { number, total, quotationId },
    tx,
  );
  return {
    id: bookingId,
    message: "Booking requested. Your vendor will confirm availability.",
  };
}
export async function book(input, ctx) {
  const { id } = scope(ctx),
    b = z
      .object({
        eventId: z.guid(),
        serviceId: z.guid(),
        packageId: z.guid().optional(),
        quantity: z.coerce.number().int().min(1).max(100000).default(1),
      })
      .strict()
      .parse(input);
  return repo.transaction(async (tx) => {
    const event = await futureEvent(b.eventId, id, tx),
      { s, pack } = await availableService(b.serviceId, b.packageId, tx);
    if (!pack && s.PricingType === "CustomQuote")
      fail("Request a quotation for this service.");
    const price = Number(pack ? pack.FinalPrice : s.BasePrice);
    if (!Number.isFinite(price) || price <= 0)
      fail("Request a quotation to confirm the price.");
    const guests = Number(event.GuestCount);
    if (
      (pack?.MinimumGuests || s.MinimumGuests) > guests ||
      ((pack?.MaximumGuests || s.MaximumGuests) &&
        guests > (pack?.MaximumGuests || s.MaximumGuests))
    )
      fail("Your guest count is outside this service or package guest range.");
    const [existing] = await repo.select(
      "SELECT TOP(1) b.BookingId FROM dbo.Booking b JOIN dbo.BookingItems i ON i.BookingId=b.BookingId WHERE b.CustomerId=:id AND b.EventId=:event AND i.ServiceId=:service AND b.BookingStatus NOT IN('Cancelled','Rejected','Refunded')",
      { id, event: b.eventId, service: b.serviceId },
      tx,
    );
    if (existing)
      fail("You already have a booking for this service and event.", 409);
    return createBooking(
      event,
      s.VendorId,
      [
        {
          ServiceId: s.ServiceId,
          PackageId: pack?.PackageId,
          ItemName: pack?.PackageName || s.ServiceName,
          Quantity: b.quantity,
          UnitPrice: price,
        },
      ],
      ctx,
      tx,
    );
  });
}
export async function requestQuote(input, ctx) {
  const { id } = scope(ctx),
    b = z
      .object({
        eventId: z.guid(),
        serviceId: z.guid(),
        packageId: z.guid().optional(),
        message: z.string().trim().min(5).max(2000),
      })
      .strict()
      .parse(input);
  return repo.transaction(async (tx) => {
    await futureEvent(b.eventId, id, tx);
    const { s } = await availableService(b.serviceId, b.packageId, tx);
    const [old] = await repo.select(
      "SELECT RequestId FROM dbo.QuotationRequests WITH(UPDLOCK,HOLDLOCK) WHERE CustomerId=:id AND EventId=:event AND ServiceId=:service AND Status='Pending'",
      { id, event: b.eventId, service: b.serviceId },
      tx,
    );
    if (old)
      fail(
        "You already have a pending request for this service. Message the vendor to add details.",
        409,
      );
    const row = await insert(
      "QuotationRequests",
      "RequestId",
      {
        CustomerId: id,
        VendorId: s.VendorId,
        EventId: b.eventId,
        ServiceId: b.serviceId,
        PackageId: b.packageId || null,
        Message: b.message,
      },
      tx,
    );
    await notifyBusiness(
      s.VendorId,
      "Quotation requested",
      b.message,
      "QuotationRequest",
      row.id,
      tx,
    );
    await audit(
      ctx,
      "QUOTATION_REQUESTED",
      "QuotationRequests",
      row.id,
      null,
      { event: b.eventId, service: b.serviceId },
      tx,
    );
    return {
      ...row,
      message: "Quotation requested. The vendor has been notified.",
    };
  });
}
export async function quoteDetails(recordId, ctx) {
  const { id } = scope(ctx),
    q = await owned("quotations", recordId, id, undefined, false);
  if (q.Status === "Draft") fail("Quotation not found.", 404);
  return {
    quotation: q,
    items: await repo.select(
      "SELECT ItemName AS name,Quantity AS quantity,UnitPrice AS price,DiscountAmount AS discount,TaxAmount AS tax,LineTotal AS total FROM dbo.QuotationItems WHERE QuotationId=:recordId ORDER BY QuotationItemId",
      { recordId },
    ),
  };
}
export async function decideQuote(recordId, input, ctx) {
  const { id } = scope(ctx),
    b = z
      .object({
        action: z.enum(["Accept", "Reject", "Modify"]),
        message: z.string().trim().max(2000).default(""),
      })
      .strict()
      .parse(input);
  if (b.action === "Modify" && b.message.length < 5)
    fail("Describe the changes you need.");
  return repo.transaction(async (tx) => {
    const q = await owned("quotations", recordId, id, tx);
    if (!["Sent", "Viewed"].includes(q.Status))
      fail("This quotation has already been handled.", 409);
    if (q.ValidUntil && new Date(q.ValidUntil) < new Date())
      fail("This quotation has expired. Request a new quotation.", 409);
    const items = await repo.select(
      "SELECT * FROM dbo.QuotationItems WHERE QuotationId=:recordId",
      { recordId },
      tx,
    );
    let result;
    if (b.action === "Accept") {
      const event = await futureEvent(q.EventId, id, tx);
      for (const i of items) {
        const { s } = await availableService(i.ServiceId, i.PackageId, tx);
        if (s.VendorId.toLowerCase() !== q.VendorId.toLowerCase())
          fail("Quotation contains an unavailable service.", 409);
      }
      result = await createBooking(event, q.VendorId, items, ctx, tx, recordId);
    }
    if (b.action === "Modify") {
      if (!items[0]?.ServiceId)
        fail("Message the vendor to request a revised quotation.");
      await insert(
        "QuotationRequests",
        "RequestId",
        {
          CustomerId: id,
          VendorId: q.VendorId,
          EventId: q.EventId,
          ServiceId: items[0].ServiceId,
          PackageId: items[0].PackageId,
          OriginalQuotationId: recordId,
          Message: b.message,
        },
        tx,
      );
    }
    const status = {
      Accept: "Accepted",
      Reject: "Rejected",
      Modify: "Cancelled",
    }[b.action];
    await repo.update(
      { table: "Quotations", id: "QuotationId" },
      recordId,
      {
        Status: status,
        CustomerMessage: b.message || null,
        UpdatedAt: new Date(),
      },
      tx,
    );
    await notifyBusiness(
      q.VendorId,
      b.action === "Modify"
        ? "Quotation changes requested"
        : `Quotation ${status.toLowerCase()}`,
      b.message || `${q.QuotationNumber} was ${status.toLowerCase()}.`,
      "Quotation",
      recordId,
      tx,
    );
    await audit(
      ctx,
      "QUOTATION_DECISION",
      "Quotations",
      recordId,
      { status: q.Status },
      { status, message: b.message },
      tx,
    );
    return {
      id: result?.id,
      message:
        b.action === "Modify"
          ? "Your changes were sent to the vendor. The original quotation is retained."
          : result?.message || "Quotation rejected.",
    };
  });
}
export async function bookingDetails(recordId, ctx) {
  const { id } = scope(ctx),
    booking = await owned("bookings", recordId, id, undefined, false);
  return {
    booking,
    items: await repo.select(
      "SELECT ItemName AS name,Quantity AS quantity,UnitPrice AS price,LineTotal AS total FROM dbo.BookingItems WHERE BookingId=:recordId ORDER BY BookingItemId",
      { recordId },
    ),
    history: await repo.select(
      "SELECT NewStatus AS status,Remarks AS note,CreatedAt AS createdAt FROM dbo.BookingStatusHistory WHERE BookingId=:recordId ORDER BY CreatedAt",
      { recordId },
    ),
  };
}
export async function review(input, ctx) {
  const { id } = scope(ctx),
    b = z
      .object({
        bookingId: z.guid(),
        rating: z.coerce.number().int().min(1).max(5),
        title: z.string().trim().max(200).default(""),
        text: z.string().trim().min(5).max(5000),
      })
      .strict()
      .parse(input);
  return repo.transaction(async (tx) => {
    const booking = await owned("bookings", b.bookingId, id, tx);
    if (booking.BookingStatus !== "Completed")
      fail("You can review a vendor after the booking is completed.", 409);
    const [old] = await repo.select(
      "SELECT ReviewId FROM dbo.Reviews WHERE BookingId=:booking",
      { booking: b.bookingId },
      tx,
    );
    if (old) fail("You have already reviewed this booking.", 409);
    const r = await insert(
      "Reviews",
      "ReviewId",
      {
        BookingId: b.bookingId,
        CustomerId: id,
        VendorId: booking.VendorId,
        Rating: b.rating,
        ReviewTitle: b.title || null,
        ReviewText: b.text,
        IsVerified: 1,
        IsPublished: 1,
      },
      tx,
    );
    await repo.select(
      "UPDATE dbo.Vendors SET AverageRating=(SELECT COALESCE(AVG(CAST(Rating AS decimal(10,2))),0) FROM dbo.Reviews WHERE VendorId=:vendor AND IsPublished=1),TotalReviews=(SELECT COUNT(*) FROM dbo.Reviews WHERE VendorId=:vendor AND IsPublished=1) WHERE VendorId=:vendor",
      { vendor: booking.VendorId },
      tx,
    );
    await audit(
      ctx,
      "REVIEW_SUBMITTED",
      "Reviews",
      r.id,
      null,
      { rating: b.rating },
      tx,
    );
    await notifyBusiness(
      booking.VendorId,
      "New customer review",
      `A customer rated your service ${b.rating}/5.`,
      "Review",
      r.id,
      tx,
    );
    return { ...r, message: "Thank you for sharing your experience." };
  });
}
