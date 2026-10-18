import { test } from "node:test";
import assert from "node:assert/strict";
import { exclaim } from "../src/example.js";

test("AC-1: exclaim appends one exclamation mark", () => {
  assert.equal(exclaim("Hello"), "Hello!");
});

test("AC-2: exclaim trims and collapses trailing exclamation marks", () => {
  assert.equal(exclaim(" Hello!!! "), "Hello!");
});

test("AC-3: exclaim throws TypeError for non-string, empty, or whitespace-only input", () => {
  for (const bad of [42, null, undefined, "", "   "]) {
    assert.throws(() => exclaim(bad), TypeError);
  }
});
