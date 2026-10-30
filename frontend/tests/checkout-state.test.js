import test from "node:test";
import assert from "node:assert/strict";
import { paymentScreen } from "../src/modules/customer/services/checkout-state.js";
test("payment screens require the server state for success, preserve pending attempts and allow late verification", () => {
  assert.equal(
    paymentScreen({ PaymentStatus: "Pending" }, "success"),
    "review",
  );
  assert.equal(paymentScreen({ PaymentStatus: "Paid" }, "failed"), "success");
  assert.equal(
    paymentScreen({ PaymentStatus: "PartiallyPaid" }, "pending"),
    "pending",
  );
  assert.equal(paymentScreen({ PaymentStatus: "Failed" }), "failed");
  assert.equal(paymentScreen({PaymentStatus:'PartiallyPaid'},'verified'),'success');
  assert.equal(paymentScreen({PaymentStatus:'Pending'},'verified'),'review');
  assert.equal(
    paymentScreen({ PaymentStatus: "Refunded" }, "success"),
    "review",
  );
});
