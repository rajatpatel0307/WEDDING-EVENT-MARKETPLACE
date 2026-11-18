import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { list } from "../src/modules/admin/admin.repository.js";
import { listQuery } from "../src/modules/admin/admin.validation.js";
import { exportRows } from "../src/modules/admin/admin.controller.js";

const summary = { total: 101, pending: 0, underReview: 0, approved: 101, rejected: 0, suspended: 0 };
const filters = {
  q: "Garden", location: "Jaipur", city: "Jaipur", category: "3", status: "Approved",
  from: "2026-11-01", to: "2026-11-18", sort: "name", direction: "asc",
};
function stubDatabase(t, total = 101) {
  return t.mock.method(sequelize, "query", async (sql, options) => {
    if (sql.startsWith("INSERT")) return [];
    if (sql.startsWith("SELECT DISTINCT LTRIM(RTRIM(l.City))")) return [{ name: "Jaipur" }, { name: "Pune" }];
    if (sql.includes("AS suspended FROM dbo.Vendors")) return [summary];
    if (sql.startsWith("SELECT COUNT_BIG(*) AS total")) return [{ total }];
    const { offset, size } = options.replacements;
    return Array.from({ length: Math.max(0, Math.min(size, total - offset)) }, (_, i) => ({
      id: `vendor-${offset + i + 1}`, name: `Garden ${offset + i + 1}`,
      owner: 'Owner "Test"', email: "vendor@example.test", phone: "+919876543210",
      status: "Approved", city: "Jaipur",
    }));
  });
}
function filteredCalls(query) {
  return query.mock.calls.filter(({ arguments: [sql] }) =>
    sql.startsWith("SELECT") && !sql.startsWith("SELECT DISTINCT") && !sql.includes("AS suspended FROM dbo.Vendors"));
}
function assertFilters(sql, replacements) {
  for (const field of ["t.BusinessName", "CONCAT(u.FirstName,' ',u.LastName)",
    "COALESCE(t.ContactEmail,u.Email)", "COALESCE(t.ContactPhone,u.PhoneNumber)"])
    assert.ok(sql.includes(`CONVERT(nvarchar(max),${field}) LIKE :q`));
  assert.match(sql, /t.VerificationStatus=:status/);
  assert.match(sql, /vc.VendorId=t.VendorId AND vc.CategoryId=:category/);
  assert.match(sql, /l.City LIKE :location OR l.State LIKE :location/);
  assert.match(sql, /LTRIM\(RTRIM\(l.City\)\)=:city/);
  assert.match(sql, /t.CreatedAt>=:from/);
  assert.match(sql, /t.CreatedAt< :to/);
  assert.equal(replacements.q, "%Garden%");
  assert.equal(replacements.location, "%Jaipur%");
  assert.equal(replacements.city, "Jaipur");
  assert.equal(replacements.category, 3);
  assert.equal(replacements.status, "Approved");
  assert.equal(replacements.from, "2026-10-31 18:30:00.000");
  assert.equal(replacements.to, "2026-11-18 18:30:00.000");
}

test("vendor search and all filters apply together to counts and paginated rows", async (t) => {
  const query = stubDatabase(t);
  const result = await list("vendors", listQuery.parse({ ...filters, page: 2, pageSize: 20 }));
  assert.equal(result.total, 101);
  assert.equal(result.rows.length, 20);
  assert.equal(result.rows[0].id, "vendor-21");
  for (const { arguments: [sql, { replacements }] } of filteredCalls(query)) {
    assertFilters(sql, replacements);
    assert.equal(replacements.offset, 20);
    assert.equal(replacements.size, 20);
  }
  assert.match(filteredCalls(query)[1].arguments[0], /ORDER BY \[name\] ASC/);
});

test("clearing vendor filters removes every filtering clause", async (t) => {
  const query = stubDatabase(t, 0);
  const result = await list("vendors", listQuery.parse({ q: "", location: "", category: "", status: "" }));
  assert.equal(result.total, 0);
  assert.deepEqual(result.rows, []);
  for (const { arguments: [sql] } of filteredCalls(query))
    assert.doesNotMatch(sql, /LIKE :q|=:status|=:category|=:city|LIKE :location|>=:from|< :to/);
});

