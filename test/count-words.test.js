import { test } from "node:test";
import assert from "node:assert/strict";
import { countWords } from "../src/example.js";

test("AC-1: countWords counts words in a simple string", () => {
  assert.equal(countWords("Ada Lovelace"), 2);
});

test("AC-2: countWords ignores extra surrounding and inner whitespace", () => {
  assert.equal(countWords("  one   two  three "), 3);
});

test("AC-3: countWords rejects non-strings, empty, and whitespace-only input", () => {
  assert.throws(() => countWords(42), TypeError);
  assert.throws(() => countWords(undefined), TypeError);
  assert.throws(() => countWords(""), TypeError);
  assert.throws(() => countWords("  \t\n "), TypeError);
});
