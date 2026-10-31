import test from "node:test";
import assert from "node:assert/strict";
import { addressInput } from "../src/modules/customers/workspace.service.js";
import { eventLocationInput } from "../src/modules/addresses/location.validation.js";
import {
  validateCoverage,
  eventLocation,
  saveEventLocation,
} from "../src/modules/addresses/locations.service.js";
import * as vendorLocations from "../src/modules/addresses/vendor-locations.service.js";
const address = {
  type: "Home",
  line1: "10 Venue Road",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400001",
  country: "India",
};
test("address input rejects ownership overrides, invalid postal codes and incomplete coordinates", () => {
  assert.equal(addressInput.parse(address).latitude, null);
  for (const changes of [
    { UserId: "another-user" },
    { postalCode: "000000" },
    { latitude: 91, longitude: 72 },
    { latitude: 19 },
    { latitude: "bad", longitude: 72 },
  ])
    assert.throws(() => addressInput.parse({ ...address, ...changes }));
  assert.equal(
    addressInput.parse({ ...address, country: "Canada", postalCode: "K1A 0B1" })
      .postalCode,
    "K1A 0B1",
  );
});
test("event locations accept manual entry without inventing coordinates", () => {
  const { type, ...body } = address;
  assert.equal(eventLocationInput.parse(body).longitude, null);
  assert.throws(() =>
    eventLocationInput.parse({ ...body, CustomerId: "forged" }),
  );
});
test("coverage checks city, postal code, country, radius and booking minimum", () => {
  const location = {
    mode: "Service area",
    cities: ["Mumbai"],
    postalCodes: ["400001"],
    country: "India",
    minimumOrderValue: 1000,
    travelCharge: 250,
  };
  assert.equal(validateCoverage(location, address, 1000).travel, 250);
  for (const destination of [
    { ...address, city: "Delhi" },
    { ...address, postalCode: "400002" },
    { ...address, country: "Canada" },
  ])
    assert.throws(() => validateCoverage(location, destination, 1000));
  assert.throws(() => validateCoverage(location, address, 999));
  assert.throws(() =>
    validateCoverage(
      { ...location, radiusKm: 5, latitude: 19, longitude: 72 },
      address,
      1000,
    ),
  );
  assert.equal(
    validateCoverage(
      { ...location, radiusKm: 5, latitude: 19, longitude: 72 },
      { ...address, latitude: 19.001, longitude: 72 },
      1000,
    ).travel,
    250,
  );
  assert.throws(() =>
    validateCoverage(
      { ...location, radiusKm: 5, latitude: 19, longitude: 72 },
      { ...address, latitude: 20, longitude: 72 },
      1000,
    ),
  );
  assert.equal(
    validateCoverage({ ...location, mode: "Vendor location" }, address, 1000)
      .travel,
    0,
  );
});
test("private location services reject anonymous and wrong-role calls before database access", async () => {
  for (const fn of [
    () => eventLocation("bad", {}),
    () => saveEventLocation("bad", {}, {}),
    () => vendorLocations.list({}),
    () => vendorLocations.action("bad", {}, {}),
  ])
    await assert.rejects(fn);
});
