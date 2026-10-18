import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/example.js";

test("AC-1: greet with { template } replaces {name} with the trimmed name", () => {
  assert.equal(greet("  Ada ", { template: "Hey {name}!" }), "Hey Ada!");
  assert.equal(greet("Ada", { template: "{name}, welcome back" }), "Ada, welcome back");
});

test("AC-2: greet without options returns Hello, <trimmed name>! as before", () => {
  assert.equal(greet("  Ada "), "Hello, Ada!");
  assert.equal(greet("Ada", {}), "Hello, Ada!");
});

test("AC-3: greet throws a TypeError for a non-string template or one without {name}", () => {
  assert.throws(() => greet("Ada", { template: 42 }), TypeError);
  assert.throws(() => greet("Ada", { template: null }), TypeError);
  assert.throws(() => greet("Ada", { template: "Hey there!" }), TypeError);
});
