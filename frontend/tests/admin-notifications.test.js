import test from "node:test";
import assert from "node:assert/strict";
import { notificationLink } from "../src/modules/admin/notification-links.js";
const id = "1D375B0C-89D2-F111-8F30-14133304FA5C";
test("admin event notifications link to the matching management record", () => {
  for (const [referenceType, path] of [["AdminCustomer", "customers"], ["AdminVendor", "vendors"], ["AdminServices", "services"], ["Booking", "bookings"], ["AdminVendorPayouts", "finance/payouts"], ["AdminPayments", "finance/payments"]])
    assert.equal(notificationLink({ referenceType, referenceId: id }), `/admin/${path}/${id}`);
});
test("unsupported and malformed notification references fall back to the dashboard", () => {
  for (const item of [{}, { referenceType: "Unknown", referenceId: id }, { referenceType: "Booking", referenceId: "../../auth/logout" }, { referenceType: "Payment", referenceId: "https://example.invalid" }])
    assert.equal(notificationLink(item), "/admin/dashboard");
});
