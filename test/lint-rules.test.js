// Guards the test-integrity lint rules themselves: if someone loosens them,
// this test fails. Runs the rules through ESLint's Linter API on fixtures.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";
import plugin from "../tools/eslint/integrity-rules.js";

const linter = new Linter({ configType: "flat" });
/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    files: ["**/*.js"],
    plugins: { "test-integrity": /** @type {any} */ (plugin) },
    languageOptions: { ecmaVersion: 2024, sourceType: "module" },
    rules: {
      "test-integrity/no-skipped-tests": "error",
      "test-integrity/no-focused-tests": "error",
      "test-integrity/no-empty-tests": "error",
      "test-integrity/expect-assertion": "error",
    },
  },
];

/** @param {string} code */
function ruleIds(code) {
  return linter.verify(code, config, { filename: "fixture.test.js" }).map((m) => m.ruleId).sort();
}

test("AC-1: a skipped test fails lint", () => {
  assert.deepEqual(ruleIds(`it.skip("x", () => { expect(1).toBe(1); });`), ["test-integrity/no-skipped-tests"]);
  assert.deepEqual(ruleIds(`xit("x", () => { expect(1).toBe(1); });`), ["test-integrity/no-skipped-tests"]);
  assert.deepEqual(ruleIds(`describe.skip("s", () => {});`), ["test-integrity/no-skipped-tests"]);
  assert.deepEqual(ruleIds(`test.todo("later");`), ["test-integrity/no-skipped-tests"]);
});

test("AC-2: a focused test fails lint", () => {
  assert.deepEqual(ruleIds(`it.only("x", () => { expect(1).toBe(1); });`), ["test-integrity/no-focused-tests"]);
  assert.deepEqual(ruleIds(`fdescribe("s", () => {});`), ["test-integrity/no-focused-tests"]);
});

test("AC-3: an empty test fails lint", () => {
  assert.deepEqual(ruleIds(`it("x", () => {});`), ["test-integrity/no-empty-tests"]);
  assert.deepEqual(ruleIds(`it("pending");`), ["test-integrity/no-empty-tests"]);
});

test("AC-4: an assertion-free test fails lint", () => {
  assert.deepEqual(ruleIds(`it("x", () => { doThing(); });`), ["test-integrity/expect-assertion"]);
  assert.deepEqual(ruleIds(`test("x", async (t) => { await run(); });`), ["test-integrity/expect-assertion"]);
});

test("AC-5: honest tests across runners pass lint", () => {
  assert.deepEqual(ruleIds(`it("x", () => { expect(1).toBe(1); });`), []);
  assert.deepEqual(ruleIds(`test("x", () => { assert.equal(1, 1); });`), []);
  assert.deepEqual(ruleIds(`test("x", (t) => { t.assert.ok(true); });`), []);
  assert.deepEqual(ruleIds(`test("x", (t) => { t.plan(1); setTimeout(() => t.assert.ok(true)); });`), []);
  assert.deepEqual(ruleIds(`it.each([1,2])("x %i", (n) => { expect(n).toBeGreaterThan(0); });`), []);
  assert.deepEqual(ruleIds(`it("x", () => { expect(x).to.be.true; });`), []);
});
