import test from "node:test";
import assert from "node:assert/strict";
import { validateService } from "../src/modules/vendor/service-management/service-validation.js";

const valid = () => ({
  name: "Wedding Venue",
  categoryId: 1,
  subcategoryId: null,
  serviceType: "On site",
  shortDescription: "A beautiful venue.",
  description: "A beautiful venue for your wedding celebration.",
  pricing: {
    basePrice: 100000,
    unitPrice: 0,
    minimumQuantity: 1,
    maximumQuantity: 1,
    unit: "Per Event",
    discount: 0,
    specialPrice: null,
    weekendPrice: null,
    seasonalPrice: null,
    seasonalFrom: null,
    seasonalTo: null,
    additionalCharges: 0,
  },
  availability: {
    days: [1, 2, 3, 4, 5],
    start: "09:00",
    end: "20:00",
    advanceDays: 180,
    noticeHours: 24,
  },
  location: {
    address: "",
    city: "Jaipur",
    state: "",
    country: "India",
    zip: "",
    latitude: null,
    longitude: null,
    mode: "Both",
  },
  policies: {
    advancePercentage: 0,
    travelCharges: 0,
    setupTime: 0,
    duration: 0,
    cancellation: "Cancel at least 30 days before the event.",
    refund: "",
    rescheduling: "",
    additionalCharges: "",
    terms: "",
  },
  items: [],
  seo: {
    title: "",
    description: "",
    keywords: "",
    slug: "wedding-venue",
  },
});

test("service validation allows a valid draft and complete submission", () => {
  const data = valid();
  assert.equal(validateService(data), null);
  assert.equal(validateService(data, { submit: true, imageCount: 1 }), null);
});

test("submission validation points vendors to the missing fields", () => {
  const data = valid();
  data.shortDescription = "";
  assert.deepEqual(validateService(data, { submit: true, imageCount: 1 }), {
    step: 0,
    message: "Add a short description before submitting.",
  });
  data.shortDescription = "A beautiful venue.";
  data.location.city = "";
  assert.equal(validateService(data, { submit: true, imageCount: 1 }).step, 5);
  data.location.city = "Jaipur";
  assert.equal(validateService(data, { submit: true, imageCount: 0 }).step, 4);
});

test("draft validation rejects invalid pricing, dates, items and slugs", () => {
  const cases = [
    [(data) => (data.pricing.discount = 101), 2],
    [(data) => (data.pricing.type = "Approved"), 2],
    [(data) => (data.policies.duration = 10.5), 7],
    [(data) => (data.availability.end = "08:00"), 6],
    [(data) => (data.items = [{ name: "", quantity: 1, price: 0 }]), 3],
    [(data) => (data.seo.slug = "Bad Slug"), 7],
    [(data) => (data.pricing.minimumPrice = -1), 2],
    [(data) => { data.pricing.minimumPrice = 200; data.pricing.maximumPrice = 100; }, 2],
  ];
  for (const [mutate, step] of cases) {
    const data = valid();
    mutate(data);
    assert.equal(validateService(data).step, step);
  }
});
