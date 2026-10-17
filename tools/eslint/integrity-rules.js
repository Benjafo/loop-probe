// @ts-nocheck -- plain ESLint plugin; AST node shapes come from ESLint at runtime.
// Local ESLint plugin: test-integrity.
//
// Four rules that make CI fail on tests that don't test anything. They are
// runner-agnostic: they match the `describe / it / test` call shapes shared by
// vitest, jest, mocha, and node:test, so /bootstrap can pick any of those
// without touching this file. Add runner-specific assertion names through the
// rule options in eslint.config.js if the runner introduces new ones.
//
//   test-integrity/no-skipped-tests   it.skip, describe.skip, xit, it.todo, …
//   test-integrity/no-focused-tests   it.only, fit, fdescribe, …
//   test-integrity/no-empty-tests     it('…', () => {})
//   test-integrity/expect-assertion   a test body with no expect/assert call

const TEST_FNS = new Set(["it", "test", "specify"]);
const SUITE_FNS = new Set(["describe", "suite", "context"]);
const SKIP_PREFIXED = new Set(["xit", "xtest", "xdescribe", "xspecify", "xcontext"]);
const FOCUS_PREFIXED = new Set(["fit", "ftest", "fdescribe", "fspecify", "fcontext"]);
const SKIP_MODIFIERS = new Set(["skip", "todo"]);
const FOCUS_MODIFIERS = new Set(["only"]);
const DEFAULT_ASSERTION_ROOTS = ["expect", "assert", "assertThat", "should"];

/** Returns the identifier chain of a callee, e.g. it.skip.each -> ["it","skip","each"]. */
function chain(node) {
  const parts = [];
  let cur = node;
  while (cur) {
    if (cur.type === "Identifier") {
      parts.unshift(cur.name);
      return parts;
    }
    if (cur.type === "MemberExpression" && !cur.computed && cur.property.type === "Identifier") {
      parts.unshift(cur.property.name);
      cur = cur.object;
      continue;
    }
    if (cur.type === "CallExpression") {
      // it.each([...])('name', fn) and friends: look through the inner call.
      cur = cur.callee;
      continue;
    }
    return null;
  }
  return null;
}

function calleeChain(callNode) {
  return chain(callNode.callee);
}

function isLeafTestCall(callNode) {
  const c = calleeChain(callNode);
  return !!c && TEST_FNS.has(c[0]);
}

function testCallback(callNode) {
  // The test body is the last function argument.
  for (let i = callNode.arguments.length - 1; i >= 0; i--) {
    const a = callNode.arguments[i];
    if (a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression") return a;
  }
  return null;
}

function hasAssertion(fnNode, assertionRoots, sourceCode) {
  const roots = new Set(assertionRoots);
  let found = false;
  const visited = new Set();
  function walk(node) {
    if (found || !node || typeof node.type !== "string" || visited.has(node)) return;
    visited.add(node);
    if (node.type === "CallExpression") {
      const c = chain(node.callee);
      if (c) {
        // expect(x).toBe(y) / assert.equal / t.assert.ok / assert(x)
        if (roots.has(c[0]) || (c.length > 1 && roots.has(c[1]))) {
          found = true;
          return;
        }
        // t.plan(n) in node:test counts as declaring assertions.
        if (c.length >= 2 && c[c.length - 1] === "plan") {
          found = true;
          return;
        }
      }
    }
    // expect(x).toMatchSnapshot(), chai `expect(x).to.be.true` end in a member, not a call
    if (node.type === "MemberExpression") {
      const c = chain(node);
      if (c && roots.has(c[0])) {
        found = true;
        return;
      }
    }
    for (const key of sourceCode.visitorKeys[node.type] ?? []) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child.type === "string") walk(child);
    }
  }
  walk(fnNode.body);
  return found;
}

const noSkippedTests = {
  meta: {
    type: "problem",
    docs: { description: "disallow skipped or todo tests (it.skip, xit, it.todo, describe.skip)" },
    schema: [],
    messages: { skipped: "Skipped test or suite ('{{name}}'). Delete it or make it run." },
  },
  create(context) {
    return {
      CallExpression(node) {
        const c = calleeChain(node);
        if (!c) return;
        if (SKIP_PREFIXED.has(c[0]) || ((TEST_FNS.has(c[0]) || SUITE_FNS.has(c[0])) && c.slice(1).some((m) => SKIP_MODIFIERS.has(m)))) {
          context.report({ node: node.callee, messageId: "skipped", data: { name: c.join(".") } });
        }
      },
    };
  },
};

const noFocusedTests = {
  meta: {
    type: "problem",
    docs: { description: "disallow focused tests (it.only, fit, describe.only)" },
    schema: [],
    messages: { focused: "Focused test or suite ('{{name}}') would silence the rest of the suite." },
  },
  create(context) {
    return {
      CallExpression(node) {
        const c = calleeChain(node);
        if (!c) return;
        if (FOCUS_PREFIXED.has(c[0]) || ((TEST_FNS.has(c[0]) || SUITE_FNS.has(c[0])) && c.slice(1).some((m) => FOCUS_MODIFIERS.has(m)))) {
          context.report({ node: node.callee, messageId: "focused", data: { name: c.join(".") } });
        }
      },
    };
  },
};

const noEmptyTests = {
  meta: {
    type: "problem",
    docs: { description: "disallow tests with an empty body" },
    schema: [],
    messages: { empty: "Empty test body: this test passes without checking anything." },
  },
  create(context) {
    return {
      CallExpression(node) {
        // Only plain leaf tests: skipped/focused variants are reported by the
        // other two rules, and `it.each(table)` is a curried call whose test
        // body belongs to the outer call.
        if (!isLeafTestCall(node)) return;
        const c = calleeChain(node);
        if (c.slice(1).some((m) => SKIP_MODIFIERS.has(m) || FOCUS_MODIFIERS.has(m))) return;
        if (node.parent?.type === "CallExpression" && node.parent.callee === node) return;
        const fn = testCallback(node);
        if (!fn) {
          // it('name') with no callback is a pending test in mocha; flag it too.
          if (node.arguments.length <= 1) {
            context.report({ node, messageId: "empty" });
          }
          return;
        }
        if (fn.body.type === "BlockStatement" && fn.body.body.length === 0) {
          context.report({ node: fn, messageId: "empty" });
        }
      },
    };
  },
};

const expectAssertion = {
  meta: {
    type: "problem",
    docs: { description: "require every test to contain at least one assertion" },
    schema: [
      {
        type: "object",
        properties: {
          assertionRoots: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: { none: "Test has no assertion (looked for calls rooted at: {{roots}})." },
  },
  create(context) {
    const roots = context.options[0]?.assertionRoots ?? DEFAULT_ASSERTION_ROOTS;
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      CallExpression(node) {
        if (!isLeafTestCall(node)) return;
        const fn = testCallback(node);
        if (!fn) return; // no-empty-tests reports this one
        if (fn.body.type === "BlockStatement" && fn.body.body.length === 0) return; // ditto
        if (!hasAssertion(fn, roots, sourceCode)) {
          context.report({ node: fn, messageId: "none", data: { roots: roots.join(", ") } });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "test-integrity", version: "1.0.0" },
  rules: {
    "no-skipped-tests": noSkippedTests,
    "no-focused-tests": noFocusedTests,
    "no-empty-tests": noEmptyTests,
    "expect-assertion": expectAssertion,
  },
};

export default plugin;
