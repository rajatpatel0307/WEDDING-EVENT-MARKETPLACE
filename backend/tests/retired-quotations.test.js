import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { createCustomerRouter } from "../src/modules/customers/workspace.routes.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import { startInput } from "../src/modules/messaging/communication.service.js";
import { preferencesInput, notificationUrl } from "../src/modules/notifications/notification-center.service.js";

const id = "734b9588-c47c-40eb-8c17-1797d65a2800";

test("retired quotation APIs and generic record aliases return 404 without querying the database", async t => {
  const previousOrigin = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = "http://localhost:5173";
  t.after(() => {
    if (previousOrigin === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previousOrigin;
  });
  const query = t.mock.method(sequelize, "query", async () => {
    throw new Error("Retired functionality must not query the database");
  });
  const app = express();
  for (const [role, factory] of [["customer", createCustomerRouter], ["vendor", createVendorRouter], ["admin", createAdminRouter]]) {
    app.use(`/${role}`, factory({ authenticateRequest: async () => ({ user: {
      id, active: true, emailVerified: true,
      roles: [{ code: role.toUpperCase(), active: true }],
      vendor: { id, active: true, verificationStatus: "Approved" },
    } }) }));
  }
  app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const role of ["customer", "vendor", "admin"]) {
    const endpoints = [
      ["GET", "/quotations"], ["GET", "/quotations/statistics"],
      ["GET", `/quotations/${id}`], ["POST", "/quotations"],
      ["PUT", `/quotations/${id}`], ["POST", "/quotations/preview"],
      ["POST", `/quotations/${id}/action`], ["POST", `/quotations/${id}/decision`],
      ["POST", `/quotations/${id}/convert`], ["POST", `/quotations/${id}/notes`],
      ["GET", "/quotation-options"], ["GET", "/quotation-requests"],
      ["POST", "/quotation-requests"], ["GET", `/quotation-requests/${id}`],
      ["POST", `/quotation-requests/${id}/action`],
    ];
    if (role !== "admin") endpoints.push(["GET", "/records/quotations"], ["GET", "/records/requests"]);
    else endpoints.push(["GET", `/finance/quotations/${id}`], ["GET", `/customers/${id}/records/quotations`], ["GET", `/vendors/${id}/records/quotations`]);
    for (const [method, path] of endpoints) {
      const response = await fetch(`${base}/${role}${path}`, {
        method, headers: { origin: process.env.FRONTEND_URL || "http://localhost:5173", [`x-${role}-request`]: "1" },
      });
      assert.equal(response.status, 404, `${method} ${role}${path}`);
      await response.text();
    }
  }
  assert.equal(query.mock.callCount(), 0);
});

test("chat and preferences reject quotation inputs and historical notifications never link to removed pages", () => {
  for (const field of ["quotationId", "requestId"]) {
    assert.equal(startInput.safeParse({ vendorId: id, [field]: id }).success, false);
  }
  assert.equal(preferencesInput.safeParse({ chatEnabled: true, bookingEnabled: true }).success, true);
  assert.equal(preferencesInput.safeParse({ chatEnabled: true, bookingEnabled: true, quotationEnabled: true }).success, false);
  for (const role of ["Customer", "Vendor", "Admin"]) {
    for (const ReferenceType of ["Quotation", "QuotationRequest", "AdminQuotations"]) {
      assert.equal(notificationUrl({ ReferenceType, ReferenceId: id }, role), `/${role.toLowerCase()}/notifications`);
    }
  }
});
