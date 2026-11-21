import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { allocateBookingNumber } from "../src/modules/bookings/booking-numbers.js";
import { createBooking } from "../src/modules/customers/workspace.operations.js";
import { bookingInput } from "../src/modules/bookings/bookings.validation.js";
import { bookingCheckoutInput } from "../src/modules/shopping/booking-checkout.js";

const customer = "1d375b0c-89d2-4111-8f30-14133304fa5c";
const vendor = "2d375b0c-89d2-4111-8f30-14133304fa5c";
const service = "3d375b0c-89d2-4111-8f30-14133304fa5c";

test("allocation requires an active transaction and fails closed without a stored result", async t => {
  const query = t.mock.method(sequelize, "query", async () => []);
  for (const transaction of [undefined, null, { finished: "commit" }, { finished: "rollback" }])
    await assert.rejects(() => allocateBookingNumber(transaction), /active booking transaction/);
  assert.equal(query.mock.callCount(), 0);
  await assert.rejects(() => allocateBookingNumber({}), /allocation failed/);
});

test("allocation returns the database reference without generating it in application memory", async t => {
  const transaction = {};
  t.mock.method(sequelize, "query", async (sql, options) => {
    assert.equal(sql, "EXEC dbo.AllocateBookingNumber");
    assert.equal(options.transaction, transaction);
    return [{ number: "MNBK26100000" }];
  });
  assert.equal(await allocateBookingNumber(transaction), "MNBK26100000");
});

test("booking creation stores and reuses the allocated reference in its response, notification and audit", async t => {
  const transaction = {};
  const calls = [];
  t.mock.method(sequelize, "query", async (sql, options) => {
    calls.push({ sql, options });
    assert.equal(options.transaction, transaction);
    if (sql.includes("AS accessStatus")) return [{ accessStatus: "Approved", VerificationStatus: "Approved", IsActive: true, userActive: true, IsEmailVerified: true }];
    if (sql === "EXEC dbo.AllocateBookingNumber") return [{ number: "MNBK2600042" }];
    if (sql.startsWith("SELECT s.DetailsJson,s.MinimumGuests")) return [{ DetailsJson: "{}" }];
    return [];
  });
  const result = await createBooking(
    { EventId: null, EventDate: "2090-01-01", EventName: "Test booking", GuestCount: 1 },
    vendor,
    [{ ServiceId: service, ItemName: "Service", Quantity: 1, UnitPrice: 100 }],
    { auth: { user: { id: customer, active: true, emailVerified: true, roles: [{ code: "CUSTOMER", active: true }] } }, req: { ip: "test" } },
    transaction,
    { source: "Commerce" },
  );
  assert.equal(result.number, "MNBK2600042");
  assert.match(result.id, /^[a-f\d-]{36}$/i);
  const bookingInsert = calls.find(c => c.sql.startsWith("INSERT INTO dbo.[Booking]"));
  assert.ok(bookingInsert);
  assert.ok(Object.values(bookingInsert.options.replacements).includes(result.number));
  assert.equal(calls.filter(c => c.sql === "EXEC dbo.AllocateBookingNumber").length, 1);
  assert.ok(calls.some(c => String(c.options.replacements.message).includes(result.number)));
  assert.ok(calls.some(c => String(c.options.replacements.next).includes(result.number)));
});

test("clients cannot supply or override a booking reference", () => {
  for (const override of [{ number: "MNBK2600001" }, { BookingNumber: "MNBK2600001" }, { bookingNumber: "MNBK2600001" }]) {
    assert.equal(bookingInput.safeParse({ eventId: customer, serviceId: service, ...override }).success, false);
    assert.equal(bookingCheckoutInput.safeParse({ serviceId: service, quantity: 1, idempotencyKey: customer, ...override }).success, false);
  }
});
