import { test } from "node:test";
import assert from "node:assert/strict";
import { initials } from "../src/example.js";

test("AC-1: initials returns the upper-cased first letters of each word with periods", () => {
  assert.equal(initials("Ada Lovelace"), "A.L.");
});

test("AC-2: initials ignores extra whitespace and upper-cases lower-case names", () => {
  assert.equal(initials(" ada lovelace "), "A.L.");
});

test("AC-3: initials returns a single initial for a single word", () => {
  assert.equal(initials("Ada"), "A.");
});

test("AC-4: initials throws a TypeError for a non-string, empty, or whitespace-only argument", () => {
  assert.throws(() => initials(42), TypeError);
  assert.throws(() => initials(undefined), TypeError);
  assert.throws(() => initials(null), TypeError);
  assert.throws(() => initials(""), TypeError);
  assert.throws(() => initials("   "), TypeError);
});
