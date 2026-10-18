import { test } from "node:test";
import assert from "node:assert/strict";
import { reverseWords } from "../src/example.js";

test("AC-1: reverseWords reverses the word order", () => {
  assert.equal(reverseWords("Ada Lovelace"), "Lovelace Ada");
});

test("AC-2: reverseWords trims and single-spaces", () => {
  assert.equal(reverseWords("  one   two "), "two one");
});

test("AC-3: reverseWords throws TypeError for non-string, empty, or whitespace-only input", () => {
  assert.throws(() => reverseWords(42), TypeError);
  assert.throws(() => reverseWords(""), TypeError);
  assert.throws(() => reverseWords("  \t "), TypeError);
});
