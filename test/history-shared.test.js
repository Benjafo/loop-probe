import { test } from "node:test";
import assert from "node:assert/strict";
import { greet, history } from "../src/example.js";

// Imports the module without a query string so coverage is credited to
// src/example.js; assertions are relative to whatever earlier calls logged.
test("history of the shared module keeps the newest 50 greetings and returns a copy", () => {
  for (let i = 1; i <= 51; i += 1) {
    greet(`Shared ${i}`);
  }
  const entries = history();
  assert.equal(entries.length, 50);
  assert.equal(entries[0], "Hello, Shared 2!");
  assert.equal(entries[49], "Hello, Shared 51!");
  entries.length = 0;
  assert.equal(history().length, 50);
});
