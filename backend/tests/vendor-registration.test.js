import test from "node:test";
import assert from "node:assert/strict";
import { buildSchema, coerceInputValue } from "graphql";
import { typeDefs } from "../src/graphql/auth/auth.typeDefs.js";

test("vendor signup accepts account details without a registered location", () => {
  const schema = buildSchema(typeDefs);
  const input = schema.getType("VendorInput");
  assert.equal(input.getFields().adminLocationId, undefined);
  assert.doesNotThrow(() => coerceInputValue({
    firstName: "Test", lastName: "Vendor", email: "vendor@example.com",
    phone: "+919876543210", password: "TestPass123!", confirmPassword: "TestPass123!",
    terms: true, privacy: true,
  }, input));
});
