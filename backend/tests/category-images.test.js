import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { save, categoryDetails } from "../src/modules/admin/admin.service.js";
import express from "express";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import { recordInput, listQuery } from "../src/modules/admin/admin.validation.js";
import { list } from "../src/modules/admin/admin.repository.js";
import { popularServices } from "../src/modules/public/public.service.js";

const ctx = { req: { ip: "127.0.0.1" }, auth: { user: {
  id: "734b9588-c47c-40eb-8c17-1797d65a2800", active: true, emailVerified: true,
  roles: [{ code: "ADMIN", active: true }],
} } };
const png = "iVBORw0KGgo=";
const body = { name: "Venue", code: "venue" };
function setup(t) {
  t.mock.method(sequelize, "transaction", async (fn) => fn({}));
  return t.mock.method(sequelize, "query", async (sql) => {
    if (sql.startsWith("SELECT * FROM dbo.[Categories]")) return [{ CategoryId: 1, CategoryCode: "venue" }];
    if (sql.startsWith("INSERT INTO dbo.[Categories]")) return [{ id: 1 }];
    return [];
  });
}

test("category image uploads validate content and restrict image fields to categories", async (t) => {
  const query = setup(t);
  await assert.rejects(() => save("categories", null, { ...body, imageBase64: Buffer.from("not an image").toString("base64") }, ctx));
  await assert.rejects(() => save("categories", null, { ...body, imageBase64: png, removeImage: true }, ctx));
  await assert.rejects(() => save("sub-categories", null, { ...body, categoryId: 1, imageBase64: png }, ctx));
  assert.equal(recordInput.safeParse({ ...body, image: "https://untrusted.invalid/image.jpg" }).success, false);
  assert.equal(query.mock.callCount(), 0);
});

test("category uploads persist the server image URL and exclude image bytes from audit records", async (t) => {
  const query = setup(t);
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    const previous = process.env[key]; process.env[key] = "test";
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const fetch = t.mock.method(globalThis, "fetch", async (_, options) => ({
    ok: true, json: async () => ({ public_id: options.body.get("public_id"), secure_url: "https://res.cloudinary.com/test/image/upload/category.png" }),
  }));
  await save("categories", null, { ...body, imageBase64: png }, ctx);
  assert.equal(fetch.mock.callCount(), 1);
  assert.match(fetch.mock.calls[0].arguments[1].body.get("public_id"), /^wedding-marketplace\/admin\/categories\/[a-f0-9-]{36}$/);
  const insert = query.mock.calls.find((call) => call.arguments[0].startsWith("INSERT INTO dbo.[Categories]"));
  assert.match(insert.arguments[0], /\[ImageUrl\]/);
  assert.ok(Object.values(insert.arguments[1].replacements).includes("https://res.cloudinary.com/test/image/upload/category.png"));
  const audit = query.mock.calls.find((call) => call.arguments[0].startsWith("INSERT INTO dbo.AuditLogs"));
  const details = JSON.parse(audit.arguments[1].replacements.next);
  assert.equal(details.imageBase64, undefined);
  assert.equal(details.image, "https://res.cloudinary.com/test/image/upload/category.png");
});

test("category editing preserves the image unless explicitly removed", async (t) => {
  const query = setup(t);
  await save("categories", 1, body, ctx);
  let update = query.mock.calls.find((call) => call.arguments[0].startsWith("UPDATE dbo.[Categories]"));
  assert.doesNotMatch(update.arguments[0], /ImageUrl/);
  query.mock.resetCalls();
  await save("categories", 1, { ...body, removeImage: true }, ctx);
  update = query.mock.calls.find((call) => call.arguments[0].startsWith("UPDATE dbo.[Categories]"));
  assert.match(update.arguments[0], /\[ImageUrl\]/);
  assert.ok(Object.values(update.arguments[1].replacements).includes(null));
});

