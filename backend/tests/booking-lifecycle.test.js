import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingInput,
  requestInput,
  decisionInput,
} from "../src/modules/bookings/bookings.validation.js";
import {
  assertEventTime,
  assertReservation,
} from "../src/modules/bookings/reservations.js";
import {
  details,
  requestChange,
  decideChange,
  editOptionalItem,
  eligibleRequest,
} from "../src/modules/bookings/bookings.service.js";
import { calculatePriceBreakdown } from "../src/modules/vendors/service-management.validation.js";
import { sequelize } from "../src/config/database.js";
const id = "1D375B0C-89D2-F111-8F30-14133304FA5C";
const user = {
  id,
  active: true,
  emailVerified: true,
  roles: [{ code: "CUSTOMER", active: true }],
};
test("booking payloads reject client money, owner overrides, duplicate add-ons and unbounded quantities", () => {
  const valid = { eventId: id, serviceId: id };
  for (const extra of [
    { price: 1 },
    { total: 1 },
    { discount: 100 },
    { customerId: id },
    { quantity: 0 },
    { quantity: 100001 },
    {
      items: [
        { id: 1, quantity: 1 },
        { id: 1, quantity: 2 },
      ],
    },
    { items: [{ id: 1, quantity: 1, price: 1 }] },
  ])
    assert.equal(bookingInput.safeParse({ ...valid, ...extra }).success, false);
  assert.equal(bookingInput.parse(valid).quantity, 1);
});
test("change requests require a reason and valid paired times and reject arbitrary statuses", () => {
  for (const input of [
    { kind: "Cancellation", reason: "" },
    { kind: "Reschedule", reason: "Move date" },
    {
      kind: "Reschedule",
      reason: "Move date",
      date: "2090-01-10",
      start: "20:00",
      end: "19:00",
    },
    { kind: "Cancellation", reason: "Cancel event", date: "2090-01-10" },
    { kind: "Cancellation", reason: "Cancel event", status: "Approved" },
  ])
    assert.equal(requestInput.safeParse(input).success, false);
  assert.equal(
    decisionInput.safeParse({ action: "Approve", reason: "" }).success,
    false,
  );
  assert.equal(
    decisionInput.safeParse({ action: "Confirmed", reason: "Bypass workflow" })
      .success,
    false,
  );
});
test("event validation rejects past dates, elapsed starts, missing times and reversed windows", () => {
  const now = new Date("2026-10-30T10:00:00Z");
  for (const event of [
    { EventDate: "2026-10-29" },
    { EventDate: "2026-10-30", StartTime: "10:00", EndTime: "12:00" },
    { EventDate: "2026-11-01", StartTime: "12:00" },
    { EventDate: "2026-11-01", StartTime: "12:00", EndTime: "11:00" },
  ])
    assert.throws(() => assertEventTime(event, now));
  assertEventTime(
    { EventDate: "2026-11-01", StartTime: "10:00", EndTime: "12:00" },
    now,
  );
});
test("itemized price arithmetic preserves charges, discount and tax in paise", () => {
  const p = calculatePriceBreakdown(
    {
      basePrice: 1000,
      unitPrice: 10,
      minimumQuantity: 1,
      maximumQuantity: 100,
      discount: 10,
      additionalCharges: 100,
      taxRate: 18,
    },
    10,
  );
  assert.deepEqual(p, {
    subtotal: 1100,
    discount: 110,
    charges: 100,
    tax: 196.2,
    total: 1286.2,
  });
});
test("terminal and past bookings cannot create cancellation or reschedule requests", () => {
  for (const status of [
    "Cancelled",
    "Rejected",
    "Completed",
    "InProgress",
    "Disputed",
    "Refunded",
  ])
    for (const kind of ["Cancellation", "Reschedule"])
      assert.equal(
        eligibleRequest(
          { BookingStatus: status, BookingDate: "2090-01-01" },
          kind,
        ),
        false,
      );
  assert.equal(
    eligibleRequest(
      { BookingStatus: "Confirmed", BookingDate: "2000-01-01" },
      "Cancellation",
    ),
    false,
  );
  assert.equal(
    eligibleRequest(
      { BookingStatus: "Pending", BookingDate: "2090-01-01" },
      "Reschedule",
    ),
    false,
  );
});
test("lifecycle operations authorize role before accessing SQL", async () => {
  const ctx = {
    auth: { user: { ...user, roles: [{ code: "VENDOR", active: true }] } },
  };
  for (const fn of [
    () => details(id, ctx, "Customer"),
    () => requestChange(id, {}, ctx),
    () => editOptionalItem(id, 1, {}, ctx),
    () => decideChange(id, id, {}, ctx, "Admin"),
  ])
    await assert.rejects(fn, (e) => e.extensions?.code === "FORBIDDEN");
});
test("customer booking reads bind the authenticated owner and hide foreign records", async () => {
  const original = sequelize.query;
  let seen;
  sequelize.query = async (sql, options) => {
    seen = { sql, options };
    return [];
  };
  try {
    await assert.rejects(
      () => details(id, { auth: { user } }, "Customer"),
      /not found/,
    );
    assert.match(seen.sql, /CustomerId=:owner/);
    assert.equal(seen.options.replacements.owner, id);
  } finally {
    sequelize.query = original;
  }
});
test("reservation guard requires a transaction and rejects a conflicting booking before writes", async () => {
  await assert.rejects(
    () => assertReservation(id, { EventDate: "2090-01-01" }, [id]),
    /transaction/,
  );
  const original = sequelize.query;
  const calls = [];
  sequelize.query = async (sql, options) => {
    calls.push({ sql, options });
    return sql.includes("JOIN dbo.BookingItems") ? [{ BookingId: id }] : [];
  };
  try {
    await assert.rejects(
      () => assertReservation(id, { EventDate: "2090-01-01" }, [id], {}),
      /reserves/,
    );
    assert.ok(
      calls.some(
        (c) =>
          c.sql.includes("sp_getapplock") &&
          c.sql.includes("@LockOwner='Transaction'"),
      ),
    );
    assert.ok(calls.every((c) => c.options.transaction));
    assert.equal(calls.at(-1).options.replacements.day, "2090-01-01");
  } finally {
    sequelize.query = original;
  }
});

test("future reservations ignore legacy weekday and advance limits while keeping date blocks and booking holds", async (t) => {
  let blocked = false, reserved = false;
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("Status IN('Blocked','Booked')")) return blocked ? [{ AvailabilityId: 1 }] : [];
    if (sql.includes("JOIN dbo.BookingItems")) return reserved ? [{ BookingId: id }] : [];
    if (sql.startsWith("SELECT s.DetailsJson")) return [{ DetailsJson: JSON.stringify({
      availability: { days: [], advanceDays: 1, start: "09:00", end: "20:00", noticeHours: 24 },
    }) }];
    return [];
  });
  const event = { EventDate: "2090-01-01", StartTime: "10:00", EndTime: "12:00", GuestCount: 100 };
  await assert.doesNotReject(() => assertReservation(id, event, [id], {}));
  blocked = true;
  await assert.rejects(() => assertReservation(id, event, [id], {}), /unavailable on the selected date/);
  blocked = false;
  reserved = true;
  await assert.rejects(() => assertReservation(id, event, [id], {}), /reserves this service/);
  assert.ok(query.mock.calls.every(call => call.arguments[1].transaction));
});
