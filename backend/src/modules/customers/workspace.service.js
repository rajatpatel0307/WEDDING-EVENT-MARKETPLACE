import { z } from "zod";
import {
  scope,
  repo,
  owned,
  fail,
  audit,
  pageInput,
  insert,
} from "./workspace.common.js";
import { customerReadCollections } from "../admin/customers.service.js";
import { phone } from "../auth/auth.validation.js";
const localDay = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const eventInput = z
  .object({
    name: z.string().trim().min(2).max(200),
    type: z.enum([
      "Wedding",
      "Engagement",
      "Reception",
      "Sangeet",
      "Mehndi",
      "Birthday",
      "Anniversary",
      "Corporate",
      "Other",
    ]),
    eventDate: z.iso.date(),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().max(100).default(""),
    guests: z.coerce.number().int().min(1).max(100000),
    budget: z.coerce.number().min(0).max(1e8),
    description: z.string().trim().max(5000).default(""),
    expectedUpdatedAt: z.iso.datetime().optional(),
  })
  .strict();
const eventFields = `t.EventId AS id,t.EventName AS name,t.EventType AS type,t.EventDate AS eventDate,t.City AS city,t.State AS state,t.GuestCount AS guests,t.Budget AS budget,t.Description AS description,t.Status AS status,t.UpdatedAt AS updatedAt,t.CreatedAt AS createdAt,(SELECT COUNT(*) FROM dbo.Booking b WHERE b.EventId=t.EventId AND b.BookingStatus IN('Accepted','Confirmed','InProgress','Completed','PaymentPending')) AS bookedServices,(SELECT COALESCE(SUM(TotalAmount),0) FROM dbo.Booking b WHERE b.EventId=t.EventId AND b.BookingStatus NOT IN('Cancelled','Rejected','Refunded')) AS committed`;
const extra = {
  events: {
    from: "dbo.Events t",
    where: "t.CustomerId=:id",
    fields: eventFields,
  },
  bookings: {
    from: "dbo.Booking t JOIN dbo.Vendors v ON v.VendorId=t.VendorId JOIN dbo.Events e ON e.EventId=t.EventId",
    where: "t.CustomerId=:id",
    fields: `t.BookingId AS id,t.BookingNumber AS number,t.VendorId AS vendorId,v.BusinessName AS vendor,e.EventName AS event,t.EventId AS eventId,t.BookingDate AS bookingDate,t.TotalAmount AS amount,t.PaidAmount AS paid,t.RemainingAmount AS remaining,t.BookingStatus AS status,t.PaymentStatus AS paymentStatus,t.CreatedAt AS createdAt,(SELECT STRING_AGG(CONVERT(nvarchar(max),ItemName),', ') FROM dbo.BookingItems WHERE BookingId=t.BookingId) AS services`,
  },
  quotations: {
    from: "dbo.Quotations t JOIN dbo.Vendors v ON v.VendorId=t.VendorId JOIN dbo.Events e ON e.EventId=t.EventId",
    where: "t.CustomerId=:id AND t.Status<>'Draft'",
    fields: `t.QuotationId AS id,t.QuotationNumber AS number,t.VendorId AS vendorId,v.BusinessName AS vendor,e.EventName AS event,t.TotalAmount AS amount,t.Status AS status,t.ValidUntil AS validUntil,t.CreatedAt AS createdAt,(SELECT STRING_AGG(CONVERT(nvarchar(max),ItemName),', ') FROM dbo.QuotationItems WHERE QuotationId=t.QuotationId) AS services`,
  },
  requests: {
    from: "dbo.QuotationRequests t JOIN dbo.Vendors v ON v.VendorId=t.VendorId JOIN dbo.Services s ON s.ServiceId=t.ServiceId JOIN dbo.Events e ON e.EventId=t.EventId",
    where: "t.CustomerId=:id",
    fields:
      "t.RequestId AS id,v.BusinessName AS vendor,s.ServiceName AS service,e.EventName AS event,t.Message AS message,t.Status AS status,t.CreatedAt AS createdAt",
  },
  notifications: {
    from: "dbo.Notifications t",
    where: "t.UserId=:id",
    fields:
      "t.NotificationId AS id,t.Title AS title,t.Message AS message,t.IsRead AS isRead,t.ReferenceType AS referenceType,t.ReferenceId AS referenceId,t.CreatedAt AS createdAt",
  },
};
const allowed = new Set([
  "events",
  "bookings",
  "quotations",
  "requests",
  "payments",
  "reviews",
  "addresses",
  "notifications",
]);
export async function records(section, input, ctx) {
  const { id } = scope(ctx);
  if (!allowed.has(section)) fail("Page not found.", 404);
  const q = pageInput.parse(input),
    c = extra[section] || customerReadCollections[section],
    p = { id, offset: (q.page - 1) * q.pageSize, size: q.pageSize };
  const [n] = await repo.select(
    `SELECT COUNT(*) AS total FROM ${c.from} WHERE ${c.where}`,
    p,
  );
  return {
    ...q,
    total: n.total,
    rows: await repo.select(
      `SELECT ${c.fields} FROM ${c.from} WHERE ${c.where} ORDER BY t.CreatedAt DESC,[id] OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
      p,
    ),
  };
}
export async function dashboard(ctx) {
  const { id } = scope(ctx);
  const [stats] = await repo.select(
    `SELECT (SELECT COUNT(*) FROM dbo.Events WHERE CustomerId=:id AND Status IN('Planning','Confirmed')) AS events,(SELECT COUNT(*) FROM dbo.Booking WHERE CustomerId=:id AND BookingDate>=:today AND BookingStatus NOT IN('Cancelled','Rejected','Refunded','Completed')) AS bookings,(SELECT COUNT(*) FROM dbo.Quotations WHERE CustomerId=:id AND Status IN('Sent','Viewed') AND (ValidUntil IS NULL OR ValidUntil>=SYSUTCDATETIME())) +(SELECT COUNT(*) FROM dbo.QuotationRequests WHERE CustomerId=:id AND Status='Pending') AS quotations,(SELECT COUNT(*) FROM dbo.Wishlists WHERE CustomerId=:id) AS wishlist,(SELECT COALESCE(SUM(p.Amount),0) FROM dbo.Payments p JOIN dbo.Booking b ON b.BookingId=p.BookingId WHERE b.CustomerId=:id AND p.Currency='INR' AND p.PaymentStatus='Success') AS spent,(SELECT COUNT(*) FROM dbo.Notifications WHERE UserId=:id AND IsRead=0) AS unread`,
    { id, today: localDay() },
  );
  const [event] = await repo.select(
    `SELECT TOP(1) ${eventFields} FROM dbo.Events t WHERE t.CustomerId=:id AND t.EventDate>=:today AND t.Status IN('Planning','Confirmed') ORDER BY t.EventDate,t.EventId`,
    { id, today: localDay() },
  );
  return {
    stats,
    event: event || null,
    bookings: (await records("bookings", { pageSize: 4 }, ctx)).rows,
    notifications: (await records("notifications", { pageSize: 4 }, ctx)).rows,
  };
}
export async function saveEvent(recordId, input, ctx) {
  const { id } = scope(ctx),
    b = eventInput.parse(input);
  if (b.eventDate < localDay()) fail("Choose today or a future event date.");
  return repo.transaction(async (tx) => {
    if (recordId) {
      const old = await owned("events", recordId, id, tx);
      if (
        !b.expectedUpdatedAt ||
        new Date(old.UpdatedAt).getTime() !==
          new Date(b.expectedUpdatedAt).getTime()
      )
        fail("This event changed. Refresh before saving.", 409);
      if (old.Status === "Cancelled" || old.Status === "Completed")
        fail("This event cannot be edited.", 409);
      const [n] = await repo.select(
        "SELECT COUNT(*) AS n FROM dbo.Booking WHERE EventId=:recordId AND BookingStatus NOT IN('Cancelled','Rejected','Refunded')",
        { recordId },
        tx,
      );
      if (
        n.n &&
        (String(old.EventDate).slice(0, 10) !== b.eventDate ||
          old.City !== b.city)
      )
        fail(
          "Contact your vendors before changing the date or city of an event with bookings.",
          409,
        );
    }
    const values = {
      EventName: b.name,
      EventType: b.type,
      EventDate: b.eventDate,
      City: b.city,
      State: b.state || null,
      GuestCount: b.guests,
      Budget: b.budget,
      Description: b.description,
      UpdatedAt: new Date(),
    };
    let row;
    if (recordId) {
      await repo.update(
        { table: "Events", id: "EventId" },
        recordId,
        values,
        tx,
      );
      row = { id: recordId };
    } else
      row = await insert(
        "Events",
        "EventId",
        { ...values, CustomerId: id, Status: "Planning" },
        tx,
      );
    await audit(
      ctx,
      recordId ? "EVENT_UPDATED" : "EVENT_CREATED",
      "Events",
      row.id,
      null,
      values,
      tx,
    );
    return {
      ...row,
      message: recordId ? "Event updated." : "Your event is ready to plan.",
    };
  });
}
export async function eventDetails(recordId, ctx) {
  const { id } = scope(ctx);
  await owned("events", recordId, id, undefined, false);
  const [event] = await repo.select(
    `SELECT ${eventFields} FROM dbo.Events t WHERE t.EventId=:recordId AND t.CustomerId=:id`,
    { recordId, id },
  );
  return {
    event,
    guests: await repo.select(
      "SELECT GuestId AS id,GuestName AS name,Email AS email,Phone AS phone,RsvpStatus AS status FROM dbo.EventGuests WHERE EventId=:recordId ORDER BY CreatedAt,GuestId",
      { recordId },
    ),
    bookings: await repo.select(
      "SELECT BookingId AS id,BookingNumber AS number,TotalAmount AS amount,BookingStatus AS status FROM dbo.Booking WHERE EventId=:recordId AND CustomerId=:id ORDER BY CreatedAt DESC",
      { recordId, id },
    ),
  };
}
export async function guest(recordId, guestId, input, ctx, remove = false) {
  const { id } = scope(ctx);
  return repo.transaction(async (tx) => {
    await owned("events", recordId, id, tx);
    if (guestId) {
      z.guid().parse(guestId);
      const [old] = await repo.select(
        "SELECT GuestId FROM dbo.EventGuests WHERE GuestId=:guestId AND EventId=:recordId",
        { guestId, recordId },
        tx,
      );
      if (!old) fail("Guest not found.", 404);
    }
    if (remove) {
      await repo.select(
        "DELETE FROM dbo.EventGuests WHERE GuestId=:guestId AND EventId=:recordId",
        { guestId, recordId },
        tx,
      );
      return { message: "Guest removed." };
    }
    const b = z
      .object({
        name: z.string().trim().min(1).max(200),
        email: z.union([z.email(), z.literal("")]).default(""),
        phone: z.string().max(20).default(""),
        status: z
          .enum(["Invited", "Accepted", "Declined", "Attended"])
          .default("Invited"),
      })
      .strict()
      .parse(input);
    const values = {
      GuestName: b.name,
      Email: b.email || null,
      Phone: b.phone || null,
      RsvpStatus: b.status,
      UpdatedAt: new Date(),
    };
    if (guestId)
      await repo.update(
        { table: "EventGuests", id: "GuestId" },
        guestId,
        values,
        tx,
      );
    else
      await insert(
        "EventGuests",
        "GuestId",
        { ...values, EventId: recordId },
        tx,
      );
    await audit(
      ctx,
      "GUEST_SAVED",
      "Events",
      recordId,
      null,
      { guest: guestId || "new", status: b.status },
      tx,
    );
    return { message: "Guest saved." };
  });
}
export async function profile(ctx) {
  const { id } = scope(ctx);
  const [row] = await repo.select(
    "SELECT FirstName AS firstName,LastName AS lastName,PhoneNumber AS phone,Email AS email,DateOfBirth AS dateOfBirth,UpdatedAt AS updatedAt FROM dbo.Users WHERE UserId=:id",
    { id },
  );
  return row;
}
export async function saveProfile(input, ctx) {
  const { id } = scope(ctx);
  const b = z
    .object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().max(100),
      phone: z.union([phone, z.literal("")]),
      dateOfBirth: z.union([z.iso.date(), z.literal("")]),
      expectedUpdatedAt: z.iso.datetime(),
    })
    .strict()
    .parse(input);
  if (b.dateOfBirth && b.dateOfBirth > localDay())
    fail("Date of birth cannot be in the future.");
  return repo.transaction(async (tx) => {
    const [old] = await repo.select(
      "SELECT UpdatedAt,PhoneNumber FROM dbo.Users WITH(UPDLOCK,HOLDLOCK) WHERE UserId=:id",
      { id },
      tx,
    );
    if (
      new Date(old.UpdatedAt).getTime() !==
      new Date(b.expectedUpdatedAt).getTime()
    )
      fail("Your profile changed. Refresh before saving.", 409);
    await repo.update(
      { table: "Users", id: "UserId" },
      id,
      {
        FirstName: b.firstName,
        LastName: b.lastName || null,
        PhoneNumber: b.phone || null,
        DateOfBirth: b.dateOfBirth || null,
        ...(b.phone !== old.PhoneNumber ? { IsPhoneVerified: 0 } : {}),
        UpdatedAt: new Date(),
      },
      tx,
    );
    await audit(
      ctx,
      "PROFILE_UPDATED",
      "Users",
      id,
      null,
      { firstName: b.firstName, lastName: b.lastName },
      tx,
    );
    return { message: "Profile updated." };
  });
}
export const addressInput = z
  .object({
    type: z.enum(["Home", "Work", "Billing", "Other"]),
    line1: z.string().trim().min(3).max(300),
    line2: z.string().trim().max(300).default(""),
    landmark: z.string().trim().max(200).default(""),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().min(3).max(20),
    country: z.string().trim().min(2).max(100).default("India"),
    isDefault: z.boolean().default(false),
  })
  .strict();
export async function saveAddress(recordId, input, ctx, remove = false) {
  const { id } = scope(ctx);
  const b = remove ? null : addressInput.parse(input);
  return repo.transaction(async (tx) => {
    await repo.select(
      "SELECT UserId FROM dbo.Users WITH(UPDLOCK,HOLDLOCK) WHERE UserId=:id",
      { id },
      tx,
    );
    if (recordId) await owned("addresses", recordId, id, tx);
    if (remove) {
      await repo.select(
        "DELETE FROM dbo.Addresses WHERE AddressId=:recordId AND UserId=:id",
        { recordId, id },
        tx,
      );
      return { message: "Address removed." };
    }
    if (b.isDefault)
      await repo.select(
        "UPDATE dbo.Addresses SET IsDefault=0,UpdatedAt=SYSUTCDATETIME() WHERE UserId=:id",
        { id },
        tx,
      );
    const v = {
      AddressType: b.type,
      AddressLine1: b.line1,
      AddressLine2: b.line2 || null,
      Landmark: b.landmark || null,
      City: b.city,
      State: b.state,
      PostalCode: b.postalCode,
      Country: b.country,
      IsDefault: b.isDefault,
      UpdatedAt: new Date(),
    };
    if (recordId)
      await repo.update(
        { table: "Addresses", id: "AddressId" },
        recordId,
        v,
        tx,
      );
    else await insert("Addresses", "AddressId", { ...v, UserId: id }, tx);
    await audit(
      ctx,
      "ADDRESS_SAVED",
      "Users",
      id,
      null,
      { address: recordId || "new" },
      tx,
    );
    return { message: "Address saved." };
  });
}
export async function readNotification(recordId, ctx) {
  const { id } = scope(ctx);
  await owned("notifications", recordId, id, undefined, false);
  await repo.select(
    "UPDATE dbo.Notifications SET IsRead=1,ReadAt=COALESCE(ReadAt,SYSUTCDATETIME()) WHERE NotificationId=:recordId AND UserId=:id",
    { recordId, id },
  );
  return { message: "Notification marked as read." };
}
