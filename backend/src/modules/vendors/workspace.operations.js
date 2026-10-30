import {
  milestone as bookingMilestone,
  financialRows,
  syncPayout,
} from "../admin/booking-finance.js";
import { assertBookingReservation } from "../bookings/bookings.service.js";
import { notifyAdmins } from "../notifications/admin-events.js";
import * as quotations from "../quotations/quotations.service.js";
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
import { availabilityInput } from "./workspace.validation.js";

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
      await assertBookingReservation(old, tx);
    }
    if (next === "Rejected") {
      const ledger = await financialRows(old.BookingId, tx, true);
      if (
        ledger.payouts.some((p) =>
          ["Paid", "Processing"].includes(p.PayoutStatus),
        )
      )
        fail(
          "An administrator must reconcile the existing payout before rejection.",
          409,
        );
      if (
        Number(old.PaidAmount) > 0 ||
        ledger.payments.some((p) => p.PaymentStatus === "Success")
      )
        await notifyAdmins(
          "BOOKING_REFUND_REVIEW_REQUIRED",
          "Booking",
          old.BookingId,
          tx,
        );
      await syncPayout({ ...old, BookingStatus: "Rejected" }, ctx, tx);
    }
    await repo.update(
      { table: "Booking", id: "BookingId" },
      old.BookingId,
      {
        BookingStatus: next,
        ...(next === "Rejected"
          ? {
              CancelledAt: new Date(),
              CancelledBy: user.id,
              CancellationReason: body.note,
            }
          : {}),
        VendorNotes: body.note || old.VendorNotes,
        UpdatedAt: new Date(),
      },
      tx,
    );
    await repo.select(
      "INSERT INTO dbo.BookingStatusHistory(BookingId,OldStatus,NewStatus,ChangedBy,Remarks,PublicNote,ActorRole,ActionType) VALUES(:booking,:previous,:next,:user,:note,:note,'Vendor','VendorDecision')",
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
    await bookingMilestone(
      old,
      `status:${next}`,
      `Booking ${next.toLowerCase()}`,
      `${old.BookingNumber} has been ${next.toLowerCase()}.${body.note ? ` ${body.note}` : ""}`,
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
  const requests = await repo.select(
    "SELECT RequestId AS id,RequestNumber AS number,EventId AS eventId,OriginalQuotationId AS previousQuotationId,Message AS message FROM dbo.QuotationRequests WHERE VendorId=:id AND Status='Pending' ORDER BY CreatedAt DESC",
    { id },
  );
  const items = await repo.select(
    "SELECT si.ServiceItemId AS id,si.ServiceId AS serviceId,si.ItemName AS name,si.Description AS description,si.Unit AS unit,si.UnitPrice AS price FROM dbo.ServiceItems si JOIN dbo.Services s ON s.ServiceId=si.ServiceId WHERE s.VendorId=:id ORDER BY s.ServiceName,si.SortOrder,si.ServiceItemId",
    { id },
  );
  return { events, packages, requests, items };
}
export const saveQuote = (id, input, ctx) => quotations.save(id, input, ctx);
export async function quoteDetails(id, ctx) {
  const d = await quotations.details(id, ctx, "Vendor");
  return {
    ...d,
    id: d.quotation.QuotationId,
    eventId: d.quotation.EventId,
    validUntil: d.quotation.ValidUntil,
    message: d.quotation.VendorMessage || "",
    status: d.quotation.Status,
    updatedAt: d.quotation.UpdatedAt,
  };
}
export const quoteAction = (id, input, ctx) =>
  quotations.action(id, input, ctx);
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
