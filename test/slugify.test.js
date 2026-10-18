import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/example.js";

test("AC-1: slugify lower-cases and hyphenates, trimming the ends", () => {
  assert.equal(slugify(" Hello, World! "), "hello-world");
});

test("AC-2: slugify collapses runs of other characters and strips edge hyphens", () => {
  assert.equal(slugify("Ada Lovelace"), "ada-lovelace");
  assert.equal(slugify("Route 66"), "route-66");
  assert.equal(slugify("a--b__c"), "a-b-c");
  assert.equal(slugify("--Already-Slugged--"), "already-slugged");
});

test("AC-3: slugify rejects a non-string, empty, or whitespace-only argument", () => {
  assert.throws(() => slugify(42), TypeError);
  assert.throws(() => slugify(null), TypeError);
  assert.throws(() => slugify(undefined), TypeError);
  assert.throws(() => slugify(""), TypeError);
  assert.throws(() => slugify("   "), TypeError);
});

test("AC-4: slugify rejects a string with no ASCII letters or digits", () => {
  assert.throws(() => slugify("!!!"), TypeError);
  assert.throws(() => slugify(" - "), TypeError);
  assert.throws(() => slugify("日本"), TypeError);
});

test("AC-5: slugify does not transliterate non-ASCII letters", () => {
  assert.equal(slugify("Café Münster"), "caf-m-nster");
});
