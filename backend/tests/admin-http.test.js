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
