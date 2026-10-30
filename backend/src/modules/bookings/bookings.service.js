import { z } from "zod";
import { randomUUID } from "node:crypto";
import * as repo from "../admin/admin.repository.js";
import {
  requireRole,
  requireApprovedVendor,
} from "../../middleware/auth.middleware.js";
import {
  milestone,
  audit,
  fail,
  financialRows,
  financialSummary,
  syncPayout,
} from "../admin/booking-finance.js";
import { notifyAdmins } from "../notifications/admin-events.js";
import { assertReservation, dayOf, clockOf } from "./reservations.js";
import { requestInput, decisionInput } from "./bookings.validation.js";
import { calculatePrice } from "../vendors/service-management.validation.js";

export function roleUser(ctx, role) {
  if (!["Customer", "Vendor", "Admin"].includes(role))
    fail("Unsupported booking role.", 403);
  return role === "Vendor"
    ? requireApprovedVendor(ctx)
    : requireRole(ctx, role === "Admin" ? "ADMIN" : "CUSTOMER");
}
export async function accessible(id, ctx, role, tx, lock = false) {
  const user = roleUser(ctx, role);
  z.guid().parse(id);
  const [row] = await repo.select(
    `SELECT * FROM dbo.Booking ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE BookingId=:id ${role === "Customer" ? "AND CustomerId=:owner" : role === "Vendor" ? "AND VendorId=:owner" : ""}`,
    { id, owner: role === "Vendor" ? user.vendor.id : user.id },
    tx,
  );
  if (!row) fail("Booking not found.", 404);
  return row;
}
export const eligibleRequest = (row, kind) =>
  dayOf(row.BookingDate) >=
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) &&
  (kind === "Cancellation"
    ? ["Pending", "Accepted", "PaymentPending", "Confirmed"]
    : ["Accepted", "PaymentPending", "Confirmed"]
  ).includes(row.BookingStatus);
