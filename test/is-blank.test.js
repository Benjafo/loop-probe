import { test } from "node:test";
import assert from "node:assert/strict";
import { isBlank } from "../src/example.js";

test("AC-1: isBlank returns true for empty, whitespace-only, and non-string input", () => {
  assert.equal(isBlank(""), true);
  assert.equal(isBlank("   "), true);
  assert.equal(isBlank(null), true);
  assert.equal(isBlank(42), true);
});

test("AC-2: isBlank returns false for strings with visible characters", () => {
  assert.equal(isBlank("Ada"), false);
  assert.equal(isBlank(" a "), false);
});