test("available cities include every vendor location independently of filters and pagination", async (t) => {
  const query = stubDatabase(t, 0);
  const result = await list("vendors", listQuery.parse({ city: "Jaipur", q: "no matches", page: 5 }));
  assert.deepEqual(result.cityOptions, ["Jaipur", "Pune"]);
  assert.deepEqual(result.rows, []);
  const cities = query.mock.calls.find(({ arguments: [sql] }) => sql.startsWith("SELECT DISTINCT"));
  assert.match(cities.arguments[0], /NULLIF\(LTRIM\(RTRIM\(l.City\)\), ''\) IS NOT NULL/);
  assert.match(cities.arguments[0], /ORDER BY name/);
  assert.doesNotMatch(cities.arguments[0], /:city|:q|:status|OFFSET/);
});

test("a selected city matches exactly and remains a bound value", async (t) => {
  const query = stubDatabase(t, 0);
  await list("vendors", listQuery.parse({ city: " City_[x]%' " }));
  for (const { arguments: [sql, { replacements }] } of filteredCalls(query)) {
    assert.match(sql, /LTRIM\(RTRIM\(l.City\)\)=:city/);
    assert.equal(replacements.city, "City_[x]%'");
    assert.doesNotMatch(sql, /LIKE :location|LIKE :city/);
    assert.ok(!sql.includes("City_[x]%'"));
  }
});

test("vendor search treats SQL wildcard characters as literal text", async (t) => {
  const query = stubDatabase(t, 0);
  await list("vendors", listQuery.parse({ q: "50%_[x]'", location: "City_[x]%" }));
  for (const { arguments: [sql, { replacements }] } of filteredCalls(query)) {
    assert.equal(replacements.q, "%50[%][_][[]x[]]'%");
    assert.equal(replacements.location, "%City[_][[]x[]][%]%");
    assert.ok(!sql.includes("50%_[x]'"));
  }
});

test("vendor filters accept every verification status and reject invalid dates", async (t) => {
  stubDatabase(t, 0);
  for (const status of ["Pending", "UnderReview", "Approved", "Rejected", "Suspended"])
    assert.equal((await list("vendors", listQuery.parse({ status }))).total, 0);
  for (const input of [
    { from: "2026-02-30" }, { to: "invalid" },
    { from: "2026-11-18", to: "2026-11-01" }, { category: "invalid" },
  ]) assert.equal(listQuery.safeParse(input).success, false);
  assert.equal(listQuery.safeParse({ from: "2026-11-18", to: "2026-11-18" }).success, true);
});

function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(value) { this.statusCode = value; return this; },
    set(value) { Object.assign(this.headers, value); return this; },
    send(value) { this.body = value; return this; },
    json(value) { this.body = value; return this; },
  };
}
const admin = { auth: { user: { id: "test-admin" } }, req: { ip: "127.0.0.1", get: () => "test" } };

test("vendor CSV exports all matching pages with the same filters and safe cells", async (t) => {
  const query = stubDatabase(t);
  const res = response();
  await exportRows({ params: { resource: "vendors" }, query: { ...filters, page: 5, pageSize: 20 }, admin }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "text/csv; charset=utf-8");
  assert.match(res.headers["Content-Disposition"], /vendors.csv/);
  assert.ok(res.body.startsWith("\ufeff"));
  const lines = res.body.slice(1).split("\r\n");
  assert.equal(lines.length, 102);
  assert.ok(lines[1].includes('"vendor-1"'));
  assert.ok(lines.at(-1).includes('"vendor-101"'));
  assert.ok(lines[1].includes('"Owner ""Test"""'));
  assert.ok(lines[1].includes('"\'+919876543210"'), "phone cells cannot become spreadsheet formulas");
  for (const { arguments: [sql, { replacements }] } of filteredCalls(query)) assertFilters(sql, replacements);
  const pages = filteredCalls(query).filter(({ arguments: [sql] }) => sql.includes("OFFSET :offset"));
  assert.deepEqual(pages.map(({ arguments: [, { replacements }] }) => replacements.offset), [0, 100]);
  const audit = query.mock.calls.find(({ arguments: [sql] }) => sql.startsWith("INSERT INTO dbo.AuditLogs"));
  assert.equal(JSON.parse(audit.arguments[1].replacements.next).count, 101);
});

test("vendor exports above 10,000 rows explain how to narrow the results", async (t) => {
  const query = stubDatabase(t, 10001);
  const res = response();
  await exportRows({ params: { resource: "vendors" }, query: filters, admin }, res);
  assert.equal(res.statusCode, 422);
  assert.match(res.body.message, /Narrow your filters/);
  assert.ok(!query.mock.calls.some(({ arguments: [sql] }) => sql.startsWith("INSERT")));
});
