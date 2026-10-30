import {
  capturePolicy,
  milestone as bookingMilestone,
} from "../admin/booking-finance.js";
import { randomUUID, createHash } from "node:crypto";
import { bookingInput } from "../bookings/bookings.validation.js";
import { assertReservation, dayOf } from "../bookings/reservations.js";
import { details as lifecycleDetails } from "../bookings/bookings.service.js";
import { recordServiceMetric } from "../vendors/service-metrics.js";
import { calculatePriceBreakdown } from "../vendors/service-management.validation.js";
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
    `SELECT s.*,v.BusinessName FROM dbo.Services s ${tx ? "WITH(UPDLOCK,HOLDLOCK)" : ""} JOIN dbo.Vendors v ON v.VendorId=s.VendorId JOIN dbo.Users u ON u.UserId=v.UserId JOIN dbo.Categories c ON c.CategoryId=s.CategoryId WHERE s.ServiceId=:serviceId AND c.IsActive=1 AND s.IsActive=1 AND s.ApprovalStatus='Approved' AND ${eligibleVendor}`,
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
    dayOf(e.EventDate) <
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  )
    fail("Select an upcoming active event.", 409);
  return e;
}
async function checkDate(vendorId, event, services, tx) {
  return assertReservation(vendorId, event, services, tx);
}
async function createBooking(
  event,
  vendorId,
  items,
  ctx,
  tx,
  quotationId = null,
  snapshot = null,
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
      EventSnapshotJson: JSON.stringify({
        name: event.EventName,
        type: event.EventType,
        city: event.City,
        state: event.State,
        guests: event.GuestCount,
        requirements: snapshot?.requirements || event.Description || "",
      }),
      StartTime: event.StartTime,
      EndTime: event.EndTime,
      PriceSnapshotJson: snapshot
        ? JSON.stringify(snapshot)
        : JSON.stringify({ source: "Quotation", quotationId }),
      CustomerNotes: snapshot?.requirements || null,
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
        ServiceItemId: i.ServiceItemId || null,
        DescriptionSnapshot: i.DescriptionSnapshot || null,
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
      PublicNote: "Customer requested a booking.",
      ActorRole: "Customer",
      ActionType: "Created",
    },
    tx,
  );
  const notificationBooking = {
    BookingId: bookingId,
    CustomerId: id,
    VendorId: vendorId,
  };
  await capturePolicy(notificationBooking, tx);
  await bookingMilestone(
    notificationBooking,
    "created",
    "Booking created",
    `${number} has been created and is awaiting vendor acceptance.`,
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
    number,
    bookingStatus: "Pending",
    paymentStatus: "Pending",
    message: "Booking requested. Your vendor will confirm availability.",
  };
}
async function prepareBooking(input, ctx, tx) {
  const { id } = scope(ctx),
    b = bookingInput.parse(input);
  const event = await futureEvent(b.eventId, id, tx),
    { s, pack } = await availableService(b.serviceId, b.packageId, tx);
  if (!pack && s.PricingType === "CustomQuote")
    fail("Request a quotation for this service.");
  const document = s.DetailsJson ? JSON.parse(s.DetailsJson) : null;
  const flexible = !pack && !!document?.pricing;
  const quantity =
    !pack && s.PricingType === "PerPerson"
      ? Number(event.GuestCount)
      : b.quantity;
  const breakdown = flexible
    ? calculatePriceBreakdown(
        document.pricing,
        quantity,
        dayOf(event.EventDate),
      )
    : null;
  const price = flexible
    ? breakdown.total
    : Number(pack ? pack.FinalPrice : s.BasePrice);
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
  const items = [
    {
      ServiceId: s.ServiceId,
      PackageId: pack?.PackageId,
      ItemName: flexible
        ? `${s.ServiceName.slice(0, 160)} (${quantity} ${document.pricing.unit})`
        : pack?.PackageName || s.ServiceName,
      Quantity: flexible ? 1 : quantity,
      UnitPrice: breakdown ? breakdown.subtotal + breakdown.charges : price,
      DiscountAmount: breakdown?.discount || 0,
      TaxAmount: breakdown?.tax || 0,
      DescriptionSnapshot: JSON.stringify({
        description: document?.description || "",
        package: pack || null,
        inclusions: pack
          ? await repo.select(
              "SELECT ItemName AS name,Description AS description,Quantity AS quantity,Unit AS unit FROM dbo.PackageItems WHERE PackageId=:id ORDER BY SortOrder,PackageItemId",
              { id: pack.PackageId },
              tx,
            )
          : [],
      }),
    },
  ];
  let coupon = null;
  if (b.coupon) {
    const [c] = await repo.select(
      "SELECT * FROM dbo.Coupons WITH(UPDLOCK,HOLDLOCK) WHERE CouponCode=:code AND (VendorId IS NULL OR VendorId=:vendor) AND IsActive=1 AND StartDate<=SYSUTCDATETIME() AND EndDate>=SYSUTCDATETIME() AND (UsageLimit IS NULL OR UsedCount<UsageLimit)",
      { code: b.coupon.toUpperCase(), vendor: s.VendorId },
      tx,
    );
    if (!c)
      fail("Coupon is invalid, expired or has reached its usage limit.", 409);
    const base =
      Math.round(items[0].Quantity * items[0].UnitPrice * 100) -
      Math.round((items[0].DiscountAmount || 0) * 100);
    if (base < Math.round(Number(c.MinimumBookingAmount || 0) * 100))
      fail("The base service or package does not meet the coupon minimum.");
    const proposed =
      c.DiscountType === "Percentage"
        ? Math.round((base * Math.round(Number(c.DiscountValue) * 100)) / 10000)
        : Math.round(Number(c.DiscountValue) * 100);
    const reduction = Math.max(
      0,
      Math.min(
        base,
        proposed,
        c.MaximumDiscountAmount === null
          ? base
          : Math.round(Number(c.MaximumDiscountAmount) * 100),
      ),
    );
    if (reduction <= 0) fail("This coupon has no applicable discount.");
    items[0].DiscountAmount =
      (Math.round((items[0].DiscountAmount || 0) * 100) + reduction) / 100;
    if (breakdown)
      items[0].TaxAmount =
        Math.round(
          ((base - reduction) *
            Math.round(Number(document.pricing.taxRate || 0) * 100)) /
            10000,
        ) / 100;
    coupon = { id: c.CouponId, code: c.CouponCode, amount: reduction / 100 };
  }
  const optionalItems = b.items.length
    ? await repo.select(
        "SELECT * FROM dbo.ServiceItems WITH(UPDLOCK,HOLDLOCK) WHERE ServiceItemId IN(:ids) AND ServiceId=:service AND IsIncluded=0",
        { ids: b.items.map((i) => i.id), service: s.ServiceId },
        tx,
      )
    : [];
  for (const selected of b.items) {
    const item = optionalItems.find(
      (i) => Number(i.ServiceItemId) === selected.id,
    );
    if (
      !item ||
      !Number.isFinite(Number(item.UnitPrice)) ||
      Number(item.UnitPrice) <= 0
    )
      fail("An optional item is unavailable.", 409);
    items.push({
      ServiceId: s.ServiceId,
      ServiceItemId: item.ServiceItemId,
      ItemName: item.ItemName,
      DescriptionSnapshot: item.Description,
      Quantity: selected.quantity,
      UnitPrice: Number(item.UnitPrice),
    });
  }
  const travel = Number(document?.policies?.travelCharges || 0);
  if (travel > 0 && document?.location?.mode !== "Vendor location")
    items.push({
      ServiceId: s.ServiceId,
      ItemName: "Travel / setup charges",
      Quantity: 1,
      UnitPrice: travel,
    });
  await checkDate(s.VendorId, event, [s.ServiceId], tx);
  const subtotal =
    items.reduce(
      (n, i) => n + Math.round(Number(i.Quantity) * Number(i.UnitPrice) * 100),
      0,
    ) / 100;
  const discount =
    items.reduce(
      (n, i) => n + Math.round(Number(i.DiscountAmount || 0) * 100),
      0,
    ) / 100;
  const tax =
    items.reduce((n, i) => n + Math.round(Number(i.TaxAmount || 0) * 100), 0) /
    100;
  const total = Math.round((subtotal - discount + tax) * 100) / 100;
  if (!Number.isFinite(total) || total <= 0 || total > 1e8)
    fail("Booking total exceeds the supported limits.");
  const percentage = document?.policies?.advanceRequired
    ? Number(document.policies.advancePercentage || 0)
    : 0;
  const snapshot = {
    source: "Service",
    serviceId: s.ServiceId,
    packageId: pack?.PackageId || null,
    pricing: flexible ? document.pricing : null,
    quantity,
    requirements: b.requirements,
    coupon,
    policies: document?.policies || null,
    subtotal,
    discount,
    tax,
    total,
    advance: Math.round(total * percentage) / 100,
  };
  const reviewToken = createHash("sha256")
    .update(JSON.stringify({ snapshot, event, items }))
    .digest("hex");
  if (b.reviewToken && b.reviewToken !== reviewToken)
    fail("The event, price or terms changed. Review the booking again.", 409);
  return { event, s, items, snapshot, total, reviewToken };
}
export async function previewBooking(input, ctx) {
  scope(ctx);
  return repo.transaction(async (tx) => {
    const p = await prepareBooking(input, ctx, tx);
    return {
      reviewToken: p.reviewToken,
      service: p.s.ServiceName,
      vendor: p.s.BusinessName,
      event: {
        name: p.event.EventName,
        date: dayOf(p.event.EventDate),
        city: p.event.City,
        guests: p.event.GuestCount,
      },
      items: p.items.map((i) => ({
        name: i.ItemName,
        quantity: i.Quantity,
        price: Number(i.UnitPrice),
        discount: i.DiscountAmount || 0,
        tax: i.TaxAmount || 0,
        total:
          Math.round(
            (i.Quantity * i.UnitPrice -
              (i.DiscountAmount || 0) +
              (i.TaxAmount || 0)) *
              100,
          ) / 100,
      })),
      subtotal: p.snapshot.subtotal,
      discount: p.snapshot.discount,
      tax: p.snapshot.tax,
      total: p.total,
      advance: p.snapshot.advance,
      terms: p.snapshot.policies,
    };
  });
}
export async function book(input, ctx) {
  scope(ctx);
  return repo.transaction(async (tx) => {
    const p = await prepareBooking(input, ctx, tx);
    const result = await createBooking(
      p.event,
      p.s.VendorId,
      p.items,
      ctx,
      tx,
      null,
      p.snapshot,
    );
    if (p.snapshot.coupon)
      await repo.select(
        "UPDATE dbo.Coupons SET UsedCount=UsedCount+1 WHERE CouponId=:id",
        { id: p.snapshot.coupon.id },
        tx,
      );
    await repo.update(
      { table: "Booking", id: "BookingId" },
      result.id,
      { AdvanceAmount: p.snapshot.advance },
      tx,
    );
    return result;
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
    await recordServiceMetric(b.serviceId, "Enquiries", tx);
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
        const { s, pack } = await availableService(
          i.ServiceId,
          i.PackageId,
          tx,
        );
        if (
          pack &&
          ((pack.MinimumGuests &&
            Number(event.GuestCount) < Number(pack.MinimumGuests)) ||
            (pack.MaximumGuests &&
              Number(event.GuestCount) > Number(pack.MaximumGuests)))
        )
          fail(
            "The event guest count is outside the quoted package limits.",
            409,
          );
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
  scope(ctx);
  return lifecycleDetails(recordId, ctx, "Customer");
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
