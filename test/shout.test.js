import { test } from "node:test";
import assert from "node:assert/strict";
import { shout } from "../src/example.js";

test("AC-1: shout returns an upper-cased hello with the trimmed name and a trailing !!!", () => {
  assert.equal(shout("  Ada "), "HELLO, ADA!!!");
  assert.equal(shout("  ada lovelace "), "HELLO, ADA LOVELACE!!!");
});

test("AC-2: shout rejects an empty or whitespace-only name with a TypeError", () => {
  assert.throws(() => shout(""), TypeError);
  assert.throws(() => shout("   "), TypeError);
  assert.throws(() => shout("\t\n "), TypeError);
});
