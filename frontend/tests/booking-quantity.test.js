import test from "node:test";
import assert from "node:assert/strict";
import { bookingQuantityState } from "../src/modules/commerce/booking-quantity.js";

test("booking buttons recover an out-of-range manual entry for a one-unit service", () => {
  const state = bookingQuantityState(5, { minimum: 1, maximum: 1 });
  assert.equal(state.valid, false);
  assert.equal(state.decrease, 1);
  assert.equal(state.increase, null);
  const restored = bookingQuantityState(state.decrease, { minimum: 1, maximum: 1 });
  assert.equal(restored.valid, true);
  assert.equal(restored.decrease, null);
  assert.equal(restored.increase, null);
});

test("booking steps use numeric arithmetic and stop at the vendor limits", () => {
  const book = { minimum: "2", maximum: "5" };
  assert.deepEqual(bookingQuantityState("3", book), { min: 2, max: 5, valid: true, decrease: 2, increase: 4 });
  assert.equal(bookingQuantityState(2, book).decrease, null);
  assert.equal(bookingQuantityState(5, book).increase, null);
  assert.equal(bookingQuantityState(1, book).increase, 2);
  assert.equal(bookingQuantityState(6, book).decrease, 5);
});

test("booking buttons recover empty and fractional input without sending invalid quantities", () => {
  const book = { minimum: 1, maximum: 5 };
  for (const value of ["", undefined, "invalid", Infinity]) {
    const state = bookingQuantityState(value, book);
    assert.equal(state.valid, false);
    assert.equal(state.decrease, 1);
    assert.equal(state.increase, 1);
  }
  const fractional = bookingQuantityState(2.5, book);
  assert.equal(fractional.valid, false);
  assert.equal(fractional.decrease, 2);
  assert.equal(fractional.increase, 3);
});
