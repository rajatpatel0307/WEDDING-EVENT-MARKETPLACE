import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { save } from "../src/modules/admin/admin.service.js";
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
    if (sql.includes("AS inactive FROM dbo.Categories")) return [{ total: "31", active: 22, inactive: 9 }];
    return sql.includes("COUNT_BIG") ? [{ total: 1 }] : [];
  });
  const result = await list("categories", listQuery.parse({ q: "Technology", status: "Active", page: 2, pageSize: 10 }));
  assert.deepEqual(result.summary, { total: 31, active: 22, inactive: 9 });
  assert.equal(result.total, 1);
  const summarySQL = query.mock.calls.find((call) => call.arguments[0].includes("AS inactive FROM dbo.Categories")).arguments[0];
  assert.doesNotMatch(summarySQL, /WHERE|OFFSET|:q|:status/);
});

test("category statistics report zero for an empty category catalogue", async (t) => {
  t.mock.method(sequelize, "query", async (sql) => {
    if (sql.includes("AS inactive FROM dbo.Categories")) return [{ total: 0, active: 0, inactive: 0 }];
    return sql.includes("COUNT_BIG") ? [{ total: 0 }] : [];
  });
  assert.deepEqual((await list("categories", listQuery.parse({}))).summary, { total: 0, active: 0, inactive: 0 });
});
