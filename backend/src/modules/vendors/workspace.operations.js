import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  scope,
  repo,
  owned,
  audit,
  fail,
  assertVersion,
  notifyCustomer,
} from "./workspace.common.js";
import { availabilityInput, quoteInput } from "./workspace.validation.js";

export async function bookingDecision(recordId, input, ctx) {
  const { id, user } = scope(ctx),
    body = z
      .object({
        action: z.enum(["Accept", "Reject"]),
        note: z.string().trim().max(1000).default(""),
        expectedUpdatedAt: z.iso.datetime().optional(),
      })
      .strict()
      .parse(input);
  if (body.action === "Reject" && !body.note)
    fail("Provide a reason for rejecting the booking.");
  return repo.transaction(async (tx) => {
    const old = await owned("bookings", recordId, id, tx);
    assertVersion(old, body.expectedUpdatedAt);
    if (old.BookingStatus !== "Pending")
      fail("This request is no longer pending. Refresh the booking list.", 409);
    const next = body.action === "Accept" ? "Accepted" : "Rejected";
    if (next === "Accepted") {
      const [blocked] = await repo.select(
        "SELECT TOP(1) AvailabilityId FROM dbo.VendorAvailability WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:id AND AvailableDate=:date AND Status='Blocked' AND (ServiceId IS NULL OR ServiceId IN (SELECT ServiceId FROM dbo.BookingItems WHERE BookingId=:booking))",
        { id, date: old.BookingDate, booking: old.BookingId },
        tx,
      );
      if (blocked)
        fail(
          "This date is blocked. Update availability before accepting.",
          409,
        );
    }
    await repo.update(
      { table: "Booking", id: "BookingId" },
      old.BookingId,
      {
        BookingStatus: next,
        VendorNotes: body.note || old.VendorNotes,
        UpdatedAt: new Date(),
      },
      tx,
    );
    await repo.select(
      "INSERT INTO dbo.BookingStatusHistory(BookingId,OldStatus,NewStatus,ChangedBy,Remarks) VALUES(:booking,:previous,:next,:user,:note)",
      {
        booking: old.BookingId,
        previous: old.BookingStatus,
        next,
        user: user.id,
        note: body.note,
      },
      tx,
    );
    await audit(
      ctx,
      "BOOKING_DECISION",
      "Booking",
      old.BookingId,
      { status: old.BookingStatus },
      { status: next, note: body.note },
      tx,
    );
    await notifyCustomer(
      old.CustomerId,
      `Booking ${next.toLowerCase()}`,
      `${old.BookingNumber} has been ${next.toLowerCase()}.${body.note ? ` ${body.note}` : ""}`,
      "Booking",
      old.BookingId,
      tx,
    );
    return {
      message: `Booking ${next.toLowerCase()}. The customer has been notified.`,
    };
  });
}
export async function quotationOptions(ctx) {
  const { id } = scope(ctx);
  const events = await repo.select(
    "SELECT e.EventId AS id,e.EventName AS name,e.EventDate AS eventDate,e.CustomerId AS customerId,CONCAT(u.FirstName,' ',u.LastName) AS customer FROM dbo.Events e JOIN dbo.Users u ON u.UserId=e.CustomerId WHERE EXISTS(SELECT 1 FROM dbo.Booking b WHERE b.VendorId=:id AND b.EventId=e.EventId) OR EXISTS(SELECT 1 FROM dbo.Quotations q WHERE q.VendorId=:id AND q.EventId=e.EventId) OR EXISTS(SELECT 1 FROM dbo.QuotationRequests qr WHERE qr.VendorId=:id AND qr.EventId=e.EventId) ORDER BY e.EventDate DESC",
    { id },
  );
  const packages = await repo.select(
    "SELECT p.PackageId AS id,p.ServiceId AS serviceId,p.PackageName AS name,p.FinalPrice AS price FROM dbo.ServicePackages p JOIN dbo.Services s ON s.ServiceId=p.ServiceId WHERE s.VendorId=:id AND p.IsActive=1",
    { id },
  );
  return { events, packages };
}
export async function saveQuote(recordId, input, ctx) {
  const { id } = scope(ctx),
    body = quoteInput.parse(input);
  if (
    body.validUntil <
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  )
    fail("Choose a valid future quotation expiry date.");
  return repo.transaction(async (tx) => {
    const old = recordId ? await owned("quotations", recordId, id, tx) : null;
    if (old) {
      assertVersion(old, body.expectedUpdatedAt);
      if (old.Status !== "Draft")
        fail("Only draft quotations can be edited.", 409);
    }
    const [event] = await repo.select(
      "SELECT EventId,CustomerId FROM dbo.Events e WHERE EventId=:event AND (EXISTS(SELECT 1 FROM dbo.Booking b WHERE b.VendorId=:id AND b.EventId=e.EventId) OR EXISTS(SELECT 1 FROM dbo.Quotations q WHERE q.VendorId=:id AND q.EventId=e.EventId) OR EXISTS(SELECT 1 FROM dbo.QuotationRequests qr WHERE qr.VendorId=:id AND qr.EventId=e.EventId))",
      { event: body.eventId, id },
      tx,
    );
    if (!event)
      fail("Choose an event belonging to one of your customers.", 404);
    for (const line of body.items) {
      const service = await owned("services", line.serviceId, id, tx);
      if (
        body.status === "Sent" &&
        (!service.IsActive || service.ApprovalStatus !== "Approved")
      )
        fail(
          "Only active, approved services can be sent in a customer quotation.",
        );
      if (line.packageId) {
        const pack = await owned("packages", line.packageId, id, tx);
        if (pack.ServiceId.toLowerCase() !== line.serviceId.toLowerCase())
          fail("Package does not belong to the selected service.");
        if (body.status === "Sent" && !pack.IsActive)
          fail("Activate the selected package before sending this quotation.");
      }
    }
    const round = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
    const subTotal = round(
        body.items.reduce((sum, x) => sum + x.quantity * x.price, 0),
      ),
      discount = round(body.items.reduce((sum, x) => sum + x.discount, 0)),
      tax = round(body.items.reduce((sum, x) => sum + x.tax, 0));
    if (subTotal > 100000000 || tax > 100000000)
      fail("Quotation total exceeds the supported amount.");
    const quoteId = old?.QuotationId || randomUUID(),
      values = {
        EventId: body.eventId,
        CustomerId: event.CustomerId,
        VendorId: id,
        ValidUntil: new Date(`${body.validUntil}T23:59:59+05:30`),
        SubTotal: subTotal,
        DiscountAmount: discount,
        TaxAmount: tax,
        Status: body.status,
        VendorMessage: body.message,
        UpdatedAt: new Date(),
      };
    if (old)
      await repo.update(
        { table: "Quotations", id: "QuotationId" },
        quoteId,
        values,
        tx,
      );
    else
      await repo.insert(
        { table: "Quotations", id: "QuotationId" },
        {
          ...values,
          QuotationId: quoteId,
          QuotationNumber: `QT-${Date.now().toString(36).toUpperCase()}-${quoteId.slice(0, 8).toUpperCase()}`,
        },
        tx,
      );
    await repo.select(
      "DELETE FROM dbo.QuotationItems WHERE QuotationId=:id",
      { id: quoteId },
      tx,
    );
    for (const line of body.items)
      await repo.insert(
        { table: "QuotationItems", id: "QuotationItemId" },
        {
          QuotationId: quoteId,
          ServiceId: line.serviceId,
          PackageId: line.packageId || null,
          ItemName: line.name,
          Quantity: line.quantity,
          UnitPrice: line.price,
          DiscountAmount: line.discount,
          TaxAmount: line.tax,
        },
        tx,
      );
    await audit(
      ctx,
      "QUOTATION_SAVED",
      "Quotations",
      quoteId,
      old ? { status: old.Status } : null,
      { status: body.status, total: round(subTotal - discount + tax) },
      tx,
    );
    if (body.status === "Sent")
      await repo.select(
        "UPDATE dbo.QuotationRequests SET Status='Responded' WHERE VendorId=:id AND EventId=:event AND Status='Pending' AND ServiceId IN(SELECT ServiceId FROM dbo.QuotationItems WHERE QuotationId=:quote)",
        { id, event: body.eventId, quote: quoteId },
        tx,
      );
    if (body.status === "Sent")
      await notifyCustomer(
        event.CustomerId,
        "New quotation received",
        "A vendor has sent you a quotation for your event.",
        "Quotation",
        quoteId,
        tx,
      );
    return {
      id: quoteId,
      message:
        body.status === "Sent"
          ? "Quotation sent to the customer."
          : "Quotation saved as a draft.",
    };
  });
}
export async function quoteDetails(recordId, ctx) {
  const { id } = scope(ctx),
    row = await owned("quotations", recordId, id, undefined, false);
  const items = await repo.select(
    "SELECT ServiceId AS serviceId,PackageId AS packageId,ItemName AS name,Quantity AS quantity,UnitPrice AS price,DiscountAmount AS discount,TaxAmount AS tax FROM dbo.QuotationItems WHERE QuotationId=:id ORDER BY QuotationItemId",
    { id: row.QuotationId },
  );
  return {
    id: row.QuotationId,
    eventId: row.EventId,
    validUntil: row.ValidUntil,
    message: row.VendorMessage || "",
    status: row.Status,
    items,
    updatedAt: row.UpdatedAt,
  };
}
export async function quoteAction(recordId, input, ctx) {
  const { id } = scope(ctx),
    body = z
      .object({
        action: z.enum(["Send", "Cancel"]),
        expectedUpdatedAt: z.iso.datetime().optional(),
      })
      .strict()
      .parse(input);
  return repo.transaction(async (tx) => {
    const row = await owned("quotations", recordId, id, tx);
    assertVersion(row, body.expectedUpdatedAt);
    if (
      !(body.action === "Send"
        ? row.Status === "Draft"
        : ["Draft", "Sent", "Viewed"].includes(row.Status))
    )
      fail("This quotation can no longer be changed.", 409);
    if (
      body.action === "Send" &&
      row.ValidUntil &&
      new Date(row.ValidUntil) < new Date()
    )
      fail("Update the expiry date before sending this quotation.");
    if (body.action === "Send") {
      const [check] = await repo.select(
        "SELECT COUNT(*) AS total,SUM(CASE WHEN s.ServiceId IS NULL OR s.VendorId<>:vendor OR s.ApprovalStatus<>'Approved' OR s.IsActive=0 OR (qi.PackageId IS NOT NULL AND (p.PackageId IS NULL OR p.IsActive=0 OR p.ServiceId<>s.ServiceId)) THEN 1 ELSE 0 END) AS invalid FROM dbo.QuotationItems qi LEFT JOIN dbo.Services s ON s.ServiceId=qi.ServiceId LEFT JOIN dbo.ServicePackages p ON p.PackageId=qi.PackageId WHERE qi.QuotationId=:quote",
        { vendor: id, quote: row.QuotationId },
        tx,
      );
      if (!check.total || Number(check.invalid))
        fail(
          "A quoted service or package needs approval or activation. Edit this draft before sending.",
          409,
        );
    }
    const next = body.action === "Send" ? "Sent" : "Cancelled";
    if (body.action === "Send")
      await repo.select(
        "UPDATE dbo.QuotationRequests SET Status='Responded' WHERE VendorId=:id AND EventId=:event AND Status='Pending' AND ServiceId IN(SELECT ServiceId FROM dbo.QuotationItems WHERE QuotationId=:quote)",
        { id, event: row.EventId, quote: row.QuotationId },
        tx,
      );
    await repo.update(
      { table: "Quotations", id: "QuotationId" },
      row.QuotationId,
      { Status: next, UpdatedAt: new Date() },
      tx,
    );
    await audit(
      ctx,
      "QUOTATION_STATUS",
      "Quotations",
      row.QuotationId,
      { status: row.Status },
      { status: next },
      tx,
    );
    if (body.action === "Send" || row.Status !== "Draft")
      await notifyCustomer(
        row.CustomerId,
        `Quotation ${next.toLowerCase()}`,
        "A vendor updated your event quotation.",
        "Quotation",
        row.QuotationId,
        tx,
      );
    return { message: `Quotation ${next.toLowerCase()}.` };
  });
}
export async function calendar(month, ctx) {
  const { id } = scope(ctx);
  z.string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .parse(month);
  const start = `${month}-01`,
    next = new Date(`${start}T12:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const end = next.toISOString().slice(0, 10);
  const slots = await repo.select(
    "SELECT a.AvailabilityId AS id,a.ServiceId AS serviceId,s.ServiceName AS service,CONVERT(char(10),a.AvailableDate,120) AS date,CONVERT(varchar(5),a.StartTime,108) AS startTime,CONVERT(varchar(5),a.EndTime,108) AS endTime,a.Status AS status,a.Notes AS notes FROM dbo.VendorAvailability a LEFT JOIN dbo.Services s ON s.ServiceId=a.ServiceId WHERE a.VendorId=:id AND a.AvailableDate>=:start AND a.AvailableDate< :end ORDER BY a.AvailableDate,a.StartTime",
    { id, start, end },
  );
  const bookings = await repo.select(
    "SELECT BookingId AS id,BookingNumber AS number,CONVERT(char(10),BookingDate,120) AS date,BookingStatus AS status FROM dbo.Booking WHERE VendorId=:id AND BookingDate>=:start AND BookingDate< :end AND BookingStatus IN ('Pending','Accepted','PaymentPending','Confirmed','InProgress') ORDER BY BookingDate",
    { id, start, end },
  );
  return { slots, bookings, month };
}
export async function setAvailability(input, ctx) {
  const { id } = scope(ctx),
    body = availabilityInput.parse(input);
  return repo.transaction(async (tx) => {
    if (body.serviceId) await owned("services", body.serviceId, id, tx);
    await repo.select(
      "DECLARE @result int; EXEC @result=sp_getapplock @Resource=:lockKey,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @result<0 THROW 51000,'Availability is being updated. Try again.',1;",
      { lockKey: `VendorAvailability:${id}` },
      tx,
    );
    if (body.status === "Blocked") {
      const [booked] = await repo.select(
        "SELECT TOP(1) b.BookingId FROM dbo.Booking b WHERE b.VendorId=:id AND b.BookingDate BETWEEN :start AND :end AND b.BookingStatus IN ('Accepted','PaymentPending','Confirmed','InProgress') AND (:service IS NULL OR EXISTS(SELECT 1 FROM dbo.BookingItems bi WHERE bi.BookingId=b.BookingId AND bi.ServiceId=:service))",
        { id, start: body.from, end: body.to, service: body.serviceId },
        tx,
      );
      if (booked)
        fail(
          "An accepted or confirmed booking exists in this range. Resolve it before blocking these dates.",
          409,
        );
    }
    for (
      let d = new Date(`${body.from}T12:00:00Z`);
      d <= new Date(`${body.to}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const date = d.toISOString().slice(0, 10),
        params = {
          id,
          date,
          service: body.serviceId,
          status: body.status,
          start: body.startTime,
          end: body.endTime,
          notes: body.notes,
        };
      const [existing] = await repo.select(
        "SELECT AvailabilityId,Status FROM dbo.VendorAvailability WHERE VendorId=:id AND AvailableDate=:date AND (ServiceId=:service OR (ServiceId IS NULL AND :service IS NULL))",
        params,
        tx,
      );
      if (existing?.Status === "Booked")
        fail(
          "Booked availability cannot be overwritten. Resolve the associated booking first.",
          409,
        );
      if (existing)
        await repo.select(
          "UPDATE dbo.VendorAvailability SET Status=:status,StartTime=:start,EndTime=:end,Notes=:notes WHERE AvailabilityId=:record AND VendorId=:id",
          { ...params, record: existing.AvailabilityId },
          tx,
        );
      else
        await repo.select(
          "INSERT INTO dbo.VendorAvailability(VendorId,ServiceId,AvailableDate,StartTime,EndTime,Status,Notes) VALUES(:id,:service,:date,:start,:end,:status,:notes)",
          params,
          tx,
        );
    }
    await audit(ctx, "AVAILABILITY_UPDATED", "Vendors", id, null, body, tx);
    return { message: "Availability updated." };
  });
}
