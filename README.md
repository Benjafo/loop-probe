# agentic-coding-repository-template

Template repo for the Issue-to-PR loop: a labeled issue starts a fresh Claude Code run on a GitHub Actions runner that opens a pull request against `development`. PRs are judged from signals (CI, preview, an independent review, the PR report, test names), not by reading the diff.

Everything identical across projects lives here. The judgment calls (`docs/SPEC.md`, the stack, the first examples) are made once per project by `/bootstrap`, interactively.

## What's in the box

| Path | What |
|---|---|
| `.github/workflows/claude-issues.yml` | `claude` label on an issue → implementing run → PR against `development` |
| `.github/workflows/claude.yml` | `@claude …` comment on a PR → revision run on the PR's branch |
| `.github/workflows/claude-review.yml` | Independent review on PR opened / ready, or `@claude review` |
| `.github/workflows/ci.yml` | lint (test-integrity rules), typecheck, tests, patch coverage, build. Check name `ci`. |
| `.github/workflows/codeql.yml` | CodeQL for javascript-typescript. Check name `CodeQL`. |
| `.github/scripts/` | The router, prompt builder, and always() step the workflows call |
| `.github/ISSUE_TEMPLATE/task.yml` | The one issue form: numbered AC-n criteria, no Risk field |
| `.github/labels.json` | `claude`, `needs-input`, `epic`, `model:*`, `effort:*`, `advisor:*`, `risk:high` |
| `.claude/settings.json` | Allowed tools for implementing runs |
| `.claude/review-settings.json` | Allowed tools for the reviewer (read-only + `gh pr comment`) |
| `.claude/prompts/` | The run prompt and the revision prompt |
| `.claude/REVIEW.md` | The reviewer's instructions |
| `.claude/skills/` | `/bootstrap`, `/plan`, `/dispatch` |
| `.claude/rules/` | Path-scoped conventions (empty until /bootstrap) |
| `tools/eslint/integrity-rules.js` | Lint rules: skipped, focused, empty, assertion-free tests fail |
| `tools/patch-coverage.mjs` | Coverage on changed lines from `lcov.info`, no external account |
| `setup.sh` | Labels, project board, `.claude/project.json`, `production`, rulesets, secrets |
| `CLAUDE.md` | Skeleton /bootstrap fills; stays in root so Claude Code reads it |
| `docs/ARCHITECTURE.md`, `docs/SPEC.md` | Skeletons /bootstrap fills. Capitalized docs live in `docs/`; only files read natively from the root (`CLAUDE.md`, `README.md`) stay there. |

The template ships `development` only. `setup.sh` creates `production` from it so the two share history and a release PR is possible.

## Once per project

1. **Create the repo from this template.** Keep `development` as the default branch (it is the template's default; don't switch to `main`).
2. **Install your GitHub App on the repo** (Contents, Pull requests, Issues, Workflows: read and write). Do not run `/install-github-app`.
3. **Run `setup.sh`** from your terminal in a fresh clone: labels → project → `.claude/project.json` pushed to `development` → `production` → rulesets and merge settings → secrets. Then do the two project UI toggles it prints.
4. **Connect the preview host**; set `production` as the production branch; confirm it deploys branches whose commits are authored by your app.
5. `claude --model fable`, then **`/bootstrap`**. Answer the interview, approve the plan, let it scaffold on its branch, merge its PR, let it run the probe issue.
6. Write the core-flow integration tests you own, in an interactive session.

## The loop, after that

- `/model opus`, `/plan` with a feature in plain English → issues in Backlog. Promote to Ready.
- Add `claude` to an issue, or `/dispatch --limit N`.
- When the PR arrives: read the report, click the preview, read the reviewer, scan test names against the criteria. Squash-merge, or `@claude fix …`, or close and rewrite the issue.
- Release: open and merge a `development → production` PR when ready.

## Branches

`claude/issue-N-<run>-<attempt>` → `development` (squash) → `production` (merge commit). No `main`. Claude's only writable surface is `claude/*`.

## Secrets and variables (set by `setup.sh`)

| Name | Kind | What |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | secret | From `claude setup-token`. Lasts a year; rotate then. |
| `LOOP_APP_ID` | secret | Your GitHub App's id |
| `LOOP_APP_PRIVATE_KEY` | secret | Its private key (PEM) |
| `LOOP_APP_SLUG` | variable | Its slug; the bot login is `<slug>[bot]` |
