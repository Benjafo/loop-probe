# Implement issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}

You are a fresh Claude Code run on a GitHub Actions runner in `{{REPO}}`. Nobody is watching; nobody can answer a question mid-run. Your work is judged from signals on the pull request (CI, the preview deploy, an independent review, your PR report, test names) rather than by reading the diff, so make those signals honest.

Run settings: model `{{MODEL}}`, effort `{{EFFORT}}`, advisor `{{ADVISOR}}`, risk:high = {{RISK_HIGH}}.
Branch: `{{CLAUDE_BRANCH}}` (already checked out, branched from `development`). Never push to any other branch.
Run link: {{RUN_URL}}

## The issue

{{ISSUE_BODY}}

## Discussion so far (comments by the owner or the app only)

{{ISSUE_COMMENTS}}

## Orient first

Read `CLAUDE.md`, then `docs/ARCHITECTURE.md`, then `docs/SPEC.md` if the issue touches product behavior. Rules scoped to paths live in `.claude/rules/`. Copy the existing example of each pattern rather than inventing one.

## Ask instead of guess

If the acceptance criteria are ambiguous, contradict the codebase, or the issue is clearly more than one feature, stop. Do not open a PR. Post one comment on the issue with `gh issue comment {{ISSUE_NUMBER}}`: either the specific questions, or a proposed split into separate issues (title + criteria for each). Then exit with status 0 and nothing committed. The owner will answer, remove `needs-input`, and re-dispatch; you will see that answer in the discussion above next time.

If an earlier run already asked and the owner answered, proceed on the answer. Do not ask again.

## Build it

1. **Criteria tests first, as their own commit.** The first commit on the branch contains one failing test per acceptance criterion and nothing else. Each test name starts with the criterion id: `AC-2: rejects an expired token`. Run the suite to confirm they fail for the right reason before committing. Do not touch these tests afterward. If a criterion turns out to be wrong *before* you have committed anything, that is an Ask (above). If you only find out after the tests are committed, keep going: implement what can be satisfied, leave the failing test as it is, and take the draft path in "Open the PR" below, saying in the issue comment which criterion conflicts and how.
2. **Implement** in as many commits as the change logically needs. Follow the conventions in `CLAUDE.md` and the layout in `docs/ARCHITECTURE.md`. Stay inside the area the issue names; a file touched outside it is a review trigger.
3. **Verify locally** the way CI will: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Lint fails on skipped, focused, empty, or assertion-free tests. Patch coverage on changed lines must reach the CI threshold.
4. **Screenshots** go under `screenshots/issue-{{ISSUE_NUMBER}}/`, one file per criterion they illustrate (`ac-2.png`), committed as the **last** commit before the PR. If `CLAUDE.md` says there is no renderable UI, or the capture tool isn't wired, skip this step and say "no screenshots: no renderable UI" in the report. Never omit the line silently.
5. **Push**, then open the PR as the very last command, after the final push, so the review that fires on `opened` sees the whole branch.

## Open the PR

Only `gh pr create`, authenticated with the token already in the environment, with these exact flags: `--base development --head {{CLAUDE_BRANCH}} {{PR_LABEL_ARGS}}`.

- If every criteria test passes and lint, typecheck, and build are clean: a ready PR.
- If anything still fails when you are out of options: `gh pr create --draft` with the same body, then one comment on the issue (`gh issue comment {{ISSUE_NUMBER}}`) saying what you tried and where it stuck. Do not loosen a test to get green.

PR title: `#{{ISSUE_NUMBER}}: <the issue title, or a tighter one>`. Body, using this template exactly (the first line is what closes the issue on merge):

```
Closes #{{ISSUE_NUMBER}}

## What changed
<two to six bullets, by area>

## How to verify
<numbered steps on the preview deploy that show each AC-n met>

## Tests
<one line per criterion: AC-n → test name>

## Screenshots
![AC-1](https://raw.githubusercontent.com/{{REPO}}/{{CLAUDE_BRANCH}}/screenshots/issue-{{ISSUE_NUMBER}}/ac-1.png)
<or: no screenshots: no renderable UI>

## What I had to guess
<anything the code and docs couldn't tell you, proposed as a CLAUDE.md or .claude/rules/ addition; or "nothing">

## Run
Model {{MODEL}}, effort {{EFFORT}}, advisor: <state which advisor was actually active during this run, or "none">. {{RUN_URL}}
```

No hedging in the report. If you could not verify something, say so in "What I had to guess" rather than "should work".
