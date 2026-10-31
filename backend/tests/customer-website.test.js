import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { createMarketplaceRouter } from "../src/modules/customers/marketplace.routes.js";
import * as d from "../src/modules/customers/workspace.discovery.js";
import * as w from "../src/modules/customers/workspace.service.js";
test("public discovery bounds filters and rejects unsafe sorts, invalid dates and inverted prices", () => {
  for (const q of [
    { sort: "DROP TABLE" },
    { min: 50, max: 5 },
    { date: "2026-02-30" },
    { guests: 0 },
    { page: 1000000 },
    { pageSize: 10000 },
    { category: -1 },
    { serviceType: "unknown" },
  ])
    assert.equal(d.discoveryInput.safeParse(q).success, false);
});
test("public search binds combined filters, escapes wildcards and uses stable paginated SQL", async () => {
  const original = sequelize.query,
    calls = [];
  sequelize.query = async (sql, options) => {
    calls.push({ sql, options });
    return sql.includes("COUNT(*) AS total") ? [{ total: 0 }] : [];
  };
  try {
    await d.publicDiscover({
      q: "'[%_",
      category: 1,
      subcategory: 2,
      city: "Jaipur",
      date: "2090-01-01",
      guests: 100,
      min: 100,
      max: 50000,
      rating: 4,
      sort: "priceAsc",
      page: 2,
    });
    const query = calls.at(-1);
    assert.equal(query.options.replacements.offset, 12);
    assert.ok(!query.sql.includes("'[%_"));
    assert.match(query.sql, /VendorAvailability/);
    assert.match(query.sql, /BookingItems/);
    assert.match(query.sql, /SubCategoryId=:subcategory/);
    assert.match(query.sql, /OFFSET :offset/);
    assert.match(query.sql, /ApprovalStatus='Approved'/);
    assert.doesNotMatch(query.sql, /availability\.(advanceDays|days)/);
    assert.ok(query.options.replacements.guests === 100);
  } finally {
    sequelize.query = original;
  }
});
test("archive, guest export and transaction details authorize before any SQL", async () => {
  const ctx = { auth: { user: null } };
  for (const fn of [
    () => w.archiveEvent("bad", ctx),
    () => w.exportGuests("bad", ctx),
    () => w.transactionDetails("bad", ctx),
  ])
    await assert.rejects(fn, (e) => e.extensions?.code === "UNAUTHENTICATED");
});

test("public availability opens future dates but keeps blocks and existing bookings unavailable", async (t) => {
  const id = "1D375B0C-89D2-F111-8F30-14133304FA5C";
  t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("s.DetailsJson,")) return [{
      id,
      vendorId: id,
      DetailsJson: JSON.stringify({ availability: {
        days: [], start: "09:00", end: "20:00", advanceDays: 1, noticeHours: 24,
      } }),
    }];
    if (sql.includes("FROM dbo.VendorAvailability")) return [
      { date: "2090-01-02", status: "Available" },
      { date: "2090-01-02", status: "Blocked" },
    ];
    if (sql.includes("FROM dbo.Booking b JOIN dbo.BookingItems")) return [{ date: "2090-01-03" }];
    return [];
  });
  const { days } = await d.publicAvailability(id, { from: "2090-01-01" });
  assert.equal(days.length, 31);
  for (const day of days) {
    assert.equal(day.available, !["2090-01-02", "2090-01-03"].includes(day.date));
    if (!day.available) assert.equal(day.reason, "Unavailable");
  }
});
test("event end dates and guest ranges are validated by the existing event schema", () => {
  const input = {
    name: "Wedding",
    type: "Wedding",
    eventDate: "2090-01-02",
    city: "Jaipur",
    guests: 100,
    budget: 50000,
  };
  assert.equal(
    w.eventInput.safeParse({ ...input, endDate: "2090-01-01" }).success,
    false,
  );
  assert.equal(
    w.eventInput.safeParse({
      ...input,
      endDate: "2090-01-03",
      brideName: "A",
      groomName: "B",
    }).success,
    true,
  );
});
test("public HTTP errors do not reveal database statements or internal vendor information", async () => {
  const app = express();
  app.use("/api/marketplace", createMarketplaceRouter());
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const original = sequelize.query;
  sequelize.query = async () => {
    throw new Error("SECRET dbo.VendorDocuments");
  };
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/marketplace/catalog`,
    );
    assert.equal(response.status, 500);
    assert.ok(!(await response.text()).includes("VendorDocuments"));
  } finally {
    sequelize.query = original;
    await new Promise((r) => server.close(r));
  }
});
