import test from "node:test";
import assert from "node:assert/strict";
import { financeCardSection } from "../src/modules/admin/navigation.js";

test("finance cards belong only to their matching finance page", () => {
  for (const [path, section] of [
    ["payment-overview", "overview"], ["refund-requests", "refund-review"],
    ["payment-reconciliation", "reconciliation"], ["refunds", "refunds"],
    ["payouts", "payouts"], ["commission", "commission"],
  ]) {
    assert.equal(financeCardSection(`/admin/${path}`), section);
    assert.equal(financeCardSection(`/admin/${path}/`), section);
  }
});

test("other admin pages never render refund or payout card groups", () => {
  for (const path of ["services", "categories", "customers", "vendors", "bookings", "payments", "dashboard", "settings", "finance/refunds/example"])
    assert.equal(financeCardSection(`/admin/${path}`), null);
});
