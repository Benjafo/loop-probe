// ESLint flat config. /bootstrap adds the framework's plugin and the chosen
// test runner's globals; it does not loosen the test-integrity block.
import js from "@eslint/js";
import globals from "globals";
import testIntegrity from "./tools/eslint/integrity-rules.js";

const TEST_FILES = ["**/*.{test,spec}.{js,mjs,cjs,ts,tsx,jsx}", "**/__tests__/**/*.{js,mjs,cjs,ts,tsx,jsx}", "test/**/*.{js,mjs,cjs,ts,tsx,jsx}"];

export default [
  {
    // Never lint these. screenshots/ is committed by implementing runs and is
    // not code; the rest is generated or vendored.
    ignores: ["screenshots/**", "coverage/**", "node_modules/**", "dist/**", "build/**", ".claude/**"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Test integrity: these fail CI, by design. Skipped, focused, empty, and
    // assertion-free tests are all ways a test can pass without testing.
    files: TEST_FILES,
    plugins: { "test-integrity": testIntegrity },
    languageOptions: {
      globals: {
        // Shared by vitest, jest, mocha when globals are enabled; node:test
        // imports its own. Harmless when unused.
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        before: "readonly",
        after: "readonly",
      },
    },
    rules: {
      "test-integrity/no-skipped-tests": "error",
      "test-integrity/no-focused-tests": "error",
      "test-integrity/no-empty-tests": "error",
      "test-integrity/expect-assertion": ["error", { assertionRoots: ["expect", "assert", "should", "assertThat"] }],
    },
  },
];
