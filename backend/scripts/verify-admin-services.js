// Real database and REST checks. Every fixture and schema change is rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/012-admin-services.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import { loadUser } from "../src/modules/auth/token.service.js";
import { serviceSchema } from "../src/modules/vendors/service-management.validation.js";
import { availableService } from "../src/modules/customers/workspace.operations.js";
const rollback = new Error("ROLLBACK_ADMIN_SERVICES");
let passed = false;
try {
  await sequelize.transaction(async (tx) => {
    const originalQuery = sequelize.query,
      originalTransaction = sequelize.transaction;
    let server;
    sequelize.query = function (sql, options = {}) {
      return originalQuery.call(this, sql, { ...options, transaction: tx });
    };
    sequelize.transaction = async (fn) => fn(tx);
    const sql = (query, replacements = {}) =>
      sequelize.query(query, { replacements });
    try {
      await up(sequelize.getQueryInterface(), tx);
      const owner = randomUUID(),
        admin = randomUUID(),
        vendor = randomUUID(),
        pack = randomUUID();
      for (const [id, role] of [
        [owner, "VENDOR"],
        [admin, "ADMIN"],
      ]) {
        await sql(
          "INSERT INTO dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Admin services fixture',:email,'not-a-login-password',1)",
          { id, email: `${id}@example.invalid` },
        );
        await sql(
          "INSERT INTO dbo.UserRoles(UserId,RoleId) SELECT :id,RoleId FROM dbo.Roles WHERE RoleCode=:role",
          { id, role },
        );
      }
      await sql(
        "INSERT INTO dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:id,:owner,'Admin services fixture',:id,'Approved',1)",
        { id: vendor, owner },
      );
      const [[category]] = await sql(
        "SELECT TOP(1) CategoryId AS id FROM dbo.Categories WHERE IsActive=1 AND CategoryName='Venue & Location'",
      );
      assert.ok(category);
      await sql(
        "INSERT INTO dbo.VendorCategories(VendorId,CategoryId) VALUES(:vendor,:category)",
        { vendor, category: category.id },
      );
      const user = await loadUser(admin),
        app = express();
      app.use(
        "/api/admin",
        createAdminRouter({ authenticateRequest: async () => ({ user }) }),
      );
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const base = `http://127.0.0.1:${server.address().port}/api/admin`;
      async function request(path, method = "GET", body, expected = 200) {
        const response = await fetch(base + path, {
          method,
          headers: {
            Origin: process.env.FRONTEND_URL,
            "X-Admin-Request": "1",
            "Content-Type": "application/json",
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await response.json();
        assert.equal(
          response.status,
          expected,
          `${method} ${path}: ${JSON.stringify(data)}`,
        );
        return data;
      }
      const version = (d) => ({
        expectedUpdatedAt: new Date(d.UpdatedAt).toISOString(),
      });
      const document = serviceSchema.parse({
        name: "Admin managed wedding garden",
        categoryId: category.id,
        description:
          "A complete wedding garden listing for integration verification.",
        shortDescription: "An elegant celebration space.",
        pricing: {
          basePrice: 100000,
          unitPrice: 100,
          minimumQuantity: 2,
          maximumQuantity: 10,
          discount: 10,
          additionalCharges: 500,
          taxRate: 18,
        },
        location: { city: "Jaipur" },
        availability: {},
        policies: { cancellation: "Cancel at least 30 days before the event." },
        seo: { slug: `admin-service-${randomUUID()}` },
      });
      let result = await request(
        "/services",
        "POST",
        { ...document, vendorId: vendor },
        201,
      );
      const id = result.id;
      let d = await request(`/services/${id}`);
      assert.equal(d.ApprovalStatus, "Draft");
      assert.equal(d.calculation.finalPrice, 107002.4);
      assert.equal(Number(d.BasePrice), d.calculation.finalPrice);
      assert.equal(
        (await request(`/services?q=${id}`)).rows[0].id.toLowerCase(),
        id.toLowerCase(),
      );
      assert.equal(
        (
          await request(
            `/services?vendor=${vendor}&location=Jaipur&minPrice=100000&maxPrice=110000&sort=price&direction=asc`,
          )
        ).total,
        1,
      );
      const meta = await request(`/services/metadata?vendorId=${vendor}`);
      assert.ok(
        meta.vendors.some((v) => v.id.toLowerCase() === vendor.toLowerCase()),
      );
      assert.ok(meta.templates["Venue & Location"]);
      const stats = await request("/services/statistics");
      assert.ok(Number(stats.total) > 0);
      await request(`/services/${id}/items`, "POST", {
        ...version(d),
        item: {
          name: "Stage",
          quantity: 1,
          unit: "setup",
          price: 100,
          included: true,
          active: true,
        },
      });
      d = await request(`/services/${id}`);
      const itemId = d.items[0].ServiceItemId;
      await request(`/services/${id}/items/${itemId}`, "PUT", {
        ...version(d),
        item: {
          name: "Premium stage",
          quantity: 1,
          unit: "setup",
          price: 200,
          included: true,
          active: false,
        },
      });
      d = await request(`/services/${id}`);
      assert.equal(d.items[0].IsActive, false);
      await request(`/services/${id}/items/${itemId}`, "PUT", {
        ...version(d),
        item: {
          name: "Stage",
          quantity: 1,
          unit: "setup",
          price: 100,
          included: true,
          active: true,
        },
      });
      await sql(
        "INSERT INTO dbo.ServicePackages(PackageId,ServiceId,PackageName,Price,DiscountPercentage) VALUES(:pack,:id,'Garden package',10000,10); INSERT INTO dbo.PackageItems(PackageId,ItemName,Quantity,Unit) VALUES(:pack,'Flowers',1,'set')",
        { pack, id },
      );
      d = await request(`/services/${id}`);
      await request(`/services/${id}/packages/${pack}`, "PUT", {
        ...version(d),
        name: "Premium garden package",
        description: "Fixture package",
        price: 20000,
        discount: 20,
        minimumGuests: 50,
        maximumGuests: 100,
        active: false,
      });
      d = await request(`/services/${id}`);
      assert.equal(Number(d.packages[0].FinalPrice), 16000);
      assert.equal(d.packages[0].IsActive, false);
      const image = randomUUID();
      await sql(
        "INSERT INTO dbo.Media(MediaId,EntityType,EntityId,MediaType,MediaUrl,IsPrimary) VALUES(:image,'Service',:id,'Image','https://res.cloudinary.com/fixture/image/upload/test.jpg',0)",
        { image, id },
      );
      await request(`/services/${id}/images/${image}`, "POST", {
        ...version(d),
        action: "primary",
      });
      await sql(
        "UPDATE dbo.ServicePackages SET DetailsJson=:details WHERE PackageId=:pack",
        {
          pack,
          details: JSON.stringify({
            images: [image],
            terms: "Fixture package terms",
          }),
        },
      );
      d = await request(`/services/${id}`);
      assert.equal(d.images[0].primary, true);
      assert.ok(
        (await request("/service-items?q=Stage")).rows.some(
          (r) => r.serviceId.toLowerCase() === id.toLowerCase(),
        ),
      );
      assert.ok(
        (await request("/service-packages?q=Premium garden")).rows.some(
          (r) => r.serviceId.toLowerCase() === id.toLowerCase(),
        ),
      );
      await request(`/services/${id}/submit`, "POST", version(d));
      d = await request(`/services/${id}`);
      assert.equal(d.ApprovalStatus, "Pending");
      await assert.rejects(
        () => availableService(id, undefined, tx),
        (e) => e.status === 409,
      );
      await request(`/services/${id}/approve`, "POST", {
        ...version(d),
        notes: "Fixture listing verified",
      });
      d = await request(`/services/${id}`);
      assert.equal(d.IsActive, true);
      await request(`/services/${id}`, "PUT", {
        ...document,
        vendorId: vendor,
        name: "Updated wedding garden",
        ...version(d),
      });
      const stale = d;
      d = await request(`/services/${id}`);
      assert.equal(d.ApprovalStatus, "Draft");
      assert.equal(d.IsActive, false);
      await request(
        `/services/${id}`,
        "PUT",
        { ...document, vendorId: vendor, ...version(stale) },
        409,
      );
      await request(`/services/${id}/performance`);
      await request(`/services/${id}/records/bookings`);
      await request(`/services/${id}/records/reviews`);
      const copy = await request(
        `/services/${id}/duplicate`,
        "POST",
        version(d),
        201,
      );
      const clone = await request(`/services/${copy.id}`);
      assert.equal(clone.ApprovalStatus, "Draft");
      assert.equal(clone.IsActive, false);
      assert.equal(clone.items.length, 1);
      assert.equal(clone.packages.length, 1);
      assert.equal(clone.packages[0].items.length, 1);
      assert.equal(clone.images.length, 1);
      assert.equal(
        JSON.parse(clone.packages[0].DetailsJson).images[0].toLowerCase(),
        clone.images[0].id.toLowerCase(),
      );
      const exported = await fetch(`${base}/services/export?q=${id}`);
      assert.equal(exported.status, 200);
      assert.match(await exported.text(), new RegExp(id, "i"));
      await request(`/services/${copy.id}`, "DELETE", version(clone));
      await request(`/services/${copy.id}`, "GET", undefined, 404);
      d = await request(`/services/${id}`);
      await request(`/services/${id}/images/${image}`, "POST", {
        ...version(d),
        action: "delete",
      });
      d = await request(`/services/${id}`);
      await request(`/services/${id}/items/${itemId}`, "DELETE", version(d));
      d = await request(`/services/${id}`);
      assert.equal(d.items.length, 0);
      assert.equal(d.images.length, 0);
      assert.deepEqual(JSON.parse(d.packages[0].DetailsJson).images, []);
      assert.ok(d.history.some((h) => h.action === "ADMIN_SERVICE_EDITED"));
      assert.ok(
        d.history.some((h) => h.action === "ADMIN_SERVICE_PACKAGE_CHANGED"),
      );
      await request(`/services/${id}`, "DELETE", version(d));
      passed = true;
      console.log(
        "PASS: admin REST create/edit; server filtering/sorting; pricing and tax; metadata; items; packages; image moderation; submission/approval; stale edits; withdrawn listings; performance; CSV; duplication; deletion; audit history.",
      );
    } finally {
      if (server) await new Promise((r) => server.close(r));
      sequelize.query = originalQuery;
      sequelize.transaction = originalTransaction;
    }
    throw rollback;
  });
} catch (e) {
  if (e !== rollback) {
    console.error(
      "Admin services verification failed:",
      e.message,
      e.original?.errors?.map((e) => e.message),
    );
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
if (passed)
  console.log("All fixture records and schema changes were rolled back.");
