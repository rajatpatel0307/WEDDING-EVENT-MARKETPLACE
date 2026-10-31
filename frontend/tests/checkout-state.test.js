import test from "node:test";
import assert from "node:assert/strict";
import { paymentScreen, selectedPaymentMinor } from "../src/modules/customer/services/checkout-state.js";
test("checkout previews percentage installments, the selected custom amount and remaining balance", () => {
  const booking = { RemainingAmount: "1000.25", AdvanceAmount: "250.25", PaidAmount: "100.10" };
  for (const [mode, expected] of [["10",10003], ["25",25006], ["50",50013], ["75",75019], ["100",100025], ["balance",100025], ["advance",15015]])
    assert.equal(selectedPaymentMinor(booking, mode), expected);
  assert.equal(selectedPaymentMinor(booking, "custom", "123.45"), 12345);
  assert.equal(selectedPaymentMinor({ ...booking, RemainingAmount: "500" }, "25"), 12500);
  for (const value of ["", "-1", "1.001", "1e2"])
    assert.equal(selectedPaymentMinor(booking, "custom", value), 0);
});
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
