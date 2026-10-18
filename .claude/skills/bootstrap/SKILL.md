---
name: bootstrap
description: Once per project, interactively, on Fable. Interview the owner, write docs/SPEC.md, plan in plan mode, scaffold the stack with CI wired and one tested example of each pattern, fill CLAUDE.md and docs/ARCHITECTURE.md, open the bootstrap PR, then file the probe issue. Never unattended.
---

# /bootstrap

The template carries everything identical across projects. This skill does the part that needs judgment, with the owner present, because it makes the decisions every later run inherits. It is not done until the pipeline has produced its first PR.

## Step 1: preconditions

Check all of these before asking anything; stop and say what to fix if one fails:

1. **Model is Fable.** If not: "run `claude --model fable` (or `/model fable`), then `/bootstrap` again." The frontmatter can't set it for a conversation.
2. **`.claude/project.json` exists** in the clone. If not, `setup.sh` hasn't run; stop.
3. **`development` is the default branch and is protected**: `gh api repos/{owner}/{repo}/rulesets --jq '.[].name'` lists `development` and `production`. If not, stop: this skill works on a `bootstrap` branch and opens a PR, and the point of that is lost if `development` accepts pushes.
4. `gh auth status` succeeds as the repo owner; `git status` is clean on `development` and up to date with origin.
5. The template's checks pass as shipped: `npm ci && npm run lint && npm run typecheck && npm test`. If they don't, the template is broken; say so and stop.

Then `git checkout -b bootstrap`.

## Step 2: interview

One topic per message. Don't move on until it is answered; offer a default where one is obvious and say it is the default.

1. **What the app is and for whom**, in plain English, as to a new hire. Follow up until you could write `docs/SPEC.md` from it.
2. **Runtime target**: browser, Node, or both.
3. **Framework and test runner**, or no preference. The template is JS/TS-family (Node CI, ESLint test-integrity rules, lcov patch coverage, CodeQL javascript-typescript): a React app, a Node API, a vanilla-JS game all fit; a stack outside JS/TS does not, say so and stop. Default when no preference: TypeScript, Vitest; framework by target.
4. **Persistence**: none, SQLite, Postgres, other. If any: migrations and seed are part of the scaffold and of CI.
5. **Auth**: none, or which approach. Auth code is `risk:high` by nature.
6. **Preview host**, and whether it deploys branches whose commits are authored by the owner's GitHub App (`<slug>[bot]`). If unknown, note it as a per-project checklist item.
7. **Risk areas**: beyond auth, payments, deletion, migrations, which parts of this domain are `risk:high`.
8. **Renderable UI?** Whether the runner can render something to screenshot. Yes → screenshot capture gets wired (step 5). No → `CLAUDE.md` records "no screenshots: no renderable UI".

## Step 3: docs/SPEC.md, then approval

Write `docs/SPEC.md` into the skeleton's sections (What it is, Who uses it, The core flows, Data it holds, Rules that always hold, Out of scope for now). Show it in full and get an explicit approval before anything else. Edit until approved.

## Step 4: plan, in plan mode

Enter plan mode and produce the plan the owner approves:

- Stack and versions; directory layout; the **patterns** the codebase will have (route/endpoint, UI component, data access, migration, job, whatever this stack has), each of which gets exactly one real example with a test.
- What `package.json` scripts become: `lint`, `typecheck`, `test`, `test:coverage` (must emit `coverage/lcov.info`), `coverage:patch`, `build`, `dev`, plus `migrate` and `seed` if there is persistence.
- What CI needs: DB service container, env vars, migrate and seed steps.
- The screenshot tool, if any (step 5).
- Which `.claude/rules/*.md` to create for path-scoped conventions, and which conventions become lint rules instead of prose.

Exit plan mode only on approval.

## Step 5: scaffold on `bootstrap`

Work in small commits with clear messages; the owner reads this PR by hand.

1. **Framework and runner.** Install, configure, replace the placeholder scripts in `package.json`. Keep `tools/eslint/integrity-rules.js` and the test-integrity block in `eslint.config.js` untouched; add the framework's ESLint plugin and the runner's globals **around** it, never loosening it. Keep `tools/patch-coverage.mjs`; point `test:coverage` at `coverage/lcov.info` (every common runner can emit lcov) and set `PATCH_COVERAGE_INCLUDE` in `ci.yml` to the real source roots. Delete `src/example.js` and `test/example.test.js`. Keep `test/lint-rules.test.js`.
2. **One vertical slice per pattern**, each with a test named `AC-n: …` for a criterion stated in the commit message, so a run has something to copy rather than invent. Small, real, idiomatic for the stack; not a demo app.
3. **Persistence**, if any: schema, first migration, seed, and the DB wired into `ci.yml` **and** the implementer jobs in `.github/workflows/claude-issues.yml` and `claude.yml` (service container, env, migrate, seed steps before the Action step). **Not** `claude-review.yml`: the reviewer stays read-only and gets none of it.
4. **Allowed tools**: add the dev-server, migrate, seed, and screenshot commands to `.claude/run-settings.json` `permissions.allow` by exact name (`Bash(npm run migrate:*)` and so on). Nothing broader.
5. **Screenshots**, when there is a renderable UI: a headless browser used as a tool in the run (Playwright's library is fine; it is e2e *suites* the design rejects), with one script, e.g. `npm run screenshot -- --url <path> --out screenshots/issue-N/ac-2.png`, that starts the dev server if needed, renders, writes the file, exits. Document the command in `CLAUDE.md`'s table and allow it in settings. Otherwise write "no renderable UI" in that table row.
6. **CLAUDE.md**: fill the skeleton. Short. The product paragraph, the commands table, the screenshot decision, the conventions that can only be prose, the `risk:high` areas. Everything that can be a lint rule should be one, with a link.
7. **docs/ARCHITECTURE.md**: the real map. Stack, layout (one line per directory), the pattern table with the path of each example and its test, data, boundaries, deploy.
8. **`.claude/rules/*.md`**: the path-scoped conventions from the plan.
9. Run the full check locally: `npm run lint && npm run typecheck && npm run test:coverage && npm run build`, and `PATCH_COVERAGE_BASE=origin/development npm run coverage:patch`.

## Step 6: the bootstrap PR

`git push -u origin bootstrap`, then `gh pr create --base development --head bootstrap` with a body that lists the decisions from the interview, the pattern table, and anything the owner should check in CI. The review workflow skips head `bootstrap` on purpose: this diff is read by the owner. Wait for `ci` and `CodeQL` to go green; fix on the branch if not. The owner merges (squash).

## Step 7: the probe issue

After the merge, `git checkout development && git pull`. File one issue in the form's section shape (Summary, Why, Acceptance criteria AC-1…AC-3, Out of scope, How to verify in the preview): small, real, touching one pattern with a visible result, with criteria that are unambiguous on purpose. Add it to the project in Backlog. Then tell the owner:

- promote it to Ready and add `claude` (or `/dispatch`), and watch the first run end to end;
- the spec's probe list, starting with probe #1 (the app token is minted, `gh` inside the run uses it, its push triggers CI), then the same issue re-run under `model:opus` to compare;
- the per-project checklist: preview host connected with `production` as the production branch, core-flow integration tests to write by hand.

Bootstrap is done when that first PR exists against `development`, opened by the run itself.

## Not this skill's job

Labels, rulesets, secrets, the project board (`setup.sh`). Feature planning (`/plan`). Dispatch (`/dispatch`). Running unattended, ever.
