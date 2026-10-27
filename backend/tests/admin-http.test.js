import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
async function request(auth, path = "/dashboard", options = {}) {
  const app = express();
  app.use(
    "/api/admin",
    createAdminRouter({
      authenticateRequest: async () => {
        if (auth instanceof Error) throw auth;
        return auth;
      },
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    return await fetch(
      `http://127.0.0.1:${server.address().port}/api/admin${path}`,
      options,
    );
  } finally {
    server.close();
  }
}
const user = (role) => ({
  user: {
    id: "c792a11a-c599-4e92-85b4-0d68e9682f00",
    active: true,
    emailVerified: true,
    roles: [{ code: role, active: true }],
  },
});
test("REST admin endpoints return 401 to anonymous requests and 403 to customers", async () => {
  assert.equal((await request(null)).status, 401);
  assert.equal((await request(user("CUSTOMER"))).status, 403);
});
test("REST mutation endpoints reject forged origins before processing input", async () => {
  const response = await request(user("ADMIN"), "/vendors/example/review", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.invalid",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(response.status, 403);
});
test("REST errors do not expose SQL or internal exception details", async () => {
  const response = await request(new Error("private SQL connection string"));
  assert.equal(response.status, 500);
  assert.ok(!(await response.text()).includes("private SQL"));
});
test("authenticated requests cannot choose unknown or prototype resources", async () => {
  assert.equal((await request(user("ADMIN"), "/constructor")).status, 404);
});
test("customer profile routes enforce admin access and validate IDs before querying", async () => {
  for (const path of [
    "/customers/example/details",
    "/customers/example/records/messages",
  ]) {
    assert.equal((await request(null, path)).status, 401);
    assert.equal((await request(user("CUSTOMER"), path)).status, 403);
    assert.equal((await request(user("ADMIN"), path)).status, 400);
  }
  const response = await request(
    user("ADMIN"),
    "/customers/example/notifications",
    {
      method: "POST",
      headers: {
        Origin: "https://untrusted.invalid",
        "X-Admin-Request": "1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Title", message: "Message" }),
    },
  );
  assert.equal(response.status, 403);
});
test("vendor detail and document routes enforce admin access and reject invalid IDs", async () => {
  for (const path of [
    "/vendors/example/details",
    "/vendors/example/records/audit",
    "/vendors/example/documents/example/download",
  ]) {
    assert.equal((await request(null, path)).status, 401);
    assert.equal((await request(user("CUSTOMER"), path)).status, 403);
    assert.equal((await request(user("VENDOR"), path)).status, 403);
    assert.equal((await request(user("ADMIN"), path)).status, 400);
  }
  for (const [path, method] of [
    ["/vendors/example/account", "PATCH"],
    ["/vendors/example/documents/example/review", "POST"],
  ]) {
    const response = await request(user("ADMIN"), path, {
      method,
      headers: {
        Origin: "https://untrusted.invalid",
        "Content-Type": "application/json",
        "X-Admin-Request": "1",
      },
      body: "{}",
    });
    assert.equal(response.status, 403);
  }
});
