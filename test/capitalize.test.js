import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { capitalize } from "../src/example.js";

test("AC-1: capitalize upper-cases the first letter of a word", () => {
  assert.equal(capitalize("ada"), "Ada");
});

test("AC-2: capitalize trims surrounding whitespace", () => {
  assert.equal(capitalize(" ada "), "Ada");
});

test("AC-3: capitalize rejects a non-string, empty, or whitespace-only argument", () => {
  assert.throws(() => capitalize(42), TypeError);
  assert.throws(() => capitalize(undefined), TypeError);
  assert.throws(() => capitalize(null), TypeError);
  assert.throws(() => capitalize(""), TypeError);
  assert.throws(() => capitalize("   "), TypeError);
});

test("AC-4: CLAUDE.md states the string-helper input convention in one bullet", () => {
  const claudeMd = readFileSync(new URL("../CLAUDE.md", import.meta.url), "utf8");
  const heading = "## Conventions that can only be prose";
  const start = claudeMd.indexOf(heading);
  assert.notEqual(start, -1);
  const rest = claudeMd.slice(start + heading.length);
  const next = rest.search(/^## /m);
  const section = next === -1 ? rest : rest.slice(0, next);
  const bullets = section.split("\n").filter((line) => /^- \S/.test(line));
  assert.equal(bullets.length, 1);
  const bullet = bullets[0];
  assert.match(bullet, /src\/example\.js/);
  assert.match(bullet, /exported string helper/);
  assert.match(bullet, /trims/);
  assert.match(bullet, /TypeError/);
  assert.match(bullet, /non-string/);
  assert.match(bullet, /empty/);
  assert.match(bullet, /whitespace-only/);
});
