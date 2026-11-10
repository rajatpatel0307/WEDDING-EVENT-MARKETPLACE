import test from "node:test";
import assert from "node:assert/strict";
import { offerState } from "../src/modules/commerce/offer-state.js";
const row = {
  sellEnabled: true,
  bookEnabled: true,
  bookingAccessStatus: "Approved",
  sellingStock: 10,
  sellingPrice: 15000,
  bookingPrice: 2000,
  sellingAvailable: "true",
  bookingAvailable: "true",
};
test("customer Sell, Book and Both actions use separate prices and allowed capabilities", () => {
  const sell = offerState({ ...row, offerType: "Sell" }),
    book = offerState({ ...row, offerType: "Book" }),
    both = offerState({ ...row, offerType: "Both" });
  assert.equal(sell.canSell, true);
  assert.equal(sell.canBook, false);
  assert.equal(book.canSell, false);
  assert.equal(book.canBook, true);
  assert.equal(both.canSell, true);
  assert.equal(both.canBook, true);
  assert.equal(both.sellingPrice, 15000);
  assert.equal(both.bookingPrice, 2000);
});
test("disabled category, depleted stock, booking access and vendor availability hide customer actions", () => {
  for (const patch of [
    { sellEnabled: false },
    { sellingStock: 0 },
    { sellingAvailable: "false" },
  ])
    assert.equal(
      offerState({ ...row, offerType: "Both", ...patch }).canSell,
      false,
    );
  for (const patch of [
    { bookEnabled: false },
    { bookingAccessStatus: "Suspended" },
    { bookingAvailable: "false" },
  ])
    assert.equal(
      offerState({ ...row, offerType: "Both", ...patch }).canBook,
      false,
    );
  assert.equal(offerState(row).type, undefined);
});
