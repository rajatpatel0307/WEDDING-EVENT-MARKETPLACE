import test from "node:test";
import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import {
  customerDetails,
  customerRecords,
  changeCustomerStatus,
  editCustomer,
  notifyCustomer,
  customerEdit,
  customerAction,
  customerPageQuery,
} from "../src/modules/admin/customers.service.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800";
const ctx = {
  auth: {
    user: {
      id: "734b9588-c47c-40eb-8c17-1797d65a2801",
      active: true,
      emailVerified: true,
      roles: [{ code: "ADMIN", active: true }],
    },
  },
  req: { ip: "127.0.0.1" },
};
const customer = {
  id,
  firstName: "Example",
  lastName: "Customer",
  email: "customer@example.invalid",
  phone: "+919876543210",
  active: true,
  blocked: false,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
test("customer details and actions reject unauthenticated and non-admin users before database access", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => {
    throw Error("Database should not be called");
  });
  for (const context of [
    {},
    {
      auth: {
        user: { ...ctx.auth.user, roles: [{ code: "CUSTOMER", active: true }] },
      },
    },
  ]) {
    for (const call of [
      () => customerDetails(id, context),
      () => customerRecords(id, "events", {}, context),
      () => changeCustomerStatus(id, {}, context),
      () => editCustomer(id, {}, context),
      () => notifyCustomer(id, {}, context),
    ])
      await assert.rejects(call);
  }
  assert.equal(query.mock.callCount(), 0);
});
test("customer section and identity validation prevent arbitrary resource selection", async (t) => {
  const query = t.mock.method(sequelize, "query", async () => []);
  for (const section of [
    "constructor",
    "__proto__",
    "AuthSessions",
    "events; DROP TABLE Users",
  ])
    await assert.rejects(() => customerRecords(id, section, {}, ctx), {
      status: 404,
    });
  await assert.rejects(() => customerDetails("invalid-id", ctx));
  assert.equal(query.mock.callCount(), 0);
  await assert.rejects(() => customerDetails(id, ctx), { status: 404 });
});
test("each collection uses a bound customer predicate and bounded pagination", async (t) => {
  const calls = [];
  t.mock.method(sequelize, "query", async (sql, options) => {
    calls.push({ sql, options });
    if (sql.includes("AS firstName")) return [customer];
    if (sql.includes("COUNT_BIG")) return [{ total: 42 }];
    return [{ id: "record" }];
  });
  for (const section of [
    "events",
    "bookings",
    "quotations",
    "payments",
    "reviews",
    "wishlist",
    "addresses",
    "audit",
  ]) {
    const result = await customerRecords(
      id,
      section,
      { page: 2, pageSize: 20 },
      ctx,
    );
    assert.equal(result.total, 42);
    const call = calls.at(-1);
    assert.match(call.sql, /WHERE .*:id/);
    assert.equal(call.options.replacements.id, id);
    assert.equal(call.options.replacements.offset, 20);
    assert.equal(call.options.replacements.size, 20);
    assert.ok(!call.sql.includes(id));
  }
  assert.throws(() => customerPageQuery.parse({ pageSize: 10000 }));
  await assert.rejects(()=>customerRecords(id,'messages',{},ctx),/restricted to participants/);
});
test("status changes reject stale state and protect admin accounts", async (t) => {
  t.mock.method(sequelize, "transaction", async (fn) => fn({}));
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("AS firstName") ? [customer] : [{ total: 0 }],
  );
  await assert.rejects(
    () =>
      changeCustomerStatus(
        id,
        {
          action: "Block",
          expectedActive: false,
          expectedBlocked: false,
          note: "Review needed",
        },
        ctx,
      ),
    { status: 409 },
  );
  assert.ok(
    !query.mock.calls.some((call) => call.arguments[0].startsWith("UPDATE")),
  );
  t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("AS firstName") ? [customer] : [{ total: 1 }],
  );
  await assert.rejects(
    () =>
      changeCustomerStatus(
        id,
        {
          action: "Block",
          expectedActive: true,
          expectedBlocked: false,
          note: "Review needed",
        },
        ctx,
      ),
    { status: 403 },
  );
});
test("deactivation preserves block state, revokes sessions, and records a reason atomically", async (t) => {
  const tx = {};
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("AS firstName")
      ? [{ ...customer, blocked: true }]
      : sql.includes("COUNT(*)")
        ? [{ total: 0 }]
        : [],
  );
  await changeCustomerStatus(
    id,
    {
      action: "Deactivate",
      expectedActive: true,
      expectedBlocked: true,
      note: "Customer requested closure",
    },
    ctx,
  );
  const update = query.mock.calls.find((call) =>
    call.arguments[0].startsWith("UPDATE dbo.[Users]"),
  );
  assert.match(update.arguments[0], /IsActive/);
  assert.ok(!update.arguments[0].includes("IsBlocked"));
  assert.ok(
    query.mock.calls.some((call) =>
      call.arguments[0].startsWith("UPDATE dbo.AuthSessions"),
    ),
  );
  const audit = query.mock.calls.find((call) =>
    call.arguments[0].startsWith("INSERT INTO dbo.AuditLogs"),
  );
  assert.equal(
    JSON.parse(audit.arguments[1].replacements.next).note,
    "Customer requested closure",
  );
  assert.ok(
    query.mock.calls.every((call) => call.arguments[1].transaction === tx),
  );
});
test("email edits reset verification and sessions; stale edits cannot overwrite newer changes", async (t) => {
  t.mock.method(sequelize, "transaction", async (fn) => fn({}));
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("AS firstName")
      ? [customer]
      : sql.includes("COUNT(*)")
        ? [{ total: 0 }]
        : [],
  );
  const body = {
    firstName: "Example",
    lastName: "Customer",
    email: "new@example.invalid",
    phone: "",
    dateOfBirth: null,
    expectedUpdatedAt: customer.updatedAt.toISOString(),
  };
  await editCustomer(id, body, ctx);
  const update = query.mock.calls.find((call) =>
    call.arguments[0].startsWith("UPDATE dbo.[Users]"),
  );
  assert.match(update.arguments[0], /IsEmailVerified/);
  assert.match(update.arguments[0], /IsPhoneVerified/);
  assert.ok(
    query.mock.calls.some((call) =>
      call.arguments[0].startsWith("UPDATE dbo.AuthSessions"),
    ),
  );
  await assert.rejects(
    () =>
      editCustomer(
        id,
        { ...body, expectedUpdatedAt: "2025-01-01T00:00:00.000Z" },
        ctx,
      ),
    { status: 409 },
  );
  assert.throws(() => customerEdit.parse({ ...body, role: "ADMIN" }));
  assert.throws(() =>
    customerAction.parse({
      action: "Delete",
      expectedActive: true,
      expectedBlocked: false,
      note: "Delete everything",
    }),
  );
});
test("customer notifications target exactly one recipient and are audited in the same transaction", async (t) => {
  const tx = {};
  t.mock.method(sequelize, "transaction", async (fn) => fn(tx));
  const query = t.mock.method(sequelize, "query", async (sql) =>
    sql.includes("AS firstName") ? [customer] : [],
  );
  await notifyCustomer(
    id,
    { title: "An update", message: "Your support request is resolved." },
    ctx,
  );
  const insert = query.mock.calls.find((call) =>
    call.arguments[0].startsWith("INSERT INTO dbo.Notifications"),
  );
  assert.equal(insert.arguments[1].replacements.id, id);
  assert.ok(
    query.mock.calls.some((call) =>
      call.arguments[0].startsWith("INSERT INTO dbo.AuditLogs"),
    ),
  );
  assert.ok(
    query.mock.calls.every((call) => call.arguments[1].transaction === tx),
  );
});
