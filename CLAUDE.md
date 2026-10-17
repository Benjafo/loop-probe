# CLAUDE.md

<!-- Skeleton. /bootstrap fills this. Keep it short: a cold run should orient in two tool calls. Path-scoped conventions go in .claude/rules/*.md, not here. The owner owns the content; a run may propose additions in a PR under "What I had to guess". -->

## What this is

<!-- One paragraph. The product in plain English; docs/SPEC.md has the rest. -->

## Map

`docs/ARCHITECTURE.md` is the map of the codebase: every layer and where the example of each pattern lives. Read it before writing code, and copy the nearest example rather than inventing a shape.

Capitalized docs (`ARCHITECTURE.md`, `SPEC.md`, any new one) live in `docs/`. Only files read natively from the root stay there: this file and `README.md`. `.claude/REVIEW.md` stays under `.claude/` because the Action restores that directory from the base branch.

## Commands

| Task | Command |
|---|---|
| Lint (includes test-integrity rules) | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Tests | `npm test` |
| Tests with coverage (writes `coverage/lcov.info`) | `npm run test:coverage` |
| Patch coverage on changed lines | `npm run coverage:patch` |
| Build | `npm run build` |
| Dev server | `npm run dev` <!-- /bootstrap: real command --> |
| Screenshots | <!-- /bootstrap: the capture command, or "no renderable UI" --> |

CI runs lint, typecheck, test, patch coverage, build, and CodeQL. Lint fails on skipped, focused, empty, or assertion-free tests. Patch coverage must reach 80% on changed lines.

## How work arrives

Issues carry numbered acceptance criteria (AC-1, AC-2, …). The first commit on a branch is one failing test per criterion, named `AC-n: …`, and nothing else; those tests are not edited afterward. Implementation follows. Screenshots go in `screenshots/issue-N/` as the last commit. The PR body follows the template in `.claude/prompts/implement.md`.

If the criteria are ambiguous or the issue is more than one feature: ask on the issue, open no PR.

## Conventions that can only be prose

<!-- /bootstrap: the handful of rules a linter can't express. Everything that can be a lint rule should be one. -->

- 

## Risk

`risk:high` areas in this codebase: <!-- /bootstrap: list them --> auth, payments, deletion, migrations. Changes there get a security-focused review and a mandatory human diff read.