test("marketplace category cards receive the saved category image", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => [{ id: 1, image: "https://res.cloudinary.com/test/category.png" }]);
  const rows = await popularServices();
  assert.match(query.mock.calls[0].arguments[0], /c\.ImageUrl AS image/);
  assert.equal(rows[0].image, "https://res.cloudinary.com/test/category.png");
});

test("category statistics count all categories independently of table filters and pagination", async (t) => {
  const query = t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("FROM dbo.Categories c")) return [{ total: "31", active: 22, inactive: 9, services: "36" }];
    return sql.includes("COUNT_BIG") ? [{ total: 1 }] : [];
  });
  const result = await list("categories", listQuery.parse({ q: "Technology", status: "Active", page: 2, pageSize: 10 }));
  assert.deepEqual(result.summary, { total: 31, active: 22, inactive: 9, services: 36 });
  assert.equal(result.total, 1);
  const summarySQL = query.mock.calls.find((call) => call.arguments[0].includes("FROM dbo.Categories c")).arguments[0];
  assert.doesNotMatch(summarySQL, /WHERE|OFFSET|:q|:status/);
  assert.match(summarySQL, /JOIN dbo.Categories linked ON linked.CategoryId=s.CategoryId/);
  assert.equal(result.columns.includes("services"), false);
});

test("category statistics report zero for an empty category catalogue", async (t) => {
  t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("FROM dbo.Categories c")) return [{ total: 0, active: 0, inactive: 0, services: 0 }];
    return sql.includes("COUNT_BIG") ? [{ total: 0 }] : [];
  });
  assert.deepEqual((await list("categories", listQuery.parse({}))).summary, { total: 0, active: 0, inactive: 0, services: 0 });
});

test("category detail reads authorize the administrator and validate IDs before SQL", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  await assert.rejects(() => categoryDetails(7, {}), e => e.extensions?.code === "UNAUTHENTICATED");
  await assert.rejects(() => categoryDetails(7, { auth: { user: { ...ctx.auth.user, roles: [{ code: "CUSTOMER", active: true }] } } }), e => e.extensions?.code === "FORBIDDEN");
  for (const id of ["7 OR 1=1", 0, -1, "invalid"]) await assert.rejects(() => categoryDetails(id, ctx));
  assert.equal(query.mock.callCount(), 0);
});

test("category detail reads bind one ID and return image, permissions and the editing version", async (t) => {
  const row = { id: 7, name: "Wedding Dresses", image: "https://res.cloudinary.com/test/dresses.png", sellEnabled: true, bookEnabled: true, updatedAt: "2026-11-10T10:00:00.000Z" };
  const query = t.mock.method(sequelize, "query", async () => [row]);
  assert.deepEqual(await categoryDetails("7", ctx), row);
  const [sql, options] = query.mock.calls[0].arguments;
  assert.match(sql, /WHERE t.CategoryId=:id/);
  assert.match(sql, /AllowBuyOnline/);
  assert.match(sql, /AllowBooking/);
  assert.match(sql, /UpdatedAt AS updatedAt/);
  assert.equal(options.replacements.id, 7);
  query.mock.mockImplementation(async () => []);
  await assert.rejects(() => categoryDetails(8, ctx), e => e.status === 404);
});

test("the category detail HTTP route is reachable and private", async (t) => {
  let user = ctx.auth.user;
  const query = t.mock.method(sequelize, "query", async () => [{ id: 7, name: "Wedding Dresses" }]);
  const app = express();
  app.use("/api/admin", createAdminRouter({ authenticateRequest: async () => ({ user }) }));
  const server = app.listen(0);
  t.after(() => { server.closeAllConnections(); server.close(); });
  await new Promise(resolve => server.once("listening", resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/categories/7`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).name, "Wedding Dresses");
  assert.equal(response.headers.get("cache-control"), "no-store");
  user = null;
  query.mock.resetCalls();
  const denied = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/categories/7`);
  assert.equal(denied.status, 401);
  assert.equal(query.mock.callCount(), 0);
});
