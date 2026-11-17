// Exercises the real migration/procedure on isolated tables in a temporary
// schema. Existing application bookings and counters are never changed.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { sequelize } from "../src/config/database.js";
import { bookingNotificationText } from "../src/modules/bookings/booking-notification-reference.js";

const migration = await readFile(new URL("../migrations/032-booking-numbers.sql", import.meta.url), "utf8");
const reference = n => `MNBK26${String(n).padStart(5, "0")}`;
const rollback = new Error("ROLLBACK_BOOKING_NUMBERS_VERIFICATION");

async function verify(existing) {
  const schema = `BookingNumbersTest_${randomUUID().replaceAll("-", "")}`;
  const sql = async (query, replacements = {}, transaction) =>
    (await sequelize.query(query.replaceAll("dbo.", `${schema}.`), { replacements, transaction }))[0];
  const allocate = async transaction => (await sql("EXEC dbo.AllocateBookingNumber", {}, transaction))[0].number;
  const insert = (number, transaction) => sql(
    "INSERT dbo.Booking(BookingId,BookingNumber,CreatedAt,BusinessState) OUTPUT inserted.BookingId AS id VALUES(:id,:number,SYSUTCDATETIME(),'Pending')",
    { id: randomUUID(), number }, transaction,
  );
  const migrate = () => sql(migration);
  try {
    await sequelize.query(`CREATE SCHEMA ${schema}`);
    await sql(`CREATE TABLE dbo.Booking (
      BookingId uniqueidentifier NOT NULL PRIMARY KEY,
      BookingNumber varchar(40) NOT NULL UNIQUE,
      CreatedAt datetime2 NOT NULL,
      BusinessState varchar(30) NOT NULL
    );
    CREATE TABLE dbo.Notifications (
      Title nvarchar(200), Message nvarchar(2000), ReferenceType varchar(50), ReferenceId uniqueidentifier
    );`);
    const before = [];
    for (let index = 0; index < existing; index++) {
      const row = { id: randomUUID(), number: index === 1 ? "MNBK2600001" : `OLD-BOOKING-${index}`, date: `2026-01-0${index + 1}` };
      before.push(row);
      await sql("INSERT dbo.Booking VALUES(:id,:number,:date,'Confirmed')", row);
    }
    await migrate();
    const after = await sql("SELECT * FROM dbo.Booking ORDER BY CreatedAt,BookingId");
    assert.equal(after.length, existing);
    after.forEach((row, index) => {
      assert.equal(row.BookingId.toLowerCase(), before[index].id);
      assert.equal(row.BookingNumber, reference(index + 1));
      assert.equal(row.LegacyBookingNumber, before[index].number);
      assert.equal(row.BusinessState, "Confirmed");
    });
    await assert.rejects(() => allocate(), /requires the booking transaction/);

    // Allocation and its later booking insert both roll back on any failure.
    await assert.rejects(() => sequelize.transaction(async tx => {
      const number = await allocate(tx);
      assert.equal(number, reference(existing + 1));
      await insert(number, tx);
      throw rollback;
    }), error => error === rollback);
    const numbers = await Promise.all(Array.from({ length: 20 }, () =>
      sequelize.transaction(async tx => {
        const number = await allocate(tx);
        await insert(number, tx);
        return number;
      }),
    ));
    assert.deepEqual(numbers.sort(), Array.from({ length: 20 }, (_, i) => reference(existing + i + 1)));
    const [counter] = await sql("SELECT LastValue FROM dbo.BookingNumberCounter");
    assert.equal(Number(counter.LastValue), existing + 20);

    await migrate();
    assert.deepEqual(await sql("SELECT * FROM dbo.Booking ORDER BY CreatedAt,BookingId"),
      [...after, ...(await sql("SELECT * FROM dbo.Booking WHERE BusinessState='Pending' ORDER BY CreatedAt,BookingId"))]);
    await assert.rejects(() => insert(reference(1)), error => error.name === "SequelizeUniqueConstraintError");
    for (const invalid of ["BK-OLD", "mnbk2600024", "MNBK2600000", "MNBK26000024", "MNBK2600024 "])
      await assert.rejects(() => insert(invalid), /CHECK constraint/i);
    await assert.rejects(() => sql("UPDATE dbo.Booking SET BookingNumber='MNBK2699999' WHERE BookingNumber=:number", { number: reference(1) }), /cannot be changed/);
    await sql("UPDATE dbo.Booking SET BusinessState='Completed' WHERE BookingNumber=:number", { number: reference(1) });
    assert.equal((await sql("SELECT BookingNumber FROM dbo.Booking WHERE BusinessState='Completed'"))[0].BookingNumber, reference(1));

    // Check rollover without truncation and verify the bigint limit fails closed.
    await assert.rejects(() => sequelize.transaction(async tx => {
      await sql("UPDATE dbo.BookingNumberCounter SET LastValue=99998", {}, tx);
      assert.equal(await allocate(tx), "MNBK2699999");
      assert.equal(await allocate(tx), "MNBK26100000");
      throw rollback;
    }), error => error === rollback);
    await assert.rejects(() => sequelize.transaction(async tx => {
      await sql("UPDATE dbo.BookingNumberCounter SET LastValue=9223372036854775806", {}, tx);
      assert.equal(await allocate(tx), "MNBK269223372036854775807");
      await allocate(tx);
    }), /missing or exhausted/);

    // A waiting transaction may reuse an uncommitted number only after rollback.
    const first = await sequelize.transaction();
    let waiting;
    try {
      const rolledBackNumber = await allocate(first);
      waiting = sequelize.transaction(async tx => {
        const number = await allocate(tx);
        await insert(number, tx);
        return number;
      });
      // Attach a rejection handler immediately while releasing the first lock.
      waiting.catch(() => {});
      await first.rollback();
      assert.equal(await waiting, rolledBackNumber);
    } finally {
      if (!first.finished) await first.rollback();
      if (waiting) await waiting;
    }

    if (existing) {
      await sql("INSERT dbo.Notifications VALUES('Booking created',:message,'Booking',:id),('New booking','Open the record.','AdminBooking',:id)", {
        message: `${before[0].number} has been created.`, id: before[0].id,
      });
      const notifications = await sql(`SELECT ${bookingNotificationText("Message")} AS message FROM dbo.Notifications t ORDER BY ReferenceType`);
      assert.ok(notifications.every(n => n.message.includes(reference(1))));
      assert.ok(notifications.every(n => !n.message.includes(before[0].number)));
      assert.equal((await sql("SELECT Message FROM dbo.Notifications WHERE ReferenceType='Booking'"))[0].Message, `${before[0].number} has been created.`);
    }
    console.log(`PASS: ${existing ? "legacy backfill" : "empty database"}, 20 concurrent commits, rollback, rerun, uniqueness, format, immutability, counter limits${existing ? ", notification references" : ""}.`);
  } finally {
    // schema is generated above and contains only these verification objects.
    await sql(`DROP PROCEDURE IF EXISTS dbo.AllocateBookingNumber;
      DROP TABLE IF EXISTS dbo.Notifications;
      DROP TABLE IF EXISTS dbo.Booking;
      DROP TABLE IF EXISTS dbo.BookingNumberCounter;`);
    await sequelize.query(`DROP SCHEMA ${schema}`);
  }
}

try {
  await sequelize.authenticate();
  await verify(0);
  await verify(3);
  console.log("Booking number database verification passed; temporary schemas removed.");
} catch (error) {
  console.error("Booking number verification failed:", error.message, error.original?.errors?.map(e => e.message));
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
