// Runs the migration and real SQL checks in one transaction, then rolls everything back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/029-vendor-access.js";
import * as access from "../src/modules/vendors/access.service.js";
import * as services from "../src/modules/vendors/service-management.service.js";
import { createBooking } from "../src/modules/customers/workspace.operations.js";
import { accessible } from "../src/modules/bookings/bookings.service.js";
import * as repo from "../src/modules/admin/admin.repository.js";

const originalQuery = sequelize.query.bind(sequelize), originalTransaction = sequelize.transaction.bind(sequelize);
let tx;
try {
  await sequelize.authenticate();
  tx = await originalTransaction();
  sequelize.query = (sql, options = {}) => originalQuery(sql, { ...options, transaction: tx });
  sequelize.transaction = fn => fn(tx);
  await up(sequelize.getQueryInterface(), tx);
  await up(sequelize.getQueryInterface(), tx); // Idempotency.
  const userId = randomUUID(), vendorId = randomUUID(), eventId = randomUUID();
  await repo.select("INSERT dbo.Users(UserId,FirstName,Email,PasswordHash,IsEmailVerified) VALUES(:id,'Access verification',:email,'test-only-unused',1)", { id: userId, email: `access-check-${userId}@example.invalid` }, tx);
  await repo.select("INSERT dbo.Vendors(VendorId,UserId,BusinessName,BusinessSlug,VerificationStatus,IsActive) VALUES(:id,:user,'Access test business',:slug,'Approved',1)", { id: vendorId, user: userId, slug: `access-check-${vendorId}` }, tx);
  const context = role => ({ req: { ip: "127.0.0.1", get: () => "SQL access verification" }, auth: { user: { id: userId, active: true, blocked: false, emailVerified: true, roles: [{ code: role, active: true }], vendor: { id: vendorId, active: true, verificationStatus: "Approved" } } } });
  const admin = context("ADMIN"), vendor = context("VENDOR"), customer = context("CUSTOMER");
  let row = await access.vendorStatus(vendor);
  assert.equal(row.serviceStatus, "Pending"); assert.equal(row.bookingStatus, "Pending");
  await assert.rejects(access.assertAccess(vendorId, "service", tx), { status: 403 });
  await assert.rejects(access.assertAccess(vendorId, "booking", tx), { status: 403 });
  await access.decide(vendorId, "service", "approve", { expectedStatus: "Pending" }, admin);
  row = await access.vendorStatus(vendor);
  assert.equal(row.serviceStatus, "Approved"); assert.equal(row.bookingStatus, "Pending");
  const [category] = await repo.select("SELECT TOP(1) CategoryId AS id FROM dbo.Categories WHERE IsActive=1 AND CategoryName='Venue & Location'");
  assert.ok(category, "An active Venue & Location category is required for this fixture.");
  await repo.select("INSERT dbo.VendorCategories(VendorId,CategoryId,IsPrimary) VALUES(:id,:category,1)", { id: vendorId, category: category.id }, tx);
  const doc = { name: "Access check service", categoryId: category.id, pricing: { basePrice: 1000 }, location: { city: "Jaipur" }, availability: {}, policies: {}, seo: { slug: `access-check-${randomUUID()}` } };
  const service = await services.saveService(null, doc, vendor);
  const [saved] = await repo.select("SELECT ApprovalStatus,IsActive FROM dbo.Services WHERE ServiceId=:id", { id: service.id }, tx);
  assert.equal(saved.ApprovalStatus, "Draft"); assert.equal(saved.IsActive, false);
  await repo.select("UPDATE dbo.Services SET ApprovalStatus='Approved',IsActive=1,DetailsJson=NULL WHERE ServiceId=:id", { id: service.id }, tx);
  const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const event = { EventId: eventId, EventName: "Access verification", EventType: "Wedding", EventDate: future, StartTime: null, EndTime: null, GuestCount: 10, City: "Jaipur", State: "Rajasthan", LocationJson: JSON.stringify({ city: "Jaipur", state: "Rajasthan", country: "India", address: "Test location", postalCode: "302001" }) };
  await repo.select("INSERT dbo.Events(EventId,CustomerId,EventName,EventType,EventDate,City,State,LocationJson) VALUES(:id,:customer,'Access verification','Wedding',:day,'Jaipur','Rajasthan',:location)", { id: eventId, customer: userId, day: future, location: event.LocationJson }, tx);
  const items = [{ ServiceId: service.id, ItemName: "Access test service", Quantity: 1, UnitPrice: 1000 }];
  await assert.rejects(createBooking(event, vendorId, items, customer, tx), { status: 403 });
  await access.decide(vendorId, "booking", "approve", { expectedStatus: "Pending" }, admin);
  // With service access revoked, the existing eligible service still accepts bookings.
  await access.decide(vendorId, "service", "reject", { expectedStatus: "Approved", reason: "SQL verification" }, admin);
  await assert.rejects(services.saveService(null, doc, vendor), { status: 403 });
  const booking = await createBooking(event, vendorId, items, customer, tx);
  assert.equal(booking.bookingStatus, "Pending");
  await access.decide(vendorId, "booking", "suspend", { expectedStatus: "Approved", reason: "SQL verification" }, admin);
  await assert.rejects(createBooking(event, vendorId, items, customer, tx), { status: 403 });
  assert.equal((await accessible(booking.id, vendor, "Vendor", tx)).BookingStatus, "Pending");
  assert.equal((await accessible(booking.id, customer, "Customer", tx)).BookingStatus, "Pending");
  const history = await access.history(vendorId, {}, admin);
  assert.equal(history.total, 4);
  assert.ok(history.rows.every(h => h.actionBy.toLowerCase() === userId && h.createdAt));
  const results = await access.list({ q: "Access test business", service: "Rejected", booking: "Suspended", category: category.id }, admin);
  assert.ok(results.rows.some(v => v.id.toLowerCase() === vendorId));
  await assert.rejects(access.decide(vendorId, "booking", "approve", { expectedStatus: "Pending" }, admin), { status: 409 });
  console.log("PASS: migration idempotency; Pending defaults; independent approvals; real service creation; preserved service review; new booking creation; revocation enforcement; existing booking access; audit history; filters; stale decisions.");
} catch (error) {
  console.error("Vendor access SQL verification failed:", error.message);
  process.exitCode = 1;
} finally {
  sequelize.query = originalQuery;
  sequelize.transaction = originalTransaction;
  if (tx && !tx.finished) await tx.rollback();
  await sequelize.close();
  console.log("Verification transaction rolled back; no fixture data or schema changes retained.");
}
