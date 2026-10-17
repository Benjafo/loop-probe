// Placeholder test. Test names carry the acceptance-criterion id from the
// issue (AC-1, AC-2, …) so "every criterion has a test" is a check, not a judgment.
import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/example.js";

test("AC-1: greets by trimmed name", () => {
  assert.equal(greet("  Ada "), "Hello, Ada!");
});

test("AC-2: rejects an empty name", () => {
  assert.throws(() => greet("   "), TypeError);
});
