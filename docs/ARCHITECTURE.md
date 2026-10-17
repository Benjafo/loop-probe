# docs/ARCHITECTURE.md

<!-- Skeleton. /bootstrap fills this. A real map, not prose about philosophy: a cold run reads this to find where things go. -->

## Stack

<!-- /bootstrap: runtime target (browser / Node / both), framework, test runner, persistence, auth approach, preview host. -->

## Layout

```
src/            # /bootstrap: replace with the real tree, one line per directory saying what lives there
test/           # tests; names carry AC-n ids
tools/          # repo tooling: eslint test-integrity rules, patch coverage
docs/           # ARCHITECTURE.md, SPEC.md, and any other capitalized doc; CLAUDE.md and README.md stay in the root because they are read from there
screenshots/    # committed by implementing runs, one folder per issue; not code
.claude/        # run prompts, reviewer instructions, allowed tools, skills, path-scoped rules
.github/        # workflows, issue form, labels, dependabot, the scripts the workflows call
```

## Patterns: one real example of each

Every layer named here has one vertical-slice example with a test. Copy it.

| Pattern | Example | Test |
|---|---|---|
| <!-- route / endpoint --> | | |
| <!-- UI component --> | | |
| <!-- data access --> | | |
| <!-- migration --> | | |

<!-- The placeholder today is src/example.js with test/example.test.js; /bootstrap deletes it. -->

## Data

<!-- /bootstrap: persistence, schema location, migration and seed commands, how tests get a database. -->

## Boundaries

<!-- /bootstrap: what may import what. Where possible encode as an import-boundary lint rule and link it here. -->

## Deploy

Branches: `claude/*` → `development` (squash merge, one issue per PR) → `production` (merge commit, via a release PR the owner opens). Preview deploy per PR; production deploy on push to `production`.
