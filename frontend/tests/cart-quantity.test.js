import test from "node:test";
import assert from "node:assert/strict";
import { cartQuantityBounds, validCartQuantity } from "../src/modules/commerce/cart-quantity.js";

test("cart quantities respect vendor limits and available stock, including zero stock", () => {
  assert.deepEqual(cartQuantityBounds({ minimum: 2, maximum: 10, stock: 4 }), { min: 2, max: 4 });
  assert.equal(validCartQuantity(1, { minimum: 2, stock: 4 }), false);
  assert.equal(validCartQuantity(4, { minimum: 2, stock: 4 }), true);
  assert.equal(validCartQuantity(5, { maximum: 10, stock: 4 }), false);
  assert.equal(validCartQuantity(1, { stock: 0 }), false);
  assert.equal(validCartQuantity(6, { maximum: 5, stock: 10 }), false);
});

test("cart quantity entry rejects empty, fractional and non-finite values", () => {
  for (const value of ["", " ", "1.5", "invalid", Infinity, 0, -1])
    assert.equal(validCartQuantity(value, { stock: 10 }), false);
  assert.equal(validCartQuantity("3", { stock: 10 }), true);
  assert.equal(validCartQuantity(1200, { maximum: null, stock: 1500 }), true);
});
