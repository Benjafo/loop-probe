#!/usr/bin/env node
// Patch coverage: of the lines this branch added or changed, how many did the
// test suite execute? Reads coverage/lcov.info (any runner that emits lcov:
// node:test, vitest, jest, c8) and the git diff against the base branch.
// No external account; this is the local alternative to Codecov's patch target.
//
//   PATCH_COVERAGE_MIN      threshold in percent, default 80
//   PATCH_COVERAGE_BASE     git ref to diff against, default origin/development
//   PATCH_COVERAGE_LCOV     path to the lcov file, default coverage/lcov.info
//   PATCH_COVERAGE_INCLUDE  comma-separated path prefixes whose changed files
//                           count as uncovered when absent from the lcov report
//                           (i.e. new source files no test ever loaded).
//                           Default "src/". /bootstrap sets this to the real
//                           source roots.
//
// Exits 1 when coverage is below the threshold. Prints a per-file table either way.

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const MIN = Number(process.env.PATCH_COVERAGE_MIN ?? 80);
const BASE = process.env.PATCH_COVERAGE_BASE ?? "origin/development";
const LCOV = process.env.PATCH_COVERAGE_LCOV ?? "coverage/lcov.info";
const INCLUDE = (process.env.PATCH_COVERAGE_INCLUDE ?? "src/").split(",").map((s) => s.trim()).filter(Boolean);
const SOURCE_EXT = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts"]);
const ALWAYS_IGNORED = ["screenshots/", "coverage/", "node_modules/", "dist/", "build/", ".github/", ".claude/", "tools/"];
const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(^|\/)__tests__\/|(^|\/)test\//;

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** Parse lcov into Map<relativePath, Map<line, hits>>. */
function parseLcov(text) {
  const files = new Map();
  let current = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("SF:")) {
      const abs = line.slice(3);
      const rel = path.isAbsolute(abs) ? path.relative(process.cwd(), abs) : abs;
      current = new Map();
      files.set(rel.split(path.sep).join("/"), current);
    } else if (line.startsWith("DA:") && current) {
      const [ln, hits] = line.slice(3).split(",");
      current.set(Number(ln), Number(hits));
    } else if (line === "end_of_record") {
      current = null;
    }
  }
  return files;
}

/** Parse `git diff -U0` into Map<file, Set<addedLineNumber>>. */
function changedLines(base) {
  const diff = sh(`git diff --unified=0 --no-color --diff-filter=AM ${base}...HEAD`);
  const out = new Map();
  let file = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      file = line.startsWith("+++ b/") ? line.slice(6) : null;
      if (file) out.set(file, new Set());
      continue;
    }
    if (!file) continue;
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (m) {
      const start = Number(m[1]);
      const count = m[2] === undefined ? 1 : Number(m[2]);
      for (let i = 0; i < count; i++) out.get(file).add(start + i);
    }
  }
  return out;
}

function isCandidate(file) {
  if (ALWAYS_IGNORED.some((p) => file.startsWith(p))) return false;
  if (TEST_FILE.test(file)) return false;
  return SOURCE_EXT.has(path.extname(file));
}

if (!existsSync(LCOV)) {
  console.error(`patch-coverage: ${LCOV} not found. Run the coverage script first.`);
  process.exit(1);
}

const lcov = parseLcov(readFileSync(LCOV, "utf8"));
const changed = changedLines(BASE);

let covered = 0;
let total = 0;
const rows = [];
for (const [file, lines] of changed) {
  if (!isCandidate(file) || lines.size === 0) continue;
  const fileCov = lcov.get(file);
  if (!fileCov) {
    if (!INCLUDE.some((p) => file.startsWith(p))) continue; // not instrumented and not a source root: skip
    // A source file no test loaded: every changed line is uncovered.
    rows.push({ file, covered: 0, total: lines.size, note: "not loaded by any test" });
    total += lines.size;
    continue;
  }
  let c = 0;
  let t = 0;
  for (const ln of lines) {
    if (!fileCov.has(ln)) continue; // non-executable line (blank, comment, brace)
    t++;
    if (fileCov.get(ln) > 0) c++;
  }
  if (t === 0) continue;
  rows.push({ file, covered: c, total: t, note: "" });
  covered += c;
  total += t;
}

if (total === 0) {
  console.log(`patch-coverage: no executable source lines changed against ${BASE}. Nothing to measure.`);
  process.exit(0);
}

const pct = (covered / total) * 100;
console.log(`patch-coverage against ${BASE} (threshold ${MIN}%)\n`);
for (const r of rows) {
  const p = r.total ? ((r.covered / r.total) * 100).toFixed(1) : "n/a";
  console.log(`  ${p.padStart(6)}%  ${String(r.covered).padStart(4)}/${String(r.total).padEnd(4)}  ${r.file}${r.note ? `  (${r.note})` : ""}`);
}
console.log(`\n  ${pct.toFixed(1)}% of ${total} changed executable lines are covered.`);
if (pct + 1e-9 < MIN) {
  console.error(`\npatch-coverage: FAIL (${pct.toFixed(1)}% < ${MIN}%)`);
  process.exit(1);
}
console.log("\npatch-coverage: OK");
