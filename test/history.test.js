import { test } from "node:test";
import assert from "node:assert/strict";

let instance = 0;

// A freshly imported instance of the module has an empty log.
async function freshModule() {
  instance += 1;
  return import(`../src/example.js?history=${instance}`);
}

test("AC-1: history returns the greetings of successful greet calls, oldest first", async () => {
  const { greet, history } = await freshModule();
  greet("Ada");
  greet(" Grace ");
  greet("Alan", { template: "Hi {name}" });
  assert.deepEqual(history(), ["Hello, Ada!", "Hello, Grace!", "Hi Alan"]);
});

test("AC-2: shout records the greeting, not the shouted text", async () => {
  const { shout, history } = await freshModule();
  shout("Ada");
  assert.deepEqual(history(), ["Hello, Ada!"]);
});

test("AC-3: calls that throw record nothing", async () => {
  const { greet, shout, history } = await freshModule();
  assert.throws(() => greet(""), TypeError);
  assert.throws(() => greet("   "), TypeError);
  assert.throws(() => greet(42), TypeError);
  assert.throws(() => greet("Ada", { template: "no placeholder" }), TypeError);
  assert.throws(() => shout(""), TypeError);
  assert.deepEqual(history(), []);
});

test("AC-4: history keeps only the most recent 50 entries", async () => {
  const { greet, history } = await freshModule();
  for (let i = 1; i <= 55; i += 1) {
    greet(`User ${i}`);
  }
  const entries = history();
  assert.equal(entries.length, 50);
  assert.equal(entries[0], "Hello, User 6!");
  assert.equal(entries[49], "Hello, User 55!");
});

test("AC-5: mutating the returned array does not change the log", async () => {
  const { greet, history } = await freshModule();
  greet("Ada");
  greet("Grace");
  const returned = history();
  returned.push("tampered");
  returned.length = 0;
  assert.deepEqual(history(), ["Hello, Ada!", "Hello, Grace!"]);
});
