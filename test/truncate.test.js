import { test } from "node:test";
import assert from "node:assert/strict";
import { truncate } from "../src/example.js";

test("AC-1: truncate cuts \"Hello world\" at max 5 and returns \"Hello…\"", () => {
  assert.equal(truncate("Hello world", 5), "Hello…");
});

test("AC-2: truncate result is at most max characters long, counting the ellipsis as one", () => {
  const result = truncate("Hello world", 5);
  assert.ok(result.length <= 5, "result must be at most 5 characters long");
  assert.ok(result.endsWith("…"));
});

test("AC-3: truncate returns a string shorter than max unchanged, with no ellipsis", () => {
  assert.equal(truncate("Hi", 5), "Hi");
});

test("AC-4: truncate throws a RangeError when max is not a positive integer", () => {
  assert.throws(() => truncate("Hello world", 0), RangeError);
  assert.throws(() => truncate("Hello world", -1), RangeError);
  assert.throws(() => truncate("Hello world", 2.5), RangeError);
  assert.throws(() => truncate("Hello world", "5"), RangeError);
});
