import { test } from "node:test";
import assert from "node:assert/strict";
import { farewell } from "../src/example.js";

test("AC-1: farewell returns a goodbye with the trimmed name", () => {
  assert.equal(farewell("  Ada "), "Goodbye, Ada!");
});

test("AC-2: farewell rejects an empty or whitespace-only name", () => {
  assert.throws(() => farewell(""), TypeError);
  assert.throws(() => farewell("   "), TypeError);
});

test("AC-3: farewell rejects a non-string argument", () => {
  assert.throws(() => farewell(42), TypeError);
  assert.throws(() => farewell(undefined), TypeError);
  assert.throws(() => farewell(null), TypeError);
});
