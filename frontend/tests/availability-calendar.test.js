import test from "node:test";
import assert from "node:assert/strict";
import {
  availabilityPayload,
  clockValue,
  dateSelection,
  monthDays,
  selectedDays,
  validateAvailability,
} from "../src/modules/vendor/service-management/availability-calendar.js";

const localToday = "2026-11-16";
const form = (changes = {}) => ({ ...dateSelection(localToday), ...changes });

test("calendar respects explicit statuses and keeps unsaved future dates open", () => {
  const rows = [
    { id: 1, date: "2026-11-18T00:00:00.000Z", status: "Blocked" },
    { id: 2, date: "2026-11-19", status: "Booked" },
    { id: 3, date: "2026-11-20", status: "Closed" },
    { id: 4, date: "2026-11-22", status: "Available", startTime: "12:00" },
  ];
  const result = monthDays("2026-11", rows, localToday);
  assert.equal(result.offset, 0);
  assert.equal(result.days.length, 30);
  const day = (key) => result.days.find((entry) => entry.date === key);
  assert.equal(day("2026-11-15").past, true);
  assert.equal(day(localToday).past, false);
  assert.equal(day(localToday).today, true);
  assert.equal(day("2026-11-18").status, "Blocked");
  assert.equal(day("2026-11-19").status, "Booked");
  assert.equal(day("2026-11-20").status, "Closed");
  assert.equal(
    day("2026-11-21").status,
    "Available",
    "weekends are open unless explicitly closed",
  );
  assert.equal(day("2026-11-22").override.startTime, "12:00");
  assert.equal(monthDays("2028-02", [], localToday).days.length, 29);
  assert.equal(monthDays("2026-02", [], localToday).days.length, 28);
  assert.equal(monthDays("2027-01", [], localToday).offset, 5);
});

test("date selection retains editable override identity, notes and normalized hours", () => {
  const selection = dateSelection(localToday, {
    id: 32,
    status: "Available",
    startTime: "1970-01-01T11:30:00.000Z",
    endTime: "18:00:00",
    notes: "Extended hours",
  });
  assert.equal(selection.overrideId, 32);
  assert.equal(selection.status, "Available");
  assert.equal(selection.startTime, "11:30");
  assert.equal(selection.endTime, "18:00");
  assert.equal(selection.notes, "Extended hours");
  assert.equal(clockValue(null), null);
  const booked = dateSelection(localToday, {
    id: 40,
    status: "Booked",
    notes: "Booking reference",
  });
  assert.equal(
    booked.overrideId,
    null,
    "booked overrides must never be targeted by editable forms",
  );
  assert.equal(booked.notes, "");
});

test("date ranges validate calendar dates, ordering and the 91-day inclusive limit", () => {
  assert.equal(selectedDays(form()), 1);
  assert.equal(selectedDays(form({ to: "2026-12-01" })), 16);
  assert.equal(
    validateAvailability(form({ to: "2027-02-14" }), [], localToday),
    null,
  );
  assert.match(
    validateAvailability(form({ to: "2027-02-15" }), [], localToday),
    /91 days/,
  );
  assert.match(
    validateAvailability(form({ from: "2026-11-15" }), [], localToday),
    /future date/,
  );
  assert.match(
    validateAvailability(form({ to: "2026-11-14" }), [], localToday),
    /end date/,
  );
  assert.match(
    validateAvailability(form({ to: "2026-11-31" }), [], localToday),
    /valid start and end/,
  );
  assert.equal(selectedDays(form({ from: "", to: "" })), 0);
});

test("recorded booked dates block a selected range, while custom hours must be complete and ordered", () => {
  const rows = [{ date: "2026-11-18T00:00:00Z", status: "Booked" }];
  assert.match(
    validateAvailability(form({ to: "2026-11-19" }), rows, localToday),
    /booked date/,
  );
  assert.equal(
    validateAvailability(form({ to: "2026-11-17" }), rows, localToday),
    null,
  );
  for (const [startTime, endTime] of [
    ["12:00", null],
    [null, "18:00"],
    ["18:00", "12:00"],
    ["12:00", "12:00"],
    ["25:00", "26:00"],
  ]) {
    assert.match(
      validateAvailability(
        form({ status: "Available", startTime, endTime }),
        [],
        localToday,
      ),
      /both times/,
    );
  }
  assert.equal(
    validateAvailability(
      form({ status: "Available", startTime: "12:00", endTime: "18:00" }),
      [],
      localToday,
    ),
    null,
  );
  assert.equal(
    validateAvailability(form({ status: "Available" }), [], localToday),
    null,
  );
});

test("mutation payload excludes UI identity and clears hidden hours when blocking whole days", () => {
  assert.deepEqual(
    availabilityPayload(
      form({
        overrideId: 20,
        startTime: "12:00",
        endTime: "18:00",
        notes: " Holiday ",
      }),
    ),
    {
      from: localToday,
      to: localToday,
      status: "Blocked",
      startTime: null,
      endTime: null,
      notes: "Holiday",
    },
  );
  assert.equal(
    availabilityPayload(
      form({ status: "Available", startTime: "12:00", endTime: "18:00" }),
    ).endTime,
    "18:00",
  );
  assert.match(
    validateAvailability(form({ notes: "a".repeat(501) }), [], localToday),
    /500 characters/,
  );
});