async function record(
  row,
  action,
  reason,
  ctx,
  role,
  tx,
  previous = row.BookingStatus,
) {
  const visibleReason = reason.slice(0, 1000);
  await repo.insert(
    { table: "BookingStatusHistory", id: "BookingStatusHistoryId" },
    {
      BookingId: row.BookingId,
      OldStatus: previous,
      NewStatus: row.BookingStatus,
      ChangedBy: ctx.auth.user.id,
      ActorRole: role,
      Reason: visibleReason,
      Remarks: visibleReason,
      PublicNote: visibleReason,
      ActionType: action,
    },
    tx,
  );
}
export async function details(id, ctx, role) {
  const row = await accessible(id, ctx, role);
  const [items, historyRows, requests, refunds] = await Promise.all([
    repo.select(
      "SELECT BookingItemId AS id,ServiceId AS serviceId,PackageId AS packageId,ServiceItemId AS serviceItemId,ItemName AS name,DescriptionSnapshot AS description,Quantity AS quantity,UnitPrice AS price,DiscountAmount AS discount,TaxAmount AS tax,LineTotal AS total FROM dbo.BookingItems WHERE BookingId=:id ORDER BY BookingItemId",
      { id },
    ),
    repo.select(
      "SELECT h.BookingStatusHistoryId AS id,h.OldStatus AS previous,h.NewStatus AS status,COALESCE(h.ActorRole,CASE WHEN h.ChangedBy IS NULL THEN 'System' WHEN h.ChangedBy=b.CustomerId THEN 'Customer' WHEN h.ChangedBy=v.UserId THEN 'Vendor' ELSE 'Admin' END) AS role,h.ActionType AS action,h.PublicNote AS note,h.CreatedAt AS createdAt FROM dbo.BookingStatusHistory h JOIN dbo.Booking b ON b.BookingId=h.BookingId JOIN dbo.Vendors v ON v.VendorId=b.VendorId WHERE h.BookingId=:id ORDER BY h.CreatedAt,h.BookingStatusHistoryId",
      { id },
    ),
    repo.select(
      "SELECT RequestId AS id,RequestedBy AS requestedBy,Kind AS kind,Status AS status,Reason AS reason,OriginalDate AS originalDate,RequestedDate AS date,CONVERT(char(5),RequestedStart,108) AS start,CONVERT(char(5),RequestedEnd,108) AS [end],DecisionReason AS decisionReason,CreatedAt AS createdAt,DecidedAt AS decidedAt FROM dbo.BookingChangeRequests WHERE BookingId=:id ORDER BY CreatedAt,RequestId",
      { id },
    ),
    repo.select(
      "SELECT RefundId AS id,RefundAmount AS amount,RefundStatus AS status,CreatedAt AS createdAt FROM dbo.Refunds WHERE BookingId=:id ORDER BY CreatedAt",
      { id },
    ),
  ]);
  const {
    AdminNotes,
    VendorNotes,
    PolicySnapshotJson,
    PriceSnapshotJson,
    ...safe
  } = row;
  const snapshot = JSON.parse(PolicySnapshotJson || "{}");
  const [vendorLabel] = await repo.select(
    "SELECT BusinessName AS name FROM dbo.Vendors WHERE VendorId=:vendor",
    { vendor: row.VendorId },
  );
  let eventSnapshot = {};
  try {
    eventSnapshot = JSON.parse(row.EventSnapshotJson || "{}");
  } catch {}
  const pending = requests.some((r) => r.status === "Pending");
  // Read the policy estimate through the existing captured/refunded ledger, and
  // expose only customer-facing financial fields (no payout or review notes).
  const summary = financialSummary(row, await financialRows(id));
  return {
    booking: safe,
    checkout: { vendor: vendorLabel?.name || "", event: eventSnapshot },
    items,
    history: historyRows,
    requests: requests.map((r) => ({
      ...r,
      canDecide:
        role === "Admin" ||
        (role === "Vendor" &&
          r.requestedBy.toLowerCase() !== ctx.auth.user.id.toLowerCase()),
    })),
    refunds,
    policy: snapshot.terms || [],
    refundEstimate: summary.refundEligible,
    refundNote: summary.policy
      ? "Estimate only; administrator review and captured payments determine the refund."
      : "Cancellation terms require administrator review before a refund can be estimated.",
    actions: {
      cancel: !pending && eligibleRequest(row, "Cancellation"),
      reschedule: !pending && eligibleRequest(row, "Reschedule"),
      reason: pending
        ? "A change request is awaiting a decision."
        : "Changes are available before the event starts, subject to vendor or administrator approval.",
    },
  };
}
export async function requestChange(id, input, ctx, role = "Customer") {
  const user = roleUser(ctx, role),
    body = requestInput.parse(input);
  if (role === "Vendor" && body.kind !== "Cancellation")
    fail("Ask the customer to submit the proposed new date.", 403);
  return repo.transaction(async (tx) => {
    const row = await accessible(id, ctx, role, tx, true);
    if (!eligibleRequest(row, body.kind))
      fail("This booking is no longer eligible for this change.");
    const [pending] = await repo.select(
      "SELECT RequestId FROM dbo.BookingChangeRequests WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=:id AND Status='Pending'",
      { id },
      tx,
    );
    if (pending) fail("A change request is already pending.");
    if (body.kind === "Reschedule") {
      if (
        body.date === dayOf(row.BookingDate) &&
        body.start === clockOf(row.StartTime) &&
        body.end === clockOf(row.EndTime)
      )
        fail("Select a different date or time.");
      await validateReschedule(row, body, tx);
    }
    const requestId = randomUUID();
    await repo.insert(
      { table: "BookingChangeRequests", id: "RequestId" },
      {
        RequestId: requestId,
        BookingId: id,
        Kind: body.kind,
        RequestedBy: user.id,
        Reason: body.reason,
        OriginalDate: row.BookingDate,
        OriginalStart: row.StartTime,
        OriginalEnd: row.EndTime,
        RequestedDate: body.date || null,
        RequestedStart: body.start,
        RequestedEnd: body.end,
      },
      tx,
    );
    await record(row, `${body.kind}Requested`, body.reason, ctx, role, tx);
    await audit(
      ctx,
      "BOOKING_CHANGE_REQUESTED",
      id,
      null,
      { requestId, ...body },
      tx,
    );
    await milestone(
      row,
      `request:${requestId}`,
      `${body.kind} requested`,
      `${row.BookingNumber}: ${body.reason}`,
      tx,
    );
    return {
      id: requestId,
      message: `${body.kind} requested. The original reservation remains in place until approval.`,
    };
  });
}
async function validateReschedule(row, body, tx) {
  const event = JSON.parse(row.EventSnapshotJson || "{}");
  const services = await repo.select(
    "SELECT DISTINCT ServiceId FROM dbo.BookingItems WHERE BookingId=:id",
    { id: row.BookingId },
    tx,
  );
  await assertReservation(
    row.VendorId,
    {
      EventDate: body.date,
      StartTime: body.start,
      EndTime: body.end,
      City: event.city,
      GuestCount: event.guests,
    },
    services.map((s) => s.ServiceId),
    tx,
    row.BookingId,
  );
  const price = JSON.parse(row.PriceSnapshotJson || "null");
  if (!price)
    fail(
      "Historical booking terms require a new quotation before rescheduling.",
    );
  if (price.pricing) {
    const before = calculatePrice(
        price.pricing,
        price.quantity,
        dayOf(row.BookingDate),
      ),
      after = calculatePrice(price.pricing, price.quantity, body.date);
    if (Math.round(before * 100) !== Math.round(after * 100))
      fail(
        "The new date changes the agreed price. Request a revised quotation and agree payment terms before rescheduling.",
      );
  }
}
export async function decideChange(id, requestId, input, ctx, role) {
  const user = roleUser(ctx, role),
    body = decisionInput.parse(input);
  if (!["Vendor", "Admin"].includes(role))
    fail("Only a vendor or administrator can review changes.", 403);
  z.guid().parse(requestId);
  return repo.transaction(async (tx) => {
    const row = await accessible(id, ctx, role, tx, true);
    const [request] = await repo.select(
      "SELECT * FROM dbo.BookingChangeRequests WITH(UPDLOCK,HOLDLOCK) WHERE RequestId=:requestId AND BookingId=:id",
      { id, requestId },
      tx,
    );
    if (!request) fail("Request not found.", 404);
    if (request.Status !== "Pending")
      fail("This request has already been decided.");
    if (
      role === "Vendor" &&
      request.RequestedBy.toLowerCase() === user.id.toLowerCase()
    )
      fail("An administrator must review vendor-initiated cancellation.", 403);
    const approved = body.action === "Approve";
    if (approved && !eligibleRequest(row, request.Kind))
      fail("The booking changed. Reject this request or review the booking.");
    if (
      approved &&
      (dayOf(row.BookingDate) !== dayOf(request.OriginalDate) ||
        clockOf(row.StartTime) !== clockOf(request.OriginalStart) ||
        clockOf(row.EndTime) !== clockOf(request.OriginalEnd))
    )
      fail(
        "The original booking dates changed. Reject this request and submit a new one.",
      );
    const previous = row.BookingStatus;
    if (approved && request.Kind === "Reschedule") {
      const next = {
        date: dayOf(request.RequestedDate),
        start: clockOf(request.RequestedStart),
        end: clockOf(request.RequestedEnd),
      };
      await validateReschedule(row, next, tx);
      await repo.update(
        { table: "Booking", id: "BookingId" },
        id,
        {
          BookingDate: next.date,
          StartTime: next.start,
          EndTime: next.end,
          UpdatedAt: new Date(),
        },
        tx,
      );
    }
    if (approved && request.Kind === "Cancellation") {
      const ledger = await financialRows(id, tx, true);
      if (
        ledger.payouts.some((p) =>
          ["Paid", "Processing"].includes(p.PayoutStatus),
        )
      )
        fail(
          "An administrator must reconcile the existing payout before cancellation.",
        );
      row.BookingStatus = "Cancelled";
      await repo.update(
        { table: "Booking", id: "BookingId" },
        id,
        {
          BookingStatus: "Cancelled",
          CancelledAt: new Date(),
          CancelledBy: user.id,
          CancellationReason: request.Reason,
          UpdatedAt: new Date(),
        },
        tx,
      );
      await syncPayout(row, ctx, tx);
      if (ledger.payments.some((p) => p.PaymentStatus === "Success"))
        await notifyAdmins("BOOKING_REFUND_REVIEW_REQUIRED", "Booking", id, tx);
    }
    const status = approved ? "Approved" : "Rejected";
    await repo.update(
      { table: "BookingChangeRequests", id: "RequestId" },
      requestId,
      {
        Status: status,
        DecidedBy: user.id,
        DecisionReason: body.reason,
        DecidedAt: new Date(),
      },
      tx,
    );
    await record(
      row,
      `${request.Kind}${status}`,
      `${body.reason}${approved && request.Kind === "Reschedule" ? ` (${dayOf(request.OriginalDate)} → ${dayOf(request.RequestedDate)})` : ""}`,
      ctx,
      role,
      tx,
      previous,
    );
    await audit(
      ctx,
      "BOOKING_CHANGE_DECIDED",
      id,
      { requestId, status: "Pending" },
      { status, reason: body.reason },
      tx,
    );
    await milestone(
      row,
      `decision:${requestId}`,
      `${request.Kind} ${status.toLowerCase()}`,
      `${row.BookingNumber}: ${body.reason}${approved && request.Kind === "Cancellation" ? " Any refund requires a separate financial review." : ""}`,
      tx,
    );
    return { message: `${request.Kind} ${status.toLowerCase()}.` };
  });
}
export async function assertBookingReservation(row, tx) {
  const event =
    JSON.parse(row.EventSnapshotJson || "null") ||
    (
      await repo.select(
        "SELECT City AS city,GuestCount AS guests,StartTime,EndTime FROM dbo.Events WHERE EventId=:id",
        { id: row.EventId },
        tx,
      )
    )[0];
  const items = await repo.select(
    "SELECT DISTINCT ServiceId FROM dbo.BookingItems WHERE BookingId=:id",
    { id: row.BookingId },
    tx,
  );
  await assertReservation(
    row.VendorId,
    {
      EventDate: row.BookingDate,
      StartTime: row.StartTime ?? event?.StartTime,
      EndTime: row.EndTime ?? event?.EndTime,
      City: event?.city,
      GuestCount: event?.guests,
    },
    items.map((i) => i.ServiceId),
    tx,
    row.BookingId,
  );
}
export async function editOptionalItem(id, itemId, input, ctx, remove = false) {
  roleUser(ctx, "Customer");
  const item = z.coerce.number().int().positive().parse(itemId);
  const body = remove
    ? z.object({}).strict().parse(input)
    : z
        .object({ quantity: z.coerce.number().int().min(1).max(100000) })
        .strict()
        .parse(input);
  return repo.transaction(async (tx) => {
    const row = await accessible(id, ctx, "Customer", tx, true);
    if (row.BookingStatus !== "Pending" || Number(row.PaidAmount) > 0)
      fail("Items can only change before vendor acceptance and payment.");
    const [pending] = await repo.select(
      "SELECT RequestId FROM dbo.BookingChangeRequests WHERE BookingId=:id AND Status='Pending'",
      { id },
      tx,
    );
    if (pending)
      fail("Resolve the pending change request before editing items.");
    const [old] = await repo.select(
      "SELECT * FROM dbo.BookingItems WITH(UPDLOCK,HOLDLOCK) WHERE BookingItemId=:item AND BookingId=:id AND ServiceItemId IS NOT NULL",
      { item, id },
      tx,
    );
    if (!old) fail("Optional booking item not found.", 404);
    // Snapshotted unit prices are authoritative; no caller-supplied money is accepted.
    if (remove)
      await repo.select(
        "DELETE FROM dbo.BookingItems WHERE BookingItemId=:item AND BookingId=:id",
        { item, id },
        tx,
      );
    else
      await repo.update(
        { table: "BookingItems", id: "BookingItemId" },
        item,
        { Quantity: body.quantity },
        tx,
      );
    const [sums] = await repo.select(
      "SELECT SUM(ROUND(Quantity*UnitPrice,2)) AS subtotal,SUM(DiscountAmount) AS discount,SUM(TaxAmount) AS tax FROM dbo.BookingItems WHERE BookingId=:id",
      { id },
      tx,
    );
    const total =
      Number(sums.subtotal) -
      Number(sums.discount) +
      Number(sums.tax) +
      Number(row.PlatformFee);
    if (!Number.isFinite(total) || total <= 0 || total > 1e8)
      fail("The booking total is outside the supported limits.");
    const snapshot = JSON.parse(row.PriceSnapshotJson || "{}");
    snapshot.total = total;
    snapshot.advance =
      Math.round(
        total *
          (snapshot.policies?.advanceRequired
            ? Number(snapshot.policies.advancePercentage || 0)
            : 0),
      ) / 100;
    await repo.update(
      { table: "Booking", id: "BookingId" },
      id,
      {
        SubTotal: sums.subtotal,
        DiscountAmount: sums.discount,
        TaxAmount: sums.tax,
        AdvanceAmount: snapshot.advance,
        PriceSnapshotJson: JSON.stringify(snapshot),
        UpdatedAt: new Date(),
      },
      tx,
    );
    await record(
      row,
      remove ? "ItemRemoved" : "ItemQuantityChanged",
      `${old.ItemName}: ${remove ? "removed" : `${old.Quantity} → ${body.quantity}`}`,
      ctx,
      "Customer",
      tx,
    );
    await audit(
      ctx,
      "BOOKING_ITEM_CHANGED",
      id,
      old,
      { item, quantity: remove ? 0 : body.quantity, total },
      tx,
    );
    await milestone(
      row,
      `item:${randomUUID()}`,
      "Booking items updated",
      `${row.BookingNumber}: the customer updated optional items before acceptance.`,
      tx,
    );
    return { message: "Booking items and totals updated." };
  });
}
