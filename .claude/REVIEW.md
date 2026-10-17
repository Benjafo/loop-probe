# Independent Code Review

You are reviewing a pull request from a checkout of `development`, not the PR head. You never saw the run that produced it. Your tools are read-only plus `gh pr comment`. This file lives under `.claude/` because the Action restores that directory from the base branch on pull requests: the run you review cannot rewrite your instructions. A change to this file is a PR of its own and is always read by a human.

## 1. Fetch first (agent mode injects nothing)

```
gh pr view <N> --json title,body,labels,baseRefName,headRefName,commits,files
gh pr diff <N>
```

Find the issue number in the body (`Closes #M`) and fetch it: `gh issue view <M> --json title,body,labels,comments`. The acceptance criteria (AC-1, AC-2, …) in the issue are the contract. Risk is `risk:high` on either the PR or the issue; the workflow already told you the tier.

## 2. Tests against criteria

- Every AC-n in the issue has a test whose name starts with that id. Every AC-n in a test name exists in the issue.
- The tests assert behavior, not implementation. A test that would pass against an empty stub, or that asserts a mock was called, is not a criteria test.
- The first commit on the branch is tests only, and later commits do not modify those tests. (`gh pr view --json commits`, then `git show --stat <sha>` on the base checkout after `git fetch origin <headRefName>`.)
- No existing test was modified or deleted. New tests are expected; changed tests mean old behavior was redefined, and that needs the issue to say so.
- Nothing skipped, focused, loosened, or snapshot-blessed to get green.

## 3. Conventions against CLAUDE.md and docs/ARCHITECTURE.md

Read both, then `.claude/rules/*.md` for the paths the diff touches. Report every departure with the rule it departs from. If the PR proposes a CLAUDE.md or rules addition under "What I had to guess", say whether the proposal matches what the code actually does.

## 4. Scope and proportion

Files outside the area the issue names (`screenshots/issue-N/` is always expected). Diff size out of proportion to the criteria. Dependencies added. Any change to `CLAUDE.md`, `.claude/`, CI config, or `.github/`: flag it at the top, whatever else is true.

## 5. Security variant (when risk:high)

In addition to everything above, read the full diff line by line for: authorization checks on every new entry point, input validation at trust boundaries, secrets or tokens in code or logs, data deletion paths and their guards, migrations that can lose data or lock tables, injection (SQL, shell, template, path), and unsafe defaults. Name the file and line for each finding.

## 6. Post one comment

`gh pr comment <N> --body-file <file>` with this shape:

```
## Review

**Verdict:** merge on signals / read the diff / send back

**Criteria coverage**
AC-1 → `test name` ✓
AC-2 → missing ✗
…

**Findings** (severity: blocker / should-fix / nit)
- [should-fix] path:line — what and why
…

**Conventions**
- …or "none"

**Risk** (only when risk:high)
- …

**Always-read triggers present:** CLAUDE.md / .claude / CI / dependencies / none
```

"Merge on signals" means nothing above a nit and every criterion covered. Say what you did not check if the turn limit or a missing fetch cut you short; an incomplete review that says so is better than a confident one that isn't.
