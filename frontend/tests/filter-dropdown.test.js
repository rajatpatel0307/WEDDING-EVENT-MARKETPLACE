import test from "node:test";
import assert from "node:assert/strict";
import { filterDropdownOptions, filterDropdownPosition } from "../src/modules/admin/filter-dropdown.js";

test("category and city searches match names regardless of case, spaces and accents", () => {
  const categories = [
    { value: "", label: "All categories" }, { value: "7", label: "Wedding Photography" },
    { value: "8", label: "Catering" }, { value: "9", label: "Photo Booth" },
  ];
  assert.deepEqual(filterDropdownOptions(categories, " PHOTO ").map(item => item.value), ["7", "9"]);
  const cities = [{ value: "Pune", label: "Pune" }, { value: "São Paulo", label: "São Paulo" }];
  assert.deepEqual(filterDropdownOptions(cities, "sao"), [cities[1]]);
  assert.deepEqual(filterDropdownOptions(cities, "pUNe"), [cities[0]]);
});

test("empty dropdown search restores all choices and missing terms return no matches", () => {
  const options = Array.from({ length: 250 }, (_, index) => ({ value: String(index), label: `City ${index}` }));
  assert.equal(filterDropdownOptions(options, " ").length, 250);
  assert.deepEqual(filterDropdownOptions(options, "unavailable"), []);
  assert.equal(options.length, 250);
});

test("dropdown menus open above the control near the bottom of the viewport", () => {
  const result = filterDropdownPosition({ left: 850, top: 650, bottom: 690, width: 112 }, { width: 1000, height: 720 });
  assert.equal(result.left, 748);
  assert.equal(result.width, 240);
  assert.equal(result.bottom, 76);
  assert.equal(result.top, undefined);
  assert.equal(result.listHeight, 240);
});

test("dropdown menus stay inside narrow viewports and constrain the scrollable list", () => {
  const result = filterDropdownPosition({ left: 8, top: 20, bottom: 60, width: 124 }, { width: 230, height: 330 });
  assert.equal(result.left, 12);
  assert.equal(result.width, 206);
  assert.equal(result.top, 66);
  assert.equal(result.listHeight, 188);
});
